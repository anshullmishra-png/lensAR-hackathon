/** What the queue needs from whatever actually plays sound. */
export interface AudioPlayer {
  /** Start a clip. Returns false if there is no such clip (nothing is playing then). */
  start(audioId: string): boolean
  /** Stop the clip that is playing. */
  halt(): void
}

/**
 * Pure logic, no scene objects, so it is unit-tested. Guarantees clips never overlap:
 *  - request(id, false): interrupts whatever is playing and drops anything waiting (a "voice" line);
 *  - request(id, true):  waits its turn behind the current clip (e.g. an explanation after a chime).
 * A missing clip is skipped, so captions-only play never gets stuck. whenIdle() resolves once
 * nothing is playing or waiting, which lets a level stay on a card until the line has finished.
 */
export class AudioQueue {
  private player: AudioPlayer | null = null
  private pending: string[] = []
  private playing = false
  private waiters: (() => void)[] = []

  attach(player: AudioPlayer): void {
    this.player = player
  }

  request(audioId: string, queue: boolean): void {
    if (queue && this.playing) {
      this.pending.push(audioId)
      return
    }
    if (!queue) {
      this.pending = []
      this.halt()
    }
    this.begin(audioId)
  }

  /** Tell the queue the current clip has ended on its own. */
  finished(): void {
    this.playing = false
    this.advance()
  }

  stop(): void {
    this.pending = []
    this.halt()
    this.flush()
  }

  busy(): boolean {
    return this.playing || this.pending.length > 0
  }

  whenIdle(): Promise<void> {
    if (!this.busy()) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => this.waiters.push(resolve))
  }

  private halt(): void {
    if (this.playing && this.player) {
      this.player.halt()
    }
    this.playing = false
  }

  private begin(audioId: string): void {
    if (this.player && this.player.start(audioId)) {
      this.playing = true
    } else {
      this.advance()
    }
  }

  private advance(): void {
    const next = this.pending.shift()
    if (next !== undefined) {
      this.begin(next)
    } else {
      this.flush()
    }
  }

  private flush(): void {
    const waiting = this.waiters
    this.waiters = []
    waiting.forEach((w) => w())
  }
}

/** The one queue the whole Lens shares. AudioManager attaches the real player to it. */
export const audioQueue = new AudioQueue()
