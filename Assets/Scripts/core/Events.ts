import type {ChoiceOption, LocalText} from "../content/ContentTypes"

export enum Phase {
  ONBOARDING = "ONBOARDING",
  LEVEL1 = "LEVEL1",
  LEVEL2 = "LEVEL2",
  LEVEL3 = "LEVEL3",
  END = "END"
}

/**
 * Every event name in one place. SET_CHOICES / CLEAR_CHOICES are additions to the
 * original list: they let levels talk to ChoiceButtons without holding a reference.
 */
export const Events = {
  LEVEL_START: "LEVEL_START",
  LEVEL_COMPLETE: "LEVEL_COMPLETE",
  SET_CHOICES: "SET_CHOICES",
  CLEAR_CHOICES: "CLEAR_CHOICES",
  CHOICE_MADE: "CHOICE_MADE",
  ANSWER_RESULT: "ANSWER_RESULT",
  SHOW_CARD: "SHOW_CARD",
  HIDE_CARD: "HIDE_CARD",
  SHOW_CAPTION: "SHOW_CAPTION",
  PLAY_AUDIO: "PLAY_AUDIO",
  STOP_AUDIO: "STOP_AUDIO",
  DOG_SET_POSE: "DOG_SET_POSE",
  DOG_VISIBLE: "DOG_VISIBLE",
  SHOW_DOSE: "SHOW_DOSE",
  HIDE_DOSE: "HIDE_DOSE",
  ARM_SHOW: "ARM_SHOW",
  ARM_HIDE: "ARM_HIDE",
  WASH_TIMER_START: "WASH_TIMER_START",
  WASH_TIMER_DONE: "WASH_TIMER_DONE",
  SCORE_CHANGED: "SCORE_CHANGED",
  GAME_COMPLETE: "GAME_COMPLETE",
  RESTART: "RESTART"
} as const

export type EventName = (typeof Events)[keyof typeof Events]

export interface LevelPayload {
  phase: Phase
}
export interface SetChoicesPayload {
  questionId: string
  choices: ChoiceOption[]
}
export interface ChoiceMadePayload {
  questionId: string
  choiceId: string
}
export interface AnswerResultPayload {
  questionId: string
  correct: boolean
  explanation: LocalText
}
export interface ShowCardPayload {
  title: LocalText
  body?: LocalText
}
export interface ShowCaptionPayload {
  text: LocalText
}
export interface PlayAudioPayload {
  audioId: string
  /** true = wait for the clip that is playing (e.g. an explanation after the chime). Default: interrupt it. */
  queue?: boolean
}
export interface SetPosePayload {
  pose: string
  /** Props to show next to the dog (bowl, puppies, bark). Omitted = none. */
  props?: string[]
}
export interface DogVisiblePayload {
  visible: boolean
}
export interface ScorePayload {
  correct: number
  total: number
}
