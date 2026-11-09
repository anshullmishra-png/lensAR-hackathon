import {Log} from "../util/Log"
import {bus} from "./EventBus"
import {Events, Phase} from "./Events"
import {gameState} from "./GameState"
import {scoreKeeper} from "./ScoreKeeper"

interface LevelLike {
  begin?: () => void
}

/**
 * Orchestrator: shows only the current level's object and starts it. Levels that do not exist
 * yet (unassigned inputs) are skipped, so later gates just plug in.
 */
@component
export class FlowController extends BaseScriptComponent {
  @input
  @allowUndefined
  onboarding: SceneObject

  @input
  @allowUndefined
  level1: SceneObject

  @input
  @allowUndefined
  level2: SceneObject

  @input
  @allowUndefined
  level3: SceneObject

  @input
  @hint("Testing only: jump straight to a level (LEVEL1, LEVEL2, LEVEL3). Leave empty for a normal run.")
  startAt: string = ""

  private levels: {[phase: string]: SceneObject | undefined} = {}

  onAwake(): void {
    bus.on(Events.LEVEL_COMPLETE, () => this.advance())
    bus.on(Events.RESTART, () => this.restart())
  }

  start(): void {
    this.levels = {
      [Phase.ONBOARDING]: this.onboarding,
      [Phase.LEVEL1]: this.level1,
      [Phase.LEVEL2]: this.level2,
      [Phase.LEVEL3]: this.level3
    }
    while (this.startAt && gameState.current() !== this.startAt && gameState.canAdvance()) {
      gameState.next()
    }
    this.runCurrent()
  }

  private restart(): void {
    bus.emit(Events.STOP_AUDIO)
    gameState.reset()
    scoreKeeper.reset()
    this.runCurrent()
  }

  private advance(): void {
    if (gameState.next() !== null) {
      this.runCurrent()
    }
  }

  private runCurrent(): void {
    const phase = gameState.current()
    if (phase === Phase.END) {
      Log.info(`Reached END. Score ${scoreKeeper.correctCount()} / ${scoreKeeper.total()}`)
      bus.emit(Events.GAME_COMPLETE, {correct: scoreKeeper.correctCount(), total: scoreKeeper.total()})
      return
    }
    const target = this.levels[phase]
    for (const key of Object.keys(this.levels)) {
      const obj = this.levels[key]
      if (obj) {
        obj.enabled = obj === target
      }
    }
    if (!target) {
      Log.info(`No object for ${phase} yet, skipping it`)
      this.advance()
      return
    }
    Log.info(`Starting ${phase}`)
    for (const comp of target.getComponents("Component.ScriptComponent")) {
      const level = comp as unknown as LevelLike
      if (typeof level.begin === "function") {
        level.begin()
        return
      }
    }
    Log.error(`${phase}: no level script with begin() on ${target.name}`)
  }
}
