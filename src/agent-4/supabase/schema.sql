-- icantlistentothemall — Full Supabase schema
-- Created by Agent 4 (2026-04-16)
-- Source: pre-build spec + guest_name addition (Agent 3)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- podcasts
-- ============================================
CREATE TABLE podcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rss_feed_url TEXT NOT NULL,
  accent_colour TEXT NOT NULL,
  format_tag TEXT NOT NULL,
  podcast_context TEXT,
  active BOOLEAN DEFAULT true,
  last_successful_fetch TIMESTAMP WITH TIME ZONE,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- episodes
-- ============================================
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  podcast_id UUID NOT NULL REFERENCES podcasts(id),
  guid TEXT,
  guid_hash TEXT,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  duration_source TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'queued',
  skip_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(podcast_id, guid),
  UNIQUE(podcast_id, guid_hash)
);

CREATE INDEX idx_episodes_status ON episodes(status);
CREATE INDEX idx_episodes_podcast_id ON episodes(podcast_id);
CREATE INDEX idx_episodes_published_at ON episodes(published_at DESC);

-- ============================================
-- transcripts
-- ============================================
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  raw_text TEXT NOT NULL,
  speaker_labels JSONB,
  deepgram_metadata JSONB,
  chunks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_transcripts_episode_id ON transcripts(episode_id);

-- ============================================
-- processed_content
-- ============================================
CREATE TABLE processed_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  guest_name TEXT,
  summary_text TEXT,
  ebook_content TEXT,
  ebook_pdf_url TEXT,
  self_rating_note TEXT,
  final_page_count INTEGER,
  newsletter_insight TEXT,
  newsletter_stat TEXT,
  newsletter_tip TEXT,
  newsletter_exercise TEXT,
  newsletter_included BOOLEAN DEFAULT false,
  pass_1_insight_count INTEGER,
  pass_1_agreement_score INTEGER,
  pass_1_divergent_insights JSONB,
  pass_1_stronger_instance TEXT,
  pass_2_framework_selected TEXT,
  pass_2_outline_approved BOOLEAN,
  pass_2_outline_edited BOOLEAN,
  self_review_scores JSONB,
  self_review_accuracy_score INTEGER,
  self_review_rewrites INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_processed_content_episode_id ON processed_content(episode_id);
CREATE INDEX idx_processed_content_status ON processed_content(status);

-- ============================================
-- subscribers
-- ============================================
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_token TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  subscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_confirmation_token ON subscribers(confirmation_token);

-- ============================================
-- newsletters
-- ============================================
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_line TEXT,
  dialogue_header TEXT,
  top_insight_text TEXT,
  surprising_stat_text TEXT,
  actionable_tip_text TEXT,
  exercise_text TEXT,
  footer_ebook_links JSONB,
  self_review_score JSONB,
  episode_ids JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  skip_reason TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_newsletters_status ON newsletters(status);

-- ============================================
-- processing_queue
-- ============================================
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_episode_id ON processing_queue(episode_id);

-- ============================================
-- prompt_versions
-- ============================================
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_name TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  change_notes TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(prompt_name, version)
);

CREATE INDEX idx_prompt_versions_active ON prompt_versions(prompt_name) WHERE is_active = true;

-- ============================================
-- pipeline_logs
-- ============================================
CREATE TABLE pipeline_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID REFERENCES episodes(id),
  step_name TEXT NOT NULL,
  prompt_version_id UUID REFERENCES prompt_versions(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_seconds NUMERIC,
  input_tokens INTEGER,
  output_tokens INTEGER,
  audio_duration_seconds NUMERIC,
  cost_usd NUMERIC(10,4),
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_pipeline_logs_episode_id ON pipeline_logs(episode_id);

-- ============================================
-- cost_tracking
-- ============================================
CREATE TABLE cost_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID REFERENCES episodes(id),
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd NUMERIC(10,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_cost_tracking_episode_id ON cost_tracking(episode_id);
CREATE INDEX idx_cost_tracking_created_at ON cost_tracking(created_at DESC);
