# Format bible (reverse-engineered from @tinyplanetlab, Oct 2026)

> This is the **emotional** tone. For **funny** videos, the differences are in `docs/TONES.md` (house rules still apply).

## What wins
The account went from ~480 likes ("What if" science sims) to **16K–440K likes** the day it switched to
**family-nostalgia stories**. Top post: *"The last time your dad carried you — told by your hallway"* (440K likes, 1.8K comments).
Comments = people crying + tagging family. **Shareability ("send this to your mom") is the growth engine.**

| Post | Likes | HUD |
|---|---|---|
| The last time your dad carried you — told by your hallway | 440K | NIGHTS HE CARRIED YOU 35 · YOU'RE 3 · 31 LB |
| What your parents do the week after you move out — told by your childhood bedroom | 192K | SINCE YOU MOVED OUT · DAY 1 · WAITING FOR YOUR CALL |
| What your grandma does the day you visit | 156K | GRANDMA'S KITCHEN 5:02 AM · YOU ARRIVE AT 6:30 PM |
| What your little sister does after you move out — told by the wall between your rooms | 130K | UNTIL YOU'RE HOME 95 DAYS |
| What your little brother does after you move out | 120K | HIS HEIGHT 5'4¾ |
| What happened to your childhood best friend | 39K | YOUR AGE 7 |
| What your mom did the night before your first day of kindergarten | 27K in 3 h | UNTIL THE BUS 10:08 · YOU'RE 5 |
| How many times you'll see your parents again — told by the porch light | 18K | VISITS LEFT 53 |
| Your dog's whole life, in its own words | 4.5K | MY AGE 56 DAYS |
| What if every volcano erupted at once | 487 | — |

## The template
1. **Opening (house rule):** the main question ALONE, centered in the middle of the screen, serif, one keyword in gold, ~3 s —
   "What your [person] did/does [moment]" or "The last time [X]". ≤ 12 words. Nothing else on screen until it fades.
2. **No "TOLD BY YOUR ___" tag or any subtext/tagline** (house rule — the reference account uses one; we don't).
   An object can still be the silent witness in the visuals (same room across decades) — just never as text.
3. **HUD (small, top-left, steady opacity — never pulses or dims):** small-caps label + big serif number that *means something* (nights, visits left, days until, height, age),
   plus a time line and an age line. It rolls fast across time skips and lands on the final beat (+1, 0, gold flash).
4. **Subtitles:** small italic serif with a strong shadow + soft dark backdrop (readability first), second person ("you/your"), one short line at a time, hyper-specific details
   ("eleven times", "24 crayons", "no onions", "41 pictures").
5. **Structure (60–80 s):** ritual established → repetition across ages (2–4 eras) → the change (you leave / grow up / stop) →
   they keep doing it anyway → time skip → reversal/reunion that echoes shot 1 → one quiet final line.
6. **Look:** toy-like characters (big heads, dot eyes, capsule limbs), cozy rooms, warm practical light vs cool moonlight,
   slow push-ins, soft handheld drift, tears as thin glowing streaks, gray hair + glasses to show aging.
7. **Sound:** soft solo piano + a *few* quiet foley sounds on story beats (door latch, soft steps, blanket tuck). Minimal — the
   user found dense/bright SFX harsh. No ticks, whooshes or chimes. Music swells at the reveal. No voiceover.
8. **End card:** fully readable for ≥ 3.5 s before the video ends (user feedback — 001's was too short).
9. **Caption:** hook + emoji / 2–3 sentence summary / question CTA + 👇 / "Send this to your ___" / blank line / exactly 5 hashtags incl. #animation.
   No promo/course line (`tools/caption.py` rejects one).
10. **Cadence:** 1–2 posts per day. Post a "part 2" only for concepts that clearly overperform.

## Originality rule
Copy the **format**, never their specific concepts (dad carrying you, grandma cooking, siblings after you move out, porch-light
visits math, best-friend handshake, kindergarten crayons, dog's life, parents the week after you move out).

## Other reference accounts
- `docs/reference/simplysimulated.md` — @simplysimulated (841K likes on "what if all men disappeared?"): a countdown, then a time-stamped
  consequence ladder (+10 SEC … +25 YEARS). The user likes it. In house style, keep the ladder in the HUD time line and follow one human thread through it (003).
- `docs/reference/realityrendered.md` — @realityrendered__ (71K in ~a month): "What if you [verb] [extreme physical thing]?" science POVs.
  Best lessons: title gone by ~3–4 s, one continuous camera move, a new text line every ~5 s, **seamless loop back to frame 0**,
  subtitles centered at x≈45 % to clear IG's right-side buttons.
- `docs/reference/whatiflab.md` — @what.if.lab_ (441K-like "gravity off for 10 seconds"): toy city + crowd, deadpan narrator
  lines, HUD sub-line that changes every beat, scale-out to 8 billion at the end. The user's style inspiration for funny sims.
- `docs/reference/whatifpov.md` — @whatifpov (264K-like hit in week 1): "What if your X doubled every 3 seconds?" on the viewer's own
  body/life. Lessons: cold open on the climax → quick rewind → fixed 3 s beat clock (one doubling = one shot = one line),
  a comparison line under the counter ("faster than Usain Bolt"), last frame matches frame 0 for a seamless loop.
