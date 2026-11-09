import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {Config} from "../app/Config"
import {Content} from "../content/Content"
import {bus} from "../core/EventBus"
import {Events} from "../core/Events"
import {Log} from "../util/Log"
import {TweenHelpers} from "../util/TweenHelpers"
import {buildTick} from "./Shapes"
import {addText, COLOR_TEXT_DIM, makeInertSoon, COLOR_CARD, COLOR_CARD_EDGE, tintPlate } from "./UiText"

const W = Config.CARD_W
const H = Config.DOSE_H
const COLS = 3

/**
 * Calendar-style card with blank dose slots and the dose message.
 * SAFETY: no dates, no numbers, no dose count. The slots tick on one by one purely as an
 * animation (and the slot count in Config is arbitrary), then it loops.
 */
@component
export class DoseCalendarCard extends BaseScriptComponent {
  @input
  @hint("1x1x1 box mesh")
  boxMesh: RenderMesh

  @input
  @hint("Dim material for an empty slot")
  cellMaterial: Material

  @input
  @hint("Material for the tick")
  tickMaterial: Material

  private ticks: SceneObject[] = []
  private clock = 0
  private shown = 0
  private active = false

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(W, H)
    tintPlate(this, this.sceneObject, COLOR_CARD, COLOR_CARD_EDGE)

    if (!this.boxMesh || !this.cellMaterial || !this.tickMaterial) {
      Log.error("DoseCalendarCard: boxMesh / materials are not assigned")
    } else {
      this.buildGrid()
    }
    const dose = Content.level3.dose
    addText(this.sceneObject, "DoseHi", Config.SIZE_BODY_HI - 8, W - 5, 7, 0, -4.5).text = dose.text.hi
    addText(this.sceneObject, "DoseEn", Config.SIZE_EN - 4, W - 5, 6, 0, -11, COLOR_TEXT_DIM).text = dose.text.en

    bus.on(Events.SHOW_DOSE, () => this.show())
    bus.on(Events.HIDE_DOSE, () => this.hide())
    this.createEvent("UpdateEvent").bind(() => this.tick())
    this.sceneObject.enabled = false
  }

  private show(): void {
    this.shown = 0
    this.clock = 0
    this.ticks.forEach((t) => {
      t.enabled = false
    })
    this.active = true
    this.sceneObject.enabled = true
    makeInertSoon(this, this.sceneObject)
    TweenHelpers.scaleIn(this.sceneObject, vec3.one(), 0.25)
  }

  private hide(): void {
    this.active = false
    if (!this.sceneObject.enabled) {
      return
    }
    TweenHelpers.scaleOut(this.sceneObject, 0.2, () => {
      this.sceneObject.enabled = false
    })
  }

  private buildGrid(): void {
    const rows = Math.ceil(Config.DOSE_SLOTS / COLS)
    for (let i = 0; i < Config.DOSE_SLOTS; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = (col - (COLS - 1) / 2) * 11
      const y = 10.5 - row * 6.5 + (2 - rows) * 0
      const cell = global.scene.createSceneObject(`Slot${i}`)
      cell.setParent(this.sceneObject)
      cell.getTransform().setLocalPosition(new vec3(x, y, 0.4))
      cell.getTransform().setLocalScale(new vec3(9, 5, 0.4))
      const rmv = cell.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.boxMesh
      rmv.mainMaterial = this.cellMaterial

      const tick = buildTick(this.sceneObject, this.boxMesh, this.tickMaterial, 0.45)
      tick.getTransform().setLocalPosition(new vec3(x, y, 1.0))
      tick.enabled = false
      this.ticks.push(tick)
    }
  }

  /** One more tick every 0.7 s; when all are on, hold, then start over. */
  private tick(): void {
    if (!this.active || this.ticks.length === 0) {
      return
    }
    this.clock += getDeltaTime()
    if (this.shown < this.ticks.length && this.clock >= 0.7) {
      this.clock = 0
      this.ticks[this.shown].enabled = true
      this.shown++
    } else if (this.shown >= this.ticks.length && this.clock >= 1.6) {
      this.clock = 0
      this.shown = 0
      this.ticks.forEach((t) => {
        t.enabled = false
      })
    }
  }
}
