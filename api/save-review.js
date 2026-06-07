// /api/save-review.js
// Saves a new review to pending_reviews.json via GitHub API
// and sends email notification via EmailJS REST API (server-side)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GH_TOKEN  = process.env.GH_TOKEN;
  const REPO      = 'hui-humanUnitedIntelligent/be-HUI-Website';
  const BRANCH    = 'main';
  const FILE_PATH = 'data/pending_reviews.json';
  const BASE_URL  = 'https://be-hui.com';
  const DASHBOARD = 'https://hui-admin-dashboard.vercel.app/reviews';

  const EJS_SERVICE  = 'service_c24pcce';
  const EJS_TEMPLATE = 'template_6twtdnh';
  const EJS_PUBLIC   = 'rn01OjX48srlic_N7';

  if (!GH_TOKEN) return res.status(500).json({ error: 'GH_TOKEN missing' });

  let name, stars, message, reviewId;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    name      = String(body.name    || '').trim();
    stars     = parseInt(body.stars, 10);
    message   = String(body.message || body.text || '').trim();
    reviewId  = String(body.id      || Date.now().toString(36)).trim();
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!name || !message || isNaN(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  const date      = new Date().toLocaleDateString('de-DE');
  const starsText = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  // 1. Read current pending_reviews.json
  let pending = [], currentSHA = '';
  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${GH_TOKEN}`, 'User-Agent': 'HUI-Bot', Accept: 'application/vnd.github+json' } }
    );
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      currentSHA = ghData.sha;
      pending = JSON.parse(Buffer.from(ghData.content, 'base64').toString('utf-8'));
      if (!Array.isArray(pending)) pending = [];
    }
  } catch (e) {
    console.error('[save-review] Read error:', e.message);
  }

  // 2. Append new review
  const newReview = { id: reviewId, name, stars, message, date, submitted_at: new Date().toISOString() };
  pending.push(newReview);

  // 3. Write to GitHub
  const putBody = {
    message: `feat: new pending review from ${name}`,
    content: Buffer.from(JSON.stringify(pending, null, 2)).toString('base64'),
    branch: BRANCH,
  };
  if (currentSHA) putBody.sha = currentSHA;

  const writeRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'HUI-Bot', Accept: 'application/vnd.github+json' },
      body: JSON.stringify(putBody),
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}));
    return res.status(500).json({ error: 'Could not save review', detail: err.message || '' });
  }

  // 4. Send email via EmailJS REST API
  try {
    const ejsPayload = {
      service_id:   EJS_SERVICE,
      template_id:  EJS_TEMPLATE,
      user_id:      EJS_PUBLIC,
      template_params: {
        reviewer_name: name,
        name:          name,
        stars:         starsText,
        stars_count:   String(stars),
        message:       message,
        date:          date,
        admin_url:     DASHBOARD,
        publish_url:   DASHBOARD,
        email:         'huiwirken@gmail.com',
        to_email:      'huiwirken@gmail.com',
      },
    };

    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'origin': BASE_URL },
      body: JSON.stringify(ejsPayload),
    });
    console.log('[save-review] ✅ EmailJS sent');
  } catch (emailErr) {
    console.warn('[save-review] Email error (non-fatal):', emailErr.message);
  }

  return res.status(200).json({ success: true, id: reviewId });
};
