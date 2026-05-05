# Agent 4 Plan: Website (Next.js Frontend)

## Context

Agent 4 builds the entire Next.js frontend, creates the Supabase schema for all agents, and implements the subscriber signup flow. The design language is "manuscript aesthetic" — monospaced type, black on white, massive whitespace, dialogue as a brand device, zero decoration.

## Build Order

### Phase 1: Foundation
1. **Supabase schema** — All 10 tables from the pre-build spec, plus `guest_name TEXT` on `processed_content` (Agent 3 identified this gap).
2. **Next.js project setup** — App Router, TypeScript, Tailwind CSS, JetBrains Mono + Lora fonts, Supabase client, Vercel config.
3. **Global layout** — Nav (logo left, E-books/Newsletter/About right), footer (centered, minimal), newsletter signup component, sticky signup bar, exit intent popup.
4. **Homepage** — Manuscript aesthetic anchor. Dialogue, whitespace, three nav links, signup form. **Stop here for Anton's approval before other pages.**

### Phase 2: Content Pages (after homepage approval)
5. **E-books page** (`/ebooks`) — Episode list with podcast filtering (text toggles), "load more" pagination. Cards: title, guest/podcast with accent dot, page count, framework label.
6. **Episode detail page** (`/ebooks/[slug]`) — Summary, chapter list, self-rating note, "Get the e-book ↓" (immediate download), newsletter material, signup form. ISR (1 hour).
7. **Quick summaries page** (`/summaries`) — Feed of summaries with links to full e-books.

### Phase 3: Newsletter & Supporting Pages
8. **Newsletter page** (`/newsletter`) — Dialogue opener, description, signup form, past issue preview, archive list.
9. **Newsletter archive pages** (`/newsletter/archive/[slug]`) — Issue content (4 sections), related e-book links, signup form.
10. **About page** (`/about`) — Dialogue opener, first-person explanation, signup form.
11. **Privacy page** (`/privacy`) — Plain monospaced text, simple language.
12. **404 page** — Dialogue, "Go home" link.
13. **Confirmed page** (`/confirmed`) — "You're in" he said / –Headphones off we said. Links to newsletter page and latest ebooks. Agent 5's double opt-in redirects here.

### Phase 4: Infrastructure & Polish
14. **Signup API route** — `POST /api/subscribe` → validate email → Supabase insert (status: pending, confirmation_token).
15. **PDF download tracking** — Plausible click events per episode.
16. **OG image generation** — White background, black monospaced text.
17. **SEO** — Meta tags, structured data (JSON-LD), sitemap.
18. **Analytics** — Plausible integration.
19. **Responsive polish** — Mobile-first pass on all pages.

## Database

### I CREATE all 10 tables:
podcasts, episodes, transcripts, processed_content (+ guest_name), subscribers, newsletters, processing_queue, pipeline_logs, cost_tracking, prompt_versions

### I READ from:
episodes, processed_content, podcasts, newsletters

### I WRITE to:
subscribers (new signups: email, status pending, confirmation_token)

## Dependencies

### I need from others:
- Agent 2: published content in `processed_content` (can use seed data until then)
- Agent 3: PDF URLs in `processed_content.ebook_pdf_url` (can show placeholder until then)

### Others need from me:
- All agents: Supabase schema (Phase 1, Step 1)
- Agent 5: subscriber rows with status `pending` and `confirmation_token`
- Agent 5: `/confirmed` page for double opt-in redirect

## Technical Decisions
- Next.js 14+ with App Router, TypeScript, Tailwind CSS
- JetBrains Mono (brand font) + Lora (reading font)
- Supabase JS client (server-side for API routes, client-side for reads)
- Vercel deployment (preview URL until domain acquired)
- Plausible analytics (privacy-first, GDPR-compliant)
- Cookie-based signup state (hide sticky bar + exit popup after signup)
- ISR revalidation: 1 hour

## Schema Addition
`processed_content.guest_name TEXT` — not in original pre-build spec, identified by Agent 3. Logged in PROJECT-STATUS.md.
