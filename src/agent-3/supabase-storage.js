// Agent 3: Supabase Storage — upload PDF and return public URL
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BUCKET_NAME = 'ebooks';

let supabase = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Slugify a string for use in file paths.
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/**
 * Ensure the ebooks storage bucket exists (idempotent).
 */
async function ensureBucket() {
  const sb = getSupabase();
  const { error } = await sb.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB max per PDF
  });

  // Ignore "already exists" error
  if (error && !error.message.includes('already exists')) {
    throw new Error(`Failed to create storage bucket: ${error.message}`);
  }
}

/**
 * Upload a PDF buffer to Supabase Storage.
 * Overwrites existing file at the same path.
 *
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @param {string} podcastName - Podcast name (for folder path)
 * @param {string} episodeTitle - Episode title (for filename)
 * @returns {Promise<string>} Public URL to the uploaded PDF
 */
async function uploadPdf(pdfBuffer, podcastName, episodeTitle) {
  await ensureBucket();

  const sb = getSupabase();
  const podcastSlug = slugify(podcastName);
  const episodeSlug = slugify(episodeTitle);
  const filePath = `${podcastSlug}/${episodeSlug}.pdf`;

  const { error } = await sb.storage
    .from(BUCKET_NAME)
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  // Get the public URL
  const { data } = sb.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

module.exports = { uploadPdf, slugify, ensureBucket };
