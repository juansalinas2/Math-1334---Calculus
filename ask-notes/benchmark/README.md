# Course Ask evaluation

This benchmark uses 57 invented student questions and a snapshot of the public course index. No student submissions enter the dataset. Cases were written from the notes before measuring the candidate. The 22 development cases and 35 held-out cases have disjoint topic or scenario families. Some use familiar topics from earlier pilots. Each context identifies the passage the student is reading, or the passage retained from an earlier turn. These single-step retrieval queries supply that context directly.

The primary measure is the fraction of cases routed successfully. For an answerable case, at least one of the first two returned passage IDs must be in the predeclared relevance set. For a missing, ambiguous or unsupported question, success requires an empty passage list and a clarification. A clarification produced later by the language model can give a good final answer while still failing this cheaper retrieval test. Exact IDs distinguish numbered examples within a shared heading. General questions can have several acceptable gold passages. Additional useful sources may fall outside these labels.

Also report top-one and top-two hit rates, mean reciprocal rank truncated at two, clarification counts, and paired wins and losses. The interval resamples whole families with replacement, using 10,000 replicates and seed 1334. It describes sensitivity to these hand-selected families. The benchmark does not estimate class-wide accuracy.

**Release rule.** Freeze the candidate before opening test results. Promote only if the primary count increases, neither the top-two positive count nor the correct clarification count falls, and the existing verification suite stays green. Report every held-out miss. Once revealed, this set becomes regression coverage for future experiments.

From the repository root, reproduce the comparison with Python 3.11 or newer.

```sh
git show b0b50fe7cc5560ea8d681d8579dadee1be2b30a4:ask-notes/course_index.py > /tmp/ask-baseline.py
python3 ask-notes/benchmark/run.py score --retriever /tmp/ask-baseline.py --split test --output /tmp/baseline.json
python3 ask-notes/benchmark/run.py score --split test --output /tmp/candidate.json
python3 ask-notes/benchmark/run.py compare /tmp/baseline.json /tmp/candidate.json --output /tmp/comparison.json
```

**Live audit.** The eight rows with a nonempty audit field specify the expected mathematics or abstention in advance. Run the same prompts individually on each release using the published class endpoint, with real inference and without sending feedback. Grade mathematical correctness, response to the student's specific request, and course citation separately. A full pass requires all three. For an unsupported question, a valid abstention has no citation. Record errors and review reasoning alongside the synthetic replies. This is a small single-reviewer audit. Model outputs and network latency can vary.

```sh
python3 ask-notes/benchmark/run.py live --class-code-file ~/.math1334-class-code --output /tmp/live-ask.json
```
