export function allowedErrorCount(totalRequests: number, sloPercent: number): number {
  // Integer-scaled to dodge FP noise: (100 − 99.9) is NOT 0.1 in binary.
  const errorBasisPoints = 10_000 - Math.round(sloPercent * 100);
  return Math.floor((totalRequests * errorBasisPoints) / 10_000);
}

export function remainingBudget(
  totalRequests: number,
  failedRequests: number,
  sloPercent: number,
): number {
  return Math.max(0, allowedErrorCount(totalRequests, sloPercent) - failedRequests);
}

export function computeBurnRate(
  totalRequests: number,
  failedRequests: number,
  sloPercent: number,
): number {
  if (totalRequests <= 0) return 0;
  const errorBasisPoints = 10_000 - Math.round(sloPercent * 100);
  const budgetRate = errorBasisPoints / 10_000;
  return failedRequests / totalRequests / budgetRate;
}

export function isAlerting(burnRate: number, threshold: number): boolean {
  return burnRate >= threshold;
}
