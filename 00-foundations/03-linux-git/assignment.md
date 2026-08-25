# Assignment — terminal & Git lab (hands-on, self-graded)

## The problem you're solving
Production servers don't have GUIs. When the pager fires, you'll be reading logs through pipes, finding process PIDs, and walking Git history at 2 AM. This lab builds those reflexes now — calmly — instead of during your first incident.

## Your tasks
Work through a scratch directory (`~/backend-mastery-lab`) and record one-line observations per exercise in `notes.md`:

1. **Shell (A1–A5):** word-frequency pipeline over this repo's markdown · count ERROR/INFO log lines · start & gracefully kill a background sleep · write `slowlog.sh` (arg-required, exit codes!) · add `set -euo pipefail` and break it on purpose.
2. **System (B1–B3):** identify which process owns a port you opened · explain SIGTERM vs SIGKILL in your notes · practice chmod 600 + verify access bits.
3. **Git archaeology (C1–C6):** inspect a commit's internals with `cat-file` · create/merge a conflict branch · recover a “lost” commit via reflog · squash with interactive rebase · hunt a bug with `git bisect`.

## Definition of done
- [ ] Every checklist box ticked in this file, notes written per exercise
- [ ] You can redo C4/C5/C6 from memory tomorrow

## Acceptance criteria (self-honest)

- [ ] All boxes ticked, `notes.md` written per exercise
- [ ] You can redo C4/C5/C6 from memory without looking
- [ ] Your scratch repo's `git log --graph --oneline` looks like a story, not noise

No solution/ here by design — the lab *is* the learning. Stuck? The resources in [README.md](README.md) cover every single command used above.
