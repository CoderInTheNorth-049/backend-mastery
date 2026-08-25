import http from "k6/http";
import { check } from "k6";

// Env-driven stage durations let CI shrink the run while production runs
// keep realistic timings — a pattern worth stealing for your own suites.
const RAMP_UP = __ENV.RAMP_UP || "30s";
const STEADY = __ENV.STEADY || "60s";
const RAMP_DOWN = __ENV.RAMP_DOWN || "10s";

export const options = {
  stages: [
    { duration: RAMP_UP, target: Number(__ENV.TARGET_VUS || 10) },
    { duration: STEADY, target: Number(__ENV.TARGET_VUS || 10) },
    { duration: RAMP_DOWN, target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function () {
  const res = http.get(`${BASE_URL}/work`);
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
}
