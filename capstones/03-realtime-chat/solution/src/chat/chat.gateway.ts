import { Inject, OnApplicationShutdown } from "@nestjs/common";
import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { TokenService } from "../auth/token.service";
import { ConfigService } from "../config/config.service";
import { OutboundQueue } from "../domain/outbound-queue";
import type { ChatMessage, MessageStore } from "../ports/message-store";
import { MESSAGE_STORE } from "../ports/message-store";
import { logger } from "../logger";
import { PresenceService } from "./presence.service";
import { RateLimiterService } from "./rate-limiter.service";

export const OUTBOUND_QUEUE_CAPACITY = 100;
export const MAX_MESSAGE_LENGTH = 1000;

const log = logger.child({ module: "chat-gateway" });

interface SocketState {
  userId: string;
  rooms: Set<string>;
  outbound: OutboundQueue;
}

type AuthedSocket = Socket & { data: SocketState };

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/**
 * The realtime front door. Auth at handshake, per-user rate limiting,
 * heartbeat presence, and fan-out through a bounded per-socket queue.
 *
 * Room delivery iterates our own registry instead of socket.io's adapter so
 * every frame passes the connection's OutboundQueue — io.to(room).emit()
 * would bypass the backpressure seam entirely. Production swaps this loop
 * for a redis-adapter fan-out; the queue stays.
 */
@WebSocketGateway({ cors: { origin: "*" } })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnApplicationShutdown
{
  @WebSocketServer()
  private server!: Server;

  private readonly connections = new Map<string, AuthedSocket>();
  private readonly socketIdsByUser = new Map<string, Set<string>>();
  private sweeper?: NodeJS.Timeout;

  constructor(
    @Inject(MESSAGE_STORE) private readonly store: MessageStore,
    private readonly presence: PresenceService,
    private readonly limiter: RateLimiterService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  afterInit(): void {
    if (!this.config.sweeperEnabled) return;
    this.sweeper = setInterval(() => this.sweepStale(), this.config.sweepIntervalMs);
    // Unref'd: a presence reaper must never keep a SIGTERM'd process alive.
    this.sweeper.unref();
    log.info({ intervalMs: this.config.sweepIntervalMs }, "presence sweeper started");
  }

  onApplicationShutdown(): void {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  handleConnection(client: Socket): void {
    const payload = this.tokens.verify(asString(client.handshake.auth?.token));
    if (!payload) {
      client.emit("error", { code: "UNAUTHORIZED" });
      client.disconnect(true);
      return;
    }

    client.data = {
      userId: payload.sub,
      rooms: new Set(),
      outbound: new OutboundQueue(OUTBOUND_QUEUE_CAPACITY, (frame) => client.emit(frame.event, frame.payload)),
    } satisfies SocketState;
    this.connections.set(client.id, client as AuthedSocket);

    const ids = this.socketIdsByUser.get(payload.sub) ?? new Set();
    ids.add(client.id);
    this.socketIdsByUser.set(payload.sub, ids);

    this.presence.touch(payload.sub);
    this.broadcastPresence();
    log.debug({ userId: payload.sub, socketId: client.id }, "connected");
  }

  handleDisconnect(client: Socket): void {
    this.connections.delete(client.id);
    const state = client.data as Partial<SocketState>;
    const ids = state.userId ? this.socketIdsByUser.get(state.userId) : undefined;
    if (!ids) return;
    ids.delete(client.id);
    // Multi-tab: presence drops only when the LAST tab for the user leaves.
    if (ids.size === 0) {
      this.socketIdsByUser.delete(state.userId as string);
      this.presence.leave(state.userId as string);
      this.broadcastPresence();
      log.debug({ userId: state.userId }, "user went offline");
    }
  }

  @SubscribeMessage("join")
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
    @Ack() ack?: (response: unknown) => void,
  ): void {
    const state = client.data as SocketState;
    const roomId = asString(asRecord(body).roomId);
    if (!state?.userId || !roomId) {
      client.emit("error", { code: "VALIDATION", message: "roomId is required" });
      ack?.({ ok: false });
      return;
    }
    state.rooms.add(roomId);
    this.presence.touch(state.userId);
    this.broadcastPresence();
    ack?.({ ok: true });
  }

  @SubscribeMessage("message")
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
    // @Ack is REQUIRED in Nest 11 for manual acks: without it the framework
    // assumes it owns the callback and never hands it to the handler.
    @Ack() ack?: (response: unknown) => void,
  ): Promise<void> {
    const state = client.data as SocketState;
    const roomId = asString(asRecord(body).roomId);
    const text = (asString(asRecord(body).text) ?? "").trim();

    if (!state?.userId || !roomId || !state.rooms.has(roomId) || !text || text.length > MAX_MESSAGE_LENGTH) {
      client.emit("error", {
        code: "VALIDATION",
        message: `text must be 1..${MAX_MESSAGE_LENGTH} chars in a joined room`,
      });
      ack?.({ ok: false });
      return;
    }
    // Validation before limiting: garbage costs no tokens; exceeding the
    // limit costs one attempt and the message is dropped, never refunded.
    if (!this.limiter.allow(state.userId)) {
      client.emit("error", { code: "RATE_LIMITED", message: "slow down" });
      ack?.({ ok: false });
      return;
    }

    const message: ChatMessage = {
      id: randomUUID(),
      roomId,
      userId: state.userId,
      text,
      ts: new Date().toISOString(),
    };
    // Durability BEFORE fan-out: append resolving stands in for the
    // write-behind queue consumer's confirm, so no broadcast ever advertises
    // a message that isn't persisted.
    await this.store.append(message);

    this.sendToRoom(roomId, "message", message);
    ack?.({ ok: true, id: message.id });
  }

  @SubscribeMessage("ping")
  onPing(@ConnectedSocket() client: Socket): void {
    const state = client.data as SocketState;
    if (state?.userId) this.presence.touch(state.userId);
  }

  private sendToRoom(roomId: string, event: string, payload: unknown): void {
    for (const socket of this.connections.values()) {
      if (!socket.data.rooms.has(roomId)) continue;
      socket.data.outbound.push({ event, payload });
    }
  }

  private broadcastPresence(): void {
    const payload = { online: this.presence.online() };
    for (const socket of this.connections.values()) {
      socket.data.outbound.push({ event: "presence", payload });
    }
  }

  private sweepStale(): void {
    const evicted = this.presence.sweep();
    if (evicted.length === 0) return;
    log.info({ evicted }, "swept stale presence");
    this.broadcastPresence();
  }
}
