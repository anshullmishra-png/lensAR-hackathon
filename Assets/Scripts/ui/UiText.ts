import {Config} from "../app/Config"
import {Button} from "UIKit.lspkg/Scripts/Components/Button/Button"
import {RoundedRectangle} from "UIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

// One font for every label: Noto Sans Devanagari covers Hindi and Latin letters.
// (Lens Studio's default font has no Devanagari glyphs, so Hindi would show as empty boxes.)
const FONT = requireAsset("../../Fonts/Noto Sans Devanagari.ttf") as Font

/**
 * BackPlate adds a thick interaction collider (about 50 cm deep). Display-only panels must not
 * have one: it would sit between the user and the answer buttons below it and block their pinch.
 * Call after the plate has had a frame to create it (e.g. in show()).
 */
export function makeInert(root: SceneObject): void {
  const count = root.getChildrenCount()
  for (let i = 0; i < count; i++) {
    const child = root.getChild(i)
    if (child.name === "InteractionPlaneColliderRoot") {
      child.enabled = false
    }
    makeInert(child)
  }
}

/** makeInert now, and again shortly after, in case the plate creates its collider a frame late. */
export function makeInertSoon(owner: BaseScriptComponent, root: SceneObject): void {
  makeInert(root)
  const ev = owner.createEvent("DelayedCallbackEvent")
  ev.bind(() => makeInert(root))
  ev.reset(0.1)
}

export const COLOR_TEXT = new vec4(0.96, 0.96, 0.96, 1)
export const COLOR_TEXT_DIM = new vec4(0.9, 0.93, 0.97, 1)

/**
 * Create a centred, wrapping Text on its own child object.
 * x / y / z position it inside `parent`; width / height (cm) are its layout box.
 */
export function addText(
  parent: SceneObject,
  name: string,
  size: number,
  width: number,
  height: number,
  x: number,
  y: number,
  color: vec4 = COLOR_TEXT,
  z: number = 0.6
): Text {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  so.getTransform().setLocalPosition(new vec3(x, y, z))
  const t = so.createComponent("Component.Text") as Text
  t.font = FONT
  t.size = size * Config.TEXT_SCALE
  t.depthTest = true
  t.horizontalAlignment = HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = HorizontalOverflow.Wrap
  t.verticalOverflow = VerticalOverflow.Overflow
  t.layoutRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
  t.textFill.color = color
  return t
}

/** Card colour. Specs glasses add light to the real world, so a dark panel would be see-through: use a rich, bright fill. */
export const COLOR_CARD = new vec4(0.11, 0.42, 0.52, 1)
export const COLOR_CARD_EDGE = new vec4(0.62, 0.9, 0.95, 1)
export const COLOR_BUTTON = new vec4(0.82, 0.34, 0.04, 1)
export const COLOR_BUTTON_EDGE = new vec4(1, 0.92, 0.75, 1)
export const COLOR_BUTTON_HOVER = new vec4(0.95, 0.47, 0.1, 1)
export const COLOR_BUTTON_PRESSED = new vec4(0.58, 0.22, 0.02, 1)

/**
 * Give a UIKit plate or button a solid colour and a light edge. UIKit builds its visual a frame or two after
 * creation (and may reset it), so this applies the colour a few times.
 */
export function tintPlate(owner: BaseScriptComponent, root: SceneObject, fill: vec4, edge: vec4): void {
  const apply = () => {
    const rr = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    if (!rr) {
      return
    }
    rr.gradient = false
    rr.backgroundColor = fill
    rr.border = true
    rr.borderSize = 0.35
    rr.borderColor = edge
  }
  apply()
  for (const t of [0.05, 0.3, 0.8]) {
    const ev = owner.createEvent("DelayedCallbackEvent")
    ev.bind(apply)
    ev.reset(t)
  }
}

/**
 * Make a UIKit Button read as pressable: its own warm orange face with a light edge, brighter when the hand hovers and
 * darker when pressed. UIKit's own button fill is driven by gradient states, so a separate face is simpler than fighting it.
 * The face is a child of the button, so it scales and moves with UIKit's press animation.
 */
export function tintButton(owner: BaseScriptComponent, btn: Button, width: number, height: number): void {
  const face = global.scene.createSceneObject("ButtonFace")
  face.setParent(btn.sceneObject)
  face.getTransform().setLocalPosition(new vec3(0, 0, 0.15))
  const rr = face.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
  rr.initialize()
  rr.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
  rr.size = new vec2(width, height)
  rr.cornerRadius = 1.2
  rr.gradient = false
  rr.border = true
  rr.borderSize = 0.35
  rr.borderColor = COLOR_BUTTON_EDGE
  const paint = (c: vec4) => {
    rr.backgroundColor = c
  }
  paint(COLOR_BUTTON)
  btn.onHoverEnter.add(() => paint(COLOR_BUTTON_HOVER))
  btn.onHoverExit.add(() => paint(COLOR_BUTTON))
  btn.onTriggerDown.add(() => paint(COLOR_BUTTON_PRESSED))
  btn.onTriggerUp.add(() => paint(COLOR_BUTTON_HOVER))
}
