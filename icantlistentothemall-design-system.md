# Icantlistentothemall — Design System (Manuscript Edition)

## Context
This document replaces the PDF branding spec and site design spec. The manuscript aesthetic discovered in the homepage draft becomes the unified design language across the entire product: site, ebooks, newsletter, and all touchpoints.

---

## The Aesthetic: Manuscript

The design language is literary. Monospaced type, generous whitespace, dialogue as a device, restraint as the primary visual tool. It feels like reading a manuscript draft, a screenplay, or a note left on someone's desk. Deliberately un-designed. The absence of decoration IS the design.

This is the opposite of every content aggregator, newsletter landing page, and SaaS product on the internet. Someone lands here and immediately feels the difference. It's quiet. It's confident. It respects the reader's attention.

### Core Principles
1. **Whitespace is the primary design element.** Pages should feel 70% empty.
2. **Monospaced type is the brand voice.** It signals "this was written, not designed."
3. **Dialogue is the brand device.** The conversation between the reader and the product appears across touchpoints.
4. **No decoration.** No icons, no illustrations, no gradients, no colour blocks, no borders, no shadows. Text and space only.
5. **Underlines for links.** Like early web pages and typewritten manuscripts. No buttons with fills — just underlined text.
6. **Everything should feel like it could have been typed on a typewriter.** If a design element wouldn't exist on a typed page, it probably doesn't belong here.

---

## Typography

### Primary: Monospaced
- **Font:** JetBrains Mono, Courier Prime, or IBM Plex Mono (all free, all have good readability)
- **Usage:** all headings, navigation, labels, dialogue, chapter numbers, pull quotes, metadata, links
- **This is the brand font.** It appears everywhere the brand speaks.

### Secondary: Serif (reading font)
- **Font:** Lora
- **Usage:** ebook body text only — the long-form reading experience
- **Why serif for body:** monospaced works for short text but fatigues over multiple pages. Lora handles the reading. The switch from mono to serif when you open an ebook signals "now you're reading the book."

### Sizing Principles
- Large text with lots of space around it. Never dense.
- On the site: body text at 16-18px, generous line height (1.8+)
- In ebooks: body text at 11pt (Lora), chapter labels and pull quotes in mono

---

## Colour Palette

### Revised for Manuscript Aesthetic
- **Background:** white `#FFFFFF` — clean, like paper. The off-white warm palette is overridden. Manuscripts are on white paper.
- **Text:** black `#000000` — or near-black `#111111`. High contrast, like ink on paper.
- **Secondary text:** medium grey `#666666` — for metadata, dates, small supporting text
- **Links:** black, underlined. No colour change. Like a typewritten note with underlined words.
- **Accent colours:** the podcast colour system still exists but is used minimally — a small coloured dot on episode cards and a thin coloured line on ebook chapter openers. The colour peeks through the black-and-white manuscript world. It should feel like someone marked up the manuscript with a coloured pen.

### Podcast Accent Colours (unchanged)
- Diary of a CEO → terracotta `#C4654A`
- My First Million → deep amber `#C48B2A`
- Tim Ferriss → sage green `#6B8F71`
- Hormozi → burnt sienna `#A0522D`
- Lenny's Podcast → dusty blue `#5B7B8A`

These appear only as:
- A small coloured dot next to the podcast name on episode cards
- A thin coloured line above chapter titles in ebooks
- A coloured left-border on pull quotes in ebooks

Subtle. Like ink marks on a typed page.

---

## The Dialogue Device

The brand communicates through short dialogue exchanges. This replaces traditional headlines, taglines, and marketing copy.

### Homepage dialogue (from the original draft):
```
"I can't listen to them all" he said
–And you don't have to we said calmly
```

### The dialogue evolves across touchpoints:

**Confirmation email:**
```
"Did I just sign up for another newsletter?" he asked
–This one's different we said
```

**Welcome email:**
```
"So what do I get?" she asked
–The best ideas from the best podcasts, every two weeks we said
```

**Newsletter header (rotating per issue):**
```
"I missed another 3-hour episode" he said
–We caught it for you we said
```

**404 page:**
```
"This page doesn't exist" he said
–Neither does the time to listen to all those podcasts we said
```

**About page opener:**
```
"Why does this exist?" she asked
–Because some of us would rather read we said
```

Each dialogue follows the same format: the reader speaks in quotes, the product responds with a dash. Always third person ("he said," "she asked," "we said"). Always calm, slightly understated. Never exclamation marks. The product is the quiet, confident friend.

---

## Site Design

### Global Elements

**Navigation:**
- Top of page, monospaced, widely spaced
- Logo text on the left: `icantlistentothemall`
- Links on the right: `Newsletter` · `E-books` · `About`
- All underlined, black on white
- On mobile: logo top, links below it, no hamburger menu — the links are short enough to display openly

**Footer (every page):**
- Monospaced, small, centred
- `icantlistentothemall.com` · `Privacy`
- Minimal. Like the last line on a manuscript page.

**Newsletter signup (appears on every page bottom):**
- Small, understated, monospaced
- A single line of text: `Get the bi-weekly newsletter`
- Below it: email input field (monospaced placeholder: `your email`) and a `→` submit indicator
- No button with a fill. Just the arrow.
- Below the input, tiny text: `Free. No spam. Unsubscribe anytime.`

---

### Homepage (/)

Deliberately sparse. Mostly whitespace.

```
[top nav]



                    [massive whitespace — 40% of viewport]



        "I can't listen to them all" he said
        –And you don't have to we said calmly



                    [whitespace]



        We turn the best business podcasts
        into short reads.



                    [whitespace]



        Newsletter          E-books          Quick summary
        __________          _______          _____________



                    [whitespace]



        your email →



                    [footer]
```

That's the whole page. No ebook cards on the homepage, no "how it works" section, no feature list. The homepage IS the brand statement. People who want content click through to E-books or Quick summary. People who want the newsletter sign up right there.

The three links (Newsletter, E-books, Quick summary) act as the primary navigation for first-time visitors. They answer "what can I do here?" without explanation.

---

### E-books Page (/ebooks)

A list. Nothing more.

```
[top nav]



        E-books
        -------

        The Pricing Framework Most Founders Get Wrong
        Alex Hormozi · The Game Podcast · 8 pages
        The Big Idea
        ____________________________________________

        Three Hiring Mistakes That Cost Him $2M
        Steven Bartlett · Diary of a CEO · 6 pages
        The Founder's Lesson
        ____________________________________________

        Why Cold Outreach Still Works in 2026
        My First Million · 4 pages
        The Playbook
        ____________________________________________

        [load more]



        [newsletter signup]
        [footer]
```

Each entry is:
- Title (monospaced, larger)
- Guest name · Podcast name (with tiny accent colour dot) · Page count
- Framework label (The Big Idea / The Playbook / The Founder's Lesson / The Contrarian Take)
- A thin horizontal rule as separator

No cards, no grid, no thumbnails. A list, like a table of contents or a library catalogue. Click any title to go to the detail page.

Filter: a small row above the list — `All` · `Diary of a CEO` · `My First Million` · `[etc.]` — monospaced, underlined when active. Simple text toggle, no dropdowns.

---

### Episode Detail Page (/ebooks/[slug])

```
[top nav]



        The Pricing Framework Most Founders Get Wrong

        Alex Hormozi · The Game Podcast
        Episode aired: March 12, 2026 · Duration: 1hr 42min
        8 pages · The Big Idea



        -------



        [Summary — 3-5 sentences, monospaced]

        This episode breaks down Hormozi's value-based pricing
        framework. Most founders price based on cost or competition.
        Hormozi argues you should price based on the measurable
        outcome your customer gets. The ebook covers the pricing
        formula, three common objections, and why free trials
        kill margins.



        -------



        What's inside:

        1. The problem with cost-based pricing
        2. The value equation
        3. Handling the "it's too expensive" objection
        4. Rethinking free trials



        -------



        This was a focused conversation. The ebook captures the
        core framework and its practical applications.



        Get the e-book: your email →



        -------



        Surprising stat from this episode:
        [1-2 sentences]

        Something you can do today:
        [actionable tip]

        Reflect on this:
        [exercise/challenge]



        [newsletter signup]
        [footer]
```

The email gate sits in the middle of free content. Above it: summary, chapter list, self-rating note. Below it: newsletter material that delivers value even without downloading. The gate itself is just a monospaced line: `Get the e-book: your email →`

Once the email gate is turned on (after ~50 ebooks), this becomes the conversion point. Before that, it's a direct download link: `Get the e-book ↓`

---

### Newsletter Page (/newsletter)

```
[top nav]



        "Did I just sign up for another newsletter?" he asked
        –This one's different we said



                    [whitespace]


        Every two weeks. The sharpest insights from the best
        business podcasts. An actionable tip. A challenge to
        make you think. That's it.



        your email →



                    [whitespace]


        Here's what a recent issue looked like:
        -----------------------------------------

        [full text of a past newsletter issue, styled in the
        manuscript aesthetic]



                    [whitespace]


        Archive
        _______

        Issue 12 — The pricing mistake · Apr 1, 2026
        Issue 11 — Why most goals fail · Mar 18, 2026
        Issue 10 — The hiring framework · Mar 4, 2026
        [view all →]



        [footer]
```

---

### Newsletter Archive Page (/newsletter/archive/[slug])

```
[top nav]



        Want this in your inbox every two weeks?
        your email →



        -------



        Issue 12 · April 1, 2026



        TOP INSIGHT

        [2-3 sentences, monospaced]
        From: The Pricing Framework Most Founders Get Wrong
        Read the full e-book →



        SURPRISING STAT

        [1-2 sentences]



        DO THIS TODAY

        [actionable tip]



        REFLECT ON THIS

        [exercise/challenge]



        -------



        Free e-books from this issue:

        The Pricing Framework Most Founders Get Wrong · 8 pages ↓
        Three Hiring Mistakes · 6 pages ↓



        [footer]
```

Newsletter section headers in caps, monospaced. Clean separation between sections with whitespace rather than visual dividers.

---

### About Page (/about)

```
[top nav]



        "Why does this exist?" she asked
        –Because some of us would rather read we said



                    [whitespace]


        I like business podcasts. I can't listen to them all.
        Most episodes are 2-3 hours long. I have maybe 20 minutes.

        So I built a thing. It takes the best episodes and turns
        them into short, focused reads. The ideas without the filler.

        Everything here is free. No ads, no sponsors, no catch.

        – Anton



        [newsletter signup]
        [footer]
```

Short. First person. Matches the manuscript voice. The dash before Anton's name like a letter sign-off.

---

### Quick Summary Page (/summaries)

A feed of just the summaries. For people who want the fastest possible scan.

```
[top nav]



        Quick summaries
        ---------------

        The Pricing Framework Most Founders Get Wrong
        Alex Hormozi · The Game Podcast · Mar 12, 2026

        Most founders price based on cost. Hormozi argues that's
        leaving 5-10x revenue on the table. His value-based
        pricing framework ties price to measurable customer
        outcomes. The full e-book covers the formula, objections
        handling, and why free trials kill margins.

        Read the full e-book →

        ____________________________________________

        [next summary]

        ____________________________________________

        [newsletter signup]
        [footer]
```

Pure text. Each summary is 3-5 sentences followed by a link to the full ebook. Scroll through and absorb ideas in seconds. This page is the "I have 2 minutes" product.

---

### Privacy Page (/privacy)

Same manuscript aesthetic. Plain text, monospaced. The legal content written as simply as possible — not legalese. GDPR-compliant but human-readable.

---

### 404 Page

```


        "This page doesn't exist" he said
        –Neither does the time to listen to all those podcasts we said

        Go home →

```

---

## Ebook PDF Design (Updated)

The ebook inherits the manuscript aesthetic but introduces the serif reading font for comfort over longer text.

### Cover Page

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│   The Pricing Framework              │
│   Most Founders Get Wrong            │
│   (monospaced, black, large)         │
│                                      │
│                                      │
│   Alex Hormozi                       │
│   The Game Podcast                   │
│   (monospaced, grey, smaller)        │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│   icantlistentothemall               │
│   (monospaced, grey, small,          │
│    bottom left)                      │
│                                      │
│   The Big Idea · 8 pages            │
│   (monospaced, grey, small,          │
│    bottom right)                     │
│                                      │
└──────────────────────────────────────┘
```

White page. Black text. Massive whitespace. The title sits in the upper-middle area, not centred — slightly offset like a manuscript title page. Framework label and page count at the bottom right as metadata.

No colour blocks on the cover. The podcast accent colour appears only as a thin coloured line at the very top of the page — like a pen mark on the manuscript.

### Page Two: The "Back Cover"

```
┌──────────────────────────────────────┐
│                                      │
│   ▍ (thin accent colour line)        │
│                                      │
│                                      │
│   This was a focused conversation.   │
│   The ebook captures the core        │
│   framework and its practical        │
│   applications.                      │
│   (monospaced, self-rating note)     │
│                                      │
│                                      │
│   What's inside:                     │
│                                      │
│   1. The problem with cost-based     │
│      pricing                         │
│   2. The value equation              │
│   3. Handling objections             │
│   4. Rethinking free trials          │
│   (monospaced, chapter list)         │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

The self-rating note and chapter list on page two. Like the inside flap of a book jacket. Monospaced throughout. The reader knows exactly what they're getting before page three.

### Chapter Openers

```
┌──────────────────────────────────────┐
│                                      │
│   ▍ (thin accent colour line)        │
│                                      │
│                                      │
│                                      │
│   Chapter 2                          │
│   (monospaced, grey, small)          │
│                                      │
│   The Value Equation                 │
│   (monospaced, black, large)         │
│                                      │
│                                      │
│   Hormozi's core argument: price     │
│   should reflect the outcome, not    │
│   the input.                         │
│   (monospaced, pull-forward —        │
│    the key sentence of this chapter) │
│                                      │
│                                      │
│   Body text begins here in Lora      │
│   serif. The shift from monospace    │
│   to serif signals: now you're       │
│   reading the substance.             │
│                                      │
│                                      │
│                                 3    │
└──────────────────────────────────────┘
```

Each chapter opens with the chapter number in grey, the title in black mono, and a pull-forward sentence — the single most important idea of that chapter, in monospaced type. Then the body text begins in Lora serif. The typographic shift from mono to serif creates a visual rhythm: mono = structure/navigation, serif = reading.

The thin accent colour line at the top of each chapter opener is the only colour in the entire ebook. It's the pen mark.

### Body Pages

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│   Subheader Title                    │
│   (monospaced, black, medium)        │
│                                      │
│   Body text in Lora serif.           │
│   Generous margins, comfortable      │
│   line length, 1.6 line height.      │
│   Clean paragraphs with space        │
│   between them.                      │
│                                      │
│                                      │
│   ▍ "Price is what you pay. Value    │
│   ▍  is what you get."              │
│   ▍  — Hormozi                      │
│   (monospaced, with accent           │
│    colour left border)               │
│                                      │
│                                      │
│   More body text continues in        │
│   Lora serif after the quote.        │
│                                      │
│                                      │
│                                 5    │
└──────────────────────────────────────┘
```

Subheaders in monospaced black. Pull quotes in monospaced with the accent colour left border. Body text in Lora. Page numbers monospaced, bottom right — no footer URL (too cluttered for the manuscript look).

### Framework Visual Variations

Each framework type has a subtle visual difference in the chapter opener pull-forward:

**The Big Idea:** pull-forward states the core concept
```
   Hormozi's core argument: price should
   reflect the outcome, not the input.
```

**The Playbook:** pull-forward states what the reader will be able to do
```
   After this chapter, you'll know exactly
   how to calculate your value-based price.
```

**The Founder's Lesson:** pull-forward states the lesson, not the story
```
   The first hire cost him $200K and taught
   him more than his MBA.
```

**The Contrarian Take:** pull-forward states the conventional belief being challenged
```
   Most founders think free trials drive
   conversion. The data says otherwise.
```

Same layout, same typography — the framework identity lives in the content of the pull-forward, not in visual gimmicks.

### Last Page

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│   icantlistentothemall               │
│                                      │
│   Want insights like this            │
│   every two weeks?                   │
│                                      │
│   icantlistentothemall.com/newsletter│
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

Monospaced. Centred. Vast whitespace. Like the final page of a manuscript that just says "END" — but instead it points to the newsletter.

---

## Newsletter Email Design (Updated)

The newsletter inherits the manuscript aesthetic within the constraints of email rendering.

### Template

```
icantlistentothemall



"I missed another 3-hour episode" he said
–We caught it for you we said

__________________________________________


TOP INSIGHT

[2-3 sentences in plain text]

From: [Episode Title] · [Podcast Name]
Read the full e-book →


SURPRISING STAT

[1-2 sentences]


DO THIS TODAY

[actionable tip — specific and concrete]


REFLECT ON THIS

[exercise/challenge — reflective prompt]

__________________________________________


Free e-books from the last two weeks:

[Title] · [Podcast] · [pages] ↓
[Title] · [Podcast] · [pages] ↓
[Title] · [Podcast] · [pages] ↓

__________________________________________


icantlistentothemall.com
unsubscribe
```

### Design Rules for the Email
- Single column, max width 600px
- System monospaced font (Courier New is the universal fallback)
- Black text on white background
- No images, not even the logo as an image — the logo is text
- Section headers in ALL CAPS monospaced (the only emphasis device)
- Horizontal rules as thin underscores or dashes
- Links underlined, black
- Dialogue header rotates each issue — always in the same format
- The email should look like it was typed and sent from a terminal

### Why This Works for Email
Email clients strip most CSS, break custom fonts, and block images. A monospaced text-only email sidesteps all of these problems. It renders perfectly everywhere — Gmail, Apple Mail, Outlook, mobile. It's also distinctive: every other newsletter in someone's inbox has branded headers, hero images, and coloured buttons. This one looks like a note. That's the whole point.

---

## Sticky Signup Bar (Updated)

```
Get the bi-weekly newsletter: your email → 
```

One line. Monospaced. Black on white. Fixed to the bottom of the viewport on mobile, top on desktop. Disappears after signup.

---

## Exit Intent Popup (Updated)

```


        Wait—

        [X] readers get the best podcast
        insights every two weeks.

        your email →


```

Monospaced. White background. Centred. Minimal. Close button is a simple `×` in the top corner. Desktop only.

---

## Social Sharing / Open Graph Images

When an ebook link is shared on social media, the preview image should match the manuscript aesthetic:

```
┌──────────────────────────────────────┐
│                                      │
│   The Pricing Framework              │
│   Most Founders Get Wrong            │
│                                      │
│   Alex Hormozi · The Game Podcast    │
│                                      │
│   icantlistentothemall               │
│                                      │
└──────────────────────────────────────┘
```

White background, black monospaced text, no decoration. Stands out in social feeds because everything else is colourful and noisy.

---

## Design System Summary

| Element | Font | Colour |
|---|---|---|
| Logo | Monospaced | Black |
| Navigation | Monospaced | Black, underlined |
| Headlines / titles | Monospaced | Black |
| Dialogue device | Monospaced | Black |
| Metadata (dates, page count) | Monospaced | Grey `#666666` |
| Ebook body text | Lora (serif) | Black |
| Pull quotes | Monospaced | Black, accent colour left border |
| Chapter labels | Monospaced | Grey |
| Chapter titles | Monospaced | Black |
| Chapter pull-forward | Monospaced | Black |
| Subheaders | Monospaced | Black |
| Links | Monospaced | Black, underlined |
| Newsletter section headers | Monospaced, ALL CAPS | Black |
| Page numbers | Monospaced | Grey |
| Podcast accent colour | — | Used only as thin lines and small dots |
| Backgrounds | — | White `#FFFFFF` everywhere |

---

## What This Replaces
- This document supersedes the PDF branding spec and site design spec
- The newsletter growth mechanics (email gate, sticky bar, exit intent, signup on every page) remain as specified in the site design spec
- The subscriber touchpoints table from the site design spec remains valid
- The podcast accent colour assignments remain valid but are used more sparingly
- All other specs (project plan, prompt engineering, pipeline, newsletter, risk mitigation) remain unchanged
