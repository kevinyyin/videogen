# BIOGRAPHY — "The story of [Name]" (EDStudio's own category)

A narrated life, birth → death, in one continuous reel. Its own category inside EDStudio (user, Oct 23 2026): it is **not** a
what-if sim and not a family tear-jerker, so it has its own rules, tool and workflow. Reference: `videos/009-abe-lincoln`.

## What makes it different from the other tones
| | other tones | biography |
|---|---|---|
| Text | short punchy lines | **a narrator telling a story**: full, connected, present-tense sentences (one or two per scene) |
| Timing | fixed shot clock, text fits the shot | **the narration sets the clock**: `tools/biography.py` sizes every shot from its lines |
| Length | 45–80 s | as long as the life needs, but aim **under 2:00** (user steer on 009's 2:19 cut; v3 = 1:59 via pace 0.30, lead/tail 0.2/0.25, small trims). Never rush a scene to save seconds. render.mjs lowers the bitrate cap automatically so long reels stay < 100 MB. |
| HUD | premise number | **their AGE** (rolls at each cut) + date + place |
| Sets | reuse `engine/sets/*` | **build what the life needs** (user: "don't worry about previous artifacts") — new sets per era |
| Ending | twist / question | death (non-graphic but *clear*), aftermath, legacy, "Whose story should we tell *next*?" |

## 1. Research first (facts are the content)
- Web-search every claim. Prefer NPS / Library of Congress / Smithsonian / national archives / museum sites.
- Collect **hyper-specific, visual details** — the stuff people repeat to friends: "less than one year of school", "272
  words", "an 11-year-old girl told him to grow a beard", "his hand shook from three hours of handshakes".
- Where sources disagree (distances, amounts, folk stories), say it loosely ("over a thousand miles", "a few cents").
- Cite sources in the shots.js header + an HTML comment in caption.md.

## 2. Write the narration (the most important step)
User steer on 009 v1: subtitles like "Less than one year of school. So he reads by firelight." felt **choppy, out of
context** — fragments are not narration. Rules:
- Write it like a narrator reading a storybook aloud: subject + verb, connected by "when / so / but / then / and".
  ✗ "22. A store clerk in New Salem, Illinois."  ✓ "Back in Illinois, he becomes a clerk in a small-town general store."
- Present tense, third person, the person's name early ("…Abraham Lincoln is born."), then "he/she".
- One or two lines per scene. **≤ ~95 characters per line** (the subtitle box wraps at ~48 chars → max two rows).
  Split a long sentence across two lines with a comma/ellipsis so each line still reads as a phrase.
- Every line must be **shown** by its scene (house rule): the line about the axe plays over the axe. **This includes the
  dark chapters** — 009 v2 said "he sees people sold at a slave auction" over a close-up on a boat and the user called it
  out. Show them with dignity (v3: people standing still on the block, heads lowered, buyers bidding, the auctioneer
  pointing — then the hero's face as he lowers his head). Never graphic, never played for spectacle.
- A wide + a reaction close-up under ONE line is strong for those moments: give the wide beat `"len"` (fixed length) and
  the reaction beat no lines — the sentence runs on across the cut (009 auction → auctionB).
- Keep the specific number or quote in the line; the HUD carries age/date/place so the line doesn't have to.
- End on legacy in two short lines ("The boy from a log cabin held a breaking country together," / "and helped set four
  million people free.").

## 3. The beat table → story.json (`tools/biography.py`)
Write `videos/<slug>/script.json` (format documented at the top of `tools/biography.py`): one beat per scene with
`cam`, `set`, `age`, `date`, `place`, `lines`, optional `extra` (more breathing room), `delay` (first line starts later,
e.g. after a dip), `src` (see §5). Then:

    python3 -I tools/biography.py <slug>

It writes story.json: shot times from the narration (`pace` 0.31 s/word, `gap`, `lead`, `tail`, `min_shot`), subtitles,
the HUD (age roll at every cut), title (first beat, no lines), end card fully visible ≥ 4 s, dips, final fade — and
prints a timing table + warnings (lines faster than 0.3 s/word, lines > 95 chars). **Never hand-edit story.json** —
edit script.json and re-run. Give big moments `extra` (death, the speech, the legacy shot).

## 4. Sets, cast, aging
- One location per scene; a new look per era (night snow, summer woods, autumn grave, sunset river, candlelight, flags,
  dusk battlefield, theatre, marble). Build new sets as builders returning their own `root`, park them at offsets
- Separate rigs per age: kid (`headR 0.17`, scale 0.62) → teen (0.86) → adult (1.08–1.1). Wardrobe per era.
- A signature feature that arrives on screen (`makePerson({beard})`, grow `head.beard.scale` 0.62 → 1) and a signature
  prop (top hat) that pays off at the end (left on the empty chair).
- **Physical logic checklist** (009 v1 shipped with all of these): speakers stand *behind* lecterns, not at the lectern's
  position (Lincoln was inside the box); every seated person has a seat under them; hand props sit in the hand (oar handle
  at the steersman's hands); no furniture overlapping a person; nobody in the line of fire of a camera reveal.
  Check every still for intersections before rendering.

## 5. Choreography time (`src`)
shots.js can be authored in its own clock and stretched to the narration: give each beat `src: [s0, s1]` and map real
time → src time at the top of `update()` (009 does it in 3 lines). Use this when narration changes would otherwise force
re-timing every keyframe. Remember everything time-based in the sheet (cues.json) must be remapped the same way —
009's `make_cues.py` has a `remap()` for that.

## 6. The death beat: non-graphic but unmistakable
009 v1 cut to black on a shadow in a doorway and the user couldn't tell what happened. v2 works:
1. Line names it plainly ("…John Wilkes Booth slips into their box and fires.").
2. The threat **enters the frame** where we can see it (camera placed so attacker and victim are separated on screen; hide a
   wall/post for that one shot if needed — a standard film cheat).
3. The act is a **visible event**: a raised arm, one muzzle flash (bright sphere + short point-light pulse ≤ 0.15 s), a
   smoke puff that lingers; one muffled low crack in the mix (`distant_boom` size 0.3) — no gunshot sample.
4. The reaction reads: head drops, someone turns toward them — then the dip to black ≈ 0.5 s later.
5. Aftermath in quiet light (empty chair, the hat, a clock at the time of death) + a famous quote.
No blood, no wound, nothing lingering on the body.

## 7. Sound
Pick a flavor from the person's time and place (009: Americana — dulcimer-like mallet ostinato + a folk-hymn piano theme,
strings + soft taiko for war, hymn at the speech, solo piano at the death, full theme at the legacy). One theme that
returns across the life ties it together. Scene beds per place + a few synced foley hits. Music never drops out.

## 8. Caption (always shipped + pasted in the report — user rule)
Hook ("From a dirt-floor log cabin to the Lincoln Memorial 🎩🪓"), 2–3 sentences of the most surprising facts, "Whose story
should we tell next? 👇", "Send this to your history buff friend", a blank line, exactly 5 hashtags incl. #animation (+ the name and
#biography).

## 9. Living people and modern/tech lives (011 Elon Musk)
- **Birth → today**: no death beat. End on the present + what they say is next ("Now 55, he says the next stop is a city on
  Mars."). HUD last segment = TODAY. Check every "today" number on the day you render (Starlink count, net-worth rank) and keep
  volatile figures out of the narration (no dollar net worth — say "the richest person on Earth" only if a current source agrees).
- **Factual and neutral**: companies, launches, products. Skip politics and personal controversies; nothing speculative.
- **Spectacle is the draw** (user: "show a lot of cool scenes and props"): give each big machine its own shot and show it
  *doing* the thing — a launch, an explosion, a booster landing itself, a car in orbit, a capsule docking, a tower catching a
  booster, a satellite swarm, a city building itself. `engine/sets/tech.js` has the space/launch/factory kit.
- **Screens are great props for early tech beats**: a 320×240 CRT canvas (`makeCRT().setScreen(draw)`) shown as a POV shot —
  BASIC code typing, a playable-looking game (Blastar) with "SOLD! $500", a money-by-email UI with a "SOLD TO eBay" stamp.
- **A famous real moment as a prop** lands well (walking into Twitter HQ carrying a sink).
- **Author new biographies in shot-local time** (`lt`, `L`, `u`) so shots stretch with the narration automatically; the
  cue sheet resolves times the same way (`at(cam, lt)` / `at(cam, frac=…)` in 011's make_cues.py). No `src` clock needed.
- **Recurring cameo**: Gary (002: bald, mustache, blue shirt) can turn up in any crowd — 011 put him front and center in the
  beach crowd at the booster catch, jaw dropping, then turning to the camera. Keep it to one short beat.

## 10. Staging lessons from 011
- A long horizontal object (a 34 m rocket stage) against same-colored walls reads as a wall. Film it from one end at a
  diagonal (engines toward camera) and keep the room darker than the object.
- For vertical frames, a sitting-on-the-floor pose seen from the front reads as standing (legs foreshortened, bowed head hides
  the face): seat them on a crate/step and film 3/4 from the side.
- A capsule docking seen end-on looks like one more module — film docking from the side.
- The last shot under the end card is only visible until `finalFade` — land everything (the build-up, the reveal) inside
  that window, not across the whole shot length.

## 11. The enhancement pass (user on 011 v1: "some scenes / props lack detail / light — make it more interesting")
Budget a dedicated polish pass after the first full cut. Review every shot at full size and fix in this order:
1. **Rendering bugs** (black patches, blown highlights, things blocking the subject, leftovers from a reused set).
2. **Detail on the hero props** — anything the camera lingers on gets windows, trims, lights, a readable detail (Dragon's
   windows/thrusters, ISS golden arrays facing the camera, the Roadster's "DON'T PANIC!" screen, Cybertruck light bars).
3. **Light** — every shot needs a key on the face, a practical in frame where it makes sense, and contrast with the background.
4. **Secondary action** — one extra living thing per shot: passers-by doing a double take, a welder's sparks, confetti,
   phones up in a crowd, falling petals, a Starlink train, contrails, a sign crew on a lift.
5. **Story-true dressing** — the real place, not the reused set (a glass HQ at 1355 Market St over a toy-street storefront).
