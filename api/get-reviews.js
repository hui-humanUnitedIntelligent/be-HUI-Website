// /api/get-reviews.js
// Returns all published reviews from data/reviews.json

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const GH_TOKEN = process.env.GH_TOKEN;
  const REPO     = 'hui-humanUnitedIntelligent/be-HUI-Website';
  const BRANCH   = 'main';

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/data/reviews.json?ref=${BRANCH}`,
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
