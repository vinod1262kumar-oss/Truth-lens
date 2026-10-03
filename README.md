# TruthLens V1

Food label scanner. Node + Express backend, Supabase (Google login + scan counter), Gemini reads the label photo.

## Setup (5 steps)
1. **Supabase**: create a project. SQL Editor: paste `schema.sql` and run it. This now creates both `profiles` and `scans` (history).
2. **Google login**: Supabase > Authentication > Providers > Google. Turn it on and add your Google client ID and secret. Under Authentication > URL Configuration, add your site URL (for example `http://localhost:3000` and your live URL).
3. **Keys**: open `.env` and fill in the Supabase URL and keys, and your Gemini API key.
4. **Run**: `npm install` then `npm start`. Open http://localhost:3000
5. **Deploy**: put the folder on Render, Railway or similar. Add the same values from `.env` as environment variables.

## How it works
- `server.js`: checks login, counts scans in Supabase, reads the label with Gemini, does the safe-amount maths.
- `public/index.html`: the white and gold app screen.
- Daily limits live in the `LIMITS` list at the top of `server.js`. Change them there when FSSAI publishes final thresholds.
- Free scans are set by `FREE_SCANS` in `.env`. To make someone Pro, set `plan` to `pro` in the `profiles` table.

Keep `.env` private. The service role key must never go in the frontend.

Gemini model: set `GEMINI_MODEL` in `.env`. Default is `gemini-2.5-flash`. If Google retires it, pick a current Flash model from aistudio.google.com.

## Which AI reads the label
Set `LABEL_PROVIDER` in `.env` to `nvidia` (Gemma via NVIDIA) or `gemini`. For NVIDIA, use a Gemma model that accepts images (default `google/gemma-3n-e4b-it`). If you get an error about images, try `google/gemma-3-27b-it` or switch to `gemini`.

## SEO and trust pages
- Pages: `/privacy`, `/terms`, plus `llms.txt`, `robots.txt` and `sitemap.xml`. The home page has the title, description, contact footer and Organization, WebApplication and FAQ schema.
- Add `CONTACT_EMAIL` in `.env` (and in Render Environment). It fills the contact email everywhere. Use an email made only for TruthLens.
- `SITE_URL` is optional. It is detected automatically.
- The privacy and terms text is a simple template. Read it and change it to match how you really run the app.

## Version 2 changes
- Multi-page site: Home, Scan, Limits, Pricing, Contact, Privacy, Terms (shared header and footer in `partials/`).
- Manual entry has all common Indian label fields: energy, protein, carbohydrate, total and added sugars, total, saturated and trans fat, cholesterol, fibre, sodium or salt, serving size.
- Answers show a verdict, safe grams, servings, a sensible single portion, and each nutrient as Low, Medium or High.
- Camera: Take photo and From gallery buttons, bigger photo, safer AI settings. Open `/api/health` to check that your keys are set. Errors now show a short code.

## Version 3
- `/history`: every scan and check saved per user (newest first), with delete and clear all.
- "Summarize with AI" on each result (Gemini), optional question, cached per scan, max 10 per hour per user.
- Cleaner pages: manual form and details are collapsed; nav is Home, Scan, History, Limits.
- `schema.sql` creates both the account/scan-counter tables and the `scans` history table. If you already installed an older version, run `schema_history.sql` once in Supabase to add/fix history.
- Contact email is set in `server.js` (`CONTACT_EMAIL`). A `CONTACT_EMAIL` variable in Render overrides it.


## Version 4 — Blue UI, login experience and Durva
- Added `/login` with a 3D chips-packet mascot. The initial state shows the back of the packet; focusing the email field or starting Google/email login flips to the front mascot and Google badge.
- Added email magic-link sign-in and retained Google OAuth through Supabase.
- Replaced the gold visual theme with a blue/white glassmorphism theme.
- Added floating Durva assistant, powered by the existing Gemini API key. Durva can scan nutrition labels with the existing OCR endpoint, answer label questions, and generate balanced food-routine plans and simple tasks.
- Durva intentionally avoids calorie targets, weight-loss plans, fasting/extreme restriction and medical diagnosis. It is general nutrition guidance.
- Added `assets/chips-mascot.png` for the login mascot.

## TruthLens Parrot Green + Durva update
- Unified the shared site theme around Parrot Green `#7CFC00` with a light grey/green background.
- Updated Home, Scan, History, Limits, Pricing, Contact, Privacy, Terms, and Login because they all use the shared stylesheet.
- Durva floating button now opens `/durva` instead of an embedded panel.
- Added dedicated `durva.html`, `durva.css`, and `durva.js`.
- Added `/durva` and its assets to `server.js`.
- Added Gemini timeout/network error handling so temporary AI failures show useful messages.
- Gemini API key remains server-side in `GEMINI_API_KEY`; it is not placed in frontend code.
