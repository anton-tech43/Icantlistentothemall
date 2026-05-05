// Supabase Edge Function: bootstrap-secrets
// Returns the secrets needed by the routine pipeline. Authenticated via a
// shared bearer token. The function holds the actual service keys in
// Supabase's encrypted secret store; the routine never sees them in plaintext
// outside this function's response body.
//
// Caller (routine):
//   POST /functions/v1/bootstrap-secrets
//   Authorization: Bearer <PIPELINE_API_TOKEN>
//
// Response:
//   200 { SUPABASE_SERVICE_ROLE_KEY, DEEPGRAM_API_KEY, RESEND_API_KEY }
//   401 { error: "unauthorized" }
//
// Secrets stored in Supabase (set via `supabase secrets set ...`):
//   PIPELINE_API_TOKEN, PIPELINE_SUPABASE_SERVICE_ROLE_KEY,
//   PIPELINE_DEEPGRAM_API_KEY, PIPELINE_RESEND_API_KEY
//
// Deploy: supabase functions deploy bootstrap-secrets --no-verify-jwt

Deno.serve((req) => {
  const auth = req.headers.get("authorization") ?? "";
  const expected = "Bearer " + (Deno.env.get("PIPELINE_API_TOKEN") ?? "");

  if (auth !== expected || !Deno.env.get("PIPELINE_API_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = {
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("PIPELINE_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    DEEPGRAM_API_KEY: Deno.env.get("PIPELINE_DEEPGRAM_API_KEY") ?? "",
    RESEND_API_KEY: Deno.env.get("PIPELINE_RESEND_API_KEY") ?? "",
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
