import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/** Honors an inbound X-Request-Id (load balancers often set one) or mints a fresh UUID; echoes it on the response. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.trim() !== "" ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
