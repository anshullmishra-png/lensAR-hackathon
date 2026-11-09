/**
 * What DogProps and DogCallouts need from a dog rig. Both the shape-built DogRig (the fallback) and the
 * skinned DogRealistic provide it, so either can be switched on in Config without touching the game logic.
 */
export interface DogRigApi {
  readonly root: SceneObject
  /** Empty marker objects on the body parts, used to point at them (see DogCallouts). */
  readonly anchors: {[part: string]: SceneObject}
  /** Call every frame. */
  update(dt: number): void
}
