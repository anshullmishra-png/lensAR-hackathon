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

  DOG_DISTANCE: 340,
  /** The Lens only renders into a narrow band, about 27 deg wide x 36 deg tall (measured in the preview). The panels
   *  fill the middle, so the dog is small and far, in the free lower-right corner: right of the buttons, below the card. */
  DOG_SIDE: 62,
  UI_DISTANCE: 150,
  /** Multiplies every text size (see addText). The view is only ~36 deg tall, so text must be big to read. */
  TEXT_SCALE: 1.9,
  /** Panels are centred: any sideways offset pushes the 42 cm card out of the ~27 deg wide view. */
  UI_SIDE_OFFSET: 0,
  /** Panels are centred on eye level: the preview view is only about +/-18 deg tall, and the stack is ~65 cm high. */
  UI_EYE_DROP: 2,

  /** Real size of the dog, used by the layout test (cards must never cover it). */
  DOG_HEIGHT: 60,
  /** Smallest gap, in degrees, between the bottom of any panel and the top of the dog. */
  MIN_DOG_CLEARANCE_DEG: 2,

  /** Vertical position of each panel inside the UI anchor, cm (0 = anchor centre). AppRoot applies these. */
  UI_Y: {progress: 29, card: 9, choices: -12, feedback: -19, captions: 41, dose: 9, end: -3},
  /** No floor query exists in the preview, so the floor is a fixed drop below the camera. */
  EYE_TO_FLOOR: 90,

  /** Where the forearm lies: straight ahead and well below eye level, under the panels. The view is
   *  narrow, so it must be near the centre line to stay in frame. */
  ARM_DISTANCE: 85,
  ARM_SIDE: 0,
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
  SIZE_EN: 34,
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
