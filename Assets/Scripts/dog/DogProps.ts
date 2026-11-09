import {Log} from "../util/Log"
import {Config} from "../app/Config"
import {DogCallouts} from "./DogCallouts"
import {DogRealistic} from "./DogRealistic"
import {DogRig} from "./DogRig"
import {DogRigApi} from "./DogRigApi"
import {hasProp} from "./DogPoses"

/**
 * Simple scene props built from basic shapes (no extra models needed):
 * a food bowl, a few puppies, and a sound-bar "bark" icon. Positions are in the dog's own
 * space (its front is +Z), so they turn with the dog. All start hidden.
 */
@component
export class DogProps extends BaseScriptComponent {
  @input
  @hint("1x1x1 box mesh")
  boxMesh: RenderMesh

  @input
  @hint("Sphere mesh (1 cm diameter)")
  sphereMesh: RenderMesh

  @input
  @hint("Cylinder mesh (1 cm tall, 1 cm across)")
  cylinderMesh: RenderMesh

  @input
  bowlMaterial: Material

  @input
  foodMaterial: Material

  @input
  puppyMaterial: Material

  @input
  barkMaterial: Material

  private props = new Map<string, SceneObject>()
  private callouts: DogCallouts
  private rig: DogRigApi

  onAwake(): void {
    if (!this.boxMesh || !this.sphereMesh || !this.cylinderMesh) {
      Log.error("DogProps: meshes are not assigned")
      return
    }
    this.buildBowl()
    this.buildPuppies()
    this.buildBark()
    if (Config.RIG_DOG && this.puppyMaterial) {
      this.buildRig()
    }
    if (this.barkMaterial) {
      // Numbered "signs to look for" dots and legend (shown after a Level 1 answer).
      this.callouts = new DogCallouts(this.sceneObject, this.sphereMesh, this.barkMaterial, this.rig)
    }
    this.props.forEach((p) => {
      p.enabled = false
    })
  }

  /**
   * Swap the single static mesh for the dog built from parts. The old mesh is hidden (not deleted) and its
   * node keeps carrying the sway / shake / bob idle loops, so DogController needs no changes.
   */
  private buildRig(): void {
    const model = this.find(this.sceneObject, "DogModel")
    const meshNode = model ? this.find(model, "DogMesh") : null
    if (!model || !meshNode) {
      Log.warn("DogProps: DogModel / DogMesh not found, keeping the static dog")
      return
    }
    // The realistic dog lives in the scene as "RealisticDog"; find it before the old mesh is hidden.
    const realistic = Config.REALISTIC_DOG ? this.find(model, "RealisticDog") : null
    for (let i = 0; i < meshNode.getChildrenCount(); i++) {
      meshNode.getChild(i).enabled = false
    }
    // The old mesh was authored large and centred; the new dog is built in cm with his feet at the origin.
    meshNode.getTransform().setLocalScale(vec3.one())
    meshNode.getTransform().setLocalPosition(vec3.zero())
    if (realistic) {
      this.rig = new DogRealistic(meshNode, realistic, this.sphereMesh, this.boxMesh, this.puppyMaterial, Config.DOG_VIEW_YAW_DEG, "relaxed")
    } else {
      if (Config.REALISTIC_DOG) {
        Log.warn("DogProps: RealisticDog not found in the scene, using the shape-built dog")
      }
      this.rig = new DogRig(meshNode, this.sphereMesh, this.boxMesh, this.puppyMaterial, Config.DOG_VIEW_YAW_DEG, "relaxed")
    }
    // Cancel the parent's scale so one rig unit is one cm.
    const k = Config.DOG_SCALE / model.getTransform().getLocalScale().x
    this.rig.root.getTransform().setLocalScale(new vec3(k, k, k))
    this.createEvent("UpdateEvent").bind(() => this.rig.update(getDeltaTime()))
  }

  private find(root: SceneObject, name: string): SceneObject | null {
    for (let i = 0; i < root.getChildrenCount(); i++) {
      const c = root.getChild(i)
      if (c.name === name) {
        return c
      }
      const deeper = this.find(c, name)
      if (deeper) {
        return deeper
      }
    }
    return null
  }

  setVisible(name: string, visible: boolean): void {
    if (!hasProp(name)) {
      Log.warn(`DogProps: unknown prop "${name}"`)
      return
    }
    const p = this.props.get(name)
    if (p) {
      p.enabled = visible
    }
  }

  /** Show exactly these props and hide the rest. */
  showOnly(names: string[]): void {
    this.props.forEach((p, key) => {
      p.enabled = names.indexOf(key) >= 0
    })
  }

  private group(name: string, x: number, y: number, z: number): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(this.sceneObject)
    so.getTransform().setLocalPosition(new vec3(x, y, z))
    this.props.set(name.toLowerCase(), so)
    return so
  }

  private part(parent: SceneObject, mesh: RenderMesh, mat: Material, pos: vec3, scale: vec3, rotZ: number = 0): SceneObject {
    const so = global.scene.createSceneObject("part")
    so.setParent(parent)
    const t = so.getTransform()
    t.setLocalPosition(pos)
    t.setLocalScale(scale)
    t.setLocalRotation(quat.fromEulerAngles(0, 0, rotZ * (Math.PI / 180)))
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    rmv.mainMaterial = mat
    return so
  }

  private buildBowl(): void {
    const g = this.group("bowl", -22, 0, 30)
    this.part(g, this.cylinderMesh, this.bowlMaterial, new vec3(0, 2.5, 0), new vec3(22, 5, 22))
    this.part(g, this.sphereMesh, this.foodMaterial, new vec3(0, 5, 0), new vec3(15, 7, 15))
  }

  private buildPuppies(): void {
    const g = this.group("puppies", -6, 0, 30)
    const spots: [number, number, number][] = [
      [-11, 0, 0],
      [0, 0, -5],
      [11, 0, 0]
    ]
    for (const [x, , z] of spots) {
      const pup = global.scene.createSceneObject("puppy")
      pup.setParent(g)
      pup.getTransform().setLocalPosition(new vec3(x, 0, z))
      this.part(pup, this.sphereMesh, this.puppyMaterial, new vec3(0, 6, 0), new vec3(11, 10, 17))
      this.part(pup, this.sphereMesh, this.puppyMaterial, new vec3(0, 11, 9), new vec3(8, 8, 8))
    }
  }

  /** Sound rays fanning out to both sides of the dog's mouth, so they never cover its face. */
  private buildBark(): void {
    const g = this.group("bark", -22, Config.REALISTIC_DOG ? 46 : 60, 32)
    const radius = 8
    for (const side of [-1, 1]) {
      for (const deg of [-50, 0, 50]) {
        const rad = (deg * Math.PI) / 180
        const pos = new vec3(side * (9 + Math.cos(rad) * radius), Math.sin(rad) * radius, 0)
        // Each ray points away from the mouth: a bar's long axis starts along Y, so turn it by (angle - 90).
        const rotZ = side > 0 ? deg - 90 : 90 - deg
        this.part(g, this.boxMesh, this.barkMaterial, pos, new vec3(2.2, 6, 1.2), rotZ)
      }
    }
  }
}
