/**
 * A tiny test harness with no imports, so it compiles inside Lens Studio and runs in plain Node
 * (see tools/run-tests.mjs). Test files only register tests; nothing runs inside the Lens.
 */
interface TestCase {
  name: string
  fn: () => void | Promise<void>
}

const cases: TestCase[] = []

export function test(name: string, fn: () => void | Promise<void>): void {
  cases.push({name, fn})
}

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(`${message}: expected ${e} but got ${a}`)
  }
}

/** Passes if at least one entry contains the text. */
export function assertSomeContains(list: string[], needle: string, message: string): void {
  if (!list.some((s) => s.indexOf(needle) >= 0)) {
    throw new Error(`${message}: nothing contains "${needle}" in ${JSON.stringify(list)}`)
  }
}

export interface TestResult {
  name: string
  ok: boolean
  error?: string
}

export async function runAll(): Promise<{passed: number; failed: number; results: TestResult[]}> {
  const results: TestResult[] = []
  for (const c of cases) {
    try {
      await c.fn()
      results.push({name: c.name, ok: true})
    } catch (e) {
      results.push({name: c.name, ok: false, error: e instanceof Error ? e.message : String(e)})
    }
  }
  const failed = results.filter((r) => !r.ok).length
  return {passed: results.length - failed, failed, results}
}
