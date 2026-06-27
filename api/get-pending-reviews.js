// /api/get-pending-reviews.js — liest pending reviews aus Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxztrhvhcxhmunhhkfjd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-hui-secret');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/website_reviews?status=eq.pending&order=created_at.desc&limit=200`,
      { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY } }
    );
    const data = await r.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
