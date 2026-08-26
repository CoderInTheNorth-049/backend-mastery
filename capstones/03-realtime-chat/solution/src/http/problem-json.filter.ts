import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { logger } from "../logger";

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
}

const TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

/**
 * RFC 9457 problem+json for every REST failure. WS errors deliberately do
 * NOT go through this: sockets have no status codes, so the gateway speaks
 * its own `error` events with machine codes.
 */
@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let detail = "Internal Server Error";
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      detail = ProblemJsonFilter.describe(exception);
    } else {
      logger.error({ err: exception, requestId: req.requestId }, "unhandled error");
    }

    const body: ProblemDetails = {
      type: "about:blank",
      title: TITLES[status] ?? "Error",
      status,
      detail,
      instance: req.originalUrl,
      requestId: req.requestId,
    };
    res.status(status).header("Content-Type", "application/problem+json").json(body);
  }

  private static describe(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === "string") return response;
    const message = (response as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
    return exception.message;
  }
}
