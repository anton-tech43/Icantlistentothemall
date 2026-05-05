// Agent 3: PDF Generation Orchestrator
// Main entry point: takes an episode_id, queries DB, renders HTML, converts
// to PDF via Puppeteer, uploads to Supabase Storage, writes URL back to DB.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { renderHtml } = require('./render-html');
const { htmlToPdf, countPdfPages } = require('./puppeteer-config');
const { parseEbookContent } = require('./parse-ebook-content');
const { uploadPdf } = require('./supabase-storage');
const { validateEbookData } = require('./data-contract');

let supabase = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Generate a PDF for a given episode.
 *
 * @param {string} episodeId - UUID of the episode
 * @returns {Promise<{ success: boolean, pdfUrl: string, pageCount: number }>}
 */
async function generatePdf(episodeId) {
  const sb = getSupabase();
  const startedAt = new Date();

  try {
    // Step 1: Fetch processed_content
    const { data: content, error: contentErr } = await sb
      .from('processed_content')
      .select('ebook_content, self_rating_note, guest_name, pass_2_framework_selected, episode_id')
      .eq('episode_id', episodeId)
      .single();

    if (contentErr) throw new Error(`DB error (processed_content): ${contentErr.message}`);
    if (!content) throw new Error(`No processed_content for episode ${episodeId}`);
    if (!content.ebook_content) throw new Error(`No ebook_content for episode ${episodeId}`);

    // Step 2: Fetch episode details
    const { data: episode, error: epErr } = await sb
      .from('episodes')
      .select('id, title, duration_seconds, published_at, podcast_id')
      .eq('id', episodeId)
      .single();

    if (epErr) throw new Error(`DB error (episodes): ${epErr.message}`);
    if (!episode) throw new Error(`No episode found for id ${episodeId}`);

    // Step 3: Fetch podcast details
    const { data: podcast, error: podErr } = await sb
      .from('podcasts')
      .select('id, name, accent_colour')
      .eq('id', episode.podcast_id)
      .single();

    if (podErr) throw new Error(`DB error (podcasts): ${podErr.message}`);
    if (!podcast) throw new Error(`No podcast found for id ${episode.podcast_id}`);

    // Step 4: Parse ebook content into structured data
    const ebookData = parseEbookContent({
      ebookContent: content.ebook_content,
      selfRatingNote: content.self_rating_note,
      frameworkSelected: content.pass_2_framework_selected,
      guestName: content.guest_name,
      episodeTitle: episode.title,
      podcastName: podcast.name,
      accentColour: podcast.accent_colour,
      episodeDate: episode.published_at,
      durationSeconds: episode.duration_seconds,
    });

    // Validate
    const validation = validateEbookData(ebookData);
    if (!validation.valid) {
      console.warn(`EbookData validation warnings for ${episodeId}:`, validation.errors);
    }

    // Step 5: Render HTML
    const html = renderHtml(ebookData);

    // Step 6: Convert to PDF
    const pdfBuffer = await htmlToPdf(html);

    // Step 7: Count pages
    const pageCount = countPdfPages(pdfBuffer);

    // Step 8: Upload to Supabase Storage
    const pdfUrl = await uploadPdf(pdfBuffer, podcast.name, episode.title);

    // Step 9: Write URL and page count back to processed_content
    const { error: updateErr } = await sb
      .from('processed_content')
      .update({
        ebook_pdf_url: pdfUrl,
        final_page_count: pageCount,
      })
      .eq('episode_id', episodeId);

    if (updateErr) {
      console.error(`Failed to update processed_content for ${episodeId}:`, updateErr.message);
      // Don't throw — PDF was generated and uploaded successfully
    }

    // Step 10: Log to pipeline_logs
    const finishedAt = new Date();
    await sb.from('pipeline_logs').insert({
      episode_id: episodeId,
      step_name: 'pdf_generation',
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_seconds: (finishedAt - startedAt) / 1000,
      status: 'success',
      metadata: {
        pdf_url: pdfUrl,
        file_size_bytes: pdfBuffer.length,
        page_count: pageCount,
      },
    });

    console.log(`PDF generated for episode ${episodeId}: ${pdfUrl} (${pageCount} pages, ${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

    return { success: true, pdfUrl, pageCount };

  } catch (err) {
    // Log failure
    const finishedAt = new Date();
    try {
      await sb.from('pipeline_logs').insert({
        episode_id: episodeId,
        step_name: 'pdf_generation',
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: (finishedAt - startedAt) / 1000,
        status: 'failed',
        error_message: err.message,
      });
    } catch (logErr) {
      console.error('Failed to log pipeline error:', logErr.message);
    }

    throw err;
  }
}

/**
 * Generate a PDF from pre-built EbookData (for testing without DB).
 *
 * @param {import('./data-contract').EbookData} ebookData
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePdfFromData(ebookData) {
  const html = renderHtml(ebookData);
  const pdfBuffer = await htmlToPdf(html);
  return pdfBuffer;
}

module.exports = { generatePdf, generatePdfFromData };
