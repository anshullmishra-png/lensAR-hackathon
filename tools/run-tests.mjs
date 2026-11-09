// Zero-dependency test runner for the pure-logic tests in Assets/Scripts/tests.
//
//   node tools/run-tests.mjs
//
// Needs Node 22.15+ (tested on 24). It transpiles the TypeScript on the fly using Node's own
// `stripTypeScriptTypes`, and lets extension-less imports ("./EventBus") resolve to .ts files,
// the way Lens Studio does. Nothing is installed and nothing is written to disk.
import {existsSync, readdirSync, readFileSync} from "node:fs"
import {registerHooks, stripTypeScriptTypes} from "node:module"
import path from "node:path"
import {fileURLToPath, pathToFileURL} from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const testsDir = path.join(root, "Assets", "Scripts", "tests")

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../")
    if (relative && !path.extname(specifier) && context.parentURL) {
      const candidate = path.resolve(path.dirname(fileURLToPath(context.parentURL)), `${specifier}.ts`)
      if (existsSync(candidate)) {
        return {url: pathToFileURL(candidate).href, shortCircuit: true}
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      const source = readFileSync(fileURLToPath(url), "utf8")
      return {format: "module", source: stripTypeScriptTypes(source, {mode: "transform"}), shortCircuit: true}
    }
    return nextLoad(url, context)
  }
})

// Keep the game's own warnings (illegal transitions are logged on purpose) out of the report.
const realWarn = console.warn
console.warn = () => {}

const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.ts")).sort()
for (const f of files) {
  await import(pathToFileURL(path.join(testsDir, f)).href)
}

const {runAll} = await import(pathToFileURL(path.join(testsDir, "TestKit.ts")).href)
const result = await runAll()
console.warn = realWarn

for (const r of result.results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `\n        ${r.error}`}`)
}
console.log(`\n${result.passed} passed, ${result.failed} failed, ${result.results.length} total`)
process.exit(result.failed === 0 ? 0 : 1)
