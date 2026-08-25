# Assignment — Deployment + Service manifests (graded contracts)

## The problem you're solving
Kubernetes wiring fails SILENTLY: one mismatched label and your Service routes to nothing while pods run happily. You'll author the two manifests every service needs — Deployment and Service — with probes split correctly, resources budgeted, and selectors consistent ACROSS FILES. The grader checks exactly those cross-file promises.

## Your tasks
Target app: your Node API from topic 01 — image `registry.example.com/api:1.4.2`, container port 3000, probes `/healthz` (liveness) and `/readyz` (readiness).

1. Author [submission/deployment.yml](submission/deployment.yml): apps/v1 Deployment, replicas ≥ 2, selector.matchLabels AND template labels both `{app: api}`, single `api` container with the pinned image (no latest), containerPort 3000, resources.requests cpu+memory plus memory limit, livenessProbe httpGet /healthz, readinessProbe httpGet /readyz, rollingUpdate maxSurge 1 / maxUnavailable 0.
2. Author [submission/service.yml](submission/service.yml): ClusterIP Service selecting `app: api`, port 80 → targetPort 3000.

## Definition of done
- [ ] Spec green — including the CROSS-FILE consistency check (service selector equals deployment labels)
- [ ] Bonus: apply both to a real kind cluster locally

## Hints (open only when stuck)

<details><summary>Probe semantics</summary>
Liveness = process alive (restart me); readiness = can serve traffic (route to me). Dependencies belong ONLY in readiness.</details>

<details><summary>Resources shape</summary>
requests.cpu 100m, requests.memory 256Mi, limits.memory 256Mi — equal request/limit memory gives Node predictable behavior.</details>

## Going further (optional)
PodDisruptionBudget (minAvailable 1) + HorizontalPodAutoscaler at 70% CPU; topologySpreadConstraints across zones.

## Hints

<details><summary>Probe shapes</summary>
httpGet: { path: /readyz, port: 3000 } plus sane initialDelaySeconds/periodSeconds. No dependency calls in liveness!
</details>

<details><summary>Resources shape</summary>
resources: { requests: { cpu: 100m, memory: 256Mi }, limits: { memory: 256Mi } } — CPU limit optional; memory limit strongly recommended for Node.
</details>

## Acceptance criteria

- [ ] Spec green
- [ ] Bonus: apply against a real kind cluster when Docker exists locally

## Stretch

- Add PodDisruptionBudget (minAvailable 1) and a HorizontalPodAutoscaler (CPU 70% target)
- Add topologySpreadConstraints across zones
