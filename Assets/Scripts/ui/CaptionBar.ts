import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {Config} from "../app/Config"
import {LocalText} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {Events, ShowCaptionPayload} from "../core/Events"
import {addText, COLOR_TEXT_DIM, makeInertSoon, COLOR_CARD, COLOR_CARD_EDGE, tintPlate } from "./UiText"

const W = Config.CARD_W + 4
const H = 9

/** One caption line near the bottom of the view: Hindi above English. Clears itself after a while. */
@component
export class CaptionBar extends BaseScriptComponent {
  private hi: Text
  private en: Text
  private clearEvent: DelayedCallbackEvent

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(W, H)
    tintPlate(this, this.sceneObject, COLOR_CARD, COLOR_CARD_EDGE)
    this.hi = addText(this.sceneObject, "CaptionHi", Config.SIZE_BODY_HI - 6, W - 4, 4.2, 0, 1.8)
    this.en = addText(this.sceneObject, "CaptionEn", Config.SIZE_EN - 4, W - 4, 3.2, 0, -2.4, COLOR_TEXT_DIM)

    this.clearEvent = this.createEvent("DelayedCallbackEvent")
    this.clearEvent.bind(() => this.clear())
    bus.on(Events.SHOW_CAPTION, (p: ShowCaptionPayload) => this.show(p.text))
    this.sceneObject.enabled = false
  }

  show(text: LocalText): void {
    this.hi.text = text.hi
    this.en.text = text.en
    this.sceneObject.enabled = true
    makeInertSoon(this, this.sceneObject)
    // Longer lines stay longer: 3 s plus about 0.06 s per character.
    this.clearEvent.reset(3 + 0.06 * Math.max(text.en.length, text.hi.length))
  }

  clear(): void {
    this.sceneObject.enabled = false
  }
}
