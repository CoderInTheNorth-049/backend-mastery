import type { Request } from "express";
import type { AppMetrics } from "./metrics";

function routeLabel(req: Request): string {
  // `route` is set once Express matched; unmatched paths (404s) report as
  // "unmatched" so they still land in the histogram without exploding labels.
  const route = req.route?.path;
  if (typeof route !== "string") return "unmatched";
  return `${req.baseUrl ?? ""}${route}`;
}

/** Observes request duration per method/route/status on response finish. */
export function httpMetricsMiddleware(metrics: AppMetrics) {
  return (req: Request, res: import("express").Response, next: () => void): void => {
    const end = metrics.httpDuration.startTimer();
    res.on("finish", () => {
      end({ method: req.method, route: routeLabel(req), status_code: String(res.statusCode) });
    });
    next();
  };
}
