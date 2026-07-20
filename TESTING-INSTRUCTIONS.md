# Testing instructions

HireMe's core features are AI-driven and only become visible once real-ish data is loaded into the system. To see the full workflow (not just empty screens), you'll need to prepare a few things before testing.

## What you'll need

- A CV, as a PDF or Word document. Any real or realistic CV works - the AI reads the actual text on it.
- An academic transcript (optional but recommended), PDF or Word. Used alongside the CV for skill extraction.
- At least one job posting with required and nice-to-have skills filled in. You can create this yourself as an employer account (see below) 

## Suggested testing flow

1. Create an employer account and complete the company profile.
2. Post a job. Fill in required and nice-to-have skills as you would for a real listing (e.g. "React", "SQL", "Customer service") ... these drive the AI skill-tag normalization and the match score a student will later see
3. Create a separate student account (a different browser or an incognito window avoids session conflicts between the two logged-in roles).
4. Complete the student profile and upload the CV (and transcript, if testing that path). Processing takes a few seconds...  the profile shows a status indicator while the AI extracts skills and translates academic projects.
5. Browse opportunities as the student. The job posted in step 2 should show a match score with a "why this score?" breakdown of matched and missing skills.
6. Apply to the job. A cover letter is auto-drafted referencing the student's real matched skills... it's editable before submitting.
7. Switch back to the employer account. Open the applicant in the review interface to see the match breakdown and the submitted cover letter.
8. Reject the application to see AI-generated rejection feedback with linked free-course resources for the missing skills, or accept/request an interview to move it through the status flow.

## Notes

- The AI provider (Gemini, with an Anthropic fallback) is already configured... no API key setup is needed on your end.
- If the two accounts are tested in the same browser at the same time, session handling can behave unexpectedly (documented in Padi's Progress Report, Section 3.5)... using separate browser profiles avoids this.
