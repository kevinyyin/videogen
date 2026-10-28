# videogen

Template-driven 3D promo Reels for [gghuman.ai](https://gghuman.ai) (play board games against AI), built on the
EDStudio engine: Three.js scene → headless Chrome → ffmpeg. No AI video, no stock footage, no paid tools; every frame is code.

**The format, "the ladder":** one absurd "What if…?" that escalates rung by rung. The AI says a line, and a gag makes it
physically true: five aces poof onto the table, the table becomes a boat and sails down the street, the casino stands up
and walks off, the whole planet turns into sheep. 30–40 s, six places (casino, living room, street, Paris, a press room,
space), a climbing counter and a `PLAY THEM FREE · GGHUMAN.AI` end card. One `episode.json` per video; a shared template
and a gag library do the rest.

**Episodes:** [gg004 — What if everything an AI said came true?](videos/gg004-words-come-true/final.mp4) ·
[gg005 — What if the AI kept raising the bet?](videos/gg005-keeps-raising/final.mp4) ·
[gg006 — What if the AI wouldn't stop trading?](videos/gg006-wont-stop-trading/final.mp4)

- Write-up (workflow, quality checks, failure handling, scaling to 100): [WRITEUP.md](WRITEUP.md)
- Gag library, places, props + how to make an episode: [formats/ladder/README.md](formats/ladder/README.md)

**Format #1, "AI Table"** (`formats/aitable/`, `tools/aitable.py`): toy-sized players on a giant poker table, 15–25 s.
It still builds and is tested, but it read as too tame, so the ladder replaced it. Its three episodes (gg001–003) are in
git history, and the ladder reuses its robot and caption checks.

## Run

```bash
npm install && npm run doctor
node tools/render.mjs _template --stills 1,5,9   # stills -> videos/_template/stills/
node tools/render.mjs _template                  # full render -> videos/_template/final.mp4
python3 -I tools/ladder.py gg006-wont-stop-trading   # episode.json -> story/cues/caption (validated)
python3 -I audio/synth.py gg006-wont-stop-trading && node tools/render.mjs gg006-wont-stop-trading
```

Needs Node 18+, Python 3, Google Chrome.

## Credit and license

The engine, tools and docs imported in the first commit are **EDStudio**, Copyright (c) 2026 Dylan Nguyen
([github.com/dylann4500/EDStudio](https://github.com/dylann4500/EDStudio)), licensed under the PolyForm Noncommercial
License 1.0.0 ([LICENSE](LICENSE)). The GGhuman formats (`formats/ladder/`, `formats/aitable/`, `tools/ladder.py`,
`tools/aitable.py`, `videos/gg*`) are built on top of it in this repo.
