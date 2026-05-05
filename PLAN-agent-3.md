# PLAN — Agent 3: PDF Generation

## Overview

Agent 3 owns the transformation layer: reading structured ebook content from `processed_content` (written by Agent 2), rendering it through an HTML template, converting to PDF via Puppeteer, uploading to Supabase Storage, and writing the URL back. Agent 3 owns no tables directly.

---

## Build Order

### Task 1: Data Contract ✅
Define the JSON shape Agent 3 expects. Agent 2 outputs `ebook_content` as structured Markdown with YAML front matter. Agent 3 parses this into a structured object for template rendering.

**File:** `src/agent-3/data-contract.js`

### Task 2: HTML Template + CSS (Manuscript Aesthetic)
The core visual output. Monospaced throughout for Phase 1 (JetBrains Mono). White background, black text, generous whitespace — pages should feel 70% empty.

**Pages:** Cover → Page Two (chapter list + self-rating) → Chapter Openers (accent line, pull-forward) → Body Pages (subheaders, pull quotes with accent border) → Last Page (newsletter CTA)

**Files:** `src/agent-3/templates/ebook.html`, `src/agent-3/render-html.js`

### Task 3: Hardcoded Test Data + Visual QA Script
3 test episodes (The Big Idea, The Playbook, The Contrarian Take) with realistic content. CLI script generates HTML for browser review.

**Files:** `src/agent-3/test/test-data.js`, `src/agent-3/test/generate-test.js`

### Task 4: Puppeteer Integration
HTML → PDF conversion using `puppeteer-core` with Chromium. JetBrains Mono embedded as base64 in the HTML.

**File:** `src/agent-3/puppeteer-config.js`

### Task 5: Ebook Content Parser
Parses Agent 2's structured Markdown with YAML front matter into the data contract format.

**File:** `src/agent-3/parse-ebook-content.js`

### Task 6: Supabase Storage Integration
Upload PDF buffer to `ebooks` bucket. Public URLs. Path: `{podcast-slug}/{episode-slug}.pdf`.

**File:** `src/agent-3/supabase-storage.js`

### Task 7: Full Pipeline Orchestrator
Main function: `episode_id` → query DB → parse → render → Puppeteer → upload → write URL back.

**File:** `src/agent-3/generate-pdf.js`

### Task 8: Page Count Verification
Count actual pages from PDF buffer, write `final_page_count` back.

### Task 9: Accent Colour Testing
Verify all 5 podcast colours render correctly across all page types.

### Task 10: Integration Test with Real Content
3 real episodes end-to-end through the PDF pipeline.

### Task 11: Docker Configuration for Railway
Base Dockerfile with Chromium + JetBrains Mono. Agents 1 and 2 extend it.

---

## Database Interaction

**Read from:** `processed_content` (ebook_content, self_rating_note, guest_name, pass_2_framework_selected, final_page_count), `episodes` (title, duration_seconds, published_at, podcast_id), `podcasts` (name, accent_colour)

**Write to:** `processed_content.ebook_pdf_url`, `processed_content.final_page_count`, `pipeline_logs` (step_name: 'pdf_generation')

---

## Dependencies

| Agent | What I Need | Blocking? | Workaround |
|---|---|---|---|
| Agent 2 | Structured Markdown ebook_content | Partially | Hardcoded test data for Tasks 1-4 |
| Agent 4 | Supabase project + schema | For Tasks 6-7 | Tasks 1-4 are local-only |

## What Others Need From Me

| Agent | What They Need |
|---|---|
| Agent 4 | `processed_content.ebook_pdf_url` for download links |
| Agent 5 | `processed_content.ebook_pdf_url` for newsletter ebook links |

---

## Cross-Agent Decisions (logged in PROJECT-STATUS.md)

1. Agent 2 outputs `ebook_content` as structured Markdown with YAML front matter
2. Added `guest_name TEXT` to `processed_content` — Agent 2 populates during Pass 2
3. Agent 3 creates the base Railway Dockerfile — Agents 1/2 extend it
