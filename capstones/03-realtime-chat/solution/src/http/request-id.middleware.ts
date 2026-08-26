import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
  }
}

const SAFE_ID = /^[A-Za-z0-9_.-]{1,128}$/;

/**
 * Echoes a sane inbound x-request-id or mints one; every log line and
 * problem+json body downstream can then be correlated to one request.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
