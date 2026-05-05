// Agent 1 — RSS feed parser
// Parses podcast RSS feeds and returns normalized episode data.

const Parser = require('rss-parser');

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'],
      ['itunes:episode', 'itunesEpisode'],
      ['itunes:episodeType', 'itunesEpisodeType'],
      ['media:content', 'mediaContent'],
    ],
  },
  timeout: 30000,
  headers: {
    'User-Agent': 'icantlistentothemall/1.0 (podcast-to-ebook pipeline)',
  },
});

function parseDuration(raw) {
  if (!raw) return { seconds: null, source: 'unknown' };

  const str = String(raw).trim();

  if (/^\d+$/.test(str)) {
    const val = parseInt(str, 10);
    if (val > 86400) return { seconds: Math.round(val / 1000), source: 'parsed' };
    return { seconds: val, source: 'parsed' };
  }

  const hms = str.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hms) {
    return { seconds: parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3]), source: 'parsed' };
  }

  const ms = str.match(/^(\d+):(\d{2})$/);
  if (ms) {
    return { seconds: parseInt(ms[1]) * 60 + parseInt(ms[2]), source: 'parsed' };
  }

  return { seconds: null, source: 'unknown' };
}

function extractAudioUrl(item) {
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  if (item.mediaContent) {
    const mc = item.mediaContent;
    if (typeof mc === 'string') return mc;
    if (mc.$ && mc.$.url) return mc.$.url;
  }

  return null;
}

function normalizeEpisode(item) {
  const duration = parseDuration(item.itunesDuration || (item.itunes && item.itunes.duration));
  const audioUrl = extractAudioUrl(item);

  return {
    guid: item.guid || null,
    title: item.title || 'Untitled',
    audioUrl,
    durationSeconds: duration.seconds,
    durationSource: duration.source,
    publishedAt: item.pubDate || null,
    episodeType: (item.itunesEpisodeType || 'full').toLowerCase(),
  };
}

async function parseFeed(feedUrl) {
  const feed = await parser.parseURL(feedUrl);
  const episodes = (feed.items || []).map(normalizeEpisode);

  return {
    title: feed.title,
    description: feed.description,
    episodes,
  };
}

module.exports = {
  parseFeed,
  parseDuration,
  extractAudioUrl,
  normalizeEpisode,
};
