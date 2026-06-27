// /api/get-reviews.js — liest published website_reviews aus Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxztrhvhcxhmunhhkfjd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/website_reviews?status=eq.published&order=created_at.desc&limit=200`,
      { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY } }
    );
    const data = await r.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
