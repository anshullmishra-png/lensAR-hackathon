import {Content} from "../content/Content"
import {Question} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {Events, Phase} from "../core/Events"
import {Log} from "../util/Log"
import {LevelBase} from "./LevelBase"

/** Level 2: four situations with Moti. The user picks how to behave around him. */
@component
export class Level2WhatToDo extends LevelBase {
  protected readonly phase = Phase.LEVEL2

  @input
  @hint("Testing only: start from this scenario (0 = the first). Leave at 0 for a normal run.")
  startIndex: number = 0

  begin(): void {
    this.run().catch((e) => Log.error(`Level 2 failed: ${e}`))
  }

  private async run(): Promise<void> {
    const c = Content.level2

    for (const item of c.items.slice(Math.max(0, this.startIndex))) {
      bus.emit(Events.DOG_SET_POSE, {pose: item.pose, props: item.props ?? []})
      await this.wait(1.0)

      // The situation is the card's headline; "What do you do?" sits underneath it.
      bus.emit(Events.SHOW_CARD, {title: item.situation, body: c.prompt})

      const question: Question = {id: item.id, choices: item.choices, explanation: item.explanation}
      const picked = await this.ask(question)
      this.evaluate(question, picked)
      bus.emit(Events.CLEAR_CHOICES)

      await this.settle(item.id)

      bus.emit(Events.HIDE_CARD)
    }
    this.end()
  }
}
