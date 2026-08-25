# PR 2 — “Batch user export endpoint”

> Author: @mid-level · Files changed: `src/export.ts` (+52 −3)

```diff
+ import { usersRepo } from "../db/users";
+
+ export async function exportUsers(page: number): Promise<UserRow[]> {
+   const rows: UserRow[] = [];
+   let cursor = 0;
+   while (true) {
+     const batch = await usersRepo.listBatch(cursor, 1000);
+     if (batch.length === 0) break;
+     for (const row of batch) {
+       rows.push(maskEmail(row));
+     }
+     cursor += batch.length;
+     if (rows.length >= page * 1000) break;
+   }
+   return rows.slice((page - 1) * 1000, page * 1000);
+ }

+ export async function countAll(): Promise<number> {
+   return (await exportUsers(Infinity)).length; // reuse the exporter
+ }
```

Author’s description: “Paged export utility. `countAll()` reuses it with Infinity to get totals.”

## Review focus

Two smells are hiding here:
- one is a **correctness bug in pagination math** (`page * 1000` vs actual accumulated rows — what happens when batches aren’t exactly 1000?)
- one is a **performance/abuse problem**: trace what `countAll(Infinity)` actually executes against the database, and how many rows it materializes in memory
