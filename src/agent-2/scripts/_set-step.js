// Agent 2: shared helper — update processing_queue.current_step + queue_status + episodes.status atomically.
const { supabase } = require('../utils/supabase');

async function setStep(episodeId, queueStatus, currentStep, episodeStatus) {
  await supabase
    .from('processing_queue')
    .update({ status: queueStatus, current_step: currentStep })
    .eq('episode_id', episodeId);

  if (episodeStatus) {
    await supabase
      .from('episodes')
      .update({ status: episodeStatus })
      .eq('id', episodeId);
  }
}

module.exports = { setStep };
