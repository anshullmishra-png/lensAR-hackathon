import {bus} from "../core/EventBus"
import {Events} from "../core/Events"
import {Log} from "../util/Log"

export type BiteState = "fresh" | "washing" | "clean"

/**
 * A stylised bite: two small puncture marks and a soft pulsing ring. No blood, no wound detail.
 * The ring changes with the first-aid step (fresh -> washing -> clean).
 */
@component
export class BiteMarker extends BaseScriptComponent {
  @input
  @hint("Sphere mesh (1 cm across)")
  sphereMesh: RenderMesh

  @input
  @hint("Torus mesh for the ring")
  ringMesh: RenderMesh

  @input
  @hint("Dark skin-toned material for the two marks (not red)")
  markMaterial: Material

  @input
  freshMaterial: Material

  @input
  washingMaterial: Material

  @input
  cleanMaterial: Material

  private ring: SceneObject
  private ringVisual: RenderMeshVisual
  private state: BiteState = "fresh"
  private pulsing = false
  private clock = 0

  onAwake(): void {
    if (!this.sphereMesh || !this.ringMesh || !this.markMaterial) {
      Log.error("BiteMarker: meshes / materials are not assigned")
      return
    }
    for (const x of [-1.2, 1.2]) {
      const mark = global.scene.createSceneObject("Mark")
      mark.setParent(this.sceneObject)
      mark.getTransform().setLocalPosition(new vec3(x, 0, 0))
      mark.getTransform().setLocalScale(new vec3(0.8, 0.4, 0.8))
      const rmv = mark.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.sphereMesh
      rmv.mainMaterial = this.markMaterial
    }
    this.ring = global.scene.createSceneObject("Ring")
    this.ring.setParent(this.sceneObject)
    this.ringVisual = this.ring.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.ringVisual.mesh = this.ringMesh
    this.setState("fresh")

    bus.on(Events.ARM_SHOW, () => {
      this.setState("fresh")
      this.pulse(true)
    })
    bus.on(Events.WASH_TIMER_START, () => this.setState("washing"))
    bus.on(Events.WASH_TIMER_DONE, () => {
      this.setState("clean")
      this.pulse(false)
    })
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  pulse(on: boolean): void {
    this.pulsing = on
    if (!on && this.ring) {
      this.ring.getTransform().setLocalScale(vec3.one().uniformScale(this.baseSize()))
    }
  }

  setState(state: BiteState): void {
    this.state = state
    if (!this.ringVisual) {
      return
    }
    const m = state === "fresh" ? this.freshMaterial : state === "washing" ? this.washingMaterial : this.cleanMaterial
    if (m) {
      this.ringVisual.mainMaterial = m
    }
    this.ring.getTransform().setLocalScale(vec3.one().uniformScale(this.baseSize()))
  }

  /** Ring size in cm: shrinks once the wound is clean. */
  private baseSize(): number {
    return this.state === "clean" ? 4 : 5.5
  }

  private tick(): void {
    if (!this.pulsing || !this.ring) {
      return
    }
    this.clock += getDeltaTime()
    const period = this.state === "washing" ? 1.8 : 1.0
    const s = this.baseSize() * (1 + 0.14 * Math.sin((this.clock / period) * 2 * Math.PI))
    this.ring.getTransform().setLocalScale(vec3.one().uniformScale(s))
  }
}
