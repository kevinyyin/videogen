# Tones: emotional vs funny

Every video declares its tone in `story.json` → `"tone": "emotional" | "funny" | "world" | "montage"`. Both tones use the same engine,
the same text kit (centered serif question, small top-left HUD, italic subtitles with shadow + backdrop) and the

| | **Emotional** (`videos/001-bedroom-door`) | **Funny** (`videos/002-everyone-pregnant`) |
|---|---|---|
| Title | "What your [person] did [moment]" | "What if [everyone / you] [absurd but physical premise]?" |
| Protagonist | a parent seen through *you* ("your mom") | a recurring **everyman with a name** (Gary) + a crowd |
| HUD number | something sentimental (nights, visits left) | a **progress clock** for the premise (weeks, days, %) + a deadpan stat line that changes every era ("PICKLE JARS LEFT ON EARTH 1") |
| Structure | ritual → repetition across ages → change → time skip → reunion | normal baseline → the premise hits → **one gag per era (rule of escalation)** → everything peaks the same day → twist ending |
| Shot length | 4–9 s, slow push-ins | 2.5–8 s, **hard cuts** (no dips to black), a new gag every ~6–8 s |
| Subtitle voice | tender, specific ("She checked on you eleven times.") | **deadpan narrator**, specific absurd numbers ("Earth runs out of pickles in 41 minutes.") |
| Acting | slow, small (lean, tuck, a tear) | **big readable poses, everyone in sync** (whole crowd looks down / turns heads / freezes at once) |
| Faces | smile / closed eyes / tear | flat mouth (deadpan), `mouth: 'o'` (shocked), green skin (nausea), the stare at camera |
| Music | soft piano held/arp, swell at the reveal | **bouncy piano** (`style: "bounce"`) over a quiet pad bed, a staccato melody motif per era, one soft low "plonk" sting as the button — **music never drops out** |
| Foley | door, steps, blanket | still minimal: crowd steps, soft low "boops" (plush_squeak, pitch 0.55–0.8) for a cartoon moment, a plop |
| Ending | reunion that echoes shot 1, a quiet line | the premise resolves + **one warm turn** that makes it shareable ("And every single human calls their mom." → "Call your mom. Say thank you.") |
| Caption CTA | "Send this to your mom" | "Send this to the Gary in your life" / "Tag someone who…" |

**Every tone (house rule): show what the subtitle says, in its own scene** — many locations per video, never one set on repeat.
**And the music fits the reel's vibe** (tender / funny / curious / ominous) — choose it per video (audio/README.md).

## Funny: the rules that made 002 work
1. **One named everyman.** "Yes. Even Gary." A name + a mustache + a bald head = instant character. He gets the gag in every era
   (hot dog → trash can, last pickle jar, can't reach shoes, last in the bathroom line, baby + phone). Recurring character = the
   comedy version of the emotional "ritual".
2. **Synchrony is the joke.** 8 billion people doing the same thing at the same moment: all stop, all look down, all bellies
   pop, all heads track the guy with the last jar, the whole line shuffles 20 cm at once. Code it as one keyframe shared by the
   crowd with a tiny per-person delay (`e.seed * 0.12 s`).
3. **Setup line → beat → visual punch.** The subtitle sets it up, the picture delivers (Gary stares at the camera, gives up,
   grabs his own belly), a soft low note buttons it. Never put the punch in the text when the picture can do it.
   **Do NOT stop the music for the beat** — the user heard 002's first-cut −40 dB rests as the music "cutting in and out".
   At most a gentle −4 dB dip with a slow ramp (≥ 0.3 s).
4. **Specific absurd numbers, deadpan.** "41 minutes", "2.1 miles · 3.4 km", "since July". The HUD's second line is a running
   joke stat, swapped each era. Label units both ways (whatif reference lesson).
5. **Rule of three.** Three reaches for the shoe, three rocks to stand up, the third one fails.
6. **Visible time skip.** Seasons on the set (spring → summer → autumn leaves → snow) + the HUD date.
7. **Land on warmth.** The last 8–10 s turn sincere (one warm music section) so people share it. Funny but kind — never mean,
   never gross; body comedy stays cartoon (no fluids, nothing medical on screen).
8. **Cartoon readability over realism.** Bellies are big from week 1 (`belly` 0.7) so the premise reads in a thumbnail; arms
   splay around the bump automatically (rig).

## Emotional: see `docs/FORMAT.md` (the original style bible).

## Choosing a reference
- Funny "what if" crowd sims: `docs/reference/whatiflab.md` (@what.if.lab_, 441K-like gravity reel), `docs/reference/whatifpov.md`.
- Emotional family stories: `docs/FORMAT.md` (@tinyplanetlab).
- Science/scale POVs: `docs/reference/realityrendered.md`.

## World: big thought experiments about the whole planet
`"tone": "world"` — "What if every nuclear weapon disappeared?" (`videos/005-no-nukes`). A hologram Earth whose dots ARE the HUD
number, intercut with a different real-world scene for every claim (silo, capsule, sunrise city, marching soldiers, border post,
tank hangar, power plant), Day-1 relief → the consequence nobody expected → time skip → the number comes back by one → a debate
question on the end card. **Vibe follows the subject:** 005 is ominous/high-stakes, so its score is cinematic drama (low string drive,
soft taiko drums, sub drones, a hit at midnight and a braam on the reveal, D minor); a lighter science what-if would use the
curious mallet ostinato instead. Never default to the sad piano. Real numbers only, sourced and current; neutral on real countries.
Full playbook: **`docs/WORLD-WHATIF.md`**.

## Montage: the premise everywhere at once (`videos/007-twice-as-smart`)
`"tone": "montage"` — "What if every human became twice as smart?" The user wants these sims to **show the effect in lots of
different places instead of hovering around one scene**: every beat = a new location + one or two subtitles + a HUD time stamp
(SECOND 0 → +1 MINUTE → +1 HOUR → +1 DAY → +3 MONTHS → +1 YEAR → +5 YEARS → +12 YEARS → +20 YEARS), ~5.5–6 s each, hard cuts.
- Open on an ordinary place, show the premise *happening* (007: a blue glow wave passes through every head, the crowd strikes the same
  "hmm" pose), then escalate small → personal → societal → planetary (classroom → traffic → phones → peace deal → cures → energy → Mars).
- HUD: the premise number (AVERAGE HUMAN IQ 100 → 200) + the time stamp line + one stat line per beat ("TRAFFIC JAMS 0", "PEOPLE ON MARS 10,000").
- Keep each beat's action **one readable picture** (the board filling up, cars zippering, phones going down in sync, a banner + confetti).
- **Show the spectacle, don't just state it** (user steer on 007's first cut: "I want to see more cool stuff — cities growing,
  the Mars city actually being built"). Big claims get a TIME-LAPSE beat: build-ups with growth handles (towers rising with a crane
  riding the top, domes/tubes/solar fields popping up in order), fast day/night cycles (`city.setTime({day})` with cos), dusk → lights on.
  Budget ~6–8 s for each spectacle beat; they're the shareable moments.
- End on a human-scale button that undercuts the grandeur (+20 years… "Almost." — a genius loses to a fitted sheet), then a comment-bait
  question card ("What would you invent first?").
- Sound: its own identity — synth plucks + echo, a scene-specific bed per beat, synced foley (see audio/README.md → Sound identity).
- **Funny montage (008, search history over every head):** the premise is a visible prop (a search card per head), and each
  place gets ONE card that is the punch line (Gary's pigeon searches, "what does GDP stand for" ×5, the surgeon's spleen
  search). The subtitle sets it up, the card delivers. HUD number = the social cost (PEOPLE MAKING EYE CONTACT 8.2 B → 0 → 8.2 B),
  the stat line is a new joke per place. Warm turn: grandma says thank you to the search bar → "everyone is weird, so nobody is."
  User steer on v1: "make it weirder, more unhinged… sus". The searches should allude to what search-history jokes allude to:
  innuendo, "how to delete search history" panic, "how to get rid of a body (asking for a friend)", grandma's "SINGLE GRANDPAS
  NEAR ME". Suggestive, never explicit; nothing involving kids (the kids' cards stay innocent).
- **Counterpart montage (013, "twice as DUMB" — the funny twin of 007):** keep the twin's energy (same ladder, ~5 s beats,
  spectacle beats, same synth family) but flip every beat into a dumb consequence, and (user steer) **make it informative: every
  beat's HUD stat line is a real, sourced number about a bad outcome** ("SCAMS ALREADY TAKE $1 TRILLION / YEAR", "ROAD DEATHS
  1.19 M / YEAR · BEFORE TODAY", "FLIGHTS IN THE AIR ~100,000", "WORLD ECONOMY $117 TRILLION · AT STAKE") — the subtitle is the
  gag, the HUD is the fact. Web-search each number; list sources in the shots.js header + caption.md comment. A science twist works
  as the final turn (IQ is normed to 100 → the HUD rolls 50 → 100: "technically… nothing changed"), then the 007 callback ending.

## What-if ripple ladder (`"tone": "whatif"`, `videos/006-memory-loss`)
A sibling of **montage** (007): same many-places ladder, but each beat is a *consequence* with a real mechanism, the HUD number
crashes and climbs back, and the mix is sound-design-led (no score until the ending).
User steer (after 003): global what-ifs should show **the resounding effects in many places**, not one character's angle.
Reference: `docs/reference/simplysimulated.md` (841K likes). Not every video has to be emotional.
1. **One consequence per place, ~6 s each.** 006: New York street (everyone stops at 9:00) → the same street, two strangers
   (+10 s) → Seoul, cars stopped at a green light (+30 s) → Sydney bedroom (+2 min) → a phone's Face ID (+1 h) → "Do you know me?"
   posters (+1 day) → school for adults (+1 week) → soldiers shake hands (+1 month) → old couple on a bench (+1 year).
2. **HUD = a number that is the plot**, time line = the stamp ("+1 HOUR"), second line = the place ("SEOUL · 11:00 PM").
   The number crashes at SECOND 0 and climbs back as the world adapts (006: PEOPLE WHO KNOW THEIR OWN NAME 8.2 B → 0 → 8.2 B).
3. **Use real mechanisms + one sharp line per beat.** Amnesia keeps language and skills ("Nobody forgets how to talk, or walk.
   Only who they are."), Face ID still works ("Face ID knows who you are. You don't."). Comment bait comes from these.
4. **Reuse sets across beats**; dress them per beat (posters, chairs, cars, season, time of day). Four sets made nine places.
5. **End on one small human beat + a question end card** ("Who's the first person you'd *look for*?" / SEND THIS TO THEM).
6. **Sound-design-led:** the moment is subtractive (every voice + footstep stops at 9:00, traffic keeps going). See audio/README.md.
7. **Go dark when the premise is dark (user steer on 006 v1: "too tame… take a heavier doomer perspective").** v1 showed people
   adapting (phones, posters, a love story) and was rejected. v2 follows what breaks: cars running reds → planes with nowhere to
   land → leaders who don't know they lead → strangers beside a launch key → reactors nobody can run → blackout → tanks at the
   border → food riots → an overgrown city a year later. The HUD number crashes to 0 and **never recovers**; the second HUD line
   carries the escalating stat (PLANES IN THE AIR · 10,000+, NUCLEAR WARHEADS · 12,187). End on a debate question
   ("Would humanity survive the *first year*?"). Keep it non-graphic: wrecks, glows, crowds — no bodies, no blood.

## Biography: one real life, birth → death (`"tone": "biography"`, `videos/009-abe-lincoln`)
**Its own category with its own playbook: `docs/BIOGRAPHY.md`** and command `/new-biography <name>`. In short: a narrator
tells the story in full connected sentences (never fragments — user steer on 009 v1), `tools/biography.py` sizes every shot
from its narration, HUD = age + date + place, a new set per era, a clear but non-graphic death beat, a legacy ending and a
"Whose story should we tell next?" end card. Length follows the life (009 = 2:19).

## Funny-dramatic what-if (`videos/010-giant-height`)
"What if every person's height doubled overnight?" — a whatif ladder where **every beat ends in a big physical consequence**:
the bed snaps, a doorway is waist-high, giants step out over their porches, the car roof crushes flat, the bus bottoms out
("FULL · 7 PEOPLE"), shelves empty in a time-lapse, a bench snaps, double-size cars, everyone can dunk. Real mechanism for comment
bait: the square–cube law (height ×2 → weight ×8, bone strength ×4 → stress ×2, food ≈ ×5). Gary (002/007) is the recurring
everyman. Impacts = camera shake + a dust burst + a boom. Score = mock-epic march (audio/README.md). New sets every few beats.

## Wacky ripple (`videos/012-pee-pants`) — "What if everyone on Earth suddenly peed their pants?"
The funny tone at full silliness: one embarrassing moment shared by 8.2 billion people, then **11 imaginative places** (classroom,
a presidential press briefing, a wedding, a swimming pool, a job interview, "blame the dog", a laundromat of people in towel
skirts, the power grid failing from dryers, TOWELS SOLD OUT, strangers laughing together, a WET PANTS DAY street party).
- Keep body comedy **cartoon + kind**: a dark patch and the reaction — never liquid, puddles or bodily detail. The joke is the
  shared embarrassment and how normal life copes (he keeps going; they still say "I do"; nobody noticed in the pool).
- Find the deadpan non-reaction beat (pool: "…nobody noticed.") and the warm one ("For once, we were all in it together.").
- A real number for comment bait: 400 mL × 8.2 B ≈ 3.3 billion liters ≈ 1,312 Olympic pools (in the HUD stat line).
- Gary appears 3× (the interview candidate, the dog-blamer, the finale) — a running cameo across videos (002, 007, 010, 012).
- Sound: "mischief" — pizzicato strings + mallet "uh-oh" motif (audio/README.md); the room's chatter STOPS at the moment.

## Physical-premise montage (`videos/018-magnetic`) — "What if every human became magnetic?"
One invisible force, 11 places, every beat ends in a pile-up: commuters yanked back onto a bus shelter, Gary's breakfast (forks,
toaster, a pan hat) flies at him and he slams onto the fridge, a snake of shopping carts scoops a shopper and stacks up, two
strangers on a subway snap into a hug and the whole car joins in, the press slides into the President's stage, a 3 T MRI pulls
in the whole hospital (a "human sunflower" of heads in the bore), the bride and groom repel (same poles) until he turns around,
1,800 tourists cover the Eiffel Tower, compasses lead hikers into a four-person knot, the world is rebuilt in wood, and hugs
last four hours (time-lapse to dusk).
- **Show the force, not the person:** the cyan shimmer at the premise, bodies tilted toward the target in flight (u³ pull), a
  starburst + dust + camera jolt + a soft clang on landing. Synchrony = the joke (every row of press chairs slides at once).
- **Real number per beat in the HUD stat line** (MRI 3 T = 60,000× Earth's field, Eiffel Tower 7,300 t of iron, 49 press seats,
  1.9 B t of steel a year, a hug lasts 3 s) — and the premise defined by one (each human = 1.5 T, an MRI's strength).
- Warm ending from the premise's one upside (you can't let go of a hug), staged as a time-lapse so the last beat still moves.

## Lie-detector body part (`videos/015-tail-lies`) — "What if every human grew a tail that wags when they lie?"
An unhinged montage where the premise is a visible, always-moving body part (every human has a tail → motion in every frame).
- **One lie per place, and the tail's wag causes the beat's big physical effect**: a kid's "I didn't eat the cookie" sweeps the
  (empty) jar off the counter; Mom's "I'm not mad" launches a chair; "I work too hard" spins the swivel chair three times; "I'm six
  feet tall" kicks his own chair out; "We LOVE it!" pops every balloon; the car salesman's tail becomes a helicopter rotor;
  "All in." — six tails, the chips erupt; the President's "I'll be brief" knocks both flags over; "No." — three gavel bangs.
- Picture-first jokes: the subtitle is the lie in quotes, the tail is the punch; a non-wag is a joke too (grandma's tail stays still
  — she really did knit it). Escalate personal → work → love → family → commerce → gambling → politics → courts.
- HUD number = the premise in real time (TAILS WAGGING RIGHT NOW ≈ 470,000, derived from 1.65 lies/day × 8.2 B × 3 s); the stat
  line carries the sourced fact per beat; the number rolls to 0 at +1 YEAR and to 1 when the dog wags (gold).
- Warm end: honesty wins — "I love you, Dad." "Love you more." with both tails perfectly still; "The only tail still wagging is the dog's."

## Dance montage (`videos/019-cant-stop-dancing`) — "What if everyone on Earth couldn't stop dancing?"
Motion IS the premise: every person in every frame dances to one shared 120-bpm beat, so the picture never stands still (what
TRIBE rewards). 11 places, each a new dance gag that ends physically: a silent library erupts (chairs tip, the book cart
explodes, QUIET PLEASE falls), surgeons do the robot while the ECG reads 120, a plane cabin waves its arms as the oxygen masks
drop, a supermarket conga line kicks the shelves empty, the President moonwalks and the press does the robot back (chairs
domino), Ghana-style pallbearers toss the coffin, Gary's cereal never reaches his mouth, a stadium jump registers as an
earthquake, a job interview becomes a dance-off (the worm → HIRED), a fit-year time-lapse closes the gym, and a dusk rooftop
slow dance cranes up to a city that is one street party.
- **Show the premise on the beat:** gold ♪ notes pop over every head at the moment, everyone's first beat is a shocked 'o'
  face (they can't stop), then smiles. A small library of readable moves (disco point, robot, YMCA, jump, twist, shimmy,
  sprinkler, body roll, conga kick, slow dance, moonwalk, the worm) shared by every crowd, tiny per-person lag.
- **The real number per beat** (1518 Strasbourg ~400 "reportedly", ~850,000 surgeries a day, 153,359 flights on the busiest
  day, the 119,986-person conga record, 193 UN leaders, Ghana's dancing pallbearers, 462 kcal an hour, the magnitude-2.3 Swift
  Quake, 7.1 M job openings, 890 M adults with obesity) — the subtitle is the gag, the HUD is the fact.
- **End card = an answer everyone has:** "What song would you be stuck dancing to?" (comment bait that needs no knowledge).
- Sound: soft piano house locked to the picture (audio/README.md → Dance tone).

## Money what-if with one everyman (`videos/dh001-dollar-per-step`) — "What if you earned $1 for every step you took?"
This channel's first video (money lane). A "you" premise carried by one named everyman (Walt: ginger hair, glasses, mustard
sweater) and cut to the world around him, ~5 s per place, each ending in something physical.
- **Make the premise visible everywhere:** a gold `$` coin pops out of every footfall on screen (`trail()`), so every beat is
  full of motion and the rule needs no explaining. A "+$1" sprite + a coin blip on the hero's first step; the music enters there.
- **Escalate the economics, not just the gags:** personal (laps of the kitchen table) → work (seven people lap the desk, papers
  whirl) → commute (the subway marches in place) → commerce (cars FREE, the tube man collapses) → the jobs that walk (the
  mail carrier is a millionaire) → loopholes (the marathon tiptoes) → **inflation** (bread $1.83 → $40, shelves empty) → even
  the couch empties → everyone's a millionaire and a barrow of cash buys nothing → the money stops mattering.
- **HUD = the hero's balance** (`hudPrefix: "$"`), rolling every beat; the stat line is the real number; the last stat
  (STEPS TO MOM'S DOOR · 6,212) turns gold on the hug. Warm ending: he spends his steps on someone, not something.
- End card: a question anyone can answer ("Who would you *walk* to first?") + caption "Send this to the person you'd walk to."

## Animal what-if (`videos/dh002-giant-ants`) — "What if ants were the size of dogs?"
The channel's first animals-lane reel (docs/lanes/animals.md): one species, one change (size), ten places on a time ladder
(6:00 AM → +1 YEAR), Walt from dh001 as the human thread.
- **The animal keeps doing what the real animal does, at our scale** — that IS the joke and the fact: ants carry (the fridge,
  a car into an ant hole, the wedding cake, a picnic blanket by its corners, a hot-dog cart for "fetch"), march in endless
  two-way trails (rush hour waits), build (a hill bigger than the houses, time-lapse with a sweeping sun) and raft/climb.
- **HUD number = the premise count** (ANTS THE SIZE OF A DOG 0 → 1 at the growth → 20,000,000,000,000,000 on "So is every
  other ant on Earth") — a 22-character number still fits the HUD at 60 px; the stat line carries a sourced ant fact per place.
- Premise moment = one tiny ant on a breakfast table (macro camera following it, `near` 0.01) that grows with a boing while
  the camera pulls back; the table sags, the mug jumps, dust, jolt — the music enters on it.
- Warm turn: people move WITH their help, adopt them, and the opening's fridge comes back every morning (callback ending).

