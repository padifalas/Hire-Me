//supabase connection setup (API keys, project ID)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * wraps supabase.functions.invoke() so a non-2xx response (401/403/409/500,
 * etc.) still surfaces the Edge Function's own {success:false, error:"..."}
 * message instead of supabase-js's generic "Edge Function returned a
 * non-2xx status code". every caller doing supabase.functions.invoke(name,
 * {body}) should go through this instead so real error text (like "You've
 * already applied to this opportunity" or "Your session has expired") makes
 * it to the UI instead of getting swallowed.
 * @param {string} name
 * @param {object} body
 * @returns {Promise<{data: object|null, error: {message: string}|null}>}
 */
export async function invokeEdgeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    if (error.context && typeof error.context.json === "function") {
      try {
        const parsed = await error.context.json();
        if (parsed?.error) return { data: null, error: { message: parsed.error } };
      } catch {
        // response body wasn't JSON - fall through to the generic error below
      }
    }
    return { data: null, error };
  }

  return { data, error: null };
}
