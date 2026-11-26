"""Run with python3 -m unittest discover -s ask-notes -p 'test_walkthrough.py'."""
import unittest

from practice import reference_matches, walkthrough_request


class WalkthroughTests(unittest.TestCase):
    book = {"rectangle": {"title": "Example 4. A changing rectangle"},
            "boat": {"title": "Practice 4. A boat pulled toward a dock"}}

    def classify(self, question, section):
        text = question.lower().replace("’", "'")
        ref = reference_matches(text, self.book)
        if ref:
            match, keys, _ = ref
            self.assertEqual(keys, [section])
            text = text[:match.start()] + " " + text[match.end():]
        return walkthrough_request(text, section, ref is not None)

    def test_whole_exercise_phrasings(self):
        for text, key in [
            ("Lets walk through example 4:", "rectangle"),
            ("Let’s work through example four together.", "rectangle"),
            ("Example 4 — can you walk me through it?", "rectangle"),
            ("Can we go over practice 4 step-by-step?", "boat"),
            ("Explain example 4 to me", "rectangle"),
            ("Can we walk through the rectangle?", "rectangle"),
            ("Walk me through this one", "rectangle"),
        ]:
            with self.subTest(text=text):
                self.assertTrue(self.classify(text, key))

    def test_specific_questions_keep_their_math(self):
        for text in ["Walk me through why there are two terms in example 4",
                     "Explain the negative width rate in example 4",
                     "Is A=L+W right in example 4?", "What do I do next?"]:
            with self.subTest(text=text):
                self.assertFalse(self.classify(text, "rectangle"))
