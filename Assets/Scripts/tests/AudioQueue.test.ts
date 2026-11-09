import {AudioQueue} from "../audio/AudioQueue"
import type {AudioPlayer} from "../audio/AudioQueue"
import {assert, assertEqual, test} from "./TestKit"

/** A fake speaker that records what it was told and how many clips sounded at the same moment. */
class FakePlayer implements AudioPlayer {
  log: string[] = []
  active = 0
  maxActive = 0
  missing = new Set<string>()

  start(id: string): boolean {
    if (this.missing.has(id)) {
      return false
    }
    this.log.push(`start ${id}`)
    this.active++
    this.maxActive = Math.max(this.maxActive, this.active)
    return true
  }

  halt(): void {
    this.log.push("halt")
    this.active = Math.max(0, this.active - 1)
  }

  /** The current clip ended on its own. */
  end(q: AudioQueue): void {
    this.active = Math.max(0, this.active - 1)
    q.finished()
  }
}

function setup(): {q: AudioQueue; p: FakePlayer} {
  const q = new AudioQueue()
  const p = new FakePlayer()
  q.attach(p)
  return {q, p}
}

test("AudioQueue: a new voice line interrupts the old one, never overlapping it", () => {
  const {q, p} = setup()
  q.request("a", false)
  q.request("b", false)
  assertEqual(p.log, ["start a", "halt", "start b"], "calls in order")
  assertEqual(p.maxActive, 1, "never two clips at once")
})

test("AudioQueue: a queued clip waits for the current one to finish", () => {
  const {q, p} = setup()
  q.request("chime", false)
  q.request("explanation", true)
  assertEqual(p.log, ["start chime"], "explanation has not started yet")
  p.end(q)
  assertEqual(p.log, ["start chime", "start explanation"], "explanation starts when the chime ends")
  assertEqual(p.maxActive, 1, "never two clips at once")
})

test("AudioQueue: a missing clip is skipped and never blocks the ones behind it", () => {
  const {q, p} = setup()
  p.missing.add("no_clip")
  q.request("no_clip", false)
  assert(!q.busy(), "a missing clip leaves the queue idle (captions only)")

  q.request("chime", false)
  q.request("no_clip", true)
  q.request("explanation", true)
  p.end(q)
  assertEqual(p.log, ["start chime", "start explanation"], "the missing clip was skipped")
})

test("AudioQueue: whenIdle resolves only after everything has played", async () => {
  const {q, p} = setup()
  q.request("chime", false)
  q.request("explanation", true)
  let idle = false
  const waiting = q.whenIdle().then(() => {
    idle = true
  })
  await Promise.resolve()
  assert(!idle, "not idle while the chime plays")
  p.end(q)
  await Promise.resolve()
  assert(!idle, "not idle while the explanation plays")
  p.end(q)
  await waiting
  assert(idle, "idle after the last clip")
})

test("AudioQueue: whenIdle resolves at once when there is nothing to play", async () => {
  const {q} = setup()
  await q.whenIdle()
  assert(!q.busy(), "idle")
})

test("AudioQueue: stop silences everything and releases anyone waiting", async () => {
  const {q, p} = setup()
  q.request("a", false)
  q.request("b", true)
  const waiting = q.whenIdle()
  q.stop()
  await waiting
  assert(!q.busy(), "idle after stop")
  assertEqual(p.log, ["start a", "halt"], "b never started")
})

test("AudioQueue: random mixes of voice, queued, finish and stop never overlap two clips", () => {
  // A small deterministic pseudo-random generator, so a failure can be reproduced.
  let seed = 12345
  const rand = (n: number): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed % n
  }
  for (let round = 0; round < 200; round++) {
    const {q, p} = setup()
    p.missing.add("m1")
    p.missing.add("m2")
    const ids = ["a", "b", "c", "m1", "m2"]
    for (let step = 0; step < 30; step++) {
      const op = rand(5)
      const id = ids[rand(ids.length)]
      if (op === 0) {
        q.request(id, false)
      } else if (op === 1 || op === 2) {
        q.request(id, true)
      } else if (op === 3 && p.active > 0) {
        p.end(q)
      } else if (op === 4 && rand(4) === 0) {
        q.stop()
      }
      assert(p.active <= 1, `two clips at once (round ${round}, step ${step})`)
    }
  }
})
