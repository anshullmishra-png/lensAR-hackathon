# Devpost submission draft: Read the Dog

Fill the bracketed items. Everything else is checked against the repo as of 10 Nov 2026. Do not add claims that are not in here.

## Project name
Read the Dog

## Tagline (one line)
A bilingual Hindi and English Specs Lens that teaches a dog's body language and what to do after a bite.

## Inspiration
Rabies is almost always fatal once symptoms start, yet it is almost completely preventable if a bite is handled correctly. Many people in tier 2 and tier 3 India do not know the first steps, and many believe things that make it worse, like rubbing chilli or turmeric on a bite. Most bites also start with signs a dog gave first, and people missed them. We wanted a Lens that teaches both: how to read a dog, and what to do if it goes wrong.

Context, with sources in the README ("Statistics used in the video and the Devpost text"): India **reported** 37,17,336 dog bite cases in 2024 (a Lok Sabha reply, via IANS). Separately, one **estimate** puts rabies deaths in India at about 20,000 a year, around a third of the world's, with about 40% of cases in children under 15 and over 20% of bite victims getting no vaccine (a One Health study, via a Drishti IAS summary; data year not given). These are secondary sources, and reported and estimated figures are very different, so we do not compare them.

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

## Video script: Why, How, What (about 2 minutes 40 seconds; the rule is UNDER 3 minutes, so stay under 2:50)

About 360 spoken words, which is roughly 2:15 to 2:35 at a calm pace. Cut to the screen shown in brackets. Time it once before you upload. If you run long, cut the Level 2 sentence first, then shorten the "Why" figures.

Prepare two plain text cards (any editor or a title slide): card A and card B below. Keep each on screen for at least four seconds so a judge can read it.

**WHY (0:00 to 0:40)**

**[0:00 to 0:15. Card A, large white text on black: "37 lakh (3.7 million) dog bite cases reported in India, 2024" with a small line under it: "Lok Sabha reply, via IANS, 22 July 2025". Then cut to Moti standing relaxed.]**
"In 2024, India reported 37 lakh dog bites. That works out to about ten thousand a day, one every nine seconds."

**[0:15 to 0:40. Card B: "About 20,000 rabies deaths a year (estimate)  ·  about 40% are children under 15  ·  over 20% of bite victims get no vaccine" with a small line: "One Health study, via Drishti IAS, Dec 2025". Moti behind it, relaxed.]**
"Rabies is almost always fatal once symptoms start, and almost always preventable. One estimate puts India at about twenty thousand rabies deaths a year, around a third of the world's, and about forty percent are children. Over one in five bite victims get no vaccine. Many people never learned two things: how to read a dog, and what to do in the first fifteen minutes."

**HOW (0:40 to 1:10)**

**[0:40 to 1:10. Level 1 question with the five "look carefully" dots. Drag Moti round to the side, then back.]**
"I think you learn this by seeing it, not by reading a poster. So Moti stands in your space and you can turn him by dragging, to see him from every side. Before you answer, dots show where to look: ears, eyes, mouth, tail and back, without saying what they mean. Everything is in Hindi and English together, because not everyone reads English."

**WHAT (1:10 to 2:00)**

**[1:10 to 1:35. Pinch an answer. Tick appears, dots rename to the real cues. Cut to the warning pose, then relaxed.]**
"This is Read the Dog, a Snap Spectacles Lens, shown here in the Lens Studio preview. Level 1: read his body. Tail tucked and ears back: uneasy. Raised fur, a hard stare, teeth: stay away. Soft eyes and a loose body: calm."

**[1:35 to 1:45. One Level 2 question.]**
"Level 2: what do you do near a dog that is eating, asleep, or running at you? Don't run."

**[1:45 to 2:00. Forearm, wash timer, myth card.]**
"Level 3: if you are bitten. Wash with soap and running water for fifteen minutes. This timer is a fifteen-second demo. Never put chilli, turmeric or oil on a bite. See a doctor the same day, even for a scratch, and finish every dose."

**PROOF AND LIMITS (2:00 to 2:40)**

**[2:00 to 2:15. Terminal: `node tools/run-tests.mjs`, "30 passed, 0 failed". Then the `devpost/` folder.]**
"I planned it with the Learn skill pack's design brief, and a coding agent built it in Lens Studio through CLAD and the MCP. Thirty tests check scoring, levels, content and layout."

**[2:15 to 2:40. README sources table. Last shot: Moti relaxed.]**
"Honest limits. I tested this in the preview, not on real glasses. Moti is generated with SPECS Text-to-3D, and I added the skeleton and the face. The Hindi hasn't had a native-speaker review. The medical lines were compared with WHO and India's rabies programme, but I read only one source in full; the README shows how far I read each. The design brief was written after the build. A training aid, not medical advice. Thank you."
