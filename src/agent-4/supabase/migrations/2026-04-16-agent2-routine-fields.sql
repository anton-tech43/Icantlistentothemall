-- Migration: Agent 2 routine migration — additional fields needed for the
-- new Claude Code routine pipeline.
--
-- Owner: Agent 2 (added with Agent 4's coordination — Agent 4 owns the schema overall)
-- Reason: routine-based pipeline persists the full Pass 2 outline text so the
-- next fire (after outline approval) can use it as input to Pass 3 writing
-- without regenerating it. Also adds processing_queue.current_step indexing
-- since next-action.js queries on this column heavily.

-- 1. Store the full Pass 2 outline text so Pass 3 can read it back later.
ALTER TABLE processed_content ADD COLUMN IF NOT EXISTS pass_2_outline TEXT;

-- 2. Index processing_queue.current_step (the routine reads it on every fire
--    to find the next action).
CREATE INDEX IF NOT EXISTS idx_processing_queue_current_step
  ON processing_queue(current_step);

-- 3. (Documentation) processing_queue.current_step values used by the routine
--    pipeline:
--      pending             — initial state (set by Agent 1 when episode is queued)
--      transcribing        — Deepgram in flight
--      pass_1_pending      — chunked, ready for Pass 1
--      pass_1_done         — all chunks have merged extractions; ready to finalize
--      pass_2_pending      — Pass 1 finalized, ready for structuring
--      awaiting_approval   — outline emailed, paused until Anton clicks Approve
--      pass_3_pending      — outline approved, ready for writing
--      pass_3_done         — summary/ebook/newsletter saved, ready for review
--      review_pending      — self-review in progress
--      finalize_pending    — review passed, ready for self-rating note + complete
--      complete            — published as draft
--      pass_1_review_needed — agreement < 5 on a chunk; human review needed
