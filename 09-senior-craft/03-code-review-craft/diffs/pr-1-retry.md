# PR 1 — “Add retry helper for payment API calls”

> Author: @new-hire · Files changed: `src/payments.ts` (+38 −6)

```diff
+ const MAX_RETRIES = 5;
+
+ export async function chargeWithRetry(amountCents: number): Promise<Receipt> {
+   let lastError: unknown;
+   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
+     try {
+       return await chargeApi.call(amountCents);
+     } catch (err) {
+       lastError = err;
+       if (isValidationError(err)) {
+         throw err;
+       }
+       await sleep(100 * attempt);
+     }
+   }
+   throw lastError;
+ }

- export async function chargeOnce(amountCents: number) {
-   return chargeApi.call(amountCents);
- }
```

Author’s description: “Wraps the legacy `chargeOnce` so transient failures retry up to five times.”

## Review focus

Payment charges are **not idempotent by default**. Look carefully at:
- what happens to a charge that actually SUCCEEDED but whose response timed out
- whether every error class deserves retries
- how many total executions `MAX_RETRIES = 5` produces and what that means for duplicate charges
