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

## Signs to look for (callouts on Moti)

After each Level 1 answer, numbered dots appear on Moti's body and a short bilingual "Look for" legend appears beside him (`dog/DogCallouts.ts`; the text lives in `Content.ts` as `signals`). The dots sit on Moti's actual ears, eyes, mouth, body and tail, so they follow him as he moves.

## Add the Hindi audio

The two chimes (`sfx_right`, `sfx_wrong`) are included. The 16 Hindi voice lines are **not recorded yet**; until they are, every line shows as a caption.

1. `node tools/audio-tools.mjs script` (or open `tools/recording-script.md`) lists each line to record. Record one MP3 or WAV per id and name the file exactly the id (e.g. `l1_a.mp3`). Put them in `Assets/Audio/`.
2. Run `node tools/audio-tools.mjs index`. This writes `Assets/Scripts/audio/AudioIndex.ts` so `AudioManager` finds them by name. (Clips assigned by hand in the **Tracks** list also work.)
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
- **Dog (realistic, default):** `Assets/GeneratedMeshes/MotiRigged.glb` is the AI-generated `MotiDog.glb` with a small skeleton added by `tools/build_moti_rig.py` (soft skin weights, so parts bend without seams): `root`, `head`, `jaw`, `earL`, `earR`, `tail1`, `tail2`, `tail3`. `dog/DogRealistic.ts` drives those bones from the pose data in `DogPoses.ts` and adds three code-built attachments that follow the bones: eyes (eyeball, pupil, highlight, upper and lower eyelids, brow), upper and lower teeth that show only in the warning snarl, and a row of fur tufts along the neck and spine that grow from flat to standing. A mouth interior and tongue hide the gap when the jaw opens. The attachments use two small generated sphere meshes (about 5,500 triangles in all); the body is about 4,000. The scene object `RealisticDog` (under `DogMesh`) holds the model. Set `Config.REALISTIC_DOG` to `false` to use the shape-built dog instead.
- **Dog (fallback):** built from separate parts in code (`dog/DogRig.ts`): body, legs, head, snout, jaw and tongue, eyes, two ears, a four-segment tail and a ridge of fur along the spine. Same cues, simple stylised look. Kept behind `Config.REALISTIC_DOG`.
- **Dog cues (both versions):** relaxed (loose, soft eyes, panting, gentle wag), nervous (ears pinned back, tail tucked, white-ringed eyes, lip licking, yawning), warning (stiff, fur raised, high stiff tail, wide stare, teeth showing), barking, eating, sleeping.
- **Panels:** at eye level, 150 cm away and 12 cm left of centre to leave room for Moti (spec: 35 cm to the side). The Lens only renders into a band about 27° wide and 36° tall (measured in the Lens Studio preview), so everything must fit that. Captions sit at the top; positions are in `Config.UI_Y`. All text is scaled by `Config.TEXT_SCALE` (1.9) so it stays readable at that size.
- **Arm:** a stand-in built from basic shapes.
- **Layout:** the panels sit 12 cm left of centre and Moti stands on the right, turned about 32 degrees so his ears and tail show, 280 cm away at 0.9 scale. There is no floor query in the preview, so the floor is a fixed `EYE_TO_FLOOR` (72 cm) below the camera; that is a **preview workaround**. On real glasses use about 150 cm and recheck the layout (`Layout.test.ts` guards the preview numbers).
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
| `Config.AUTOPLAY` | false | test aid only: answers every prompt itself so all scenes can be stepped through (`debug/AutoPlay.ts`). Never on for a real run |
| `Config.DEMO_MODE` | **true** | wash timer 15 s and a skip button; set `false` for the real 15 minutes |

---

## Before you publish — checklist

- [ ] Set `Config.DEMO_MODE` to `false` (real 15-minute wash, no skip button).
- [ ] Have a native speaker review every `// HI: review` line, then verify every `// VERIFY` line against its source.
- [x] Dev helpers (`AiPreviewAgentInteract`, `Leaf` and its `LeafPlugin`) are not in this repo. `AiPreviewAgentInspect` and `Bitmoji 3D` are installed locally by Lens Studio tooling but are unused by the project and are git-ignored. The project's own packages are `InteractionKit`, `UIKit`, `Motion` and `Icons`.
- [x] `.virtual-scene.json` (generated scene snapshot) is git-ignored.
- [x] `spk_debug_key.pem` (private signing key) is git-ignored and is not in the repo. Never commit it.
- [ ] Drop in the Hindi audio and re-check that nothing is cut off.
- [ ] Replace the stand-in forearm and the primitive puppies/bowl if you want a more polished look.
- [x] `node tools/run-tests.mjs`: 28 of 28 pass.

---

## What was checked against sources (Nov 9, 2026)

Only what a source actually says is marked here. Everything else is still unconfirmed, and every Hindi line still needs a native-speaker review (`// HI: review`).

| Claim in the Lens | Status | Source |
|---|---|---|
| Wash the wound with soap and water for **at least 15 minutes** | Confirmed (English changed from "about" to "at least" to match) | [WHO rabies fact sheet](https://www.who.int/news-room/fact-sheets/detail/rabies); India's NRCP guidance says "up to 15 minutes" then a disinfectant ([MoHFW Rabies Free India](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/169391055721.pdf)) |
| A bite **or scratch** needs medical care, and rabies is preventable after exposure | Confirmed | [WHO rabies fact sheet](https://www.who.int/news-room/fact-sheets/detail/rabies) |
| Go to a health centre the same day / complete every dose | Consistent with WHO ("immediately seek medical attention", full vaccine course); exact "same day" wording not found | same |
| Home remedies (chilli, turmeric, oil) | **Not confirmed.** NRCP prohibits cauterising with acids, alkalis, flame or heat; the specific remedies were not found | MoHFW document above |
| Modern vaccines are not given in the stomach | **Not confirmed** by a source I could open | check the NRCP "National Guidelines on Rabies Prophylaxis" |
| Dog body-language signals (Levels 1 and 2) | **Not confirmed** | a veterinary or animal-welfare body-language guide |

Training aid only. Not medical advice.
