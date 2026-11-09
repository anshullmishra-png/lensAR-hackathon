import {DogVisiblePayload, Events, SetPosePayload} from "../core/Events"
import {bus} from "../core/EventBus"
import {Log} from "../util/Log"
import {TweenHelpers} from "../util/TweenHelpers"
import {DogLookAt} from "./DogLookAt"
import {DogPoses, LoopKind} from "./DogPoses"
import {DogProps} from "./DogProps"

const DEG = Math.PI / 180
const POSE_SECONDS = 0.4

/**
 * Plays a pose by tweening the dog model's scale, pitch and height, plus an idle loop
 * (sway / shake) written onto the visual child. The mesh is static, so this is whole-body only.
 */
@component
export class DogController extends BaseScriptComponent {
  @input
  @hint("Parent of the visual. Pose tweens (scale, pitch, height) act on this object.")
  modelNode: SceneObject

  @input
  @hint("The dog mesh instance. The idle loop (sway / shake) is applied here.")
  loopNode: SceneObject

  @input
  @allowUndefined
  @hint("Turned off while the dog sleeps or eats")
  lookAt: DogLookAt

  @input
  @allowUndefined
  @hint("Bowl, puppies and bark icon")
  props: DogProps

  private baseScale = vec3.one()
  private basePos = vec3.zero()
  private loopBasePos = vec3.zero()
  private loop: LoopKind = "none"
  private loopAmp = 0
  private loopPeriod = 1
  private clock = 0
  private ready = false

  onAwake(): void {
    bus.on(Events.DOG_SET_POSE, (p: SetPosePayload) => this.setPose(p.pose, p.props))
    bus.on(Events.DOG_VISIBLE, (p: DogVisiblePayload) => this.setVisible(p.visible))
    this.createEvent("UpdateEvent").bind(() => this.tickLoop())
  }

  /**
   * Capture the resting transforms the first time they are needed. Done lazily because
   * AppRoot (higher in the hierarchy) can start a level before this script's OnStart runs.
   */
  private init(): boolean {
    if (this.ready) {
      return true
    }
    if (!this.modelNode || !this.loopNode) {
      Log.warnOnce("dog-inputs", "DogController: modelNode / loopNode not assigned")
      return false
    }
    const t = this.modelNode.getTransform()
    this.baseScale = t.getLocalScale()
    this.basePos = t.getLocalPosition()
    this.loopBasePos = this.loopNode.getTransform().getLocalPosition()
    this.ready = true
    return true
  }

  /** Hide the dog (and its props) while the arm is on stage, and bring it back after. */
  setVisible(visible: boolean): void {
    if (this.modelNode) {
      this.modelNode.enabled = visible
    }
    if (!visible && this.props) {
      this.props.showOnly([])
    }
  }

  /** Show or hide one prop (bowl, puppies, bark). */
  showProp(name: string, visible: boolean): void {
    if (this.props) {
      this.props.setVisible(name, visible)
    } else {
      Log.warnOnce("dog-props", "DogController: props not assigned, prop display skipped")
    }
  }

  setPose(name: string, propNames?: string[]): void {
    const def = DogPoses[name]
    if (!def) {
      Log.warn(`DogController: unknown pose "${name}"`)
      return
    }
    if (!this.init()) {
      return
    }
    const s = def.scale
    TweenHelpers.scaleTo(
      this.modelNode,
      new vec3(this.baseScale.x * s[0], this.baseScale.y * s[1], this.baseScale.z * s[2]),
      POSE_SECONDS
    )
    TweenHelpers.moveTo(
      this.modelNode,
      new vec3(this.basePos.x + def.xOffsetCm, this.basePos.y + def.yOffsetCm, this.basePos.z),
      POSE_SECONDS
    )
    TweenHelpers.rotateTo(this.modelNode, new vec3(def.pitchDeg, 0, def.rollDeg), POSE_SECONDS)
    if (this.lookAt) {
      this.lookAt.setEnabled(def.look)
    }
    if (this.props) {
      this.props.showOnly(propNames ?? [])
    }
    this.loop = def.loop
    this.loopAmp = def.loopAmp
    this.loopPeriod = Math.max(0.05, def.loopPeriod)
    this.clock = 0
  }

  private tickLoop(): void {
    if (!this.ready) {
      return
    }
    this.clock += getDeltaTime()
    const phase = (this.clock / this.loopPeriod) * 2 * Math.PI
    const t = this.loopNode.getTransform()
    let roll = 0
    let dx = 0
    let dy = 0
    if (this.loop === "sway") {
      roll = Math.sin(phase) * this.loopAmp * DEG
    } else if (this.loop === "shake") {
      dx = Math.sin(phase) * this.loopAmp
    } else if (this.loop === "bob") {
      dy = Math.sin(phase) * this.loopAmp
    }
    t.setLocalRotation(quat.fromEulerAngles(0, 0, roll))
    // The mesh rests at a fixed offset inside modelNode; the loop adds only a small delta to it.
    t.setLocalPosition(new vec3(this.loopBasePos.x + dx, this.loopBasePos.y + dy, this.loopBasePos.z))
  }
}
