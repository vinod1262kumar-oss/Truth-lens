import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  LABEL_PROVIDER = 'gemini',
  GEMINI_API_KEY, GEMINI_MODEL = 'gemini-2.5-flash',
  NVIDIA_API_KEY, NVIDIA_MODEL = 'google/gemma-3n-e4b-it',
  FREE_SCANS = '10', PORT = 3000, SITE_URL = '', CONTACT_EMAIL = '',
} = process.env;
const FREE = parseInt(FREE_SCANS, 10);
const AI_KEY = LABEL_PROVIDER === 'nvidia' ? NVIDIA_API_KEY : GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !AI_KEY) {
  console.error('Missing keys. Fill in the .env file (or Render Environment) first.');
  process.exit(1);
}
if (!CONTACT_EMAIL) console.warn('CONTACT_EMAIL is not set. Add it so the contact email shows on the site.');
process.on('unhandledRejection', e => console.error('unhandledRejection', e));

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

class AppError extends Error {
  constructor(code, message, status = 500) { super(message); this.code = code; this.status = status; }
}
const h = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  const a = e instanceof AppError;
  res.status(a ? e.status : 500).json({ error: a ? e.message : 'Something went wrong on the server.', code: a ? e.code : 'server' });
});

/* ---------- Limits (WHO, 2,000 kcal adult). Edit here. low/high are per 100 g (sodium in mg) ---------- */
const NUTR = [
  { key: 'sugar', name: 'Sugar', unit: 'g', daily: 25, low: 5, high: 22.5, tip: 'Skip other sweet foods and sugary drinks for the rest of the day.' },
  { key: 'sat_fat', name: 'Saturated fat', unit: 'g', daily: 22, low: 1.5, high: 5, tip: 'Keep fried food, butter and ghee low for the rest of the day.' },
  { key: 'trans_fat', name: 'Trans fat', unit: 'g', daily: 2.2, low: 0.2, high: 1, tip: 'Keep trans fat as low as possible. Avoid products listing hydrogenated fat.' },
  { key: 'sodium', name: 'Sodium', unit: 'mg', daily: 2000, low: 120, high: 600, tip: 'Go easy on salty snacks, pickles and papad for the rest of the day.' },
  { key: 'total_fat', name: 'Total fat', unit: 'g', daily: 67, low: 3, high: 17.5, tip: 'Balance this with lighter, low-fat meals for the rest of the day.' },
];
const NUM_KEYS = ['serving_size_g', 'energy_kcal', 'protein', 'carbs', 'total_sugars', 'added_sugars', 'total_fat', 'sat_fat', 'trans_fat', 'cholesterol', 'fibre', 'sodium', 'salt'];

function clean(n) {
  const o = { product_name: typeof n.product_name === 'string' ? n.product_name.slice(0, 80) : '' };
  for (const k of NUM_KEYS) {
    const raw = n[k]; const v = Number(raw);
    o[k] = raw !== null && raw !== undefined && raw !== '' && isFinite(v) && v >= 0 && v <= 100000 ? v : null;
  }
  return o;
}
const r1 = v => Math.round(v * 10) / 10;
const nice = g => (g >= 100 ? Math.floor(g / 10) * 10 : g >= 20 ? Math.floor(g / 5) * 5 : Math.floor(g));
const lvl = (v, lo, hi) => (v <= lo ? 'low' : v > hi ? 'high' : 'medium');
const list = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

function analyze(n) {
  const sugarKey = n.added_sugars != null ? 'added_sugars' : 'total_sugars';
  const sodium = n.sodium != null ? n.sodium : n.salt != null ? n.salt * 400 : null;
  const vals = { sugar: n[sugarKey], sat_fat: n.sat_fat, trans_fat: n.trans_fat, sodium, total_fat: n.total_fat };
  const serving = n.serving_size_g > 0 ? n.serving_size_g : null;
  const rows = [];
  for (const d of NUTR) {
    const v = vals[d.key];
    if (v == null) continue;
    const pct = Math.round(v / d.daily * 100);
    const raw = v > 0 ? d.daily / (v / 100) : null;
    const level = lvl(v, d.low, d.high);
    let text = r1(v) + ' ' + d.unit + ' per 100 g. 100 g uses ' + pct + '% of the daily limit (' + d.daily + ' ' + d.unit + ').';
    if (raw !== null) text += ' Up to about ' + nice(raw) + ' g fits in today.';
    if (serving) text += ' One ' + serving + ' g serving uses ' + Math.round(serving * v / 100 / d.daily * 100) + '%.';
    rows.push({ key: d.key, name: d.name, level, raw, text, tip: d.tip, unit: d.unit, daily: d.daily, per100: r1(v), pct });
  }
  if (!rows.length) return null;
  const limited = rows.filter(r => r.raw !== null).sort((a, b) => a.raw - b.raw);
  const highs = rows.filter(r => r.level === 'high').map(r => r.name.toLowerCase());
  const meds = rows.filter(r => r.level === 'medium').map(r => r.name.toLowerCase());
  const verdict = highs.length
    ? { level: 'high', title: 'Best kept as an occasional food', text: list(highs) + (highs.length > 1 ? ' are' : ' is') + ' high per 100 g.' }
    : meds.length
      ? { level: 'medium', title: 'Okay in small amounts', text: list(meds) + (meds.length > 1 ? ' are' : ' is') + ' moderate per 100 g, so watch the portion.' }
      : { level: 'low', title: 'Fine as a regular food', text: 'Everything checked is low per 100 g.' };
  const a = { product: n.product_name, verdict, rows: rows.map(({ raw, ...r }) => r), points: [], notes: [], safe_grams: null, headline: '', tip: '', info: [] };
  if (limited.length) {
    const lim = limited[0], safe = nice(lim.raw);
    a.safe_grams = safe;
    a.headline = lim.name + ' runs out first. ' + safe + ' g of this product uses up the whole daily limit of ' + lim.daily + ' ' + lim.unit + ' (100 g uses ' + lim.pct + '%).';
    a.tip = lim.tip;
    a.points.push(serving
      ? (safe >= serving ? 'That is about ' + Math.floor(safe / serving * 2) / 2 + ' serving(s) of ' + serving + ' g, if nothing else you eat today has ' + lim.name.toLowerCase() + '.' : 'Even one serving (' + serving + ' g) is more than the daily ' + lim.name.toLowerCase() + ' limit allows.')
      : 'Add the serving size to see this in servings.');
    a.points.push(safe < 30 ? 'A very small portion already uses the day\'s limit. Keep it as a rare treat.' : 'For one sitting, about ' + nice(lim.raw / 3) + ' g (a third of that) is a sensible portion.');
  } else {
    a.headline = 'None of the checked nutrients is present, so no daily limit is reached by this product.';
  }
  if (n.added_sugars == null && n.total_sugars != null) a.notes.push('Added sugar was not on the label, so total sugars were used. This can overstate the sugar.');
  a.notes.push('Daily limits are for a 2,000 kcal adult (WHO). Labels allow about 20% tolerance, so treat results as a guide.');
  const inf = [['Energy', n.energy_kcal, 'kcal'], ['Protein', n.protein, 'g'], ['Carbohydrate', n.carbs, 'g'], ['Fibre', n.fibre, 'g'], ['Cholesterol', n.cholesterol, 'mg']];
  a.info = inf.filter(i => i[1] != null).map(i => i[0] + ' ' + r1(i[1]) + ' ' + i[2]);
  return a;
}

/* ---------- AI label reading ---------- */
const PROMPT = 'Read the nutrition information table on this packaged food label (often an Indian FSSAI style label). Return JSON only with these keys: product_name (string), serving_size_g, energy_kcal, protein, carbs, total_sugars, added_sugars, total_fat, sat_fat, trans_fat, cholesterol, fibre, sodium, salt. All values are numbers per 100 g (or per 100 ml), or null if not shown. Units: energy in kcal (if only kJ, divide by 4.184), cholesterol and sodium in mg, salt and everything else in g. "Nil", "Absent" and "0" mean 0. If the table is only per serving and the serving size in g is given, convert to per 100 g. If only salt is shown, fill salt and leave sodium null. Never guess: use null when unreadable. If the image is not a nutrition label, return all nulls.';
const aiMsg = s => (s === 400 ? 'The AI rejected the request. Check the AI key and model name.' : s === 401 || s === 403 ? 'The AI key is not valid or not allowed.' : s === 429 ? 'The AI limit is reached. Try again in a minute.' : 'The AI service had a problem. Try again.');

async function callGemini(b64, mime) {
  for (const model of [...new Set([GEMINI_MODEL, 'gemini-flash-latest'])]) {
    const gc = { temperature: 0, maxOutputTokens: 4096, responseMimeType: 'application/json' };
    if (/2\.5/.test(model)) gc.thinkingConfig = { thinkingBudget: 0 };
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: PROMPT }] }], generationConfig: gc }),
    });
    if (r.status === 404) { console.error('gemini model not found:', model); continue; }
    if (!r.ok) { console.error('gemini', r.status, (await r.text()).slice(0, 300)); throw new AppError('ai_' + r.status, aiMsg(r.status), 502); }
    const d = await r.json();
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || '').join('');
    if (!text.trim()) { console.error('gemini empty', JSON.stringify(d).slice(0, 300)); throw new AppError('ai_empty', 'The AI returned nothing. Try a clearer photo.', 502); }
    return text;
  }
  throw new AppError('ai_404', 'The AI model name is wrong. Set GEMINI_MODEL to a current Gemini Flash model.', 502);
}
async function callNvidia(b64, mime) {
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + NVIDIA_API_KEY },
    body: JSON.stringify({ model: NVIDIA_MODEL, max_tokens: 800, temperature: 0, stream: false, messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } }] }] }),
  });
  if (!r.ok) { console.error('nvidia', r.status, (await r.text()).slice(0, 300)); throw new AppError('ai_' + r.status, aiMsg(r.status), 502); }
  const d = await r.json();
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
}
async function readLabel(b64, mime) {
  const text = LABEL_PROVIDER === 'nvidia' ? await callNvidia(b64, mime) : await callGemini(b64, mime);
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new AppError('ai_parse', 'Could not read the label. Try a clearer photo or type the values.', 422);
  try { return clean(JSON.parse(m[0])); } catch (e) { throw new AppError('ai_parse', 'Could not read the label. Try a clearer photo or type the values.', 422); }
}

/* ---------- Auth and scan counter ---------- */
async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Sign in first.', code: 'no_token' });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data || !data.user) return res.status(401).json({ error: 'Session expired. Sign in again.', code: 'bad_token' });
    req.user = data.user; next();
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login check failed.', code: 'auth' }); }
}
async function getProfile(id) {
  const sel = () => admin.from('profiles').select('scans_used,plan').eq('id', id).maybeSingle();
  let { data, error } = await sel();
  if (error) { console.error('profiles', error); throw new AppError('db', 'Database is not set up. Run schema.sql in Supabase and check the service key.', 500); }
  if (!data) {
    const ins = await admin.from('profiles').insert({ id }).select('scans_used,plan').single();
    if (ins.error) { console.error('profiles insert', ins.error); throw new AppError('db', 'Database is not set up. Run schema.sql in Supabase and check the service key.', 500); }
    data = ins.data;
  }
  return data;
}
const allowed = p => p.plan === 'pro' || p.scans_used < FREE;
const leftOf = (plan, used) => (plan === 'pro' ? null : Math.max(FREE - used, 0));
async function consume(id) {
  const { data, error } = await admin.rpc('increment_scans', { uid: id });
  if (error) { console.error('increment_scans', error); throw new AppError('db', 'Scan counter failed. Run schema.sql in Supabase again.', 500); }
  return data;
}
const recent = new Map(); // a manual re-check within 10 minutes of a scan is free
const LIMIT_MSG = { error: 'You have used your free scans. Upgrade to keep scanning.', code: 'limit' };

/* ---------- Server ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));

app.get('/api/config', (_q, res) => res.json({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }));
app.get('/api/health', (_q, res) => res.json({ ok: true, provider: LABEL_PROVIDER, model: LABEL_PROVIDER === 'nvidia' ? NVIDIA_MODEL : GEMINI_MODEL, supabase_url: !!SUPABASE_URL, anon_key: !!SUPABASE_ANON_KEY, service_key: !!SUPABASE_SERVICE_ROLE_KEY, ai_key: !!AI_KEY, contact_email: !!CONTACT_EMAIL }));

app.get('/api/me', auth, h(async (req, res) => {
  const p = await getProfile(req.user.id);
  res.json({ left: leftOf(p.plan, p.scans_used), plan: p.plan });
}));

app.post('/api/scan', auth, h(async (req, res) => {
  const p = await getProfile(req.user.id);
  if (!allowed(p)) return res.status(402).json(LIMIT_MSG);
  const { image, mime = 'image/jpeg' } = req.body || {};
  if (typeof image !== 'string' || image.length < 100) throw new AppError('no_image', 'No photo received.', 400);
  const nutrients = await readLabel(image, mime);
  const analysis = analyze(nutrients);
  if (!analysis) throw new AppError('no_values', 'No sugar, fat or sodium values were found. Try a clearer photo of the nutrition table, or type the values.', 422);
  const used = await consume(req.user.id);
  recent.set(req.user.id, Date.now());
  res.json({ nutrients, analysis, left: leftOf(p.plan, used) });
}));

app.post('/api/check', auth, h(async (req, res) => {
  const p = await getProfile(req.user.id);
  const free = Date.now() - (recent.get(req.user.id) || 0) < 10 * 60 * 1000;
  if (!free && !allowed(p)) return res.status(402).json(LIMIT_MSG);
  const n = clean(req.body || {});
  const analysis = analyze(n);
  if (!analysis) throw new AppError('no_values', 'Enter at least one of sugar, fat, saturated fat, trans fat or sodium.', 400);
  const used = free ? p.scans_used : await consume(req.user.id);
  res.json({ analysis, left: leftOf(p.plan, used) });
}));

/* ---------- Pages with shared header and footer ---------- */
// Works with files in folders (public/, partials/) or all in one flat folder. Root files win.
const DIRS = ['', 'public', 'partials', 'public/assets'];
async function find(name) {
  for (const d of DIRS) {
    const p = path.join(__dirname, d, name);
    try { await fs.access(p); return p; } catch (e) { /* try next */ }
  }
  throw new Error('File not found: ' + name);
}
const PAGES = { '/': 'index.html', '/scan': 'scan.html', '/limits': 'limits.html', '/pricing': 'pricing.html', '/contact': 'contact.html', '/privacy': 'privacy.html', '/terms': 'terms.html', '/llms.txt': 'llms.txt', '/robots.txt': 'robots.txt', '/sitemap.xml': 'sitemap.xml' };
const ASSETS = { '/assets/style.css': ['style.css', 'text/css; charset=utf-8'], '/assets/app.js': ['app.js', 'application/javascript; charset=utf-8'], '/assets/scan.js': ['scan.js', 'application/javascript; charset=utf-8'] };
const TYPES = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const read = async f => fs.readFile(await find(f), 'utf8');
app.get(Object.keys(PAGES), async (req, res) => {
  try {
    const file = PAGES[req.path];
    const base = (SITE_URL || req.protocol + '://' + req.get('host')).replace(/\/$/, '');
    let body = await read(file);
    if (file.endsWith('.html')) body = body.split('{{HEADER}}').join(await read('header.html')).split('{{FOOTER}}').join(await read('footer.html'));
    body = body.split('{{SITE_URL}}').join(base).split('{{CONTACT_EMAIL}}').join(CONTACT_EMAIL || 'contact@example.com');
    res.type(TYPES[path.extname(file)]).send(body);
  } catch (e) { console.error(e); res.status(500).send('Page error: ' + e.message); }
});
app.get(Object.keys(ASSETS), async (req, res) => {
  try { const [f, t] = ASSETS[req.path]; res.type(t).send(await read(f)); }
  catch (e) { console.error(e); res.status(404).send('Not found'); }
});
app.use((_q, res) => res.status(404).type('html').send('<p style="font-family:sans-serif;padding:30px">Page not found. <a href="/">Go to TruthLens</a></p>'));

app.listen(PORT, () => console.log('TruthLens running on port ' + PORT));
