/** Constants only. Distances are in centimetres (Lens Studio world units). */
export const Config = {
  /** true = wash timer runs 15 s instead of 15 min, and the skip button is allowed. */
  DEMO_MODE: true,

  /** TEMPORARY test aid: answers every prompt automatically so every scene can be seen. Must be false when shipping. */
  AUTOPLAY: false,
  AUTOPLAY_DELAY: 4,
  /** TEMPORARY: jump straight to a level while AUTOPLAY is on ("LEVEL3"), or "" for a full run. */
  AUTOPLAY_START_AT: "",

  LANGUAGE_PRIMARY: "hi",
  LANGUAGE_SECONDARY: "en",

  /** true = the dog built from parts (ears, tail, jaw, fur move); false = the old single static mesh. */
  RIG_DOG: true,
  /** true = the realistic skinned dog (needs the "RealisticDog" object in the scene); false = the shape-built dog (fallback). */
  REALISTIC_DOG: true,
  /** The articulated dog is turned this many degrees so he is seen at an angle and his tail and ears show. */
  DOG_VIEW_YAW_DEG: -32,
  /** Size of the articulated dog relative to a 55 cm dog. */
  DOG_SCALE: 0.9,
  DOG_DISTANCE: 280,
  /** While the "signs to look for" dots are shown, Moti turns toward the viewer and grows by this factor (about his feet). */
  DOG_FOCUS_SCALE: 1.3,
  /** How many degrees he turns toward the viewer in that moment (his resting turn is DOG_VIEW_YAW_DEG). */
  DOG_FOCUS_YAW_DEG: 24,
  /** Dragging Moti turns him: degrees of turn per centimetre the hand (or mouse) moves. Tune this in the preview. */
  DOG_SPIN_DEG_PER_CM: 5,
  /** Side of the invisible box you grab to turn him, cm. */
  DOG_GRAB_SIZE_CM: 64,
  /** The legend next to Moti (header and rows), cm above the floor. Its top must stay inside the view (Layout.test.ts checks it). */
  CALLOUT_HEADER_Y: 150,
  CALLOUT_FIRST_ROW_Y: 134,
  CALLOUT_ROW_STEP: 12,
  /** The Lens only renders into a narrow band, about 27 deg wide x 36 deg tall (measured in the preview). The panels sit
   *  slightly left of centre and Moti stands in the free space on the right, turned so his ears and tail show. */
  DOG_SIDE: 43,
  UI_DISTANCE: 150,
  /** Multiplies every text size (see addText). The view is only ~36 deg tall, so text must be big to read. */
  TEXT_SCALE: 1.9,
  /** Panels sit 12 cm left of centre (negative = left) to leave room for Moti on the right; more than ~14 pushes the card out of the view. */
  UI_SIDE_OFFSET: -12,
  /** Panels are centred on eye level: the preview view is only about +/-18 deg tall, and the stack is ~65 cm high. */
  UI_EYE_DROP: 2,

  /** Real size of the dog, used by the layout test (cards must never cover it). */
  DOG_HEIGHT: 60,
  /** Smallest gap, in degrees, between the bottom of any panel and the top of the dog. */
  MIN_DOG_CLEARANCE_DEG: 2,

  /** Vertical position of each panel inside the UI anchor, cm (0 = anchor centre). AppRoot applies these. */
  UI_Y: {progress: 29, card: 9, choices: -12, feedback: -19, captions: 41, dose: 9, end: -3},
  /** No floor query exists in the preview, so the floor is a fixed drop below the camera. */
  EYE_TO_FLOOR: 72,

  /** Where the forearm lies: straight ahead and well below eye level, under the panels. The view is
   *  narrow, so it must be near the centre line to stay in frame. */
  ARM_DISTANCE: 85,
  ARM_SIDE: -8,
  ARM_DROP: 22,
  ARM_SCALE: 0.75,

  /** Dose card calendar slots. Blank on purpose: no numbers, no dates. The count is NOT a dose count. */
  DOSE_SLOTS: 6,

  FEEDBACK_SECONDS: 3,
  WASH_SECONDS_REAL: 900,
  WASH_SECONDS_DEMO: 15,

  /** Text sizes (Lens Studio Text.size units). Hindi is larger because Devanagari reads smaller. */
  SIZE_TITLE_HI: 56,
  SIZE_BODY_HI: 44,
  SIZE_EN: 40,
  SIZE_BUTTON: 38,

  /** Layout, cm. */
  CARD_W: 42,
  CARD_H: 30,
  FEEDBACK_H: 24,
  DOSE_H: 32,
  END_H: 54,
  BUTTON_W: 30,
  BUTTON_H: 9,
  /** Taller buttons for the long Level 2 answers. */
  BUTTON_LONG_H: 10.5,
  BUTTON_GAP: 1.2
}
