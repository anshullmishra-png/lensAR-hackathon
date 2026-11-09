import {Content} from "../content/Content"
import type {ContentRoot} from "../content/ContentTypes"
import {validate} from "../content/ContentValidator"
import {assert, assertEqual, assertSomeContains, test} from "./TestKit"

/** A deep copy of the real content that a test can break without touching the original. */
function copy(): ContentRoot {
  return JSON.parse(JSON.stringify(Content)) as ContentRoot
}

const errors = (list: string[]): string[] => list.filter((s) => s.startsWith("ERROR"))
const warnings = (list: string[]): string[] => list.filter((s) => s.startsWith("WARN"))

test("ContentValidator: the real Content passes with no errors and no warnings", () => {
  assertEqual(validate(Content), [], "problems in the real content")
})

test("ContentValidator: a question with two correct choices is caught", () => {
  const c = copy()
  c.level2.items[0].choices.forEach((ch) => {
    ch.correct = true
  })
  assertSomeContains(errors(validate(c)), "exactly one correct choice", "two correct answers")
})

test("ContentValidator: a question with no correct choice is caught", () => {
  const c = copy()
  c.level2.items[1].choices.forEach((ch) => {
    ch.correct = false
  })
  assertSomeContains(errors(validate(c)), "exactly one correct choice", "no correct answer")
})

test("ContentValidator: a Level 1 answer that matches no choice is caught", () => {
  const c = copy()
  c.level1.items[0].answer = "not-a-choice"
  assertSomeContains(errors(validate(c)), "exactly one correct choice", "bad level 1 answer")
})

test("ContentValidator: a missing Hindi or English text is an error", () => {
  const c = copy()
  c.level1.items[0].explanation.hi = ""
  c.level2.items[2].situation.en = ""
  const found = errors(validate(c))
  assertSomeContains(found, "level1.items.l1_a.explanation.hi is empty", "missing hi")
  assertSomeContains(found, "level2.items.l2_sleep.situation.en is empty", "missing en")
})

test('ContentValidator: a Hindi line that is still "TODO" is only a warning', () => {
  const c = copy()
  c.level3.myths[0].claim.hi = "TODO"
  const found = validate(c)
  assertEqual(errors(found), [], "no errors")
  assertSomeContains(warnings(found), "level3.myths.m_remedy.claim.hi is still TODO", "TODO warning")
})

test("ContentValidator: a repeated audio id is caught", () => {
  const c = copy()
  c.level2.items[1].id = c.level2.items[0].id
  assertSomeContains(errors(validate(c)), 'audioId "l2_eat" used twice', "duplicate audio id")
})

test("ContentValidator: an unknown dog pose or prop is caught", () => {
  const c = copy()
  c.level1.items[0].pose = "backflip"
  c.level2.items[0].props = ["bowl", "frisbee"]
  const found = errors(validate(c))
  assertSomeContains(found, 'unknown dog pose "backflip"', "bad pose")
  assertSomeContains(found, 'unknown prop "frisbee"', "bad prop")
})

test("ContentValidator: the closing line and footer must exist in both languages", () => {
  const c = copy()
  c.end.footer.hi = ""
  assert(errors(validate(c)).length > 0, "an empty footer should be an error")
})
