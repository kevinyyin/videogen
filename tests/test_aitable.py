"""Tests for tools/aitable.py (episode.json -> story.json / cues.json / caption.md).

Run: python3 -I -m unittest discover -s tests -v
"""
import copy
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools"))
import aitable  # noqa: E402

GG001 = {
    "title": "What if an AI could <em>bluff</em> you?",
    "seed": 1,
    "cast": [
        {"id": "you", "kind": "human", "seat": "near", "top": "#f2c230"},
        {"id": "VESPER", "kind": "robot", "seat": "far", "color": "#7b5cff"},
    ],
    "pot": 200,
    "hud": {"line1": "NO-LIMIT HOLD'EM", "line2": ""},
    "beats": [
        {"type": "deal", "to": ["you", "VESPER"], "sub": "This AI has never lost a hand."},
        {"type": "tower", "who": "VESPER", "height": 120, "say": "All in.", "pot": 50000, "face": {"VESPER": "smug"}},
        {"type": "peek", "who": "you", "cards": ["As", "Ad"], "then": "fold", "sub": "Pocket aces. He folds anyway."},
        {"type": "flip", "who": "VESPER", "cards": ["7c", "2d"], "say": "gg, human.", "after": "topple", "face": {"VESPER": "laugh"}},
    ],
    "end": {"html": "Could you tell it was <em>lying</em>?", "small": "PLAY THEM FREE · GGHUMAN.AI"},
    "caption": {
        "hook": "This AI has never lost a hand 🃏🤖",
        "summary": "Pocket aces against a tiny robot that just went all in. On GGhuman the AIs bluff, lie and team up, "
                   "just like people. Play them free at gghuman.ai.",
        "cta": "Would you have called? 👇",
        "send": "Send this to your poker friend",
        "tags": ["#animation", "#ai", "#poker", "#gghuman", "#whatif"],
    },
}


def ep():
    return copy.deepcopy(GG001)


class Validate(unittest.TestCase):
    def test_valid_episode_has_no_errors(self):
        self.assertEqual(aitable.validate(ep()), [])

    def test_unknown_type(self):
        e = ep(); e["beats"][0]["type"] = "dance"
        self.assertIn("beat 1: unknown type 'dance'", aitable.validate(e))

    def test_same_seat_twice(self):
        e = ep(); e["cast"][1]["seat"] = "near"
        self.assertTrue(any("seat 'near'" in x for x in aitable.validate(e)))

    def test_bad_card(self):
        e = ep(); e["beats"][2]["cards"] = ["As", "1d"]
        self.assertTrue(any("'1d'" in x for x in aitable.validate(e)))

    def test_long_bubble(self):
        e = ep(); e["beats"][1]["say"] = "x" * 25
        self.assertTrue(any("bubble" in x for x in aitable.validate(e)))

    def test_tags_not_counted(self):
        e = ep(); e["beats"][1]["say"] = "<em>" + "x" * 24 + "</em>"
        self.assertEqual(aitable.validate(e), [])

    def test_screen_text_limit(self):
        e = ep(); e["beats"][1]["face"] = {"VESPER": "TEXT:" + "X" * 19}
        self.assertTrue(any("18" in x for x in aitable.validate(e)))

    def test_topple_needs_tower(self):
        e = ep(); del e["beats"][1]
        self.assertTrue(any("topple" in x for x in aitable.validate(e)))

    def test_fixed_len_too_fast(self):
        e = ep(); e["beats"][0]["len"] = 1.0
        self.assertTrue(any("0.3 s/word" in x for x in aitable.validate(e)))

    def test_duration_window(self):
        e = ep(); e["beats"] = e["beats"][:1]
        self.assertTrue(any("15–25" in x for x in aitable.validate(e)))


class Layout(unittest.TestCase):
    def test_layout_gg001(self):
        tl = aitable.layout(ep())
        self.assertEqual([round(b["t0"], 2) for b in tl["beats"]], [2.6, 5.8, 9.4, 13.6])  # deal 3.2, tower 3.6, peek 3.4+0.8
        self.assertAlmostEqual(tl["beats"][3]["t1"], 18.8, places=2)                        # flip 3.8 + 1.4
        self.assertAlmostEqual(tl["beats"][3]["at"]["impact"], 18.1, places=2)
        self.assertAlmostEqual(tl["duration"], 23.0, places=2)

    def test_story_hud_rolls_only_on_change(self):
        e = ep(); e["beats"][3]["pot"] = 50000
        s = aitable.story(e, aitable.layout(e))
        self.assertEqual((s["hudLabel"], s["hudPrefix"], s["title"]["out"]), ("POT", "$", 2.0))
        seg = [h for h in s["hud"] if h["t0"] >= 13.6][0]
        self.assertNotIn("r0", seg)
        self.assertEqual((seg["from"], seg["to"]), (50000, 50000))
        tower = [h for h in s["hud"] if abs(h["t0"] - 5.8) < 1e-6][0]
        self.assertEqual((tower["r0"], tower["r1"]), (6.6, 8.4))
        self.assertEqual(s["end"]["in"], 18.8)
        self.assertEqual(s["episode"]["beats"][1]["at"]["peak"], 8.4)


class CuesAndCaption(unittest.TestCase):
    def test_cues_land_on_key_moments(self):
        tl = aitable.layout(ep()); c = aitable.cues(ep(), tl)
        booms = [x["t"] for x in c["events"] if x["sound"] == "distant_boom"]
        self.assertEqual(booms, [round(tl["beats"][3]["at"]["impact"], 3)])
        self.assertEqual(c["music"]["sections"][0]["t0"], 2.0)
        self.assertEqual(c["duration"], tl["duration"])

    def test_human_say_has_no_bleep(self):
        e = ep(); e["beats"][2]["say"] = "Fine."               # beat 3's who = "you"
        tl = aitable.layout(e); c = aitable.cues(e, tl)
        t0, t1 = tl["beats"][2]["t0"], tl["beats"][2]["t1"]
        self.assertFalse([x for x in c["events"] if x["sound"] == "robot_bleep" and t0 <= x["t"] < t1])

    def test_caption_rules(self):
        self.assertIn("Send this to", aitable.caption_md(ep()))
        e = ep(); e["caption"]["tags"] = e["caption"]["tags"][:4]
        self.assertTrue(any("5 hashtags" in x for x in aitable.validate(e)))


if __name__ == "__main__":
    unittest.main()
