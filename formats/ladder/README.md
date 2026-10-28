# The ladder format

One absurd "What if…?" premise that escalates rung by rung. On each rung the AI says a line, and a gag from a fixed library
makes it physically, ridiculously true: five aces poof onto the table, the table becomes a boat, the casino stands up and
walks off, the planet turns into sheep. 6–12 rungs, 30–40 s, a HUD counter that only climbs, a question end card with
`PLAY THEM FREE · GGHUMAN.AI`.

Episodes: `videos/gg004-words-come-true`, `videos/gg005-keeps-raising`, `videos/gg006-wont-stop-trading`.

## Make an episode

```bash
mkdir videos/gg007-slug && $EDITOR videos/gg007-slug/episode.json   # the only file you write
python3 -I tools/ladder.py gg007-slug        # validate + time it -> story.json, cues.json, caption.md, shots.js stub
node tools/render.mjs gg007-slug --stills 3,6,9 && node tools/sheet.mjs gg007-slug   # look at stills/_sheet.jpg
python3 -I audio/synth.py gg007-slug         # audio.wav; its self-check must say "music dropouts: none"
node tools/render.mjs gg007-slug             # final.mp4
```

`ladder.py` prints the timeline (each rung's window and key moments). The render prints `⚠️ frame:` lines when a head,
bubble or subject lands off-frame; fix each one (usually a `"cam"` override) before the full render.

## episode.json

```json
{ "title": "What if the AI wouldn't <em>stop</em> trading?", "seed": 6,
  "cast": {"you": {"top": "#5b8def"}, "ai": {"name": "ORBIT", "color": "#e8553f"}},
  "hud": {"label": "SHEEP OFFERED", "prefix": ""},
  "rungs": [
    {"place": "livingroom", "gag": "poof", "prop": "sheep", "at": "table", "say": "1 sheep for your wheat?", "sub": "No.", "hud": 1},
    {"place": "street", "gag": "flood", "prop": "sheep", "count": 1000, "at": "road", "say": "1,000 sheep?", "hud": 1000, "react": true},
    {"place": "street", "gag": "say", "say": {"who": "you", "text": "…fine."}, "hud": 1000}
  ],
  "end": {"html": "Would you take the <em>deal</em>?", "small": "PLAY THEM FREE · GGHUMAN.AI"},
  "caption": {"hook": "…", "summary": "…", "cta": "… 👇", "send": "Send this to …", "tags": ["#animation", "…5 total"]} }
```

- `cast.you.top` = the player's shirt (`#rrggbb`); `cast.ai` = the robot's name (1–10 chars, shown on its bubble) and color.
- `hud` = the top-left counter's label (≤ 24 chars) and an optional prefix (`"$"`).
- `seed` (a whole number) = deterministic randomness (scatter, flock layout). Same JSON → same video.

### Rung fields

| Field | Meaning |
|---|---|
| `place` | one of the six places below |
| `gag` | one of the gags below; its required params must be present, unknown params are errors |
| `prop` | what the gag acts on: a prop from the shelf; `you` / `ai` only in a `transform` (each once) |
| `at` | the anchor in this place where the gag happens |
| `say` | the AI's bubble (text, ≤ 24 chars), or `{"who": "you", "text": "…"}` for the player |
| `sub` | an optional subtitle (≤ 60 chars), e.g. the player's "No." |
| `hud` | the counter after this rung; never goes down |
| `react` | the place's extras scream (arms up, mouths open) and run away from the gag; only where there are extras |
| `cam` | override the gag's default camera: `wide`, `close`, `high`, `ai`, `you`, `orbit` |
| `len` | stretch the rung (never shorter than the gag's minimum) |

### Places and anchors

| Place | Anchors | Flood floors | Extras | Notes |
|---|---|---|---|---|
| `casino` | `table` `ai` `you` | `table` | yes | the table and its chips are on screen from the start |
| `livingroom` | `table` `ai` `you` `room` | `table` `room` | — | dining table under a pendant lamp |
| `street` | `road` `curb` `crowd` `pile` `you` `ai` | `road` `pile` | yes | toy-city street; `pile` is where dropped things stack |
| `paris` | `tower` `lawn` `you` `ai` | `lawn` `tower` | yes | the Eiffel Tower and the Champ de Mars |
| `podium` | `lectern` `ai` `you` | — | yes | press-briefing room, cast on the riser |
| `space` | `earth` `orbit` `table` `you` `ai` | `earth` (the planet) | — | the cast floats in front of Earth (no table mesh: the anchor is where they float) |

### Gags

Key moments are seconds from the rung start. `ladder.py` writes them as absolute times into story.json. The 3D template
animates to those numbers and cues.json puts the foley on them, so sound can't drift from picture.

| Gag | Params | Min | Key moments | Default cam | What happens |
|---|---|---|---|---|---|
| `say` | say | 2.6 s | — | close | just the line |
| `poof` | prop, at | 3.0 | pop 0.9 | gag | smoke puff, the prop appears |
| `transform` | prop, to (+at, scale, riders) | 3.2 (+0.2 with scale) | puff 1.0 (grow1 2.4) | gag | the prop (or a cast member) becomes `to`; `scale` grows it, `riders` puts the cast on it |
| `drop` | prop, at | 3.4 | fall 0.6, impact 1.2 | wide | falls from the sky, boom + dust + shake; `prop: "pile"` drops the whole pile |
| `grow` | prop, scale (+at) | 3.2 | grow0 0.8, grow1 2.0 | wide | swells to `scale`×; needs `at` when no earlier rung made it there |
| `walkoff` | prop, at | 3.6 | stand 0.8, walk0 1.2, walk1 3.4 | wide | sprouts legs and walks out of frame |
| `sail` | prop, at (+riders) | 3.4 | go0 0.6, go1 3.2 | wide | sails in from another place, may carry the cast |
| `rain` | prop, count (+at) | 3.4 | fall0 0.6, fall1 2.6 | wide | chips rain down and pile up (`prop` must be `chips`; up to 600 drawn) |
| `flood` | prop, count, at | 3.6 | fill0 0.6, fill1 2.8 | wide | sheep fill a flood floor (above) in layers (`prop` must be `sheep`) |
| `launch` | prop, at (+lands) | 3.4 | lift 0.8, gone 2.2 | wide | blasts off; with `lands` it is there at a later rung's anchor (e.g. on top of the pile) |

A rung is as long as its gag's minimum, or longer when its bubble and subtitle need ≥ 0.3 s per word.

### Props

`five_aces` `gold_chips` `chips` `table` `boat` `chicken` `casino_building` `car` `house` `eiffel` `moon` `grandma`
`sheep` `wheat_card`, plus `you` / `ai` as transform subjects. The lineup at t ≥ 200 shows them all:
`node tools/render.mjs <slug> --stills 200,201,202,203,204,205`.

Each flood shows its real count up to 120 sheep, then `120 + 300·log10(count / 120)`, capped at 1,500 (a million sheep and
8 billion sheep can't be 1:1; the HUD carries the real number). Floods in one place add up: gg006's 1, 2 and 8 sheep
stand together.

## Validation (`ladder.py`, before anything renders)

Every problem is listed at once; nothing renders until the list is empty.

- **Shapes:** the episode is an object; cast colors are `#rrggbb`; hud/title/end are text; `seed` and `count` are
  whole numbers; `scale` 1.5–40; `react`/`riders` true or false; `len` a number; `say` text or `{who, text}`; every
  name field (`place`, `gag`, `prop`, `to`, `at`, `lands`, `cam`) is text.
- **Names:** known place, gag (with its required params, no unknown ones), prop, camera; the anchor belongs to the
  place; `lands` names a real anchor.
- **Continuity:** a prop must be on screen in that place before a rung transforms or grows it; a prop that walked off
  or launched is gone; `sail` needs it on screen somewhere; a `drop` of `pile` needs a pile there; `lands` needs a later
  rung in a place with that anchor. (A prop that a walkoff, launch or grow acts on stands at its anchor from the start
  when no rung made it.)
- **What the template can show:** `you`/`ai` only in a `transform`, and each only once; nothing transforms into them;
  rain is chips and floods are sheep, on a flood floor; the casino's own table and chips can only be transformed until
  a rung makes a new one; a `grow` of a prop nothing made needs `at`; `react` only where there are extras; a `say` rung
  needs its line.
- **Text:** bubbles ≤ 24 chars, subtitles ≤ 60, every line readable at ≥ 0.3 s per word.
- **Shape of the video:** 6–12 rungs, the HUD never goes down, 30–40 s total, end card held 4.5 s.
- **Caption:** hook, summary, CTA, "Send this to…", exactly 5 hashtags including `#animation`, no promo link.

`tests/test_ladder.py` triggers every message the validator can give (all 48). Its `CrossFile` tests fail if the template
and the validator disagree on a prop, anchor, place, gag camera, flood floor or extras place.

## Files

- `tools/ladder.py`: the validator, timeline, story.json/cues.json/caption writer.
- `formats/ladder/shots.js`: builds the six sets in one scene (each parked at its own offset), the cast, the cameras,
  speech bubbles, the framing self-check and the lineup.
- `formats/ladder/gags.js`: `makeWorld()`, every prop instance's life over time (born, moves, piles, falls, walks,
  launches, floods), smoke/rain/sheep pools, the camera focus per rung, crowd reactions and screen shake.
- `formats/ladder/props.js`: the prop shelf.
- Each episode's `shots.js` is the one-line stub `export * from '/formats/ladder/shots.js';`.

## Lessons (each cost a stills round)

- **A 9:16 frame is only ±11–15° wide.** In space the cast faces the lens and close-ups are near-frontal; a 3/4 angle
  swung Earth out of the background.
- **Planet-size floods get a fixed angle (`FLOOD_WIDE`).** The region-aimed wide sat at eye level 70 m off in Paris
  (a million sheep read as a thin band) and inside Earth in space (a black frame).
- **Indoors, dropped and poofed props cap at 2.8 m.** A 5 m house in the casino put the camera inside the house.
- **Big street subjects shoot down the street,** not across it into the facades.
- **The over-the-gag camera can be blocked** by the gold-chip tower, a cast member's head or the pendant lamp. Fix it in
  the episode with `"cam": "wide"` (gg004 rungs 2–3, gg006 rung 1), not in the template.
- **Hide-by-position filters need size limits.** The Paris tower filter first hid the 600 m sky dome (black sky).
  The street hides its front-sidewalk trees, lamp posts and front-lane parked cars because they sat in the lens.
- **Soft-attack foley** (the poof, the baa) needs its anchor at the peak or a `soft` onset label, or the onset check
  flags it as late. Overlapping baas and rain clacks stay flagged (density, not sync).
- **`posOf` in gags.js must stay pure.** The camera calls it too: a `setLegs` side effect there reset the walking casino's
  legs every frame after the camera ran, so it slid on one rigid leg. Stills couldn't show it; a 4 fps strip of the
  render does. The prop's own motion lives in `animProp`, called only by `draw()`.
- **A prop's group sits at the origin until the first draw.** Build-time code reads the stored `pos`, never
  `p.g.position` (a transformed prop appeared at the world origin).
- **`at` in episode.json is the anchor.** In story.json, `at` holds the key moments and `anchor` holds the name.
- **Never put a `//` comment after code on a dense line in scripted edits.** It silently commented out code three times
  in this build. Run `node --check` on a `.mjs` copy after every scripted edit.
