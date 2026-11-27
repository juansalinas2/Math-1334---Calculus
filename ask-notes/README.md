# Ask the Notes · MATH 1334

On a course notes page, open **Ask**, start typing and use Tab to accept a matching suggestion, then press Enter. Enter the class code on first use. On a shared computer, uncheck **Remember on this browser for 90 days**. The answer links back to the worked example. Continue in the follow-up field or select **New question** for a fresh conversation about the example on screen. **Options → Read this passage** opens the current reading locally. §4.1 also has worked hints. Drag the header to move the panel or minimize it to keep your place.

## Build

From the course checkout, run `quarto render`, then `python3 -m unittest discover -s ask-notes -p 'test_*.py'`. Use `python3 ask-notes/preview.py` for the offline page. Run `python3 ask-notes/bundle.py` to package the Lambda function, public passages and illustrated LaTeX guide.

## AWS in Oregon

From the extracted instructor bundle, run `python3 deploy.py --prepared --metered --verify-feedback --class-code-file ~/.math1334-class-code`. From the repository checkout in CloudShell use `--published-notes` in place of `--prepared`. Keep the generated class code private and distribute it through the course LMS. The smoke test asks Bedrock a real question and can verify optional instructor feedback.

The public API address is in `pilot-endpoint.txt`. The Pages build attaches the same panel to the book pages. Set COURSE_ASK_BILLING_MODE=off when building a local-only version.

## How the tutor works

Try “Can you help me on 8?” from two review pages. Exam 2 opens implicit differentiation and Exam 3 opens the folding-box problem. Ask sends the open page and heading with every question. After scrolling to a different exercise, “this problem” refers to the one on screen. A numbered request missing from the open page stays local and asks for clarification.

To check the behavior after an update, open Exam 3 Review, jump to Problem 8, and ask “How do I get started?” Then jump to Problem 12 and ask “What about (b)?” The first answer should use the dimensions of the box. The second should use the cosine limit. “What page am I on?” reports the page and heading directly. The browser remembers the previous heading for this conversation so that a follow-up can distinguish scrolling from continuing the same exercise.

The Quarto build already exports a public search index with heading links and LaTeX. The deployment reads it into one compact file, course.json, bundled with Lambda. Numbered examples get individual entries pointing to the heading that contains them. New lectures enter the index after publishing the book and rerunning deploy.py with --published-notes.

API Gateway accepts the question and Lambda checks the shared class code. Numbered questions resolve on the open page by its published headings. On an exam review, “help with 12 a” selects problem 12 and sends its part (a) and the full problem to the tutor. If that problem is missing, Ask requests the heading or first line. For a conceptual question, course_index.py ranks passages from the whole book by term rarity, title matches and the open reading. Lambda sends up to two passages and three recent exchanges to Bedrock. Source links come from the published index. Common boat-versus-rope and rectangle-width questions use reviewed explanations after live tests caught errors in distance comparisons and units. Other conversational questions use Bedrock. DynamoDB conditionally reserves the maximum estimated inference cost across concurrent calls in the UTC month. The system prices up each input token at $0.40 per million and output at $3.00 per million. For the reservation it allows one input token per UTF-8 byte plus 1,024 framing tokens and a maximum of 350 output tokens. After a completed call it releases unused funds using the returned token counts. Uncertain calls retain their reservations. The $2 model allowance is separate from the $5 AWS Budget and the costs of API Gateway, Lambda, logs and storage. Review the model rates before changing regions or models.

After a successful request, the browser can keep the shared class code and an expiry timestamp in local storage for 90 days. With remembering off or storage blocked, access lasts for the open page. **Options → About Ask → Forget class code** removes access from this browser. Each request still checks the code on the server. A rejected code prompts for a replacement. This convenience uses no student ID or IP lookup. Questions and replies stay out of local storage. **New question** clears the thread and hint progress while retaining class access. The backend keeps a feedback receipt for two hours. Sharing an exchange with Juan saves it for 90 days. Use **Comment or report** under a reply to send Juan a note. The default category is a comment or correction. An earlier reply keeps its form during the conversation. An expired form explains how to save the draft. Run `python3 review.py` privately to see shared responses.

Calculations lead with the argument and a short LaTeX computation. Students can follow “Show the computation for 12(a)” with “What about (b)? Give me just one hint.” Ask selects part (b) of the same problem and uses it to suggest a single move. When a solution compresses a nonobvious step, the model can include a question about that step and its explanation in the same answer. Opening it uses no additional inference.

For a lettered exercise without a published solution on that page, the index also looks for a worked exercise containing the same formula. A one-sided example can supply the method for a two-sided limit. The tutor receives the original problem and both directions as printed. This lookup uses the existing index and model call.

## Evaluate the course-wide tutor

Run the ordinary unit tests to check the offline benchmark floor. The benchmark folder contains a frozen public corpus, relevance labels, raw retrieval decisions, and scored synthetic answers. Its README gives the exact commands for a before-and-after comparison. The offline tests do not call AWS. The optional answer audit and two-turn conversations use the live class allowance.

## Related-rates pilot diagnostics

Run `python3 evaluate.py --endpoint https://YOUR-API/ask --class-code-file ~/.math1334-class-code`. This spends up to 20 short replies from the same allowance. Read both turns in pilot-evaluation.json against each mathematical rubric. A citation alone does not establish that the explanation was correct.

For a 403 check the class code. For a 429 use the linked reading or the §4.1 worked hints and distinguish API throttling from the monthly budget message. For a 503 inspect the Lambda log for the AWS error category and check the inference profile. To update a reading, render the lecture, rebuild the passage bundle and redeploy.
