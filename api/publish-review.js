// /api/publish-review.js
// Called by Admin Dashboard to move review from pending → published

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GH_TOKEN = process.env.GH_TOKEN;
  const REPO     = 'hui-humanUnitedIntelligent/be-HUI-Website';
  const BRANCH   = 'main';

  if (!GH_TOKEN) return res.status(500).json({ error: 'GH_TOKEN missing' });

  let id;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    id = String(body.id || '').trim();
  } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!id) return res.status(400).json({ error: 'Missing id' });

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
    const body = { message, content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'), branch: BRANCH };
    if (sha) body.sha = sha;
    const r = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'HUI-Bot', Accept: 'application/vnd.github+json' }, body: JSON.stringify(body) }
    );
    if (!r.ok) throw new Error(`GitHub write failed: ${r.status}`);
    return true;
  }

  try {
    const { data: pending, sha: pendingSHA } = await fetchFile('data/pending_reviews.json');
    const review = pending.find(r => r.id === id);
    if (!review) return res.status(404).json({ error: 'Review not found or already published' });

    const { data: published, sha: publishedSHA } = await fetchFile('data/reviews.json');
    published.push({ id: review.id, name: review.name, stars: review.stars, message: review.message, date: review.date, approvedAt: new Date().toISOString() });
    const newPending = pending.filter(r => r.id !== id);

    await writeFile('data/reviews.json', published, publishedSHA, `feat: publish review by ${review.name}`);
    await writeFile('data/pending_reviews.json', newPending, pendingSHA, `chore: remove pending review ${id}`);

    return res.status(200).json({ success: true, review: { name: review.name, stars: review.stars } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
