import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  // Honor caller-supplied ids so traces can span a future gateway; mint one otherwise.
  const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
