// /api/get-pending-reviews.js
// Returns all pending reviews — called by Admin Dashboard

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-hui-secret');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GH_TOKEN = process.env.GH_TOKEN;
  const REPO     = 'hui-humanUnitedIntelligent/be-HUI-Website';
  const BRANCH   = 'main';

  if (!GH_TOKEN) return res.status(500).json({ error: 'GH_TOKEN missing' });

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/data/pending_reviews.json?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${GH_TOKEN}`, 'User-Agent': 'HUI-Bot', Accept: 'application/vnd.github+json' } }
    );
    if (!ghRes.ok) return res.status(200).json([]);
    const ghData = await ghRes.json();
    const data = JSON.parse(Buffer.from(ghData.content, 'base64').toString('utf-8'));
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
