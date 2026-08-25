# Assignment — a decorator-based DI container (mini-Nest core)

## The problem you're solving
NestJS “magic” is just three ideas: mark classes injectable, reflect constructor parameter TYPES at runtime, resolve the graph recursively. You'll implement all three — singleton caching, circular-dependency detection with helpful errors — and never fear Nest providers again.

## Your tasks
In [src/container.ts](src/container.ts):
1. `@Injectable()` class decorator storing a metadata marker via Reflect.
2. `Container.resolve(token)`:
   - returns the SAME instance on repeated calls (singleton cache)
   - recursively constructs dependencies from reflected `design:paramtypes`
   - refuses classes missing the marker (error names the class)
   - detects circular graphs (A→B→A) with an error naming BOTH classes — and leaves the container usable afterwards
   - explains clearly when a parameter type can't be reflected (interfaces erase!)
3. `clear()` empties cached instances.

## Definition of done
- [ ] Spec green — Logger→Repo→Service chains wire automatically
- [ ] Circular attempt throws `/circular/i` naming both parties, container still healthy
- [ ] Zero `any` leaking through public signatures

## Hints

<details><summary>Hint 1</summary>
@Injectable stores a marker via Reflect.defineMetadata(MARKER, true, target). resolve() checks marker FIRST for the friendliest errors.</details>

<details><summary>Hint 2 — circular</summary>
Maintain an in-progress Set<Constructor>. Add token before resolving deps, delete in finally. Seeing the token again mid-flight = cycle. The finally is what keeps state clean after throwing (contract #5).</details>

<details><summary>Hint 3 — metadata</summary>
const params: unknown[] = Reflect.getMetadata("design:paramtypes", target) ?? []; Filter/map each to this.resolve(dep as Constructor). An undefined entry means untyped/interface param → contract #8's error path.</details>

<details><summary>Hint 4 — why the circular test wires metadata manually</summary>
Two same-file classes referencing each other's TYPES hit temporal-dead-zone errors during decoration — THIS is exactly why NestJS ships <code>forwardRef()</code>. The spec calls Reflect.defineMetadata directly, mirroring what the compiled output of a genuine circular graph looks like.
</details>

## Acceptance criteria

- [ ] Spec green
- [ ] No `any` leaks into public signatures (`any[]` rest-params inside types OK per stub)
- [ ] Circular error message contains both involved class names

## Stretch

- Add transient scope option: `resolve(token, {scope:"transient"})`
- Add string-token support: `provide("CONFIG", {useValue})` + `@Inject("CONFIG")` param decorator
- Add disposal: track instances with `.dispose?()` and call on `container.dispose()`
