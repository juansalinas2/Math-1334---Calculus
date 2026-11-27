# How much help should Ask give?

This paired experiment asks whether four short demonstrations from other topics improve the existing teaching prompt. Each pair uses the same Nova model, course passage, student turn, scripted history, output limit and temperature. The model chooses which example applies. No per-exercise rules or extra model calls are part of the candidate. The eight cases use public notes and invented student dialogue.

## Decision rule fixed before inference

Grade each response with its variant hidden. Award one point each for correct mathematics, grounding in the assigned exercise (including its givens and link), and meeting every element of the case's teaching criterion. Inspect the answer and any expandable detail. A full pass requires all three. Consider the candidate for students only if it gains at least two net full passes, loses no previously passing case, and introduces no new mathematics or grounding error. This is an engineering release screen. It cannot establish that students learned more.

## Reproduce

From the repository root, run `python3 ask-notes/benchmark/teaching_trial.py` for the free input check. In the project's AWS environment with its usual Oregon region and quota table, append `--run /tmp/ask-study-01` for a paired sample in a new directory. The run uses the same monthly model quota as the tutor and an additional ten-cent ceiling for the experiment. A failed or incomplete run is ineligible for comparison. Read the prompt and criterion in `teaching-cases.json`, grade the shuffled labeled answers in `answers.jsonl`, record the grades, then open `key.json`. The manifest records the dataset, seed, model and usage. To repeat the original baseline after a future prompt change, check out the trial revision.

Each arm receives the correct passage by construction. Evaluate page routing with the separate retrieval benchmark. Histories are fixed so that one arm cannot inherit an easier conversation. A future classroom comparison would need an unaided parallel problem to measure transfer.
