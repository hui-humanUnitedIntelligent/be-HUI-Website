// /api/publish-review.js
// GET  ?id=XXX  → 1-Klick aus E-Mail — HTML-Seite zurück
// POST { id }   → Admin Dashboard

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GH_TOKEN = process.env.GH_TOKEN;
  const REPO     = 'hui-humanUnitedIntelligent/be-HUI-Website';
  const BRANCH   = 'main';

  if (!GH_TOKEN) {
    if (req.method === 'GET') return res.status(500).send(renderPage('error', '❌ Server-Konfigurationsfehler: GH_TOKEN fehlt.'));
    return res.status(500).json({ error: 'GH_TOKEN missing' });
  }

  // ID aus GET-Query oder POST-Body
  let id = '';
  if (req.method === 'GET') {
    id = String((req.query || {}).id || '').trim();
    if (!id) return res.status(400).send(renderPage('error', '❌ Keine Review-ID angegeben.'));
  } else if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      id = String(body.id || '').trim();
    } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    if (!id) return res.status(400).json({ error: 'Missing id' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  async function fetchFile(path) {
    const r = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${GH_TOKEN}`, 'User-Agent': 'HUI-Bot', Accept: 'application/vnd.github+json' } }
    );
    if (!r.ok) return { data: [], sha: '' };
    const d = await r.json();
    return { data: JSON.parse(Buffer.from(d.content, 'base64').toString('utf-8')), sha: d.sha };
  }

  async function writeFile(path, data, sha, message) {
    const body = {
      message,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;
    const r = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'HUI-Bot', Accept: 'application/vnd.github+json' }, body: JSON.stringify(body) }
    );
    if (!r.ok) throw new Error(`GitHub write failed: ${r.status}`);
  }

  try {
    const { data: pending, sha: pendingSHA } = await fetchFile('data/pending_reviews.json');
    const arr     = Array.isArray(pending) ? pending : [];
    const review  = arr.find(r => r.id === id);

    if (!review) {
      if (req.method === 'GET') return res.status(404).send(renderPage('warn', '⚠️ Bewertung nicht gefunden oder bereits veröffentlicht.'));
      return res.status(404).json({ error: 'Review not found or already published' });
    }

    const { data: published, sha: publishedSHA } = await fetchFile('data/reviews.json');
    const pubArr = Array.isArray(published) ? published : [];
    pubArr.push({ id: review.id, name: review.name, stars: review.stars, message: review.message, date: review.date, approvedAt: new Date().toISOString() });

    await writeFile('data/reviews.json',         pubArr,              publishedSHA, `feat: publish review by ${review.name}`);
    await writeFile('data/pending_reviews.json', arr.filter(r => r.id !== id), pendingSHA,  `chore: remove pending review ${id}`);

    if (req.method === 'GET') {
      return res.status(200).send(renderPage('success',
        `✅ Bewertung von <strong>${escHtml(review.name)}</strong> wurde veröffentlicht!`,
        review
      ));
    }
    return res.status(200).json({ success: true, review: { name: review.name, stars: review.stars } });

  } catch (e) {
    console.error('[publish-review] Error:', e.message);
    if (req.method === 'GET') return res.status(500).send(renderPage('error', `❌ Fehler: ${escHtml(e.message)}`));
    return res.status(500).json({ error: e.message });
  }
};

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function starsStr(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

function renderPage(type, message, review = null) {
  const colors = { success: '#1ed8c8', error: '#c0392b', warn: '#e67e22' };
  const color  = colors[type] || '#1ed8c8';
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>HUI – Bewertung</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
    .card{background:#fff;border-radius:20px;padding:2.8rem 2.5rem;max-width:520px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.12)}
    .icon{font-size:3rem;margin-bottom:.8rem}
    h2{color:${color};font-size:1.4rem;margin-bottom:1rem;line-height:1.4}
    .stars{color:#F59E0B;font-size:1.8rem;margin:.5rem 0 .8rem;letter-spacing:3px}
    blockquote{color:#555;font-style:italic;font-size:.95rem;border-left:3px solid ${color};padding:.6rem 0 .6rem 1rem;margin:0 auto 1.2rem;text-align:left;max-width:400px}
    .meta{color:#aaa;font-size:.8rem;margin-bottom:2rem}
    .btn{display:inline-block;background:${color};color:#fff;padding:.9rem 2.5rem;border-radius:50px;text-decoration:none;font-weight:700;font-size:.95rem;margin:.4rem}
    .btn-dark{background:#1a1a1a}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${type === 'success' ? '✅' : type === 'warn' ? '⚠️' : '❌'}</div>
    <h2>${message}</h2>
    ${review ? `
      <div class="stars">${starsStr(review.stars)}</div>
      <blockquote>"${escHtml(review.message)}"</blockquote>
      <p class="meta">von ${escHtml(review.name)} · ${review.date || ''}</p>
    ` : ''}
    <a class="btn" href="https://be-hui.com/community.html">→ Community-Seite</a>
    <a class="btn btn-dark" href="https://hui-admin-dashboard.vercel.app/reviews">→ Admin Dashboard</a>
  </div>
</body>
</html>`;
}
