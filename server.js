import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  LABEL_PROVIDER = 'nvidia',
  NVIDIA_API_KEY, NVIDIA_MODEL = 'google/gemma-3n-e4b-it',
  GEMINI_API_KEY, GEMINI_MODEL = 'gemini-2.5-flash',
  FREE_SCANS = '10', PORT = 3000,
} = process.env;
const FREE = parseInt(FREE_SCANS, 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !(LABEL_PROVIDER === 'nvidia' ? NVIDIA_API_KEY : GEMINI_API_KEY)) {
  console.error('Missing keys. Fill in the .env file first.');
  process.exit(1);
}
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Daily limits for a 2,000 kcal adult (WHO). Edit here to change them.
const LIMITS = [
  { key: 'sugar', name: 'Sugar', daily: 25 },          // g
  { key: 'sat_fat', name: 'Saturated fat', daily: 22 }, // g
  { key: 'sodium', name: 'Sodium', daily: 2000 },       // mg
];

function calc(n) {
  const rows = [];
  for (const l of LIMITS) {
    const v = Number(n[l.key]);
    if (v > 0) rows.push({ name: l.name, grams: l.daily / (v / 100) });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => a.grams - b.grams);
  return {
    safe_grams: Math.round(rows[0].grams),
    limiting: rows[0].name,
    rows: rows.map(r => ({ name: r.name, grams: Math.round(r.grams) })),
  };
}

async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Sign in first.' });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Session expired. Sign in again.' });
  req.user = data.user;
  next();
}

async function getProfile(id) {
  let { data } = await admin.from('profiles').select('scans_used,plan').eq('id', id).maybeSingle();
  if (!data) {
    const r = await admin.from('profiles').insert({ id }).select('scans_used,plan').single();
    data = r.data;
  }
  return data;
}
const allowed = p => p.plan === 'pro' || p.scans_used < FREE;
const leftOf = (plan, used) => (plan === 'pro' ? null : Math.max(FREE - used, 0));
async function consume(id) {
  const { data, error } = await admin.rpc('increment_scans', { uid: id });
  if (error) throw error;
  return data;
}

const PROMPT = 'Read this nutrition table. Return {"sugar":number|null,"sat_fat":number|null,"sodium":number|null} per 100 g. Sugar and sat_fat in grams, sodium in mg. If only salt is shown, sodium mg = salt g x 400. If only per-serving values and a serving size in g are shown, convert to per 100 g. Use null if not readable. Reply with JSON only.';

function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json in reply: ' + text.slice(0, 200));
  return JSON.parse(m[0]);
}

async function readLabelNvidia(b64, mime) {
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + NVIDIA_API_KEY },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } },
      ] }],
      max_tokens: 300,
      temperature: 0,
      stream: false,
    }),
  });
  if (!r.ok) throw new Error('nvidia ' + r.status + ' ' + (await r.text()));
  const d = await r.json();
  return parseJson((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '');
}

async function readLabel(b64, mime) {
  return LABEL_PROVIDER === 'gemini' ? readLabelGemini(b64, mime) : readLabelNvidia(b64, mime);
}

async function readLabelGemini(b64, mime) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You read food nutrition labels. Reply with JSON only, no other text.' }] },
      contents: [{
        parts: [
          { inline_data: { mime_type: mime, data: b64 } },
          { text: 'Read this nutrition table. Return {"sugar":number|null,"sat_fat":number|null,"sodium":number|null} per 100 g. Sugar and sat_fat in grams, sodium in mg. If only salt is shown, sodium mg = salt g x 400. If only per-serving values and a serving size in g are shown, convert to per 100 g. Use null if not readable.' },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 300 },
    }),
  });
  if (!r.ok) throw new Error('gemini ' + r.status + ' ' + (await r.text()));
  const d = await r.json();
  const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
  const text = parts.map(p => p.text || '').join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (_q, res) => res.json({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }));

app.get('/api/me', auth, async (req, res) => {
  const p = await getProfile(req.user.id);
  res.json({ left: leftOf(p.plan, p.scans_used), plan: p.plan });
});

const LIMIT_MSG = { error: 'limit', message: 'You have used your free scans. Upgrade to keep scanning.' };

app.post('/api/scan', auth, async (req, res) => {
  try {
    const p = await getProfile(req.user.id);
    if (!allowed(p)) return res.status(402).json(LIMIT_MSG);
    const { image, mime = 'image/jpeg' } = req.body || {};
    if (!image) return res.status(400).json({ error: 'No photo received.' });
    const nutrients = await readLabel(image, mime);
    const result = calc(nutrients);
    if (!result) return res.status(422).json({ error: 'Could not read the label. Try a clearer photo or type the values.' });
    const used = await consume(req.user.id);
    res.json({ nutrients, result, left: leftOf(p.plan, used) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Scan failed. Try again.' });
  }
});

app.post('/api/check', auth, async (req, res) => {
  try {
    const p = await getProfile(req.user.id);
    if (!allowed(p)) return res.status(402).json(LIMIT_MSG);
    const n = req.body || {};
    const result = calc({ sugar: n.sugar, sat_fat: n.sat_fat, sodium: n.sodium });
    if (!result) return res.status(400).json({ error: 'Enter at least one value per 100 g.' });
    const used = await consume(req.user.id);
    res.json({ result, left: leftOf(p.plan, used) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Check failed. Try again.' });
  }
});

app.listen(PORT, () => console.log('TruthLens running on http://localhost:' + PORT));
