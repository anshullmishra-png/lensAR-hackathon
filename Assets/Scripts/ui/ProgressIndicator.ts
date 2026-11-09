import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {Config} from "../app/Config"
import {Content} from "../content/Content"
import {bus} from "../core/EventBus"
import {Events, LevelPayload, Phase} from "../core/Events"
import {Log} from "../util/Log"
import {addText, COLOR_TEXT_DIM, makeInertSoon} from "./UiText"

const W = Config.CARD_W
const H = 8
const DOT_SPACING = 4.2

/**
 * "Level 1 of 3" plus one dot per question in the current level.
 * An answered dot is bigger and brighter (size AND brightness, not colour alone).
 */
@component
export class ProgressIndicator extends BaseScriptComponent {
  @input
  @hint("Sphere mesh (1 cm diameter)")
  dotMesh: RenderMesh

  @input
  @hint("Bright material for an answered dot")
  dotOn: Material

  @input
  @hint("Dim material for a waiting dot")
  dotOff: Material

  private label: Text
  private dots: SceneObject[] = []
  private answered = 0

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(W, H)
    this.label = addText(this.sceneObject, "Label", 34, 22, 4, -W / 2 + 13, 0, COLOR_TEXT_DIM)

    bus.on(Events.LEVEL_START, (p: LevelPayload) => this.setPhase(p.phase))
    bus.on(Events.ANSWER_RESULT, () => this.mark())
    this.sceneObject.enabled = false
  }

  private questionCount(phase: Phase): number {
    if (phase === Phase.LEVEL1) {
      return Content.level1.items.length
    }
    if (phase === Phase.LEVEL2) {
      return Content.level2.items.length
    }
    if (phase === Phase.LEVEL3) {
      return Content.level3.myths.length // the scored questions are the myth cards
    }
    return 0
  }

  private levelNumber(phase: Phase): number {
    return phase === Phase.LEVEL1 ? 1 : phase === Phase.LEVEL2 ? 2 : phase === Phase.LEVEL3 ? 3 : 0
  }

  private setPhase(phase: Phase): void {
    const n = this.levelNumber(phase)
    this.dots.forEach((d) => d.destroy())
    this.dots = []
    this.answered = 0
    if (n === 0) {
      this.sceneObject.enabled = false
      return
    }
    const t = Content.ui.levelOf
    const fill = (s: string): string => s.replace("{n}", String(n)).replace("{total}", "3")
    this.label.text = `${fill(t.hi)}\n${fill(t.en)}`
    this.buildDots(this.questionCount(phase))
    this.sceneObject.enabled = true
    makeInertSoon(this, this.sceneObject)
  }

  private buildDots(count: number): void {
    if (!this.dotMesh || !this.dotOn || !this.dotOff) {
      Log.warnOnce("progress-dots", "ProgressIndicator: dot mesh / materials not assigned, dots skipped")
      return
    }
    const startX = W / 2 - 6 - ((count - 1) * DOT_SPACING) / 2
    for (let i = 0; i < count; i++) {
      const dot = global.scene.createSceneObject(`Dot${i}`)
      dot.setParent(this.sceneObject)
      dot.getTransform().setLocalPosition(new vec3(startX + i * DOT_SPACING, 0, 0.8))
      dot.getTransform().setLocalScale(vec3.one().uniformScale(1.6))
      const rmv = dot.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.dotMesh
      rmv.mainMaterial = this.dotOff
      this.dots.push(dot)
    }
  }

  private mark(): void {
    const dot = this.dots[this.answered]
    this.answered++
    if (!dot) {
      return
    }
    dot.getTransform().setLocalScale(vec3.one().uniformScale(2.8))
    const rmv = dot.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mainMaterial = this.dotOn
  }
}
