import {Content} from "../content/Content"
import {Signal} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {AnswerResultPayload, Events} from "../core/Events"
import {addText, COLOR_TEXT_DIM} from "../ui/UiText"

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

const MAX_SLOTS = 4
const LEGEND_X = 6
const LEGEND_Z = 36
const HEADER_Y = 134
const FIRST_ROW_Y = 116
const ROW_STEP = 13.5
const DOT_CM = 5
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

  constructor(parent: SceneObject, sphere: RenderMesh, dotMaterial: Material) {
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

    bus.on(Events.ANSWER_RESULT, (p: AnswerResultPayload) => this.onAnswer(p.questionId))
    bus.on(Events.HIDE_CARD, () => this.hide())
    bus.on(Events.DOG_SET_POSE, () => this.hide())
    bus.on(Events.RESTART, () => this.hide())
  }

  hide(): void {
    this.root.enabled = false
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
    this.show(item.signals)
  }

  private show(signals: Signal[]): void {
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
      const a = ANCHORS[sig.id] ?? ANCHORS.body
      const pos = new vec3(a[0], a[1], a[2])
      slot.dot.getTransform().setLocalPosition(pos)
      slot.badge.sceneObject.getTransform().setLocalPosition(new vec3(a[0], a[1], a[2] + DOT_CM / 2 + 0.4))
      slot.hi.text = `${i + 1}  ${sig.text.hi}`
      slot.en.text = sig.text.en
    })
    this.root.enabled = true
  }
}
