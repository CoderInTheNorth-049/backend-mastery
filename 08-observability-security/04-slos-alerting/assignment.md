# Assignment — error-budget math

## The problem you're solving
“99.9% availability” means 1,000 failed requests per million are ALLOWED — that's your budget for deploys, migrations, and incidents combined. Burn rate tells you how fast you're spending it; thresholds decide when humans get paged. Four pure functions encode the entire discipline. Watch for the floating-point trap: `(100 - 99.9)` is NOT 0.1 in binary.

## Your tasks
Implement in [src/budget.ts](src/budget.ts):

1. `allowedErrorCount(totalRequests, sloPercent)` — floor(total × errorFraction).
2. `remainingBudget(totalRequests, failedRequests, sloPercent)` — clamped ≥ 0.
3. `computeBurnRate(totalRequests, failedRequests, sloPercent)` — observed error rate ÷ budget rate; 0 when no traffic.
4. `isAlerting(burnRate, threshold)` — fires at-or-above (≥).

## Definition of done
- [ ] Spec green including canonical numbers: 1M requests @99.9% → 1000 allowed; 14,400 failures = 14.4× burn (the famous fast-burn threshold = 2% of a 30-day budget in 1 hour)
- [ ] Zero NaN anywhere (zero-traffic guard)

## Hints (open only when stuck)

<details><summary>Basis-points trick</summary>
errorBasisPoints = 10000 − round(slo×100) keeps everything integer-exact: 99.9% → 10 bp → fraction 0.001 without FP dust.</details>

## Going further (optional)
alert-policy.md choosing fast/slow-burn windows + thresholds for a payment API citing the math.

