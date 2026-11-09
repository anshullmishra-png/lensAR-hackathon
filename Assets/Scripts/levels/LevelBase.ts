import {Config} from "../app/Config"
import {audioQueue} from "../audio/AudioQueue"
import {Spoken, Question} from "../content/ContentTypes"
import {bus} from "../core/EventBus"
import {AnswerResultPayload, ChoiceMadePayload, Events, Phase} from "../core/Events"
import {scoreKeeper} from "../core/ScoreKeeper"
import {Log} from "../util/Log"

/** Longest a level will wait for one audio clip to finish, in seconds. */
const MAX_AUDIO_WAIT = 25

/**
 * Shared helpers for every level. Levels never touch UI or audio directly: they only
 * emit events (say / ask / evaluate), so a level script stays pure flow logic.
 * No @input here on purpose: inputs on an abstract base are not reliably inherited.
 */
export abstract class LevelBase extends BaseScriptComponent {
  protected abstract readonly phase: Phase

  /** Start this level. Must return immediately; run long flows asynchronously. */
  abstract begin(): void

  /** Tell FlowController this level is finished. */
  end(): void {
    Log.info(`${this.phase} complete`)
    bus.emit(Events.LEVEL_COMPLETE, {phase: this.phase})
  }

  /** Caption a line and, if it has a clip id, play it. */
  protected say(item: Spoken): void {
    bus.emit(Events.SHOW_CAPTION, {text: item.text})
    if (item.audioId) {
      bus.emit(Events.PLAY_AUDIO, {audioId: item.audioId})
    }
  }

  /** Show the choices and resolve with the id of the one the user pinches. */
  protected ask(question: Question): Promise<string> {
    return new Promise<string>((resolve) => {
      const handler = (p: ChoiceMadePayload): void => {
        if (p.questionId !== question.id) {
          return
        }
        bus.off(Events.CHOICE_MADE, handler)
        resolve(p.choiceId)
      }
      bus.on(Events.CHOICE_MADE, handler)
      bus.emit(Events.SET_CHOICES, {
        questionId: question.id,
        choices: question.choices.map((c) => ({id: c.id, label: c.label}))
      })
    })
  }

  /** Record the first attempt, announce the result, and return whether it was right. */
  protected evaluate(question: Question, choiceId: string): boolean {
    const picked = question.choices.find((c) => c.id === choiceId)
    const correct = !!picked && picked.correct
    scoreKeeper.record(question.id, correct)
    const result: AnswerResultPayload = {questionId: question.id, correct, explanation: question.explanation}
    bus.emit(Events.ANSWER_RESULT, result)
    return correct
  }

  /**
   * After an answer: queue the explanation clip behind the chime, then stay on the card until the
   * feedback time has passed AND the audio has finished (never longer than MAX_AUDIO_WAIT).
   * With no recordings yet the audio is "idle" at once, so this is just the feedback time.
   */
  protected async settle(explanationAudioId: string): Promise<void> {
    bus.emit(Events.PLAY_AUDIO, {audioId: explanationAudioId, queue: true})
    await Promise.all([
      this.wait(Config.FEEDBACK_SECONDS + 0.3),
      Promise.race([audioQueue.whenIdle(), this.wait(MAX_AUDIO_WAIT)])
    ])
  }

  protected wait(seconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const ev = this.createEvent("DelayedCallbackEvent")
      ev.bind(() => resolve())
      ev.reset(seconds)
    })
  }
}
