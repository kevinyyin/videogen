# GGhuman take-home: "AI Table"

Kevin Yin · for Oliver Zou, Deep24 · repo: github.com/kevinyyin/videogen

## What I made

**Three 17–23 s Reels in a new style for @gghumanai**, all from one reusable format:

| Episode | Hook | Payoff |
|---|---|---|
| `videos/gg001-ai-bluff/final.mp4` (23.0 s) | What if an AI could *bluff* you? | You fold pocket aces to a skyscraper of chips. The robot flips 7-2, says "gg, human.", and the tower buries you. |
| `videos/gg002-ai-alliance/final.mp4` (21.2 s) | What if two AIs *teamed up* against you? | Two robots shake on it and wall you in with chips. Then one kicks the other's tower over: "Alliance over." |
| `videos/gg003-prove-human/final.mp4` (17.3 s) | What if the AIs thought *you* were the bot? | You ace their CAPTCHA in 0.4 s. Every screen reads BOT DETECTED, and the dealer's hand flicks you off the table. |

**The style.** The page today posts flat 2D "POV" memes. These are 3D toy dioramas: a human and robots about 8 cm tall stand
*on* a giant poker table, so cards are doors, chip stacks are towers and the dealer is a giant hand. Each episode is one
"What if…?" question, 3–4 fast beats and one big physical payoff. Every premise acts out the site's own promise, AIs that
bluff, team up and think like people. Each ends on a held card, **PLAY THEM FREE · GGHUMAN.AI**, and the captions repeat
the link.

## How it's built

A procedural pipeline: no AI video model, no stock footage, nothing paid. Every frame is code.

```
episode.json ──► tools/aitable.py ──► story.json (text, HUD, absolute key-moment times)
   (~40 lines)        validate           cues.json  (audio from the same times)
                      + time it          caption.md, shots.js stub
                                              │
          formats/aitable/shots.js ◄──────────┘   one shared Three.js template: table, cast, beat choreography, cameras
                     │
   tools/render.mjs (headless Chrome, frame by frame) + audio/synth.py (procedural sound) ──► ffmpeg ──► final.mp4
```

- **The format is a beat library.** `deal`, `tower`, `peek`, `flip`, `handshake`, `wall`, `kick`, `captcha` and `flick`,
  plus the endings `fold` and `topple` (`formats/aitable/README.md`). Each beat type knows its length, camera, choreography,
  foley and **key moments**. An episode just lists beats with its own lines, cards and cast.
- **One timeline.** `aitable.py` sets each beat to the longer of its minimum and the time its text needs to be read
  (≥ 0.3 s per word). It then writes the absolute time of every key moment (card lands, tower peaks, impact) into
  `story.json`. The 3D template animates to those numbers, and `cues.json` puts the foley on the same numbers, so sound
  can't drift from picture.
- **Where AI is used.** Claude Code (Opus) wrote the template and the beat library, wrote the three `episode.json`
  scripts and captions, and reviewed every contact sheet of stills. I directed it, chose the concepts and approved each stage
  (spec → plan → build). Timing, audio synthesis, rendering and encoding are deterministic code. That split is the answer
  to "getting AI to do creative work repeatedly and reliably": the AI's creative output is a small, validated JSON, and
  everything that has to come out right every time is code that's already been checked.
- **Engine credit.** The Three.js engine, renderer, audio synth and QC tools are **EDStudio** by Dylan Nguyen (PolyForm
  Noncommercial), imported unchanged in the repo's first commit. Everything after it is this project: `formats/aitable/`,
  `tools/aitable.py`, `tests/`, `videos/gg*`, two new synth voices, and one bug fix in `tools/render.mjs`.

## How I check quality

Cheapest first; each layer caught real problems during this build.

1. **Validation, before anything renders (< 1 s).** `aitable.py` rejects an episode with every problem listed: unknown
   beat or cast ID, bad card code, two players in one seat, a topple with no tower, a bubble over 24 characters, text that
   reads faster than 0.3 s per word, a length outside 15–25 s, or a caption missing its CTA, its "Send this to…" line or
   exactly 5 hashtags. 15 unit tests cover it (`python3 -I -m unittest discover -s tests`).
2. **Framing self-check (every stills or render run).** At build time the template poses every key moment and projects
   each subject through that shot's camera. It warns when a head, bubble or prop lands off-frame, under the HUD, or in
   the subtitle band while a subtitle is showing. It caught four framing bugs, each fixed by re-aiming: a robot's head
   under the HUD (twice), a laughing robot cut by the frame edge, and players clipped in a three-player wide. Two other
   warnings were intended framings (a tilt up past the robot, builders walking off), and the check now allows them.
3. **Stills contact sheet (≈ 3–10 s).** Key-moment frames are tiled into one image that the AI reviews against a checklist:
   subject in frame, text readable and off faces, props legible, nothing clipping. This caught the visual bugs no rule
   would: a washed-out frame (a light tuned for human scale), invisible chips (a commented-out line), cards drawn over the
   CAPTCHA's lit squares, the robot's cards reading upside down to the viewer, and foreground blobs on camera lines.
4. **Audio self-check.** Target −15 LUFS. No music dropouts. Every foley onset is checked against its cue time.
5. **After the render.** The `ffprobe` spec check (1080×1920, 30 fps, H.264 + AAC, duration as planned, < 100 MB) and a
   1-fps frame scan for any stretch with no motion. The scan caught two near-static seconds, fixed with a laugh hop and a
   stronger camera push.
6. **A human watches before posting.** At 100 videos: every flagged episode plus a random 10 %.

## How failures are handled

- **Renders are deterministic** (seeded randomness, no clock), so any failure reproduces exactly from the same JSON on
  any machine.
- **A validation error goes back to the AI with the exact message.** Up to 3 retries, then the video goes to a human.
  A bad script never reaches the renderer.
- **A failed stills review goes back to the script** (lines, beat choice) for that episode. If the same beat type fails in
  two episodes, it's a **template bug**: fix it once in `shots.js` and re-render every episode. Rendering is cheap, so this
  is the normal path.
- **A render timeout** (the page never becomes ready) is retried once, then flagged. In this engine it almost always means
  an infinite loop at build time.
  an AI, doesn't hit it again. Examples from this build are in `formats/aitable/README.md` under Lessons.

## Automating 100 videos

1. **Premises.** An AI brainstorms 150+ hooks from the site's games and promises (bluff, alliance, betrayal, trade, prove
   you're human, collusion, tells), dedupes them against what's been posted, and a human approves a batch of 100.
2. **Scripts.** For each premise, an AI writes `episode.json` from a prompt holding the beat library and the three finished
   episodes as examples. `aitable.py` validates it, and the AI retries on errors (above).
3. **Production (unattended).** `aitable.py` → `synth.py` → stills plus AI sheet review → full render → spec check plus motion scan.
   Measured on a 16 GB M5 Mac: **≈ 50–70 s of render per 17–23 s episode**, about 5 s of audio and under 1 s of
   validation. Once its beat types exist, **an episode goes from JSON to final in about one minute of machine time**.
   That's 100 episodes in about 2 hours on one laptop, and renders parallelize across machines because they're
   deterministic.
4. **Growth.** New premises mostly reuse beats. When one needs a new beat (Settler Rush's hex board, a trade, the robber, a
   debate podium), it's added to the library once and every future episode can use it. gg003 added `captcha` and `flick` this way.
5. **Gate and post.** A human reviews flagged episodes plus a sample. Approved ones are scheduled with their generated captions.

## Measured in this build

| | gg001 | gg002 | gg003 |
|---|---|---|---|
| Length / size | 23.0 s / 15.6 MB | 21.2 s / 13.9 MB | 17.3 s / 10.4 MB |
| Full render (1080×1920, 30 fps) | 70 s | 62 s | 49 s |
| Loudness, music dropouts | −15.01 LUFS, none | −15.01 LUFS, none | −15.03 LUFS, none |
| New beat types needed | 4 + 2 endings | 3 | 2 |
| Validation errors on first try | 0 | 0 | 0 |

## What I'd add next

- A Settler Rush board (hex tiles as terrain at figure scale) so the format promotes both live games.
- A one-command batch runner around the loop above, with a review queue.
- The posting step.

The same loop would also produce an A/B variant per premise (hook wording, payoff), so the page learns which beats hold
attention.
