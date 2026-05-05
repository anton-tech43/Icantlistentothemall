// Agent 1 — RSS Parser Test
// Tests RSS parsing against the 5 launch podcast feeds and documents quirks.

const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FEEDS = [
  {
    name: 'Diary of a CEO',
    host: 'Steven Bartlett',
    url: 'https://rss2.flightcast.com/xmsftuzjjykcmqwolaqn6mdn',
    accentColour: '#C4654A',
    formatTag: 'interview',
  },
  {
    name: 'My First Million',
    host: 'Sam Parr & Shaan Puri',
    url: 'https://feeds.megaphone.fm/HS2300184645',
    accentColour: '#C48B2A',
    formatTag: 'interview',
  },
  {
    name: 'The Tim Ferriss Show',
    host: 'Tim Ferriss',
    url: 'https://rss.art19.com/tim-ferriss-show',
    accentColour: '#6B8F71',
    formatTag: 'interview',
  },
  {
    name: 'The Game w/ Alex Hormozi',
    host: 'Alex Hormozi',
    url: 'https://feeds.captivate.fm/the-game-alex-hormozi/',
    accentColour: '#A0522D',
    formatTag: 'solo',
  },
  {
    name: "Lenny's Podcast",
    host: 'Lenny Rachitsky',
    url: 'https://api.substack.com/feed/podcast/10845.rss',
    accentColour: '#5B7B8A',
    formatTag: 'interview',
  },
];

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
});

function parseDuration(raw) {
  if (!raw) return { seconds: null, format: 'missing', source: 'unknown' };

  const str = String(raw).trim();

  // Pure integer seconds
  if (/^\d+$/.test(str)) {
    const seconds = parseInt(str, 10);
    // Heuristic: if > 86400, probably milliseconds
    if (seconds > 86400) {
      return { seconds: Math.round(seconds / 1000), format: 'milliseconds', source: 'parsed' };
    }
    return { seconds, format: 'seconds', source: 'parsed' };
  }

  // HH:MM:SS
  const hmsMatch = str.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hmsMatch) {
    const seconds = parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
    return { seconds, format: 'HH:MM:SS', source: 'parsed' };
  }

  // MM:SS
  const msMatch = str.match(/^(\d+):(\d{2})$/);
  if (msMatch) {
    const seconds = parseInt(msMatch[1]) * 60 + parseInt(msMatch[2]);
    return { seconds, format: 'MM:SS', source: 'parsed' };
  }

  return { seconds: null, format: 'unrecognised: ' + str, source: 'unknown' };
}

function getAudioUrl(item) {
  const sources = [];

  if (item.enclosure && item.enclosure.url) {
    sources.push({ url: item.enclosure.url, type: item.enclosure.type || 'unknown', from: 'enclosure' });
  }

  if (item.mediaContent) {
    const mc = item.mediaContent;
    if (typeof mc === 'string') {
      sources.push({ url: mc, type: 'unknown', from: 'media:content' });
    } else if (mc.$ && mc.$.url) {
      sources.push({ url: mc.$.url, type: mc.$.type || 'unknown', from: 'media:content' });
    }
  }

  return sources;
}

function classifyEpisode(item) {
  const title = (item.title || '').toLowerCase();
  const type = (item.itunesEpisodeType || '').toLowerCase();
  const skipPatterns = ['trailer', 'teaser', 'best of', 'rerun', 'replay', 'bonus'];
  const matchedPattern = skipPatterns.find(p => title.includes(p));

  if (type === 'trailer' || type === 'bonus') {
    return { skip: true, reason: `episodeType: ${type}` };
  }
  if (matchedPattern) {
    return { skip: true, reason: `title contains "${matchedPattern}"` };
  }
  return { skip: false, reason: null };
}

function guidHash(title, pubDate) {
  const input = `${title || ''}|${pubDate || ''}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

async function testFeed(feedConfig) {
  const result = {
    name: feedConfig.name,
    url: feedConfig.url,
    success: false,
    error: null,
    totalEpisodes: 0,
    quirks: {},
    recentEpisodes: [],
    filteredEpisodes: [],
  };

  try {
    console.log(`\nParsing: ${feedConfig.name}...`);
    const feed = await parser.parseURL(feedConfig.url);

    result.success = true;
    result.totalEpisodes = (feed.items || []).length;
    result.feedTitle = feed.title;
    result.feedDescription = (feed.description || '').slice(0, 200);

    const items = feed.items || [];

    // GUID analysis
    const guids = items.map(i => i.guid).filter(Boolean);
    const uniqueGuids = new Set(guids);
    result.quirks.guidPresent = guids.length > 0;
    result.quirks.guidCount = guids.length;
    result.quirks.guidUniqueCount = uniqueGuids.size;
    result.quirks.guidAllUnique = guids.length === uniqueGuids.size;
    result.quirks.guidSamples = guids.slice(0, 3);

    // Duration analysis
    const durations = items.map(i => ({
      raw: i.itunesDuration || i.itunes?.duration,
      parsed: parseDuration(i.itunesDuration || i.itunes?.duration),
    }));
    const durationFormats = [...new Set(durations.map(d => d.parsed.format))];
    result.quirks.durationFormats = durationFormats;
    result.quirks.durationMissingCount = durations.filter(d => d.parsed.format === 'missing').length;
    result.quirks.durationSamples = durations.slice(0, 3).map(d => ({ raw: d.raw, parsed: d.parsed }));

    // Audio URL analysis
    const audioSources = items.slice(0, 5).map(i => getAudioUrl(i));
    const hasEnclosure = audioSources.some(s => s.some(a => a.from === 'enclosure'));
    const hasMediaContent = audioSources.some(s => s.some(a => a.from === 'media:content'));
    result.quirks.audioUrlLocation = [];
    if (hasEnclosure) result.quirks.audioUrlLocation.push('enclosure');
    if (hasMediaContent) result.quirks.audioUrlLocation.push('media:content');
    if (result.quirks.audioUrlLocation.length === 0) result.quirks.audioUrlLocation.push('none found');

    const audioTypes = new Set();
    audioSources.flat().forEach(s => {
      if (s.type) audioTypes.add(s.type);
    });
    result.quirks.audioFormats = [...audioTypes];

    // Bonus/trailer detection
    const classifications = items.map(i => ({
      title: i.title,
      ...classifyEpisode(i),
    }));
    const skippable = classifications.filter(c => c.skip);
    result.quirks.hasBonusTrailer = skippable.length > 0;
    result.quirks.skippableCount = skippable.length;
    result.quirks.skippableExamples = skippable.slice(0, 5).map(s => ({
      title: s.title,
      reason: s.reason,
    }));

    // Encoding check on titles
    const encodingIssues = items.filter(i => {
      const title = i.title || '';
      return /[\uFFFD]|&amp;|&lt;|&gt;|&#\d+;/.test(title);
    });
    result.quirks.encodingIssues = encodingIssues.length > 0;
    result.quirks.encodingIssueExamples = encodingIssues.slice(0, 3).map(i => i.title);

    // Feed pagination check
    result.quirks.hasPagination = !!(feed['atom:link'] || feed.feedUrl);

    // 5 most recent episodes
    const recent = items.slice(0, 5);
    result.recentEpisodes = recent.map(item => {
      const duration = parseDuration(item.itunesDuration || item.itunes?.duration);
      const audioUrls = getAudioUrl(item);
      const classification = classifyEpisode(item);

      return {
        title: item.title,
        guid: item.guid || null,
        guidHash: guidHash(item.title, item.pubDate),
        pubDate: item.pubDate || null,
        durationRaw: item.itunesDuration || item.itunes?.duration || null,
        durationSeconds: duration.seconds,
        durationFormatted: duration.seconds
          ? `${Math.floor(duration.seconds / 60)}m ${duration.seconds % 60}s`
          : 'unknown',
        audioUrl: audioUrls.length > 0 ? audioUrls[0].url : null,
        audioUrlSource: audioUrls.length > 0 ? audioUrls[0].from : 'none',
        audioType: audioUrls.length > 0 ? audioUrls[0].type : 'none',
        episodeType: item.itunesEpisodeType || 'full',
        wouldSkip: classification.skip,
        skipReason: classification.reason,
        meetsMinDuration: duration.seconds ? duration.seconds >= 35 * 60 : 'unknown',
      };
    });

    // Count of episodes that pass the filter
    const passing = items.filter(item => {
      const d = parseDuration(item.itunesDuration || item.itunes?.duration);
      const c = classifyEpisode(item);
      return !c.skip && (d.seconds === null || d.seconds >= 35 * 60);
    });
    result.filteredEpisodes = {
      totalPassing: passing.length,
      totalSkippedByTitle: classifications.filter(c => c.skip).length,
      totalUnder35Min: items.filter(i => {
        const d = parseDuration(i.itunesDuration || i.itunes?.duration);
        return d.seconds !== null && d.seconds < 35 * 60;
      }).length,
      totalDurationUnknown: durations.filter(d => d.parsed.seconds === null).length,
    };

    console.log(`  OK — ${result.totalEpisodes} episodes found, ${result.filteredEpisodes.totalPassing} pass filter`);

  } catch (err) {
    result.error = err.message;
    console.error(`  FAILED — ${err.message}`);
  }

  return result;
}

async function main() {
  console.log('=== icantlistentothemall — RSS Parser Test ===\n');
  console.log(`Testing ${FEEDS.length} podcast feeds...\n`);

  const results = [];

  for (const feed of FEEDS) {
    const result = await testFeed(feed);
    results.push(result);
  }

  // Save episodes.json
  const episodesPath = path.join(__dirname, '..', '..', 'episodes.json');
  const episodesData = results.map(r => ({
    podcast: r.name,
    feedUrl: r.url,
    recentEpisodes: r.recentEpisodes,
  }));
  fs.writeFileSync(episodesPath, JSON.stringify(episodesData, null, 2));
  console.log(`\nSaved episodes.json`);

  // Generate feed-quirks.md
  const quirksPath = path.join(__dirname, '..', '..', 'feed-quirks.md');
  let md = '# Feed Quirks — RSS Parser Test Results\n\n';
  md += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
  md += `**Agent:** Agent 1 (RSS Monitor & Audio Acquisition)\n\n`;
  md += '---\n\n';

  // Summary table
  md += '## Summary\n\n';
  md += '| Feed | Episodes | GUID? | GUID Unique? | Duration Format | Audio Location | Bonus/Trailer? | Encoding Issues? |\n';
  md += '|---|---|---|---|---|---|---|---|\n';
  for (const r of results) {
    if (!r.success) {
      md += `| ${r.name} | FAILED | - | - | - | - | - | - |\n`;
      continue;
    }
    md += `| ${r.name} | ${r.totalEpisodes} | ${r.quirks.guidPresent ? 'Yes' : 'No'} | ${r.quirks.guidAllUnique ? 'Yes' : 'No (' + r.quirks.guidUniqueCount + '/' + r.quirks.guidCount + ')'} | ${r.quirks.durationFormats.join(', ')} | ${r.quirks.audioUrlLocation.join(', ')} | ${r.quirks.hasBonusTrailer ? 'Yes (' + r.quirks.skippableCount + ')' : 'No'} | ${r.quirks.encodingIssues ? 'Yes' : 'No'} |\n`;
  }

  // Filter summary
  md += '\n## Filter Results\n\n';
  md += '| Feed | Pass Filter | Skipped (Title) | Under 35min | Duration Unknown |\n';
  md += '|---|---|---|---|---|\n';
  for (const r of results) {
    if (!r.success) {
      md += `| ${r.name} | FAILED | - | - | - |\n`;
      continue;
    }
    const f = r.filteredEpisodes;
    md += `| ${r.name} | ${f.totalPassing} | ${f.totalSkippedByTitle} | ${f.totalUnder35Min} | ${f.totalDurationUnknown} |\n`;
  }

  // Per-feed details
  for (const r of results) {
    md += `\n---\n\n## ${r.name}\n\n`;

    if (!r.success) {
      md += `**Status:** FAILED\n**Error:** ${r.error}\n\n`;
      continue;
    }

    md += `**Feed URL:** \`${r.url}\`\n`;
    md += `**Feed Title:** ${r.feedTitle}\n`;
    md += `**Total Episodes in Feed:** ${r.totalEpisodes}\n\n`;

    md += '### Quirks\n\n';
    md += `- **GUID present:** ${r.quirks.guidPresent ? 'Yes' : 'No'}\n`;
    md += `- **GUID unique:** ${r.quirks.guidAllUnique ? 'Yes (all unique)' : 'No — ' + r.quirks.guidUniqueCount + '/' + r.quirks.guidCount + ' unique'}\n`;
    md += `- **GUID samples:** ${r.quirks.guidSamples.map(g => '`' + g + '`').join(', ')}\n`;
    md += `- **Duration format(s):** ${r.quirks.durationFormats.join(', ')}\n`;
    md += `- **Duration missing count:** ${r.quirks.durationMissingCount}\n`;
    md += `- **Audio URL location:** ${r.quirks.audioUrlLocation.join(', ')}\n`;
    md += `- **Audio formats:** ${r.quirks.audioFormats.join(', ')}\n`;
    md += `- **Has bonus/trailer episodes:** ${r.quirks.hasBonusTrailer ? 'Yes (' + r.quirks.skippableCount + ')' : 'No'}\n`;
    if (r.quirks.skippableExamples.length > 0) {
      md += '  - Examples:\n';
      for (const ex of r.quirks.skippableExamples) {
        md += `    - "${ex.title}" — ${ex.reason}\n`;
      }
    }
    md += `- **Encoding issues:** ${r.quirks.encodingIssues ? 'Yes' : 'No'}\n`;
    if (r.quirks.encodingIssueExamples.length > 0) {
      md += `  - Examples: ${r.quirks.encodingIssueExamples.join(', ')}\n`;
    }

    md += '\n### 5 Most Recent Episodes\n\n';
    md += '| # | Title | Date | Duration | Audio? | Would Skip? |\n';
    md += '|---|---|---|---|---|---|\n';
    for (let i = 0; i < r.recentEpisodes.length; i++) {
      const ep = r.recentEpisodes[i];
      const date = ep.pubDate ? new Date(ep.pubDate).toISOString().split('T')[0] : 'unknown';
      md += `| ${i + 1} | ${(ep.title || '').slice(0, 60)}${(ep.title || '').length > 60 ? '...' : ''} | ${date} | ${ep.durationFormatted} | ${ep.audioUrl ? 'Yes (' + ep.audioUrlSource + ')' : 'No'} | ${ep.wouldSkip ? 'Yes: ' + ep.skipReason : 'No'} |\n`;
    }
  }

  // Issues section
  md += '\n---\n\n## Issues & Notes\n\n';
  const failedFeeds = results.filter(r => !r.success);
  if (failedFeeds.length > 0) {
    md += '### Failed Feeds\n\n';
    for (const f of failedFeeds) {
      md += `- **${f.name}** (${f.url}): ${f.error}\n`;
    }
    md += '\n';
  }

  const noAudio = results.filter(r => r.success && r.recentEpisodes.some(e => !e.audioUrl));
  if (noAudio.length > 0) {
    md += '### Episodes Missing Audio URLs\n\n';
    for (const r of noAudio) {
      const missing = r.recentEpisodes.filter(e => !e.audioUrl);
      for (const ep of missing) {
        md += `- **${r.name}** — "${ep.title}": no audio URL found\n`;
      }
    }
    md += '\n';
  }

  fs.writeFileSync(quirksPath, md);
  console.log(`Saved feed-quirks.md`);

  // Print summary
  console.log('\n=== RESULTS ===\n');
  for (const r of results) {
    if (r.success) {
      console.log(`✓ ${r.name}: ${r.totalEpisodes} episodes, ${r.filteredEpisodes.totalPassing} pass filter`);
    } else {
      console.log(`✗ ${r.name}: FAILED — ${r.error}`);
    }
  }

  const allPassed = results.every(r => r.success);
  console.log(`\n${allPassed ? 'All feeds parsed successfully.' : 'Some feeds failed — see feed-quirks.md for details.'}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
