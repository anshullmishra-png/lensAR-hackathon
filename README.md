# Read the Dog — a Snap Spectacles (SPECS) Lens

Learn to read a dog before it bites, and know exactly what to do if it does.
For children, families and community health workers in India. Hindi + English, pinch and poke only.

**Flow:** Onboarding → Level 1 *Read the signals* → Level 2 *What do you do?* → Level 3 *If you are bitten* → End screen (score) → Play again.

> **Training aid only. Not medical advice.** The Lens never judges whether a dog is rabid, never gives a
> vaccine schedule or dose count, and always sends a bitten person to a health centre.

---

## Run it

1. Open `lensAI hackathon.esproj` in Lens Studio **5.24+** with the Lens Studio MCP / CLAD plugin if you want agent help.
2. The Preview panel must be **SPECS 27 (stereo) · Interactive**.
3. Press play. The dog is placed on the floor 1.5 m ahead; **look down** to see it (the view is narrow).
4. Pinch the buttons. In the preview, hover a hand over a button and pinch.

## Run the tests

```
node tools/run-tests.mjs
```

Needs Node 22.15 or newer (tested on 24). Nothing to install: the runner transpiles the TypeScript itself.
28 tests, pure logic only (no scene), in `Assets/Scripts/tests/`:

| File | What it proves |
|---|---|
| `GameState.test.ts` | the full forward path; illegal transitions (e.g. END → LEVEL2) rejected; reset returns to ONBOARDING |
| `ScoreKeeper.test.ts` | only the first attempt counts; per-level totals; reset |
| `ContentValidator.test.ts` | the real `Content` has no errors or warnings; broken copies (two correct answers, missing Hindi, duplicate audio id, unknown pose/prop…) are caught; `"TODO"` Hindi is only a warning |
| `AudioQueue.test.ts` | two clips never sound at once (including a 200-round randomised check); a missing clip never blocks; stop releases waiters |
| `Layout.test.ts` | no panel reaches down far enough to cover the dog |

I checked the suite can fail: breaking the content, the panel height and the audio queue each turned it red.
The tests also compile inside Lens Studio but never run there.

---

## Where things live

```
Assets/Scripts/
  app/      AppRoot.ts          entry point: checks every wire, validates content, applies the panel layout, starts the flow
            Config.ts           every constant (distances, sizes, DEMO_MODE, panel positions)
  core/     EventBus.ts         publish/subscribe; a throwing handler never stops the others
            Events.ts           every event name + payload types + the Phase enum
            GameState.ts        pure state machine ONBOARDING→LEVEL1→LEVEL2→LEVEL3→END
            ScoreKeeper.ts      pure scoring, first attempt only
            FlowController.ts   shows only the current level, starts it, handles LEVEL_COMPLETE / RESTART
  content/  Content.ts          ALL user-facing text (Hindi + English) — edit facts and translations here only
            ContentTypes.ts     the data shapes
            ContentValidator.ts checks the content at start-up (logs problems, never blocks the Lens)
  audio/    AudioManager.ts     finds clips by file name, plays them through the AudioComponent
            AudioQueue.ts       pure ordering logic: voice lines interrupt, explanations wait their turn
  dog/      DogPlacement.ts     puts the dog on the floor DOG_DISTANCE ahead, facing the user
            DogLookAt.ts        turns the dog toward the user (vertical axis only, ±60°, smoothed)
            DogController.ts    plays a pose (scale / pitch / roll / height + an idle loop), shows or hides the dog
            DogPoses.ts         pose data: relaxed, nervous, warning, eating, sleeping, with_puppies, barking
            DogProps.ts         food bowl, puppies, bark rays (built from basic shapes)
  arm/      ArmPlacement.ts     shows the forearm on an imaginary table, scale-in / scale-out
            BiteMarker.ts       two small marks + a pulsing ring (no blood): fresh → washing → clean
            WashTimer.ts        countdown ring, falling water, time left, demo-only skip button
  ui/       UiAnchor.ts         parent of every panel; floats in front of the user and follows loosely
            UiText.ts           the one text helper (Hindi-capable font) + removal of display-only colliders
            CardPanel.ts        the main card: Hindi large, English small
            ChoiceButtons.ts    up to 3 big pinchable buttons (Hindi over English)
            FeedbackDisplay.ts  tick/cross SHAPE + "Right"/"Not quite" + explanation
            CaptionBar.ts       one caption line, Hindi over English, clears itself
            ProgressIndicator.ts "Level 1 of 3" + one dot per question
            DoseCalendarCard.ts blank calendar slots tick on one by one (animation only) + the dose message
            EndScreen.ts        score, one line per level, closing message, Play again
            Shapes.ts           tick / cross drawn from bars
  levels/   LevelBase.ts        say / ask / evaluate / settle helpers shared by every level
            OnboardingLevel.ts  places the dog and panels, intro, one Start button
            Level1ReadSignals.ts Level2WhatToDo.ts Level3FirstAid.ts   the three levels
  util/     TweenHelpers.ts     the only file that touches the tween library (Motion)
            Log.ts              "[ReadTheDog]" prefixed logging, warnOnce
  tests/    TestKit.ts + the five *.test.ts files above
tools/run-tests.mjs             the test runner
```

Scene: `App` (AppRoot) → `Systems` (AudioManager, FlowController) · `World` (DogRoot → DogModel → DogMesh, ArmRoot → ArmModel, BiteMarker, WashTimer) ·
`UI` (Progress, MainCard, Choices, Feedback, DoseCalendar, EndScreen, Captions) · `Levels` (Onboarding, Level1, Level2, Level3).
`EventBus`, `GameState` and `ScoreKeeper` are plain modules, not scene objects.

## Change the content

Everything the user reads is in `Assets/Scripts/content/Content.ts`, as `{en, hi}` pairs.
`// HI: review` marks a Hindi draft that needs a native speaker. `// VERIFY` marks a fact that is **not yet confirmed**.
Leave both flags in until the line has been checked.

## Add the Hindi audio

1. Record one MP3 per id below and name the file exactly the id (e.g. `l1_a.mp3`). Put them in `Assets/Audio/`.
2. In Lens Studio select `AudioManager` and drag the files into its **Tracks** list.
3. A missing clip is never an error: it logs one warning and the Lens carries on with captions.

`onb_intro` · `l1_a` `l1_b` `l1_c` · `l2_eat` `l2_pups` `l2_sleep` `l2_bark` · `l3_intro` `l3_wash` `m_remedy` `m_scratch` `m_stomach` `l3_go` `l3_dose` · `end_msg` · `sfx_right` `sfx_wrong`

An explanation clip waits for the chime to end, and each level stays on its card until the clip finishes.

---

## Sources to cite (not yet checked)

Every `VERIFY` item is unconfirmed. I have **not** checked the text against any of these; they are where to look:

| Content | Check against |
|---|---|
| Level 3 first aid: wash for about 15 minutes, same-day health-centre visit, scratches count, vaccine is not given in the stomach, complete every dose | India's **National Rabies Control Programme** guidance (NCDC / MoHFW) and the **WHO** position paper and fact sheet on rabies |
| Level 1 dog body-language signals | a veterinary or animal-welfare body-language guide (for example from a veterinary association or animal-welfare charity) |
| Level 2 behaviour around dogs (eating, puppies, sleeping, barking) | a recognised dog-bite-prevention source (for example a public-health agency or veterinary association) |

Cite the exact document and date you verified against before recording the video.

---

## How it was tuned (and why it differs from the first brief)

- **Tween library:** Motion (installed with UI Kit), because LSTween is not in the Asset Library.
- **Dog:** one static AI-generated mesh, so poses are whole-body changes (scale, tilt, sleeping on its side) plus props. The card fallback was not needed and is not built.
- **Panels:** below eye level and 12 cm right (spec: eye level, 35 cm) so they fit the narrow view and clear the dog; captions at the top for the same reason. Positions are in `Config.UI_Y`.
- **Arm:** a stand-in built from basic shapes.
- **Floor:** no floor query exists in the preview, so the floor is `EYE_TO_FLOOR` (150 cm) below the camera.
- **Dose card:** six blank slots, no numbers or dates. The slot count is decoration, not a dose count.
- **Events added:** `SET_CHOICES`, `CLEAR_CHOICES`, `DOG_VISIBLE`, `SHOW_DOSE`, `HIDE_DOSE`.
- **File length:** `WashTimer.ts` (162 lines) and `Content.ts` (data, 257 lines) are over the ~150-line rule.

## Testing shortcuts (leave at their defaults)

| Setting | Default | Use |
|---|---|---|
| `FlowController.startAt` | empty | `LEVEL1` / `LEVEL2` / `LEVEL3` / `END` jumps straight there |
| `Level2WhatToDo.startIndex` | 0 | start at a later scenario |
| `Level1ReadSignals.firstItemOnly` | off | play just the first dog state |
| `AppRoot.placeAtStart` | off | place the dog without onboarding |
| `Config.DEMO_MODE` | **true** | wash timer 15 s and a skip button; set `false` for the real 15 minutes |

---

## Before you publish — checklist

- [ ] Set `Config.DEMO_MODE` to `false` (real 15-minute wash, no skip button).
- [ ] Have a native speaker review every `// HI: review` line, then verify every `// VERIFY` line against its source.
- [x] Dev helpers removed: packages `AiPreviewAgentInspect`, `AiPreviewAgentInteract`, `Leaf`, `Bitmoji 3D.lsc`, the
      `AiPreviewAgent Handler` scene object and the `AiPreviewAgentInteract` demo object. The project now has only
      `InteractionKit`, `UIKit`, `Motion` and `Icons`. (Without the helpers, the agent cannot simulate pinches in the preview
      any more; to test hands-on, use the Preview panel yourself, or reinstall "AI Preview Agent – Interact" while developing
      and remove it again before publishing.)
- [ ] `.virtual-scene.json` in the project root is a generated snapshot from the scene tools; delete it before sharing.
- [ ] **Do not share or commit `spk_debug_key.pem`** in the project root: it is a private signing key generated by Lens Studio.
- [ ] Drop in the Hindi audio and re-check that nothing is cut off.
- [ ] Replace the stand-in forearm and the primitive puppies/bowl if you want a more polished look.
- [ ] Re-run `node tools/run-tests.mjs`.
