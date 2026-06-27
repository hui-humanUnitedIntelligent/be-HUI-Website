// /api/reviews.js — HUI Website Review API (Supabase)
// GET → nur published; POST → status=pending (Admin muss freigeben)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxztrhvhcxhmunhhkfjd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TABLE = 'website_reviews';

async function supaGet(endpoint) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function supaPost(body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: NUR freigegebene (published) Reviews fuer den Slider ──────────
  if (req.method === 'GET') {
    try {
      const limit = Math.min(parseInt(req.query.limit || '20'), 50);
      // HART auf published — ignoriert jeden anderen query-Parameter
      const data = await supaGet(
        `${TABLE}?status=eq.published&order=created_at.desc&limit=${limit}`
      );
      return res.status(200).json(Array.isArray(data) ? data : []);
    } catch(e) {
      console.error('[reviews GET]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST: Neue Bewertung einreichen → IMMER pending ────────────────────
  if (req.method === 'POST') {
    let name, stars, message, email, page;
    try {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      name    = String(b.name    || '').trim() || 'Anonym';
      message = String(b.message || b.text || '').trim();
      stars   = b.stars ? parseInt(b.stars, 10) : null;
      email   = b.email ? String(b.email).trim() : null;
      page    = b.page  ? String(b.page).trim()  : null;
    } catch(e) { return res.status(400).json({ error: 'Invalid JSON' }); }

    if (!message) return res.status(400).json({ error: 'Nachricht fehlt' });
    if (stars !== null && (stars < 1 || stars > 5)) {
      return res.status(400).json({ error: 'Sterne muss zwischen 1 und 5 liegen' });
    }

    try {
      const result = await supaPost({
        name,
        message,
        stars:  stars || null,
        email:  email || null,
        page:   page  || null,
        source: 'website',
        status: 'pending',   // ← IMMER pending — Admin muss freigeben!
      });
      const id = Array.isArray(result) ? result[0]?.id : result?.id;
      return res.status(201).json({ ok: true, id });
    } catch(e) {
      console.error('[reviews POST]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
