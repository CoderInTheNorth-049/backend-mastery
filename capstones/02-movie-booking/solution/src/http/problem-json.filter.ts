import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException } from "@nestjs/common";
import type { Request, Response } from "express";
import type { Logger } from "pino";
import { DomainError } from "../domain/errors";

const STATUS_TITLES: Record<number, string> = {
  400: "Bad Request",
  402: "Payment Required",
  404: "Not Found",
  409: "Conflict",
  410: "Gone",
  500: "Internal Server Error",
};

function slug(code: string): string {
  return code.toLowerCase().replaceAll("_", "-");
}

/**
 * Every error leaves the API as RFC 9457 application/problem+json:
 * { type, title, status, detail, instance, requestId }.
 */
@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let code = "INTERNAL_ERROR";

    if (exception instanceof DomainError) {
      status = exception.status;
      code = exception.code;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = `HTTP_${status}`;
    } else if (
      exception instanceof Error &&
      typeof (exception as Error & { status?: number }).status === "number"
    ) {
      // body-parser and friends smuggle an HTTP status onto plain Errors.
      status = (exception as Error & { status: number }).status;
      code = `HTTP_${status}`;
    } else {
      this.logger.error({ err: exception, requestId: req.requestId }, "unhandled error");
    }

    const detail =
      exception instanceof Error && status !== 500
        ? exception.message
        : "Unexpected server error. Check the server logs for the correlation id.";

    const problem = {
      type: `https://backend-mastery.dev/problems/${slug(code)}`,
      title: STATUS_TITLES[status] ?? "Error",
      status,
      detail,
      instance: req.originalUrl,
      requestId: req.requestId,
    };

    res.status(status).type("application/problem+json").json(problem);
  }
}
