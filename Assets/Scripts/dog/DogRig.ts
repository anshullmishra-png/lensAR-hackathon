import {bus} from "../core/EventBus"
import {Events, SetPosePayload} from "../core/Events"
import {DogPoses, RigPose} from "./DogPoses"

const DEG = Math.PI / 180
const TAU = Math.PI * 2
const BLEND_PER_SECOND = 7
const TAIL_SEGMENTS = 4

type Vec = [number, number, number]

/** Fur colours (linear-ish RGB). */
const ORANGE: Vec = [0.95, 0.66, 0.32]
const DARK: Vec = [0.72, 0.42, 0.2]
const CREAM: Vec = [1, 0.95, 0.84]
const BLACK: Vec = [0.07, 0.05, 0.05]
const NOSE: Vec = [0.16, 0.09, 0.1]
const PINK: Vec = [1, 0.5, 0.56]
const SHADOW: Vec = [0.1, 0.12, 0.1]
const WHITE: Vec = [0.98, 0.98, 0.98]

/**
 * Moti built from separate parts so his BODY LANGUAGE can actually move: two ears, a tail made of four
 * segments, a jaw with a tongue, eyes that narrow or stare, teeth, and a ridge of fur along the spine.
 * (The earlier model was one static mesh with no joints, so none of this was possible.)
 *
 * Built from the sphere / box meshes DogProps already has. Dimensions are in cm for a dog about 55 cm
 * tall to the ears. He faces +Z (toward the viewer) and +X is the viewer's right.
 * `anchors` are empty marker objects on the parts, used to point at them (see DogCallouts).
 */
export class DogRig {
  readonly root: SceneObject
  readonly anchors: {[part: string]: SceneObject} = {}

  private cur: RigPose
  private target: RigPose
  private clock = 0

  private head!: SceneObject
  private jaw!: SceneObject
  private tongue!: SceneObject
  private teeth: SceneObject[] = []
  private eyes: SceneObject[] = []
  private rings: SceneObject[] = []
  private ears: {pivot: SceneObject; side: number}[] = []
  private tail: SceneObject[] = []
  private hackles: SceneObject[] = []
  private glints: SceneObject[] = []

  private mats: {[name: string]: Material} = {}

  constructor(
    parent: SceneObject,
    private sphere: RenderMesh,
    private box: RenderMesh,
    baseMaterial: Material,
    viewYawDeg: number,
    startPose: string
  ) {
    this.root = global.scene.createSceneObject("DogRig")
    this.root.setParent(parent)
    // A fixed turn so he is seen at an angle, not straight on: the tail and ears show.
    this.root.getTransform().setLocalRotation(quat.fromEulerAngles(0, viewYawDeg * DEG, 0))

    const mk = (c: Vec): Material => {
      const m = baseMaterial.clone()
      m.mainPass.baseColor = new vec4(c[0], c[1], c[2], 1)
      return m
    }
    this.mats = {orange: mk(ORANGE), dark: mk(DARK), cream: mk(CREAM), black: mk(BLACK), pink: mk(PINK), white: mk(WHITE), nose: mk(NOSE), shadow: mk(SHADOW)}
    // Soft shadow: see-through so the floor shows through it.
    this.mats.shadow.mainPass.blendMode = BlendMode.Normal
    this.mats.shadow.mainPass.baseColor = new vec4(SHADOW[0], SHADOW[1], SHADOW[2], 0.38)

    this.cur = {...DogPoses[startPose].rig}
    this.target = {...this.cur}

    this.buildKeyLight()
    this.buildBody()
    this.buildHead()
    this.buildTail()
    this.buildHackles()
    this.apply()

    bus.on(Events.DOG_SET_POSE, (p: SetPosePayload) => this.setPose(p.pose))
  }

  setPose(name: string): void {
    const def = DogPoses[name]
    if (def) {
      this.target = {...def.rig}
    }
  }

  /** Call every frame. */
  update(dt: number): void {
    this.clock += dt
    const k = Math.min(1, dt * BLEND_PER_SECOND)
    const c = this.cur as unknown as {[key: string]: number}
    const t = this.target as unknown as {[key: string]: number}
    for (const key of Object.keys(c)) {
      c[key] += (t[key] - c[key]) * k
    }
    this.apply()
  }

  // ---------------------------------------------------------------- building

  private part(parent: SceneObject, name: string, mat: string, pos: Vec, scale: Vec): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    const tr = so.getTransform()
    tr.setLocalPosition(new vec3(pos[0], pos[1], pos[2]))
    tr.setLocalScale(new vec3(scale[0], scale[1], scale[2]))
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = name.startsWith("box") ? this.box : this.sphere
    rmv.mainMaterial = this.mats[mat]
    return so
  }

  private node(parent: SceneObject, name: string, pos: Vec): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(pos[0], pos[1], pos[2]))
    return so
  }

  /** A warm light from the viewer's side and above, so the face and chest are not left in shade. */
  private buildKeyLight(): void {
    const so = global.scene.createSceneObject("MotiKeyLight")
    so.setParent(this.root)
    so.getTransform().setWorldRotation(quat.fromEulerAngles(-38 * DEG, 18 * DEG, 0))
    const light = so.createComponent("Component.LightSource") as LightSource
    light.lightType = LightType.Directional
    light.intensity = 0.9
    light.color = new vec3(1, 0.94, 0.86)
  }

  private buildBody(): void {
    const r = this.root
    this.part(r, "shadow", "shadow", [0, 0.15, 0], [44, 0.3, 70])
    this.part(r, "chest", "cream", [0, 27, 13], [20.5, 21.5, 21.5])
    this.part(r, "body", "orange", [0, 28, 0], [24, 23, 40])
    this.part(r, "rump", "orange", [0, 28, -13], [23, 23, 22])
    this.part(r, "neck", "orange", [0, 37, 19], [13, 16, 14])
    for (const s of [-1, 1]) {
      for (const z of [14, -14]) {
        const front = z > 0
        this.part(r, "leg", front ? "cream" : "orange", [s * 6.8, 8.5, z], [8, 17, 8.4])
        this.part(r, "paw", "cream", [s * 6.8, 1.9, z + 1.2], [8.8, 4.2, 10.5])
      }
    }
    this.anchors.body = this.node(r, "anchorBody", [10, 33, 8])
  }

  private buildHead(): void {
    this.head = this.node(this.root, "head", [0, 41, 22])
    const h = this.head
    h.getTransform().setLocalScale(new vec3(1.14, 1.14, 1.14))
    this.part(h, "skull", "orange", [0, 6.5, 4], [21, 18, 19])
    for (const s of [-1, 1]) {
      this.part(h, "cheek", "cream", [s * 5.6, 2.6, 10.5], [8, 7, 8])
    }
    this.part(h, "muzzle", "cream", [0, 3, 12.5], [10.5, 8, 11])
    this.part(h, "nose", "nose", [0, 5.2, 18.2], [5.4, 4, 4.2])
    this.part(h, "noseShine", "white", [-0.9, 6.6, 20], [1.4, 0.9, 0.9])

    // Jaw hinges at the back of the mouth and swings down to open it.
    this.jaw = this.node(h, "jaw", [0, 1.2, 7])
    this.part(this.jaw, "jawbone", "cream", [0, -0.2, 6], [7.4, 2.6, 11])
    this.tongue = this.part(this.jaw, "tongue", "pink", [0, 0.9, 6.5], [4.2, 1.3, 7])
    this.anchors.jaw = this.node(this.jaw, "anchorJaw", [0, -1, 9])
    this.anchors.mouth = this.node(h, "anchorMouth", [0, 3, 17])

    // Teeth: small white points that show when the lip is curled.
    for (const s of [-1, 1]) {
      // Long canines at the corners, short front teeth between them.
      this.teeth.push(this.part(h, "tooth", "white", [s * 3.6, -1.4, 15.2], [2.1, 5, 2.1]))
      this.teeth.push(this.part(h, "tooth", "white", [s * 1.5, -0.8, 17.2], [1.5, 3.2, 1.5]))
    }

    for (const s of [-1, 1]) {
      const eye = this.node(h, "eye", [s * 6.1, 9, 11.2])
      this.rings.push(this.part(eye, "ring", "white", [0, 0, -0.4], [7.4, 7.4, 2]))
      this.eyes.push(this.part(eye, "pupil", "black", [0, 0, 0.5], [5.2, 5.2, 2.4]))
      this.glints.push(this.part(eye, "glint", "white", [1.2, 1.4, 1.6], [1.7, 1.7, 1]))
      if (s > 0) {
        this.anchors.eyes = eye
      }
      const pivot = this.node(h, "earPivot", [s * 7.4, 12.5, 2.5])
      this.part(pivot, "ear", "dark", [0, 4.4, 0], [7.6, 10, 3.2])
      this.part(pivot, "earTuft", "cream", [0, 8.8, 0.2], [5, 3.6, 3])
      this.ears.push({pivot, side: s})
      if (s > 0) {
        this.anchors.ears = this.node(pivot, "anchorEar", [0, 8.5, 0])
      }
    }
  }

  private buildTail(): void {
    let parent = this.node(this.root, "tailBase", [0, 33, -23])
    for (let i = 0; i < TAIL_SEGMENTS; i++) {
      const len = 7.5
      const seg = this.node(parent, "tailSeg", [0, 0, i === 0 ? 0 : -len])
      const last = i === TAIL_SEGMENTS - 1
      const w = last ? 8 : 5.6 - i * 0.5
      this.part(seg, "tailPart", last ? "cream" : "orange", [0, 0, -len / 2], [w, w, len + (last ? 1.5 : 2.5)])
      this.tail.push(seg)
      parent = seg
    }
    this.anchors.tail = this.tail[2]
  }

  private buildHackles(): void {
    const spine = this.node(this.root, "spine", [0, 0, 0])
    for (let i = 0; i < 6; i++) {
      const z = 18 - i * 7
      const y = 39.5 - i * 0.8
      const so = this.part(spine, "hackle", "dark", [0, y, z], [2.6, 1, 5])
      this.hackles.push(so)
    }
    this.anchors.fur = this.hackles[2]
  }

  // ---------------------------------------------------------------- animating

  private apply(): void {
    const p = this.cur
    const t = this.clock

    // Head, jaw, tongue, teeth.
    this.head.getTransform().setLocalRotation(quat.fromEulerAngles(p.headPitch * DEG, 0, 0))

    let jaw = p.jaw
    let tongue = p.tongue
    // Panting: a small quick movement while the tongue is out.
    if (p.tongue > 0.1) {
      jaw += 0.06 * Math.sin(t * TAU * 3.2) * p.tongue
    }
    // Barking: the jaw snaps open and shut.
    if (p.bark > 0.01) {
      jaw += p.bark * (0.5 + 0.5 * Math.sin(t * TAU * 3))
    }
    // Yawning: every few seconds the mouth opens wide, slowly.
    if (p.yawn > 0.01) {
      const phase = (t % 4.2) / 1.6
      if (phase < 1) {
        jaw += p.yawn * 0.95 * Math.sin(phase * Math.PI)
      }
    }
    // Lip licking: the tongue flicks out and back, twice, with the mouth almost shut.
    if (p.lick > 0.01) {
      const phase = ((t + 1.7) % 3.4) / 1.0
      if (phase < 1) {
        tongue += p.lick * Math.max(0, Math.sin(phase * TAU * 2))
        jaw += 0.12 * p.lick * Math.max(0, Math.sin(phase * TAU * 2))
      }
    }
    jaw = Math.max(0, Math.min(1, jaw))
    tongue = Math.max(0, Math.min(1.3, tongue))
    this.jaw.getTransform().setLocalRotation(quat.fromEulerAngles(jaw * 30 * DEG, 0, 0))
    const tongueOut = Math.max(tongue, jaw > 0.25 ? 0.35 : 0)
    this.tongue.enabled = tongueOut > 0.08
    this.tongue.getTransform().setLocalScale(new vec3(4.2, 1.3, 3 + 6 * tongueOut))
    this.tongue.getTransform().setLocalPosition(new vec3(0, 0.9 - 1.4 * tongue, 5.2 + 3 * tongueOut))

    const showTeeth = p.teeth > 0.3
    for (const tooth of this.teeth) {
      tooth.enabled = showTeeth
    }

    // Eyes: narrow and soft, wide and staring, or closed; with an optional white ring.
    for (let i = 0; i < this.eyes.length; i++) {
      const wide = p.eye
      this.eyes[i].getTransform().setLocalScale(new vec3(5.2, 5.2 * Math.max(0.12, wide), 2.4))
      this.rings[i].enabled = p.eyeRing > 0.4 || (p.eye > 1.2)
      this.rings[i].getTransform().setLocalScale(new vec3(7.4, 7.4 * Math.max(0.12, wide), 2))
      this.glints[i].enabled = wide > 0.3
      this.glints[i].getTransform().setLocalPosition(new vec3(1.2, 1.4 * Math.min(1.3, wide), 1.6))
    }

    // Ears: relaxed and a little out; pricked forward; or pinned flat back.
    for (const e of this.ears) {
      const pitch = p.earForward * 20 - p.earBack * 62
      const out = 16 + p.earBack * 34 - p.earForward * 8
      e.pivot.getTransform().setLocalRotation(quat.fromEulerAngles(pitch * DEG, 0, -e.side * out * DEG))
    }

    // Tail: set angle, bend, and wag. The wag grows along the tail, so the tip swings most.
    for (let i = 0; i < this.tail.length; i++) {
      const pitch = i === 0 ? p.tailPitch : p.tailCurl
      const yaw = p.wagAmp * Math.sin(t * TAU * p.wagHz - i * 0.7) * (i === 0 ? 0.5 : 0.8)
      this.tail[i].getTransform().setLocalRotation(quat.fromEulerAngles(pitch * DEG, yaw * DEG, 0))
    }

    // Raised fur along the spine.
    for (let i = 0; i < this.hackles.length; i++) {
      const h = 0.5 + 8 * p.hackles * (0.75 + 0.25 * Math.sin(i * 1.9))
      const tr = this.hackles[i].getTransform()
      tr.setLocalScale(new vec3(2.6, h, 5))
      const base = tr.getLocalPosition()
      tr.setLocalPosition(new vec3(base.x, 39 - i * 0.8 + h * 0.35, base.z))
    }
  }
}
