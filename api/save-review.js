// /api/save-review.js — speichert Review direkt in Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxztrhvhcxhmunhhkfjd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let name, stars, message, email, page;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    name    = String(body.name    || '').trim() || 'Anonym';
    message = String(body.message || body.text || '').trim();
    stars   = body.stars ? parseInt(body.stars, 10) : null;
    email   = body.email ? String(body.email).trim() : null;
    page    = body.page  ? String(body.page).trim()  : null;
  } catch(e) { return res.status(400).json({ error: 'Invalid JSON' }); }

  if (!message) return res.status(400).json({ error: 'Nachricht fehlt' });

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/website_reviews`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
      },
      body: JSON.stringify({ name, message, stars, email, page, source: 'website', status: 'published' }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: JSON.stringify(data) });
    return res.status(201).json({ ok: true, id: Array.isArray(data) ? data[0]?.id : data?.id });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
