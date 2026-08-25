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

export function runTests(register: (t: SuiteHandle) => void): Promise<RunSummary> {
  throw new Error("TODO: implement runTests");
}
