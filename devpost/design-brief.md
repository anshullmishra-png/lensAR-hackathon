---
status: approved
---

# Design brief: Read the Dog

> **How this document was made.** The idea, the reasoning and the choices below come from a planning conversation the team (the entrant and a partner) had before building. That conversation was not written down at the time. This file was written on 9 November 2026, after the Lens was built, by interviewing the entrant with the Devpost Learn `plan-lens` skill and checking the answers against what the Lens does. It was **not** produced before the build. The Lens was built from the hand-written `build-brief.md` in this folder. No LEAF scenarios were written; the tests that exist are the 28 pure-logic tests run by `node tools/run-tests.mjs`.

## The one spatial moment
A person learns to read a dog's body language and what to do around strays. A virtual dog, Moti, stands in front of them and acts out a feeling or situation (relaxed, nervous, warning; eating, with puppies, sleeping, barking). They choose what they would do, get told at once whether that was right and why, and see where on the dog's body to look next time.

## Why it belongs on glasses
- Uses: draws in the world (a dog you can look at, at his own size, where a dog would stand); leaves your body free (eyes on the dog, a pinch to answer).
- Why it's better than the phone or laptop version: the cues that matter are in the dog's body. On a phone you look at a screen about a dog; here you look at the dog and the answer sits beside him. (Feel unproven until tried on real glasses.)

## Why this Lens exists (in the entrant's words)
India has had many cases of children bitten by dogs. As a pet parent, the entrant believes much of it comes from miscommunication between dogs and people, and that training would have prevented a lot of it. The Lens is meant to help people, especially in tier 2 and tier 3 cities, learn to read dogs and become confident around strays. Hindi comes first, English second.

## Product or overlay
- Type: product. Moti is the experience.
- What the real version would sense: a real stray dog's posture and behaviour. This version senses nothing.
- Stand-in for the preview: Moti is a virtual practice dog with fixed, scripted states. He stands in for a real stray; the Lens does not recognise real dogs.

## Where things live
- Where the user is looking during the main task: at Moti and the question card in front of them.
- Question card, progress dots, answer buttons and feedback panel: in front of the user at eye level, about 150 cm away and slightly left of centre (default).
- Captions: at the top of the view (default).
- Moti: on the right of the view, turned at an angle so his ears and tail show, about 2.8 m away in the preview, because the Lens only renders into a narrow band about 27 degrees wide and 36 degrees tall (default; measured in the preview).
- "Signs to look for": numbered dots on Moti's actual ears, eyes, mouth, body and tail, and a short legend above him, after a Level 1 answer.
- Level 3 first-aid arm: low in the view, in front of the user (default).

## Hands and input
- Answer: pinch one of up to three big buttons (default size 30 by 9 cm).
- Move on: pinch Start, Next, Play again.
- Targets are big and highlight when aimed at.
- Voice: Hindi voice-over clips play when recorded; every line is also shown as a caption, so the Lens works without audio.

## When things show
- Question card and answer buttons: show for each question; the buttons are replaced by the feedback panel after an answer.
- Feedback ("Right" or "Not quite", a tick or cross, and a short explanation in Hindi and English): shows right after an answer for a few seconds.
- Signs-to-look-for dots and legend: show after a Level 1 answer, then clear before the next question.
- Moti: hidden while the first-aid arm is on screen (Level 3).
- If something needs attention out of view: nothing in this version.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Pinching Start begins Level 1: Moti shows a state and three big buttons appear (Relaxed, Nervous, Warning).
2. After any Level 1 answer, the Lens says "Right" or "Not quite" with a tick or cross and an explanation, then shows numbered dots on Moti and a "Look for" legend.
3. Level 2 asks what to do in four situations (eating, puppies, sleeping, barking) and gives the same feedback; Level 3 teaches wash, myth or fact, go to the health centre today, and every dose.
4. The end screen shows the total score and a score for each level, and Play again starts the whole thing over so the person can try to do better.
5. All text and buttons are readable and inside the view in every scene.

## Out of scope
- Recognising real dogs, using the camera, or any custom hand gestures.
- Voice commands.
- Giving medical advice or dose schedules: the Lens never judges whether a dog is rabid and never gives a dose count.
- More than one dog, or a realistic dog: Moti is a simple stylised dog built from shapes, with moving ears, tail, jaw, eyes and fur to show body language.

## Risks and open questions
- The entrant's words were: "it's about the feedback loop, once trained, enhance the answer." This is read as: after being told what was wrong and shown what to look for, the person can play again and answer better. **To confirm with the entrant.**
- The body-language signals (Levels 1 and 2) are not yet checked against a veterinary or animal-welfare source.
- First-aid facts: washing for at least 15 minutes and treating scratches as bites are checked against WHO and India's rabies programme; the home-remedy and "not in the stomach" lines are not yet confirmed.
- Every Hindi line still needs a native-speaker review.
- The Hindi voice-over has not been recorded yet.
- No SPECS device was available, so comfort and real hand tracking are untested.
- No people are recorded, identified or followed.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
