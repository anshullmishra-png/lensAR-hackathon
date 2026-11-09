import {Config} from "../app/Config"
import {assert, test} from "./TestKit"

const DEG = 180 / Math.PI

/** How far below the horizon (degrees) a point is, seen from the user's eyes. */
function angleBelowEye(cmBelowEye: number, distanceCm: number): number {
  return Math.atan2(cmBelowEye, distanceCm) * DEG
}

/** Bottom edge of each panel, in cm below the user's eyes (the panels float UI_EYE_DROP below eye level). */
function panelBottoms(): {name: string; cmBelowEye: number}[] {
  const y = Config.UI_Y
  const stack = (h: number): number => y.choices - 2 * (h + Config.BUTTON_GAP) - h / 2 // three buttons
  const below = (bottomY: number): number => Config.UI_EYE_DROP - bottomY
  return [
    {name: "question card", cmBelowEye: below(y.card - Config.CARD_H / 2)},
    {name: "three short buttons", cmBelowEye: below(stack(Config.BUTTON_H))},
    {name: "three long (Level 2) buttons", cmBelowEye: below(stack(Config.BUTTON_LONG_H))},
    {name: "feedback panel", cmBelowEye: below(y.feedback - Config.FEEDBACK_H / 2)},
    {name: "dose card", cmBelowEye: below(y.dose - Config.DOSE_H / 2)},
    {name: "end screen", cmBelowEye: below(y.end - Config.END_H / 2)}
  ]
}

// The Lens renders into a band about 27 deg wide x 36 deg tall, so half of that is the limit for anything on screen.
const VIEW_HALF_W_DEG = 13
const VIEW_HALF_H_DEG = 17.5
// Half of Moti's width as seen at an angle (head to tail tip, turned ~32 degrees), measured in the preview at scale 0.9.
const DOG_HALF_WIDTH_CM = 21
const SIDE_CLEARANCE_DEG = 0.8

test("Layout: Moti stands in the free space to the right of the panels, inside the view", () => {
  const panelRight = Math.atan2(Config.UI_SIDE_OFFSET + Config.CARD_W / 2, Config.UI_DISTANCE) * DEG
  const panelLeft = Math.atan2(Config.UI_SIDE_OFFSET - Config.CARD_W / 2, Config.UI_DISTANCE) * DEG
  const dogLeft = Math.atan2(Config.DOG_SIDE - DOG_HALF_WIDTH_CM, Config.DOG_DISTANCE) * DEG
  const dogRight = Math.atan2(Config.DOG_SIDE + DOG_HALF_WIDTH_CM, Config.DOG_DISTANCE) * DEG
  const dogBottom = angleBelowEye(Config.EYE_TO_FLOOR, Config.DOG_DISTANCE)

  assert(
    dogLeft >= panelRight + SIDE_CLEARANCE_DEG,
    `Moti's left edge is ${dogLeft.toFixed(1)} deg right of centre but the panels reach ${panelRight.toFixed(1)} deg ` +
      `(needs ${SIDE_CLEARANCE_DEG} deg of clearance)`
  )
  assert(panelLeft >= -VIEW_HALF_W_DEG, `the panels' left edge is ${panelLeft.toFixed(1)} deg, outside the view (${VIEW_HALF_W_DEG} deg)`)
  assert(dogRight <= VIEW_HALF_W_DEG, `Moti's right edge is ${dogRight.toFixed(1)} deg, outside the view (${VIEW_HALF_W_DEG} deg)`)
  assert(dogBottom <= VIEW_HALF_H_DEG, `Moti's feet are ${dogBottom.toFixed(1)} deg below eye level, outside the view (${VIEW_HALF_H_DEG} deg)`)
})

test("Layout: the captions sit above the question card, out of the dog's way", () => {
  const y = Config.UI_Y
  assert(y.captions - 4.5 > y.card + Config.CARD_H / 2 - 1, "captions should be above the card")
})

test("Layout: panels are narrower than the view and every size is positive", () => {
  assert(Config.CARD_W <= 46, "card width")
  for (const v of [Config.CARD_H, Config.FEEDBACK_H, Config.DOSE_H, Config.END_H, Config.BUTTON_H, Config.BUTTON_LONG_H]) {
    assert(v > 0, "panel sizes must be positive")
  }
})
