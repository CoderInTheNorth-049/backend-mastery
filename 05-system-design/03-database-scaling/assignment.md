# Assignment — Build a consistent-hash ring

## The problem you're solving
Your cache cluster has 3 nodes and 3000 keys. Adding a fourth node with naive `hash % N` routing invalidates nearly EVERY key — a full cache-cold storm. Consistent hashing moves ~1/N instead, and virtual nodes smooth the rest. You'll build the ring, then your own distribution tests prove both claims with real numbers.

## Your tasks
Implement in [src/ring.ts](src/ring.ts) (`fnv1a` hash is PROVIDED — djb2 was rejected after it clustered sequential keys into one arc; that lesson is now a spec):

1. `new HashRing(nodes, virtualNodes = 150, hash = fnv1a)` places each node `virtualNodes` times (as `${node}#${i}`).
2. `addNode` / `removeNode` — dynamic membership; duplicates and absent names are safe no-ops.
3. `getNode(key)` → first point clockwise from `fnv1a(key)` (binary search + wrap-around); `null` on empty ring.
4. `getNodes(key, count)` → up to `count` DISTINCT nodes clockwise, primary first.

## Definition of done
- [ ] Spec green: shares land near-uniform at 600 vnodes AND spread(600) < spread(50) — the vnode effect demonstrated, not asserted
- [ ] Adding a node moves only ~15–35% of keys; removing one orphans none
- [ ] Replica lists are distinct, stable across instances, and start at `getNode`

## Hints (open only when stuck)

<details><summary>Lookup</summary>
Lower-bound binary search over sorted points; wrap with modulo. Store points sorted on every membership change.</details>

<details><summary>Tie-breaking</summary>
Sort hits by score DESC then insertion seq ASC so results stay deterministic.</details>

## Going further (optional)
Weighted nodes (capacity × vnodes) and a rendezvous (HRW) implementation to compare movement characteristics.