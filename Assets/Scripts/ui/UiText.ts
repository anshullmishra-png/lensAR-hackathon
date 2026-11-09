import {Config} from "../app/Config"

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
export const COLOR_TEXT_DIM = new vec4(0.78, 0.82, 0.88, 1)

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
