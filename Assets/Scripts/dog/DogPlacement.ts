import {Config} from "../app/Config"
import {Log} from "../util/Log"
import {DogLookAt} from "./DogLookAt"

/** Puts the dog on the floor DOG_DISTANCE in front of where the user is looking, facing them. */
@component
export class DogPlacement extends BaseScriptComponent {
  @input
  @hint("The Camera Object")
  cameraObject: SceneObject

  @input
  @allowUndefined
  @hint("Optional: told to face the camera after placement")
  lookAt: DogLookAt

  placeInFrontOfUser(): void {
    if (!this.cameraObject) {
      Log.error("DogPlacement: cameraObject is not assigned")
      return
    }
    const camT = this.cameraObject.getTransform()
    const cam = camT.getWorldPosition()
    // A camera looks down its own -Z, which is its `back` vector.
    const look = camT.back
    let flat = new vec3(look.x, 0, look.z)
    flat = flat.length < 0.001 ? new vec3(0, 0, -1) : flat.normalize()

    // Flat right-hand vector (up x forward-of-user), so the dog stands beside the panels, not under them.
    const right = new vec3(-flat.z, 0, flat.x)

    const pos = new vec3(
      cam.x + flat.x * Config.DOG_DISTANCE + right.x * Config.DOG_SIDE,
      cam.y - Config.EYE_TO_FLOOR,
      cam.z + flat.z * Config.DOG_DISTANCE + right.z * Config.DOG_SIDE
    )
    this.sceneObject.getTransform().setWorldPosition(pos)
    if (this.lookAt) {
      this.lookAt.snapToCamera()
    }
    Log.info(
      `Dog placed ${Config.DOG_DISTANCE} cm ahead. Floor = camera height - ${Config.EYE_TO_FLOOR} cm ` +
        `(fixed offset: no floor query is used in the preview). ` +
        `camera=(${cam.x.toFixed(0)}, ${cam.y.toFixed(0)}, ${cam.z.toFixed(0)}) dog=(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`
    )
  }
}
