import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {Config} from "../app/Config"
import {LocalText} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {Events, ShowCardPayload} from "../core/Events"
import {TweenHelpers} from "../util/TweenHelpers"
import {addText, COLOR_TEXT_DIM, makeInertSoon, COLOR_CARD, COLOR_CARD_EDGE, tintPlate } from "./UiText"

/** The main floating card: Hindi large on top, English smaller underneath. */
@component
export class CardPanel extends BaseScriptComponent {
  private titleHi: Text
  private titleEn: Text
  private bodyHi: Text
  private bodyEn: Text

  onAwake(): void {
    const w = Config.CARD_W
    const h = Config.CARD_H
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(w, h)
    tintPlate(this, this.sceneObject, COLOR_CARD, COLOR_CARD_EDGE)

    const inner = w - 4
    this.titleHi = addText(this.sceneObject, "TitleHi", Config.SIZE_TITLE_HI, inner, 6, 0, 11)
    this.titleEn = addText(this.sceneObject, "TitleEn", Config.SIZE_EN, inner, 4, 0, 6.3, COLOR_TEXT_DIM)
    this.bodyHi = addText(this.sceneObject, "BodyHi", Config.SIZE_BODY_HI - 4, inner, 9, 0, 0)
    this.bodyEn = addText(this.sceneObject, "BodyEn", Config.SIZE_EN - 2, inner, 8, 0, -8.5, COLOR_TEXT_DIM)

    bus.on(Events.SHOW_CARD, (p: ShowCardPayload) => this.show(p.title, p.body))
    bus.on(Events.HIDE_CARD, () => this.hide())
    this.sceneObject.enabled = false
  }

  show(title: LocalText, body?: LocalText): void {
    this.titleHi.text = title.hi
    this.titleEn.text = title.en
    this.bodyHi.text = body ? body.hi : ""
    this.bodyEn.text = body ? body.en : ""
    // Long bodies (first-aid steps) get smaller text so they stay inside the card.
    const hiLen = body ? body.hi.length : 0
    const enLen = body ? body.en.length : 0
    this.bodyHi.size = (Config.SIZE_BODY_HI - (hiLen > 70 ? 7 : hiLen > 50 ? 5 : 3)) * Config.TEXT_SCALE
    this.bodyEn.size = (Config.SIZE_EN - (enLen > 70 ? 4 : enLen > 50 ? 3 : 1)) * Config.TEXT_SCALE
    this.sceneObject.enabled = true
    makeInertSoon(this, this.sceneObject)
    TweenHelpers.scaleIn(this.sceneObject, vec3.one(), 0.25)
  }

  hide(): void {
    if (!this.sceneObject.enabled) {
      return
    }
    TweenHelpers.scaleOut(this.sceneObject, 0.2, () => {
      this.sceneObject.enabled = false
    })
  }
}
