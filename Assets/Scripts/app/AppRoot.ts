import {Config} from "./Config"
import {validate} from "../content/ContentValidator"
import {Content} from "../content/Content"
import {FlowController} from "../core/FlowController"
import {DogController} from "../dog/DogController"
import {DogPlacement} from "../dog/DogPlacement"
import {AudioManager} from "../audio/AudioManager"
import {CaptionBar} from "../ui/CaptionBar"
import {CardPanel} from "../ui/CardPanel"
import {ChoiceButtons} from "../ui/ChoiceButtons"
import {FeedbackDisplay} from "../ui/FeedbackDisplay"
import {ArmPlacement} from "../arm/ArmPlacement"
import {DoseCalendarCard} from "../ui/DoseCalendarCard"
import {EndScreen} from "../ui/EndScreen"
import {ProgressIndicator} from "../ui/ProgressIndicator"
import {UiAnchor} from "../ui/UiAnchor"
import {installAutoPlay} from "../debug/AutoPlay"
import {Log} from "../util/Log"

/** Entry point: checks every wire, validates the content, then starts the flow. */
@component
export class AppRoot extends BaseScriptComponent {
  @input flow: FlowController
  @input dogPlacement: DogPlacement
  @input dogController: DogController
  @input uiAnchor: UiAnchor
  @input cardPanel: CardPanel
  @input choiceButtons: ChoiceButtons
  @input feedback: FeedbackDisplay
  @input captions: CaptionBar
  @input audioManager: AudioManager
  @input progress: ProgressIndicator
  @input armPlacement: ArmPlacement
  @input doseCard: DoseCalendarCard
  @input endScreen: EndScreen

  @input
  @hint("Only for testing without onboarding: place the dog and UI right at start.")
  placeAtStart: boolean = false

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.boot())
  }

  /** One source of truth for where each panel sits: Config.UI_Y (tested so panels never cover the dog). */
  private layoutPanels(): void {
    const y = Config.UI_Y
    const place = (c: BaseScriptComponent, yCm: number): void => {
      c.sceneObject.getTransform().setLocalPosition(new vec3(0, yCm, 0))
    }
    place(this.progress, y.progress)
    place(this.cardPanel, y.card)
    place(this.choiceButtons, y.choices)
    place(this.feedback, y.feedback)
    place(this.captions, y.captions)
    place(this.doseCard, y.dose)
    place(this.endScreen, y.end)
  }

  private boot(): void {
    const required: [string, unknown][] = [
      ["flow", this.flow],
      ["dogPlacement", this.dogPlacement],
      ["dogController", this.dogController],
      ["uiAnchor", this.uiAnchor],
      ["cardPanel", this.cardPanel],
      ["choiceButtons", this.choiceButtons],
      ["feedback", this.feedback],
      ["captions", this.captions],
      ["audioManager", this.audioManager],
      ["progress", this.progress],
      ["armPlacement", this.armPlacement],
      ["doseCard", this.doseCard],
      ["endScreen", this.endScreen]
    ]
    const missing = required.filter(([, v]) => !v).map(([name]) => name)
    if (missing.length > 0) {
      Log.error(`AppRoot: these @inputs are not assigned: ${missing.join(", ")}. Not starting.`)
      return
    }

    for (const problem of validate(Content)) {
      if (problem.startsWith("ERROR")) {
        Log.error(problem)
      } else {
        Log.warn(problem)
      }
    }

    this.layoutPanels()
    if (Config.AUTOPLAY && Config.AUTOPLAY_START_AT) {
      this.flow.startAt = Config.AUTOPLAY_START_AT
    }

    // Skipping onboarding (placeAtStart, or FlowController.startAt) means nobody else places the dog.
    if (this.placeAtStart || this.flow.startAt) {
      this.uiAnchor.snap()
      this.dogPlacement.placeInFrontOfUser()
    }
    if (Config.AUTOPLAY) {
      installAutoPlay(this)
    }
    this.flow.start()
  }
}
