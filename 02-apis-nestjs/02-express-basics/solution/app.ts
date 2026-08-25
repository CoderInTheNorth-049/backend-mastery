import { randomUUID } from "node:crypto";
import express, { type Express, type NextFunction, type Request, type Response } from "express";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues?: ValidationIssue[],
  ) {
    super(message);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserStore {
  users: User[];
  nextId: number;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  issues?: ValidationIssue[],
): void {
  res.status(status).json({
    error: {
      code,
      message,
      ...(issues ? { issues } : {}),
    },
  });
}

/**
 * Central error translator. Register AFTER your routes; late-mounted
 * routers must re-register it after themselves (Express searches forward
 * for error middleware only).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const asRecord = err as Record<string, unknown> | null;
  if (
    typeof err === "object" &&
    err !== null &&
    (asRecord?.type === "entity.parse.failed" ||
      (err instanceof SyntaxError && "body" in err))
  ) {
    sendError(res, 400, "BAD_JSON", "request body is not valid JSON");
    return;
  }

  if (err instanceof HttpError) {
    sendError(res, err.status, err.code, err.message, err.issues);
    return;
  }

  console.error("[unhandled]", err);
  sendError(res, 500, "INTERNAL", "internal server error");
}

export interface CreateAppOptions {
  /**
   * Mount additional routers/middleware BEFORE the 404 catch-all and
   * error tail are registered — how real bootstraps compose feature
   * modules without losing centralized error handling.
   */
  attach?: (app: Express) => void;
}

/**
 * Build an independent, fully-wired app instance.
 * No .listen() here — bootstrap belongs to a separate entry file.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  // Per-instance state: two createApp() calls never share anything.
  const store: UserStore = { users: [], nextId: 1 };

  app.use(express.json());

  // Cheap request-id middleware — every log/response can correlate from here.
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.headers["x-request-id"] ??= randomUUID();
    res.setHeader("X-Request-Id", req.headers["x-request-id"]);
    next();
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.post("/users", (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { name?: unknown; email?: unknown };
    const issues: ValidationIssue[] = [];

    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    if (rawName.length < 1) {
      issues.push({ field: "name", message: "name is required" });
    }

    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(rawEmail)) {
      issues.push({ field: "email", message: "email must be a valid address" });
    }

    if (issues.length > 0) {
      throw new HttpError(400, "VALIDATION", "validation failed", issues);
    }

    if (store.users.some((u) => u.email === rawEmail)) {
      throw new HttpError(409, "CONFLICT", "email already registered");
    }

    const user: User = { id: store.nextId++, name: rawName, email: rawEmail };
    store.users.push(user);
    res.status(201).json(user);
  });

  app.get("/users", (_req: Request, res: Response) => {
    res.json(store.users);
  });

  app.get("/users/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const user = store.users.find((u) => u.id === id);
    if (!user) {
      throw new HttpError(404, "NOT_FOUND", "user not found");
    }
    res.json(user);
  });

  app.delete("/users/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const index = store.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new HttpError(404, "NOT_FOUND", "user not found");
    }
    store.users.splice(index, 1);
    res.status(204).end();
  });

  // Compose caller routers BEFORE the tail so they inherit error handling.
  options.attach?.(app);

  // Unknown routes get JSON, not HTML.
  app.use((_req: Request, res: Response) => {
    sendError(res, 404, "NOT_FOUND", "route not found");
  });

  // Central translator for everything thrown inside createApp's own routes.
  app.use(errorHandler);

  return app;
}

// Re-exports so tests (and you) can import everything from one module.
export type { Express, NextFunction, Request, Response };
