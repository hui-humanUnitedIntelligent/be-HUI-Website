// /api/reviews.js — HUI Website Review API
// Supabase-basiert: POST=submit, GET=list published
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxztrhvhcxhmunhhkfjd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TABLE = 'website_reviews';

async function supaFetch(method, endpoint, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok && r.status !== 204) {
    const err = await r.text();
    throw new Error(err);
  }
  if (r.status === 204 || method === 'DELETE' || method === 'PATCH') return { ok: true };
  return r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — alle veroeffentlichten Reviews
  if (req.method === 'GET') {
    try {
      const data = await supaFetch('GET',
        `${TABLE}?status=eq.published&order=created_at.desc&limit=200`);
      return res.status(200).json(Array.isArray(data) ? data : []);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — neues Review einreichen
  if (req.method === 'POST') {
    let name, stars, message, email, page;
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      name    = String(body.name    || '').trim() || 'Anonym';
      message = String(body.message || body.text || '').trim();
      stars   = body.stars ? parseInt(body.stars, 10) : null;
      email   = body.email ? String(body.email).trim() : null;
      page    = body.page  ? String(body.page).trim()  : null;
    } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    if (!message) return res.status(400).json({ error: 'Nachricht fehlt' });
    if (stars && (stars < 1 || stars > 5)) return res.status(400).json({ error: 'Sterne 1-5' });
    try {
      const result = await supaFetch('POST', TABLE, {
        name, message, stars: stars || null, email, page,
        source: 'website', status: 'published',
      });
      const id = Array.isArray(result) ? result[0]?.id : result?.id;
      return res.status(201).json({ ok: true, id });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
