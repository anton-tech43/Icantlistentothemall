-- Migration: add UNIQUE constraint on processed_content.episode_id.
-- Required by Agent 2's finalize-pass-1.js upsert (onConflict: 'episode_id').
-- The original schema only had a regular index, which doesn't satisfy
-- Postgres's ON CONFLICT requirement.
--
-- One row per episode is the intended invariant — there's no scenario
-- where an episode legitimately has two processed_content rows.

ALTER TABLE processed_content
  ADD CONSTRAINT processed_content_episode_id_key UNIQUE (episode_id);
