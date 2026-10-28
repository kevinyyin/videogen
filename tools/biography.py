#!/usr/bin/env python3
"""Biography harness: videos/<slug>/script.json (a beat table of narration) -> videos/<slug>/story.json.

    python3 -I tools/biography.py 009-abe-lincoln

Why: biography reels are NARRATED (full, connected sentences, user steer on 009 v1: fragments read "choppy, taken out of
context"), so shot length must follow the narration, not the other way round. You write the life as beats; this tool lays
out the timeline: each line is on screen for max(min_line, words * pace), lines are separated by `gap`, a shot lasts
lead + its lines + tail (at least `min_shot`, plus any `extra`). It also writes the HUD (age rolls at every cut, date +
place lines), the title, the end card (fully visible >= 4 s), dips and the final fade.

script.json:
  { "tone": "biography", "look": {...}, "fps": 30,
    "title": {"html": "The story of <em>Name</em>", "len": 4.0},          # the first beat holds the title (no lines)
    "pace": 0.31, "gap": 0.3, "lead": 0.3, "tail": 0.35, "min_line": 1.8, "min_shot": 3.6,
    "hudLabel": "AGE",
    "beats": [ {"cam": "birth", "set": "cabin", "age": 0, "date": "FEB 12, 1809", "place": "HODGENVILLE, KENTUCKY",
                "lines": ["On February 12, 1809, ..."], "extra": 0.4, "src": [3.6, 6.9]}, ... ],
    # "len": 3.0 fixes a beat's length instead; its line can run on under the next (line-less) beat = a cut mid-sentence
    "dips_src": [[s_start, s_peak, s_end]],      # in shots.js (src) time, mapped onto the new timeline
    "end": {"html": "...", "small": "TELL US BELOW", "after": 0.6, "hold": 4.2},
    "goldLast": true }
`src` (optional) = the shot's time range in shots.js's own clock. When present, story.shots carries s0/s1 and shots.js maps
real time -> src time (toSrc) so a shot's choreography stretches to fit the narration without rewriting it. New videos can
author shots.js in the new timeline directly and skip `src`.
Prints a timing table + any line that would read faster than 0.3 s/word (QC rule).
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build(slug):
    vdir = os.path.join(ROOT, "videos", slug)
    S = json.load(open(os.path.join(vdir, "script.json")))
    pace, gap, lead, tail = S.get("pace", 0.31), S.get("gap", 0.3), S.get("lead", 0.3), S.get("tail", 0.35)
    min_line, min_shot = S.get("min_line", 1.8), S.get("min_shot", 3.6)
    t, shots, subs, hud = 0.0, [], [], []
    prev_age = None
    for i, b in enumerate(S["beats"]):
        lines = b.get("lines", [])
        durs = [max(min_line, len(l.split()) * pace) + b.get("line_extra", 0) for l in lines]
        body = sum(durs) + gap * max(0, len(lines) - 1)
        L = S["title"]["len"] if i == 0 and not lines else max(min_shot, lead + body + tail) + b.get("extra", 0)
        if "len" in b: L = b["len"]   # fixed length: its lines may run on into the next beat (give that beat no lines) — a cut under a line
        t0, t1 = round(t, 3), round(t + L, 3)
        sh = {"cam": b["cam"], "set": b["set"], "t0": t0, "t1": t1}
        if "src" in b: sh["s0"], sh["s1"] = b["src"]
        shots.append(sh)
        u = t0 + lead + b.get("delay", 0)
        for l, d in zip(lines, durs):
            subs.append([round(u, 2), round(u + d, 2), l]); u += d + gap
        age = b.get("age", prev_age if prev_age is not None else 0)
        seg = {"t0": t0, "t1": t1, "from": prev_age if prev_age is not None else age, "to": age, "time": b.get("date", ""), "age": b.get("place", "")}
        if seg["from"] != seg["to"]: seg["r0"], seg["r1"] = round(t0 + 0.05, 2), round(t0 + 0.65, 2)
        hud.append(seg); prev_age = age
        t = t1
    # end card: after the last line; the last shot is stretched so the card is fully visible >= hold - 0.5 s
    E = S["end"]
    end_in = round(subs[-1][1] + E.get("after", 0.6), 2)
    dur = round(max(t, end_in + E.get("hold", 4.2)), 2)
    shots[-1]["t1"] = dur; hud[-1]["t1"] = dur
    if S.get("goldLast"): hud[-1]["ageGoldAt"] = subs[-1][0]
    # src -> new map for dips written in shots.js time
    def to_new(s):
        for sh in shots:
            if "s0" in sh and sh["s0"] - 1e-6 <= s <= sh["s1"] + 1e-6:
                return round(sh["t0"] + (s - sh["s0"]) / (sh["s1"] - sh["s0"]) * (sh["t1"] - sh["t0"]), 3)
        raise ValueError(f"src time {s} is outside every shot's src range")
    dips = [[to_new(a), to_new(m), to_new(z)] for a, m, z in S.get("dips_src", [])] + S.get("dips", [])
    story = {"tone": S.get("tone", "biography"), "look": S.get("look", {}), "fps": S.get("fps", 30), "duration": dur,
             "title": {"html": S["title"]["html"], "in": -0.4, "out": round(S["title"]["len"] - 0.6, 2)},
             "shots": shots, "subs": subs, "hudLabel": S.get("hudLabel", "AGE"), "hud": hud,
             "end": {"in": end_in, "html": E["html"], "small": E.get("small", "")},
             "dips": dips, "finalFade": [round(end_in - 0.5, 2), end_in], "debugView": S.get("debugView", {"center": [0, 0, 0], "height": 12})}
    json.dump(story, open(os.path.join(vdir, "story.json"), "w"), indent=1, ensure_ascii=False)
    print(f"{slug}: {len(shots)} shots, {len(subs)} lines, duration {dur:.1f} s (end card in at {end_in:.1f})")
    for sh in shots:
        n = [s for s in subs if sh["t0"] <= s[0] < sh["t1"]]
        print(f"  {sh['cam']:10s} {sh['t0']:6.2f}-{sh['t1']:6.2f}  ({sh['t1'] - sh['t0']:4.1f} s)  {len(n)} line(s)")
    for (a0, b0, l0), (a1, b1, l1) in zip(subs, subs[1:]):
        if a1 < b0: print(f"  ⚠️  overlapping lines: {l0!r} / {l1!r}")
    for a, b, l in subs:
        if (b - a) / len(l.split()) < 0.299: print(f"  ⚠️  reads too fast ({(b - a) / len(l.split()):.2f} s/word): {l}")
        if len(l) > 96: print(f"  ⚠️  {len(l)} chars — may wrap to 3 lines (keep ≤ ~95): {l}")
    return story


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    build(sys.argv[1])
