import {Interactable} from "InteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Config} from "../app/Config"
import {bus} from "../core/EventBus"
import {Events, SetPosePayload} from "../core/Events"
import {Log} from "../util/Log"
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
/** How far each eye's lids sit forward of the eye centre, so the lid caps clear the skin on both sides of the face. */
const LID_OUT: number[] = [0.014, 0.004]
/** Degrees added to each eye's upper lid edge: the two painted eyes are not equally far from their lid pivots, and without this one eye squints more than the other. */
const LID_BIAS_DEG: number[] = [0, 30]

// Colours picked to sit next to the baked fur texture (forehead about 0.51, 0.25, 0.10; back about 0.59, 0.30, 0.14).
const FUR_DARK: Vec = [0.55, 0.26, 0.1]
const FUR_MID: Vec = [0.86, 0.46, 0.19]
const FUR_LID: Vec = [0.86, 0.5, 0.22]
const SCLERA: Vec = [1, 0.97, 0.92]
const IRIS: Vec = [0.14, 0.07, 0.035]
const PUPIL: Vec = [0.02, 0.02, 0.025]
const GLINT: Vec = [1, 1, 1]
const TOOTH: Vec = [1, 0.97, 0.9]
const MOUTH: Vec = [0.3, 0.09, 0.1]
const TONGUE: Vec = [0.88, 0.38, 0.45]

/**
 * A unit-diameter UV sphere with few triangles. The project's own sphere mesh has 840 triangles, which is far too
 * many for the dozens of small parts (eyes, fur tufts) used here. rings x segments x 2 triangles, minus the poles.
 */
function lowPolySphere(rings: number, segments: number): RenderMesh {
  const mb = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3, normalized: true},
    {name: "texture0", components: 2}
  ])
  mb.topology = MeshTopology.Triangles
  mb.indexType = MeshIndexType.UInt16
  const verts: number[] = []
  for (let r = 0; r <= rings; r++) {
    const v = r / rings
    const phi = v * Math.PI
    for (let s = 0; s <= segments; s++) {
      const u = s / segments
      const theta = u * TAU
      const x = Math.sin(phi) * Math.cos(theta)
      const y = Math.cos(phi)
      const z = Math.sin(phi) * Math.sin(theta)
      verts.push(x * 0.5, y * 0.5, z * 0.5, x, y, z, u, v)
    }
  }
  mb.appendVerticesInterleaved(verts)
  const idx: number[] = []
  const row = segments + 1
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * row + s
      const b2 = a + row
      if (r !== 0) {
        idx.push(a, a + 1, b2)
      }
      if (r !== rings - 1) {
        idx.push(a + 1, b2 + 1, b2)
      }
    }
  }
  mb.appendIndices(idx)
  mb.updateMesh()
  return mb.getMesh()
}

/**
 * A spherical cap (unit diameter) around the +Y axis, from the pole down to `halfAngleDeg`. Used as an eyelid: it hugs the
 * eyeball like a real lid and turns about the eye centre, so it never floats in front of the face like a separate blob.
 */
function lidCap(halfAngleDeg: number, rings: number, segments: number): RenderMesh {
  const mb = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3, normalized: true},
    {name: "texture0", components: 2}
  ])
  mb.topology = MeshTopology.Triangles
  mb.indexType = MeshIndexType.UInt16
  const verts: number[] = []
  const maxPhi = halfAngleDeg * (Math.PI / 180)
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * maxPhi
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * TAU
      const x = Math.sin(phi) * Math.cos(theta)
      const y = Math.cos(phi)
      const z = Math.sin(phi) * Math.sin(theta)
      verts.push(x * 0.5, y * 0.5, z * 0.5, x, y, z, s / segments, r / rings)
    }
  }
  mb.appendVerticesInterleaved(verts)
  const idx: number[] = []
  const row = segments + 1
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * row + s
      const b2 = a + row
      if (r !== 0) {
        idx.push(a, a + 1, b2)
      }
      idx.push(a + 1, b2 + 1, b2)
    }
  }
  mb.appendIndices(idx)
  mb.updateMesh()
  return mb.getMesh()
}

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

  private focus: SceneObject
  private spin: SceneObject
  private spinQ: quat = quat.quatIdentity()
  private dragging = false
  private spinReset = false
  private focusT = 0
  private focusTarget = 0
  private cur: RigPose
  private target: RigPose
  private clock = 0

  private joints: {[name: string]: SceneObject} = {}
  private mats: {[name: string]: Material} = {}
  /** Low-poly spheres: the fine one for the eyes, the coarse one for fur tufts, mouth and tongue. */
  private sphere: RenderMesh
  private sphereFine: RenderMesh
  private lidMesh: RenderMesh
  private mouthInside!: SceneObject
  private eyes: EyeSet[] = []
  private teethUpper: SceneObject[] = []
  private teethLower: SceneObject[] = []
  private tongue!: SceneObject
  private tufts: {so: SceneObject; i: number; baseY: number}[] = []
  private hackleCount = 0

  constructor(
    parent: SceneObject,
    private body: SceneObject,
    sphere: RenderMesh,
    private box: RenderMesh,
    baseMaterial: Material,
    viewYawDeg: number,
    startPose: string
  ) {
    // The passed-in sphere (840 triangles) is not used: see lowPolySphere.
    void sphere
    this.sphere = lowPolySphere(5, 8)
    this.sphereFine = lowPolySphere(8, 12)
    this.lidMesh = lidCap(80, 6, 14)
    this.root = global.scene.createSceneObject("DogRealisticRig")
    this.root.setParent(parent)
    // A fixed turn so he is seen at an angle: his side, ears and tail show.
    this.root.getTransform().setLocalRotation(quat.fromEulerAngles(0, viewYawDeg * DEG, 0))

    // Everything hangs under a "focus" node whose origin is at the dog's feet, so growing and turning it keeps his paws on the floor.
    this.focus = global.scene.createSceneObject("DogFocus")
    this.focus.setParent(this.root)
    // Inside that, a "spin" node at the middle of his body: dragging him turns this node, so he can be viewed from any angle.
    this.spin = global.scene.createSceneObject("DogSpin")
    this.spin.setParent(this.focus)
    this.spin.getTransform().setLocalPosition(new vec3(0, FOOT_LIFT * CM_PER_UNIT, 0))
    body.setParent(this.spin)
    body.enabled = true
    const bt = body.getTransform()
    bt.setLocalRotation(quat.quatIdentity())
    bt.setLocalScale(vec3.one().uniformScale(CM_PER_UNIT))
    bt.setLocalPosition(vec3.zero())

    this.collectJoints(body)

    const mk = (c: Vec): Material => {
      const m = baseMaterial.clone()
      m.mainPass.baseColor = new vec4(c[0], c[1], c[2], 1)
      return m
    }
    this.mats = {
      dark: mk(FUR_DARK), mid: mk(FUR_MID), lid: mk(FUR_LID), sclera: mk(SCLERA), iris: mk(IRIS), pupil: mk(PUPIL), glint: mk(GLINT),
      tooth: mk(TOOTH), mouth: mk(MOUTH), tongue: mk(TONGUE)
    }

    this.cur = {...DogPoses[startPose].rig}
    this.target = {...this.cur}

    this.buildGrab()
    this.buildMouth()
    this.buildEyes()
    this.buildTeeth()
    this.buildFur()
    this.buildAnchors()
    this.apply()

    const sphereTris = this.sphere.getIndexBuffer().length / 3
    const fineTris = this.sphereFine.getIndexBuffer().length / 3
    const boxTris = this.box.getIndexBuffer().length / 3
    const small = this.countSmall()
    Log.info(
      `DogRealistic: joints [${this.jointNames().join(", ")}]; attachments: ${small.fine} fine spheres x ${fineTris} tris + ` +
        `${small.coarse} coarse spheres x ${sphereTris} tris + ${small.boxes} boxes x ${boxTris} tris = ` +
        `${small.fine * fineTris + small.coarse * sphereTris + small.boxes * boxTris} tris`
    )

    bus.on(Events.DOG_SET_POSE, (p: SetPosePayload) => this.setPose(p.pose))
  }

  setPose(name: string): void {
    const def = DogPoses[name]
    if (def) {
      this.target = {...def.rig}
    }
    // A new question: ease Moti back to facing front.
    this.spinReset = true
  }

  /** Turn toward the viewer and grow a little (true), or go back (false). */
  setFocus(on: boolean): void {
    this.focusTarget = on ? 1 : 0
  }

  update(dt: number): void {
    this.clock += dt
    if (this.spinReset && !this.dragging) {
      this.spinQ = quat.slerp(this.spinQ, quat.quatIdentity(), Math.min(1, dt * 5))
    }
    this.spin.getTransform().setLocalRotation(this.spinQ)
    this.focusT += (this.focusTarget - this.focusT) * Math.min(1, dt * 5)
    const f = this.focusT
    const s = 1 + (Config.DOG_FOCUS_SCALE - 1) * f
    this.focus.getTransform().setLocalScale(new vec3(s, s, s))
    this.focus.getTransform().setLocalRotation(quat.fromEulerAngles(0, Config.DOG_FOCUS_YAW_DEG * f * DEG, 0))
    const k = Math.min(1, dt * BLEND_PER_SECOND)
    const c = this.cur as unknown as {[key: string]: number}
    const t = this.target as unknown as {[key: string]: number}
    for (const key of Object.keys(c)) {
      c[key] += (t[key] - c[key]) * k
    }
    this.apply()
  }

  /** How many sphere and box parts the attachments use (for the log line). */
  private countSmall(): {fine: number; coarse: number; boxes: number} {
    const countIn = (node: SceneObject, acc: {fine: number; coarse: number; boxes: number}): void => {
      const rmv = node.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      if (rmv && rmv.mesh === this.sphere) {
        acc.coarse++
      } else if (rmv && rmv.mesh === this.sphereFine) {
        acc.fine++
      } else if (rmv && rmv.mesh === this.box) {
        acc.boxes++
      }
      for (let i = 0; i < node.getChildrenCount(); i++) {
        countIn(node.getChild(i), acc)
      }
    }
    const acc = {fine: 0, coarse: 0, boxes: 0}
    // Everything hangs under the root joint, so count from there once (not once per joint).
    if (this.joints["root"]) {
      countIn(this.joints["root"], acc)
    }
    return acc
  }

  /**
   * Turn Moti by dragging: yaw about the vertical axis and pitch about the horizontal axis, applied to the current turn, so
   * he can be taken all the way round and over (a trackball, not a limited tilt).
   */
  rotateBy(yawDeg: number, pitchDeg: number): void {
    const yaw = quat.angleAxis(yawDeg * DEG, vec3.up())
    const pitch = quat.angleAxis(pitchDeg * DEG, vec3.right())
    const q = yaw.multiply(pitch).multiply(this.spinQ)
    q.normalize()
    this.spinQ = q
  }

  /** An invisible box around Moti that can be grabbed (pinch, or the mouse in the preview) and dragged to turn him. */
  private buildGrab(): void {
    const grab = global.scene.createSceneObject("DogGrab")
    grab.setParent(this.root)
    grab.getTransform().setLocalPosition(new vec3(0, FOOT_LIFT * CM_PER_UNIT, 0))
    const collider = grab.createComponent("ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(Config.DOG_GRAB_SIZE_CM, Config.DOG_GRAB_SIZE_CM, Config.DOG_GRAB_SIZE_CM)
    collider.shape = shape
    collider.fitVisual = false
    const interactable = grab.createComponent(Interactable.getTypeName()) as Interactable
    interactable.onDragStart.add(() => {
      this.dragging = true
      this.spinReset = false
    })
    interactable.onDragUpdate.add((e) => {
      const v = e.planecastDragVector ? e.planecastDragVector : e.dragVector
      // Dragging right turns his front to the right; dragging up tips his front up.
      this.rotateBy(v.x * Config.DOG_SPIN_DEG_PER_CM, -v.y * Config.DOG_SPIN_DEG_PER_CM)
    })
    interactable.onDragEnd.add(() => {
      this.dragging = false
    })
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
    this.mouthInside = this.part(head, "mouthInside", this.sphere, "mouth", this.inHead([MX, 0.166, 0.42]), [0.07, 0.032, 0.12])
    this.mouthInside.enabled = false
    this.tongue = this.part(jaw, "tongue", this.sphere, "tongue", this.inJaw([MX, 0.157, 0.43]), [0.04, 0.014, 0.06])
    this.tongue.enabled = false
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
      // A round dark eye on the front of the face: a thin white sclera, a big dark iris, a pupil and one small highlight.
      const sclera = this.part(eye, "sclera", this.sphereFine, "sclera", [0, 0, 0], [0.056, 0.056, 0.056])
      const iris = this.part(eye, "iris", this.sphereFine, "iris", [0, 0, 0.01], [0.052, 0.052, 0.04])
      const pupil = this.part(eye, "pupil", this.sphereFine, "pupil", [0, 0, 0.021], [0.03, 0.03, 0.024])
      const glint = this.part(eye, "glint", this.sphereFine, "glint", [0.009, 0.011, 0.032], [0.011, 0.011, 0.009])
      // Eyelids are caps that hug the eyeball (a hair larger than it) and turn about the eye centre.
      // Upper: the cap sits on top of the eye and tips forward to close. Lower: the same cap, flipped, tips up.
      const upperPivot = this.node(eye, "upperLidPivot", [0, 0, LID_OUT[k]])
      this.part(upperPivot, "upperLid", this.lidMesh, "lid", [0, 0, 0], [0.067, 0.067, 0.067])
      const lowerPivot = this.node(eye, "lowerLidPivot", [0, 0, LID_OUT[k]])
      const lowerFlip = this.node(lowerPivot, "flip", [0, 0, 0])
      lowerFlip.getTransform().setLocalRotation(quat.fromEulerAngles(Math.PI, 0, 0))
      this.part(lowerFlip, "lowerLid", this.lidMesh, "lid", [0, 0, 0], [0.066, 0.066, 0.066])
      upperPivot.enabled = false
      lowerPivot.enabled = false
      // The dog's own painted eyes (big, glossy, with a highlight) are the friendly part of his face, so the 3D eyeball is
      // not drawn over them. Only the lids are used: to narrow the eyes (glare, drowsy) or close them (sleep).
      for (const ball of [sclera, iris, pupil, glint]) {
        ball.enabled = false
      }
      this.eyes.push({side: s, iris, pupil, glint, upper: upperPivot, lower: lowerPivot, sclera})
      if (s > 0) {
        // The dot for "eyes" sits at the outer corner of the eye, away from the mouth dot, even when Moti faces the viewer.
        this.anchors.eyes = this.node(eye, "anchorEye", [0.035, 0.012, 0.01])
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
      const up = this.part(head, "toothUp", this.sphere, "tooth", this.inHead([x, 0.166, z]), [0.0001, 0.0001, 0.0001])
      up.enabled = false
      this.teethUpper.push(up)
      const down = this.part(jaw, "toothLow", this.sphere, "tooth", this.inJaw([MX + (x - MX) * 0.9, 0.152, z - 0.012]), [0.0001, 0.0001, 0.0001])
      down.enabled = false
      this.teethLower.push(down)
      up.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, 0))
      ;(up as unknown as {len: number}).len = len
      ;(down as unknown as {len: number}).len = len * 0.75
    }
    this.anchors.jaw = this.node(jaw, "anchorJaw", this.inJaw([0.06, 0.092, 0.4]))
    this.anchors.mouth = this.node(head, "anchorMouth", this.inHead([0.115, 0.168, 0.44]))
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
    })
    this.hackleCount = spine.length
  }

  private buildAnchors(): void {
    const root = this.joints["root"]
    if (root) {
      // The "back fur" dot sits on the upper back at the side that faces the viewer, so it is not hidden behind his body.
      this.anchors.fur = this.node(root, "anchorFur", [0.1, 0.13, -0.02])
    }
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
    // A resting mouth (small jaw values) opens only a couple of degrees, so it reads as closed; big values (yawn, bark,
    // snarl) open fully.
    const jawDeg = jaw * 36 * (0.3 + 0.7 * smooth(0.15, 0.45, jaw))
    this.rot("jaw", jawDeg, 0, 0)
    this.mouthInside.enabled = jawDeg > 4.5

    if (this.tongue) {
      // The tongue shows only in a lick, or in an open mouth that is not a snarl. Never at rest.
      const lickOut = Math.max(0, tongue - p.tongue)
      const out = Math.max(lickOut, jawDeg > 9 && p.teeth < 0.3 ? 0.4 : 0)
      this.tongue.enabled = out > 0.08
      const tr = this.tongue.getTransform()
      tr.setLocalScale(new vec3(0.04, 0.014, 0.05 + 0.06 * out))
      const base = this.inJaw([MX, 0.157, 0.43])
      tr.setLocalPosition(new vec3(base[0], base[1] - 0.004 * out, base[2] + 0.012 * out))
    }

    // Teeth: only in the warning pose, and only while the mouth is open enough to show them (not in a yawn).
    const teethOn = smooth(0.3, 0.9, p.teeth) * smooth(5, 11, jawDeg)
    for (const set of [this.teethUpper, this.teethLower]) {
      for (const tooth of set) {
        const len = (tooth as unknown as {len: number}).len
        const h = Math.max(0.0001, len * 1.7 * teethOn)
        const w = Math.max(0.0001, 0.011 * teethOn)
        const lower = set === this.teethLower
        tooth.enabled = teethOn > 0.03
        tooth.getTransform().setLocalScale(new vec3(w, h, w))
        const pos = tooth.getTransform().getLocalPosition()
        // Upper teeth hang down from the lip, lower teeth stand up from it.
        const base = lower ? this.inJaw([0, 0.15, 0]) : this.inHead([0, 0.168, 0])
        tooth.getTransform().setLocalPosition(new vec3(pos.x, base[1] + (lower ? 1 : -1) * h * 0.5, pos.z))
      }
    }

    // Eyes. p.eye: 1 normal, below 1 narrow or sleepy, above 1 wide. The lids are caps; what matters is the elevation (in
    // degrees above the middle of the eye, seen from the front) where each lid edge sits. A cap of half-angle 80 tipped
    // forward by `a` degrees has its edge at elevation 10 - a, so a = 10 - elevation.
    const eyeOpen = p.eye
    const hard = smooth(0.3, 0.9, p.teeth) // warning: a narrowed, glaring stare
    const upperEdge = Math.max(-80, Math.min(90, 55 - 110 * (1 - eyeOpen)))
    const lowerEdge = -70 + 55 * Math.max(0, Math.min(1, (1 - eyeOpen) / 0.9))
    // Lids appear only when they really cover the eye (glare, drowsy, asleep); otherwise the painted eyes show untouched.
    const upperOn = upperEdge < 40
    const lowerOn = lowerEdge > -58
    // The glare is made by slanting the upper lid so its inner end sits lower than its outer end (no extra brow shape).
    const slant = 17 * hard
    this.eyes.forEach((e, k) => {
      e.upper.enabled = upperOn
      e.lower.enabled = lowerOn
      if (upperOn) {
        const edge = Math.min(85, upperEdge + LID_BIAS_DEG[k])
        e.upper.getTransform().setLocalRotation(quat.fromEulerAngles((10 - edge) * DEG, 0, e.side * slant * DEG))
      }
      if (lowerOn) {
        e.lower.getTransform().setLocalRotation(quat.fromEulerAngles(-(lowerEdge + 10) * DEG, 0, 0))
      }
    })

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
