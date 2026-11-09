import {Config} from "../app/Config"
import {bus} from "../core/EventBus"
import {Events, SetChoicesPayload} from "../core/Events"
import {Log} from "../util/Log"

/**
 * TEMPORARY test aid (Config.AUTOPLAY). Answers every prompt after a delay so the whole flow can be
 * stepped through unattended in the preview. Alternates the first and last choice so both the
 * "right" and "wrong" feedback show up. Logs a one-line marker for every step so screenshots can be
 * matched to scenes.
 */
export function installAutoPlay(host: BaseScriptComponent): void {
  let step = 0
  const mark = (what: string): void => Log.info(`[AUTOPLAY] t=${getTime().toFixed(1)} ${what}`)

  bus.on(Events.SET_CHOICES, (p: SetChoicesPayload) => {
    const n = p.choices.length
    const pick = p.choices[step % 2 === 0 ? 0 : n - 1]
    step++
    mark(`PROMPT ${p.questionId} choices=[${p.choices.map((c) => c.id).join(",")}] will pick ${pick.id} in ${Config.AUTOPLAY_DELAY}s`)
    const ev = host.createEvent("DelayedCallbackEvent")
    ev.bind(() => {
      mark(`PICK ${p.questionId} -> ${pick.id}`)
      bus.emit(Events.CHOICE_MADE, {questionId: p.questionId, choiceId: pick.id})
    })
    ev.reset(Config.AUTOPLAY_DELAY)
  })

  const watched = [
    Events.SHOW_CARD, Events.HIDE_CARD, Events.SHOW_DOSE, Events.HIDE_DOSE, Events.ARM_SHOW, Events.ARM_HIDE,
    Events.WASH_TIMER_START, Events.WASH_TIMER_DONE, Events.ANSWER_RESULT, Events.DOG_VISIBLE, Events.DOG_SET_POSE,
    Events.LEVEL_COMPLETE, Events.GAME_COMPLETE
  ]
  watched.forEach((name) => bus.on(name, () => mark(name)))
}
