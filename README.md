# videogen

Turns a short JSON script into a 30 to 40 second vertical 3D video, rendered entirely from code. Built for [gghuman.ai](https://gghuman.ai), a site where you play board games against AI opponents.

## What it makes

The current format, "the ladder", takes one absurd "What if...?" about an AI player and escalates it rung by rung. On each rung the robot says a line and a gag makes it physically true: five aces appear on the table, the table turns into a boat and sails down the street, the casino stands up and walks off, the planet turns into sheep. A counter in the corner climbs the whole time, and every video ends on a `PLAY THEM FREE · GGHUMAN.AI` card.

Three finished episodes, each about 36 s at 1080×1920 and 30 fps:

- [gg004: What if everything an AI said came true?](videos/gg004-words-come-true/final.mp4)
- [gg005: What if the AI kept raising the bet?](videos/gg005-keeps-raising/final.mp4)
- [gg006: What if the AI wouldn't stop trading?](videos/gg006-wont-stop-trading/final.mp4)

The pipeline uses no AI video model, stock footage or paid tools.

## How it works

```
episode.json ──► tools/ladder.py ──► story.json   text, counter, absolute time of every key moment
 (~20 lines)     validate + time     cues.json    sound cues on the same times
                                     caption.md   Instagram caption
                                          │
formats/ladder/shots.js + gags.js ◄───────┘   shared Three.js template: 6 places, cast, cameras, gag library
                │
tools/render.mjs (headless Chrome, frame by frame) + audio/synth.py (procedural audio) ──► ffmpeg ──► final.mp4
```

- `ladder.py` checks the episode before anything renders and lists every problem it finds: an unknown place, gag, prop or anchor; a prop used before it exists or after it has left; text that reads faster than 0.3 s per word; a counter that goes down; a length outside 30 to 40 s; a caption missing a required part.
- Each rung lasts the longer of its gag's minimum length and the time its text needs to be read. `ladder.py` writes the absolute time of every key moment into `story.json`. The template animates to those times and `cues.json` puts the sound effects on them, so sound stays in sync with the picture.
- The gag library has 10 gags (`say`, `poof`, `transform`, `drop`, `grow`, `walkoff`, `sail`, `rain`, `flood`, `launch`), 14 props and 6 places with named anchors. Gags and props are pure functions of time, so whatever a rung creates stays in the world for later rungs.
- Randomness is seeded and nothing reads the clock, so the same JSON produces the same video on any machine.
- During a render the template projects every subject, head and speech bubble through its camera and prints a warning when one lands off-frame or under the counter. `audio/synth.py` reports loudness and any gaps in the music, and `tools/caption.py` checks the caption format.

[formats/ladder/README.md](formats/ladder/README.md) is the full reference for episode fields, gags, places and props, with lessons from building them. [WRITEUP.md](WRITEUP.md) covers the quality checks, failure handling, render times and a plan for producing 100 videos.

An earlier format, "AI Table" (toy-sized players on a giant poker table, 15 to 25 s; `formats/aitable/`, `tools/aitable.py`), still builds and passes its tests. It felt too tame, so the ladder replaced it. Its three episodes (gg001 to gg003) are in git history.

## Tech stack

| Area | Tools |
|---|---|
| 3D scenes | Three.js: procedural sets, characters and props in `engine/` |
| Rendering | Node.js, puppeteer-core driving headless Chrome (WebGL2), ffmpeg (H.264 + AAC) |
| Audio | Python, NumPy, SciPy: `audio/synth.py` synthesizes music and foley from a cue sheet |
| Validation and timing | Python 3 standard library, `unittest` |

## Run

Needs Node 18+, Python 3 with NumPy and SciPy, and Google Chrome (or set `CHROME_PATH` to another Chromium browser). `npm install` brings its own ffmpeg.

```bash
npm install
npm run doctor                                      # checks Node, Chrome and WebGL2, ffmpeg, NumPy and SciPy
python3 -I tools/ladder.py gg006-wont-stop-trading  # episode.json -> story.json, cues.json, caption.md
node tools/render.mjs gg006-wont-stop-trading --stills 3,6,9 && node tools/sheet.mjs gg006-wont-stop-trading
python3 -I audio/synth.py gg006-wont-stop-trading   # audio.wav
node tools/render.mjs gg006-wont-stop-trading       # final.mp4
python3 -I -m unittest discover -s tests            # 65 validator tests
```

To make a new episode, write `videos/<slug>/episode.json` (the fields are in the format reference) and run the same steps with that slug. `node tools/render.mjs <slug> --preview` renders a quick 15 fps, half-size draft.

## Project layout

```
engine/    Three.js engine: renderer, character rig, props, sets (engine/sets/*.js), sky, globe
formats/   ladder/ (current) and aitable/ templates: shots, gags, props
tools/     ladder.py and aitable.py (validate + time), render.mjs, sheet.mjs, doctor.mjs, caption.py, bearing.py
audio/     synth.py: procedural music and foley from cues.json
videos/    one folder per episode; _template/ is a minimal 10 s example
tests/     validator tests for both formats
docs/      EDStudio's original style guides (they refer to EDStudio example videos that are not in this repo)
```

## Status

Three episodes are rendered and committed. Each step (validate, stills, audio, render, checks) is run by hand. A one-command batch runner and a posting step are not built yet.

## Credit and license

The engine, renderer, audio synth and tools imported in the first commit are EDStudio, Copyright (c) 2026 Dylan Nguyen ([github.com/dylann4500/EDStudio](https://github.com/dylann4500/EDStudio)), licensed under the PolyForm Noncommercial License 1.0.0 ([LICENSE](LICENSE)). This repo adds the two GGhuman formats (`formats/`), their tools (`tools/ladder.py`, `tools/aitable.py`), the tests, new synth voices (poof, chicken, sheep, chips, robot), a fix in `tools/render.mjs`, and the `videos/gg*` episodes.
