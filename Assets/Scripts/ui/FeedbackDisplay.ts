import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {Config} from "../app/Config"
import {Content} from "../content/Content"
import {bus} from "../core/EventBus"
import {AnswerResultPayload, Events} from "../core/Events"
import {Log} from "../util/Log"
import {TweenHelpers} from "../util/TweenHelpers"
import {buildCross, buildTick} from "./Shapes"
import {addText, COLOR_TEXT_DIM, makeInertSoon} from "./UiText"

const W = Config.CARD_W
const H = Config.FEEDBACK_H

/**
 * Right / Not quite feedback. The result is shown as a SHAPE (tick or cross) and as WORDS,
 * never as colour alone, then the explanation. Hides itself after FEEDBACK_SECONDS.
 */
@component
export class FeedbackDisplay extends BaseScriptComponent {
  @input
  @hint("A 1x1x1 box mesh used to draw the tick and cross")
  barMesh: RenderMesh

  @input
  @hint("Material for the tick")
  goodMaterial: Material

  @input
  @hint("Material for the cross")
  badMaterial: Material

  private tick: SceneObject
  private cross: SceneObject
  private head: Text
  private bodyHi: Text
  private bodyEn: Text
  private hideEvent: DelayedCallbackEvent

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(W, H)

    const textW = W - 14
    const textX = 5
    this.head = addText(this.sceneObject, "Head", 52, textW, 5, textX, 8)
    this.bodyHi = addText(this.sceneObject, "BodyHi", Config.SIZE_BODY_HI - 6, textW, 8, textX, 0.5)
    this.bodyEn = addText(this.sceneObject, "BodyEn", Config.SIZE_EN - 4, textW, 7, textX, -7, COLOR_TEXT_DIM)

    if (!this.barMesh || !this.goodMaterial || !this.badMaterial) {
      Log.error("FeedbackDisplay: barMesh / goodMaterial / badMaterial not assigned")
    } else {
      this.tick = buildTick(this.sceneObject, this.barMesh, this.goodMaterial)
      this.cross = buildCross(this.sceneObject, this.barMesh, this.badMaterial)
      for (const symbol of [this.tick, this.cross]) {
        symbol.getTransform().setLocalPosition(new vec3(-(W / 2 - 6), 0, 0.8))
      }
    }

    this.hideEvent = this.createEvent("DelayedCallbackEvent")
    this.hideEvent.bind(() => this.hide())
    bus.on(Events.ANSWER_RESULT, (p: AnswerResultPayload) => this.show(p))
    this.sceneObject.enabled = false
  }

  private show(p: AnswerResultPayload): void {
    const label = p.correct ? Content.ui.right : Content.ui.notQuite
    this.head.text = `${label.hi}  ·  ${label.en}`
    this.bodyHi.text = p.explanation.hi
    this.bodyEn.text = p.explanation.en
    if (this.tick && this.cross) {
      this.tick.enabled = p.correct
      this.cross.enabled = !p.correct
    }
    // Soft chime when right, neutral tone when wrong (ids resolve to clips when they exist).
    bus.emit(Events.PLAY_AUDIO, {audioId: p.correct ? "sfx_right" : "sfx_wrong"})
    this.sceneObject.enabled = true
    makeInertSoon(this, this.sceneObject)
    TweenHelpers.scaleIn(this.sceneObject, vec3.one(), 0.25)
    this.hideEvent.reset(Config.FEEDBACK_SECONDS)
  }

  private hide(): void {
    TweenHelpers.scaleOut(this.sceneObject, 0.2, () => {
      this.sceneObject.enabled = false
    })
  }
}
