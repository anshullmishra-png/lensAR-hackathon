import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {Button} from "UIKit.lspkg/Scripts/Components/Button/Button"
import {Config} from "../app/Config"
import {Content} from "../content/Content"
import {bus} from "../core/EventBus"
import {Events, ScorePayload} from "../core/Events"
import {scoreKeeper} from "../core/ScoreKeeper"
import {TweenHelpers} from "../util/TweenHelpers"
import {addText, COLOR_TEXT_DIM, makeInertSoon, COLOR_CARD, COLOR_CARD_EDGE, tintPlate, tintButton } from "./UiText"

const W = Config.CARD_W
const H = Config.END_H
/** Everything below is laid out around y = 0 and then lifted by this so the plate is centred on it. */
const LIFT = 6.5

/** Final screen: score, one line per level, the closing message, and a "Play again" button. */
@component
export class EndScreen extends BaseScriptComponent {
  private score: Text
  private rows: Text[] = []
  private pressed = false

  onAwake(): void {
    const c = Content.end
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(W, H)
    tintPlate(this, this.sceneObject, COLOR_CARD, COLOR_CARD_EDGE)
    const inner = W - 5

    const y = (v: number): number => v + LIFT
    addText(this.sceneObject, "TitleHi", 56, inner, 5, 0, y(17)).text = c.title.hi
    addText(this.sceneObject, "TitleEn", 32, inner, 3, 0, y(13.3), COLOR_TEXT_DIM).text = c.title.en
    addText(this.sceneObject, "ScoreLabel", 30, inner, 3, 0, y(9.5), COLOR_TEXT_DIM).text = `${c.scoreLabel.hi} · ${c.scoreLabel.en}`
    this.score = addText(this.sceneObject, "Score", 72, inner, 7, 0, y(4.5))

    for (let i = 0; i < 3; i++) {
      const line = addText(this.sceneObject, `Row${i}`, 29, inner, 4, 0, y(-1.2 - i * 3.8), COLOR_TEXT_DIM)
      line.text = `${c.levelLines[i].hi} · ${c.levelLines[i].en}`
      this.rows.push(line)
    }

    addText(this.sceneObject, "ClosingHi", 34, inner, 5, 0, y(-14)).text = c.closing.text.hi
    addText(this.sceneObject, "ClosingEn", 26, inner, 4, 0, y(-18.5), COLOR_TEXT_DIM).text = c.closing.text.en
    addText(this.sceneObject, "Footer", 23, inner, 3, 0, y(-22.5), COLOR_TEXT_DIM).text = `${c.footer.hi} ${c.footer.en}`
    this.buildButton()

    bus.on(Events.GAME_COMPLETE, (p: ScorePayload) => this.show(p))
    bus.on(Events.RESTART, () => this.hide())
    this.sceneObject.enabled = false
  }

  private buildButton(): void {
    const row = global.scene.createSceneObject("PlayAgain")
    row.setParent(this.sceneObject)
    row.getTransform().setLocalPosition(new vec3(0, -30 + LIFT, 0.6))
    const btn = row.createComponent(Button.getTypeName()) as Button
    btn.setVariant({theme: "System 3.0", style: "Primary"})
    tintButton(this, btn, 28, 8)
    btn.size = new vec3(28, 8, 1)
    const c = Content.end.playAgain
    addText(row, "LabelHi", Config.SIZE_BUTTON, 24, 3.2, 0, 1.2, undefined, 0.3).text = c.hi
    addText(row, "LabelEn", Config.SIZE_EN - 6, 24, 2.4, 0, -1.6, undefined, 0.3).text = c.en
    btn.onTriggerUp.add(() => {
      if (this.pressed) {
        return
      }
      this.pressed = true
      bus.emit(Events.RESTART)
    })
  }

  private show(p: ScorePayload): void {
    this.pressed = false
    this.score.text = `${p.correct} / ${p.total}`
    const per = scoreKeeper.perLevel()
    const c = Content.end
    this.rows.forEach((row, i) => {
      const lvl = per[i + 1]
      const tally = lvl ? `${lvl.correct} / ${lvl.total}` : "-"
      row.text = `${c.levelLines[i].hi} · ${c.levelLines[i].en}   ${tally}`
    })
    this.sceneObject.enabled = true
    makeInertSoon(this, this.sceneObject)
    TweenHelpers.scaleIn(this.sceneObject, vec3.one(), 0.3)
    bus.emit(Events.PLAY_AUDIO, {audioId: c.closing.audioId})
  }

  private hide(): void {
    if (!this.sceneObject.enabled) {
      return
    }
    TweenHelpers.scaleOut(this.sceneObject, 0.2, () => {
      this.sceneObject.enabled = false
    })
  }
}
