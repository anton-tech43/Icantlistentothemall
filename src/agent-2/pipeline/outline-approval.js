// Agent 2: Outline approval API endpoints — hit by email links
const { supabase } = require('../utils/supabase');

async function approveOutline(episodeId) {
  await supabase
    .from('processed_content')
    .update({
      pass_2_outline_approved: true,
      pass_2_outline_edited: false,
    })
    .eq('episode_id', episodeId);

  await supabase
    .from('processing_queue')
    .update({ status: 'processing', current_step: 'pass_3' })
    .eq('episode_id', episodeId);

  await supabase
    .from('episodes')
    .update({ status: 'pass_3' })
    .eq('id', episodeId);

  return { approved: true };
}

async function flagOutline(episodeId) {
  await supabase
    .from('processed_content')
    .update({
      pass_2_outline_approved: false,
    })
    .eq('episode_id', episodeId);

  await supabase
    .from('processing_queue')
    .update({ status: 'processing', current_step: 'pass_2_flagged' })
    .eq('episode_id', episodeId);

  return { flagged: true };
}

async function isOutlineApproved(episodeId) {
  const { data } = await supabase
    .from('processed_content')
    .select('pass_2_outline_approved')
    .eq('episode_id', episodeId)
    .single();

  return data?.pass_2_outline_approved === true;
}

function setupApprovalRoutes(app) {
  app.get('/api/outline/approve/:episodeId', async (req, res) => {
    try {
      await approveOutline(req.params.episodeId);
      res.send('<html><body><h1>Outline approved.</h1><p>Pass 3 will start automatically on the next pipeline cycle.</p></body></html>');
    } catch (err) {
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  app.get('/api/outline/flag/:episodeId', async (req, res) => {
    try {
      await flagOutline(req.params.episodeId);
      res.send('<html><body><h1>Outline flagged for review.</h1><p>Processing is paused. Review and update manually.</p></body></html>');
    } catch (err) {
      res.status(500).send(`Error: ${err.message}`);
    }
  });
}

module.exports = { approveOutline, flagOutline, isOutlineApproved, setupApprovalRoutes };
