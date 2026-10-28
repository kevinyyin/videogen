# AI Table — beat library reference

The GGhuman format. Toy-sized players (a human and 1–2 robots, about 8.7 cm tall) are on the felt of a giant poker
table. Each episode is one `videos/ggNNN-slug/episode.json`. Everything else is generated or shared:

```bash
python3 -I tools/aitable.py ggNNN-slug                                     # validate + story.json, cues.json, caption.md, shots.js stub
python3 -I audio/synth.py ggNNN-slug                                       # audio.wav (self-check: "music dropouts: none")
node tools/render.mjs ggNNN-slug --stills 4,8,12 && node tools/sheet.mjs ggNNN-slug   # look at stills/_sheet.jpg
node tools/render.mjs ggNNN-slug                                           # final.mp4
```

`aitable.py` exits non-zero and lists every problem if the episode breaks a rule. `render.mjs` prints
`⚠️ frame: …` for any key moment where a subject is off-frame, under the HUD, or in the subtitle band while a subtitle shows.

choreography), `pieces.js` (the robot, chips, cards, giant hand and CAPTCHA), `tools/aitable.py` (timeline and validation).

## episode.json

| Field | Rule |
|---|---|
| `title` | the "What if…?" question, `<em>` allowed; on screen alone for 2.6 s |
| `seed` | integer; seeds every random choice (renders are deterministic) |
| `cast` | 2–3 members, exactly one `{"id": "you", "kind": "human", "top": "#hex"}`; robots `{"id", "kind": "robot", "color"}`; `seat` ∈ `near` / `far` / `left` / `right`, unique; optional `stack` (1–300 chips, default 12) |
| `pot` | starting HUD value |
| `hud` | optional `{line1, line2}` (default "NO-LIMIT HOLD'EM") |
| `beats` | 3–4 beats from the library below |
| `end` | `{html, small}`; `small` is the call to action (`PLAY THEM FREE · GGHUMAN.AI`) |
| `caption` | `{hook, summary, cta (with 👇), send ("Send this to…"), tags (exactly 5, incl. #animation)}` |

Fields any beat may carry:
- `say`: a bubble, max 24 characters. A string goes to the beat's `who`; use `{who, text}` otherwise.
- `sub`: a subtitle, max 60 characters.
- `pot`: the new HUD value (it rolls).
- `face`: `{id: neutral|smug|shifty|suspicious|laugh|cry|glitch|"TEXT:…" (≤ 18 chars)}`.
- `cam`: override the camera.
- `len`: fix the beat's length.

Endings:
- `then: "fold"`: the human tosses their cards, +0.8 s.
- `after: "topple"`: the latest tower falls on the human, +1.4 s; needs an earlier `tower` beat.

Duration (title through end card) must be 15–25 s. Every text must give at least 0.3 s per word.

## Beats

Key moments are seconds from the beat's start. `aitable.py` turns them into absolute times in `story.episode`, and both
`shots.js` and `cues.json` use those, so picture and sound can't drift.

| Type | Needs | Min s | Key moments | Camera | What happens |
|---|---|---|---|---|---|
| `deal` | `to` | 3.2 | land = 0.6 + 0.35·i | `wide` | The giant dealer hand drops two cards per player, in turn. |
| `tower` | `who`, `height` | 3.6 | push 0.4, grow0 0.8, peak 2.6 | `tiltUp` | One chip slides into the pot. The stack grows to `height` chips (120 = a skyscraper) and wobbles. |
| `peek` | `who`, `cards` | 3.4 | lift 0.6, reveal 1.0 | `overShoulder` | The human lifts both cards' near edges. |
| `flip` | `who`, `cards` | 3.8 | flip 0.8 | `flipCam` | A robot turns its cards face up, spinning them to face the audience, then laughs. |
| `handshake` | `who: [a, b]` | 3.2 | shake0 1.0, shake1 1.8 | `twoShot` | Two robots walk to the middle and shake. |
| `wall` | `who`, `around`, `height` | 3.6 | rise0 0.5, rise1 2.5 | `high` | 14 chip stacks rise in a ring around `around`. |
| `kick` | `who`, `tower_of` | 3.6 | kick 0.8, topple 1.2, impact 1.9 | `kickCam` | `who` lunges at `tower_of`'s stack. It buries its owner, and `who` scoops the pot. |
| `captcha` | `target`, `text` | 4.0 | slam 0.5, taps 1.4…3.2 | `capCam` | A giant CAPTCHA card slams down. The target sprints over it tapping the aces, then VERIFY. |
| `flick` | `target` | 3.0 | reach 0.3, flick 1.2, land 2.5 | `botCam` → `flickCam` | A robot screen close-up, then the dealer's hand flicks the target off the table. |

Faces change at the beat's start, except at the reveal for `flip` (at the flip) and `kick` (at impact).

## Lessons (each one cost a stills round)

- **Scale the studio for 8 cm figures.** The engine's camera fill sat 25 cm from the figures and washed everything white,
  so it's scaled ×0.1 in distance and ×0.01 in intensity. The casino's pool and key lights overexposed a frame-filling
  felt, so they're dimmed. A Standard felt went white from Fresnel at grazing angles, so it's Lambert with a fine anisotropic grain.
- **Contact shadows need their own light.** A tight directional key (shadow box ±0.35 m) follows the shot. The set's
  shadow maps span metres.
- **Draw bubbles after the depth-of-field pass.** Sprites write no depth, so the blur smeared them as if they were the far wall.
- **Paper is opaque + alphaTest, never `transparent`.** Transparent cards got depth-sorted over the CAPTCHA's lit squares.
- **Scaling a group scales its lift too.** The CAPTCHA at ×0.6 sank under the dealt cards.
- **Frame by the action's geometry.** In a vertical frame the near seat blocks every shot from +x. Shoot the far robot from the +z side
  or elevated, and keep the pot, muck and walls off the camera lines (they turn into foreground blobs).
- **Motion at this scale is tiny.** A laugh needs a hop and flailing arms, and the high camera needs a 22 % push-in. Scan
  every render at 1 fps.
- **Never put code after a `//` comment on the same line.** A scripted edit commented out `d.updateMatrix()` and every
- **`tools/render.mjs` used to drop `console.warn`.** Puppeteer calls the type `'warn'`, not `'warning'`. Fixed; the framing
  check is only useful because of it.
