import { Catch, HttpException } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import type { Logger } from "pino";

const TITLES: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
};

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

export const unprocessable = (detail: string): ProblemJsonError =>
  new ProblemJsonError(422, TITLES[422], detail);

export interface ProblemDocument {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId?: string;
}

@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

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
    } else if (status >= 500) {
      this.logger.error({ err: exception }, "unhandled error");
    }

    const problem: ProblemDocument = {
      type: "about:blank",
      title,
      status,
      detail,
      instance: req.originalUrl ?? "",
      requestId: req.requestId,
    };
    res.status(status);
    res.setHeader("Content-Type", "application/problem+json");
    res.json(problem);
  }
}
