/**
 * Tick and cross symbols drawn from thin box bars (no textures or fonts needed, so they
 * never depend on a glyph existing). Segments are [x1, y1, x2, y2] in cm.
 */
const TICK: number[][] = [
  [-4, -0.5, -1.5, -3.5],
  [-1.5, -3.5, 4, 4]
]
const CROSS: number[][] = [
  [-3.5, 3.5, 3.5, -3.5],
  [3.5, 3.5, -3.5, -3.5]
]

function buildSymbol(
  parent: SceneObject,
  name: string,
  mesh: RenderMesh,
  material: Material,
  segments: number[][],
  scale: number
): SceneObject {
  const root = global.scene.createSceneObject(name)
  root.setParent(parent)
  for (const [x1, y1, x2, y2] of segments) {
    const bar = global.scene.createSceneObject(`${name}Bar`)
    bar.setParent(root)
    const dx = (x2 - x1) * scale
    const dy = (y2 - y1) * scale
    const t = bar.getTransform()
    t.setLocalPosition(new vec3(((x1 + x2) / 2) * scale, ((y1 + y2) / 2) * scale, 0))
    t.setLocalRotation(quat.fromEulerAngles(0, 0, Math.atan2(-dx, dy)))
    t.setLocalScale(new vec3(1.6 * scale, Math.sqrt(dx * dx + dy * dy) + 1.6 * scale, 0.8 * scale))
    const rmv = bar.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    rmv.mainMaterial = material
  }
  return root
}

export function buildTick(parent: SceneObject, mesh: RenderMesh, material: Material, scale: number = 1): SceneObject {
  return buildSymbol(parent, "Tick", mesh, material, TICK, scale)
}

export function buildCross(parent: SceneObject, mesh: RenderMesh, material: Material, scale: number = 1): SceneObject {
  return buildSymbol(parent, "Cross", mesh, material, CROSS, scale)
}
