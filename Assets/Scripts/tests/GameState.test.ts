import {EventBus} from "../core/EventBus"
import {Events, Phase} from "../core/Events"
import {GameState} from "../core/GameState"
import {assert, assertEqual, test} from "./TestKit"

function fresh(): {state: GameState; started: Phase[]} {
  const bus = new EventBus()
  const started: Phase[] = []
  bus.on(Events.LEVEL_START, (p: {phase: Phase}) => started.push(p.phase))
  return {state: new GameState(bus), started}
}

test("GameState: starts at ONBOARDING", () => {
  const {state} = fresh()
  assertEqual(state.current(), Phase.ONBOARDING, "initial phase")
  assert(state.canAdvance(), "can advance from ONBOARDING")
})

test("GameState: full forward path ONBOARDING -> LEVEL1 -> LEVEL2 -> LEVEL3 -> END", () => {
  const {state, started} = fresh()
  const seen: Phase[] = []
  while (state.canAdvance()) {
    const next = state.next()
    assert(next !== null, "next() should succeed")
    seen.push(state.current())
  }
  assertEqual(seen, [Phase.LEVEL1, Phase.LEVEL2, Phase.LEVEL3, Phase.END], "phases visited")
  assertEqual(started, seen, "LEVEL_START emitted on every transition")
  assert(!state.canAdvance(), "cannot advance past END")
})

test("GameState: illegal transitions are rejected and change nothing", () => {
  const {state, started} = fresh()
  assertEqual(state.advanceTo(Phase.LEVEL2), null, "ONBOARDING -> LEVEL2 skips a phase")
  assertEqual(state.current(), Phase.ONBOARDING, "still ONBOARDING")
  assertEqual(started.length, 0, "no event for a rejected transition")

  while (state.canAdvance()) {
    state.next()
  }
  assertEqual(state.advanceTo(Phase.LEVEL2), null, "END -> LEVEL2 is illegal")
  assertEqual(state.next(), null, "next() at END is rejected")
  assertEqual(state.current(), Phase.END, "still END")
})

test("GameState: reset returns to ONBOARDING and announces it", () => {
  const {state, started} = fresh()
  state.next()
  state.next()
  state.reset()
  assertEqual(state.current(), Phase.ONBOARDING, "after reset")
  assertEqual(started[started.length - 1], Phase.ONBOARDING, "reset emits LEVEL_START for ONBOARDING")
  state.next()
  assertEqual(state.current(), Phase.LEVEL1, "can play again after reset")
})
