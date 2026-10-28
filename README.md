# videogen

Template-driven 3D promo Reels for [gghuman.ai](https://gghuman.ai) (play board games against AI), built on the
EDStudio engine: Three.js scene → headless Chrome → ffmpeg. No AI video, no stock footage, no paid tools; every frame is code.

**The format, "AI Table":** toy-sized human and robot players on a giant poker table. Chip stacks are towers, cards are
doors, and the dealer is a giant hand. Each episode is a 15–25 s "What if…?" with one big physical payoff and a
`PLAY THEM FREE · GGHUMAN.AI` end card. One `episode.json` per video. A shared template does the rest.


## Run

```bash
npm install && npm run doctor
node tools/render.mjs _template --stills 1,5,9   # stills -> videos/_template/stills/
node tools/render.mjs _template                  # full render -> videos/_template/final.mp4
```

Needs Node 18+, Python 3, Google Chrome.

## Credit and license

The engine, tools and docs imported in the first commit are **EDStudio**, Copyright (c) 2026 Dylan Nguyen
([github.com/dylann4500/EDStudio](https://github.com/dylann4500/EDStudio)), licensed under the PolyForm Noncommercial
License 1.0.0 ([LICENSE](LICENSE)). The GGhuman format (`formats/aitable/`, `tools/aitable.py`, `videos/gg*`) is
built on top of it in this repo.
