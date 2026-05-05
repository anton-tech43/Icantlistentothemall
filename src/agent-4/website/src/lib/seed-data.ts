export type Podcast = {
  id: string;
  name: string;
  accent_colour: string;
  format_tag: string;
};

export type Episode = {
  id: string;
  podcast_id: string;
  title: string;
  slug: string;
  published_at: string;
  duration_seconds: number;
  status: string;
};

export type ProcessedContent = {
  id: string;
  episode_id: string;
  guest_name: string;
  summary_text: string;
  ebook_content: string;
  ebook_pdf_url: string | null;
  self_rating_note: string;
  final_page_count: number;
  pass_2_framework_selected: string;
  newsletter_stat: string;
  newsletter_tip: string;
  newsletter_exercise: string;
  status: string;
  chapters: string[];
};

export const podcasts: Podcast[] = [
  { id: "p1", name: "Diary of a CEO", accent_colour: "#C4654A", format_tag: "interview" },
  { id: "p2", name: "My First Million", accent_colour: "#C48B2A", format_tag: "interview" },
  { id: "p3", name: "Tim Ferriss", accent_colour: "#6B8F71", format_tag: "interview" },
  { id: "p4", name: "Hormozi", accent_colour: "#A0522D", format_tag: "solo" },
  { id: "p5", name: "Lenny's Podcast", accent_colour: "#5B7B8A", format_tag: "interview" },
];

export const episodes: (Episode & { podcast: Podcast; content: ProcessedContent })[] = [
  {
    id: "e1",
    podcast_id: "p4",
    title: "The Pricing Framework Most Founders Get Wrong",
    slug: "pricing-framework-most-founders-get-wrong",
    published_at: "2026-03-12",
    duration_seconds: 6120,
    status: "published",
    podcast: podcasts[3],
    content: {
      id: "c1",
      episode_id: "e1",
      guest_name: "Alex Hormozi",
      summary_text: "Hormozi dismantles cost-based pricing and presents a value equation that reframes how founders should think about what they charge. The core insight: price is a function of the perceived gap between where someone is and where they want to be, multiplied by the likelihood you can get them there. Most founders anchor to their costs or competitors instead of the transformation they deliver.",
      ebook_content: "",
      ebook_pdf_url: null,
      self_rating_note: "This was a focused conversation. The ebook captures the core framework and its practical applications.",
      final_page_count: 8,
      pass_2_framework_selected: "The Big Idea",
      newsletter_stat: "Companies that switch from cost-based to value-based pricing see an average revenue increase of 25% within 6 months.",
      newsletter_tip: "List the top 3 outcomes your product delivers. Price against the value of those outcomes, not the cost of delivering them.",
      newsletter_exercise: "Calculate what your product would cost if you charged 1% of the value it creates for your customer. Compare that to your current price.",
      status: "published",
      chapters: [
        "The problem with cost-based pricing",
        "The value equation",
        "Handling the \"it's too expensive\" objection",
        "Rethinking free trials",
      ],
    },
  },
  {
    id: "e2",
    podcast_id: "p1",
    title: "The Neuroscience of Motivation and Why Most People Quit",
    slug: "neuroscience-motivation-why-people-quit",
    published_at: "2026-03-08",
    duration_seconds: 5400,
    status: "published",
    podcast: podcasts[0],
    content: {
      id: "c2",
      episode_id: "e2",
      guest_name: "Dr. Andrew Huberman",
      summary_text: "Huberman explains the dopamine system not as a reward mechanism but as a motivation circuit. The key reframe: dopamine is released in anticipation of a reward, not after receiving it. This has profound implications for habit design, goal-setting, and understanding why people quit just before they succeed.",
      ebook_content: "",
      ebook_pdf_url: null,
      self_rating_note: "Dense with actionable neuroscience. The ebook distills the most practical frameworks from a wide-ranging conversation.",
      final_page_count: 12,
      pass_2_framework_selected: "The Big Idea",
      newsletter_stat: "Dopamine levels drop 40-60% below baseline immediately after a peak experience, which is why celebration often precedes a motivation crash.",
      newsletter_tip: "After completing a big milestone, deliberately delay your reward by 24 hours. This prevents the dopamine crash that kills momentum on your next goal.",
      newsletter_exercise: "Track your motivation levels for one week. Note when you feel most driven and map it to what you were anticipating, not what you just achieved.",
      status: "published",
      chapters: [
        "Dopamine is not about reward",
        "The anticipation engine",
        "Why winners quit",
        "Designing habits that stick",
        "The cold exposure protocol",
      ],
    },
  },
  {
    id: "e3",
    podcast_id: "p2",
    title: "How a 23-Year-Old Built a $2M Newsletter Business",
    slug: "23-year-old-2m-newsletter-business",
    published_at: "2026-03-01",
    duration_seconds: 4800,
    status: "published",
    podcast: podcasts[1],
    content: {
      id: "c3",
      episode_id: "e3",
      guest_name: "Justin Welsh",
      summary_text: "Welsh breaks down the economics of a one-person newsletter business: acquisition costs, monetisation layers, and the compounding effect of a loyal audience. The surprising insight is that the newsletter itself isn't the product — it's the distribution channel for everything else.",
      ebook_content: "",
      ebook_pdf_url: null,
      self_rating_note: "A practical playbook for anyone considering the creator economy. Heavy on numbers, light on fluff.",
      final_page_count: 7,
      pass_2_framework_selected: "The Playbook",
      newsletter_stat: "The average newsletter subscriber is worth $2-5/year in ad revenue, but $15-50/year when you sell your own products to them.",
      newsletter_tip: "Start collecting email addresses before you have anything to sell. The list is the asset; the product comes later.",
      newsletter_exercise: "Write down 3 things you know well enough to teach. For each, list who would pay to learn it. That's your potential newsletter niche.",
      status: "published",
      chapters: [
        "The economics of one",
        "Acquisition channels that actually work",
        "From free to paid",
        "The product ladder",
      ],
    },
  },
  {
    id: "e4",
    podcast_id: "p3",
    title: "The Art of Strategic Laziness",
    slug: "art-of-strategic-laziness",
    published_at: "2026-02-22",
    duration_seconds: 7200,
    status: "published",
    podcast: podcasts[2],
    content: {
      id: "c4",
      episode_id: "e4",
      guest_name: "Tim Ferriss",
      summary_text: "Ferriss revisits the 80/20 principle with a decade of new data. The conversation centres on identifying the 20% of effort that produces 80% of results across health, wealth, and relationships. His contrarian take: most productivity advice makes you more efficient at things that don't matter.",
      ebook_content: "",
      ebook_pdf_url: null,
      self_rating_note: "A wide-ranging conversation distilled into the most actionable frameworks. Some familiar territory for Ferriss fans, but the updated examples are worth the read.",
      final_page_count: 10,
      pass_2_framework_selected: "The Contrarian Take",
      newsletter_stat: "Ferriss found that eliminating his 5 lowest-value commitments freed up 15 hours per week — more than any productivity tool ever added.",
      newsletter_tip: "Do a \"not-to-do\" audit this week. List everything you did and highlight the 3 activities that consumed the most time with the least impact. Stop doing them.",
      newsletter_exercise: "If you could only work 2 hours per day for the next month, what would you spend those hours on? That's your 20%.",
      status: "published",
      chapters: [
        "Why efficiency is overrated",
        "The elimination audit",
        "The 2-hour workday thought experiment",
        "Applied laziness in health",
        "The relationship 80/20",
      ],
    },
  },
  {
    id: "e5",
    podcast_id: "p5",
    title: "Why Your Product Roadmap Is Probably Wrong",
    slug: "product-roadmap-probably-wrong",
    published_at: "2026-02-15",
    duration_seconds: 5100,
    status: "published",
    podcast: podcasts[4],
    content: {
      id: "c5",
      episode_id: "e5",
      guest_name: "Shreyas Doshi",
      summary_text: "Doshi argues that most product roadmaps fail because they optimise for output (features shipped) rather than outcome (problems solved). He introduces the concept of \"high-leverage product decisions\" — the 5% of choices that determine 95% of your product's trajectory.",
      ebook_content: "",
      ebook_pdf_url: null,
      self_rating_note: "Essential listening for product managers. The frameworks are immediately applicable.",
      final_page_count: 9,
      pass_2_framework_selected: "The Contrarian Take",
      newsletter_stat: "Teams that switched from feature-based to outcome-based roadmaps saw a 3x improvement in customer satisfaction scores within two quarters.",
      newsletter_tip: "Before adding any feature to your roadmap, write down the customer problem it solves and how you'll measure success. If you can't, it doesn't belong there.",
      newsletter_exercise: "Look at your current roadmap. For each item, ask: \"If we shipped this perfectly, what customer behaviour would change?\" Remove anything without a clear answer.",
      status: "published",
      chapters: [
        "The output trap",
        "High-leverage decisions",
        "Outcome-based roadmapping",
        "Saying no to good ideas",
      ],
    },
  },
];

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}hr ${minutes}min`;
  return `${minutes}min`;
}

export function getEpisodeBySlug(slug: string) {
  return episodes.find((e) => e.slug === slug);
}

export function getEpisodesByPodcast(podcastId?: string) {
  if (!podcastId) return episodes;
  return episodes.filter((e) => e.podcast_id === podcastId);
}
