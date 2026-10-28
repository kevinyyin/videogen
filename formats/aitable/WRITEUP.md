# GGhuman take-home: "the ladder"

Kevin Yin · for Oliver Zou, Deep24 · repo: github.com/kevinyyin/videogen

## What I made

**Three 36–37 s Reels in a new style for @gghumanai**, all from one reusable format:

| Episode | Hook | What escalates |
|---|---|---|
| `videos/gg004-words-come-true/final.mp4` (36.3 s) | What if everything an AI said *came true*? | "I have five aces" → they poof onto the table. Then its chips turn to gold, the table becomes a boat that sails down the street, you turn into a chicken, it rains chips, the casino walks off, and it declares itself President. "Nothing can stop me." The moon lands on it. |
| `videos/gg005-keeps-raising/final.mp4` (36.1 s) | What if the AI kept raising the bet? | Neither side backs down. The AI raises with its chips, its car, the casino, the Eiffel Tower and the moon; you call with your house, your grandma and finally Earth. The AI says "I fold." and the whole pile falls on you. |
| `videos/gg006-wont-stop-trading/final.mp4` (36.9 s) | What if the AI wouldn't *stop* trading? | A Catan trade from hell: 1 sheep for your wheat? No. 2, 8, 64 sheep fill the room, 1,000 flood the street, a million cover Paris. "…fine." Earth turns into 8 billion sheep. "Pleasure doing business." |

**The style.** The page today posts flat 2D "POV" memes. These are 3D toy-world sims with a deadpan robot. Each episode
takes one "What if…?" about an AI player and pushes it until it's absurd. Every rung ends in something physically big
(a poof, a crash, a flood, a launch). A counter in the corner climbs the whole time, and the score is mock-epic over
deadpan bubbles. Every premise comes from the site: poker bluffs and raises, Catan trades, an AI that won't back down.
Each video ends on a held question card, **PLAY THEM FREE · GGHUMAN.AI**, and the captions repeat the link.

**Why a second format.** I built a first one, "AI Table" (toy players on a giant poker table, 15–25 s). It worked, but
it felt tame next to what holds attention on Reels. The ladder keeps the same pipeline and swaps the content model:
instead of a few beats on one table, 9 rungs of escalation across six places.

## How it's built

A procedural pipeline: no AI video model, no stock footage, nothing paid. Every frame is code.

```
episode.json ──► tools/ladder.py ──► story.json (text, HUD, absolute key-moment times)
 (~20 lines)       validate           cues.json  (audio from the same times)
                   + time it          caption.md, shots.js stub
                                           │
       formats/ladder/shots.js ◄───────────┘   one shared Three.js template: 6 sets, cast, cameras, bubbles
       formats/ladder/gags.js                  the gag library: every prop's life over time
                     │
   tools/render.mjs (headless Chrome, frame by frame) + audio/synth.py (procedural sound) ──► ffmpeg ──► final.mp4
```

- **The format is a gag library.** There are 10 gags (`say`, `poof`, `transform`, `drop`, `grow`, `walkoff`, `sail`,
  `rain`, `flood`, `launch`), 14 props and 6 places, each with named anchors (`formats/ladder/README.md`). Each gag knows
  its length, default camera, motion, foley and **key moments**. An episode lists rungs: where, which gag, on what, and
  the line the AI says.
- **One timeline.** `ladder.py` sets each rung to the longer of its gag's minimum and the time its text needs to be read
  (≥ 0.3 s per word). It writes the absolute time of every key moment (the pop, the impact, the flood filling) into
  `story.json`. The template animates to those numbers and `cues.json` puts the foley on the same numbers, so sound
  can't drift from picture.
- **Props persist.** A prop created on one rung stays in the world. The table that became a boat sails down the street
  two rungs later with the players on board, and gg005's pile grows from a car to the moon. This is what makes the
  escalation read as one story.
- **Where AI is used.** Claude Code wrote the template, the gag library and the props. It also wrote the three
  `episode.json` scripts and captions and reviewed every contact sheet of stills. I directed it, rejected the first
  format, chose the concepts and approved each stage (spec → plan → build). Timing, audio synthesis, rendering and
  encoding are deterministic code. That split answers "getting AI to do creative work repeatedly and reliably": the AI's
  creative output is a small JSON the validator checks, and everything that has to come out right every time is code
  that's already been checked.
- **Engine credit.** The Three.js engine, renderer, audio synth and QC tools are **EDStudio** by Dylan Nguyen (PolyForm
  Noncommercial), imported unchanged in the repo's first commit. Everything after it is this project: `formats/ladder/`,
  `formats/aitable/`, `tools/ladder.py`, `tools/aitable.py`, `tests/`, `videos/gg*`, new synth voices (poof, chicken,
  sheep, chips, robot) and one bug fix in `tools/render.mjs`.

## How I check quality

Cheapest first. Each layer caught real problems during this build.

1. **Validation, before anything renders (0.06 s).** `ladder.py` rejects an episode and lists every problem it finds:
   - **Shapes and names:** unknown place, gag, prop or camera; an anchor that isn't in that place; a count that isn't a
     whole number; a scale outside 1.5–40.
   - **Continuity:** you can't transform, grow or walk off a prop that isn't on screen yet; you can't drop a pile that
     doesn't exist; a launched prop can't "land" on an anchor no later rung visits.
   - **Text and shape:** a bubble over 24 characters, text that reads faster than 0.3 s per word, a counter that goes
     down, a length outside 30–40 s.
   - **Caption:** missing its CTA, its "Send this to…" line, or exactly 5 hashtags with #animation.

   Every rule has a unit test: 52 tests across both formats (`python3 -I -m unittest discover -s tests`). One of them
   fails if the JavaScript template and the Python validator ever disagree on a prop or anchor name.
2. **Framing self-check (every stills or render run).** The template poses every key moment and projects each subject,
   head and speech bubble through that shot's camera. It warns when one lands off-frame or under the HUD. In gg006 it
   flagged the "8 billion sheep" bubble outside the frame: the camera had been placed inside Earth.
3. **Stills contact sheet (seconds).** Key-moment frames are tiled into one image that the AI reviews against a
   checklist: subject in frame, text readable and off faces, props legible, nothing clipping. This caught what no rule
   would:
   - a black sky in Paris (a filter hid the sky dome);
   - a white frame (the camera inside a house dropped indoors);
   - the gold-chip tower and a pendant lamp blocking the speaker;
   - lamp posts, trees and parked cars in the lens;
   - a walking casino whose legs didn't read;
   - a million sheep that read as a thin band on the horizon.
4. **Audio self-check.** Target −15 LUFS. No music dropouts. Every foley onset is checked against its cue time.
5. **After the render.** An `ffprobe` spec check (1080×1920, 30 fps, H.264 + AAC, duration as planned, < 100 MB) and a
   1-fps frame scan for any stretch with no motion. The scan of gg004 showed held seconds after the aces, the gold tower
   and the boat. Since then the AI points while it lies and hop-laughs when a lie lands, and the parked boat rocks.
6. **A human watches before posting.** At 100 videos: every flagged episode plus a random 10 %.

## How failures are handled

In this build I ran each step by hand and handled failures this way. The runner in "Automating 100 videos" applies the
same policy automatically.

- **Renders are deterministic** (seeded randomness, no clock), so any failure reproduces from the same JSON on any
  machine: same timing, same placement, same bit-identical audio. Pixels vary invisibly between GPU/encoder runs
  (a re-render of gg006 matched the original at 42.8 dB PSNR).
- **A validation error goes back to the AI with the exact message.** Up to 3 retries, then the video goes to a human.
  A script that breaks any rule the validator knows never reaches the renderer.
- **A failed stills review is fixed at the cheapest level that works.** Episode data comes first: a `"cam": "wide"`
  override fixed three blocked shots in gg004 and gg006. A template fix comes next, when the same gag or place fails
  twice (the planet-size flood camera, the indoor size cap). That fix lands once in `shots.js`/`gags.js` and every
  episode is re-rendered. Rendering is cheap, so this is the normal path.
- **A render timeout** (the page never becomes ready) is retried once, then flagged. In this engine it almost always means
  an infinite loop at build time.
- **Every lesson gets written down** in the format's README (`formats/ladder/README.md`, Lessons), so the next run, by me or an AI,
  doesn't hit it again.

## Automating 100 videos

1. **Premises.** An AI brainstorms 150+ escalation premises from the site's games (bluffs, raises, trades, the robber,
   alliances, an AI that never folds), dedupes them against what's been posted, and a human approves a batch of 100.
2. **Scripts.** For each premise, an AI writes `episode.json` from a prompt holding the gag/place/prop reference and the
   three finished episodes as examples. `ladder.py` validates it, and the AI retries on errors (above).
3. **Production.** `ladder.py` → `synth.py` → stills plus AI sheet review → full render → spec check plus motion scan.
   In this build I ran these by hand. Chaining them into one unattended runner is the first thing on the next-steps list.
   Measured on a 16 GB M5 Mac: **a full render takes 114–149 s per 36–37 s episode**, audio about 5 s, validation
   0.06 s. With a stills sheet and its review on top, that's 100 episodes in roughly 4–5 hours on one laptop, and renders
   split across machines because each one depends only on its JSON.
4. **Growth.** New premises mostly reuse gags and places. When one needs something new (a Catan board, a robber, a
   courtroom), it's added once and every future episode can use it. gg006 needed no new gag, only the sheep flood's
   planet mode and two fixed camera angles.
5. **Gate and post.** A human reviews flagged episodes plus a sample. Approved ones are scheduled with their generated
   captions.

## Measured in this build

| | gg004 | gg005 | gg006 |
|---|---|---|---|
| Length / size | 36.3 s / 26.0 MB | 36.1 s / 25.3 MB | 36.9 s / 25.6 MB |
| Full render (1080×1920, 30 fps) | 124 s | 149 s | 114 s |
| Loudness, music dropouts | −15.01 LUFS, none | −15.02 LUFS, none | −15.0 LUFS, none |

## What I'd add next

- A Settler Rush/Catan board place, so trades and the robber happen on the game's own board.
- A one-command batch runner around the loop above, with a review queue.
- The posting step.

The same loop would also produce an A/B variant per premise (hook wording, the final rung), so the page learns which
escalations hold attention.
