//
// will deploy w:  supabase functions deploy generate-rejection-feedback
//

//
// Given an applicationId, this function:
//   1. reads the application -> opportunity -> student_profiles chain with the
//      service role key (so it works regardless of the caller's RLS access).
//   2. Computes which required/nice-to-have skills the student is missing,

//   3. Attaches REAL, curated free-resource links per missing skill from a
//      fixed lookup table below (falls back to a Google search link for
//      skills we don't have a  entry for) - deliberately NOTTT letting
//      the ai invent links urls, since hallucinated course links would be
//      actively unhelpful/embarrassing lolll.
//   4. Calls Gemini  ONLY to write a short,constructive paragraph - the model never sees or produces links... cos i dont trust ai links tbh lol
//   5. Returns the combined plain-text feedback. Does NOT write to the DB -
//      the caller (ApplicantsModal.jsx) shows it in the reject textarea so
//      the employer can review/edit before it's saved via
//      updateApplicationStatus().
//
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROVIDER = GEMINI_API_KEY ? "gemini" : "claude";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// put real, free resources per skill - keyed by a normalized skill name.
// rather than AI-generated, so every link // is guaranteed to actually wor cos againnn... i dont trust ai links

const FREE_RESOURCES: Record<string, { title: string; url: string }[]> = {
  javascript: [
    { title: "freeCodeCamp - JavaScript Algorithms and Data Structures", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/" },
    { title: "MDN - JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  ],
  typescript: [
    { title: "TypeScript - The Handbook (official, free)", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
  ],
  react: [
    { title: "React - official docs (react.dev)", url: "https://react.dev/learn" },
    { title: "freeCodeCamp - Front End Development Libraries", url: "https://www.freecodecamp.org/learn/front-end-development-libraries/" },
  ],
  "react.js": [{ title: "React - official docs (react.dev)", url: "https://react.dev/learn" }],
  html: [{ title: "freeCodeCamp - Responsive Web Design", url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/" }],
  html5: [{ title: "freeCodeCamp - Responsive Web Design", url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/" }],
  css: [
    { title: "freeCodeCamp - Responsive Web Design", url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/" },
    { title: "MDN - CSS Guide", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
  ],
  sql: [{ title: "SQLBolt - interactive, free SQL lessons", url: "https://sqlbolt.com/" }],
  python: [
    { title: "freeCodeCamp - Scientific Computing with Python", url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/" },
    { title: "Python.org - official beginner's guide", url: "https://docs.python.org/3/tutorial/" },
  ],
  java: [{ title: "Oracle - free official Java tutorials", url: "https://docs.oracle.com/javase/tutorial/" }],
  "c#": [{ title: "Microsoft Learn - C# first steps (free)", url: "https://learn.microsoft.com/en-us/training/paths/csharp-first-steps/" }],
  ".net": [{ title: "Microsoft Learn - .NET", url: "https://learn.microsoft.com/en-us/training/dotnet/" }],
  git: [
    { title: "Pro Git (free official book)", url: "https://git-scm.com/book/en/v2" },
    { title: "GitHub Skills - free interactive courses", url: "https://skills.github.com/" },
  ],
  github: [{ title: "GitHub Skills - free interactive courses", url: "https://skills.github.com/" }],
  "node.js": [{ title: "freeCodeCamp - APIs and Microservices", url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" }],
  node: [{ title: "freeCodeCamp - APIs and Microservices", url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" }],
  "rest api": [{ title: "freeCodeCamp - APIs and Microservices", url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" }],
  mongodb: [{ title: "MongoDB University - free courses", url: "https://learn.mongodb.com/" }],
  postgresql: [{ title: "SQLBolt - interactive, free SQL lessons", url: "https://sqlbolt.com/" }],
  mysql: [{ title: "SQLBolt - interactive, free SQL lessons", url: "https://sqlbolt.com/" }],
  aws: [{ title: "AWS Skill Builder - free digital training", url: "https://skillbuilder.aws/" }],
  docker: [{ title: "Docker - official free curriculum", url: "https://docker-curriculum.com/" }],
  php: [{ title: "freeCodeCamp - PHP for Beginners (YouTube)", url: "https://www.youtube.com/watch?v=OK_JCtrrv-c" }],
  angular: [{ title: "Angular - official docs", url: "https://angular.dev/tutorials" }],
  vue: [{ title: "Vue.js - official guide", url: "https://vuejs.org/guide/introduction.html" }],
  excel: [{ title: "Microsoft Learn - Excel fundamentals", url: "https://learn.microsoft.com/en-us/training/modules/excel-create-edit-workbooks/" }],
};

function normalizeSkill(skill: string) {
  return skill.toLowerCase().trim();
}

function resourcesForSkill(skill: string) {
  const key = normalizeSkill(skill);
  if (FREE_RESOURCES[key]) return FREE_RESOURCES[key];
  return [
    {
      title: `Search: free ${skill} courses`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`free ${skill} course`)}`,
    },
  ];
}


function computeSkillGaps(studentSkills: unknown[], requiredSkills: string[], niceToHaveSkills: string[]) {
  const known = new Set(
    (studentSkills || []).map((s: any) => (typeof s === "string" ? s : s?.skill || "").toLowerCase().trim()),
  );

  const missingRequired = (requiredSkills || []).filter((s) => !known.has(s.toLowerCase().trim()));
  const missingNice = (niceToHaveSkills || []).filter((s) => !known.has(s.toLowerCase().trim()));
  const matchedRequired = (requiredSkills || []).filter((s) => known.has(s.toLowerCase().trim()));

  return { missingRequired, missingNice, matchedRequired };
}

async function callGemini(prompt: string) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text content returned from Gemini");
  return text.trim();
}

async function callClaude(prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) throw new Error("No text content returned from Claude");
  return textBlock.text.trim();
}

async function callLLM(prompt: string) {
  if (PROVIDER === "gemini") return await callGemini(prompt);
  return await callClaude(prompt);
}

function buildPrompt({
  jobTitle,
  companyName,
  matchedRequired,
  missingRequired,
  missingNice,
  professionalSummary,
}: {
  jobTitle: string;
  companyName: string;
  matchedRequired: string[];
  missingRequired: string[];
  missingNice: string[];
  professionalSummary: string | null;
}) {
  return `
You are writing a short, kind, constructive rejection message from an employer's
talent team or HR department to a student who applied for a job and was not selected. This is
for a South African graduate job-matching platform - the tone should be warm,
respectful, and encouraging, never generic corporate boilerplate and never
harsh. Do not mention specific company policies or make legal claims.

Job title: ${jobTitle}
Company: ${companyName}
Candidate's professional summary: ${professionalSummary || "(not available)"}
Skills the candidate already has that matched this role: ${matchedRequired.join(", ") || "none identified"}
Required skills the candidate is missing: ${missingRequired.join(", ") || "none - they matched all required skills"}
Nice-to-have skills the candidate is missing: ${missingNice.join(", ") || "none"}

Write a plain-text message, 3-5 sentences, that:
1. Thanks them for applying and lets them know they weren't selected for THIS specific role.
2. If they have matching skills, genuinely acknowledges 1-2 of their real strengths from the list above (don't invent any not listed).
3. If there are missing required/nice-to-have skills, names them plainly and frames closing that gap as a concrete next step (don't be vague like "keep improving").
4. If there are no missing skills at all, say the decision was about role fit/competition, not their ability.

Do not include any links, bullet points, or headings - just the message text, nothing before or after it.
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
      throw new Error("No LLM provider configured. Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY (paid) as a secret.");
    }

    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ success: false, error: "applicationId is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("id, student_id, opportunity_id")
      .eq("id", applicationId)
      .single();
    if (appError) throw appError;

    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("title, required_skills, nice_to_have_skills, employer_id")
      .eq("id", application.opportunity_id)
      .single();
    if (oppError) throw oppError;

    const { data: employerProfile } = await supabase
      .from("employer_profiles")
      .select("company_name")
      .eq("id", opportunity.employer_id)
      .single();

    const { data: studentProfile, error: profileError } = await supabase
      .from("student_profiles")
      .select("extracted_technical_skills, professional_summary")
      .eq("id", application.student_id)
      .single();
    if (profileError) throw profileError;

    const { missingRequired, missingNice, matchedRequired } = computeSkillGaps(
      studentProfile.extracted_technical_skills || [],
      opportunity.required_skills || [],
      opportunity.nice_to_have_skills || [],
    );

    const prompt = buildPrompt({
      jobTitle: opportunity.title,
      companyName: employerProfile?.company_name || "the company",
      matchedRequired,
      missingRequired,
      missingNice,
      professionalSummary: studentProfile.professional_summary,
    });

    const message = await callLLM(prompt);

    const allMissing = [...missingRequired, ...missingNice];
    let feedback = message;

    if (allMissing.length > 0) {
      const lines = allMissing.map((skill) => {
        const resources = resourcesForSkill(skill);
        const linkList = resources.map((r) => `[${r.title}](${r.url})`).join(", ");
        return `- ${skill}: ${linkList}`;
      });
      feedback += `\n\nFree resources to help close the gap:\n${lines.join("\n")}`;
    }

    return new Response(JSON.stringify({ success: true, provider: PROVIDER, feedback }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-rejection-feedback error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
