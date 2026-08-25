export function matchesTopicBinding(routingKey: string, pattern: string): boolean {
  const words = routingKey.length === 0 ? [] : routingKey.split(".");
  const parts = pattern.length === 0 ? [] : pattern.split(".");

  // Classic two-pointer DP over words; memo[i][j] = words[i..] matches parts[j..].
  // Recursive formulation with memo keeps the # zero-or-more semantics obvious.
  const memo = new Map<string, boolean>();

  function matches(i: number, j: number): boolean {
    const key = `${i}:${j}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let result: boolean;

    if (j === parts.length) {
      result = i === words.length; // pattern exhausted → key must be too
    } else if (parts[j] === "#") {
      // '#' eats zero or more words.
      result = matches(i, j + 1) || (i < words.length && matches(i + 1, j));
    } else if (i >= words.length) {
      result = false;
    } else if (parts[j] === "*" || parts[j] === words[i]) {
      result = matches(i + 1, j + 1);
    } else {
      result = false;
    }

    memo.set(key, result);
    return result;
  }

  return matches(0, 0);
}

export function routeMessage(patterns: string[], routingKey: string): string[] {
  return patterns.filter((pattern) => matchesTopicBinding(routingKey, pattern));
}
