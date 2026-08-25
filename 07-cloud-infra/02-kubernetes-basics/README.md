# Topic: Kubernetes basics — declarative fleets

> **Goal:** Write the two manifests every service needs — a Deployment and a Service — that would survive an actual platform team's review: probes wired, resources budgeted, selectors consistent.

## Beginner-friendly picks

- 🧪 [Killercoda — Kubernetes basics scenarios](https://killercoda.com/killercoda) — real cluster in browser; apply YOUR manifests
- 🎥 [TechWorld with Nana — Kubernetes course](https://www.youtube.com/results?search_query=kubernetes+course+nana) — famous free full-course

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Pods vs Deployments | pod = ephemeral process envelope; Deployment owns ReplicaSets → rolling updates + self-healing | [K8s — Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) |
| Labels & selectors | the ENTIRE wiring mechanism: Service→Pods, Deployment→ReplicaSet. Mismatch = silent no-traffic | [K8s — labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/) |
| Probes | liveness (restart me) vs readiness (send traffic) vs startup; wrong semantics cause restart storms | [K8s — probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) |
| Resource requests/limits | scheduling truth (requests) vs enforcement (limits); CPU limits throttling gotcha | [K8s — resource mgmt](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) |
| Services | stable virtual IP/DNS over changing pods; ClusterIP default; targetPort maps container port | [K8s — Services](https://kubernetes.io/docs/concepts/services-networking/service/) |
| Rollouts | desired-state reconciliation; maxSurge/maxUnavailable shape a rolling update; rollback = revert manifest | [K8s — rolling update](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment) |

## Keep in mind

- **Liveness probe hitting dependencies = restart storms** (phase 00 lesson, now in YAML). Liveness = process alive; readiness = can serve.
- **No resource requests = BestEffort pod** = first evicted under node pressure. Requests are scheduling promises, not optional metadata.
- **Selector mismatches fail SILENTLY**: deployment creates pods, service selects nothing, endpoints empty. `kubectl describe svc` is where careers stall — write selectors carefully here and feel why.
- **One container concern per pod** (sidecars aside): your API image shouldn't run migrations AND serve; jobs are separate workloads.
- Config via env/ConfigMaps; secrets are base64-not-encrypted — real secret managers mount or inject them.

## Self-check quiz

<details><summary>1. Deployment rolls but Service returns connection refused. First debug step?</summary>
<code>kubectl get endpoints &lt;svc&gt;</code> — empty endpoints ⇒ selector/label mismatch or readiness failing. Traffic routing problems are selector problems until proven otherwise.</details>

<details><summary>2. Readiness checks dependency DB; DB blips 60s. What happens to your fleet?</summary>
Pods flip unReady → removed from endpoints (no crashes). Correct behavior! The sin was making LIVENESS do that — liveness failures trigger restarts fleet-wide.</details>

<details><summary>3. Why set memory limit ≈ request for Node services?</summary>
Node heaps don't shed load gracefully when squeezed; bursting into limit ⇒ OOMKill mid-request. Equal values = Guaranteed-class predictability.</details>

<details><summary>4. maxUnavailable=0, maxSurge=1 — describe the rollout.</summary>
Zero-downtime conservative roll: surge one new pod, wait ready, retire one old. Slower, capacity-neutral — right default for user-facing APIs.</details>

## Assignment

[assignment.md](assignment.md) — author `submission/deployment.yml` + `submission/service.yml` against an explicit structural contract: probes split correctly, resources budgeted, selectors consistent across files.
