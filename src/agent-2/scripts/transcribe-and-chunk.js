// Agent 2: transcribe-and-chunk — runs Deepgram on an episode's audio URL
// then chunks the transcript and stores it in transcripts.chunks.
//
// Usage: node src/agent-2/scripts/transcribe-and-chunk.js <episode_id>
const { supabase } = require('../utils/supabase');
const { transcribeEpisode } = require('../pipeline/transcribe');
const { chunkTranscript } = require('../pipeline/chunk');
const { logPipelineStep } = require('../utils/logger');
const { setStep } = require('./_set-step');

async function main(episodeId) {
  if (!episodeId) {
    console.error('Usage: transcribe-and-chunk.js <episode_id>');
    process.exit(2);
  }

  const startedAt = new Date().toISOString();
  await setStep(episodeId, 'processing', 'transcribing', 'transcribing');

  // Get the episode's audio URL
  const { data: ep, error: epErr } = await supabase
    .from('episodes')
    .select('id, title, audio_url, duration_seconds')
    .eq('id', episodeId)
    .single();
  if (epErr) throw new Error(`Episode not found: ${epErr.message}`);

  console.error(`Transcribing: ${ep.title}`);
  const transcript = await transcribeEpisode(episodeId, ep.audio_url);

  // Chunk
  const chunks = chunkTranscript(
    transcript.rawText,
    transcript.speakerLabels,
    transcript.paragraphs || []
  );
  console.error(`Chunked into ${chunks.length} chunks (target 2,500 words each)`);

  // Save chunks back to transcripts.chunks
  const { error: updErr } = await supabase
    .from('transcripts')
    .update({ chunks })
    .eq('episode_id', episodeId);
  if (updErr) throw new Error(`Failed to save chunks: ${updErr.message}`);

  await logPipelineStep({
    episodeId,
    stepName: 'chunking',
    startedAt,
    finishedAt: new Date().toISOString(),
    status: 'success',
    metadata: { chunkCount: chunks.length, totalWords: chunks.reduce((s, c) => s + c.wordCount, 0) },
  });

  await setStep(episodeId, 'processing', 'pass_1_pending', 'pass_1');

  console.log(JSON.stringify({ ok: true, chunkCount: chunks.length }));
}

main(process.argv[2]).catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
