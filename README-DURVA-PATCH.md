# TruthLens — Durva integration patch

This patch adds a dedicated `/durva` page and connects it to Gemini only from the server.

## Included
- Dedicated Durva health/wellness assistant at `/durva`.
- Gemini API key stays server-side in `GEMINI_API_KEY`.
- Robust Gemini retries, model fallback and timeout handling.
- Friendly API errors instead of the generic "AI service had a problem" message.
- Nutrition-label OCR/AI scan through the existing `/api/scan` endpoint.
- Meal-plan, workout, task and wellness quick actions.
- Logged-in persistent Durva chat using Supabase `durva_messages`.
- `durva_schema.sql` for the persistent chat table and RLS policies.
- Global Durva floating launcher with parrot green accent `#7CFC00`.

## Supabase
Run `durva_schema.sql` once in the Supabase SQL editor.

## Render/server environment
Keep `GEMINI_API_KEY` only in Render Environment Variables or `.env`. Do not put it in HTML, CSS or browser JavaScript.
The server defaults to `gemini-2.5-flash` and falls back to current Flash models when a model is unavailable/busy.
