# PR 3 — “Password reset flow”

> Author: @contractor · Files changed: `src/reset.ts` (+64 −2)

```diff
+ import { crypto } from "node:crypto";
+
+ const tokens = new Map<string, { userId: number; expires: number }>();
+
+ export async function requestReset(email: string): Promise<{ token: string }> {
+   const user = await usersRepo.findByEmail(email);
+   const token = crypto.randomUUID().replaceAll("-", "");
+   tokens.set(token, { userId: user.id, expires: Date.now() + 24 * 60 * 60 * 1000 });
+   return { token };                       // emailed to the user by the caller
+ }
+
+ export function confirmReset(token: string, newPassword: string): boolean {
+   const entry = tokens.get(token);
+   if (!entry) return false;
+   if (Date.now() > entry.expires) return false;
+   usersRepo.updatePassword(entry.userId, newPassword);
+   return true;
+ }
```

Author’s description: “Self-service password reset. Tokens live in memory for 24h.”

## Review focus

This diff is a security cornucopia. At minimum, examine:
- **token entropy** (`randomUUID` minus dashes — is that 128 bits? is `crypto` even imported correctly from node?)
- **storage choice**: an in-memory Map across a multi-instance fleet
- **user enumeration**: what does `requestReset` reveal about which emails exist?
- **one-time use**: can the same token reset twice?
- **no rate limiting / no audit trail** on either endpoint
