# Assignment — Paradigm selection matrix

## The problem you're solving
Every team eventually ships an API wrong-shaped for its consumers: GraphQL nobody caches, gRPC browsers can't call, webhooks without retries. You'll fill a six-scenario decision matrix — pick, defend, and state exactly what evidence would flip your choice.

## Your tasks
Create `paradigms.md` covering these six scenarios. For each: **Pick** → **Defense** (≤3 sentences incl. one cost accepted + mitigation) → **Flip trigger** (what change reverses the decision):

1. Public third-party developer API for your payments platform
2. Admin dashboard rendering 30 heterogeneous widgets per page
3. Inter-service order-event broadcast to 5 internal services
4. Live collaborative cursors in a document editor
5. Notification badges pushed to browsers
6. Partner systems that must receive order events reliably behind their own firewalls

At least two answers should deliberately PAIR paradigms (e.g., gRPC internally + webhooks outward).

## Definition of done
- [ ] Each pick matches the sweet-spot table in [README.md](README.md)
- [ ] Costs named + mitigated, not ignored
- [ ] Flip triggers are observable conditions, not vibes
- [ ] Self-scored ≥14/18 on the README rubric

## Going further (optional)
Draft the exact GraphQL SDL or proto file for ONE of your picks to feel the contract concretely.