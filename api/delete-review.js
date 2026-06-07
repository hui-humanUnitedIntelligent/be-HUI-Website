// /api/delete-review.js
// Called by Admin Dashboard to delete a pending OR published review

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

  let id, type;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    id   = String(body.id   || '').trim();
    type = String(body.type || 'pending').trim(); // 'pending' or 'published'
  } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const filePath = type === 'published' ? 'data/reviews.json' : 'data/pending_reviews.json';

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
  }

  try {
    const { data, sha } = await fetchFile(filePath);
    const arr = Array.isArray(data) ? data : [];
    const newArr = arr.filter(r => r.id !== id);
    if (newArr.length === arr.length) return res.status(404).json({ error: 'Review not found' });
    await writeFile(filePath, newArr, sha, `chore: delete ${type} review ${id}`);
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
