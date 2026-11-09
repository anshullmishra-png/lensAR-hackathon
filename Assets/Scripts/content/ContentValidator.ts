import {hasPose, hasProp} from "../dog/DogPoses"
import type {ContentRoot, LocalText} from "./ContentTypes"

/**
 * Returns a list of problems. "ERROR: ..." must be fixed; "WARN: ..." is allowed
 * (e.g. a Hindi line that is still "TODO"). AppRoot logs these and never blocks the Lens.
 */
export function validate(content: ContentRoot): string[] {
  const out: string[] = []

  const checkText = (path: string, t: LocalText | undefined): void => {
    if (!t) {
      out.push(`ERROR: ${path} is missing`)
      return
    }
    if (!t.en || t.en.trim() === "") {
      out.push(`ERROR: ${path}.en is empty`)
    }
    if (!t.hi || t.hi.trim() === "") {
      out.push(`ERROR: ${path}.hi is empty`)
    } else if (t.hi.trim() === "TODO") {
      out.push(`WARN: ${path}.hi is still TODO`)
    }
  }

  const audioIds = new Map<string, string>()
  const checkAudio = (path: string, id: string | undefined): void => {
    if (!id) {
      return
    }
    const prior = audioIds.get(id)
    if (prior) {
      out.push(`ERROR: audioId "${id}" used twice (${prior} and ${path})`)
    } else {
      audioIds.set(id, path)
    }
  }

  checkText("ui.right", content.ui.right)
  checkText("ui.notQuite", content.ui.notQuite)
  checkText("ui.levelOf", content.ui.levelOf)
  checkText("ui.next", content.ui.next)
  checkText("ui.skipDemo", content.ui.skipDemo)
  checkText("onboarding.title", content.onboarding.title)
  checkText("onboarding.intro.text", content.onboarding.intro.text)
  checkText("onboarding.start", content.onboarding.start)
  checkAudio("onboarding.intro", content.onboarding.intro.audioId)

  const l1 = content.level1
  checkText("level1.prompt", l1.prompt)
  if (l1.hint) {
    checkText("level1.hint", l1.hint)
  }
  l1.choices.forEach((c) => checkText(`level1.choices.${c.id}.label`, c.label))
  l1.items.forEach((item) => {
    const where = `level1.items.${item.id}`
    checkText(`${where}.explanation`, item.explanation)
    checkAudio(where, item.id)
    if (!hasPose(item.pose)) {
      out.push(`ERROR: ${where} uses unknown dog pose "${item.pose}"`)
    }
    const matches = l1.choices.filter((c) => c.id === item.answer).length
    if (matches !== 1) {
      out.push(`ERROR: ${where} must have exactly one correct choice (answer "${item.answer}" matched ${matches})`)
    }
  })

  const l2 = content.level2
  checkText("level2.prompt", l2.prompt)
  l2.items.forEach((item) => {
    const where = `level2.items.${item.id}`
    checkText(`${where}.situation`, item.situation)
    checkText(`${where}.explanation`, item.explanation)
    checkAudio(where, item.id)
    if (!hasPose(item.pose)) {
      out.push(`ERROR: ${where} uses unknown dog pose "${item.pose}"`)
    }
    for (const prop of item.props ?? []) {
      if (!hasProp(prop)) {
        out.push(`ERROR: ${where} uses unknown prop "${prop}"`)
      }
    }
    item.choices.forEach((c) => checkText(`${where}.choices.${c.id}.label`, c.label))
    const correct = item.choices.filter((c) => c.correct).length
    if (correct !== 1) {
      out.push(`ERROR: ${where} must have exactly one correct choice (found ${correct})`)
    }
  })

  const l3 = content.level3
  checkText("level3.title", l3.title)
  checkText("level3.intro.text", l3.intro.text)
  checkAudio("level3.intro", l3.intro.audioId)
  for (const step of [l3.wash, l3.go, l3.dose]) {
    checkText(`level3.${step.id}.title`, step.title)
    checkText(`level3.${step.id}.text`, step.text)
    checkAudio(`level3.${step.id}`, step.id)
  }
  checkText("level3.mythPrompt", l3.mythPrompt)
  checkText("level3.mythLabel", l3.mythLabel)
  checkText("level3.factLabel", l3.factLabel)
  l3.myths.forEach((m) => {
    checkText(`level3.myths.${m.id}.claim`, m.claim)
    checkText(`level3.myths.${m.id}.explanation`, m.explanation)
    checkAudio(`level3.myths.${m.id}`, m.id)
  })

  const end = content.end
  checkText("end.title", end.title)
  checkText("end.scoreLabel", end.scoreLabel)
  end.levelLines.forEach((t, i) => checkText(`end.levelLines.${i}`, t))
  if (end.levelLines.length !== 3) {
    out.push(`ERROR: end.levelLines must have 3 entries (found ${end.levelLines.length})`)
  }
  checkText("end.closing.text", end.closing.text)
  checkAudio("end.closing", end.closing.audioId)
  checkText("end.footer", end.footer)
  checkText("end.playAgain", end.playAgain)

  return out
}
