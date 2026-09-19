// @ts-nocheck
//
// Shared identity check for Edge Functions.
//
// Every function in this folder runs on the SUPABASE_SERVICE_ROLE_KEY so it
// can read/write across the whole database regardless of RLS (a student
// calling extract-skills has to trigger writes to their own student_profiles
// row; an employer calling generate-rejection-feedback needs to read a
// student's profile that RLS wouldn't normally expose to them directly).
// That means RLS provides NO protection inside these functions - this check
// is the only thing standing between "my own data" and "anyone's data", so
// every function that touches a specific student/employer/application MUST
// call requireUser() (and usually requireSelf()) before doing anything else
// with the service-role client.
//
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Verifies the caller's Supabase session from the `Authorization: Bearer
 * <token>` header (supabase-js's functions.invoke() sends this
 * automatically for a signed-in user) and returns the authenticated user.
 * Throws an AuthError - catch it same as any other error and use
 * `error.status` for the HTTP response instead of a hardcoded 500.
 */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new AuthError("You must be signed in to do this.");
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) {
    throw new AuthError("Your session has expired - please sign in again.");
  }

  return data.user;
}

/**
 * Throws unless the authenticated user IS the resource owner. Use this for
 * any function acting on a specific student's or employer's own data, e.g.
 * requireSelf(user, studentId, "profile").
 */
export function requireSelf(
  user: { id: string },
  resourceUserId: string,
  label = "resource",
) {
  if (user.id !== resourceUserId) {
    throw new AuthError(`You don't have access to this ${label}.`, 403);
  }
}
