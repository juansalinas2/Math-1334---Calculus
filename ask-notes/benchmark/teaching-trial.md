# How much help should Ask give?

This paired experiment asks whether four short demonstrations from other topics improve the existing teaching prompt. Each pair uses the same Nova model, course passage, student turn, scripted history, output limit and temperature. The model chooses which example applies. No per-exercise rules or extra model calls are part of the candidate. The eight cases use public notes and invented student dialogue.

## Decision rule fixed before inference

Grade each response with its variant hidden. Award one point each for correct mathematics, grounding in the assigned exercise (including its givens and link), and meeting every element of the case's teaching criterion. Inspect the answer and any expandable detail. A full pass requires all three. Consider the candidate for students only if it gains at least two net full passes, loses no previously passing case, and introduces no new mathematics or grounding error. This is an engineering release screen. It cannot establish that students learned more.

## Reproduce

From the repository root, run `python3 ask-notes/benchmark/teaching_trial.py` for the free input check. In the project's AWS environment with its usual Oregon region and quota table, append `--run /tmp/ask-study-01` for a paired sample in a new directory. The run uses the same monthly model quota as the tutor and an additional ten-cent ceiling for the experiment. A failed or incomplete run is ineligible for comparison. Read the prompt and criterion in `teaching-cases.json`, grade the shuffled labeled answers in `answers.jsonl`, record the grades, then open `key.json`. The manifest records the dataset, seed, model and usage. To repeat the original baseline after a future prompt change, check out the frozen trial revision `72051c7`.

Each arm receives the correct passage by construction. Evaluate page routing with the separate retrieval benchmark. Histories are fixed so that one arm cannot inherit an easier conversation. A future classroom comparison would need an unaided parallel problem to measure transfer.

## What happened in the pilot

One reviewer graded 16 generated replies before opening the assignment key. Each case was sampled once per arm. Grounding covers the exercise, its givens and its returned link. The server can attach that link by default.

| Prompt | Correct math | Grounded in exercise | Met teaching criterion | Full passes |
| --- | ---: | ---: | ---: | ---: |
| Existing tutor | 8/8 | 8/8 | 6/8 | 6/8 |
| Same tutor with four demonstrations | 6/8 | 8/8 | 3/8 | 3/8 |

| Student situation | Existing | With demonstrations | Observation |
| --- | --- | --- | --- |
| Reversed the variable labels at the river | Pass | Miss | The candidate left a consistent fence expression in doubt. |
| Asked for one hint on the open box | Pass | Pass | Both explained the two cuts and left the volume and interval open. |
| Asked whether the last term in an implicit derivative was wrong | Pass | Miss | The candidate claimed that two products differing only in whitespace were different. |
| Asked for a numerical squeeze after a failed hint | Pass | Pass | Both bounded the product between −0.01 and 0.01 at x = 0.1. |
| Used a single positive increment to conclude a derivative exists | Miss | Miss | Both prompted the student to try the negative side. Neither gave the contrasting quotient and two-sided conclusion required by the rubric. |
| Asked for the meaning of the increment h | Pass | Miss | The baseline identified h = x − a. The candidate described h as a distance, losing its sign. |
| Requested the complete Exam 3 limit calculation | Pass | Pass | Both worked the product through to 1. |
| Proposed the derivative of the logarithm as an alternate method | Miss | Miss | Both recognized the method and omitted the one-sided approach under the substitution. |

The demonstrations gained zero cases and lost three. Estimated inference usage was $0.012147 for both arms together. The model, seed, cases and corpus are recorded below. The course uses the original teaching prompt.

- Model `us.amazon.nova-2-lite-v1:0`, temperature 0, shuffle seed `18318079333765542820`.
- Cases SHA-256 `cb06e21a3d4d7334ca241c266234404257e91e28be8251ff8a38995c7563f3bd`.
- Corpus SHA-256 `0aff6177bc5ba62a9a704ec64fc38b1de80ea3fcab6dab93c6e936f1723f2c2d`.

### What changed in retrieval

A separate free test runs the same utterances through the course request handler with the heading sent by the browser and the scripted conversation history. Initially three of eight retrieved the intended **specific exercise** first. One of the five misses returned a containing heading with several exercises, including the correct one. Both exam-review questions naming 12(a) selected a different exercise first.

The revised handler recognizes subparts embedded in a sentence. Where the visible heading groups several worked examples, it also looks for a distinctive expression the student typed. A line with an error can still identify its exercise if two intact terms occur together in just one nearby example. The eight specific exercises now resolve correctly. These eight are development cases for routing. All 35 individual results on the older retrieval benchmark stayed the same, with 31 passing. Run `python3 ask-notes/benchmark/teaching_trial.py --routing` to see the passage selected for each turn.

## Which investment comes next?

| Approach | Benefit | Tradeoff and decision |
| --- | --- | --- |
| Course retrieval and one teaching prompt | Supplies the exercise, notation and student attempt in one answer call. Easy to revise between quarters. | A correct passage can still yield weak teaching. Use this now and evaluate whether the student can make the next move. |
| Retrieve a teaching example | Can surface how the instructor handles a specific misconception or repeated failed hint. A small local collection fits in the same answer call. | Requires reviewed examples and a good match to the student's difficulty. Try when the same failure recurs across exercises. Test on fresh dialogues. The pilot tested fixed demonstrations, so selective retrieval remains an open question. |
| Fine-tune with teaching dialogues | Could internalize a stable teaching style across courses. Current notes would still come from retrieval. | Requires annotated exchanges, training and evaluation across model versions. The notes contain worked answers but little evidence of how an instructor responds to a particular learner. Revisit when recurring failures and a sufficient set of reviewed dialogues justify the effort. |
| Second model pass | Could critique a draft response for a well-defined error. | Adds latency and another inference charge, and the critic can share the first model's mistake. Try it offline on observed failures first. |

### How to tell whether Ask helps students learn

Give two parallel problems that require the same idea with different numbers or representations. After students use Ask on the first, see whether they can choose and justify the next step on the second without help. For example, after the absolute-value exercise, ask whether the two-sided derivative of a different piecewise function exists at the join. Score the choice to check both sides and the conclusion separately. Keep participation voluntary and independent of grades. With a single class, record participation and missing responses and report the result as a pilot.

### Research behind the decision

- Bastani et al. compared high-school students' assisted practice and subsequent unaided performance. Teacher-designed safeguards mitigated the deficit seen after unrestricted assistance. [PNAS, 2025](https://doi.org/10.1073/pnas.2422633122)
- Macina et al. built MathDial using approximately 3,000 dialogues between teachers and simulated students. It illustrates the kind of training data that captures instructional choices beyond a worked answer. [MathDial, EMNLP 2023](https://aclanthology.org/2023.findings-emnlp.372/)
- MathTutorBench evaluates mathematical and pedagogical abilities separately and reports difficulties in longer dialogues. This informed the separate correctness and teaching criteria, including turns after a hint. [MathTutorBench, EMNLP 2025](https://aclanthology.org/2025.emnlp-main.11/)
