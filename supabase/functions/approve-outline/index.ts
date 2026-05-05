// Supabase Edge Function: approve-outline
// Hit by the Approve / Flag links in the outline review email Agent 2 sends.
// Updates processed_content.pass_2_outline_approved and returns a small HTML
// confirmation page. The next routine fire reads this flag and either runs
// Pass 3 (approved=true) or skips the episode (approved=false).
//
// Deploy with:
//   supabase functions deploy approve-outline --no-verify-jwt
//
// Environment variables (set in Supabase project):
//   SUPABASE_URL — auto-provided
//   SUPABASE_SERVICE_ROLE_KEY — auto-provided

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function htmlPage(title: string, body: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} — icantlistentothemall</title>
  <style>
    body {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      max-width: 640px;
      margin: 4rem auto;
      padding: 0 1.5rem;
      color: #111;
      background: #fff;
      line-height: 1.6;
    }
    h1 { font-size: 1.4rem; font-weight: 600; }
    p { margin: 0.6rem 0; }
    .muted { color: #888; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
  <p class="muted">— icantlistentothemall pipeline</p>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const episodeId = url.searchParams.get("episode");
  const action = url.searchParams.get("action");

  if (!episodeId || !["approve", "flag"].includes(action ?? "")) {
    return htmlPage(
      "Bad request",
      `<p>Missing or invalid <code>episode</code> / <code>action</code> parameters.</p>`,
    );
  }

  // Look up the episode for the confirmation message
  const { data: ep } = await supabase
    .from("episodes")
    .select("title, podcasts(name)")
    .eq("id", episodeId)
    .maybeSingle();

  if (action === "approve") {
    const { error } = await supabase
      .from("processed_content")
      .update({
        pass_2_outline_approved: true,
        pass_2_outline_edited: false,
      })
      .eq("episode_id", episodeId);

    if (error) {
      return htmlPage(
        "Database error",
        `<p>Could not update outline status: ${error.message}</p>`,
      );
    }

    return htmlPage(
      "Outline approved.",
      `<p>The next routine fire will run Pass 3 (summary, ebook, newsletter material) and self-review.</p>
       <p><strong>Episode:</strong> ${ep?.title ?? episodeId}<br>
       <strong>Podcast:</strong> ${ep?.podcasts?.name ?? "(unknown)"}</p>`,
    );
  }

  // action === "flag"
  const { error } = await supabase
    .from("processed_content")
    .update({
      pass_2_outline_approved: false,
      pass_2_outline_edited: false,
    })
    .eq("episode_id", episodeId);

  if (error) {
    return htmlPage(
      "Database error",
      `<p>Could not update outline status: ${error.message}</p>`,
    );
  }

  // Also pause the queue so the routine doesn't re-process automatically
  await supabase
    .from("processing_queue")
    .update({
      status: "processing",
      current_step: "pass_2_flagged",
      error_log: "Outline flagged for manual review by Anton",
    })
    .eq("episode_id", episodeId);

  return htmlPage(
    "Outline flagged for review.",
    `<p>Processing is paused for this episode. Edit the outline manually in the database
     (<code>processed_content.pass_2_outline</code>) and set
     <code>pass_2_outline_approved = true</code> when ready to resume.</p>
     <p><strong>Episode:</strong> ${ep?.title ?? episodeId}<br>
     <strong>Podcast:</strong> ${ep?.podcasts?.name ?? "(unknown)"}</p>`,
  );
});
