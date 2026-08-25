export type Hook = () => void | Promise<void>;

export interface SuiteHandle {
  describe(name: string, fn: () => void): void;
  it(name: string, fn: () => void | Promise<void>): void;
  beforeEach(hook: Hook): void;
  afterEach(hook: Hook): void;
}

export interface TestResult {
  name: string;
  /** describe path outermost-first; [] for root-level tests */
  suite: string[];
  status: "pass" | "fail";
  error?: string;
}

export interface RunSummary {
  results: TestResult[];
  total: number;
  passed: number;
  failed: number;
}

interface CollectedTest {
  name: string;
  suite: string[];
  fn: () => void | Promise<void>;
}

const SCOPE_SEP = "\u0000";
const scopeKey = (suite: string[]): string => suite.join(SCOPE_SEP);

/**
 * Two-phase runner:
 *   1. REGISTRATION — `register` executes synchronously, building a flat
 *      test list + hooks-per-scope map (the "tree" is implicit in paths).
 *   2. EXECUTION — tests run sequentially; each assembles its hook chain
 *      from root→leaf (before) and leaf→root (after), then reports.
 */
export async function runTests(register: (t: SuiteHandle) => void): Promise<RunSummary> {
  const tests: CollectedTest[] = [];
  const beforeByScope = new Map<string, Hook[]>();
  const afterByScope = new Map<string, Hook[]>();
  let currentSuite: string[] = [];

  const hooksFor = (store: Map<string, Hook[]>, scope: string[]): Hook[] =>
    store.get(scopeKey(scope)) ?? [];

  const handle: SuiteHandle = {
    describe(name, fn) {
      const parent = currentSuite;
      currentSuite = [...parent, name];
      try {
        fn(); // registration is synchronous tree-building
      } finally {
        currentSuite = parent;
      }
    },

    it(name, fn) {
      tests.push({ name, suite: [...currentSuite], fn });
    },

    beforeEach(hook) {
      const key = scopeKey(currentSuite);
      beforeByScope.set(key, [...(beforeByScope.get(key) ?? []), hook]);
    },

    afterEach(hook) {
      const key = scopeKey(currentSuite);
      afterByScope.set(key, [...(afterByScope.get(key) ?? []), hook]);
    },
  };

  register(handle);

  // ── execution ──────────────────────────────────────────────────────────
  const results: TestResult[] = [];

  for (const test of tests) {
    let bodyError: string | undefined;
    let hookError: string | undefined;

    // beforeEach chain: outermost scope first.
    const beforeChain: Hook[] = [];
    for (let depth = 0; depth <= test.suite.length; depth++) {
      beforeChain.push(...hooksFor(beforeByScope, test.suite.slice(0, depth)));
    }
    for (const hook of beforeChain) {
      try {
        await hook();
      } catch (error) {
        bodyError = bodyError ?? (error instanceof Error ? error.message : String(error));
      }
    }

    if (bodyError === undefined) {
      try {
        await test.fn();
      } catch (error) {
        bodyError = error instanceof Error ? error.message : String(error);
      }
    }

    // afterEach: reverse nesting order; runs even after a failed body,
    // but never overwrites the body's error in the report.
    for (let depth = test.suite.length; depth >= 0; depth--) {
      for (const hook of hooksFor(afterByScope, test.suite.slice(0, depth))) {
        try {
          await hook();
        } catch (error) {
          hookError = hookError ?? (error instanceof Error ? error.message : String(error));
        }
      }
    }

    const error = bodyError ?? hookError;
    results.push({
      name: test.name,
      suite: test.suite,
      status: error === undefined ? "pass" : "fail",
      ...(error !== undefined ? { error } : {}),
    });
  }

  const failed = results.filter((r) => r.status === "fail").length;
  return {
    results,
    total: results.length,
    passed: results.length - failed,
    failed,
  };
}
