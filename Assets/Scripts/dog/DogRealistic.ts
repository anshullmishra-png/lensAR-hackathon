import {bus} from "../core/EventBus"
import {Events, SetPosePayload} from "../core/Events"
import {DogRigApi} from "./DogRigApi"
import {DogPoses, RigPose} from "./DogPoses"

const DEG = Math.PI / 180
const TAU = Math.PI * 2
const BLEND_PER_SECOND = 7

/** Centimetres per mesh unit: the dog is 0.96 units tall to the ear tips, so this makes him about 56 cm. */
const CM_PER_UNIT = 58
/** The mesh's lowest point is y = -0.478, so lift him by that much to put his paws on the floor. */
const FOOT_LIFT = 0.478

type Vec = [number, number, number]

/** The mouth and muzzle run along x = 0.05 (the generated head is turned about 22 degrees toward +x), not along x = 0. */
const MX = 0.05
/** The painted eyes, measured from the mesh: [x, y, z] of each eye centre, set just inside the surface. */
const EYE_POS: Vec[] = [[-0.04, 0.273, 0.403], [0.078, 0.252, 0.358]]

// Colours picked to sit next to the baked fur texture (forehead about 0.51, 0.25, 0.10; back about 0.59, 0.30, 0.14).
const FUR_DARK: Vec = [0.55, 0.26, 0.1]
const FUR_MID: Vec = [0.86, 0.46, 0.19]
const FUR_LID: Vec = [0.9, 0.52, 0.24]
const FUR_BROW: Vec = [0.8, 0.42, 0.17]
const SCLERA: Vec = [1, 0.99, 0.96]
const IRIS: Vec = [0.2, 0.1, 0.05]
const PUPIL: Vec = [0.02, 0.02, 0.025]
const GLINT: Vec = [1, 1, 1]
const TOOTH: Vec = [0.97, 0.95, 0.88]
const MOUTH: Vec = [0.16, 0.04, 0.05]
const TONGUE: Vec = [0.88, 0.38, 0.45]

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

interface EyeSet {
  side: number
  iris: SceneObject
  pupil: SceneObject
  glint: SceneObject
  upper: SceneObject
  lower: SceneObject
  brow: SceneObject
  sclera: SceneObject
}

/**
 * Moti as a real, textured dog (MotiRigged.glb) with a small skeleton: head, jaw, two ears and a three-bone tail,
 * skinned with soft weights so the parts bend without seams (see tools/build_moti_rig.py).
 *
 * The mesh has no eyes that move, no teeth and no raised fur, so those are small attachments built in code and
 * parented to the head, jaw and spine bones, so they follow the dog:
 *   - eyes: an eyeball with a pupil and highlight, upper and lower eyelid shells, and a brow. Wide = lids open,
 *     narrow = lids partly closed with the brow tilted.
 *   - teeth: an upper and a lower row that scale in only when the jaw is open in the warning pose.
 *   - fur: a row of tufts along the neck and spine that grow from flat to standing.
 * All positions below are in mesh units (the dog is about 1 unit long), not centimetres.
 */
export class DogRealistic implements DogRigApi {
  readonly root: SceneObject
  readonly anchors: {[part: string]: SceneObject} = {}

  private cur: RigPose
  private target: RigPose
  private clock = 0

  private joints: {[name: string]: SceneObject} = {}
  private mats: {[name: string]: Material} = {}
  private eyes: EyeSet[] = []
  private teethUpper: SceneObject[] = []
  private teethLower: SceneObject[] = []
  private tongue!: SceneObject
  private tufts: {so: SceneObject; i: number; baseY: number}[] = []
  private hackleCount = 0

  constructor(
    parent: SceneObject,
    private body: SceneObject,
    private sphere: RenderMesh,
    private box: RenderMesh,
    baseMaterial: Material,
    viewYawDeg: number,
    startPose: string
  ) {
    this.root = global.scene.createSceneObject("DogRealisticRig")
    this.root.setParent(parent)
    // A fixed turn so he is seen at an angle: his side, ears and tail show.
    this.root.getTransform().setLocalRotation(quat.fromEulerAngles(0, viewYawDeg * DEG, 0))

    body.setParent(this.root)
    body.enabled = true
    const bt = body.getTransform()
    bt.setLocalRotation(quat.quatIdentity())
    bt.setLocalScale(vec3.one().uniformScale(CM_PER_UNIT))
    bt.setLocalPosition(new vec3(0, FOOT_LIFT * CM_PER_UNIT, 0))

    this.collectJoints(body)

    const mk = (c: Vec): Material => {
      const m = baseMaterial.clone()
      m.mainPass.baseColor = new vec4(c[0], c[1], c[2], 1)
      return m
    }
    this.mats = {
      dark: mk(FUR_DARK), mid: mk(FUR_MID), lid: mk(FUR_LID), brow: mk(FUR_BROW), sclera: mk(SCLERA), iris: mk(IRIS), pupil: mk(PUPIL), glint: mk(GLINT),
      tooth: mk(TOOTH), mouth: mk(MOUTH), tongue: mk(TONGUE)
    }

    this.cur = {...DogPoses[startPose].rig}
    this.target = {...this.cur}

    this.buildMouth()
    this.buildEyes()
    this.buildTeeth()
    this.buildFur()
    this.buildAnchors()
    this.apply()

    bus.on(Events.DOG_SET_POSE, (p: SetPosePayload) => this.setPose(p.pose))
  }

  setPose(name: string): void {
    const def = DogPoses[name]
    if (def) {
      this.target = {...def.rig}
    }
  }

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

  /** Names of every joint found, so a log line can prove the skeleton imported. */
  jointNames(): string[] {
    return Object.keys(this.joints)
  }

  // ---------------------------------------------------------------- building

  private collectJoints(node: SceneObject): void {
    const wanted = ["root", "head", "jaw", "earL", "earR", "tail1", "tail2", "tail3"]
    if (wanted.indexOf(node.name) >= 0 && !this.joints[node.name]) {
      this.joints[node.name] = node
    }
    for (let i = 0; i < node.getChildrenCount(); i++) {
      this.collectJoints(node.getChild(i))
    }
  }

  private part(parent: SceneObject, name: string, mesh: RenderMesh, mat: string, pos: Vec, scale: Vec): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    const tr = so.getTransform()
    tr.setLocalPosition(new vec3(pos[0], pos[1], pos[2]))
    tr.setLocalScale(new vec3(scale[0], scale[1], scale[2]))
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    rmv.mainMaterial = this.mats[mat]
    return so
  }

  private node(parent: SceneObject, name: string, pos: Vec): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(pos[0], pos[1], pos[2]))
    return so
  }

  // Joint pivots, mesh space (must match tools/build_moti_rig.py).
  private static HEAD: Vec = [0, 0.22, 0.2]
  private static JAW: Vec = [0, 0.19, 0.3]

  /** Mesh-space point -> local to the head bone. */
  private inHead(p: Vec): Vec {
    const h = DogRealistic.HEAD
    return [p[0] - h[0], p[1] - h[1], p[2] - h[2]]
  }

  private inJaw(p: Vec): Vec {
    // The jaw bone is a child of the head: its pivot relative to the head, then the point relative to it.
    const j = DogRealistic.JAW
    return [p[0] - j[0], p[1] - j[1], p[2] - j[2]]
  }

  /** A dark mouth interior (so an open mouth is not see-through) and a tongue on the jaw. */
  private buildMouth(): void {
    const head = this.joints["head"]
    const jaw = this.joints["jaw"]
    if (!head || !jaw) {
      return
    }
    this.part(head, "mouthInside", this.sphere, "mouth", this.inHead([MX, 0.166, 0.42]), [0.07, 0.032, 0.12])
    this.tongue = this.part(jaw, "tongue", this.sphere, "tongue", this.inJaw([MX, 0.157, 0.43]), [0.04, 0.014, 0.12])
  }

  private buildEyes(): void {
    const head = this.joints["head"]
    if (!head) {
      return
    }
    [-1, 1].forEach((s, k) => {
      const centre = this.inHead(EYE_POS[k])
      const eye = this.node(head, "eye", centre)
      // The head is turned about 22 degrees toward +x and tilted about 11 degrees, so turn the eye to face out of the skin.
      eye.getTransform().setLocalRotation(quat.fromEulerAngles(0, 22 * DEG, -11 * DEG))
      const sclera = this.part(eye, "sclera", this.sphere, "sclera", [0, 0, 0], [0.062, 0.062, 0.062])
      const iris = this.part(eye, "iris", this.sphere, "iris", [0, 0, 0.017], [0.052, 0.052, 0.045])
      const pupil = this.part(eye, "pupil", this.sphere, "pupil", [0, 0, 0.029], [0.03, 0.03, 0.028])
      const glint = this.part(eye, "glint", this.sphere, "glint", [0.009, 0.011, 0.041], [0.011, 0.011, 0.01])
      // Eyelids swing about the eye centre: a pivot object holds the shell, offset above or below.
      const upperPivot = this.node(eye, "upperLidPivot", [0, 0, 0])
      this.part(upperPivot, "upperLid", this.sphere, "lid", [0, 0.03, -0.002], [0.07, 0.03, 0.05])
      const lowerPivot = this.node(eye, "lowerLidPivot", [0, 0, 0])
      this.part(lowerPivot, "lowerLid", this.sphere, "lid", [0, -0.03, -0.002], [0.066, 0.024, 0.046])
      const brow = this.part(eye, "brow", this.sphere, "brow", [0, 0.046, 0.0], [0.062, 0.012, 0.03])
      this.eyes.push({side: s, iris, pupil, glint, upper: upperPivot, lower: lowerPivot, brow, sclera})
      if (s > 0) {
        this.anchors.eyes = eye
      }
    })
  }

  private buildTeeth(): void {
    const head = this.joints["head"]
    const jaw = this.joints["jaw"]
    if (!head || !jaw) {
      return
    }
    // x, z, tooth length. Canines at the corners are longest.
    const row: [number, number, number][] = [
      [MX - 0.042, 0.447, 0.034], [MX - 0.026, 0.466, 0.02], [MX - 0.011, 0.474, 0.018],
      [MX + 0.011, 0.474, 0.018], [MX + 0.026, 0.466, 0.02], [MX + 0.042, 0.447, 0.034]
    ]
    for (const [x, z, len] of row) {
      const up = this.part(head, "toothUp", this.box, "tooth", this.inHead([x, 0.166, z]), [0.0001, 0.0001, 0.0001])
      this.teethUpper.push(up)
      const down = this.part(jaw, "toothLow", this.box, "tooth", this.inJaw([MX + (x - MX) * 0.9, 0.152, z - 0.012]), [0.0001, 0.0001, 0.0001])
      this.teethLower.push(down)
      up.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, 0))
      ;(up as unknown as {len: number}).len = len
      ;(down as unknown as {len: number}).len = len * 0.75
    }
    this.anchors.jaw = this.node(jaw, "anchorJaw", this.inJaw([0.06, 0.092, 0.4]))
    this.anchors.mouth = this.node(head, "anchorMouth", this.inHead([0.1, 0.205, 0.45]))
  }

  private buildFur(): void {
    // Along the neck and back: z and the height of the skin at that z (read from the mesh), x near the centre line.
    const spine: [number, number][] = [
      [0.11, 0.245], [0.085, 0.205], [0.06, 0.168], [0.035, 0.14], [0.01, 0.124], [-0.02, 0.119], [-0.05, 0.119],
      [-0.08, 0.123], [-0.11, 0.127], [-0.14, 0.13], [-0.17, 0.131], [-0.2, 0.128], [-0.23, 0.123], [-0.26, 0.116], [-0.29, 0.106]
    ]
    const root = this.joints["root"]
    const head = this.joints["head"]
    if (!root || !head) {
      return
    }
    spine.forEach(([z, y], i) => {
      const onHead = z > 0.1
      const parent = onHead ? head : root
      const pos: Vec = onHead ? this.inHead([0, y - 0.012, z]) : [0, y - 0.012, z]
      // A tuft is three stacked blobs that taper to a dark tip, so a raised tuft reads as a spike of fur.
      const tuft = this.node(parent, "tuft", pos)
      tuft.getTransform().setLocalRotation(quat.fromEulerAngles(-24 * DEG, 0, (i % 3 - 1) * 5 * DEG))
      this.part(tuft, "base", this.sphere, "mid", [0, 0.2, 0], [1.0, 0.5, 1.0])
      this.part(tuft, "mid", this.sphere, "mid", [0, 0.52, 0], [0.7, 0.5, 0.7])
      this.part(tuft, "tip", this.sphere, "dark", [0, 0.84, 0], [0.4, 0.42, 0.4])
      tuft.getTransform().setLocalScale(new vec3(0.0001, 0.0001, 0.0001))
      this.tufts.push({so: tuft, i, baseY: pos[1]})
      if (i === 5) {
        this.anchors.fur = tuft
      }
    })
    this.hackleCount = spine.length
  }

  private buildAnchors(): void {
    const root = this.joints["root"]
    const earR = this.joints["earR"]
    const tail2 = this.joints["tail2"]
    if (root) {
      this.anchors.body = this.node(root, "anchorBody", [0.12, 0.02, -0.06])
    }
    if (earR) {
      this.anchors.ears = this.node(earR, "anchorEar", [0, 0.07, 0])
    }
    if (tail2) {
      this.anchors.tail = this.node(tail2, "anchorTail", [0.03, -0.01, -0.03])
    }
  }

  // ---------------------------------------------------------------- animating

  private rot(name: string, xDeg: number, yDeg: number, zDeg: number): void {
    const j = this.joints[name]
    if (j) {
      j.getTransform().setLocalRotation(quat.fromEulerAngles(xDeg * DEG, yDeg * DEG, zDeg * DEG))
    }
  }

  private apply(): void {
    const p = this.cur
    const t = this.clock

    // Head tilt. + lowers the head.
    this.rot("head", p.headPitch, 0, 0)

    // Jaw: panting, barking, yawning and lip licking, the same behaviours as the shape dog.
    let jaw = p.jaw
    let tongue = p.tongue
    if (p.tongue > 0.1) {
      jaw += 0.06 * Math.sin(t * TAU * 3.2) * p.tongue
    }
    if (p.bark > 0.01) {
      jaw += p.bark * (0.5 + 0.5 * Math.sin(t * TAU * 3))
    }
    if (p.yawn > 0.01) {
      const phase = (t % 4.2) / 1.6
      if (phase < 1) {
        jaw += p.yawn * 0.95 * Math.sin(phase * Math.PI)
      }
    }
    if (p.lick > 0.01) {
      const phase = ((t + 1.7) % 3.4) / 1.0
      if (phase < 1) {
        tongue += p.lick * Math.max(0, Math.sin(phase * TAU * 2))
        jaw += 0.12 * p.lick * Math.max(0, Math.sin(phase * TAU * 2))
      }
    }
    // A snarl opens the mouth a little more so the teeth show.
    jaw += 0.14 * smooth(0.3, 0.9, p.teeth)
    jaw = Math.max(0, Math.min(1, jaw))
    tongue = Math.max(0, Math.min(1.3, tongue))
    this.rot("jaw", jaw * 36, 0, 0)

    if (this.tongue) {
      const out = Math.max(tongue, jaw > 0.25 && p.teeth < 0.3 ? 0.35 : 0)
      this.tongue.enabled = out > 0.08
      const tr = this.tongue.getTransform()
      tr.setLocalScale(new vec3(0.04, 0.014, 0.09 + 0.1 * out))
      const base = this.inJaw([MX, 0.157, 0.43])
      tr.setLocalPosition(new vec3(base[0], base[1] - 0.012 * tongue, base[2] + 0.03 * out))
    }

    // Teeth: only in the warning pose, and only while the mouth is open enough to show them (not in a yawn).
    const teethOn = smooth(0.3, 0.9, p.teeth) * smooth(0.15, 0.35, jaw)
    for (const set of [this.teethUpper, this.teethLower]) {
      for (const tooth of set) {
        const len = (tooth as unknown as {len: number}).len
        const h = Math.max(0.0001, len * teethOn)
        const w = Math.max(0.0001, 0.013 * teethOn)
        const lower = set === this.teethLower
        tooth.getTransform().setLocalScale(new vec3(w, h, w))
        const pos = tooth.getTransform().getLocalPosition()
        // Upper teeth hang down from the lip, lower teeth stand up from it.
        const base = lower ? this.inJaw([0, 0.15, 0]) : this.inHead([0, 0.168, 0])
        tooth.getTransform().setLocalPosition(new vec3(pos.x, base[1] + (lower ? 1 : -1) * h * 0.5, pos.z))
      }
    }

    // Eyes: lids, brow, iris size.
    const eyeOpen = p.eye
    const upperDeg = eyeOpen > 1.15 ? 0 : 4 + Math.max(0, 1 - eyeOpen) * 78
    const lowerDeg = Math.max(0, 1 - eyeOpen) * 62
    // + = inner end of the brow down (hard stare); - = inner end up (soft, worried).
    const hard = smooth(1.1, 1.35, eyeOpen)
    const soft = smooth(0.95, 0.5, eyeOpen) * (1 - smooth(0.2, 0.05, eyeOpen))
    const browTilt = 16 * hard - 8 * soft
    const ring = Math.max(p.eyeRing, smooth(1.1, 1.4, eyeOpen) * 0.7)
    for (const e of this.eyes) {
      e.upper.getTransform().setLocalRotation(quat.fromEulerAngles(upperDeg * DEG, 0, 0))
      e.lower.getTransform().setLocalRotation(quat.fromEulerAngles(-lowerDeg * DEG, 0, 0))
      // Inner end of the brow is toward the nose: -x for the dog's right eye (+x), +x for the left.
      e.brow.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, e.side * browTilt * DEG))
      const lift = upperDeg > 60 ? 0 : 1
      e.brow.getTransform().setLocalPosition(new vec3(0, 0.046 - 0.016 * (upperDeg / 90) * lift, 0.0))
      const irisScale = 0.052 * (1 - 0.2 * ring)
      e.iris.getTransform().setLocalScale(new vec3(irisScale, irisScale, 0.045))
      e.pupil.getTransform().setLocalScale(new vec3(0.03 * (1 - 0.12 * ring), 0.03 * (1 - 0.12 * ring), 0.028))
      e.glint.enabled = upperDeg < 70
    }

    // Ears: relaxed, pricked forward, or pinned back and out.
    const earPitch = p.earForward * 20 - p.earBack * 52
    const earOut = p.earBack * 24 - p.earForward * 6
    this.rot("earL", earPitch, 0, earOut)
    this.rot("earR", earPitch, 0, -earOut)

    // Tail: base angle, curl and wag. The wag grows along the tail.
    const wag = (i: number, k: number): number => p.wagAmp * Math.sin(t * TAU * p.wagHz - i * 0.7) * k * 1.3
    this.rot("tail1", (p.tailPitch - 30) * 0.55, wag(0, 0.6), 0)
    this.rot("tail2", p.tailCurl * 1.6, wag(1, 0.9), 0)
    this.rot("tail3", p.tailCurl * 1.6, wag(2, 1.2), 0)

    // Raised fur: tufts grow from flat to standing, with a ripple so they do not all match. Hidden while flat.
    for (const tf of this.tufts) {
      const on = p.hackles > 0.03
      tf.so.enabled = on
      if (!on) {
        continue
      }
      const h = 0.012 + 0.058 * p.hackles * (0.78 + 0.22 * Math.sin(tf.i * 1.9))
      const w = 0.02 + 0.008 * p.hackles
      tf.so.getTransform().setLocalScale(new vec3(w, h, w))
    }
  }
}
