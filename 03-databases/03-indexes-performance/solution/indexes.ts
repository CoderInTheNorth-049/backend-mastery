export const idxEventsQuery = `
  CREATE INDEX IF NOT EXISTS idx_events_status_path_time
  ON "PageEvent" (status, path, "createdAt" DESC);
`;

export const idxSlowSuccesses = `
  CREATE INDEX IF NOT EXISTS idx_events_slow_success
  ON "PageEvent" ("ms")
  WHERE status = 'success' AND ms >= 1500;
`;
