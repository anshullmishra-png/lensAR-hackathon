import {Content} from "../content/Content"
import {Question} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {Events, Phase} from "../core/Events"
import {DogPlacement} from "../dog/DogPlacement"
import {UiAnchor} from "../ui/UiAnchor"
import {Log} from "../util/Log"
import {LevelBase} from "./LevelBase"

/** Places Moti and the panels in front of the user, introduces him, and waits for "Start". */
@component
export class OnboardingLevel extends LevelBase {
  protected readonly phase = Phase.ONBOARDING

  @input
  dogPlacement: DogPlacement

  @input
  uiAnchor: UiAnchor

  begin(): void {
    this.run().catch((e) => Log.error(`Onboarding failed: ${e}`))
  }

  private async run(): Promise<void> {
    const c = Content.onboarding
    this.uiAnchor.snap()
    this.dogPlacement.placeInFrontOfUser()
    bus.emit(Events.DOG_SET_POSE, {pose: "relaxed", props: []})
    await this.wait(0.8)

    bus.emit(Events.SHOW_CARD, {title: c.title, body: c.intro.text})
    if (c.intro.audioId) {
      bus.emit(Events.PLAY_AUDIO, {audioId: c.intro.audioId})
    }

    // One button. It is not a scored question, so evaluate() is never called.
    const start: Question = {
      id: "onb_start",
      explanation: c.start,
      choices: [{id: "start", label: c.start, correct: true}]
    }
    await this.ask(start)

    bus.emit(Events.STOP_AUDIO)
    bus.emit(Events.CLEAR_CHOICES)
    bus.emit(Events.HIDE_CARD)
    await this.wait(0.3)
    this.end()
  }
}
