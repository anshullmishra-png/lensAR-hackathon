import {Log} from "../util/Log"

const DEG = Math.PI / 180

function wrapPi(a: number): number {
  while (a > Math.PI) {
    a -= 2 * Math.PI
  }
  while (a < -Math.PI) {
    a += 2 * Math.PI
  }
  return a
}

/**
 * Turns the whole dog toward the camera around the vertical axis only, clamped to
 * +/- maxYawDeg from the direction it was placed in, smoothed every frame.
 * (The mesh has no head bone, so the whole model turns.)
 */
@component
export class DogLookAt extends BaseScriptComponent {
  @input
  @hint("The Camera Object the dog looks at")
  cameraObject: SceneObject

  @input
  @hint("Maximum turn away from the placement direction, in degrees")
  maxYawDeg: number = 60

  @input
  @hint("Higher = snappier turning")
  smoothing: number = 5

  private baseYaw = 0
  private offset = 0
  private active = true

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  /** Turn the dog off (e.g. while sleeping) or back on. */
  setEnabled(on: boolean): void {
    this.active = on
  }

  /** Face the camera right now and remember that direction as the centre of the +/- range. */
  snapToCamera(): void {
    if (!this.cameraObject) {
      Log.warnOnce("lookat-cam", "DogLookAt: cameraObject is not assigned")
      return
    }
    this.baseYaw = this.yawToCamera()
    this.offset = 0
    this.apply()
  }

  private yawToCamera(): number {
    const cam = this.cameraObject.getTransform().getWorldPosition()
    const me = this.sceneObject.getTransform().getWorldPosition()
    // Rotating about Y by t sends local +Z to (sin t, 0, cos t): the dog's front is +Z.
    return Math.atan2(cam.x - me.x, cam.z - me.z)
  }

  private apply(): void {
    this.sceneObject.getTransform().setWorldRotation(quat.fromEulerAngles(0, this.baseYaw + this.offset, 0))
  }

  private tick(): void {
    if (!this.active || !this.cameraObject) {
      return
    }
    const limit = this.maxYawDeg * DEG
    const wanted = Math.max(-limit, Math.min(limit, wrapPi(this.yawToCamera() - this.baseYaw)))
    const k = Math.min(1, this.smoothing * getDeltaTime())
    this.offset += (wanted - this.offset) * k
    this.apply()
  }
}
