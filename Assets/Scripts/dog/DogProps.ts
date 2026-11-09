import {Log} from "../util/Log"
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

  onAwake(): void {
    if (!this.boxMesh || !this.sphereMesh || !this.cylinderMesh) {
      Log.error("DogProps: meshes are not assigned")
      return
    }
    this.buildBowl()
    this.buildPuppies()
    this.buildBark()
    this.props.forEach((p) => {
      p.enabled = false
    })
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
    const g = this.group("bowl", 0, 0, 22)
    this.part(g, this.cylinderMesh, this.bowlMaterial, new vec3(0, 2.5, 0), new vec3(22, 5, 22))
    this.part(g, this.sphereMesh, this.foodMaterial, new vec3(0, 5, 0), new vec3(15, 7, 15))
  }

  private buildPuppies(): void {
    const g = this.group("puppies", 0, 0, -26)
    const spots: [number, number, number][] = [
      [-14, 0, 0],
      [0, 0, -6],
      [14, 0, 0]
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
    const g = this.group("bark", 0, 42, 40)
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
