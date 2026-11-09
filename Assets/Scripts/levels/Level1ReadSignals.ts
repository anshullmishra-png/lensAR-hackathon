import {Content} from "../content/Content"
import {Question} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {Events, Phase} from "../core/Events"
import {Log} from "../util/Log"
import {LevelBase} from "./LevelBase"

/** Level 1: Moti shows a body-language state; the user tags it Relaxed / Nervous / Warning. */
@component
export class Level1ReadSignals extends LevelBase {
  protected readonly phase = Phase.LEVEL1

  @input
  @hint("Testing only: play just the first dog state. Leave unticked to play all three.")
  firstItemOnly: boolean = false

  begin(): void {
    this.run().catch((e) => Log.error(`Level 1 failed: ${e}`))
  }

  private async run(): Promise<void> {
    const c = Content.level1
    const items = this.firstItemOnly ? c.items.slice(0, 1) : c.items

    for (const item of items) {
      bus.emit(Events.DOG_SET_POSE, {pose: item.pose})
      await this.wait(0.8)

      bus.emit(Events.SHOW_CARD, {title: c.prompt, body: c.hint})
      this.say({text: c.prompt})

      const question: Question = {
        id: item.id,
        explanation: item.explanation,
        choices: c.choices.map((o) => ({...o, correct: o.id === item.answer}))
      }
      const picked = await this.ask(question)
      this.evaluate(question, picked)
      // The feedback panel takes the buttons' place, so remove them straight away.
      bus.emit(Events.CLEAR_CHOICES)

      // The chime plays first (FeedbackDisplay), then the recorded explanation, if there is one.
      await this.settle(item.id)
      // The "signs to look for" callouts on Moti stay up a little longer, after the feedback panel has gone.
      if (item.signals && item.signals.length > 0) {
        await this.wait(3)
      }

      bus.emit(Events.HIDE_CARD)
    }
    this.end()
  }
}
