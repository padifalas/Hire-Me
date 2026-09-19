// @ts-nocheck
//
// shared CORS handling for Edge Functions.
//
// Every function used to hardcode "Access-Control-Allow-Origin": "*", which -
// combined with the (now-fixed) missing auth checks - meant literally any
// website could call these functions from a signed-in user's browser.
// requireUser()/requireSelf() in auth.ts are the real fix for that, but "*"
// is still worth tightening on its own: there's no reason a page on some
// unrelated domain should even be able to read these responses.
//


const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173", // npm run dev (Vite default)
  "http://localhost:4173", // npm run preview (Vite default)
];

const CONFIGURED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [...DEFAULT_DEV_ORIGINS, ...CONFIGURED_ORIGINS];


export function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
