//
// will deploy w:  supabase functions deploy normalize-skills
//okay gebts so a hand-maintained synonym table (like
// _shared/skillSynonyms.ts) can never realistically cover every domain's
// abbreviations and phrasing. so thus function does that normalization with AI
// instead, once, at the moment an employer posts/edits a job - not on every
// match calculation (too slow per opportunity view).
//
// when u get raw required/nice-to-have skill tags as the employer typed them,
// this returns a same-length, same-order array of industry terms
// for each list. The RAW tags are left untouched in `opportunities.required_
// skills` / `nice_to_have_skills` (so employers keep seeing exactly what
// they typed); the canonical output is stored in a parallel
// `*_normalized` column and used only for match-time comparison against a
// student's (also AI-normalized, via extract-skills) skill list
//-....................
// falllback thing: if the AI call errors, or returns arrays of the wrong length,
// the caller (employerService.js) falls back to leaving the *_normalized
// columns null - matching then falls back further to the static alias table
// (resolveNormalizedSkills), same as it did before this function existed.
// so jobb posting is never blocked on this call failing
//
// @ts-nocheck

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const PROVIDER = GEMINI_API_KEY ? "gemini" : "claude";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildPrompt(requiredSkills: string[], niceToHaveSkills: string[]) {
  return `
You are normalizing job-skill/competency tags for a career-matching platform used
across ALL professional fields, not just technology - fields include (but aren't
limited to) software engineering, marketing, nursing/healthcare, finance/accounting,
education, skilled trades, hospitality, law, and design.

For each tag below, rewrite it as the single, standard, industry-recognized term a
professional or recruiter in that specific field would use - fixing abbreviations,
casing, and obvious synonyms (e.g. "JS" -> "JavaScript", "CRM" -> "Customer Relationship
Management (CRM)"). If a tag is already standard, return it unchanged. Never change the
underlying meaning, and never merge, split, add, or remove entries.

Required skills:
${JSON.stringify(requiredSkills)}

Nice-to-have skills:
${JSON.stringify(niceToHaveSkills)}

Return ONLY a single JSON object (no markdown fences, no commentary) of this exact shape,
where each array has EXACTLY the same number of items, in the EXACT same order, as the
corresponding input array above:
{
  "required_skills": ["...", ...],
  "nice_to_have_skills": ["...", ...]
}
`;
}

function cleanAndParseJson(rawText: string) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function callGemini(requiredSkills: string[], niceToHaveSkills: string[]) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(requiredSkills, niceToHaveSkills) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text content returned from Gemini");
  return cleanAndParseJson(text);
}

async function callClaude(requiredSkills: string[], niceToHaveSkills: string[]) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: buildPrompt(requiredSkills, niceToHaveSkills) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) throw new Error("No text content returned from Claude");
  return cleanAndParseJson(textBlock.text);
}

async function callLLM(requiredSkills: string[], niceToHaveSkills: string[]) {
  if (PROVIDER === "gemini") return await callGemini(requiredSkills, niceToHaveSkills);
  return await callClaude(requiredSkills, niceToHaveSkills);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
      throw new Error("No LLM provider configured. Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY (paid) as a secret.");
    }

    const { requiredSkills, niceToHaveSkills } = await req.json();
    const required = requiredSkills || [];
    const niceToHave = niceToHaveSkills || [];

    if (required.length === 0 && niceToHave.length === 0) {
      return new Response(
        JSON.stringify({ success: true, provider: PROVIDER, requiredSkillsNormalized: [], niceToHaveSkillsNormalized: [] }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const result = await callLLM(required, niceToHave);

    const requiredOut = Array.isArray(result.required_skills) && result.required_skills.length === required.length
      ? result.required_skills
      : null;
    const niceOut = Array.isArray(result.nice_to_have_skills) && result.nice_to_have_skills.length === niceToHave.length
      ? result.nice_to_have_skills
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        provider: PROVIDER,
        requiredSkillsNormalized: requiredOut,
        niceToHaveSkillsNormalized: niceOut,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("normalize-skills error:", error);
    // erro soft: caller treat missing arrays as "no AI
    // normalization available this time" and falls back to the static alias
    // table rather than blocking job posting
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
