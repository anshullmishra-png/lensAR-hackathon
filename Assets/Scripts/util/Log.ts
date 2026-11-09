const PREFIX = "[ReadTheDog]"
const seen = new Set<string>()

/** Prefixed logging. warnOnce() keeps a missing asset from spamming the Logger every frame. */
export const Log = {
  info(msg: string): void {
    console.log(`${PREFIX} ${msg}`)
  },
  warn(msg: string): void {
    console.warn(`${PREFIX} ${msg}`)
  },
  error(msg: string): void {
    console.error(`${PREFIX} ${msg}`)
  },
  warnOnce(key: string, msg: string): void {
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    console.warn(`${PREFIX} ${msg}`)
  }
}
