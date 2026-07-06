
//
// will deploy w:  supabase functions deploy extract-skills

//   supabase secrets set GEMINI_API_KEY=AIza...        freee
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  (paid - fuckk)
//
//
// This function receives RAW TEXT already extracted from the CV/transcript in
// the browser (se documentService.js) — it does not parse PDF/DOCX itself. it calls the configured LLM once to both extract skills AND translate
// academic projects into industry-standard descriptions, then writes the
// result into student_profiles using the service role key.

//@ts-nocheck

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

// The JSON schema we force the model to return, shared across providers.
const OUTPUT_SCHEMA_INSTRUCTIONS = `
Return ONLY a single JSON object (no markdown fences, no preamble, no commentary)
with exactly this shape:

{
  "technical_skills": [
    { "skill": "string", "level": "beginner|intermediate|advanced", "source": "cv|transcript" }
  ],
  "soft_skills": [
    { "skill": "string", "evidence": "short phrase pointing to where this showed up" }
  ],
  "experience": [
    { "title": "string", "organization": "string", "duration": "string", "summary": "1-2 sentence summary" }
  ],
  "translated_projects": [
    {
      "original_title": "string - the academic/course project name as written",
      "professional_title": "string - an industry-style project title",
      "description": "2-3 sentences describing the project the way it would appear on a CV or LinkedIn, written for a recruiter audience, focused on impact and technical scope",
      "skills_demonstrated": ["string", "..."]
    }
  ],
  "professional_summary": "a 3-4 sentence professional summary of this candidate suitable for the top of a CV, written in third person"
}

Rules:
- Base every field ONLY on what is present in the provided text. Do not invent employers, dates, or skills that aren't supported by the text.
- Normalize skill names to standard industry terms (e.g. "made websites with React" -> "React.js").
- If the transcript text is empty, extract only from the CV text, and vice versa.
- If a section has nothing to report, return an empty array for it (never omit the key).
`;

function buildPrompt(cvText: string, transcriptText: string) {
  return `
Here is the candidate's CV text:
"""
${cvText || "(no CV text provided)"}
"""

Here is the candidate's academic transcript / coursework text:
"""
${transcriptText || "(no transcript text provided)"}
"""

${OUTPUT_SCHEMA_INSTRUCTIONS}
`;
}

function cleanAndParseJson(rawText: string) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Google gemiin

 */
async function callGemini(cvText: string, transcriptText: string) {
  const model = "gemini-2.5-flash"; // best free-tier RPD/RPM balance
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(cvText, transcriptText) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
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

/**
 * Anthropic Claud
 *
 */
async function callClaude(cvText: string, transcriptText: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: buildPrompt(cvText, transcriptText) }],
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

async function callLLM(cvText: string, transcriptText: string) {
  if (PROVIDER === "gemini") return await callGemini(cvText, transcriptText);
  return await callClaude(cvText, transcriptText);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
      throw new Error(
        "No LLM provider configured. Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY (paid) as a secret.",
      );
    }

    const { studentId, cvText, transcriptText } = await req.json();

    if (!studentId) {
      return new Response(JSON.stringify({ success: false, error: "studentId is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!cvText && !transcriptText) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one of cvText or transcriptText is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase
      .from("student_profiles")
      .update({ ai_processing_status: "processing" })
      .eq("id", studentId);

    let result;
    try {
      result = await callLLM(cvText ?? "", transcriptText ?? "");
    } catch (aiError) {
      await supabase
        .from("student_profiles")
        .update({
          ai_processing_status: "failed",
          ai_processing_error: String(aiError instanceof Error ? aiError.message : aiError),
        })
        .eq("id", studentId);
      throw aiError;
    }

    const { error: updateError } = await supabase
      .from("student_profiles")
      .update({
        extracted_technical_skills: result.technical_skills ?? [],
        extracted_soft_skills: result.soft_skills ?? [],
        extracted_experience: result.experience ?? [],
        translated_projects: result.translated_projects ?? [],
        professional_summary: result.professional_summary ?? null,
        ai_processing_status: "completed",
        ai_processed_at: new Date().toISOString(),
        ai_processing_error: null,
      })
      .eq("id", studentId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, provider: PROVIDER, data: result }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-skills error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
