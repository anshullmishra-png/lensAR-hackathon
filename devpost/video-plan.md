# Video plan: Read the Dog

Check the Devpost page for the required video length and format before recording. This plan is written for about 2 to 3 minutes. Record the Hindi voice lines first (`tools/recording-script.md`), so the video has the real audio.

## Before you press record

- [ ] Hindi audio recorded, named exactly by id (`onb_intro.mp3`, `l1_a.mp3`, ...), dropped into `Assets/Audio`, and checked in the preview that no line is cut off.
- [ ] `Config.AUTOPLAY` is `false`.
- [ ] `Config.DEMO_MODE`: keep `true` while recording so the wash timer takes 15 seconds, then say so on camera ("demo timer; the real one is 15 minutes"). Set it to `false` for the final submission build.
- [ ] Preview set to the Spectacles device. Terminal ready in the repo folder.
- [ ] `node tools/run-tests.mjs` shows 30 passed, 0 failed.

## Shot list

| Time | What the viewer sees | What you say (English; the Lens itself is bilingual) |
|---|---|---|
| 0:00 to 0:25 | Moti stands to the right and turns to face you (he follows your head). A pinch on **Start**, then the Level 1 question appears: "How is Moti feeling?" with three buttons. Pinch **Nervous**. | "This is Moti. Dogs talk with their bodies, and most bites happen because people miss the signs. Here, you read him and answer with a pinch." |
| (in 0:00 to 0:25) | With the question showing, point out the "Look carefully at" dots on his ears, eyes, mouth, tail and back, and **drag Moti round** to show him from the side. | "The dots tell you where to look. You can turn him with your hand and look from every side." |
| 0:25 to 1:00 | After the answer: tick or cross, then **numbered dots on his ears, mouth and tail** with a "Look for" legend. Cut to the warning pose: raised fur along his back, narrowed stare, teeth. Then the relaxed pose for contrast. | "The dots sit on his real ears, tail and mouth, so they follow him as he moves. Tail tucked and ears back means uneasy. Raised fur, a hard stare and teeth mean stay away. Soft eyes and a loose body mean calm." |
| 1:00 to 1:30 | Level 2 (eating, puppies, sleeping, barking): one question, one pinch, the feedback panel. | "Level 2 asks what to do near a dog that is eating, with puppies, asleep or barking." |
| 1:30 to 2:00 | Level 3: the forearm, the bite mark, the wash timer (15 s demo), the myth-or-fact card, "go to a health centre today". | "If a bite happens: wash with soap and running water for at least 15 minutes, see a doctor the same day, finish every dose. The timer here is a 15-second demo." |
| 2:00 to 2:20 | Terminal: `node tools/run-tests.mjs` and the "30 passed, 0 failed" line. | "The logic is tested: scoring, level flow, the audio queue and the layout. 30 tests pass." |
| 2:20 to 2:50 | The README "What was checked against sources" table. | "Limits, honestly: the first-aid and dog-behaviour claims are checked against WHO, India's rabies programme, the AVMA and animal-welfare guides, and the table says how far I read each one. Two lines were reworded because the sources said something slightly different. The Hindi has not had a native-speaker review. The wash timer is a 15-second demo. Moti is an AI-generated model that I rigged myself. All of this was tested in the Lens Studio preview, not on real glasses. Training aid, not medical advice." |

## Say these things plainly (do not hide them)

- The Lens runs in a narrow view in the preview, so Moti is small and the panels sit beside him. That is a preview limit; on glasses the field of view and the floor query differ and have not been tested.
- Dragging Moti round was verified by driving his rotation directly; the pinch-drag itself has to be checked by you with the preview mouse (or glasses) before you record it.
- Input is pinch and poke on floating panels. The spatial part is Moti, the dots anchored on him, and the arm for first aid.
- The planning brief in `devpost/design-brief.md` was written after the build (it says so at the top). `devpost/build-brief.md` is the brief the Lens was actually built from.
- Built with Claude Code through the CLAD plugin and the Lens Studio MCP.

## What not to claim

- Do not say "verified by a doctor": it is checked against published guidance, and the README table says how far each source was read.
- Do not say the Hindi is reviewed.
- Do not say it runs on glasses.
