/** Every user-facing string is a LocalText. Hindi lines are drafts for native-speaker review. */
export interface LocalText {
  en: string
  hi: string
}

/** Something that is shown as a caption and may have a recorded Hindi clip (file name = audioId). */
export interface Spoken {
  text: LocalText
  audioId?: string
}

export interface ChoiceOption {
  id: string
  label: LocalText
}

export interface Choice extends ChoiceOption {
  correct: boolean
}

/** What LevelBase.ask()/evaluate() work with. */
export interface Question {
  id: string
  choices: Choice[]
  explanation: LocalText
  audioId?: string
}

export interface Signal {
  id: string
  text: LocalText
}

/** Level 1 item: the dog shows one body-language state. */
export interface DogState {
  id: string
  pose: string
  /** id of the correct ChoiceOption in Level1Content.choices */
  answer: string
  explanation: LocalText
  signals?: Signal[]
}

/** Level 2 item: a situation and what to do. */
export interface Scenario {
  id: string
  pose: string
  props?: string[]
  situation: LocalText
  choices: Choice[]
  explanation: LocalText
}

export interface FirstAidStep {
  /** Also the audio id of the recorded line. */
  id: string
  title: LocalText
  text: LocalText
}

export interface Myth {
  id: string
  claim: LocalText
  isMyth: boolean
  explanation: LocalText
}

export interface Level3Content {
  title: LocalText
  intro: Spoken
  wash: FirstAidStep
  mythPrompt: LocalText
  mythLabel: LocalText
  factLabel: LocalText
  myths: Myth[]
  go: FirstAidStep
  /** The dose card. Text only: no dates and no dose counts. */
  dose: FirstAidStep
}

export interface EndContent {
  title: LocalText
  scoreLabel: LocalText
  /** One line per level (index 0 = Level 1). */
  levelLines: LocalText[]
  closing: Spoken
  footer: LocalText
  playAgain: LocalText
}

export interface LevelContent<T> {
  prompt: LocalText
  hint?: LocalText
  items: T[]
}

export interface Level1Content extends LevelContent<DogState> {
  choices: ChoiceOption[]
}

export interface UiStrings {
  right: LocalText
  notQuite: LocalText
  /** Template with {n} and {total}, e.g. "Level {n} of {total}". */
  levelOf: LocalText
  next: LocalText
  /** Label of the demo-only skip button on the wash timer (only shown when DEMO_MODE is on). */
  skipDemo: LocalText
}

export interface OnboardingContent {
  title: LocalText
  intro: Spoken
  start: LocalText
}

export interface ContentRoot {
  ui: UiStrings
  onboarding: OnboardingContent
  level1: Level1Content
  level2: LevelContent<Scenario>
  level3: Level3Content
  end: EndContent
}
