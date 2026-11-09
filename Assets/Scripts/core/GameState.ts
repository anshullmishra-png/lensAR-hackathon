import {Log} from "../util/Log"
import {bus, EventBus} from "./EventBus"
import {Events, Phase} from "./Events"

const ORDER: Phase[] = [Phase.ONBOARDING, Phase.LEVEL1, Phase.LEVEL2, Phase.LEVEL3, Phase.END]

/** Pure state machine, no scene objects: ONBOARDING -> LEVEL1 -> LEVEL2 -> LEVEL3 -> END. */
export class GameState {
  private index = 0

  constructor(private readonly events: EventBus = bus) {}

  current(): Phase {
    return ORDER[this.index]
  }

  canAdvance(): boolean {
    return this.index < ORDER.length - 1
  }

  /** Move to the next phase. Returns it, or null (with a warning) if already at END. */
  next(): Phase | null {
    if (!this.canAdvance()) {
      Log.warn(`GameState: cannot advance past ${this.current()}`)
      return null
    }
    return this.moveTo(ORDER[this.index + 1])
  }

  /** Only the immediate next phase is legal; anything else is rejected with a warning. */
  advanceTo(phase: Phase): Phase | null {
    if (!this.canAdvance() || ORDER[this.index + 1] !== phase) {
      Log.warn(`GameState: illegal transition ${this.current()} -> ${phase}`)
      return null
    }
    return this.moveTo(phase)
  }

  reset(): void {
    this.index = 0
    this.events.emit(Events.LEVEL_START, {phase: this.current()})
  }

  private moveTo(phase: Phase): Phase {
    this.index = ORDER.indexOf(phase)
    this.events.emit(Events.LEVEL_START, {phase})
    return phase
  }
}

export const gameState = new GameState()
