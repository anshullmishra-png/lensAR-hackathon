# Devpost submission draft: Read the Dog

Fill the bracketed items. Everything else is checked against the repo as of 10 Nov 2026. Do not add claims that are not in here.

## Project name
Read the Dog

## Tagline (one line)
A bilingual Hindi and English Specs Lens that teaches a dog's body language and what to do after a bite.

## Inspiration
Rabies is almost always fatal once symptoms start, yet it is almost completely preventable if a bite is handled correctly. Many people in tier 2 and tier 3 India do not know the first steps, and many believe things that make it worse, like rubbing chilli or turmeric on a bite. Most bites also start with signs a dog gave first, and people missed them. We wanted a Lens that teaches both: how to read a dog, and what to do if it goes wrong.

## What it does
You meet **Moti**, a dog who stands next to you in your space, and you answer with a pinch.

1. **Level 1, read the dog.** Moti shows relaxed, nervous or warning body language and you say which. Each question comes with "Look carefully at" dots on his ears, eyes, mouth, tail and back, so you know where to look without being told the answer. You can **drag Moti to turn him all the way round** and see him from any angle. After you answer, the dots name the real cues ("tail tucked", "ears back", "raised fur") and Moti turns toward you and grows so you can see them.
2. **Level 2, what do you do?** Four situations (eating, with puppies, asleep, barking toward you) and the safe response to each.
3. **Level 3, if you are bitten.** A forearm with a bite mark, a wash timer, myth-or-fact cards (chilli or turmeric, "a small scratch is fine", "the vaccine is many injections in the stomach"), go to a health centre today, and finish every dose.

Everything is on screen in Hindi and English together. Moti's ears, tail, jaw, eyes and fur really move for each state.

## How we built it
- **Lens Studio and TypeScript** for Spectacles, with the **Spectacles Interaction Kit** (pinch and drag) and **UI Kit** (panels and buttons), plus the Motion tween library.
- **Moti** is a 3D dog generated with **SPECS Text-to-3D** (the `api.specs.com` text-to-3D service, used through Lens Studio; prompt and settings are in the README). It was one solid mesh, so it could not show a tucked tail or pinned ears. We wrote a small tool (`tools/build_moti_rig.py`) that adds a skeleton (head, jaw, two ears, three tail bones) with smooth skin weights, and a rig script that drives those bones from plain pose data. Eyelids, fangs and raised fur are small parts built in code that follow the bones.
- **Content** lives in one typed file with a validator, so every line has Hindi and English and nothing ships half-translated.
- **30 automated tests** cover scoring, level flow, the audio queue, the content, and the layout (including checks that keep Moti and the legend inside the narrow field of view).
- **Built with Claude Code** through the CLAD plugin and the Lens Studio MCP. The planning documents are in `devpost/`.

## Challenges
- The preview shows only a narrow band of the scene, so the panels, the dog and the legend all had to share very little space. A layout test now guards it.
- A solid AI-generated mesh cannot act. Adding a skeleton to it, and then making the face look friendly rather than uncanny, took several tries; the first version covered the model's own good eyes and looked glum.
- Checking the medical content against sources changed three lines (below).

## Accomplishments we are proud of
- Body language you can actually see, in a Lens about something that really matters.
- Hindi and English on screen at once, in a font that renders Devanagari correctly.
- Content compared with published guidance (WHO, India's national rabies programme, animal-welfare and bite-prevention guides), with every check written down, and tests that run. Only the Indian wound-washing guidance was read in full; the other sources were seen in search excerpts.

## What we learned
Teaching works better when the learner is told where to look, not what to see. Naming only the body part before the answer, and the actual cue after it, did that.

## What is next
- Hindi voice-over for every line (the recording script `tools/recording-script.md` and the loader are in the repo; the 16 lines are not recorded yet).
- A native-speaker review of all Hindi.
- Testing on real Spectacles with the real field of view and a floor query.
- More languages.

## Honest limits (please read)
- **Tested in the Lens Studio preview, not on real glasses.** The benefit of glasses for this idea (a dog standing in your space that you can walk around) is unproven.
- **Input is pinch and drag on floating panels.** The spatial part is Moti, the dots anchored on his body, and the first-aid forearm.
- **The wash timer is a 15-second demo** (`DEMO_MODE` is on, with a skip button) so a reviewer can finish the step. Set `DEMO_MODE` to `false` for a real 15-minute wash.
- **Hindi is a draft** and has not had a native-speaker review. **There is no Hindi voice-over yet: every line is shown as a caption in Hindi and English.** The recording script and the audio loader are ready in the repo.
- **Training aid, not medical advice.** The Lens never judges whether a dog is rabid and never gives a vaccine schedule or dose count.
- **The dog model is generated.** It came from SPECS Text-to-3D (see "Dog model origin" below); we added the skeleton, the rig and the face parts. Snap's Generative Lens Tools Terms allow generated assets to be used "solely for the purpose of creating Lenses in Lens Studio", say nothing about who owns the output, and do not name SPECS Text-to-3D, so we make no ownership claim over the mesh itself.
- **The planning brief in `devpost/design-brief.md` was written after the build** (it says so at the top). `devpost/build-brief.md` is the brief the Lens was actually built from.

## Sources checked
This is **not** "fully verified". Only the MoHFW wound-washing document was read in full; the WHO, NCDC and dog-behaviour sources were seen in search excerpts, not read end to end. The README ("What was checked against sources") has the full table with how far each source was read. In short:
- India's National Rabies Control Programme wound-washing guidance (MoHFW), read in full: wash with soap and running water for up to 15 minutes; applying chilli, oils, turmeric and similar is "strictly prohibited"; cauterising is prohibited.
- WHO rabies fact sheet: wash for at least 15 minutes; minor scratches also need vaccination; complete the course.
- Dog behaviour: ASPCA Pro, Best Friends, Wisconsin Humane Society (body language); AVMA tips and CHOP (bite prevention).
- Three lines were reworded because the sources said something slightly different (15 minutes; "never put chilli, turmeric or oil on a bite"; the old stomach vaccine was stopped in India in 2004, today it is a few shots, usually in the arm).

## Dog model origin
Generated on 9 Nov 2026 with SPECS Text-to-3D (`api.specs.com`, a Specs Inc. API) through the signed-in Lens Studio session, from this prompt: "friendly Indian street dog (pariah dog), short tan-brown coat, medium build, standing relaxed on all four legs, ears semi-erect, tail down, realistic proportions, full body, stylized but natural look". The terms found for Lens Studio generative tools are Snap's Generative Lens Tools Terms (effective 12 June 2024); they do not mention Spectacles, SPECS or text-to-3D, so it is not confirmed that they govern this service. The Hindi and English text uses Noto Sans Devanagari (SIL Open Font License 1.1).

## Built with
Lens Studio, TypeScript, Spectacles Interaction Kit, Spectacles UI Kit, Claude Code, CLAD plugin, Lens Studio MCP, Python (rigging tool).

## Links
- Repo: https://github.com/anshullmishra-png/lensAR-hackathon
- Video: [add link]
- Lens: [add link if you publish one]

---

## Video script (about 2 minutes 40 seconds; the rule is UNDER 3 minutes, so stay under 2:50)

Read at a calm pace (about 400 spoken words). Cut to the screen shown in brackets. If you run long, cut Level 2 first. Time it once before you upload.

**[0:00 to 0:18: Moti stands to the right and turns toward you. Pinch Start.]**
"This is Moti. Dogs talk with their bodies, and most bites start with signs people missed. In India a bite can also mean rabies, which is almost always fatal but almost always preventable. This Lens teaches both, in Hindi and English."

**[0:18 to 0:50: Level 1 question. Point at the dots. Drag Moti round to the side, then back.]**
"Level 1: how is Moti feeling? The dots tell you where to look: ears, eyes, mouth, tail, back. They don't give the answer. And you can turn him with your hand and see him from every side."

**[0:50 to 1:20: Pinch Nervous. Tick appears. Dots rename to the real cues. Cut to warning pose, then relaxed.]**
"After you answer, the dots name the real signs, and Moti turns to you so you can see them. A tucked tail and ears back mean uneasy. Raised fur, a hard stare and teeth mean stay away. Soft eyes and a loose body mean calm."

**[1:20 to 1:35: Level 2, one question.]**
"Level 2: what do you do? Leave a dog alone when it's eating, with puppies, or asleep. If one runs at you, stand still like a tree."

**[1:35 to 2:00: Level 3. Forearm, wash timer, myth card.]**
"Level 3: if you are bitten. Wash with soap and running water for fifteen minutes. This timer is a fifteen-second demo. Never put chilli, turmeric or oil on a bite. See a doctor the same day, even for a scratch, and finish every dose."

**[2:00 to 2:15: Terminal: `node tools/run-tests.mjs`, "30 passed, 0 failed". Then the `devpost/` folder on screen.]**
"I planned it with the Learn skill pack's design brief, and a coding agent built it in Lens Studio through CLAD and the MCP. Thirty tests check scoring, level flow, content and layout. The planning documents are in the devpost folder."

**[2:15 to 2:42: README sources table.]**
"Honest limits. I tested this in the Lens Studio preview, not on real glasses. The first-aid and dog-behaviour lines were compared with WHO, India's rabies programme and animal-welfare guides, but I read only one of those in full. Moti was generated with SPECS Text-to-3D, and I added the skeleton and the face. The design brief was written after the build, and says so. The Hindi hasn't had a native-speaker review. Training aid, not medical advice. Thank you."
