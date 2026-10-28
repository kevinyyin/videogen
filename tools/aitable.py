#!/usr/bin/env python3
"""AI Table harness: videos/<slug>/episode.json -> videos/<slug>/story.json (the GGhuman format, formats/aitable/).

    python3 -I tools/aitable.py gg001-ai-bluff

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
    "handshake": {"min": 3.2, "req": ["who"], "at": {"shake0": 1.0, "shake1": 1.8}, "say_at": 0.4, "money": (0.3, 0.9)},
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
            o["say_at"] = round(t0 + info["say_at"], 3)
            o["say_end"] = round(min(t1, o["say_at"] + read(text) + 0.8), 3)
        out.append(o); t = t1
    end_in = round(t, 3)
    return {"title_len": TITLE_LEN, "beats": out, "end_in": end_in, "duration": round(end_in + END_HOLD, 3)}


def validate(ep):
    errs = []
    cast = ep.get("cast", [])
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
        if c.get("kind") == "robot" and not c.get("color"): errs.append(f"cast '{cid}': a robot needs a color")
        if "stack" in c and not (isinstance(c["stack"], int) and 1 <= c["stack"] <= 300): errs.append(f"cast '{cid}': stack must be 1–300 chips")
    for k in ("title", "end", "beats"):
        if not ep.get(k): errs.append(f"missing '{k}'")
    structural = False
    had_tower = False
    for n, b in enumerate(ep.get("beats", []), 1):
        typ = b.get("type")
        if typ not in BEATS:
            errs.append(f"beat {n}: unknown type '{typ}'"); structural = True; continue
        for p in BEATS[typ]["req"]:
            if p not in b: errs.append(f"beat {n}: {typ} needs '{p}'"); structural = True
        for k in b:
            if k not in COMMON and k not in BEATS[typ]["req"]: errs.append(f"beat {n}: unknown param '{k}'")
        for p in ID_PARAMS:
            for x in (b.get(p) if isinstance(b.get(p), list) else [b.get(p)] if p in b else []):
                if x not in ids: errs.append(f"beat {n}: unknown cast id '{x}'"); structural = True
        if "cards" in b:
            if len(b["cards"]) != 2: errs.append(f"beat {n}: cards needs exactly 2")
            for c in b["cards"]:
                if not CARD.match(str(c)): errs.append(f"beat {n}: bad card '{c}' (rank 2-9TJQKA + suit shdc)")
        if "height" in b and not (isinstance(b["height"], int) and 1 <= b["height"] <= 300): errs.append(f"beat {n}: height must be 1–300 chips")
        for who, e in (b.get("face") or {}).items():
            if who not in ids: errs.append(f"beat {n}: face for unknown cast id '{who}'")
            if str(e).startswith("TEXT:"):
                if len(e) - 5 > 18: errs.append(f"beat {n}: screen text over 18 chars: '{e[5:]}'")
            elif e not in EXPRS: errs.append(f"beat {n}: unknown expression '{e}'")
        if "say" in b:
            who, text = say_of(b)
            if who is None: errs.append(f"beat {n}: say needs a speaker — use {{\"who\": …, \"text\": …}}")
            elif who not in ids: errs.append(f"beat {n}: unknown cast id '{who}'")
            if len(plain(text)) > 24: errs.append(f"beat {n}: bubble over 24 chars: '{plain(text)}'")
        if typ == "captcha" and len(plain(b.get("text"))) > 24: errs.append(f"beat {n}: CAPTCHA text over 24 chars")
        if len(plain(b.get("sub"))) > 60: errs.append(f"beat {n}: subtitle over 60 chars")
        if b.get("then", "fold") != "fold": errs.append(f"beat {n}: then must be \"fold\"")
        if b.get("after", "topple") != "topple": errs.append(f"beat {n}: after must be \"topple\"")
        if b.get("after") == "topple" and not had_tower: errs.append(f"beat {n}: 'after: topple' needs an earlier tower beat")
        had_tower = had_tower or typ == "tower"
    if structural or not ep.get("beats"): return errs
    tl = layout(ep)
    for n, b in enumerate(tl["beats"], 1):
        if b.get("sub") and (b["sub_end"] - b["sub_at"]) / words(b["sub"]) < 0.3:
            errs.append(f"beat {n}: subtitle reads faster than 0.3 s/word ({(b['sub_end'] - b['sub_at']) / words(b['sub']):.2f})")
        _, text = say_of(b)
        if text and (b["say_end"] - b["say_at"]) / max(1, words(text)) < 0.3:
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
        if b.get("sub"): subs.append([round(b["sub_at"], 2), round(b["sub_end"], 2), b["sub"]])
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
    print(f"{slug}: {len(tl['beats'])} beats, duration {tl['duration']:.1f} s (end card in at {tl['end_in']:.1f})")
    for b in tl["beats"]:
        moments = ", ".join(f"{k} {v if not isinstance(v, list) else '/'.join(map(str, v))}" for k, v in b["at"].items())
        text = " | ".join(x for x in (b.get("sub"), say_of(b)[1]) if x)
        print(f"  {b['type']:9s} {b['t0']:6.2f}-{b['t1']:6.2f}  {moments}  {text}")


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    build(sys.argv[1])
