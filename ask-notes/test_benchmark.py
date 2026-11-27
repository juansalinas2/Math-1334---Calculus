"""Free regression gate on the frozen course snapshot."""
import unittest
from types import SimpleNamespace
from benchmark.run import APP, read_corpus, run_score
from course_index import Index


class CourseBenchmark(unittest.TestCase):
    def test_release_floor(self):
        result = run_score(SimpleNamespace(split="test", retriever=APP / "course_index.py"))
        metrics = result["metrics"]
        self.assertEqual((metrics["answerable"], metrics["must_clarify"]), (29, 6))
        self.assertGreaterEqual(metrics["hit1"], 25, "Inspect the first-ranked passage for each changed case.")
        self.assertGreaterEqual(metrics["hit2"], 25, "Inspect the top two passages for each changed case.")
        self.assertEqual(metrics["clarified"], 6, "A clarification now returns an unrelated passage.")

    def test_followup_competes_with_cross_lecture_search(self):
        index = Index(read_corpus())
        page = "lectures/optimization.html"
        box = page + "#optimization-problems::1"
        keys, _ = index.search("Why do two cuts come off each side?", page, box, followup=True)
        self.assertEqual(keys[0], box)
        keys, _ = index.search("Different topic: what does the IVT guarantee?", page, box, followup=True)
        self.assertNotEqual(keys[0], box)
        self.assertIn("intermediate-value", keys[0])
