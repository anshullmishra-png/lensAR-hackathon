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
30 tests, pure logic only (no scene), in `Assets/Scripts/tests/`:

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
`// HI: review` marks a Hindi draft that needs a native speaker. `// CHECKED <date>` marks facts checked against the sources named beside it (table below). No `// VERIFY` flags are left.
Leave both flags in until the line has been checked.

## Signs to look for (callouts on Moti)

After each Level 1 answer, numbered dots appear on Moti's body and a short bilingual "Look for" legend appears beside him (`dog/DogCallouts.ts`; the text lives in `Content.ts` as `signals`). The dots sit on Moti's actual ears, eyes, mouth, body and tail, so they follow him as he moves. **Where to look (with every Level 1 question):** dots appear on Moti's ears, eyes, mouth, tail and back, with a legend "Look carefully at: Ears, Eyes, Mouth, Tail, Back fur". They name body parts only, so they do not give the answer away; the specific cue is shown after the answer (below). **Turn him:** drag Moti (pinch and drag, or the mouse in the preview) to turn him all the way round and over, so you can see him from every angle; he eases back to facing front for the next question (`DogRealistic.ts`, `Config.DOG_SPIN_DEG_PER_CM`). While the dots show, Moti also turns toward you and grows by `Config.DOG_FOCUS_SCALE` (1.3), about his feet, then returns to normal when they clear. Turning toward you makes his silhouette narrower, which is how he gets bigger without leaving his strip of the narrow view (`Layout.test.ts` checks this).

## Add the Hindi audio

The two chimes (`sfx_right`, `sfx_wrong`) are included. The 16 Hindi voice lines are **not recorded yet**; until they are, every line shows as a caption.

1. `node tools/audio-tools.mjs script` (or open `tools/recording-script.md`) lists each line to record. Record one MP3 or WAV per id and name the file exactly the id (e.g. `l1_a.mp3`). Put them in `Assets/Audio/`.
2. Run `node tools/audio-tools.mjs index`. This writes `Assets/Scripts/audio/AudioIndex.ts` so `AudioManager` finds them by name. (Clips assigned by hand in the **Tracks** list also work.)
3. A missing clip is never an error: it logs one warning and the Lens carries on with captions.

`onb_intro` · `l1_a` `l1_b` `l1_c` · `l2_eat` `l2_pups` `l2_sleep` `l2_bark` · `l3_intro` `l3_wash` `m_remedy` `m_scratch` `m_stomach` `l3_go` `l3_dose` · `end_msg` · `sfx_right` `sfx_wrong`

An explanation clip waits for the chime to end, and each level stays on its card until the clip finishes.

---

## Sources

Every content claim was compared with published guidance on 10 Nov 2026, but **only the MoHFW wound-washing document was read in full**. The WHO, NCDC and dog-behaviour sources were seen in search excerpts, not read end to end. This is not "fully verified". The table in "What was checked against sources" (below) names each source and says how far I read it.

## Where the dog model comes from (and its terms)

- **Generator:** Moti's body is `Assets/GeneratedMeshes/MotiDog.glb`, made on 9 Nov 2026 with **SPECS Text-to-3D**, the text-to-3D service at `api.specs.com` (a Specs Inc. API), called through the signed-in Lens Studio session by the Claude Code `build-mesh` skill. Settings: `output_quality: balanced`; the preview and reconstruction stages were left at their default (`balanced`).
- **Job 1 (used for Moti):** job id `74291684-ef52-4ec4-a10c-5330b2b72342`, seed 3843502395. Prompt: "friendly Indian street dog (pariah dog), short tan-brown coat, medium build, standing relaxed on all four legs, ears semi-erect, tail down, realistic proportions, full body, stylized but natural look". Negative prompt: "blood, wounds, aggressive, snarling, human clothing, text, base, pedestal, ground plane".
- **Job 2:** `MotiDog2.glb`, job id `d9824f1c-837a-46d2-99ec-5fb71531ad6c`, seed 1323872683 (a leaner side-view dog; prompt: "lean Indian pariah street dog standing on all four legs, side view, ... calm friendly expression, realistic proportions, full body from nose to tail"). It is kept in the repo but not used by the Lens.
- **What we changed:** `MotiRigged.glb` is the same mesh and texture with a skeleton and skin weights added by `tools/build_moti_rig.py`, plus a gentle lightening of the dark muzzle texels. The eyelids, fangs and fur tufts are generated in code (`DogRealistic.ts`).
- **Terms:** there is no separate licence file for the generated model. The terms I found that cover Lens Studio's generative tools are Snap's [Generative Lens Tools Terms](https://www.snap.com/terms/generative-lens-tools) (effective 12 June 2024). They say generated Assets may be used "solely for the purpose of creating Lenses in Lens Studio" and may not be used or combined "on or with any other service, platform, or technology"; they do not say who owns the outputs; Snap keeps a perpetual licence to use prompts and Assets to improve its models and makes "no representations or warranties". **Those terms do not mention Spectacles, SPECS or text-to-3D, so I have not confirmed that they are the terms that govern the SPECS Text-to-3D service.** I make no claim of ownership over the generated mesh itself; the project's own work on it is the rig, the rig script and the code.
- **Other non-original assets:** the Hindi and English text uses Noto Sans Devanagari (SIL Open Font License 1.1). The UI, interaction and tween packages are Snap's `UIKit`, `InteractionKit` and `Motion` packages from the Lens Studio Asset Library.

---

## How it was tuned (and why it differs from the first brief)

- **Tween library:** Motion (installed with UI Kit), because LSTween is not in the Asset Library.
- **Dog (realistic, default):** `Assets/GeneratedMeshes/MotiRigged.glb` is the AI-generated `MotiDog.glb` with a small skeleton added by `tools/build_moti_rig.py` (soft skin weights, so parts bend without seams): `root`, `head`, `jaw`, `earL`, `earR`, `tail1`, `tail2`, `tail3`. `dog/DogRealistic.ts` drives those bones from the pose data in `DogPoses.ts` and adds three code-built attachments that follow the bones: eyelids (caps that hug the dog's own painted eyes and appear only to narrow or close them: the warning glare and sleep), upper and lower fangs that show only in the warning snarl, and a row of fur tufts along the neck and spine that grow from flat to standing. A mouth interior and tongue hide the gap when the jaw opens. The attachments use two small generated sphere meshes (about 5,500 triangles in all); the body is about 4,000. The scene object `RealisticDog` (under `DogMesh`) holds the model. Set `Config.REALISTIC_DOG` to `false` to use the shape-built dog instead.
- **Dog (fallback):** built from separate parts in code (`dog/DogRig.ts`): body, legs, head, snout, jaw and tongue, eyes, two ears, a four-segment tail and a ridge of fur along the spine. Same cues, simple stylised look. Kept behind `Config.REALISTIC_DOG`.
- **Dog cues (both versions):** relaxed (loose, soft eyes, relaxed closed mouth, gentle wag), nervous (ears pinned back, tail tucked, lip licking, yawning), warning (stiff, fur raised, high stiff tail, narrowed glare, teeth showing), barking, eating, sleeping.
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

- [x] `Config.DEMO_MODE` stays `true` for the submission (15-second wash timer and a skip button so a reviewer can finish the step). This is stated here, in the video and on the Devpost page. Set it to `false` for a real 15-minute wash and no skip button.
- [ ] Have a native speaker review every `// HI: review` line. (The content has been checked against sources: see the table below; no `VERIFY` flags are left.)
- [x] Dev helpers (`AiPreviewAgentInteract`, `Leaf` and its `LeafPlugin`) are not in this repo. `AiPreviewAgentInspect` and `Bitmoji 3D` are installed locally by Lens Studio tooling but are unused by the project and are git-ignored. The project's own packages are `InteractionKit`, `UIKit`, `Motion` and `Icons`.
- [x] `.virtual-scene.json` (generated scene snapshot) is git-ignored.
- [x] `spk_debug_key.pem` (private signing key) is git-ignored and is not in the repo. Never commit it.
- [ ] Drop in the Hindi audio and re-check that nothing is cut off.
- [ ] Replace the stand-in forearm and the primitive puppies/bowl if you want a more polished look.
- [x] `node tools/run-tests.mjs`: 30 of 30 pass.

---

## What was checked against sources (10 Nov 2026)

"Read in full" means I extracted and read the document's text. "Seen in search excerpts" means the page came up in a search and the passage I rely on was quoted there, but I did not read the page end to end. Every Hindi line still needs a native-speaker review (`// HI: review`).

| Claim in the Lens | Result | Source and how far I read it |
|---|---|---|
| Wash the wound with soap and running water | Confirmed. The wording is now "for 15 minutes", because WHO says **at least** 15 minutes and India's programme says **up to** 15 minutes, followed by a disinfectant | [MoHFW wound-washing guidance](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/169391055721.pdf) (read in full); [WHO rabies fact sheet](https://www.who.int/news-room/fact-sheets/detail/rabies) (seen in search excerpts) |
| Chilli, turmeric or oil on a bite is wrong | Confirmed: "Application of irritants such as chili, soil, oils, turmeric, lime, salt, ash, plant juice, etc. ... is strictly prohibited". The Lens now says "Never put chilli, turmeric or oil on a bite. Wash it and get the vaccine" (the earlier "can harm the wound" was not in the source) | same MoHFW document (read in full) |
| Cauterising (acid, flame, heat) is wrong | Confirmed ("strictly prohibited"); not taught in the Lens | same MoHFW document (read in full) |
| A scratch needs care too, and the vaccine should start the same day | Confirmed: WHO category II exposure includes minor scratches and needs wound washing and immediate vaccination | WHO fact sheet and WHO category summaries (seen in search excerpts) |
| Complete every dose on the doctor's dates | Confirmed in substance (WHO: a full vaccine course; the exact schedule is deliberately not taught) | WHO fact sheet (seen in search excerpts) |
| "Many painful injections in the stomach" is a myth | The old nerve-tissue vaccine was stopped in India in December 2004 and replaced by cell-culture vaccines; the standard modern route is into the upper arm (deltoid), with an intradermal option, also on the arm. I found no source that says the old course was given in the abdomen, so the Lens no longer says "not given in the stomach"; it says "That was the old vaccine, stopped in India in 2004. Today it is a few shots, usually in the arm." | NCDC 2015 National Guidelines on Rabies Prophylaxis and a published intradermal study (seen in search excerpts, not read in full); [WHO vaccine standardisation page](https://www.who.int/teams/health-product-policy-and-standards/standards-and-specifications/norms-and-standards/vaccine-standardization/rabies) |
| Level 1: tail tucked, ears back, lip licking and yawning show unease; stiff body, hard stare, raised fur and teeth show a warning | Confirmed, with a caution these guides all give: read the whole dog; teeth or raised fur alone do not always mean aggression, and raised fur is also seen in fear. "Stay away, back off slowly" is the safe reading | [ASPCA Pro](https://www.aspcapro.org/resource/canine-body-language-tips), [Best Friends](https://bestfriends.org/node/547001), [Wisconsin Humane Society](https://wihumane.org/dog-body-language) (seen in search excerpts) |
| Level 2: do not disturb a dog that is eating, sleeping or with puppies | Confirmed. The AVMA tip, read on a page that reproduces it; I did not open the AVMA's own page | [Penn State Health (AVMA tips)](https://www.pennstatehealth.org/childrens/services-treatments/trauma-program/injury-prevention-program/dog-bite), [Oklahoma State Extension](https://extension.okstate.edu/fact-sheets/canine-bite-prevention) (seen in search excerpts) |
| Level 2: if a dog runs at you, do not run or shout; stand still like a tree and look away | Confirmed | [CHOP](https://www.chop.edu/centers-programs/injury-prevention-program/dog-bite-prevention) and other bite-prevention guides (seen in search excerpts) |

Not claimed anywhere: how to tell whether a dog is rabid, a vaccine schedule or dose count, or any treatment advice beyond wash, do not use home remedies, and see a doctor the same day.

Training aid only. Not medical advice.
