# Topic: OWASP hands-on — exploit, then defend

> **Goal:** See three classic vulnerabilities WORK against deliberately broken code (provided reference), then implement the defenses and prove they hold. You can't fix what you've never watched succeed.

## Beginner-friendly picks

- 🧪 [PortSwigger Web Security Academy](https://portswigger.net/web-security) — FREE interactive labs; SQLi & XSS sections extend this topic massively
- 📝 [OWASP Top 10 explainer pages](https://owasp.org/www-project-top-ten/) — one page per flaw you defended against

## The three flaws

| Flaw | OWASP category | The vulnerable pattern | The defense |
|---|---|---|---|
| SQL injection | A03: Injection | string-concatenated queries: `"... LIKE '%" + q + "%'"` | parameterized queries (`$1` placeholders) — values NEVER touch SQL text |
| Broken access control / IDOR | A01: Broken Access Control | fetching by id without ownership check | server-side authorization on EVERY object access; deny by default |
| Stored XSS | A03: Injection | rendering user HTML unescaped | contextual output encoding — escape `& < > " '` |

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Injection root cause | mixing CODE and DATA in one channel; parameters keep them separate | [OWASP SQL injection](https://owasp.org/www-community/attacks/SQL_Injection) |
| IDOR | `/profile/42` succeeds for user 7 because the id is the ONLY check | [OWASP — IDOR](https://owasp.org/www-project-top-ten/2021/A01_2021-Broken_Access_Control/) |
| XSS mechanics | untrusted input reaches HTML context → browser executes it as code | [OWASP — XSS](https://owasp.org/www-community/attacks/xss/) |
| Deny-by-default | authorization decided at the data-access boundary, not the UI hiding links | [OWASP ASVS V4](https://owasp.org/asvs/) |
| Defense-in-depth | escaping AND CSP AND input limits — layers survive each other's bugs | [OWASP — cheat sheets](https://cheatsheetseries.owasp.org/) |

## Keep in mind

- **Parameterized ≠ sanitized**: `$1` values are DATA even when they look like SQL. Escaping quotes yourself is the amateur version of the same bug.
- **Authorization needs a requester**, every time. "Public by default unless owner" is backwards.
- **Escaping is CONTEXTUAL**: HTML-entity encoding protects HTML text nodes; attributes/JS/URL contexts need different encodings. Know which context you're writing into.
- **The vulnerable file stays vulnerable** — it's your reference oracle. Fixing it is forbidden; building defenses beside it is the exercise.

## Self-check quiz

<details><summary>1. Why does <code>"SELECT … WHERE name = '" + q + "'"</code> break with q = <code>' OR '1'='1</code>?</summary>
q's quote terminates the string literal early; remaining characters become SQL logic ('OR 1=1') — data promoted to code. Parameterization sends q as an opaque value the driver quotes/binds.</details>

<details><summary>2. UI hides other users' profiles. Is that access control?</summary>
No — client-side hiding is UX. Authorization must be enforced where data leaves YOUR system, per request.</details>

<details><summary>3. Your notes app escapes on RENDER but stores raw. Acceptable? When does it bite?</summary>
Acceptable IF every render path escapes in its own context forever. It bites when a new surface (export, API JSON→HTML preview) forgets. Sanitize-on-input + escape-on-output is sturdier.</details>

## Assignment

→ [assignment.md](assignment.md)
