// Agent 2: Deepgram transcription — receives audio URL, returns structured transcript
const { DefaultDeepgramClient } = require('@deepgram/sdk');
const { supabase } = require('../utils/supabase');
const { logPipelineStep, logCost } = require('../utils/logger');
require('dotenv').config();

const deepgram = new DefaultDeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });

// Deepgram Nova-2 pricing: $0.0043/min
const DEEPGRAM_COST_PER_MINUTE = 0.0043;

async function transcribeEpisode(episodeId, audioUrl) {
  const startedAt = new Date().toISOString();

  const result = await deepgram.listen.v1.media.transcribeUrl({
    url: audioUrl,
    model: 'nova-2',
    language: 'en',
    punctuate: true,
    paragraphs: true,
    diarize: true,
    smart_format: true,
  });

  const channel = result.results.channels[0];
  const alternative = channel.alternatives[0];

  const rawText = alternative.transcript;
  const paragraphs = alternative.paragraphs?.paragraphs || [];
  const words = alternative.words || [];

  const speakerLabels = extractSpeakerSegments(paragraphs);
  const audioDuration = result.metadata?.duration || 0;
  const wordCount = rawText.split(/\s+/).length;

  const deepgramMetadata = {
    duration: audioDuration,
    channels: result.metadata?.channels,
    model: result.metadata?.model_info,
    wordCount,
    speakerCount: new Set(speakerLabels.map((s) => s.speaker)).size,
    paragraphCount: paragraphs.length,
  };

  const { error: insertError } = await supabase.from('transcripts').insert({
    episode_id: episodeId,
    raw_text: rawText,
    speaker_labels: speakerLabels,
    deepgram_metadata: deepgramMetadata,
  });

  if (insertError) {
    throw new Error(`Failed to store transcript: ${insertError.message}`);
  }

  const costUsd = parseFloat(((audioDuration / 60) * DEEPGRAM_COST_PER_MINUTE).toFixed(4));
  const finishedAt = new Date().toISOString();

  await logCost({
    episodeId,
    service: 'deepgram',
    operation: 'transcription',
    costUsd,
  });

  await logPipelineStep({
    episodeId,
    stepName: 'transcription',
    startedAt,
    finishedAt,
    audioDurationSeconds: audioDuration,
    costUsd,
    status: 'success',
    metadata: { wordCount, speakerCount: deepgramMetadata.speakerCount },
  });

  return {
    rawText,
    speakerLabels,
    deepgramMetadata,
    paragraphs,
    words,
  };
}

function extractSpeakerSegments(paragraphs) {
  return paragraphs.map((p) => ({
    speaker: p.speaker,
    start: p.start,
    end: p.end,
    text: p.sentences?.map((s) => s.text).join(' ') || '',
  }));
}

module.exports = { transcribeEpisode };
