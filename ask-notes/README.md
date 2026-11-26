# Ask the Notes · MATH 1334

In §4.1, open **Ask for help**. **Ask AI** uses the class code, the selected worked example and up to three recent exchanges in that reading. **Use worked hints** and **Next step** work locally without a code. Tab fills a suggested question. The header can be dragged and Hide preserves the current reply.

## Build

From the course checkout, run `quarto render`, then `python3 -m unittest discover -s ask-notes -p 'test_*.py'`. Use `python3 ask-notes/preview.py` for the offline page. Run `python3 ask-notes/bundle.py` to package the Lambda function, public passages and illustrated LaTeX guide.

## AWS in Oregon

From the extracted instructor bundle, run `python3 deploy.py --prepared --metered --verify-feedback --class-code-file ~/.math1334-class-code`. From the repository checkout in CloudShell use `--published-notes` in place of `--prepared`. Keep the generated class code private and distribute it through the course LMS. The smoke test asks Bedrock a real question and can verify optional instructor feedback.

The public API address is in `pilot-endpoint.txt`. The Pages build reads it only for §4.1. Empty that file or set COURSE_ASK_BILLING_MODE=off to restore local-only worked hints. Other lectures retain their existing interface.

## How the tutor works

API Gateway accepts the request. Lambda checks the class code, resolves the reading and loads its exported passage and, where available, a short instructor teaching note from checks.json. Common boat-versus-rope and rectangle-width questions use reviewed explanations after live tests caught errors in distance comparisons and units. Other conversational questions use Bedrock. DynamoDB conditionally reserves the maximum estimated inference cost across concurrent calls in the UTC month. The system prices up each input token at $0.40 per million and output at $3.00 per million. For the reservation it allows one input token per UTF-8 byte plus 1,024 framing tokens and a maximum of 350 output tokens. After a completed call it releases unused funds using the returned token counts. Uncertain calls retain their reservations. The $2 model allowance is separate from the $5 AWS Budget and the costs of API Gateway, Lambda, logs and storage. Review the model rates before changing regions or models.

The class code and recent conversation live in tab memory. The backend keeps an opaque feedback receipt for two hours. Clicking **Share with instructor** saves that exchange, its sources and the student's response for 90 days. Run `python3 review.py` privately to read shared responses.

## Test a real discussion

Run `python3 evaluate.py --endpoint https://YOUR-API/ask --class-code-file ~/.math1334-class-code`. This spends up to 20 short replies from the same allowance. Read both turns in pilot-evaluation.json against each mathematical rubric. A citation alone does not establish that the explanation was correct.

For a 403 check the class code. For a 429 use worked hints and distinguish API throttling from the monthly budget message. For a 503 inspect the Lambda log for the AWS error category and check the inference profile. To update a reading, render the lecture, rebuild the passage bundle and redeploy.
