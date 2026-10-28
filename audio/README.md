# audio/synth.py — procedural score + foley (royalty-free, numpy/scipy only)

    python3 -I audio/synth.py <video>        # reads videos/<video>/cues.json -> videos/<video>/audio.wav (+ out/stems/)
    python3 -I audio/synth.py --dump-cues    # print the full default cue sheet (every option, documented by example)
    python3 -I audio/synth.py                # regenerate the reusable SFX pack in audio/sfx/

## House style (from user feedback — follow it)
- **Minimal and soft.** Piano leads; foley is a whisper underneath. ~8–15 events per minute, not 60.
- Keep only sounds that sell a story beat: a door latch, a few steps when someone enters, the blanket tuck, one prop.
- **No** counter ticks, whooshes, swishes, chimes, clock ticks, sleigh bells or crickets unless the user asks.
- Foley bus low-passed (`"sfx_lowpass_hz": 4200`), sfx stem around −9 dB, ambience around −8 dB, master ≈ −15 LUFS.
- Copy `videos/001-bedroom-door/cues.json` (emotional) or `videos/002-everyone-pregnant/cues.json` (funny) as the starting point.

## Match the music to the reel's vibe (user rule)
Pick the score from what the story *feels* like, not from the last video: tender family story → soft piano (001); comedy →
bouncy piano (002); curious science → mallet explainer; **high-stakes / ominous world what-if → cinematic drama (005)**.
005 took three tries: 001's sad piano ("too sad"), a calm mallet explainer ("too calm for how dramatic/ominous it is"), then this.

## Dramatic world tone (005) — cinematic, ominous
- `style: "strings"` = low spiccato string-section ostinato (the "Zimmer drive") on the chord: `step` 0.125 (16ths at 120 bpm),
  `pattern` indexes [bass, chord tones], `accent` per-step multipliers, **`octave: 1`** (an octave up — at the raw register the
  drive sits at 40–110 Hz, which K-weighted loudness and phone speakers barely register), `sustain` adds a held upper chord,
  `len` = note length in steps (≥ 0.9 for slow pulses so there are no gaps). Level with `strings_db` (005: +8).
- `drums: [[t, vel, kind]]` single hits and `drum_patterns: [{t0, t1, step, pattern: [vel mult...], vel, kind}]`; kinds
  `taiko` (warm low boom), `tom` (rolls into a hit), `boom` (huge sub hit: midnight / the reveal / the end card), `tick`.
  Soft, low-passed, no snap. Drums are ~7× louder than strings per note, so set `drums_db` low (005: −7) and re-check the arc.
- Pad `notes: [26, 38, 45, 50, 57]` + `"hp": 30` = sub drone you can also hear on a phone (the pad's default 110 Hz high-pass
  removes anything lower). A "braam" = the same with more low notes, `level` 1.5, `attack` 0.15, on the reveal.
- Arc (LUFS per shot from the synth's table): quiet tension (−20) → hit (−14) → eerie dip that still has a drone (−22) →
  build (−17 … −12) → reveal (−12) → darker close (−17). Read the per-shot table after every change.
- Soft mallet voice (`ostinato` style, `mallet_melody`, `mallet_db`) is still there for calmer curious/science reels.
- Reference script: `videos/005-no-nukes/make_cues.py`.

## Sound identity per video (user steer, Oct 22)
EDStudio makes sims of every kind; the soundtrack must not sound like the last video. Choose per video:
| type | voice | bed / foley |
|---|---|---|
| emotional (001, 003) | soft piano (`instrument: "piano"`, held/arp/cadence) | room tone, a few quiet foley hits |
| funny (002) | bouncy piano (`style: "bounce"`) + pad | city murmur, cartoon boops |
| montage / science / tech (007) | **synth plucks** `instrument: "pluck"` (or `"bell"`) + `echo: {delay, feedback, mix, lp_hz}` + pad | **a different bed every scene** + synced foley |
| wacky funny (012) | "mischief": pizzicato `strings` (len 0.45, 8ths at 104 bpm) + mallet "uh-oh" (falling minor third) per beat, E minor → warm C/G turn | the room's chatter cuts at the moment, a low cartoon boop, shutter clicks, a soft dog "hmph" |
| physical-premise montage (018 magnetic) | "magnetic heist": E minor 112 bpm `strings` 8ths drive + soft mallet ostinato + a rising 4-note mallet "pull" motif per beat, taiko on 1+3, braam + boom at the premise, a boom on every pile-up; G-major lift for the rebuild, warm piano arp for the ending | one soft `metal_clang` per splat (size/pitch vary), tiny clinks for cutlery/mics, a cart rattle (`keyboard_type` rate 16–22), cabin roar + wheel clacks on the subway, a rain of small clangs in Paris |
| dance montage (019 can't stop dancing) | **soft piano house**: A-minor Dorian vamp (Am7–D7) at 120 bpm locked to the picture's beat clock — `kick` four-on-the-floor + `clap` on 2+4 (new soft drums), `disco` style = octave-bouncing piano bass in 8ths + off-beat chord stabs, a catchy 2-bar mallet hook every other phrase ("the song in 8.2 billion heads"), a lift (Fmaj7–G–Em7–Am7) for the big drop, half-time warm arp + the hook slowed on piano for the ending | a silent library open (room tone, page turns, rubber stamps) → riser → the beat drops on the premise; foley on the beat grid: chair thuds, tray clinks, mask fwumps, conga steps, a can avalanche, shutter clicks, a coffin catch, spoon clinks + a bowl bonk, a stadium roar + quake rumble |
| funny-dramatic (010) | mock-epic strings + taiko march, booms on impacts | heavy soft foley: giant steps, snaps, crunches, groans |
| world (005) | soft **mallet** ostinato (`style: "ostinato"`), curious documentary feel | scene beds per location |
| biography, 1800s America (009) | **Americana**: dulcimer-like `mallet` `ostinato` + a pentatonic folk-hymn piano theme in G (a `theme()` helper places it per era), minor turn for the dark beat, `strings` + soft taiko for the war, hymn `arp`/`held` at the speech, solo piano at dawn, full `swell` at the memorial | a bed per era (wind/snow, room tone, dry leaves, crowd murmur, applause, cheer) + wood knocks on the axe, far `distant_boom` per cannon, `pen_scribble` on the signature |
| funny montage / "sus" (008) | **sneaky pizzicato**: `instrument: "pluck"` + `style: "bounce"` in D minor + a creeping chromatic `mallet_melody` motif per place, warm major arp for the ending | scene beds + soft low `plush_squeak` boops synced to each card/row appearing |
| talking pets / gossip (016) | **gossip jazz**: piano `style: "walk"` (walking bass in quarter notes at ~133 bpm + soft off-beat comps pushed late by `swing`), F major ii–V loop (Fmaj7 Dm7 Gm7 C7), a 4-note vibes `mallet_melody` "psst" motif opening every beat, one long drone pad under it; warm slow arp for the ending | a pet voice on every speech bubble (`dog_bark`, `cat_meow`, `parrot_chirp`, `fish_blub`, `hamster_squeak`), a party's chatter that stops dead at the reveal, a big soft impact ending each beat |
- Successful sim accounts are often **SFX-led** (little/no music, realistic immersive sound). 007 runs 6.6 s with no music at all —
  just a street — and the synth enters on the premise. You may go music-free for a whole video if the sound design carries it.
- Plucks decay fast: **never use `held`/`cadence` sections with `pluck`** (they leave gaps) — use slow `arp` (step 0.375–0.75)
  and a louder pad bed (`pad_db` ≈ +1, `level` 0.55–0.8).
- New in 016: section style `walk` (`step`, `bass_hold`, `bass_vel`, `comp_vel`, `stab_hold`, `swing` in steps) and pet voices
  `cat_meow` (pitch, dur), `parrot_chirp` (pitch), `fish_blub` (n_bub), `hamster_squeak` (pitch) — all round + low-passed (≈ −25…−28 dB).
- New beds: `applause` (density), `crowd_cheer`, `traffic_flow`, `rocket_rumble`, `turbines`. New events: `car_pass` (t = closest
  point, Doppler), `chalk_write`, `pen_scribble`, `low_swell` (anchor = peak). Sync event times to the picture (007 computes car
  crossings from the same formula as shots.js).
- Raise `stem_gain_db.sfx/amb` (≈ −4/−3) for SFX-led mixes; keep `sfx_lowpass_hz` ≤ 6000 so nothing gets harsh.
- Self-check: the synth prints `music dropouts: none` — anything else must be fixed before muxing. It also prints the grouped
  `dropout ranges` (009) so you know which section to fill: a pad region whose `attack` starts too slowly after the previous one
  ends, a decayed `sparse`/`held` section (raise the pad there), or a gap at a pad hand-off (add a soft pickup melody note).
- Pluck + `bounce` leaves 50 ms holes between stabs (dropout check fails even with chord pads — they crossfade at chord changes).
  Fix (008): one long drone pad region under the whole groove (`level` ≈ 0.85) + `pad_db` +1; patch a last stray dip with a soft
  pickup note. With a dense groove, pull `stem_gain_db.music` to ≈ −21 so beds/boops sit ~15 dB under it instead of ~30.
- The onset checker flags overlapping/gradual sounds (car passes, stacked scribbles) as "--"; that's expected for beds of sound.

## Sneaky lounge swing + wag trills (015)
- No swing style in synth.py, so 015 writes the groove note by note into `melody` (5th element = note length): a walking bass
  (root, step, fifth, chromatic approach; quarters at 112 bpm, B-flat I–vi–ii–V one chord per bar) + soft comp stabs on 2 and 4
  + a swung "and-of-4" push every other bar, over ONE long low drone pad (`level` 0.85, `pad_db` +1.5) → `music dropouts: none`.
- Signature per lie: a fast two-note `mallet_melody` trill (10 notes, 62 ms apart, climbing a step each beat) + a "fwip-fwip" of
  short soft `blanket_rustle`s (dur 0.12, softness 0.75) on the frame the tail starts wagging. Reference: `videos/015-tail-lies/make_cues.py`.
- Gotcha: `mattress_sit` with `args: {dur: 0.3}` crashes the synth (broadcast error) — use its default length.
- Balloon pops = `bonk` (dur 0.18) + a quiet paper rustle; a rotor = `giant_step` (size 0.22, ground) thumps at every half turn
  computed from the same spin curve as shots.js + `turbines` underneath; a jar smash = `car_crash` at `weight` 0.12.

## Open quiet, then the music enters (user steer, Oct 23)
Start every video with only subtle sound — a room tone, crickets, a snore, a street — and let the score enter on the premise beat
(007 at 6.6 s, 010 at 4.2 s with a braam + boom). The "music never cuts out" rule applies from the moment it starts.

## Gotcha: drum hits are on the MUSIC bus (012)
A `drums` hit placed before the first note makes the music "start" there, so the dropout check flags the gap after it. Put the
first drum hit on (or after) the music's entrance.

## Mock-epic (010, funny-dramatic) — a "kaiju march"
- C minor, 90 bpm: `strings` stomp pattern `[0,0,0,1,0,0,2,0]` in 8ths (octave 1, sustain 0.3), soft `taiko` on the beats like
  footfalls, a braam (pad `notes` low, level 1.5) + `boom` the moment the premise hits, a `boom` on every collapse, a `tom` roll
  into a grand major lift (Eb) for the rebuild, then it deflates to slow pulses for the final joke. Deadpan text + epic score = funny.
- New foley: `giant_step` (size, surface 'wood'), `wood_snap` (size), `bonk`, `metal_groan` (pitch, dur) + existing `car_crash`.
- **Heavy-foley balance:** with strings at +8 dB the foley vanished (sfx 30 dB under the music). What worked: stems
  `music −6, sfx +13, amb +10`, sfx limiter `−4 dBFS`, `auto_duck {db: −4, categories: ['prop']}` → impacts land level with the score
  (margin ≈ 0 dB, peaks ≈ −8 dBFS). Read the synth's "foley-over-music margin" line; for impact-led reels it should be ≥ −6 dB.
- Reference script: `videos/010-giant-height/make_cues.py`.

## Twin videos share a family, not a cue sheet (013 vs 007)
013 (twice as dumb) keeps 007's `pluck` + echo voice so the pair feels related, but changes everything else: F major `bounce`
oom-pah (step 0.4, `bass_hold 2.2`, `stab_hold 1.3`) with a chromatic slip (F – F#dim – Gm – C7), a 3-note descending "wrong"
motif at each beat, a lift to Bb for the twist, half-speed arp for the punch line. Plucks decay, so the pad carries the floor:
`pad_db +3.5`, each pad chord overlapping the next by 0.35 s (`attack 0.15`, `release 0.6`).
- **Gotcha: `auto_duck` + a gap in a plucked groove = a dropout.** A crow caw landing in a bounce gap right before a chord change
  dipped the music stem ~12 dB (flagged at 40.7 s). Move the foley 0.2 s off the chord boundary (or soften the duck) and re-run.
- New foley: `keyboard_type` (dur, rate — soft low key taps), `crow_caw` (pitch — round, low-passed). Reference: `videos/013-twice-as-dumb/make_cues.py`.

## Funny tone (002) — same softness, different timing
- `style: "bounce"` section = "oom-pah" piano (bass on 1+3, soft chord stabs on 2+4), `step` 0.5 s = 120 bpm; note lengths
  `bass_hold` (default 1.6 beats) / `stab_hold` (0.8) — keep them long enough that the groove doesn't sound choppy.
- Melody entries take an optional 5th element = note length: `[t, midi, vel, false, 0.16]` → staccato motif.
- **Never let the music drop out** (user feedback on 002: hard −40 dB rests before punch lines sounded like the music
  "cutting in and out"). Punch lines get at most a gentle `ducks` dip (`db: -4`, `ramp` ≥ 0.3), plus one soft low `stings`
  note (midi 36–41, vel ~0.33) as the button. Keep a quiet pad bed (`level` ~0.32) under staccato sections so there are no gaps.
- Check before muxing: compute 50 ms RMS windows of `out/stems/music.wav` — nothing mid-video should sit > 10 dB below the median.
- Cartoon moment ("bellies pop"): 4–5 `plush_squeak` with `pitch` 0.55–0.8, −27 dB, staggered 60 ms — soft boops, not boings.
- Turn warm for the ending (arp + pad) so the last line lands sincerely.
- Ambience `city_day` (`murmur`, `traffic` args): far traffic rumble + indistinct crowd murmur, around −44 dB.
- Generate long cue sheets with a small script (`videos/002-everyone-pregnant/make_cues.py`) rather than hand-typing JSON.

## cues.json schema (short)
- `duration`, `target_lufs`, `stem_gain_db {music,sfx,amb}`, `sfx_lowpass_hz`
- `ambience`: `[{sound, t0, t1, fade_in, fade_out, gain_db, args?, seed?}]` — sounds: room_tone, city_day, applause, crowd_cheer, traffic_flow, rocket_rumble, turbines, crickets, clock, wind, dry_leaves, rain_window, sleigh_bells, lamp_hum
- `events`: `[{t, sound, args?, gain_db, pan, room?, hall?}]` — sounds: door_open, door_close, latch_click, footstep, floorboard_creak,
  blanket_rustle, mattress_sit, car_pass, chalk_write, pen_scribble, low_swell, plush_pickup, plush_squeak, plush_place, phone_pickup, phone_set_down_wood, lamp_switch_click,
  counter_tick, gold_chime, whoosh_timeskip, flash_swish. Generators: `{sound: "footsteps", t0, t1, pan0, pan1, gain_db}`,
  `{sound: "tick_roll", t0, t1, peak_rate}`.
- `music`: `instrument` (piano|pluck|bell), `echo`, `chords [[t, "F"], [t, "C/E"], ...]`, `sections [{t0, t1, style: held|arp|thin|pulse|swell|sparse|cadence|bounce, vel, ...}]`,
  `melody [[t, midi, vel, octave_double?]]`, `pad`, `stings`, `eq`, `auto_duck`.

## Sound-design-led mix (whatif tone, 006) — little or no music
- The **places** carry the sound: `city_day` split into a voices layer (`murmur 1, traffic 0`) and a traffic layer (`murmur 0`)
  so the crowd can go silent on a beat while the street keeps rumbling; `room_tone` indoors; `wind`, `dry_leaves`.
- Music = a pad bed only (`pad` level ~0.25, leveler `ratio 1.0`), ~9 dB under the ambience; piano `sections` start on the last
  beats. Stem gains that balanced it: `music -16, sfx -2, amb +4` → LRA ≈ 6–8 LU, every shot window −16…−19 LUFS, ending −13.
  Check the per-shot table: if the ending sits > 4 dB above the ladder (LRA > 12), pull the music stem down.
- New SFX: `car_horn` (`dur`, `pitch`, `distance` → darker + more verb). Use 1–2, far away, ≤ −31 dB.
- `car_crash` (`weight`): low thump + short crunch + rattles, low-passed (≈ −24…−29 dB). `distant_boom` (`size`): far
  explosion, soft onset, long outdoor tail (≈ −24 dB). A stuck horn (`car_horn` `dur 3.3`) after a crash sells the aftermath.
- Hums (`lamp_hum`) get loud fast — keep them ≤ −50 dB or they become the loudest thing in the shot (006 capsule hit −12.7 LUFS).
- Don't put an event at t < 0.03 s (verify() slices a window before the cue and crashes on an empty array).
- Generate the sheet with a script (`videos/006-memory-loss/make_cues.py`).

## Physical-premise impacts (018 magnetic)
- `metal_clang` (`size` 0.2–1.7, `pitch` 0.7–3): small = a clink (cutlery, mics; −30 dB), 1.0 = a body on steel (−21…−24 dB),
  1.3–1.7 = the beat's big pile-up (−17…−19 dB, with a `boom` drum on the music bus). Low-passed inside the generator — never a ping.
- A piano-arp ending after a loud strings drive sat 6–8 dB under the rest (LRA 9, dropouts at the hand-off). Fix: arp `vel` ≈ 0.45,
  chord pads `level` ≈ 1.9 with `attack` 0.12, melody doubled at the octave, one soft pickup note over the stray dip → LRA 4.5, none.
- Reference script: `videos/018-magnetic/make_cues.py`.


## Money stroll (dh001) — a walking bass for a video about walking
- Piano `walk` style in G major at 120 bpm (Gmaj7 Em7 Am7 D7, one chord per bar), drone pad (`notes [43, 55, 62]` = G2 G3 D4,
  `level` 0.85) under chord pads at 0.55; the groove ENTERS on the hero's first footfall (the premise) with a two-note mallet
  "coin" blip (G5 → D6, short, vel ≈ 0.3) + a tiny `metal_clang` (`size 0.18, pitch 2.6`, −29 dB) — a soft tink, not a ka-ching.
- Every beat opens with a 3-note mallet arpeggio that starts one scale step higher than the last (prices climbing).
- New SFX **`phone_buzz`** (`dur`): a phone vibrating on a wooden table — ~150 Hz motor hum + soft table rattle, low-passed
  1.8 kHz. −26 dB in a quiet room is plenty (it's the loudest thing in the open).
- Foley mirrors the picture's gait math (`footfalls()` in make_cues.py): seven office workers in sync = one footstep per shared
  footfall; twelve subway marchers = one `giant_step` (size 0.28) per stomp; dense crowds = a `footsteps` bed at 8–14 /s
  (the onset checker flags those as "--", expected). Levels as 016 (`music −6, sfx +12, amb +9`) → −15.0 LUFS, LRA 5.6,
  no dropouts. Reference: `videos/dh001-dollar-per-step/make_cues.py`.

## Ant march (dh002) — curious mallet ostinato for an animal what-if
- E minor at 112 bpm: `ostinato` (mallet, 8ths, pattern [0,2,1,4,2,1,3,1]) on Em7–Cmaj7–Am7–B7, a drone pad + chord pads,
  a soft `taiko` on beats 1 + 3 (`drum_patterns`, `drums_db` −9) from the first "march" beat on, a 3-note rising mallet pickup
  opening every place, a `boom` + low sting on the growth (the music's entrance) and on each big set-down.
- Warm turn at +1 year: piano `arp` in G (G – D/F# – Em7 – Cmaj7) with chord pads at 1.6 and a 6-note melody into the card.
- Ants are heard, not shown with SFX gimmicks: the `footsteps` generator at rate 9–18 and −29…−41 dB is a convincing
  pitter-patter of six legs; a lifted fridge = `metal_groan`; set-downs = `giant_step` (wood) + a low `metal_clang`.
- Result: −15.0 LUFS, LRA 3.4, quiet open at −20 LUFS, `music dropouts: none` first try. Stems `music −6, sfx +12, amb +9`.

## Dance tone (019) — soft piano house on the picture's beat
- One beat clock for picture AND score: shots.js `M1` (beat 0) + `BEAT` (0.5 s = 120 bpm); every dancer moves on it, and
  make_cues.py places the kick/clap/stabs/hook and every foley hit with `beat_t(n) = M1 + n·BEAT`. Synchrony is the joke —
  the crowd hits the kick.
- New: drum kinds `kick` (short round thump, 120→48 Hz) and `clap` (three low-passed noise bursts + tail, band 700–2300 Hz —
  no crack), section style `disco` (`step` 0.25: bass, bass+12, … + stabs on every "and"; `stab_vel`, `stab_hold`,
  `bass_hold`, `stabs: false`). A kick on every beat keeps the music stem dense → `music dropouts: none` without tricks.
- Levels that worked: stems `music −6, sfx +12, amb +8`, `drums_db −6`, `mallet_db −2`, pad chords `level` 0.62 under the
  groove and 1.7 for the piano-arp ending → −15 LUFS, LRA 3.7. Reference script: `videos/019-cant-stop-dancing/make_cues.py`.
