// TODO: k6 stress scenario — see ../assignment.md
//
// Required shape (graded):
//   export const options = {
//     stages: [ RAMP_UP → STEADY → RAMP_DOWN ]  // durations from __ENV
//     thresholds: http_req_duration p(95) + http_req_failed rate
//   };
//   default function hits GET {BASE_URL}/work (the expensive endpoint)
