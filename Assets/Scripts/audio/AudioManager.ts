import {bus} from "../core/EventBus"
import {Events, PlayAudioPayload} from "../core/Events"
import {Log} from "../util/Log"
import {audioQueue} from "./AudioQueue"

/**
 * Plays one clip at a time, looked up by file name without extension (audioId).
 * Ordering is handled by AudioQueue; a missing clip logs one warning and the Lens
 * carries on with captions only.
 */
@component
export class AudioManager extends BaseScriptComponent {
  @input
  @hint("The AudioComponent that plays the clips")
  audio: AudioComponent

  @input
  @allowUndefined
  @hint("Hindi clips and sound effects. Name each file after its audioId, e.g. l1_a")
  tracks: AudioTrackAsset[]

  private byId = new Map<string, AudioTrackAsset>()

  onAwake(): void {
    const list = this.tracks ?? []
    for (const track of list) {
      if (track) {
        this.byId.set(track.name.replace(/\.[^.]+$/, ""), track)
      }
    }
    audioQueue.attach({
      start: (id) => this.start(id),
      halt: () => {
        if (this.audio) {
          this.audio.stop(false)
        }
      }
    })
    if (this.audio) {
      this.audio.setOnFinish(() => {
        // Ignore a late "finished" from a clip we already replaced.
        if (!this.audio.isPlaying()) {
          audioQueue.finished()
        }
      })
    }
    bus.on(Events.PLAY_AUDIO, (p: PlayAudioPayload) => audioQueue.request(p.audioId, !!p.queue))
    bus.on(Events.STOP_AUDIO, () => audioQueue.stop())
  }

  isPlaying(): boolean {
    return !!this.audio && this.audio.isPlaying()
  }

  private start(audioId: string): boolean {
    const track = this.byId.get(audioId)
    if (!track) {
      Log.warnOnce(`audio-${audioId}`, `AudioManager: no clip "${audioId}" yet (captions only).`)
      return false
    }
    if (!this.audio) {
      Log.warnOnce("audio-component", "AudioManager: audio component is not assigned")
      return false
    }
    this.audio.audioTrack = track
    this.audio.play(1)
    return true
  }
}
