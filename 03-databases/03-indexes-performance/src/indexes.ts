// ── Two index designs, graded by the planner itself ──────────────────────
// Exact index NAMES are contractual. See ../assignment.md for target queries.

export const idxEventsQuery = `
  -- TODO: composite for Q1 (status + path equalities, createdAt DESC ordering)
`;

export const idxSlowSuccesses = `
  -- TODO: tiny partial index for Q2 (success AND ms >= 1500)
`;
