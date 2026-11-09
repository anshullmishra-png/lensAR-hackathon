import {Config} from "../app/Config"
import {Content} from "../content/Content"
import {LocalText, Signal} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {AnswerResultPayload, Events, SetChoicesPayload} from "../core/Events"
import {addText, COLOR_TEXT_DIM} from "../ui/UiText"
import {DogRigApi} from "./DogRigApi"

/**
 * "Signs to look for": numbered dots on Moti's body plus a short legend next to him, shown AFTER the
 * user answers a Level 1 question (so it never gives the answer away).
 *
 * The dog is one static mesh, so the dots cannot make his ears or tail move. They point at WHERE on a
 * dog's body to look and name the sign, which is a teaching aid, not a claim that the model shows it.
 *
 * Positions are in the dog's own space (cm): +X is the viewer's right, +Y up, +Z toward the viewer.
 * The legend sits above his head, in the free column to the right of the question card.
 */
const ANCHORS: {[part: string]: [number, number, number]} = {
  ears: [8, 60, 26],
  eyes: [5, 52, 34],
  mouth: [0, 45, 37],
  jaw: [-5, 40, 36],
  fur: [-9, 50, 22],
  body: [10, 32, 30],
  tail: [11, 28, -22]
}

const MAX_SLOTS = 5
/** The neutral dots shown with each Level 1 question: where to look, not what it means. */
const LOOK_PARTS = ["ears", "eyes", "mouth", "tail", "fur"] as const
const LEGEND_X = 0
const LEGEND_Z = 0
const HEADER_Y = Config.CALLOUT_HEADER_Y
const FIRST_ROW_Y = Config.CALLOUT_FIRST_ROW_Y
const ROW_STEP = Config.CALLOUT_ROW_STEP
const DOT_CM = 4.2
const DARK = new vec4(0.08, 0.08, 0.1, 1)

interface Slot {
  dot: SceneObject
  badge: Text
  hi: Text
  en: Text
}

export class DogCallouts {
  private root: SceneObject
  private header: Text
  private headerEn: Text
  private slots: Slot[] = []
  private active: Signal[] | null = null

  constructor(
    parent: SceneObject,
    sphere: RenderMesh,
    dotMaterial: Material,
    private rig?: DogRigApi,
    private onVisible?: (visible: boolean) => void
  ) {
    this.root = global.scene.createSceneObject("Callouts")
    this.root.setParent(parent)

    const lookFor = Content.ui.lookFor
    this.header = addText(this.root, "Header", 80, 34, 6, LEGEND_X, HEADER_Y + 2.5, COLOR_TEXT_DIM, LEGEND_Z)
    this.header.text = lookFor.hi
    this.headerEn = addText(this.root, "HeaderEn", 64, 34, 4, LEGEND_X, HEADER_Y - 3, COLOR_TEXT_DIM, LEGEND_Z)
    this.headerEn.text = lookFor.en

    for (let i = 0; i < MAX_SLOTS; i++) {
      this.slots.push(this.buildSlot(i, sphere, dotMaterial))
    }
    this.root.enabled = false

    bus.on(Events.SET_CHOICES, (p: SetChoicesPayload) => this.onQuestion(p.questionId))
    bus.on(Events.ANSWER_RESULT, (p: AnswerResultPayload) => this.onAnswer(p.questionId))
    bus.on(Events.HIDE_CARD, () => this.hide())
    bus.on(Events.DOG_SET_POSE, () => this.hide())
    bus.on(Events.RESTART, () => this.hide())
  }

  hide(): void {
    this.root.enabled = false
    this.active = null
    if (this.onVisible) {
      this.onVisible(false)
    }
  }

  /** Call every frame: keeps each dot on its body part while Moti turns and grows. */
  update(): void {
    if (!this.active || !this.root.enabled) {
      return
    }
    this.active.forEach((sig, i) => {
      const slot = this.slots[i]
      if (!slot || !sig) {
        return
      }
      const pos = this.anchorPosition(sig.id)
      slot.dot.getTransform().setLocalPosition(pos)
      slot.badge.sceneObject.getTransform().setLocalPosition(new vec3(pos.x, pos.y, pos.z + DOT_CM / 2 + 0.4))
    })
  }

  private buildSlot(index: number, sphere: RenderMesh, material: Material): Slot {
    const y = FIRST_ROW_Y - index * ROW_STEP
    const dot = global.scene.createSceneObject(`Dot${index}`)
    dot.setParent(this.root)
    dot.getTransform().setLocalScale(vec3.one().uniformScale(DOT_CM))
    const rmv = dot.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = sphere
    rmv.mainMaterial = material
    // The number sits on the dot. It is a child of the root (not of the scaled dot) so its size stays true.
    const badge = addText(this.root, `Badge${index}`, 60, 5, 4, 0, 0, DARK, 0)
    badge.text = `${index + 1}`

    const hi = addText(this.root, `Hi${index}`, 100, 36, 6, LEGEND_X, y + 2.6, undefined, LEGEND_Z)
    const en = addText(this.root, `En${index}`, 76, 36, 5, LEGEND_X, y - 3.4, COLOR_TEXT_DIM, LEGEND_Z)
    return {dot, badge, hi, en}
  }

  private onAnswer(questionId: string): void {
    const item = Content.level1.items.find((it) => it.id === questionId)
    if (!item || !item.signals || item.signals.length === 0) {
      return
    }
    this.show(item.signals, Content.ui.lookFor)
  }

  /** With every Level 1 question: dots on the parts to watch, named neutrally so they do not give the answer away. */
  private onQuestion(questionId: string): void {
    if (!Content.level1.items.some((it) => it.id === questionId)) {
      return
    }
    const parts = Content.ui.parts
    this.show(LOOK_PARTS.map((id) => ({id, text: parts[id]})), Content.ui.lookCarefully)
  }

  /** Where to put the dot for a body part: on the real part when the dog is built from parts, else a fixed spot. */
  private anchorPosition(part: string): vec3 {
    const marker = this.rig ? this.rig.anchors[part] : undefined
    if (marker) {
      const local = this.root.getTransform().getInvertedWorldTransform().multiplyPoint(marker.getTransform().getWorldPosition())
      // Nudge toward the viewer so the dot sits in front of the part, not inside it.
      return new vec3(local.x, local.y, local.z + 9)
    }
    const a = ANCHORS[part] ?? ANCHORS.body
    return new vec3(a[0], a[1], a[2])
  }

  private show(signals: Signal[], header: LocalText): void {
    this.header.text = header.hi
    this.headerEn.text = header.en
    this.slots.forEach((slot, i) => {
      const sig = signals[i]
      const on = !!sig
      slot.dot.enabled = on
      slot.badge.sceneObject.enabled = on
      slot.hi.sceneObject.enabled = on
      slot.en.sceneObject.enabled = on
      if (!sig) {
        return
      }
      const pos = this.anchorPosition(sig.id)
      slot.dot.getTransform().setLocalPosition(pos)
      slot.badge.sceneObject.getTransform().setLocalPosition(new vec3(pos.x, pos.y, pos.z + DOT_CM / 2 + 0.4))
      slot.hi.text = `${i + 1}  ${sig.text.hi}`
      slot.en.text = sig.text.en
    })
    this.active = signals
    this.root.enabled = true
    if (this.onVisible) {
      this.onVisible(true)
    }
  }
}
