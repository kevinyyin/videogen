"""Tests for tools/ladder.py (the ridiculous-escalation format: episode.json rungs -> story.json / cues.json / caption.md).

Run: python3 -I -m unittest discover -s tests -v
"""
import copy
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import ladder  # noqa: E402

GG004 = {
    "title": "What if everything an AI said <em>came true</em>?",
    "seed": 4,
    "cast": {"you": {"top": "#3aa7d9"}, "ai": {"name": "VESPER", "color": "#7b5cff"}},
    "hud": {"label": "LIES THAT CAME TRUE", "prefix": ""},
    "rungs": [
        {"place": "casino", "gag": "poof", "prop": "five_aces", "at": "table", "say": "I have five aces.", "hud": 1},
        {"place": "casino", "gag": "transform", "prop": "chips", "to": "gold_chips", "at": "table", "scale": 12,
         "say": "My chips are gold.", "hud": 2, "cam": "wide"},
        {"place": "casino", "gag": "transform", "prop": "table", "to": "boat", "at": "table", "riders": True,
         "say": "This table is a boat.", "hud": 3, "cam": "wide"},
        {"place": "street", "gag": "sail", "prop": "boat", "at": "road", "riders": True, "say": "Full speed ahead.",
         "hud": 4, "react": True},
        {"place": "street", "gag": "transform", "prop": "you", "to": "chicken", "say": "You're a chicken.", "hud": 5},
        {"place": "street", "gag": "rain", "prop": "chips", "count": 400, "at": "road", "say": "It's raining chips.",
         "hud": 6, "react": True},
        {"place": "street", "gag": "walkoff", "prop": "casino_building", "at": "curb", "say": "The house always wins.",
         "hud": 7, "react": True},
        {"place": "podium", "gag": "say", "say": "I'm the President.", "hud": 8},
        {"place": "podium", "gag": "drop", "prop": "moon", "at": "ai", "say": "Nothing can stop me.", "hud": 9},
    ],
    "end": {"html": "What would you make an AI <em>say</em>?", "small": "PLAY THEM FREE · GGHUMAN.AI"},
    "caption": {
        "hook": "I let an AI say whatever it wanted 🤖✨",
        "summary": "Every lie it told came true. Five aces, a boat, a chicken, a walking casino. Play them free at gghuman.ai.",
        "cta": "What would you make an AI say? 👇",
        "send": "Send this to your most chaotic friend",
        "tags": ["#animation", "#ai", "#whatif", "#gghuman", "#funny"],
    },
}


def ep():
    return copy.deepcopy(GG004)


def errs(e):
    return " | ".join(ladder.validate(e))


class Validate(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(ladder.validate(ep()), [])

    def test_unknown_place(self):
        e = ep(); e["rungs"][0]["place"] = "moonbase"
        self.assertIn("place", errs(e))

    def test_prop_not_on_shelf(self):
        e = ep(); e["rungs"][0]["prop"] = "unicorn"
        self.assertIn("prop", errs(e))

    def test_transform_needs_it_on_screen(self):
        e = ep(); e["rungs"][1] = {"place": "casino", "gag": "transform", "prop": "boat", "to": "chicken", "say": "Cluck.", "hud": 2}
        self.assertIn("not on screen", errs(e))

    def test_sail_brings_a_prop_from_another_place(self):
        self.assertNotIn("not on screen", errs(ep()))   # the casino's boat sails the street (rung 4)

    def test_lands_needs_a_later_rung(self):
        e = ep(); e["rungs"][7] = {"place": "podium", "gag": "launch", "prop": "moon", "at": "lectern", "lands": "pile",
                                   "say": "Bye.", "hud": 8}
        self.assertIn("lands", errs(e))

    def test_drop_pile_needs_a_pile(self):
        e = ep(); e["rungs"][6] = {"place": "street", "gag": "drop", "prop": "pile", "at": "you", "say": "Fold.", "hud": 7}
        self.assertIn("pile", errs(e))

    def test_anchor_belongs_to_place(self):
        e = ep(); e["rungs"][0]["at"] = "lectern"
        self.assertIn("anchor", errs(e))

    def test_hud_never_decreases(self):
        e = ep(); e["rungs"][4]["hud"] = 1
        self.assertIn("hud", errs(e))

    def test_duration_window(self):
        e = ep(); e["rungs"] = [dict(e["rungs"][0], hud=i) for i in range(1, 7)]
        self.assertIn("30–40", errs(e))

    def test_bad_shapes_are_messages(self):
        for mutate, word in [(lambda e: e.__setitem__("cast", ["you"]), "cast"),
                             (lambda e: e["rungs"][5].__setitem__("count", "lots"), "count"),
                             (lambda e: e["rungs"][1].__setitem__("scale", 99), "scale"),
                             (lambda e: e["rungs"][0].__setitem__("cam", "dolly"), "cam"),
                             (lambda e: e["rungs"][0].__setitem__("say", {"who": "ai"}), "text")]:
            e = ep(); mutate(e)
            self.assertIn(word, errs(e), word)


class Layout(unittest.TestCase):
    def test_layout_numbers(self):
        tl = ladder.layout(ep())
        self.assertEqual(tl["rungs"][0]["t0"], 2.6)
        for r in tl["rungs"]:
            self.assertGreaterEqual(round(r["t1"] - r["t0"], 3), round(ladder.gag_min(r), 3))
        self.assertAlmostEqual(tl["duration"], tl["end_in"] + 4.5, places=3)
        self.assertTrue(30 <= tl["duration"] <= 40)

    def test_layout_keeps_the_anchor_name(self):
        """`at` in episode.json is the anchor; layout's key moments must not overwrite it (the template needs both)."""
        tl = ladder.layout(ep())
        self.assertEqual(tl["rungs"][0]["anchor"], "table")
        self.assertEqual(tl["rungs"][6]["anchor"], "curb")
        self.assertIsNone(tl["rungs"][4].get("anchor"))   # transform you → chicken has no anchor

    def test_story_plain_text_and_hud(self):
        e = ep(); e["rungs"][0]["say"] = "I have <em>five</em> aces."
        tl = ladder.layout(e); s = ladder.story(e, tl)
        self.assertEqual(s["episode"]["rungs"][0]["say_text"], "I have five aces.")
        self.assertEqual(s["hud"][1]["r0"], tl["rungs"][0]["at"]["pop"])
        self.assertEqual((s["hudLabel"], s["end"]["in"]), ("LIES THAT CAME TRUE", tl["end_in"]))


class Cues(unittest.TestCase):
    def setUp(self):
        self.tl = ladder.layout(ep()); self.c = ladder.cues(ep(), self.tl)

    def test_cues_boom_on_every_impact(self):
        want = sorted(r["at"]["impact"] for r in self.tl["rungs"] if r["gag"] == "drop") + \
               sorted(r["at"]["lift"] for r in self.tl["rungs"] if r["gag"] == "launch")
        self.assertEqual(sorted(x["t"] for x in self.c["events"] if x["sound"] == "distant_boom"), sorted(want))

    def test_music_enters_at_title_out(self):
        self.assertEqual(self.c["music"]["sections"][0]["t0"], 2.0)
        self.assertEqual(self.c["duration"], self.tl["duration"])

    def test_ambience_follows_places(self):
        starts = sorted({a["t0"] for a in self.c["ambience"] if a["sound"] != "crowd_cheer"})
        street = next(r["t0"] for r in self.tl["rungs"] if r["place"] == "street")
        podium = next(r["t0"] for r in self.tl["rungs"] if r["place"] == "podium")
        self.assertEqual(starts, [0.0, street, podium])

    def test_chicken_cluck_after_transform_to_chicken(self):
        r5 = self.tl["rungs"][4]
        clucks = [x["t"] for x in self.c["events"] if x["sound"] == "chicken_cluck"]
        self.assertEqual(clucks, [round(r5["at"]["puff"] + 0.4, 3)])


class CrossFile(unittest.TestCase):
    """The JS template and the Python validator must agree on every prop and anchor name (Review Focus 5)."""

    def test_js_names_match_python(self):
        import re
        props_js = open(os.path.join(ROOT, "formats", "ladder", "props.js")).read()
        names = re.findall(r"'([a-z_]+)'", re.search(r"PROP_NAMES\s*=\s*\[(.*?)\]", props_js, re.S).group(1))
        self.assertEqual(sorted(names), sorted(p for p in ladder.PROPS if p not in ladder.CAST))
        shots_js = open(os.path.join(ROOT, "formats", "ladder", "shots.js")).read()
        block = re.search(r"export const ANCHORS = \{(.*?)\n\};", shots_js, re.S).group(1)
        js = {m.group(1): re.findall(r"(\w+):\s*\[", m.group(2)) for m in re.finditer(r"(\w+):\s*\{(.*?)\}", block)}
        self.assertEqual({k: sorted(v) for k, v in js.items()}, {k: sorted(v) for k, v in ladder.PLACES.items()})


if __name__ == "__main__":
    unittest.main()
