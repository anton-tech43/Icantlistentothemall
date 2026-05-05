// Agent 2: Transcript chunking — splits transcripts into extraction-ready chunks
// Target: 2,500 words, min 1,500, max 3,500, 200-word overlap, 12-min max span

const TARGET_WORDS = 2500;
const MIN_WORDS = 1500;
const MAX_WORDS = 3500;
const OVERLAP_WORDS = 200;
const MAX_SECONDS = 720; // 12 minutes
const LONG_SPEAKER_SECONDS = 180; // 3 minutes — triggers split priority 1

function chunkTranscript(rawText, speakerLabels, paragraphs) {
  const sentences = splitIntoSentences(rawText, speakerLabels, paragraphs);
  if (sentences.length === 0) return [];

  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;
  let chunkStartTime = sentences[0].start || 0;
  let lastSpeaker = null;
  let speakerDuration = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceWords = countWords(sentence.text);
    const elapsedSeconds = (sentence.end || sentence.start || 0) - chunkStartTime;

    if (sentence.speaker !== lastSpeaker) {
      speakerDuration = 0;
    } else {
      speakerDuration += (sentence.end || 0) - (sentence.start || 0);
    }

    const shouldForceSplit = currentWordCount >= MAX_WORDS || elapsedSeconds >= MAX_SECONDS;
    const shouldConsiderSplit = currentWordCount >= TARGET_WORDS - 500;

    if (shouldForceSplit && currentChunk.length > 0) {
      chunks.push(buildChunk(currentChunk, chunkStartTime));
      const { overlapSentences, overlapWords } = getOverlap(currentChunk, OVERLAP_WORDS);
      currentChunk = [...overlapSentences, sentence];
      currentWordCount = overlapWords + sentenceWords;
      chunkStartTime = overlapSentences[0]?.start || sentence.start || 0;
      lastSpeaker = sentence.speaker;
      speakerDuration = 0;
      continue;
    }

    if (shouldConsiderSplit && currentChunk.length > 0) {
      const isSpeakerTransitionAfterLong =
        sentence.speaker !== lastSpeaker && speakerDuration >= LONG_SPEAKER_SECONDS;
      const isParagraphBreak = sentence.isParagraphStart;

      if (isSpeakerTransitionAfterLong || isParagraphBreak) {
        chunks.push(buildChunk(currentChunk, chunkStartTime));
        const { overlapSentences, overlapWords } = getOverlap(currentChunk, OVERLAP_WORDS);
        currentChunk = [...overlapSentences, sentence];
        currentWordCount = overlapWords + sentenceWords;
        chunkStartTime = overlapSentences[0]?.start || sentence.start || 0;
        lastSpeaker = sentence.speaker;
        speakerDuration = 0;
        continue;
      }
    }

    currentChunk.push(sentence);
    currentWordCount += sentenceWords;
    lastSpeaker = sentence.speaker;
  }

  if (currentChunk.length > 0) {
    if (currentWordCount < MIN_WORDS && chunks.length > 0) {
      const lastChunk = chunks.pop();
      const merged = [...lastChunk.sentences, ...currentChunk];
      chunks.push(buildChunk(merged, lastChunk.startTime));
    } else {
      chunks.push(buildChunk(currentChunk, chunkStartTime));
    }
  }

  return chunks.map((chunk, index) => ({
    index,
    text: chunk.text,
    wordCount: chunk.wordCount,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    durationSeconds: chunk.endTime - chunk.startTime,
    splitReason: chunk.splitReason || 'end_of_transcript',
  }));
}

function buildChunk(sentences, startTime) {
  const text = sentences.map((s) => s.text).join(' ');
  const endTime = sentences[sentences.length - 1]?.end || sentences[sentences.length - 1]?.start || 0;
  return {
    sentences,
    text,
    wordCount: countWords(text),
    startTime,
    endTime,
  };
}

function getOverlap(chunkSentences, targetOverlapWords) {
  const overlapSentences = [];
  let overlapWords = 0;

  for (let i = chunkSentences.length - 1; i >= 0; i--) {
    const words = countWords(chunkSentences[i].text);
    if (overlapWords + words > targetOverlapWords && overlapSentences.length > 0) break;
    overlapSentences.unshift(chunkSentences[i]);
    overlapWords += words;
  }

  return { overlapSentences, overlapWords };
}

function splitIntoSentences(rawText, speakerLabels, paragraphs) {
  const sentences = [];
  const paragraphStarts = new Set();

  if (paragraphs && paragraphs.length > 0) {
    for (const para of paragraphs) {
      if (para.sentences) {
        for (let si = 0; si < para.sentences.length; si++) {
          const s = para.sentences[si];
          sentences.push({
            text: s.text,
            start: s.start,
            end: s.end,
            speaker: para.speaker,
            isParagraphStart: si === 0,
          });
        }
      }
    }
  }

  if (sentences.length === 0) {
    const sentenceTexts = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
    return sentenceTexts.map((text) => ({
      text: text.trim(),
      start: 0,
      end: 0,
      speaker: null,
      isParagraphStart: false,
    }));
  }

  return sentences;
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

module.exports = { chunkTranscript, countWords };
