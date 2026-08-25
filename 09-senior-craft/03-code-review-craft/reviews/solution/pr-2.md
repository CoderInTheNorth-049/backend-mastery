# Review — pr-2

## Summary
Readable structure, but the pagination math is subtly wrong for partial batches and `countAll` turns a cheap COUNT query into a full table scan held in memory.

## Findings

### 1. [correctness] + [performance] pagination uses `page * 1000` while batches may be <1000 rows
If any batch returns short (filtered/masked rows removed, DB page boundary), `cursor += batch.length` and the `rows.length >= page * 1000` guard disagree about what "page N" means — pages will skip or repeat rows depending on batch boundaries.
Fix: paginate by stable cursor from the repo layer and slice deterministically; add a test with batch sizes like [3, 1000, 17].

### 2. [performance] countAll(Infinity) materializes the ENTIRE users table in JS memory to return one number
It loops all batches into `rows`, then slices nothing meaningful (Infinity*1000). Use `SELECT count(*)`. Also flag: export endpoint unbounded result sets need streaming (NDJSON) rather than array accumulation.

### 3. [tests] zero tests accompany new pagination logic
Boundary cases (empty table, exact-multiple pages, final short page) are where this code will break first.

(nit) Nice reuse instinct — the right fix is extracting a shared cursor iterator both endpoints consume.
