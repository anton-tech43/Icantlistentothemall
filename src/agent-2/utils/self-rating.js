// Agent 2: Template-based self-rating notes — no API call, tied to framework + page count

const RATING_TEMPLATES = {
  'The Big Idea': {
    high: 'This was a focused conversation. The ebook captures the core framework and its practical applications.',
    low: 'This episode had one central idea. The ebook distils it into a concise, actionable format.',
  },
  'The Playbook': {
    high: 'A tactical episode. The ebook distils the specific strategies into a step-by-step format.',
    low: 'A tactical episode with several concrete strategies. The ebook captures the most actionable ones.',
  },
  "The Founder's Lesson": {
    high: 'A story-driven conversation with clear turning points. The ebook extracts the transferable lessons.',
    low: "A founder's journey with lessons embedded in the narrative. The ebook pulls out the key principles.",
  },
  'The Contrarian Take': {
    high: 'This episode challenged conventional thinking. The ebook lays out the argument and the alternative clearly.',
    low: 'A contrarian perspective with specific evidence behind it. The ebook presents both the critique and the alternative.',
  },
  'Three Things Worth Knowing': {
    high: 'This conversation covered a lot of ground. We picked the three ideas most worth your time. Each chapter stands on its own.',
    low: 'This conversation covered a lot of ground. We picked the three ideas most worth your time. Each chapter stands on its own.',
  },
};

function generateSelfRatingNote(framework, pageCount) {
  const templates = RATING_TEMPLATES[framework];
  if (!templates) {
    return 'This ebook captures the key insights from the episode in a structured, readable format.';
  }
  return pageCount >= 7 ? templates.high : templates.low;
}

module.exports = { generateSelfRatingNote };
