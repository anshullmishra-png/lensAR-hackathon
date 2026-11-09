import {EventBus} from "../core/EventBus"
import {Events} from "../core/Events"
import {levelOf, ScoreKeeper} from "../core/ScoreKeeper"
import {assert, assertEqual, test} from "./TestKit"

function fresh(): {score: ScoreKeeper; changes: {correct: number; total: number}[]} {
  const bus = new EventBus()
  const changes: {correct: number; total: number}[] = []
  bus.on(Events.SCORE_CHANGED, (p: {correct: number; total: number}) => changes.push(p))
  return {score: new ScoreKeeper(bus), changes}
}

test("ScoreKeeper: only the first attempt at a question counts", () => {
  const {score} = fresh()
  assert(score.record("l1_a", false), "first attempt is recorded")
  assert(!score.record("l1_a", true), "second attempt is ignored")
  assertEqual(score.total(), 1, "one question")
  assertEqual(score.correctCount(), 0, "the first (wrong) answer stands")
})

test("ScoreKeeper: totals and per-level tallies", () => {
  const {score} = fresh()
  score.record("l1_a", true)
  score.record("l1_b", true)
  score.record("l1_c", false)
  score.record("l2_eat", true)
  score.record("m_remedy", false)
  assertEqual(score.total(), 5, "total answered")
  assertEqual(score.correctCount(), 3, "total correct")
  assertEqual(
    score.perLevel(),
    {1: {correct: 2, total: 3}, 2: {correct: 1, total: 1}, 3: {correct: 0, total: 1}},
    "per level"
  )
})

test("ScoreKeeper: level is read from the question id prefix", () => {
  assertEqual([levelOf("l1_x"), levelOf("l2_x"), levelOf("l3_x"), levelOf("m_x"), levelOf("other")], [1, 2, 3, 3, 0], "levels")
})

test("ScoreKeeper: SCORE_CHANGED is emitted on record and on reset", () => {
  const {score, changes} = fresh()
  score.record("l1_a", true)
  assertEqual(changes[changes.length - 1], {correct: 1, total: 1}, "after record")
  score.record("l1_a", false)
  assertEqual(changes.length, 1, "a repeated attempt emits nothing")
  score.reset()
  assertEqual(changes[changes.length - 1], {correct: 0, total: 0}, "after reset")
})

test("ScoreKeeper: reset clears everything so a new game can start", () => {
  const {score} = fresh()
  score.record("l1_a", true)
  score.reset()
  assertEqual(score.total(), 0, "total")
  assertEqual(score.perLevel(), {}, "per level")
  assert(score.record("l1_a", false), "the same question can be answered again after reset")
  assertEqual(score.correctCount(), 0, "new first attempt counts")
})
