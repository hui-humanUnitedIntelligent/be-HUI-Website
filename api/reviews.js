// Vercel Serverless Function: /api/reviews
// POST   — submit new review (saves to pending, sends EmailJS notification)
// GET ?action=approve&id=...&token=... — approve review (publish)
// GET ?action=reject&id=...&token=...  — reject review (delete)

const GITHUB_TOKEN   = process.env.GH_TOKEN || '';
const GITHUB_REPO    = 'hui-humanUnitedIntelligent/be-HUI-Website';
const GITHUB_BRANCH  = 'main';
const ADMIN_EMAIL    = 'huiwirken@gmail.com';
const APPROVE_SECRET = process.env.HUI_REVIEW_SECRET || 'hui-review-secret-2026';
const EMAILJS_SVC    = 'service_c24pcce';
const EMAILJS_TPL    = 'template_6twtdnh';
const EMAILJS_KEY    = 'rn01OjX48srlic_N7';
const BASE_URL       = 'https://be-hui.com';
const ADMIN_API_URL  = 'https://hui-admin-dashboard.vercel.app';

async function ghGet(path) {
  const r = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (!r.ok) return { content: [], sha: '' };
  const data = await r.json();
  try {
    return { content: JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')), sha: data.sha };
  } catch { return { content: [], sha: data.sha || '' }; }
}

async function ghPut(path, content, sha, message) {
  const encoded = Buffer.from(JSON.stringify(content, null, 2), 'utf8').toString('base64');
  const body = { message, content: encoded, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
      body: JSON.stringify(body)
    }
  );
  if (!r.ok) throw new Error(`GitHub PUT ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sendEmail(params) {
  try {
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
      body: JSON.stringify({ service_id: EMAILJS_SVC, template_id: EMAILJS_TPL, user_id: EMAILJS_KEY, template_params: params })
    });
  } catch {}
}

function html(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>HUI Reviews</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;background:#f7f5f0}h2{margin-bottom:1rem}a.btn{display:inline-block;margin-top:1.5rem;background:#1ed8c8;color:#fff;padding:.75rem 2rem;border-radius:50px;text-decoration:none;font-weight:700}</style></head><body>${body}</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action, id, token } = req.query;

  // GET: approve / reject
  if (req.method === 'GET' && action && id) {
    if (token !== APPROVE_SECRET) {
      return res.status(403).setHeader('Content-Type', 'text/html').send(html('<h2>❌ Ungültiger Token</h2>'));
    }

    const { content: pending, sha: pendingSha } = await ghGet('data/pending_reviews.json');
    const arr = Array.isArray(pending) ? pending : [];
    const review = arr.find(r => r.id === id);

    if (!review) {
      return res.status(404).setHeader('Content-Type', 'text/html').send(html('<h2>⚠️ Nicht gefunden</h2><p>Bewertung wurde bereits bearbeitet.</p>'));
    }

    await ghPut('data/pending_reviews.json', arr.filter(r => r.id !== id), pendingSha, `review: remove ${id}`);

    if (action === 'approve') {
      const { content: published, sha: pubSha } = await ghGet('data/reviews.json');
      const newPub = [...(Array.isArray(published) ? published : []),
        { id: review.id, name: review.name, stars: review.stars, message: review.message, date: review.date }
      ];
      await ghPut('data/reviews.json', newPub, pubSha, `review: publish by ${review.name}`);
      return res.setHeader('Content-Type', 'text/html').send(
        html(`<h2 style="color:#1ed8c8">✅ Bewertung veröffentlicht!</h2><p>Die Bewertung von <strong>${review.name}</strong> ist jetzt live.</p><a class="btn" href="${BASE_URL}/community.html#cm-reviews">Zur Community-Seite →</a>`)
      );
    } else {
      return res.setHeader('Content-Type', 'text/html').send(html(`<h2>🗑️ Abgelehnt</h2><p>Bewertung von <strong>${review.name}</strong> wurde gelöscht.</p>`));
    }
  }

  // POST: new review
  if (req.method === 'POST') {
    const { name, stars, message, date, review_id } = req.body || {};
    if (!name || !stars || !message) {
      return res.status(400).json({ error: 'Missing fields: name, stars, message' });
    }

    const rid      = review_id || crypto.randomUUID();
    const dt       = date || new Date().toLocaleDateString('de-DE');
    const starsNum = Number(stars);

    const { content: pending, sha: pendingSha } = await ghGet('data/pending_reviews.json');
    const newPending = [...(Array.isArray(pending) ? pending : []),
      { id: rid, name, stars: starsNum, message, date: dt, submitted_at: new Date().toISOString() }
    ];
    await ghPut('data/pending_reviews.json', newPending, pendingSha, `review: pending by ${name}`);

    const approveUrl = `${ADMIN_API_URL}/api/reviews?action=approve&id=${rid}&token=${APPROVE_SECRET}`;
    const rejectUrl  = `${ADMIN_API_URL}/api/reviews?action=reject&id=${rid}&token=${APPROVE_SECRET}`;
    const starsText  = '★'.repeat(starsNum) + '☆'.repeat(5 - starsNum);

    await sendEmail({
      reviewer_name: name, stars: starsText, stars_count: String(starsNum),
      message, date: dt, review_id: rid,
      approve_url: approveUrl, reject_url: rejectUrl,
      admin_url: approveUrl,
      email: ADMIN_EMAIL, to_email: ADMIN_EMAIL
    });

    return res.status(200).json({ success: true, id: rid });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
