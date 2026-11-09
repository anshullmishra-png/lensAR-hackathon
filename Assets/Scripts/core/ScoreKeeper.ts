import {bus, EventBus} from "./EventBus"
import {Events} from "./Events"

interface Entry {
  correct: boolean
  level: number
}

/** Level from a question id prefix: l1_ = 1, l2_ = 2, l3_ or m_ (first aid) = 3. 0 = unknown. */
export function levelOf(questionId: string): number {
  if (questionId.startsWith("l1_")) {
    return 1
  }
  if (questionId.startsWith("l2_")) {
    return 2
  }
  if (questionId.startsWith("l3_") || questionId.startsWith("m_")) {
    return 3
  }
  return 0
}

/** Pure scoring, no scene objects. Only the FIRST attempt at a question counts. */
export class ScoreKeeper {
  private records = new Map<string, Entry>()

  constructor(private readonly events: EventBus = bus) {}

  /** Returns false (and changes nothing) if this question was already answered. */
  record(questionId: string, correct: boolean, level: number = levelOf(questionId)): boolean {
    if (this.records.has(questionId)) {
      return false
    }
    this.records.set(questionId, {correct, level})
    this.events.emit(Events.SCORE_CHANGED, {correct: this.correctCount(), total: this.total()})
    return true
  }

  total(): number {
    return this.records.size
  }

  correctCount(): number {
    let n = 0
    this.records.forEach((r) => {
      if (r.correct) {
        n++
      }
    })
    return n
  }

  perLevel(): {[level: number]: {correct: number; total: number}} {
    const out: {[level: number]: {correct: number; total: number}} = {}
    this.records.forEach((r) => {
      const slot = out[r.level] ?? {correct: 0, total: 0}
      slot.total++
      if (r.correct) {
        slot.correct++
      }
      out[r.level] = slot
    })
    return out
  }

  reset(): void {
    this.records.clear()
    this.events.emit(Events.SCORE_CHANGED, {correct: 0, total: 0})
  }
}

export const scoreKeeper = new ScoreKeeper()
