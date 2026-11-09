import {Button} from "UIKit.lspkg/Scripts/Components/Button/Button"
import {Config} from "../app/Config"
import {ChoiceOption} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {Events, SetChoicesPayload} from "../core/Events"
import {Log} from "../util/Log"
import {addText, tintButton } from "./UiText"

/** Up to 3 large pinchable buttons, each labelled Hindi over English. */
@component
export class ChoiceButtons extends BaseScriptComponent {
  private rows: SceneObject[] = []
  private buttons: Button[] = []
  private locked = false

  onAwake(): void {
    bus.on(Events.SET_CHOICES, (p: SetChoicesPayload) => this.setChoices(p.questionId, p.choices))
    bus.on(Events.CLEAR_CHOICES, () => this.clear())
  }

  setChoices(questionId: string, choices: ChoiceOption[]): void {
    this.clear()
    this.locked = false
    const list = choices.slice(0, 3)
    if (choices.length > 3) {
      Log.warn(`ChoiceButtons: ${choices.length} choices given, showing the first 3`)
    }
    // Long answers (Level 2) get taller, wider buttons with smaller text so they fit.
    const longest = Math.max(...list.map((c) => Math.max(c.label.en.length, c.label.hi.length)))
    const long = longest > 22
    list.forEach((choice, i) => this.addButton(questionId, choice, i, long))
  }

  clear(): void {
    this.rows.forEach((r) => r.destroy())
    this.rows = []
    this.buttons = []
  }

  private addButton(questionId: string, choice: ChoiceOption, index: number, long: boolean): void {
    const w = long ? Config.CARD_W - 2 : Config.BUTTON_W
    const h = long ? Config.BUTTON_LONG_H : Config.BUTTON_H
    const row = global.scene.createSceneObject(`Choice_${choice.id}`)
    row.setParent(this.sceneObject)
    row.getTransform().setLocalPosition(new vec3(0, -index * (h + Config.BUTTON_GAP), 0))

    const btn = row.createComponent(Button.getTypeName()) as Button
    btn.setVariant({theme: "System 3.0", style: "Primary"})
    tintButton(this, btn, w, h)
    btn.size = new vec3(w, h, 1)

    // Label sits just in front of the button face so its glyphs are not clipped by it.
    const hiSize = long ? 40 : Config.SIZE_BUTTON
    const enSize = long ? 30 : Config.SIZE_EN - 6
    addText(row, "LabelHi", hiSize, w - 2, long ? 4 : 3.2, 0, long ? 2 : 1.2, undefined, 0.3).text = choice.label.hi
    addText(row, "LabelEn", enSize, w - 2, long ? 3.2 : 2.4, 0, long ? -2.2 : -1.6, undefined, 0.3).text = choice.label.en

    btn.onTriggerUp.add(() => this.pick(questionId, choice.id))
    this.rows.push(row)
    this.buttons.push(btn)
  }

  private pick(questionId: string, choiceId: string): void {
    if (this.locked) {
      return
    }
    this.locked = true
    this.buttons.forEach((b) => {
      b.inactive = true
    })
    bus.emit(Events.CHOICE_MADE, {questionId, choiceId})
  }
}
