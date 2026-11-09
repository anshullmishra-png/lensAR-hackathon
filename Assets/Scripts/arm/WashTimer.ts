import {Button} from "UIKit.lspkg/Scripts/Components/Button/Button"
import {Config} from "../app/Config"
import {Content} from "../content/Content"
import {bus} from "../core/EventBus"
import {Events} from "../core/Events"
import {addText} from "../ui/UiText"
import {Log} from "../util/Log"

const SEGMENTS = 24
const RING_RADIUS = 7
const STREAKS = 5

/**
 * Wash countdown: a ring of segments that vanish clockwise, the time left in the middle, and
 * falling water streaks down to the bite. Length comes from Config (DEMO_MODE = 15 s, else 15 min).
 * The skip button exists only when DEMO_MODE is on.
 */
@component
export class WashTimer extends BaseScriptComponent {
  @input
  @hint("1x1x1 box mesh")
  boxMesh: RenderMesh

  @input
  @hint("Material for the ring segments")
  ringMaterial: Material

  @input
  @hint("Material for the water streaks")
  waterMaterial: Material

  private root: SceneObject
  private segments: SceneObject[] = []
  private streaks: SceneObject[] = []
  private label: Text
  private running = false
  private elapsed = 0
  private total = 0
  private clock = 0

  onAwake(): void {
    if (!this.boxMesh || !this.ringMaterial || !this.waterMaterial) {
      Log.error("WashTimer: boxMesh / materials are not assigned")
      return
    }
    this.root = global.scene.createSceneObject("TimerRoot")
    this.root.setParent(this.sceneObject)
    // Above the bite, facing the user.
    this.root.getTransform().setLocalPosition(new vec3(0, 14, 0))

    this.buildRing()
    this.buildStreaks()
    this.label = addText(this.root, "Remaining", 60, 10, 4, 0, 0, undefined, 0.4)
    if (Config.DEMO_MODE) {
      this.buildSkipButton()
    }
    this.root.enabled = false

    bus.on(Events.WASH_TIMER_START, () => this.start())
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  start(): void {
    this.total = Config.DEMO_MODE ? Config.WASH_SECONDS_DEMO : Config.WASH_SECONDS_REAL
    this.elapsed = 0
    this.segments.forEach((s) => {
      s.enabled = true
    })
    this.root.enabled = true
    this.running = true
    this.updateLabel()
  }

  /** Demo only: finish the wash right away. Ignored unless DEMO_MODE is on. */
  skip(): void {
    if (Config.DEMO_MODE && this.running) {
      this.finish()
    }
  }

  private finish(): void {
    this.running = false
    this.root.enabled = false
    bus.emit(Events.WASH_TIMER_DONE)
  }

  private tick(): void {
    if (!this.running) {
      return
    }
    const dt = getDeltaTime()
    this.elapsed += dt
    this.clock += dt
    const gone = Math.floor((this.elapsed / this.total) * SEGMENTS)
    this.segments.forEach((s, i) => {
      s.enabled = i >= gone
    })
    this.updateLabel()
    this.animateStreaks()
    if (this.elapsed >= this.total) {
      this.finish()
    }
  }

  private updateLabel(): void {
    const left = Math.max(0, Math.ceil(this.total - this.elapsed))
    const m = Math.floor(left / 60)
    const s = left % 60
    this.label.text = `${m}:${s < 10 ? "0" : ""}${s}`
  }

  private buildRing(): void {
    for (let i = 0; i < SEGMENTS; i++) {
      const deg = 90 - (i * 360) / SEGMENTS // start at the top, run clockwise
      const rad = (deg * Math.PI) / 180
      const seg = global.scene.createSceneObject(`Seg${i}`)
      seg.setParent(this.root)
      const t = seg.getTransform()
      t.setLocalPosition(new vec3(Math.cos(rad) * RING_RADIUS, Math.sin(rad) * RING_RADIUS, 0))
      t.setLocalRotation(quat.fromEulerAngles(0, 0, rad))
      t.setLocalScale(new vec3(1.1, 2.3, 0.6))
      const rmv = seg.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.boxMesh
      rmv.mainMaterial = this.ringMaterial
      this.segments.push(seg)
    }
  }

  private buildStreaks(): void {
    for (let i = 0; i < STREAKS; i++) {
      const s = global.scene.createSceneObject(`Streak${i}`)
      s.setParent(this.root)
      s.getTransform().setLocalScale(new vec3(0.45, 2.6, 0.3))
      const rmv = s.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.boxMesh
      rmv.mainMaterial = this.waterMaterial
      this.streaks.push(s)
    }
  }

  /** Streaks fall from the ring's bottom to just above the bite, each at its own phase. */
  private animateStreaks(): void {
    const top = -RING_RADIUS - 1
    const fall = 8.5
    this.streaks.forEach((s, i) => {
      const phase = (i * 0.37) % 1
      const f = (this.clock * 0.9 + phase) % 1
      s.getTransform().setLocalPosition(new vec3((i - (STREAKS - 1) / 2) * 1.3, top - f * fall, 0))
    })
  }

  private buildSkipButton(): void {
    const row = global.scene.createSceneObject("Skip")
    row.setParent(this.root)
    row.getTransform().setLocalPosition(new vec3(14, 0, 0))
    const btn = row.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(12, 5, 1)
    addText(row, "SkipHi", 30, 11, 2.2, 0, 1, undefined, 0.3).text = Content.ui.skipDemo.hi
    addText(row, "SkipEn", 24, 11, 1.8, 0, -1.2, undefined, 0.3).text = Content.ui.skipDemo.en
    btn.onTriggerUp.add(() => this.skip())
  }
}
