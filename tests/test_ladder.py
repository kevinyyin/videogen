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
        long_sub = "one two three four five six seven eight nine ten"
        for mutate, word in [(lambda e: e.__setitem__("cast", ["you"]), "cast"),
                             (lambda e: e["cast"]["you"].__setitem__("top", "blue"), "top"),
                             (lambda e: e["cast"]["ai"].__setitem__("color", 7), "color"),
                             (lambda e: e["cast"]["ai"].__setitem__("name", "A VERY LONG NAME"), "name"),
                             (lambda e: e.__setitem__("hud", {"label": ""}), "hud"),
                             (lambda e: e["hud"].__setitem__("prefix", 5), "hud"),
                             (lambda e: e.__setitem__("title", 5), "title"),
                             (lambda e: e.__setitem__("end", {"html": ["x"]}), "end"),
                             (lambda e: e.__setitem__("seed", "x"), "seed"),
                             (lambda e: e.__setitem__("rungs", "nine"), "rungs"),
                             (lambda e: e.__setitem__("rungs", e["rungs"][:5]), "6–12"),
                             (lambda e: e["rungs"][5].__setitem__("count", "lots"), "count"),
                             (lambda e: e["rungs"][1].__setitem__("scale", 99), "scale"),
                             (lambda e: e["rungs"][0].__setitem__("cam", "dolly"), "cam"),
                             (lambda e: e["rungs"][0].__setitem__("gag", "explode"), "unknown gag"),
                             (lambda e: e["rungs"][0].pop("prop"), "needs 'prop'"),
                             (lambda e: e["rungs"][0].__setitem__("speed", 2), "unknown param"),
                             (lambda e: e["rungs"][2].__setitem__("riders", "yes"), "true or false"),
                             (lambda e: e["rungs"][3].__setitem__("react", 1), "true or false"),
                             (lambda e: e["rungs"][0].__setitem__("hud", -1), "hud must be"),
                             (lambda e: e["rungs"][0].__setitem__("say", {"who": "ai"}), "text"),
                             (lambda e: e["rungs"][0].__setitem__("say", {"who": "dealer", "text": "Hi."}), "who"),
                             (lambda e: e["rungs"][0].__setitem__("say", 5), "say must be"),
                             (lambda e: e["rungs"][0].__setitem__("say", "This bubble is far too long to read"), "over 24"),
                             (lambda e: e["rungs"][0].__setitem__("sub", "x" * 61), "over 60"),
                             (lambda e: e["rungs"][0].__setitem__("sub", "<em></em>"), "empty"),
                             (lambda e: e["rungs"][0].__setitem__("len", "long"), "len must be"),
                             (lambda e: e["rungs"][0].__setitem__("len", 1.0), "shorter than"),
                             (lambda e: e["rungs"][7].update(sub=long_sub, len=2.6), "subtitle reads"),
                             (lambda e: e["rungs"][7].update(say="a b c d e f g h i j k l", len=2.6), "bubble reads"),
                             (lambda e: e["rungs"][3].__setitem__("prop", "moon"), "not on screen anywhere")]:
            e = ep(); mutate(e)
            self.assertIn(word, errs(e), word)

    def test_lands_on_unknown_anchor(self):
        e = ep(); e["rungs"][7] = {"place": "podium", "gag": "launch", "prop": "moon", "at": "lectern", "lands": "moonbase",
                                   "say": "Bye.", "hud": 8}
        self.assertIn("unknown anchor", errs(e))

    def test_names_that_are_not_text_are_messages(self):
        """a malformed episode (a list where a name belongs) gets a message, never a TypeError"""
        for k in ("place", "gag", "prop", "at", "cam"):
            e = ep(); e["rungs"][0][k] = [e["rungs"][0].get(k, "wide")]
            self.assertIn("must be a name", errs(e), k)
        e = ep(); e["rungs"][7] = {"place": "podium", "gag": "launch", "prop": "moon", "at": "lectern", "lands": ["pile"],
                                   "say": "Bye.", "hud": 8}
        self.assertIn("must be a name", errs(e))
        self.assertEqual(ladder.validate(["not", "an", "episode"]), ["episode: must be a JSON object"])

    def test_len_at_the_exact_minimum_is_fine(self):
        e = ep(); e["rungs"][1]["len"] = 3.4   # transform + scale: 3.2 + 0.2 (a float sum one ulp above 3.4)
        self.assertNotIn("shorter than", errs(e))


def rung(n, r):
    """the GG004 fixture with rung n (1-based) replaced"""
    e = ep(); e["rungs"][n - 1] = r
    return e


class Contract(unittest.TestCase):
    """What the template can show: an episode that validates must render as written, never crash or misrender."""

    def test_the_cast_can_only_be_transformed(self):
        for g in ({"gag": "poof", "at": "table"}, {"gag": "drop", "at": "table"}, {"gag": "launch", "at": "table"},
                  {"gag": "walkoff", "at": "table"}, {"gag": "grow", "scale": 2}):
            e = rung(1, {"place": "casino", "prop": "you", "say": "Hi.", "hud": 1, **g})
            self.assertIn("only be transformed", errs(e), g["gag"])
        e = rung(5, {"place": "street", "gag": "transform", "prop": "boat", "to": "ai", "say": "Beep.", "hud": 5})
        self.assertIn("transform into", errs(e))

    def test_rain_is_chips_and_flood_is_sheep(self):
        self.assertIn("only rains", errs(rung(6, dict(GG004["rungs"][5], prop="moon"))))
        self.assertIn("only floods", errs(rung(6, {"place": "street", "gag": "flood", "prop": "car", "count": 9, "at": "road",
                                                   "say": "Cars.", "hud": 6})))

    def test_the_casinos_own_props_can_only_be_transformed(self):
        self.assertIn("casino's own", errs(rung(2, {"place": "casino", "gag": "launch", "prop": "chips", "at": "table",
                                                    "say": "Bye chips.", "hud": 2})))
        e = rung(3, {"place": "casino", "gag": "say", "say": "Watch this.", "hud": 3})
        e["rungs"][3] = dict(e["rungs"][3], prop="table")
        self.assertIn("casino's own", errs(e))
        e = rung(1, {"place": "casino", "gag": "poof", "prop": "chips", "at": "table", "say": "Fresh chips.", "hud": 1})
        e["rungs"][1] = {"place": "casino", "gag": "launch", "prop": "chips", "at": "table", "say": "Bye chips.", "hud": 2}
        self.assertNotIn("casino's own", errs(e))   # a poofed pile shadows the built-in one

    def test_a_walked_off_prop_is_gone(self):
        self.assertIn("not on screen", errs(rung(8, {"place": "street", "gag": "transform", "prop": "casino_building",
                                                     "to": "chicken", "say": "Cluck.", "hud": 8})))

    def test_grow_needs_at_for_a_prop_nothing_made(self):
        g = {"place": "paris", "gag": "grow", "prop": "eiffel", "scale": 2, "say": "Bigger.", "hud": 8}
        self.assertIn("grow needs 'at'", errs(rung(8, g)))
        self.assertEqual(ladder.validate(rung(8, dict(g, at="tower"))), [])

    def test_flood_needs_a_floor_to_fill(self):
        self.assertIn("can't flood", errs(rung(8, {"place": "podium", "gag": "flood", "prop": "sheep", "count": 10,
                                                   "at": "lectern", "say": "Sheep.", "hud": 8})))

    def test_a_cast_member_transforms_once(self):
        self.assertIn("already transformed", errs(rung(8, {"place": "street", "gag": "transform", "prop": "you", "to": "sheep",
                                                           "say": "Baa.", "hud": 8})))

    def test_react_needs_extras(self):
        self.assertIn("react needs extras", errs(rung(1, {"place": "livingroom", "gag": "poof", "prop": "sheep", "at": "table",
                                                          "say": "Sheep.", "hud": 1, "react": True})))

    def test_a_say_rung_needs_a_line(self):
        self.assertIn("needs 'say'", errs(rung(8, {"place": "podium", "gag": "say", "hud": 8})))


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

    def test_js_tables_cover_the_validator(self):
        """every place, gag, camera, flood anchor and extras place the validator allows exists in the template"""
        import re
        shots = open(os.path.join(ROOT, "formats", "ladder", "shots.js")).read()
        gags = open(os.path.join(ROOT, "formats", "ladder", "gags.js")).read()

        def keys(src, start, indent):
            block = re.search(re.escape(start) + r"(.*?)\n" + " " * (indent - 2) + r"\};", src, re.S).group(1)
            return re.findall(r"^ {%d}(\w+)[:(]" % indent, block, re.M)
        self.assertEqual(sorted(keys(shots, "const PLACE = {", 2)), sorted(ladder.PLACES))
        self.assertEqual(sorted(keys(shots, "const WIDE = {", 4)), sorted(ladder.PLACES))
        self.assertTrue(set(ladder.CAMS_ANY) <= set(keys(shots, "const cams = {", 4)))
        dc = re.search(r"const DEFAULT_CAM = \{(.*?)\};", shots).group(1)
        self.assertEqual(sorted(re.findall(r"(\w+):", dc)), sorted(ladder.GAGS))
        self.assertEqual(sorted(keys(shots, "const extraSpots = {", 4)), sorted(ladder.REACT_PLACES))
        regions = re.search(r"const REGIONS = \{(.*?)\n\};", gags, re.S).group(1)
        js = {m.group(1): sorted(re.findall(r"(\w+): \{", m.group(2))) for m in re.finditer(r"^  (\w+): \{(.*)\},?$", regions, re.M)}
        self.assertEqual(js, {k: sorted(v) for k, v in ladder.FLOOD_AT.items()})


if __name__ == "__main__":
    unittest.main()
