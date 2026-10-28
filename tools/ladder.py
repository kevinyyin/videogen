#!/usr/bin/env python3
"""Ladder harness: videos/<slug>/episode.json -> story.json + cues.json + caption.md + shots.js stub (formats/ladder/).

    python3 -I tools/ladder.py gg004-words-come-true

Why: a ladder episode is one absurd premise that escalates rung by rung — the AI says a line, then a gag from a fixed
library makes it physically true (poof, transform, drop, grow, walkoff, sail, rain, flood, launch) somewhere in six places.
This tool validates the rungs (fails loudly with every problem), times each rung (its gag's minimum, or longer when its text
needs the reading time) and writes story.json with ABSOLUTE key-moment times per rung, which formats/ladder/shots.js
animates to and cues.json puts the foley on, so picture and sound read the same numbers.

episode.json (formats/ladder/README.md has the full reference):
  { "title": "What if …?", "seed": 4,
    "cast": {"you": {"top": "#3aa7d9"}, "ai": {"name": "VESPER", "color": "#7b5cff"}},
    "hud": {"label": "LIES THAT CAME TRUE", "prefix": ""},
    "rungs": [{"place": "casino", "gag": "poof", "prop": "five_aces", "at": "table", "say": "I have five aces.", "hud": 1}, …],
    "end": {"html": "…", "small": "PLAY THEM FREE · GGHUMAN.AI"}, "caption": {…} }
"""
import json
import os
import random
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aitable import caption_errors, caption_md, is_count, is_num, plain, read, words  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TITLE_LEN, TITLE_OUT, END_HOLD = 2.6, 2.0, 4.5   # 4.5 s hold = the end card fully visible for 4 s (0.5 s fade-in)
SAY_AT = 0.15
PLACES = {
    "casino": ["table", "ai", "you"],
    "livingroom": ["table", "ai", "you", "room"],
    "street": ["road", "curb", "crowd", "pile", "you", "ai"],
    "paris": ["tower", "lawn", "you", "ai"],
    "podium": ["lectern", "ai", "you"],
    "space": ["earth", "orbit", "table", "you", "ai"],
}
PROPS = ("five_aces", "gold_chips", "chips", "table", "boat", "chicken", "casino_building", "car", "house", "eiffel",
         "moon", "grandma", "sheep", "wheat_card", "you", "ai")
CAST = ("you", "ai")
BUILTINS = {"casino": {"table", "chips"}}      # set dressing that is on screen from the start
CAMS_ANY = ("wide", "close", "high", "ai", "you", "orbit")
COMMON = {"place", "gag", "say", "sub", "hud", "react", "cam", "len"}
# per gag: minimum length, required + optional params, key moments (offsets from the rung start)
GAGS = {
    "say":       {"min": 2.6, "req": [], "opt": [], "at": {}},
    "poof":      {"min": 3.0, "req": ["prop", "at"], "opt": [], "at": {"pop": 0.9}},
    "transform": {"min": 3.2, "req": ["prop", "to"], "opt": ["at", "scale", "riders"], "at": {"puff": 1.0}},
    "drop":      {"min": 3.4, "req": ["prop", "at"], "opt": [], "at": {"fall": 0.6, "impact": 1.2}},
    "grow":      {"min": 3.2, "req": ["prop", "scale"], "opt": [], "at": {"grow0": 0.8, "grow1": 2.0}},
    "walkoff":   {"min": 3.6, "req": ["prop", "at"], "opt": [], "at": {"stand": 0.8, "walk0": 1.2, "walk1": 3.4}},
    "sail":      {"min": 3.4, "req": ["prop", "at"], "opt": ["riders"], "at": {"go0": 0.6, "go1": 3.2}},
    "rain":      {"min": 3.4, "req": ["prop", "count"], "opt": ["at"], "at": {"fall0": 0.6, "fall1": 2.6}},
    "flood":     {"min": 3.6, "req": ["prop", "count", "at"], "opt": [], "at": {"fill0": 0.6, "fill1": 2.8}},
    "launch":    {"min": 3.4, "req": ["prop", "at"], "opt": ["lands"], "at": {"lift": 0.8, "gone": 2.2}},
}
SCALE_GROW = (0.2, 2.4)   # transform with `scale`: +0.2 s on the minimum, the new prop finishes growing at 2.4 s
ALL_ANCHORS = {a for v in PLACES.values() for a in v}


def gag_min(r):
    return GAGS[r["gag"]]["min"] + (SCALE_GROW[0] if r["gag"] == "transform" and "scale" in r else 0)


def offsets(r):
    at = dict(GAGS[r["gag"]]["at"])
    if r["gag"] == "transform" and "scale" in r: at["grow1"] = SCALE_GROW[1]
    return at


def say_of(r):
    s = r.get("say")
    if s is None: return None, None
    if isinstance(s, dict): return s.get("who"), s.get("text")
    return "ai", s


def layout(ep):
    t, out = TITLE_LEN, []
    for r in ep["rungs"]:
        cands = [gag_min(r)]
        who, text = say_of(r)
        if text: cands.append(SAY_AT + read(text) + 0.3)
        if r.get("sub"): cands.append(0.3 + read(r["sub"]) + 0.6)
        L = r.get("len", max(cands))
        t0, t1 = round(t, 3), round(t + L, 3)
        # episode.json's `at` is the ANCHOR; in story.json it moves to `anchor` and `at` holds the key-moment times
        o = dict(r, t0=t0, t1=t1, anchor=r.get("at"), at={k: round(t0 + v, 3) for k, v in offsets(r).items()},
                 sub_at=round(t0 + 0.3, 3), sub_end=round(t1 - 0.15, 3))
        if text:
            o["say_who"], o["say_text"] = who, plain(text)
            o["say_at"] = round(t0 + SAY_AT, 3)
            o["say_end"] = round(min(t1, o["say_at"] + read(text) + 0.8), 3)
        out.append(o); t = t1
    end_in = round(t, 3)
    return {"title_len": TITLE_LEN, "rungs": out, "end_in": end_in, "duration": round(end_in + END_HOLD, 3)}


def validate(ep):
    """Every problem with a ladder episode, as messages: shapes first, then what must be on screen when, then timing."""
    errs = []
    cast = ep.get("cast")
    if not (isinstance(cast, dict) and isinstance(cast.get("you"), dict) and isinstance(cast.get("ai"), dict)):
        return ["cast: must be {\"you\": {\"top\": …}, \"ai\": {\"name\": …, \"color\": …}}"]
    if not cast["you"].get("top"): errs.append("cast: you needs a top color")
    if not cast["ai"].get("color"): errs.append("cast: ai needs a color")
    if not isinstance(cast["ai"].get("name"), str) or not 1 <= len(cast["ai"]["name"]) <= 10: errs.append("cast: ai name must be 1–10 chars")
    hud = ep.get("hud")
    if not isinstance(hud, dict) or not isinstance(hud.get("label"), str) or not 1 <= len(plain(hud["label"])) <= 24:
        errs.append("hud: needs a label of 1–24 chars (and an optional prefix)")
    if not ep.get("title"): errs.append("missing 'title'")
    if not isinstance(ep.get("end"), dict) or not ep["end"].get("html"): errs.append("end: needs {\"html\": …, \"small\": …}")
    errs += caption_errors(ep.get("caption"))
    rungs = ep.get("rungs")
    if not isinstance(rungs, list) or not all(isinstance(r, dict) for r in rungs):
        return errs + ["rungs: must be a list of rung objects"]
    if not 6 <= len(rungs) <= 12: errs.append(f"rungs: 6–12 rungs (got {len(rungs)})")

    structural, last_hud = False, -1
    # props on screen per place: built-ins + pre-placed (named by a walkoff/launch/grow there); the cast is everywhere
    present = {p: set(BUILTINS.get(p, ())) for p in PLACES}
    for r in rungs:
        if r.get("place") in PLACES and r.get("gag") in ("walkoff", "launch", "grow") and r.get("prop") in PROPS:
            present[r["place"]].add(r["prop"])
    pile = {p: 0 for p in PLACES}
    for n, r in enumerate(rungs, 1):
        place, gag = r.get("place"), r.get("gag")
        if place not in PLACES: errs.append(f"rung {n}: unknown place '{place}' (one of {', '.join(PLACES)})"); structural = True; continue
        if gag not in GAGS: errs.append(f"rung {n}: unknown gag '{gag}' (one of {', '.join(GAGS)})"); structural = True; continue
        spec = GAGS[gag]
        for p in spec["req"]:
            if p not in r: errs.append(f"rung {n}: {gag} needs '{p}'"); structural = True
        for k in r:
            if k not in COMMON and k not in spec["req"] and k not in spec["opt"]: errs.append(f"rung {n}: unknown param '{k}'")
        prop = r.get("prop")
        for k in ("prop", "to"):
            if k in r and r[k] not in PROPS and not (k == "prop" and gag == "drop" and r[k] == "pile"):
                errs.append(f"rung {n}: unknown prop '{r[k]}' (not on the shelf)"); structural = True
        if "at" in r and r["at"] not in PLACES[place]: errs.append(f"rung {n}: anchor '{r['at']}' is not in {place} ({', '.join(PLACES[place])})"); structural = True
        if "lands" in r and r["lands"] not in ALL_ANCHORS: errs.append(f"rung {n}: lands on unknown anchor '{r['lands']}'"); structural = True
        if "count" in r and not (isinstance(r["count"], int) and not isinstance(r["count"], bool) and r["count"] > 0):
            errs.append(f"rung {n}: count must be a positive whole number"); structural = True
        if "scale" in r and not (is_num(r["scale"]) and 1.5 <= r["scale"] <= 40): errs.append(f"rung {n}: scale must be 1.5–40")
        for k in ("riders", "react"):
            if k in r and not isinstance(r[k], bool): errs.append(f"rung {n}: {k} must be true or false")
        if "cam" in r and r["cam"] not in CAMS_ANY: errs.append(f"rung {n}: cam must be one of {', '.join(CAMS_ANY)}")
        if "hud" in r:
            if not is_num(r["hud"]) or r["hud"] < 0: errs.append(f"rung {n}: hud must be a number ≥ 0")
            elif r["hud"] < last_hud: errs.append(f"rung {n}: hud {r['hud']} goes down (the counter only climbs)")
            else: last_hud = r["hud"]
        if "say" in r:
            sv = r["say"]
            if not isinstance(sv, (str, dict)): errs.append(f"rung {n}: say must be text or {{\"who\": …, \"text\": …}}"); structural = True
            else:
                who, text = say_of(r)
                if who not in CAST: errs.append(f"rung {n}: say who must be 'ai' or 'you'"); structural = True
                if not isinstance(text, str) or not plain(text).strip(): errs.append(f"rung {n}: say needs text"); structural = True
                elif len(plain(text)) > 24: errs.append(f"rung {n}: bubble over 24 chars: '{plain(text)}'")
        if "sub" in r:
            if not isinstance(r["sub"], str) or not plain(r["sub"]).strip(): errs.append(f"rung {n}: sub is empty once tags are removed"); structural = True
            elif len(plain(r["sub"])) > 60: errs.append(f"rung {n}: subtitle over 60 chars")
        if "len" in r:
            if not is_num(r["len"]) or r["len"] <= 0: errs.append(f"rung {n}: len must be a number of seconds"); structural = True
            elif r["len"] < gag_min(r): errs.append(f"rung {n}: len {r['len']} is shorter than {gag}'s {gag_min(r):.1f} s")
        if structural: continue
        # what is on screen when
        if gag in ("transform", "grow") and prop not in CAST and prop not in present[place]:
            errs.append(f"rung {n}: '{prop}' is not on screen in {place} yet (create it in an earlier rung there)")
        if gag == "sail" and prop not in CAST and not any(prop in s for s in present.values()):
            errs.append(f"rung {n}: '{prop}' is not on screen anywhere yet")
        if gag == "drop" and prop == "pile" and pile[place] == 0:
            errs.append(f"rung {n}: there is no pile in {place} to drop (drop or poof something at 'pile' first)")
        if gag == "launch" and "lands" in r and not any(r["lands"] in PLACES[x.get("place")] for x in rungs[n:] if x.get("place") in PLACES):
            errs.append(f"rung {n}: lands on '{r['lands']}' but no later rung is in a place with that anchor")
        # update the world
        if gag in ("poof", "drop", "rain", "flood") and prop != "pile": present[place].add(prop)
        if gag in ("poof", "drop") and r.get("at") == "pile" and prop != "pile": pile[place] += 1
        if gag == "transform":
            present[place].discard(prop); present[place].add(r["to"])
        if gag == "sail":
            for s in present.values(): s.discard(prop)
            present[place].add(prop)
        if gag == "launch":
            present[place].discard(prop)
            dest = next((x["place"] for x in rungs[n:] if x.get("place") in PLACES and r.get("lands") in PLACES[x["place"]]), None)
            if dest:   # (no later place with that anchor was reported above)
                present[dest].add(prop)
                if r["lands"] == "pile": pile[dest] += 1
    if structural: return errs
    tl = layout(ep)
    for n, r in enumerate(tl["rungs"], 1):
        if r.get("sub") and (r["sub_end"] - r["sub_at"]) / words(r["sub"]) < 0.3: errs.append(f"rung {n}: subtitle reads faster than 0.3 s/word")
        if r.get("say_text") and (r["say_end"] - r["say_at"]) / max(1, words(r["say_text"])) < 0.3: errs.append(f"rung {n}: bubble reads faster than 0.3 s/word")
    if not 30 <= tl["duration"] <= 40: errs.append(f"duration {tl['duration']:.1f} s is outside 30–40 s")
    return errs


def first_moment(r):
    vals = [v for v in r["at"].values()]
    return min(vals) if vals else round(r["t0"] + 0.3, 3)


def story(ep, tl):
    dur, end_in, H = tl["duration"], tl["end_in"], ep["hud"]
    val = 0
    hud = [{"t0": 0.0, "t1": TITLE_LEN, "from": 0, "to": 0, "time": "", "age": ""}]
    subs = []
    for r in tl["rungs"]:
        new = r.get("hud", val)
        seg = {"t0": r["t0"], "t1": r["t1"], "from": val, "to": new, "time": "", "age": ""}
        if new != val:
            seg["r0"] = first_moment(r); seg["r1"] = round(seg["r0"] + 0.6, 3)
        hud.append(seg); val = new
        if r.get("sub"): subs.append([round(r["sub_at"], 2), round(r["sub_end"], 2), plain(r["sub"])])
    hud[-1]["t1"] = dur
    E = ep["end"]
    return {
        "tone": "funny", "look": ep.get("look", {"exposure": 1.05}), "fps": 30, "duration": dur,
        "title": {"html": ep["title"], "in": -0.4, "out": TITLE_OUT},
        "shots": [{"cam": "title", "t0": 0.0, "t1": TITLE_LEN}] + [{"cam": r["place"], "t0": r["t0"], "t1": r["t1"]} for r in tl["rungs"]],
        "subs": subs, "hudLabel": plain(H["label"]), "hudPrefix": H.get("prefix", ""), "hud": hud,
        "end": {"in": end_in, "html": E["html"], "small": E.get("small", "")},
        "dips": [[0.0, 0.0, 0.45]], "finalFade": [end_in, round(end_in + 0.8, 3)],
        "debugView": {"center": [0, 0, 0], "height": 14},
        "episode": {"seed": ep.get("seed", 1), "cast": ep["cast"], "hud": H, "rungs": tl["rungs"]},
    }


BEDS = {   # ambience per place (sound, gain dB, args)
    "casino": [("room_tone", -38, {}), ("city_day", -46, {"murmur": 0.6, "traffic": 0.0})],
    "livingroom": [("room_tone", -38, {})],
    "street": [("city_day", -40, {"murmur": 0.5, "traffic": 0.6})],
    "paris": [("city_day", -42, {"murmur": 0.4, "traffic": 0.2}), ("wind", -46, {})],
    "podium": [("room_tone", -38, {}), ("city_day", -44, {"murmur": 0.7, "traffic": 0.0})],
    "space": [("room_tone", -50, {})],
}
BAR = 4 * 60 / 90   # the mock-epic march: C minor, 90 bpm (audio/README.md "kaiju march", 010)


def cues(ep, tl):
    """cues.json (audio/synth.py format): a mock-epic score that climbs every rung + foley on the same key moments."""
    dur, end_in = tl["duration"], tl["end_in"]
    ev, booms, amb = [], [], []
    rnd = random.Random(ep.get("seed", 1))

    def e(t, sound, gain, **args):
        ev.append({"t": round(t, 3), "sound": sound, "gain_db": gain, "pan": 0.0, "room": -16, "args": args})

    for r in tl["rungs"]:
        a, g = r["at"], r["gag"]
        if g == "poof": e(a["pop"], "poof", -24)
        if g == "transform":
            e(a["puff"], "poof", -24)
            if r.get("to") == "chicken": e(a["puff"] + 0.4, "chicken_cluck", -26)
            if "grow1" in a: e(a["puff"] + 0.3, "low_swell", -26, dur=1.2)
        if g == "drop":
            e(a["fall"], "low_swell", -28, dur=0.6)
            e(a["impact"], "distant_boom", -20, size=1.0); e(a["impact"], "giant_step", -22, size=1.6); booms.append(a["impact"])
        if g == "grow": e(a["grow0"], "low_swell", -26, dur=1.2)
        if g == "walkoff":
            t = a["walk0"]
            while t <= a["walk1"] + 1e-6: e(t, "giant_step", -24, size=1.3); t += 0.45
        if g == "sail": e(a["go0"], "low_swell", -30, dur=1.4)
        if g == "rain":
            t = a["fall0"]
            while t <= a["fall1"] + 1e-6: e(t, "chip_clack", -28, n=4); t += 0.15
        if g == "flood":
            for _ in range(5): e(a["fill0"] + rnd.random() * (a["fill1"] - a["fill0"]), "sheep_baa", -30, pitch=round(0.8 + 0.4 * rnd.random(), 2))
        if g == "launch":
            e(a["lift"], "distant_boom", -22, size=1.0); e(a["lift"], "low_swell", -24, dur=1.0); booms.append(a["lift"])
        if r.get("say_who") == "ai": e(r["say_at"], "robot_bleep", -28, pitch=1.0, n=2)
        if r.get("react"):
            t0 = first_moment(r)
            amb.append({"sound": "crowd_cheer", "t0": t0, "t1": round(min(dur, t0 + 2.0), 3), "fade_in": 0.2, "fade_out": 0.4,
                        "gain_db": -34, "seed": 9, "args": {"excite": 0.6}})
    # one bed per run of rungs in the same place (the first run also covers the title)
    runs = []
    for r in tl["rungs"]:
        if not runs or runs[-1][0] != r["place"]: runs.append([r["place"], r["t0"]])
    runs[0][1] = 0.0
    for i, (place, t0) in enumerate(runs):
        t1 = runs[i + 1][1] if i + 1 < len(runs) else dur
        for k, (sound, gain, args) in enumerate(BEDS[place]):
            amb.append({"sound": sound, "t0": round(t0, 3), "t1": round(t1, 3), "fade_in": 0.3, "fade_out": 0.06,
                        "gain_db": gain, "seed": i * 3 + k + 1, **({"args": args} if args else {})})
    prog, chords, t, i = ["Cm", "Ab", "Fm", "G"], [], TITLE_OUT, 0
    while t < end_in - 1e-6:
        chords.append([round(t, 3), prog[i % 4]]); t += BAR; i += 1
    chords += [[end_in, "Ab"], [round(end_in + 1.4, 3), "G"], [round(end_in + 2.8, 3), "C"]]
    music = {
        "instrument": "piano", "gain_db": 0.0, "reverb_db": -10.0, "pad_db": 2.0, "pad_reverb_db": -5.0, "mallet_db": -2.0,
        "strings_db": 8.0, "drums_db": -7.0,
        "leveler": {"thr_rel_db": 3.0, "ratio": 2.5, "tau": 0.25}, "end": dur, "chords": chords,
        "sections": [
            # the strings carry through the end card on the resolving chords (a quiet piano arp there read as a music dropout)
            {"t0": TITLE_OUT, "t1": dur, "style": "strings", "vel": [[TITLE_OUT, 0.24], [end_in, 0.34], [dur, 0.24]], "step": round(BAR / 8, 4),
             "pattern": [0, 0, 0, 1, 0, 0, 2, 0], "octave": 1, "sustain": 0.3, "len": 0.9}],
        "drum_patterns": [{"t0": TITLE_OUT, "t1": end_in, "step": round(BAR / 4, 4), "pattern": [1.0, 0.7, 0.85, 0.7], "vel": 0.5, "kind": "taiko"}],
        "drums": [[TITLE_OUT, 0.6, "boom"]] + [[t, 0.55, "boom"] for t in booms],
        "melody": [], "mallet_melody": [], "stings": [],
        "pad": [{"t0": TITLE_OUT, "t1": round(TITLE_OUT + 2.0, 3), "notes": [24, 36, 43], "level": 1.5, "attack": 0.15, "release": 0.8, "hp": 30},
                {"t0": round(TITLE_OUT - 0.3, 3), "t1": dur, "notes": [36, 48, 55], "level": 0.8, "attack": 0.8, "release": 0.8}],
        "ducks": [], "auto_duck": {"db": -4.0, "categories": ["prop"], "lookahead": 0.04, "hold": 0.4, "smooth": 0.2, "max_len": 1.0},
        "eq": [{"f": 2800, "q": 0.8, "db": -2.0}, {"f": 6500, "q": 0.6, "db": -4.0}],
    }
    return {
        "title": plain(ep["title"]), "duration": dur, "target_lufs": -15.0, "limiter_ceiling_dbtp": -1.5,
        "end_fade": [round(dur - 1.0, 3), dur],
        "stem_gain_db": {"music": -6.0, "sfx": 13.0, "amb": 10.0},
        "stem_dynamics": {"music": {"limit_dbfs": -3.0, "lim_win": 0.015},
                          "sfx": {"comp_thr_dbfs": -15.0, "ratio": 2.5, "win": 0.004, "limit_dbfs": -4.0}},
        "sfx_lowpass_hz": 5000, "shots": [0.0, TITLE_LEN] + [r["t1"] for r in tl["rungs"]] + [dur],
        "ambience": amb, "events": ev, "music": music,
    }


def build(slug):
    vdir = os.path.join(ROOT, "videos", slug)
    ep = json.load(open(os.path.join(vdir, "episode.json")))
    errs = validate(ep)
    if errs:
        print(f"{slug}: episode.json has {len(errs)} problem(s):")
        for e in errs: print("  ✗ " + e)
        sys.exit(1)
    tl = layout(ep)
    json.dump(story(ep, tl), open(os.path.join(vdir, "story.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(cues(ep, tl), open(os.path.join(vdir, "cues.json"), "w"), indent=1, ensure_ascii=False)
    open(os.path.join(vdir, "caption.md"), "w").write(caption_md(ep))
    stub = os.path.join(vdir, "shots.js")
    if not os.path.exists(stub): open(stub, "w").write("export * from '/formats/ladder/shots.js';\n")
    chk = subprocess.run([sys.executable, "-I", os.path.join(ROOT, "tools", "caption.py"), vdir], capture_output=True, text=True)
    if chk.returncode:
        print(f"{slug}: caption.md fails tools/caption.py:\n{chk.stdout}{chk.stderr}")
        sys.exit(1)
    print(f"{slug}: {len(tl['rungs'])} rungs, duration {tl['duration']:.1f} s (end card in at {tl['end_in']:.1f})")
    for r in tl["rungs"]:
        moments = ", ".join(f"{k} {v}" for k, v in r["at"].items())
        print(f"  {r['place']:10s} {r['gag']:9s} {r['t0']:6.2f}-{r['t1']:6.2f}  {moments}  {r.get('say_text', '')}")


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    build(sys.argv[1])
