# Build Prompt: "Read the Dog" — a SPECS Lens

> Paste this whole file into Claude Code (with the CLAD plugin and the Lens Studio MCP connected, started inside the Lens Studio project folder). Build **one gate at a time** and stop after each gate so I can test in the Lens Studio preview.

---

## 0. Your role and ground rules

You are building a Lens for Snap SPECS in Lens Studio using CLAD and the Lens Studio MCP. It must run in the **Lens Studio preview** (no glasses).

Rules you must follow:

1. **Start from the Spectacles Base Template** (it ships with the Spectacles Interaction Kit, SIK). Use **SIK** for input, the **Spectacles UI Kit** for buttons and panels if it is installed, and **LSTween** for animation. Install from the Asset Library if missing.
2. **Do not invent APIs.** Before writing code against SIK, UI Kit, LSTween, AudioComponent or Lens Studio scripting APIs, check the docs or inspect the installed package through the MCP. If something does not exist, tell me instead of guessing.
3. **TypeScript, one responsibility per file.** Every file listed in section 4 is its own script. No file over ~150 lines. Scripts talk to each other through `EventBus` or explicit `@input` references, never through global lookups by name.
4. **All text, audio IDs and answers live in `Content.ts`.** No user-facing string anywhere else. I must be able to fix a fact or a translation without touching logic.
5. **No camera frames, no ML, no cloud services, no speech input.** Pinch and poke only.
6. **Medical safety:** the Lens never judges whether a dog is rabid, never gives vaccine schedules or dose counts, and always sends a bitten person to a health centre. Only use the first-aid text in `Content.ts`. Every item marked `VERIFY` is unconfirmed; leave the flag in place.
7. **Missing assets must not crash anything.** If an audio clip or model is missing, log a warning and continue with captions only.
8. **After each gate:** list the files you created or changed, what I should click in the preview to test it, and anything you could not verify.

---

## 1. What the Lens is

**One-liner:** Learn to read a dog before it bites, and know exactly what to do if it does.

**User:** children, families and community health workers in Indian towns and villages.

**Flow:**

```
Onboarding  ->  Level 1: Read the signals  ->  Level 2: What do you do?
            ->  Level 3: If you are bitten  ->  End screen (score)
```

- A life-size 3D street dog ("Moti") stands on the floor about 1.5 m in front of the user and turns its head toward the user.
- Level 1: Moti shows a body-language state; the user tags it Relaxed / Nervous / Warning.
- Level 2: four scenarios; the user picks how to behave.
- Level 3: a stylised bite (no blood) on a 3D forearm; guided first aid, myth cards, wash timer, "complete every dose" card.
- Every line has English + Hindi captions and an optional pre-recorded Hindi audio clip.
- Tone: pet-friendly. Wrong answers are explained kindly, never as a scare.

---

## 2. Scene hierarchy to create

```
Scene
├── Camera (from template, leave as is)
├── SIK (from template)
├── App                      [AppRoot.ts]
│   ├── Systems
│   │   ├── EventBus         [EventBus.ts]
│   │   ├── GameState        [GameState.ts]
│   │   ├── ScoreKeeper      [ScoreKeeper.ts]
│   │   ├── AudioManager     [AudioManager.ts]  (+ AudioComponent)
│   │   └── FlowController   [FlowController.ts]
│   ├── World
│   │   ├── DogRoot          [DogPlacement.ts, DogLookAt.ts, DogController.ts]
│   │   │   └── DogModel     (Asset Library dog, or fallback card)
│   │   └── ArmRoot          [ArmPlacement.ts]
│   │       ├── ArmModel
│   │       ├── BiteMarker   [BiteMarker.ts]
│   │       └── WashTimer    [WashTimer.ts]
│   └── UI
│       ├── MainCard         [CardPanel.ts]
│       ├── Choices          [ChoiceButtons.ts]
│       ├── Feedback         [FeedbackDisplay.ts]
│       ├── Captions         [CaptionBar.ts]
│       ├── Progress         [ProgressIndicator.ts]
│       ├── DoseCalendar     [DoseCalendarCard.ts]
│       └── EndScreen        [EndScreen.ts]
└── Levels
    ├── Onboarding           [OnboardingLevel.ts]
    ├── Level1               [Level1ReadSignals.ts]
    ├── Level2               [Level2WhatToDo.ts]
    └── Level3               [Level3FirstAid.ts]
```

UI panels float about 1.2 m in front of the user, slightly to the right of the dog, at eye level, and follow the user loosely (lazy follow is fine; do not hard-lock to the head).

---

## 3. Folder layout

```
Assets/Scripts/
  app/        AppRoot.ts, Config.ts
  core/       EventBus.ts, Events.ts, GameState.ts, ScoreKeeper.ts, FlowController.ts
  content/    Content.ts, ContentTypes.ts, ContentValidator.ts
  audio/      AudioManager.ts
  dog/        DogPlacement.ts, DogLookAt.ts, DogController.ts, DogPoses.ts
  arm/        ArmPlacement.ts, BiteMarker.ts, WashTimer.ts
  ui/         CardPanel.ts, ChoiceButtons.ts, FeedbackDisplay.ts, CaptionBar.ts,
              ProgressIndicator.ts, DoseCalendarCard.ts, EndScreen.ts
  levels/     LevelBase.ts, OnboardingLevel.ts, Level1ReadSignals.ts,
              Level2WhatToDo.ts, Level3FirstAid.ts
  util/       TweenHelpers.ts, Log.ts
  tests/      GameState.test.ts, ScoreKeeper.test.ts, ContentValidator.test.ts
Assets/Audio/    (I will add Hindi MP3s named by audio ID, e.g. l1_intro.mp3)
```

---

## 4. Every file and what it does

### app/

**`Config.ts`** — constants only, no logic.
- `DEMO_MODE: boolean` (true = wash timer runs 15 s instead of 15 min, shorter pauses).
- `LANGUAGE_PRIMARY = "hi"`, `LANGUAGE_SECONDARY = "en"`.
- Distances in cm: `DOG_DISTANCE = 150`, `UI_DISTANCE = 120`, `UI_SIDE_OFFSET = 35`.
- `FEEDBACK_SECONDS = 3`, `WASH_SECONDS_REAL = 900`, `WASH_SECONDS_DEMO = 15`.

**`AppRoot.ts`** — entry point.
- `onAwake()`: checks every required `@input` is assigned (log a clear error naming the missing one), runs `ContentValidator.validate(Content)`, then tells `FlowController` to start.

### core/

**`Events.ts`** — string constants for every event name, plus payload types. Events:
`LEVEL_START`, `LEVEL_COMPLETE`, `CHOICE_MADE`, `ANSWER_RESULT`, `SHOW_CARD`, `HIDE_CARD`, `SHOW_CAPTION`, `PLAY_AUDIO`, `STOP_AUDIO`, `DOG_SET_POSE`, `ARM_SHOW`, `ARM_HIDE`, `WASH_TIMER_START`, `WASH_TIMER_DONE`, `SCORE_CHANGED`, `GAME_COMPLETE`, `RESTART`.

**`EventBus.ts`** — minimal publish/subscribe.
- `on(event, handler)`, `off(event, handler)`, `emit(event, payload?)`.
- A handler that throws must not stop other handlers (catch and log).

**`GameState.ts`** — pure state machine, no scene objects.
- States: `ONBOARDING -> LEVEL1 -> LEVEL2 -> LEVEL3 -> END`.
- `current()`, `next()`, `reset()`, `canAdvance()`.
- Emits `LEVEL_START` on every transition. Rejects illegal transitions (e.g. END -> LEVEL2) with a logged warning.

**`ScoreKeeper.ts`** — pure scoring, no scene objects.
- `record(questionId, correct)`: one record per question, first attempt only.
- `total()`, `correctCount()`, `perLevel()`, `reset()`.
- Emits `SCORE_CHANGED`.

**`FlowController.ts`** — orchestrator.
- `start()`: enables the level object for `GameState.current()`, disables the others, calls `level.begin()`.
- Listens for `LEVEL_COMPLETE` -> `GameState.next()` -> starts the next level.
- Listens for `RESTART` -> resets `GameState` and `ScoreKeeper`, starts onboarding.

### content/

**`ContentTypes.ts`** — TypeScript interfaces: `LocalText {en, hi}`, `Signal`, `DogState`, `Scenario`, `Choice`, `FirstAidStep`, `Myth`, `LevelContent`.

**`Content.ts`** — **all** content (see section 5). Exported as one object.

**`ContentValidator.ts`** — `validate(content): string[]` returns a list of problems:
- every question has exactly one correct choice;
- every text has both `en` and `hi` (a `hi` of `"TODO"` is a warning, not an error);
- every `audioId` is unique;
- every dog pose name exists in `DogPoses.ts`.
`AppRoot` logs the problems; it does not block the Lens.

### audio/

**`AudioManager.ts`**
- `@input` list of audio tracks; builds a map from file name (without extension) to track.
- `play(audioId)`: stops whatever is playing, plays the clip. If missing, logs once and returns.
- `stop()`, `isPlaying()`.
- Listens to `PLAY_AUDIO` and `STOP_AUDIO`.

### dog/

**`DogPlacement.ts`**
- `placeInFrontOfUser()`: puts `DogRoot` on the floor `DOG_DISTANCE` in front of the camera's current forward direction (flattened to horizontal), facing the user. Use the template's floor height or a fixed offset below the camera if no floor is available in the preview (state which you used).
- Called once at onboarding and again on restart.

**`DogLookAt.ts`**
- Every frame, rotates the dog's head bone (or whole model if no head bone) toward the camera **around the vertical axis only**, clamped to ±60°, smoothed.
- `setEnabled(bool)` so it can be turned off for poses like sleeping.

**`DogPoses.ts`** — data describing each pose as tween targets, no logic:
`relaxed`, `nervous`, `warning`, `eating`, `sleeping`, `with_puppies`, `barking`.
For each: tail rotation, head pitch, ear rotation, body height scale, and optional animation clip name if the model has one.

**`DogController.ts`**
- `setPose(poseName)`: if the model has a matching animation clip, play it; otherwise tween the named parts to the values in `DogPoses.ts` over 0.4 s. Tail wag for `relaxed` is a looping tween.
- `showProp(name, visible)`: food bowl, puppies (simple small models or cards), "bark" sound-wave icon.
- Listens to `DOG_SET_POSE`.
- **Fallback:** if `@input useCardFallback` is true, swaps a life-size image card instead of tweening (one texture per pose).

### arm/

**`ArmPlacement.ts`** — `show()` / `hide()` the forearm on a virtual table surface in front of the user, with a short scale-in tween. Listens to `ARM_SHOW` / `ARM_HIDE`.

**`BiteMarker.ts`** — stylised bite: two small marks plus a soft pulsing ring (no blood). `pulse(on)`, `setState("fresh" | "washing" | "clean")` changes the ring style.

**`WashTimer.ts`**
- `start()`: circular countdown ring anchored above the bite, plus a falling-water particle or simple animated streaks.
- Duration from `Config` (`DEMO_MODE` -> 15 s). Shows remaining time as text.
- Emits `WASH_TIMER_DONE` at zero. `skip()` exists for the demo but is hidden behind `DEMO_MODE`.

### ui/

**`CardPanel.ts`** — the main floating card.
- `show(title: LocalText, body: LocalText, icon?)`, `hide()`.
- Shows Hindi as the main text and English underneath, smaller. Fade/scale tween in and out.
- Listens to `SHOW_CARD` / `HIDE_CARD`.

**`ChoiceButtons.ts`**
- `setChoices(choices: Choice[])`: creates up to 3 large pinchable buttons (UI Kit button if available, else a SIK Interactable with a collider). Labels in Hindi + English.
- On pinch: disables all buttons, emits `CHOICE_MADE {questionId, choiceId}`.
- `clear()`.
- Buttons must be big enough to hit easily in the preview.

**`FeedbackDisplay.ts`**
- Listens to `ANSWER_RESULT {correct, explanation}`.
- Shows a ✓ or ✗ **shape** and the words "Right" / "Not quite" (never colour alone), plus the explanation. Plays a soft chime (correct) or a neutral tone (wrong). Auto-hides after `FEEDBACK_SECONDS`.

**`CaptionBar.ts`** — one line of captions near the bottom of the view, Hindi above English. Listens to `SHOW_CAPTION`. Clears when the audio stops or after a timeout.

**`ProgressIndicator.ts`** — dots for the current level's questions plus "Level 1 of 3". Updates on `LEVEL_START` and `ANSWER_RESULT`.

**`DoseCalendarCard.ts`** — a calendar-style card with several dose slots and the text from `Content.level3.doseCard`. **No specific days or dose counts.** Slots tick on one by one as an animation only.

**`EndScreen.ts`** — score (`correctCount / total`), one-line message per level, the closing message, and a "Play again" button that emits `RESTART`.

### levels/

**`LevelBase.ts`** — abstract base.
- `begin()`, `end()` (emits `LEVEL_COMPLETE`), helpers `say(textItem)` = emit `SHOW_CAPTION` + `PLAY_AUDIO`, and `ask(question)` = set choices and await `CHOICE_MADE`.
- `evaluate(question, choiceId)`: records the score, emits `ANSWER_RESULT` with the explanation.

**`OnboardingLevel.ts`**
- Places the dog, plays the intro line, shows the intro card, shows one "Start" button. On pinch -> `end()`.

**`Level1ReadSignals.ts`**
- For each item in `Content.level1.items`: set the dog pose, highlight the body part (optional), `ask` "How is Moti feeling?" with Relaxed / Nervous / Warning, show feedback listing the signals for that state.
- After the last item -> `end()`.

**`Level2WhatToDo.ts`**
- For each scenario: set pose and props, narrate the situation, `ask` the choices, show feedback.
- After the last scenario -> `end()`.

**`Level3FirstAid.ts`**
- Hide the dog (or move it aside), `ARM_SHOW`, bite marker pulses.
- Step 1: narrate "wash" -> start `WashTimer` -> wait for `WASH_TIMER_DONE`.
- Step 2: myth cards — each myth is a Myth/Fact question through `ask`.
- Step 3: "go to the health centre today" card.
- Step 4: dose calendar card.
- Then `ARM_HIDE` -> `end()`.

### util/

**`TweenHelpers.ts`** — thin wrappers over LSTween: `fadeIn`, `fadeOut`, `scaleIn`, `rotateTo`, `loopRotate`. Nothing else may call LSTween directly.

**`Log.ts`** — `info`, `warn`, `error` with a `[ReadTheDog]` prefix, and `warnOnce(key, msg)`.

### tests/

Pure logic only (no scene). If the hackathon's LEAF testing tool fits, use it; otherwise write plain TypeScript tests and tell me how to run them.
- **`GameState.test.ts`** — full forward path; illegal transitions rejected; reset returns to ONBOARDING.
- **`ScoreKeeper.test.ts`** — only the first attempt counts; totals per level; reset.
- **`ContentValidator.test.ts`** — the real `Content` passes with no errors; a broken sample (two correct answers, missing `hi`) is caught.

---

## 5. Content for `Content.ts`

Use exactly this content. Keep the `VERIFY` flags as comments. Hindi lines are drafts for native-speaker review.

### Onboarding
- `intro` — EN: "This is Moti. Dogs talk with their bodies. Let's learn to listen." / HI: "यह मोती है। कुत्ते अपने शरीर से बात करते हैं। चलो, सुनना सीखें।" / audio `onb_intro`
- Button: EN "Start" / HI "शुरू करें"

### Level 1 — Read the signals
Question for every item: EN "How is Moti feeling?" / HI "मोती कैसा महसूस कर रहा है?"
Choices: Relaxed / शांत · Nervous / घबराया हुआ · Warning / चेतावनी

| id | pose | correct | explanation (EN) | VERIFY |
|---|---|---|---|---|
| l1_a | relaxed | Relaxed | Loose body, soft eyes, open mouth and a gentle wag mean Moti is calm. | signals vs vet/animal-welfare source |
| l1_b | nervous | Nervous | Tail tucked, ears back, lip licking and yawning mean Moti is uneasy. Give space. | same |
| l1_c | warning | Warning | Stiff body, hard stare, raised fur and showing teeth mean "stay away". Back off slowly. | same |

Hindi explanations: write drafts, mark `// HI: review`.

### Level 2 — What do you do?

| id | pose + props | situation (EN) | choices (correct marked *) | explanation (EN) |
|---|---|---|---|---|
| l2_eat | eating + bowl | Moti is eating. | Pet him · *Walk past calmly, leave him alone · Move his food | Dogs can guard food. Let them eat in peace. |
| l2_pups | with_puppies | Moti is with her puppies. | Go see the puppies · *Keep your distance and walk away calmly | Mothers protect puppies. Admire them from far away. |
| l2_sleep | sleeping | Moti is asleep. | Wake him up to play · *Let him sleep and stay away | A startled dog may bite. Never wake a sleeping dog. |
| l2_bark | barking | Moti barks and comes toward you. | Run away · *Stand still, don't stare, then back away slowly · Shout and wave | Running makes dogs chase. Stand still like a tree, look away, then move off slowly. |

`VERIFY`: all four against a recognised dog-bite-prevention source.

### Level 3 — If you are bitten
Intro: EN "If a dog bites or scratches you, act fast. Rabies can be prevented, but not cured." / HI "अगर कुत्ता काटे या खरोंचे, तो तुरंत कदम उठाएँ। रेबीज़ से बचा जा सकता है, पर इलाज नहीं।" — `VERIFY`

Steps (`VERIFY` all against India's National Rabies Control Programme guidance or WHO):
1. `l3_wash` — EN "Wash the wound right away with soap and running water for about 15 minutes." / HI "घाव को तुरंत साबुन और बहते पानी से लगभग 15 मिनट तक धोएँ।" -> starts WashTimer.
2. Myths (Myth / Fact buttons; HI: मिथक / सच):
   - `m_remedy` — "Put chilli, turmeric or oil on the bite." -> **Myth**. "Home remedies don't stop rabies and can harm the wound."
   - `m_scratch` — "A small scratch doesn't need a doctor." -> **Myth**. "Even scratches need to be checked at a health centre the same day."
   - `m_stomach` — "Rabies vaccine means many painful injections in the stomach." -> **Myth**. "Modern rabies vaccines are not given in the stomach. Don't let fear stop you." — `VERIFY`
3. `l3_go` — EN "Go to the nearest health centre today for the anti-rabies vaccine." / HI "आज ही नज़दीकी स्वास्थ्य केंद्र जाकर रेबीज़ का टीका लगवाएँ।"
4. `doseCard` — EN "Complete every dose on the dates the doctor gives. Never skip one." / HI "डॉक्टर की बताई हर तारीख़ पर हर डोज़ पूरी करें। एक भी न छोड़ें।"

### End screen
- EN "Be kind to dogs. Vaccinate pet dogs. Never skip a dose." / HI "कुत्तों से प्यार करें। पालतू कुत्तों को टीका लगवाएँ। कोई डोज़ न छोड़ें।"
- Footer: EN "Training aid only. Not medical advice." / HI "केवल प्रशिक्षण के लिए। चिकित्सा सलाह नहीं।"
- Button: "Play again" / "फिर से खेलें"

Audio IDs: use the item id (e.g. `l2_bark`, `m_scratch`). I will drop MP3s with those names into `Assets/Audio/`.

---

## 6. Build gates (stop after each and wait for me)

**Gate 0 — Check the toolchain and assets (15 min)**
- Confirm the project is a Spectacles project with SIK; install UI Kit and LSTween if missing.
- Search the Asset Library for a dog model (ideally with idle animations and separate tail/head parts) and a forearm or hand model. Report what you found. If no usable dog, set `useCardFallback = true` and tell me.
- Confirm one pinch on a test button works in the preview.

**Gate 1 — One question end to end**
- `Config`, `Log`, `EventBus`, `Events`, `GameState`, `ScoreKeeper`, `ContentTypes`, `Content` (Level 1 only), `AudioManager`, `TweenHelpers`, `DogPlacement`, `DogLookAt`, `DogController` (relaxed/nervous/warning), `CardPanel`, `ChoiceButtons`, `FeedbackDisplay`, `CaptionBar`, `LevelBase`, `Level1ReadSignals` (first item only), `FlowController`, `AppRoot`.
- Test: dog appears on the floor, question shows, pinch an answer, feedback appears.

**Gate 2 — Levels 1 and 2 complete**
- All Level 1 items, `DogPoses` for every pose, props, `Level2WhatToDo`, `ProgressIndicator`, `OnboardingLevel`.

**Gate 3 — Level 3 and the end screen**
- `ArmPlacement`, `BiteMarker`, `WashTimer`, `DoseCalendarCard`, `Level3FirstAid`, `EndScreen`, restart.

**Gate 4 — Polish and proof**
- `ContentValidator` + all three tests passing.
- Timing pass (no overlapping audio, cards never cover the dog).
- A `README.md` section listing each script and its job, the sources to cite, and how to run the tests.

---

## 7. Definition of done

- Runs end to end in the Lens Studio preview: onboarding -> L1 -> L2 -> L3 -> end -> play again, with no errors in the Logger.
- Every user-facing string comes from `Content.ts`, in Hindi and English.
- Missing audio does not break anything.
- Feedback never relies on colour alone.
- Tests pass and the README explains how to run them.
- All `VERIFY` items are still flagged so I can confirm them against sources before recording the video.
