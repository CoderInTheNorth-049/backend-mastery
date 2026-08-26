import { Catch, HttpException } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import type { Logger } from "pino";
import type { RequestWithId } from "./request-id";

const TITLES: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  410: "Gone",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

/** Throw these to speak RFC 9457 through the global filter. */
export class ProblemJsonError extends HttpException {
  constructor(
    readonly httpStatus: number,
    readonly titleText: string,
    readonly detailText: string,
  ) {
    super(detailText, httpStatus);
  }
}

export const badRequest = (detail: string): ProblemJsonError =>
  new ProblemJsonError(400, TITLES[400], detail);
export const notFound = (detail: string): ProblemJsonError =>
  new ProblemJsonError(404, TITLES[404], detail);
export const gone = (detail: string): ProblemJsonError =>
  new ProblemJsonError(410, TITLES[410], detail);
export const serviceUnavailable = (detail: string): ProblemJsonError =>
  new ProblemJsonError(503, TITLES[503], detail);

export interface ProblemDocument {
  type: string;
  title: string;
  status: number;
  detail?: string;
}

@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & RequestWithId>();

    let status = 500;
    let title = TITLES[500];
    let detail = "unexpected server error";
    if (exception instanceof ProblemJsonError) {
      status = exception.httpStatus;
      title = exception.titleText;
      detail = exception.detailText;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = TITLES[status] ?? "HTTP Error";
      detail = exception.message;
    } else {
      // Never leak internals; log them with correlation id instead.
      this.logger.error({ err: exception, requestId: req?.requestId }, "unhandled error");
    }

    const problem: ProblemDocument & { instance?: string; requestId?: string } = {
      type: "about:blank",
      title,
      status,
      detail,
    };
    if (req?.originalUrl !== undefined) problem.instance = req.originalUrl;
    if (req?.requestId !== undefined) problem.requestId = req.requestId;

    res.status(status);
    res.setHeader("content-type", "application/problem+json");
    res.json(problem);
  }
}
