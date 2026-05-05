// Weekly episode selection CLI — list, pick, unpick, status
//
// Usage:
//   node scripts/select-episode.js list                         — show episodes currently queued for processing
//   node scripts/select-episode.js browse [podcast-name]        — browse skipped back catalogue (optionally filter)
//   node scripts/select-episode.js pick <id-or-title-substring> — move an episode from skipped to queued
//   node scripts/select-episode.js unpick <id-or-title-substr>  — move an episode back to skipped
//   node scripts/select-episode.js status                       — show full pipeline status breakdown

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function fmtRow(item) {
  const ep = item.episodes || item;
  const mins = Math.round((ep.duration_seconds || 0) / 60);
  const date = (ep.published_at || '').substring(0, 10);
  const podcast = (ep.podcasts?.name || 'Unknown').padEnd(25);
  const durStr = `${mins}min`.padStart(6);
  return `  ${date}  ${durStr}  ${podcast}  ${ep.title?.substring(0, 80)}`;
}

async function cmdList() {
  const { data } = await supabase
    .from('processing_queue')
    .select('episode_id, status, current_step, episodes(title, duration_seconds, published_at, podcasts(name))')
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: true });

  console.log(`\n${data.length} episodes in active queue:\n`);
  console.log('  date        length  podcast                    title');
  console.log('  ' + '-'.repeat(100));
  data.forEach((item) => {
    const statusTag = item.status === 'processing' ? ` [${item.current_step}]` : '';
    console.log(fmtRow(item) + statusTag);
  });
}

async function cmdBrowse(filter) {
  // Resolve podcast_id if filter is provided — do the filtering at the DB level
  let podcastIds = null;
  if (filter) {
    const { data: podcasts } = await supabase
      .from('podcasts')
      .select('id, name')
      .ilike('name', `%${filter}%`);

    if (!podcasts || podcasts.length === 0) {
      console.log(`\nNo podcasts match "${filter}". Try: Diary, Million, Ferriss, Hormozi, Lenny`);
      return;
    }
    podcastIds = podcasts.map((p) => p.id);
  }

  let query = supabase
    .from('processing_queue')
    .select('episode_id, episodes!inner(title, duration_seconds, published_at, podcast_id, podcasts(name))')
    .eq('status', 'skipped');

  if (podcastIds) {
    query = query.in('episodes.podcast_id', podcastIds);
  }

  const { data } = await query
    .order('published_at', { ascending: false, referencedTable: 'episodes' })
    .limit(50);

  console.log(`\n${data.length} most-recent skipped episodes${filter ? ` — filtered by "${filter}"` : ''}:\n`);
  console.log('  date        length  podcast                    title');
  console.log('  ' + '-'.repeat(100));
  data.forEach((item) => console.log(fmtRow(item)));
  console.log('\nUse `node scripts/select-episode.js pick <id-or-title-substring>` to queue one for processing.');
}

async function findEpisode(idOrTitle, currentStatus) {
  // Try exact ID match first
  if (/^[0-9a-f-]{36}$/i.test(idOrTitle)) {
    const { data } = await supabase
      .from('processing_queue')
      .select('*, episodes(title, podcasts(name))')
      .eq('episode_id', idOrTitle)
      .eq('status', currentStatus)
      .single();
    return data;
  }

  // Otherwise, substring match on title
  const { data } = await supabase
    .from('processing_queue')
    .select('*, episodes!inner(title, podcasts(name))')
    .eq('status', currentStatus)
    .ilike('episodes.title', `%${idOrTitle}%`);

  if (!data || data.length === 0) return null;
  if (data.length === 1) return data[0];

  console.log(`\nAmbiguous — ${data.length} matches found for "${idOrTitle}":\n`);
  data.forEach((item) => console.log(`  ${item.episode_id} — [${item.episodes?.podcasts?.name}] ${item.episodes?.title}`));
  console.log('\nRun the command again with the full episode ID instead.');
  return null;
}

async function cmdPick(idOrTitle) {
  if (!idOrTitle) {
    console.log('Usage: node scripts/select-episode.js pick <episode-id-or-title-substring>');
    return;
  }

  const item = await findEpisode(idOrTitle, 'skipped');
  if (!item) {
    console.log(`No skipped episode found matching "${idOrTitle}".`);
    return;
  }

  await supabase
    .from('processing_queue')
    .update({ status: 'queued', error_log: null })
    .eq('episode_id', item.episode_id);

  await supabase
    .from('episodes')
    .update({ status: 'queued', skip_reason: null })
    .eq('id', item.episode_id);

  console.log(`\nQueued: [${item.episodes?.podcasts?.name}] ${item.episodes?.title}`);
  console.log(`  episode_id: ${item.episode_id}`);
  console.log('\nThe next processing cycle will pick it up.');
}

async function cmdUnpick(idOrTitle) {
  if (!idOrTitle) {
    console.log('Usage: node scripts/select-episode.js unpick <episode-id-or-title-substring>');
    return;
  }

  const item = await findEpisode(idOrTitle, 'queued');
  if (!item) {
    console.log(`No queued episode found matching "${idOrTitle}".`);
    return;
  }

  await supabase
    .from('processing_queue')
    .update({ status: 'skipped', error_log: 'unpicked — manually removed from queue' })
    .eq('episode_id', item.episode_id);

  await supabase
    .from('episodes')
    .update({ status: 'skipped', skip_reason: 'manually_unpicked' })
    .eq('id', item.episode_id);

  console.log(`\nUnqueued: [${item.episodes?.podcasts?.name}] ${item.episodes?.title}`);
}

async function cmdStatus() {
  const statuses = ['queued', 'processing', 'complete', 'failed', 'skipped', 'waiting_for_service', 'cost_exceeded'];
  const counts = {};
  for (const status of statuses) {
    const { count } = await supabase
      .from('processing_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    if (count > 0) counts[status] = count;
  }

  console.log('\nPipeline status breakdown:\n');
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => console.log(`  ${status.padEnd(20)} ${count}`));

  // Weekly cost
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const { data: costs } = await supabase
    .from('cost_tracking')
    .select('cost_usd')
    .gte('created_at', weekStart.toISOString());
  const weekCost = costs.reduce((sum, r) => sum + parseFloat(r.cost_usd), 0);
  console.log(`\nWeekly cost so far: $${weekCost.toFixed(2)} / $30 cap`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case 'list':
      await cmdList();
      break;
    case 'browse':
      await cmdBrowse(args[0]);
      break;
    case 'pick':
      await cmdPick(args.join(' '));
      break;
    case 'unpick':
      await cmdUnpick(args.join(' '));
      break;
    case 'status':
      await cmdStatus();
      break;
    default:
      console.log(`Usage:
  node scripts/select-episode.js list                          Show currently queued/processing episodes
  node scripts/select-episode.js browse [podcast-name]         Browse skipped back catalogue
  node scripts/select-episode.js pick <id-or-title-substring>  Move an episode from skipped to queued
  node scripts/select-episode.js unpick <id-or-title-substring> Move a queued episode back to skipped
  node scripts/select-episode.js status                        Show pipeline status breakdown + weekly cost`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
