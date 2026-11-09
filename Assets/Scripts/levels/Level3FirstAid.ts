import {Content} from "../content/Content"
import {LocalText, Question} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {Events, Phase} from "../core/Events"
import {Log} from "../util/Log"
import {LevelBase} from "./LevelBase"

/**
 * Level 3: guided first aid on a stylised arm (no blood). Wash with a timer, three myth cards,
 * "go to the health centre today", then the dose card. Only the text in Content.ts is used.
 */
@component
export class Level3FirstAid extends LevelBase {
  protected readonly phase = Phase.LEVEL3

  private nextCounter = 0

  begin(): void {
    this.run().catch((e) => Log.error(`Level 3 failed: ${e}`))
  }

  private async run(): Promise<void> {
    const c = Content.level3

    bus.emit(Events.DOG_VISIBLE, {visible: false})
    bus.emit(Events.ARM_SHOW)
    await this.wait(0.8)

    // Intro
    bus.emit(Events.SHOW_CARD, {title: c.title, body: c.intro.text})
    this.play(c.intro.audioId)
    await this.pressNext()

    // Step 1: wash, with the timer
    bus.emit(Events.SHOW_CARD, {title: c.wash.title, body: c.wash.text})
    this.play(c.wash.id)
    const washed = this.waitFor(Events.WASH_TIMER_DONE)
    bus.emit(Events.WASH_TIMER_START)
    await washed
    await this.wait(0.8)

    // Step 2: myth or fact
    for (const myth of c.myths) {
      bus.emit(Events.SHOW_CARD, {title: myth.claim, body: c.mythPrompt})
      const question: Question = {
        id: myth.id,
        explanation: myth.explanation,
        choices: [
          {id: "myth", label: c.mythLabel, correct: myth.isMyth},
          {id: "fact", label: c.factLabel, correct: !myth.isMyth}
        ]
      }
      const picked = await this.ask(question)
      this.evaluate(question, picked)
      bus.emit(Events.CLEAR_CHOICES)
      await this.settle(myth.id)
    }

    // Step 3: go to the health centre today
    bus.emit(Events.SHOW_CARD, {title: c.go.title, body: c.go.text})
    this.play(c.go.id)
    await this.pressNext()

    // Step 4: dose card (calendar animation + message)
    bus.emit(Events.HIDE_CARD)
    bus.emit(Events.SHOW_DOSE)
    this.play(c.dose.id)
    await this.pressNext()
    bus.emit(Events.HIDE_DOSE)

    bus.emit(Events.STOP_AUDIO)
    bus.emit(Events.ARM_HIDE)
    bus.emit(Events.DOG_VISIBLE, {visible: true})
    await this.wait(0.5)
    this.end()
  }

  private play(audioId: string): void {
    bus.emit(Events.PLAY_AUDIO, {audioId})
  }

  /** One "Next" button; resolves when pinched. Not a scored question. */
  private async pressNext(): Promise<void> {
    const label: LocalText = Content.ui.next
    const q: Question = {
      id: `l3_next_${this.nextCounter++}`,
      explanation: label,
      choices: [{id: "next", label, correct: true}]
    }
    await this.ask(q)
    bus.emit(Events.CLEAR_CHOICES)
  }

  private waitFor(eventName: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const handler = (): void => {
        bus.off(eventName, handler)
        resolve()
      }
      bus.on(eventName, handler)
    })
  }
}
