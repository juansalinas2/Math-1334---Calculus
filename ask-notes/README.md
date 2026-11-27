# Ask the Notes · MATH 1334

On a course notes page, open **Ask**, type a question or use Tab to fill the suggestion, then press Enter. Enter the class code on first use. On a shared computer, uncheck **Remember on this browser for 90 days**. The answer links back to the worked example. Continue in the follow-up field or select **New question** for a fresh conversation about the example on screen. **Read this passage** opens the current reading locally. §4.1 also has worked hints. Drag the header to move the panel or minimize it to keep your place.

## Build

From the course checkout, run `quarto render`, then `python3 -m unittest discover -s ask-notes -p 'test_*.py'`. Use `python3 ask-notes/preview.py` for the offline page. Run `python3 ask-notes/bundle.py` to package the Lambda function, public passages and illustrated LaTeX guide.

## AWS in Oregon

From the extracted instructor bundle, run `python3 deploy.py --prepared --metered --verify-feedback --class-code-file ~/.math1334-class-code`. From the repository checkout in CloudShell use `--published-notes` in place of `--prepared`. Keep the generated class code private and distribute it through the course LMS. The smoke test asks Bedrock a real question and can verify optional instructor feedback.

The public API address is in `pilot-endpoint.txt`. The Pages build attaches the same panel to the book pages. Set COURSE_ASK_BILLING_MODE=off when building a local-only version.

## How the tutor works

The Quarto build already exports a public search index with heading links and LaTeX. The deployment reads it into one compact file, course.json, bundled with Lambda. Numbered examples get individual entries pointing to the heading that contains them. New lectures enter the index after publishing the book and rerunning deploy.py with --published-notes.

API Gateway accepts the question and Lambda checks the shared class code. Numbered questions resolve on the open page by its published headings. On an exam review, “help with 12 a” selects problem 12 and sends its part (a) and the full problem to the tutor. If that problem is missing, Ask requests the heading or first line. For a conceptual question, course_index.py ranks passages from the whole book by term rarity, title matches and the open reading. Lambda sends up to two passages and three recent exchanges to Bedrock. Source links come from the published index. Common boat-versus-rope and rectangle-width questions use reviewed explanations after live tests caught errors in distance comparisons and units. Other conversational questions use Bedrock. DynamoDB conditionally reserves the maximum estimated inference cost across concurrent calls in the UTC month. The system prices up each input token at $0.40 per million and output at $3.00 per million. For the reservation it allows one input token per UTF-8 byte plus 1,024 framing tokens and a maximum of 350 output tokens. After a completed call it releases unused funds using the returned token counts. Uncertain calls retain their reservations. The $2 model allowance is separate from the $5 AWS Budget and the costs of API Gateway, Lambda, logs and storage. Review the model rates before changing regions or models.

After a successful request, the browser can keep the shared class code and an expiry timestamp in local storage for 90 days. With remembering off or storage blocked, access lasts for the open page. **About Ask → Forget class code** removes access from this browser. Each request still checks the code on the server. A rejected code prompts for a replacement. This convenience uses no student ID or IP lookup. Questions and replies stay out of local storage. **New question** clears the thread and hint progress while retaining class access. The backend keeps a feedback receipt for two hours. Sharing an exchange with Juan saves it for 90 days. Run `python3 review.py` privately to see shared responses.

## Evaluate the course-wide tutor

Run the ordinary unit tests to check the offline benchmark floor. The benchmark folder contains a frozen public corpus, relevance labels, raw retrieval decisions, and scored synthetic answers. Its README gives the exact commands for a before-and-after comparison. The offline tests do not call AWS. The optional answer audit and two-turn conversations use the live class allowance.

## Related-rates pilot diagnostics

Run `python3 evaluate.py --endpoint https://YOUR-API/ask --class-code-file ~/.math1334-class-code`. This spends up to 20 short replies from the same allowance. Read both turns in pilot-evaluation.json against each mathematical rubric. A citation alone does not establish that the explanation was correct.

For a 403 check the class code. For a 429 use the linked reading or the §4.1 worked hints and distinguish API throttling from the monthly budget message. For a 503 inspect the Lambda log for the AWS error category and check the inference profile. To update a reading, render the lecture, rebuild the passage bundle and redeploy.
