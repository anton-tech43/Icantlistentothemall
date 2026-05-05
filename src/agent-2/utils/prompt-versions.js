// Agent 2: Prompt versioning — manages prompt storage, retrieval, and versioning
const { supabase } = require('./supabase');

async function getActivePrompt(promptName) {
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('id, prompt_name, version, prompt_text')
    .eq('prompt_name', promptName)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`No active prompt found for "${promptName}": ${error?.message}`);
  }
  return data;
}

async function createPromptVersion({ promptName, promptText, changeNotes, setActive = false }) {
  const { data: existing } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('prompt_name', promptName)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

  if (setActive) {
    await supabase
      .from('prompt_versions')
      .update({ is_active: false })
      .eq('prompt_name', promptName)
      .eq('is_active', true);
  }

  const { data, error } = await supabase.from('prompt_versions').insert({
    prompt_name: promptName,
    version: nextVersion,
    prompt_text: promptText,
    change_notes: changeNotes,
    is_active: setActive,
  }).select().single();

  if (error) {
    throw new Error(`Failed to create prompt version for "${promptName}": ${error.message}`);
  }
  return data;
}

async function listPromptVersions(promptName) {
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_name', promptName)
    .order('version', { ascending: false });

  if (error) throw new Error(`Failed to list versions for "${promptName}": ${error.message}`);
  return data;
}

async function setActiveVersion(promptName, version) {
  await supabase
    .from('prompt_versions')
    .update({ is_active: false })
    .eq('prompt_name', promptName);

  const { data, error } = await supabase
    .from('prompt_versions')
    .update({ is_active: true })
    .eq('prompt_name', promptName)
    .eq('version', version)
    .select()
    .single();

  if (error) throw new Error(`Failed to set active version: ${error.message}`);
  return data;
}

module.exports = { getActivePrompt, createPromptVersion, listPromptVersions, setActiveVersion };
