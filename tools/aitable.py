#!/usr/bin/env python3
"""AI Table harness: videos/<slug>/episode.json -> story.json + cues.json + caption.md + shots.js stub (formats/aitable/).

    python3 -I tools/aitable.py ggNNN-slug

Why: every AI Table episode is the same machine — tiny players on a giant poker table, a "What if…?" title, 3–4 beats from
a fixed library, an end card — so the only per-video input is a short episode.json. This tool validates it (fails loudly
with every problem), lays out the timeline (each beat lasts its type's minimum, or longer when its subtitle or bubble needs
the reading time), and writes story.json with an `episode` block holding the ABSOLUTE time of every key moment, which
formats/aitable/shots.js animates to (and cues.json is built from), so picture and sound read the same numbers.

episode.json (see formats/aitable/README.md for the full reference):
  { "title": "What if …?", "seed": 1,
    "cast": [{"id": "you", "kind": "human", "seat": "near", "top": "#f2c230"},
             {"id": "VESPER", "kind": "robot", "seat": "far", "color": "#7b5cff", "stack": 12}],
    "pot": 200, "hud": {"line1": "NO-LIMIT HOLD'EM", "line2": ""},
    "beats": [{"type": "tower", "who": "VESPER", "height": 120, "say": "All in.", "pot": 50000, "face": {"VESPER": "smug"}}, …],
    "end": {"html": "…", "small": "PLAY THEM FREE · GGHUMAN.AI"}, "caption": {…} }
Any beat may carry say / sub / pot / face / cam / len, plus the endings then: "fold" (the human folds) and after: "topple"
(the latest tower falls on the human).
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TITLE_LEN, TITLE_OUT, END_HOLD = 2.6, 2.0, 4.2
SEATS = ("near", "far", "left", "right")
EXPRS = ("neutral", "smug", "shifty", "suspicious", "laugh", "cry", "glitch")
CARD = re.compile(r"^[2-9TJQKA][shdc]$")
COMMON = {"type", "say", "sub", "pot", "face", "cam", "len", "then", "after"}
ID_PARAMS = ("to", "who", "around", "tower_of", "target")

# per beat type: minimum length, required params, key moments (offsets from the beat start), bubble pop offset, HUD roll
BEATS = {
    "deal":      {"min": 3.2, "req": ["to"], "at": {}, "say_at": 2.0, "money": (0.3, 0.9)},
    "tower":     {"min": 3.6, "req": ["who", "height"], "at": {"push": 0.4, "grow0": 0.8, "peak": 2.6}, "say_at": 0.5, "money": (0.8, 2.6)},
    "peek":      {"min": 3.4, "req": ["who", "cards"], "at": {"lift": 0.6, "reveal": 1.0}, "say_at": 1.2, "money": (0.3, 0.9)},
    "flip":      {"min": 3.8, "req": ["who", "cards"], "at": {"flip": 0.8}, "say_at": 1.3, "money": (0.3, 0.9)},
    "handshake": {"min": 3.2, "req": ["who"], "at": {"shake0": 1.0, "shake1": 1.8}, "say_at": 1.0, "money": (0.3, 0.9)},
    "wall":      {"min": 3.6, "req": ["who", "around", "height"], "at": {"rise0": 0.5, "rise1": 2.5}, "say_at": 0.5, "money": (0.5, 2.5)},
    "kick":      {"min": 3.6, "req": ["who", "tower_of"], "at": {"kick": 0.8, "topple": 1.2, "impact": 1.9}, "say_at": 2.1, "money": (0.3, 0.9)},
    "captcha":   {"min": 4.0, "req": ["target", "text"], "at": {"slam": 0.5, "taps": [1.4, 1.85, 2.3, 2.75, 3.2]}, "say_at": 3.3, "money": (0.3, 0.9)},
    "flick":     {"min": 3.0, "req": ["target"], "at": {"reach": 0.3, "flick": 1.2, "land": 2.5}, "say_at": 0.3, "money": (0.3, 0.9)},
}
FOLD_LEN, TOPPLE_LEN = 0.8, 1.4


def plain(s):
    return re.sub(r"<[^>]+>", "", s or "")


def words(s):
    return len(plain(s).split())


def read(s):
    return max(1.2, words(s) * 0.31)


def say_of(b):
    """(speaker id, text) of a beat's bubble, or (None, None)."""
    s = b.get("say")
    if s is None: return None, None
    if isinstance(s, dict): return s.get("who"), s.get("text", "")
    return (b["who"] if isinstance(b.get("who"), str) else b.get("target") if isinstance(b.get("target"), str) else None), s


def offsets(b):
    at = dict(BEATS[b["type"]]["at"])
    if b["type"] == "deal": at["land"] = [round(0.6 + 0.35 * i, 3) for i in range(2 * len(b["to"]))]
    return at


def layout(ep):
    t, out = TITLE_LEN, []
    for b in ep["beats"]:
        info = BEATS[b["type"]]
        fold, topple = b.get("then") == "fold", b.get("after") == "topple"
        cands = [info["min"] + FOLD_LEN * fold + TOPPLE_LEN * topple]
        if b.get("sub"): cands.append(0.3 + read(b["sub"]) + 0.6)
        _, text = say_of(b)
        if text: cands.append(info["say_at"] + read(text) + 0.3)
        L = b.get("len", max(cands))
        t0, t1 = round(t, 3), round(t + L, 3)
        at = {k: [round(t0 + x, 3) for x in v] if isinstance(v, list) else round(t0 + v, 3) for k, v in offsets(b).items()}
        if fold: at["fold"] = round(t1 - 0.6, 3)
        if topple: at["fall"], at["impact"] = round(t1 - 1.3, 3), round(t1 - 0.7, 3)
        o = dict(b, t0=t0, t1=t1, at=at, sub_at=round(t0 + 0.3, 3), sub_end=round(t1 - 0.15, 3))
        if text:
            o["say_who"], o["say_text"] = say_of(b)[0], plain(text)   # the template draws these as-is: no literal tags
            o["say_at"] = round(t0 + info["say_at"], 3)
            o["say_end"] = round(min(t1, o["say_at"] + read(text) + 0.8), 3)
        if b["type"] == "captcha": o["text"] = plain(b["text"])
        out.append(o); t = t1
    end_in = round(t, 3)
    return {"title_len": TITLE_LEN, "beats": out, "end_in": end_in, "duration": round(end_in + END_HOLD, 3)}


CAMS_ANY = ("wide", "hero", "overShoulder", "twoShot", "high")   # the cameras that work in any beat; the rest belong to one type
MAX_WALL = 100   # 14 stacks x 100 chips + the cast stacks + a tower fit the template's 2,000-chip pool
# per-type shape of the cast-id params: "id" = one cast id, "ids" = a list of different ids, "pair" = exactly two different ids
SHAPE = {"deal": {"to": "ids"}, "tower": {"who": "id"}, "peek": {"who": "id"}, "flip": {"who": "id"},
         "handshake": {"who": "pair"}, "wall": {"who": "ids", "around": "id"}, "kick": {"who": "id", "tower_of": "id"},
         "captcha": {"target": "id"}, "flick": {"target": "id"}}


def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def is_count(x, hi):
    return isinstance(x, int) and not isinstance(x, bool) and 1 <= x <= hi


def caption_errors(c):
    """The house caption rules (tools/caption.py) as messages; shared with tools/ladder.py."""
    if not isinstance(c, dict): return ["missing 'caption'"]
    errs = []
    if not c.get("hook") or not c.get("summary"): errs.append("caption: needs a hook and a summary")
    if "👇" not in str(c.get("cta", "")): errs.append("caption: the cta needs a question with 👇")
    if not str(c.get("send", "")).startswith("Send this to"): errs.append("caption: send must start with 'Send this to'")
    tags = c.get("tags", [])
    if not isinstance(tags, list) or len(tags) != 5 or "#animation" not in tags or not all(str(x).startswith("#") for x in tags):
        errs.append("caption: exactly 5 hashtags incl. #animation")
    return errs


def validate(ep):
    """Every problem with an episode, as messages (the writer fixes them and retries). Shapes first, then the orders and roles the
    template is built for: anything that would crash or silently misrender the template is rejected here."""
    errs = []
    cast = ep.get("cast")
    if not isinstance(cast, list) or not all(isinstance(c, dict) for c in cast):
        return ["cast: must be a list of {\"id\", \"kind\", \"seat\", …} objects"]
    ids = {c.get("id") for c in cast}
    if not 2 <= len(cast) <= 3: errs.append(f"cast: 2–3 members (got {len(cast)})")
    humans = [c for c in cast if c.get("kind") == "human"]
    if len(humans) != 1 or humans[0].get("id") != "you": errs.append("cast: exactly one human, with id 'you'")
    seen = set()
    for c in cast:
        cid, seat = c.get("id"), c.get("seat")
        if c.get("kind") not in ("human", "robot"): errs.append(f"cast '{cid}': kind must be human or robot")
        if seat not in SEATS: errs.append(f"cast '{cid}': unknown seat '{seat}'")
        elif seat in seen: errs.append(f"cast: seat '{seat}' used twice")
        seen.add(seat)
        if cid == "you" and seat != "near": errs.append("cast: 'you' must sit at seat 'near' (every camera is built around it)")
        if c.get("kind") == "robot" and not c.get("color"): errs.append(f"cast '{cid}': a robot needs a color")
        if "stack" in c and not is_count(c["stack"], 300): errs.append(f"cast '{cid}': stack must be 1–300 chips")
    if not ep.get("title"): errs.append("missing 'title'")
    if not isinstance(ep.get("end"), dict) or not ep["end"].get("html"): errs.append("end: needs {\"html\": …, \"small\": …}")
    errs += caption_errors(ep.get("caption"))
    beats = ep.get("beats")
    if not isinstance(beats, list) or not beats or not all(isinstance(b, dict) for b in beats):
        return errs + ["beats: must be a non-empty list of beat objects"]

    deals = [i for i, b in enumerate(beats) if b.get("type") == "deal"]
    if len(deals) != 1: errs.append(f"beats: exactly one deal (got {len(deals)})")
    elif deals[0] != 0: errs.append("beats: the deal must be the first beat")
    dealt = set(beats[deals[0]]["to"]) if deals and isinstance(beats[deals[0]].get("to"), list) else set()
    structural, had_tower = False, False
    for typ in ("captcha",):
        if sum(b.get("type") == typ for b in beats) > 1: errs.append(f"beats: at most one {typ}")
    if sum(b.get("then") == "fold" for b in beats) > 1: errs.append("beats: at most one fold")
    for n, b in enumerate(beats, 1):
        typ = b.get("type")
        if typ not in BEATS:
            errs.append(f"beat {n}: unknown type '{typ}'"); structural = True; continue
        for p in BEATS[typ]["req"]:
            if p not in b: errs.append(f"beat {n}: {typ} needs '{p}'"); structural = True
        for k in b:
            if k not in COMMON and k not in BEATS[typ]["req"]: errs.append(f"beat {n}: unknown param '{k}'")
        for p, kind in SHAPE[typ].items():
            if p not in b: continue
            v = b[p]
            if kind == "id":
                if not isinstance(v, str): errs.append(f"beat {n}: {typ} '{p}' must be one cast id (a string)"); structural = True
                elif v not in ids: errs.append(f"beat {n}: unknown cast id '{v}'"); structural = True
                continue
            ok = isinstance(v, list) and v and all(isinstance(x, str) for x in v) and len(set(v)) == len(v)
            if kind == "pair" and not (ok and len(v) == 2):
                errs.append(f"beat {n}: {typ} '{p}' must list two different cast ids"); structural = True
            elif kind == "ids" and not ok:
                errs.append(f"beat {n}: {typ} '{p}' must be a list of different cast ids"); structural = True
            else:
                for x in v:
                    if x not in ids: errs.append(f"beat {n}: unknown cast id '{x}'"); structural = True
        if "cards" in b:
            if not isinstance(b["cards"], list) or len(b["cards"]) != 2: errs.append(f"beat {n}: cards needs exactly 2"); structural = True
            else:
                for cd in b["cards"]:
                    if not CARD.match(str(cd)): errs.append(f"beat {n}: bad card '{cd}' (rank 2-9TJQKA + suit shdc)")
        if "height" in b:
            hi = MAX_WALL if typ == "wall" else 300
            if not is_count(b["height"], hi): errs.append(f"beat {n}: {typ} height must be 1–{hi} chips" + (" (the chip pool)" if typ == "wall" else ""))
        if "face" in b:
            if not isinstance(b["face"], dict): errs.append(f"beat {n}: face must be {{id: expression}}")
            else:
                for who, e in b["face"].items():
                    if who not in ids: errs.append(f"beat {n}: face for unknown cast id '{who}'")
                    if str(e).startswith("TEXT:"):
                        if len(e) - 5 > 18: errs.append(f"beat {n}: screen text over 18 chars: '{e[5:]}'")
                    elif e not in EXPRS: errs.append(f"beat {n}: unknown expression '{e}'")
        if "say" in b:
            sv = b["say"]
            if not isinstance(sv, (str, dict)): errs.append(f"beat {n}: say must be text or {{\"who\": …, \"text\": …}}"); structural = True
            else:
                who, text = say_of(b)
                if not isinstance(text, str) or not plain(text).strip(): errs.append(f"beat {n}: say needs text"); structural = True
                elif len(plain(text)) > 24: errs.append(f"beat {n}: bubble over 24 chars: '{plain(text)}'")
                if who is None: errs.append(f"beat {n}: say needs a speaker — use {{\"who\": …, \"text\": …}}"); structural = True
                elif who not in ids: errs.append(f"beat {n}: unknown cast id '{who}'"); structural = True
        if "sub" in b:
            if not isinstance(b["sub"], str) or not plain(b["sub"]).strip(): errs.append(f"beat {n}: sub is empty once tags are removed"); structural = True
            elif len(plain(b["sub"])) > 60: errs.append(f"beat {n}: subtitle over 60 chars")
        if typ == "captcha" and isinstance(b.get("text"), str):
            if len(plain(b["text"])) > 24: errs.append(f"beat {n}: CAPTCHA text over 24 chars")
            if "ACE" not in plain(b["text"]).upper(): errs.append(f"beat {n}: the CAPTCHA grid is aces — its text must ask for ACES")
        if "cam" in b and b["cam"] not in CAMS_ANY: errs.append(f"beat {n}: cam must be one of {', '.join(CAMS_ANY)}")
        if "len" in b:
            if not is_num(b["len"]) or b["len"] <= 0: errs.append(f"beat {n}: len must be a number of seconds"); structural = True
            else:
                m = BEATS[typ]["min"] + FOLD_LEN * (b.get("then") == "fold") + TOPPLE_LEN * (b.get("after") == "topple")
                if b["len"] < m: errs.append(f"beat {n}: len {b['len']} is shorter than {typ}'s {m:.1f} s (minimum + endings)")
        if b.get("then", "fold") != "fold": errs.append(f"beat {n}: then must be \"fold\"")
        if b.get("after", "topple") != "topple": errs.append(f"beat {n}: after must be \"topple\"")
        if b.get("after") == "topple" and not had_tower: errs.append(f"beat {n}: 'after: topple' needs an earlier tower beat")
        if typ == "kick" and b.get("after") == "topple": errs.append(f"beat {n}: a kick already topples a stack — drop its after: topple")
        # the orders and roles the template is built for
        if typ == "peek" and b.get("who") != "you": errs.append(f"beat {n}: peek is the human's move (who: \"you\")")
        if typ in ("peek", "flip") and isinstance(b.get("who"), str) and b["who"] not in dealt:
            errs.append(f"beat {n}: '{b['who']}' has no dealt cards to {typ} (add it to the deal)")
        if b.get("then") == "fold" and "you" not in dealt: errs.append(f"beat {n}: 'you' was not dealt, so there is nothing to fold")
        if typ == "kick" and (n == 1 or beats[n - 2].get("type") != "wall"):
            errs.append(f"beat {n}: a kick must come right after a wall (the kicker walks into place during the wall)")
        if typ == "flick" and n != len(beats): errs.append(f"beat {n}: a flick must be the last beat (the target leaves the table)")
        had_tower = had_tower or typ == "tower"
    if structural: return errs
    tl = layout(ep)
    for n, b in enumerate(tl["beats"], 1):
        if b.get("sub") and (b["sub_end"] - b["sub_at"]) / words(b["sub"]) < 0.3:
            errs.append(f"beat {n}: subtitle reads faster than 0.3 s/word ({(b['sub_end'] - b['sub_at']) / words(b['sub']):.2f})")
        if b.get("say_text") and (b["say_end"] - b["say_at"]) / max(1, words(b["say_text"])) < 0.3:
            errs.append(f"beat {n}: bubble reads faster than 0.3 s/word")
    if not 15 <= tl["duration"] <= 25: errs.append(f"duration {tl['duration']:.1f} s is outside 15–25 s")
    return errs


def story(ep, tl):
    dur, end_in = tl["duration"], tl["end_in"]
    hudc = ep.get("hud", {})
    line1, line2 = hudc.get("line1", "NO-LIMIT HOLD'EM"), hudc.get("line2", "")
    pot = ep.get("pot", 0)
    hud = [{"t0": 0.0, "t1": TITLE_LEN, "from": pot, "to": pot, "time": line1, "age": line2}]
    subs, shots = [], [{"cam": "title", "t0": 0.0, "t1": TITLE_LEN}]
    for b in tl["beats"]:
        new = b.get("pot", pot)
        seg = {"t0": b["t0"], "t1": b["t1"], "from": pot, "to": new, "time": line1, "age": line2}
        if new != pot:
            r0, r1 = BEATS[b["type"]]["money"]
            seg["r0"], seg["r1"] = round(b["t0"] + r0, 3), round(b["t0"] + r1, 3)
        hud.append(seg); pot = new
        if b.get("sub"): subs.append([round(b["sub_at"], 2), round(b["sub_end"], 2), plain(b["sub"])])
        shots.append({"cam": b.get("cam", b["type"]), "t0": b["t0"], "t1": b["t1"]})
    hud[-1]["t1"] = shots[-1]["t1"] = dur
    E = ep["end"]
    return {
        "tone": "funny", "look": ep.get("look", {"exposure": 1.1}), "fps": 30, "duration": dur,
        "title": {"html": ep["title"], "in": -0.4, "out": TITLE_OUT},
        "shots": shots, "subs": subs, "hudLabel": "POT", "hudPrefix": "$", "hud": hud,
        "end": {"in": end_in, "html": E["html"], "small": E.get("small", "")},
        # the fade starts AT end.in (not 0.5 s before, as biography does) so the payoff's last beat isn't eaten
        "dips": [[0.0, 0.0, 0.45]], "finalFade": [end_in, round(end_in + 0.8, 3)],
        "debugView": {"center": [0, 0.8, 0], "height": 1.2},
        "episode": {"seed": ep.get("seed", 1), "cast": ep["cast"], "pot": ep.get("pot", 0), "beats": tl["beats"]},
    }


def cues(ep, tl):
    """cues.json (audio/synth.py format) from the same key-moment times story.json carries."""
    dur, end_in = tl["duration"], tl["end_in"]
    ev, impacts = [], []
    robots = {c["id"] for c in ep["cast"] if c["kind"] == "robot"}

    def e(t, sound, gain, **args):
        ev.append({"t": round(t, 3), "sound": sound, "gain_db": gain, "pan": 0.0, "room": -16, "args": args})

    def every(t0, t1, step, fn):
        k = max(1, int(round((t1 - t0) / step)))
        for i in range(k + 1): fn(t0 + i * (t1 - t0) / k, i / k)

    for b in tl["beats"]:
        a, typ = b["at"], b["type"]
        if typ == "deal":
            for x in a["land"]: e(x, "giant_step", -30, size=0.5)
        elif typ == "tower":
            e(a["push"], "chip_clack", -30, n=2)
            every(a["grow0"], a["peak"], 0.12, lambda t, u: e(t, "chip_clack", round(-30 + 6 * u, 1), n=2, size=round(0.8 + 0.4 * u, 2)))
            e(a["peak"], "low_swell", -28, dur=1.8, pitch=0.8)   # low_swell peaks at its anchor (its end)
        elif typ == "peek":
            e(a["lift"], "blanket_rustle", -32, dur=0.4, intensity=0.6)
        elif typ == "flip":
            e(a["flip"], "giant_step", -27, size=0.7)
        elif typ == "handshake":
            e(a["shake0"], "metal_clang", -30, size=0.3, pitch=1.4)
        elif typ == "wall":
            every(a["rise0"], a["rise1"], 0.15, lambda t, u: e(t, "chip_clack", -30, n=2))
        elif typ == "kick":
            e(a["kick"], "metal_clang", -28, size=0.4)
            e(a["topple"], "chip_clack", -26, n=8, spread=0.5)
            impacts.append(a["impact"])
        elif typ == "captcha":
            e(a["slam"], "giant_step", -24, size=1.3)
            for x in a["taps"]: e(x, "robot_bleep", -30, pitch=1.6, n=1)
            ev.append({"sound": "footsteps", "t0": round(a["taps"][0] - 0.3, 3), "t1": a["taps"][-1], "rate": 12.0, "gain_db": -44, "room": -16})
        elif typ == "flick":
            e(a["flick"], "bonk", -26)
            e(a["land"], "giant_step", -28, size=0.5)
        if b.get("then") == "fold": e(a["fold"], "giant_step", -30, size=0.4)
        if b.get("after") == "topple":
            e(a["fall"], "chip_clack", -26, n=8, spread=0.5)
            impacts.append(a["impact"])
        who, text = say_of(b)
        if text and who in robots: e(b["say_at"], "robot_bleep", -28, pitch=1.0, n=2)
    for t in impacts:
        e(t, "distant_boom", -22, size=0.6)
        e(t, "chip_clack", -24, n=14, spread=0.8)

    prog, chords, t, i = ["Cm7", "F7", "Bbmaj7", "G7"], [], TITLE_OUT, 0
    while t < end_in - 1e-6:
        chords.append([round(t, 3), prog[i % 4]]); t += 1.6; i += 1
    chords += [[end_in, "Abmaj7"], [round(end_in + 1.4, 3), "G7"], [round(end_in + 2.6, 3), "Cm7"]]
    music = {
        "instrument": "piano", "gain_db": 0.0, "reverb_db": -10.0, "pad_db": 2.0, "pad_reverb_db": -5.0, "mallet_db": -2.0,
        "leveler": {"thr_rel_db": 3.0, "ratio": 2.5, "tau": 0.25}, "end": dur, "chords": chords,
        "sections": [
            {"t0": TITLE_OUT, "t1": end_in, "style": "walk", "vel": [[TITLE_OUT, 0.24], [end_in, 0.28]], "step": 0.4,
             "bass_hold": 0.95, "bass_vel": 0.95, "comp_vel": 0.42, "stab_hold": 0.8, "swing": 0.14},
            {"t0": end_in, "t1": dur, "style": "arp", "vel": 0.22, "step": 0.4, "pattern": [0, 1, 2, 3, 2, 1]}],
        "melody": [], "mallet_melody": [],
        "pad": [{"t0": round(TITLE_OUT - 0.3, 3), "t1": dur, "notes": [36, 48, 55], "level": 0.8, "attack": 0.8, "release": 0.8}],
        "stings": [{"t": TITLE_OUT, "midi": 36, "vel": 0.3, "hold": 1.3}] + [{"t": t, "midi": 36, "vel": 0.26, "hold": 0.9} for t in impacts],
        "ducks": [], "auto_duck": {"db": -3.0, "categories": ["prop"], "lookahead": 0.04, "hold": 0.4, "smooth": 0.2, "max_len": 1.0},
        "eq": [{"f": 2800, "q": 0.8, "db": -2.0}, {"f": 6500, "q": 0.6, "db": -4.0}],
    }
    return {
        "title": plain(ep["title"]), "duration": dur, "target_lufs": -15.0, "limiter_ceiling_dbtp": -1.5,
        "end_fade": [round(dur - 1.0, 3), dur],
        "stem_gain_db": {"music": -6.0, "sfx": 12.0, "amb": 9.0},
        "stem_dynamics": {"music": {"limit_dbfs": -3.0, "lim_win": 0.015},
                          "sfx": {"comp_thr_dbfs": -15.0, "ratio": 2.5, "win": 0.004, "limit_dbfs": -5.0}},
        "sfx_lowpass_hz": 5000,
        "shots": [0.0, TITLE_LEN] + [b["t1"] for b in tl["beats"]] + [dur],
        "ambience": [
            {"sound": "room_tone", "t0": 0.0, "t1": dur, "fade_in": 0.4, "fade_out": 0.06, "gain_db": -38, "seed": 1},
            {"sound": "city_day", "t0": 0.0, "t1": dur, "fade_in": 1.0, "fade_out": 0.06, "gain_db": -47, "seed": 2,
             "args": {"murmur": 0.6, "traffic": 0.0}}],
        "events": ev, "music": music,
    }


def caption_md(ep):
    c = ep["caption"]
    return f"# Caption\n\n{c['hook']}\n\n{c['summary']}\n\n{c['cta']}\n{c['send']}\n\n{' '.join(c['tags'])}\n"


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
    if not os.path.exists(stub): open(stub, "w").write("export * from '/formats/aitable/shots.js';\n")
    chk = subprocess.run([sys.executable, "-I", os.path.join(ROOT, "tools", "caption.py"), vdir], capture_output=True, text=True)
    if chk.returncode:
        print(f"{slug}: caption.md fails tools/caption.py:\n{chk.stdout}{chk.stderr}")
        sys.exit(1)
    print(f"{slug}: {len(tl['beats'])} beats, duration {tl['duration']:.1f} s (end card in at {tl['end_in']:.1f})")
    for b in tl["beats"]:
        moments = ", ".join(f"{k} {v if not isinstance(v, list) else '/'.join(map(str, v))}" for k, v in b["at"].items())
        text = " | ".join(x for x in (b.get("sub"), say_of(b)[1]) if x)
        print(f"  {b['type']:9s} {b['t0']:6.2f}-{b['t1']:6.2f}  {moments}  {text}")


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    build(sys.argv[1])
