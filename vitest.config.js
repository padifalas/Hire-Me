import { defineConfig } from "vitest/config";

// Kept separate from vite.config.js (rather than merging test config into
// it) so the real dev/build config stays untouched and obviously so.
//
// test.env sets VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY for the
// test run only - opportunityService.js (home of computeMatchScore, which
// this suite tests) creates the Supabase client as an import-time side
// effect, so importing it at all requires those two env vars to exist.
// Dummy values are used deliberately: .env is gitignored, CI has no real
// secrets, and none of the tests here should ever need to reach a real
// Supabase project.
export default defineConfig({
  test: {
    environment: "node",
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    },
  },
});
