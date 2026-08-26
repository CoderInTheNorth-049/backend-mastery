import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Correlation-id middleware (M6): echo the caller's X-Request-Id so traces can
 * span a future gateway, mint a UUID otherwise. Always echoed on the response.
 */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming !== undefined && incoming.trim().length > 0 ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
