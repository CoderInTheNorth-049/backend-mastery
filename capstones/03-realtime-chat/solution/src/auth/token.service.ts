import { Inject, Injectable } from "@nestjs/common";
import { signToken, verifyToken, type TokenPayload } from "../domain/hmac-token";
import { ConfigService } from "../config/config.service";

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

/** Thin env-aware wrapper around the pure hmac-token domain unit. */
@Injectable()
export class TokenService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  issue(userId: string): string {
    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    return signToken({ sub: userId, exp }, this.config.tokenSecret);
  }

  /** Handshake gate: anything but a valid unexpired token yields null. */
  verify(token: unknown): TokenPayload | null {
    return verifyToken(typeof token === "string" ? token : undefined, this.config.tokenSecret);
  }
}
