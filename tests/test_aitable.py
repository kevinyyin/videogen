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


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# the retired gg002/gg003 episodes, inlined (their folders were removed when the ladder format replaced aitable)
GG002 = {'title': 'What if two AIs <em>teamed up</em> against you?',
         'seed': 2,
         'cast': [{'id': 'you', 'kind': 'human', 'seat': 'near', 'top': '#3aa7d9'},
                  {'id': 'WREN', 'kind': 'robot', 'seat': 'left', 'color': '#e8833a'},
                  {'id': 'ORBIT', 'kind': 'robot', 'seat': 'right', 'color': '#2fb7a4', 'stack': 60}],
         'pot': 300,
         'beats': [{'type': 'deal', 'to': ['you', 'WREN', 'ORBIT'], 'sub': 'Two AIs. One human. Fair game.'},
                   {'type': 'handshake',
                    'who': ['WREN', 'ORBIT'],
                    'say': {'who': 'WREN', 'text': 'Alliance?'},
                    'face': {'WREN': 'smug', 'ORBIT': 'smug'}},
                   {'type': 'wall',
                    'who': ['WREN', 'ORBIT'],
                    'around': 'you',
                    'height': 30,
                    'pot': 9000,
                    'then': 'fold',
                    'sub': 'They box him in. He folds.'},
                   {'type': 'kick',
                    'who': 'WREN',
                    'tower_of': 'ORBIT',
                    'say': 'Alliance over.',
                    'face': {'WREN': 'laugh', 'ORBIT': 'cry'}}],
         'end': {'html': 'Would you trust an AI <em>teammate</em>?', 'small': 'PLAY THEM FREE · GGHUMAN.AI'},
         'caption': {'hook': 'Never trust an AI alliance 🤝🤖',
                     'summary': 'Two AIs team up to squeeze one human out of the pot. Then one of them gets greedy. Play '
                                'them free at gghuman.ai.',
                     'cta': 'Who would you team up with? 👇',
                     'send': 'Send this to your backstabbing friend',
                     'tags': ['#animation', '#ai', '#poker', '#gghuman', '#whatif']}}
GG003 = {'title': 'What if the AIs thought <em>you</em> were the bot?',
         'seed': 3,
         'cast': [{'id': 'you', 'kind': 'human', 'seat': 'near', 'top': '#d94b4b'},
                  {'id': 'VESPER', 'kind': 'robot', 'seat': 'left', 'color': '#7b5cff'},
                  {'id': 'WREN', 'kind': 'robot', 'seat': 'right', 'color': '#e8833a'}],
         'pot': 400,
         'beats': [{'type': 'deal',
                    'to': ['you', 'VESPER', 'WREN'],
                    'say': {'who': 'VESPER', 'text': "You haven't blinked."},
                    'face': {'VESPER': 'suspicious', 'WREN': 'suspicious'}},
                   {'type': 'captcha', 'target': 'you', 'text': 'SELECT ALL THE ACES', 'sub': "Prove you're human."},
                   {'type': 'flick',
                    'target': 'you',
                    'sub': 'Solved in 0.4 seconds.',
                    'face': {'VESPER': 'TEXT:BOT DETECTED', 'WREN': 'TEXT:BOT DETECTED'}}],
         'end': {'html': "Could you prove you're <em>human</em>?", 'small': 'PLAY THEM FREE · GGHUMAN.AI'},
         'caption': {'hook': 'The AIs ran a CAPTCHA on me 🤖🔍',
                     'summary': 'One human, two robots, and the robots are getting suspicious. On GGhuman you play poker '
                                'against AIs that think like people. Play them free at gghuman.ai.',
                     'cta': "Could you prove you're human? 👇",
                     'send': 'Send this to someone who types too fast',
                     'tags': ['#animation', '#ai', '#poker', '#gghuman', '#whatif']}}
EPISODES = {"gg001-ai-bluff": GG001, "gg002-ai-alliance": GG002, "gg003-prove-human": GG003}


def episode(slug):
    return copy.deepcopy(EPISODES[slug])


def errs(e):
    return " | ".join(aitable.validate(e))


class Shapes(unittest.TestCase):
    """Malformed episodes: wrong shapes must come back as listed messages, never a traceback or a template crash."""

    def test_committed_episodes_are_valid(self):
        for slug in ("gg001-ai-bluff", "gg002-ai-alliance", "gg003-prove-human"):
            self.assertEqual(aitable.validate(episode(slug)), [], slug)

    def test_deal_to_must_be_a_list(self):
        e = ep(); e["beats"][0]["to"] = "you"
        self.assertIn("list", errs(e))

    def test_handshake_needs_two_different_ids(self):
        for who in ("WREN", ["WREN"], ["WREN", "WREN"]):
            e = episode("gg002-ai-alliance"); e["beats"][1]["who"] = who
            self.assertIn("two different", errs(e), who)

    def test_wall_who_must_be_a_list(self):
        e = episode("gg002-ai-alliance"); e["beats"][2]["who"] = "WREN"
        self.assertIn("list", errs(e))

    def test_tower_who_must_be_one_id(self):
        e = ep(); e["beats"][1]["who"] = ["VESPER"]
        self.assertIn("one cast id", errs(e))

    def test_cam_whitelist(self):
        for cam in ("dolly", "kickCam"):
            e = ep(); e["beats"][0]["cam"] = cam
            self.assertIn("cam", errs(e), cam)

    def test_kick_cannot_also_topple(self):
        e = episode("gg002-ai-alliance"); e["beats"][3]["after"] = "topple"
        self.assertIn("kick", errs(e))

    def test_bad_types_are_messages_not_tracebacks(self):
        cases = [("len", lambda e: e["beats"][0].__setitem__("len", "3")),
                 ("sub", lambda e: e["beats"][0].__setitem__("sub", "<em></em>")),
                 ("face", lambda e: e["beats"][1].__setitem__("face", "smug")),
                 ("cast", lambda e: e.__setitem__("cast", ["you", "VESPER"])),
                 ("end", lambda e: e.__setitem__("end", {"small": "x"})),
                 ("stack", lambda e: e["cast"][1].__setitem__("stack", True))]
        for word, mutate in cases:
            e = ep(); mutate(e)
            self.assertIn(word, errs(e), word)

    def test_say_needs_text(self):
        e = ep(); e["beats"][1]["say"] = {"who": "VESPER"}
        self.assertIn("text", errs(e))


class Sequences(unittest.TestCase):
    """Orders and roles the template is built for: anything else must be rejected, not rendered wrong."""

    def test_len_cannot_cut_a_beat_short(self):
        e = ep(); e["beats"][1]["len"] = 1.8
        self.assertIn("shorter than", errs(e))

    def test_one_deal_and_it_comes_first(self):
        e = ep(); e["beats"] = [e["beats"][1], e["beats"][0]] + e["beats"][2:]
        self.assertIn("first beat", errs(e))
        e = ep(); e["beats"].insert(1, dict(e["beats"][0]))
        self.assertIn("one deal", errs(e))

    def test_peek_is_by_you_and_cards_must_be_dealt(self):
        e = ep(); e["beats"][2]["who"] = "VESPER"; del e["beats"][2]["then"]
        self.assertIn("peek", errs(e))
        e = ep(); e["beats"][0]["to"] = ["VESPER"]
        self.assertIn("dealt", errs(e))

    def test_kick_must_follow_a_wall(self):
        e = episode("gg002-ai-alliance"); e["beats"][2] = {"type": "tower", "who": "ORBIT", "height": 60}
        self.assertIn("right after a wall", errs(e))

    def test_flick_must_be_last(self):
        e = episode("gg003-prove-human"); e["beats"] = [e["beats"][0], e["beats"][2], e["beats"][1]]
        self.assertIn("last beat", errs(e))

    def test_captcha_grid_is_aces(self):
        e = episode("gg003-prove-human"); e["beats"][1]["text"] = "SELECT ALL THE KINGS"
        self.assertIn("ACES", errs(e))

    def test_wall_height_fits_the_chip_pool(self):
        e = episode("gg002-ai-alliance"); e["beats"][2]["height"] = 135
        self.assertIn("height", errs(e))

    def test_you_sits_near(self):
        e = ep(); e["cast"][0]["seat"], e["cast"][1]["seat"] = "far", "near"
        self.assertIn("near", errs(e))


class PlainText(unittest.TestCase):
    """Tags don't count toward limits (Review Focus 4), and they never reach the screen as literal text."""

    def test_tags_are_stripped_from_subs_bubbles_and_captcha(self):
        e = episode("gg003-prove-human")
        e["beats"][1]["sub"] = "Prove <em>you're</em> human."
        e["beats"][0]["say"] = {"who": "VESPER", "text": "You <em>haven't</em> blinked."}
        e["beats"][1]["text"] = "SELECT ALL THE <em>ACES</em>"
        s = aitable.story(e, aitable.layout(e))
        self.assertIn("Prove you're human.", [x[2] for x in s["subs"]])
        b0, b1 = s["episode"]["beats"][0], s["episode"]["beats"][1]
        self.assertEqual((b0["say_who"], b0["say_text"]), ("VESPER", "You haven't blinked."))
        self.assertEqual(b1["text"], "SELECT ALL THE ACES")


if __name__ == "__main__":
    unittest.main()
