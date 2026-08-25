# Topic: Linux terminal & Git — your daily cockpit

> **Goal:** Operate confidently where production actually runs: shells, processes, permissions, logs — and use Git like a historian, not a checkpoint button.

Frontend tooling hid most of this (`npm run dev` forever). Backend work = servers, SSH sessions, log files, and Git archaeology at 3 AM. This topic is a hands-on lab, not a reading list.

## Beginner-friendly picks

- 🧪 [Learn Git Branching](https://learngitbranching.js.org/) — THE interactive way to finally *see* branches/merges/rebase
- 🎥 [MIT Missing Semester lectures](https://missing.csail.mit.edu/) — every lecture is on YouTube via the site
- 🧪 [GitHub Skills](https://skills.github.com/) — hands-on git courses inside real repos

## Core concepts

| Area | Must be able to | Free resources |
|---|---|---|
| Shell fluency | pipes, redirection, exit codes, `grep/awk/sort/uniq/wc`, `find`, `xargs`, job control (`&`, `ctrl-z`, `jobs`) | [MIT Missing Semester](https://missing.csail.mit.edu/) lectures 1–2 |
| Processes & system | `ps aux`, `top/htop`, signals (`kill -TERM vs -KILL`), `lsof -i :3000`, env vars & PATH | Missing Semester lecture 4 + [linuxjourney.com](https://linuxjourney.com/) |
| Files & permissions | `chmod/chown`, umask concept, symlinks, `df/du`, journal/log locations (`/var/log`, `journalctl`) | [linuxjourney — permissions](https://linuxjourney.com/lesson/file-permissions) |
| Scripting basics | shebangs, `$?`, arguments, `set -euo pipefail` — enough to automate boring tasks | [Google's Bash Style Guide](https://google.github.io/styleguide/shellguide.html) (skim) |
| Git internals | objects (blob/tree/commit), SHA addressing, branches = pointers, detached HEAD demystified | [Pro Git ch.10](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects) · [Oh Shit, Git!?!](https://ohshitgit.com/) |
| Git workflows | rebase vs merge (and *when*), interactive rebase to rewrite history, bisect for bug hunting, reflog as undo | [Pro Git ch.3+7](https://git-scm.com/book/en/v2) |

## Keep in mind

- **`kill -9` is a last resort**, not a habit — it skips cleanup handlers. Real services rely on SIGTERM graceful shutdown (phase 07 makes you implement one).
- **Everything is a file** isn't a slogan: sockets, `/proc`, device nodes. When debugging feels impossible, `cat /proc/<pid>/status` exists.
- **Git history is a communication tool.** `git log --oneline` telling a story ("add retry policy", "fix off-by-one in backoff") beats "wip", "final", "final2". Your capstone repos will be judged on this.
- **`git reflog` saves careers.** Almost nothing is unrecoverable if it was committed.
- Pipes are streams, not arrays — `grep ERROR app.log | wc -l` works on files bigger than RAM. Same mental model as Node streams (phase 01!).

## Self-check quiz

<details><summary>1. Port 3000 "already in use". Two commands to find the culprit?</summary>
<code>lsof -i :3000</code> or <code>ss -tlnp 'sport = :3000'</code> / <code>fuser 3000/tcp</code>. Then inspect the PID before killing anything.
</details>

<details><summary>2. You committed secrets and pushed. Why is deleting the commit insufficient?</summary>
It stays reachable: clones, forks, cached refs, GitHub events. Response: rotate/revoke the secret FIRST, then history rewrite + force-push coordination. Rotation before rewrite, always.
</details>

<details><summary>3. Difference between <code>> file</code>, <code>>| file</code>, <code>>> file</code>, and <code>2>&amp;1</code>?</summary>
Truncate-write (fails under noclobber), force-truncate, append, and redirect stderr into stdout's stream. The last one is why <code>cmd &gt; all.log 2&gt;&amp;1</code> captures everything.
</details>

<details><summary>4. What does <code>set -euo pipefail</code> do for a script, and what risk does plain <code>set -e</code> miss?</summary>
Exit on error (-e), unset var usage (-u), and fail a pipeline if ANY stage fails (-o pipefail). Without pipefail, only the LAST command's code matters — failures hide mid-pipe.
</details>

<details><summary>5. When would you rebase a shared branch, and when never?</summary>
Never rebase commits others have based work on (rewrites history → duplicate/conflict hell). Rebase your own unpushed/local feature branches onto main for clean histories; merge for shared integration.
</details>

## Assignment — lab checklist

Open [assignment.md](assignment.md). No autograded code here — it's a practical lab you complete against a scratch repo, writing observations into `notes.md`. Be honest with yourself; these skills are assumed everywhere you'll deploy.
