// Agent 1 — Podcast subscription management
// Adds/removes podcasts and stores metadata including podcast_context.

const db = require('./db');

const LAUNCH_PODCASTS = [
  {
    name: 'Diary of a CEO',
    rssFeedUrl: 'https://rss2.flightcast.com/xmsftuzjjykcmqwolaqn6mdn',
    accentColour: '#C4654A',
    formatTag: 'interview',
    podcastContext: `PODCAST CONTEXT: This is Diary of a CEO, hosted by Steven Bartlett. Episodes are long-form interviews (typically 90-150 minutes). Bartlett asks deep personal questions and gives guests space for extended answers. Guests often tell long stories from their lives. The most valuable insights are usually embedded inside these stories rather than stated directly — extract the lesson behind each story, not the story itself. Bartlett frequently summarises what the guest said in his own words before moving on — these restatements rarely add new information and can be skipped. The first 5-10 minutes are often personal catch-up and can be low-substance. Episodes sometimes have a "final five" rapid-fire question segment at the end that produces short, quotable answers.`,
  },
  {
    name: 'My First Million',
    rssFeedUrl: 'https://feeds.megaphone.fm/HS2300184645',
    accentColour: '#C48B2A',
    formatTag: 'interview',
    podcastContext: `PODCAST CONTEXT: This is My First Million, hosted by Sam Parr and Shaan Puri. Episodes feature two hosts riffing on business ideas, trends, and strategies. The format is fast-paced with frequent tangents, jokes, and asides. Valuable insights are mixed in with casual banter — separate them carefully. The hosts often brainstorm business ideas in real-time, some of which are half-baked and some genuinely insightful. Focus on extracting the ideas with specific market data or validated reasoning behind them, not every spontaneous thought. When guests appear, episodes are more focused. The hosts frequently reference specific revenue numbers, growth metrics, and business models — these specific figures are high-value content to extract.`,
  },
  {
    name: 'The Tim Ferriss Show',
    rssFeedUrl: 'https://rss.art19.com/tim-ferriss-show',
    accentColour: '#6B8F71',
    formatTag: 'interview',
    podcastContext: `PODCAST CONTEXT: This is The Tim Ferriss Show. Episodes are long-form interviews (typically 90-180 minutes) with a structured approach. Ferriss often asks guests about their routines, habits, and decision-making frameworks. Look for: specific routines described step by step, book recommendations with context on why they matter, frameworks for making decisions, and lessons from specific failures. Ferriss sometimes reads prepared questions and the guest's answer is the substance — the questions themselves can be skipped. Some episodes are "5-Bullet Friday" style compilations that are shorter and more fragmented. Ferriss frequently asks "what would you put on a billboard?" or similar synthesising questions — the answers are often the most quotable and insightful moments.`,
  },
  {
    name: 'The Game w/ Alex Hormozi',
    rssFeedUrl: 'https://feeds.captivate.fm/the-game-alex-hormozi/',
    accentColour: '#A0522D',
    formatTag: 'solo',
    podcastContext: `PODCAST CONTEXT: This is The Game with Alex Hormozi. Episodes are often solo monologues or teachings where Hormozi walks through a specific business concept in detail. He is direct, uses specific numbers and examples from his own businesses, and tends to structure his thinking clearly. The content is highly tactical and framework-heavy. Extract the specific frameworks, step-by-step processes, and exact numbers he references. Hormozi frequently repeats his core points multiple times with different examples — extract the point once with the best example, don't duplicate. He often opens with a bold claim and then spends the episode backing it up — that opening claim is usually the core insight to capture.`,
  },
  {
    name: "Lenny's Podcast",
    rssFeedUrl: 'https://api.substack.com/feed/podcast/10845.rss',
    accentColour: '#5B7B8A',
    formatTag: 'interview',
    podcastContext: `PODCAST CONTEXT: This is Lenny's Podcast, hosted by Lenny Rachitsky. Focused on product management, growth, and startups. Episodes are well-structured interviews with product leaders, founders, and operators. Guests tend to share specific frameworks, processes, and metrics from their work. The content skews tactical and specific rather than inspirational. Extract: named frameworks, specific metrics and benchmarks, step-by-step processes, and hiring/team advice. Lenny asks good follow-up questions that often elicit more specific answers — the follow-up answers are often higher value than the initial response. Some episodes are "listener question" format which are shorter and more fragmented.`,
  },
];

function seedLaunchPodcasts() {
  const existing = db.getActivePodcasts();
  const existingNames = new Set(existing.map(p => p.name));
  let added = 0;

  for (const podcast of LAUNCH_PODCASTS) {
    if (existingNames.has(podcast.name)) {
      console.log(`  Already exists: ${podcast.name}`);
      continue;
    }
    const id = db.insertPodcast(podcast);
    console.log(`  Added: ${podcast.name} (${id})`);
    added++;
  }

  return added;
}

function addPodcast({ name, rssFeedUrl, accentColour, formatTag, podcastContext }) {
  return db.insertPodcast({ name, rssFeedUrl, accentColour, formatTag, podcastContext });
}

function removePodcast(id) {
  db.deactivatePodcast(id);
}

function listPodcasts() {
  return db.getActivePodcasts();
}

module.exports = {
  LAUNCH_PODCASTS,
  seedLaunchPodcasts,
  addPodcast,
  removePodcast,
  listPodcasts,
};
