# TruthLens Durva + Parrot Green patch

This patch adds a dedicated `/durva` page and `/api/durva` Gemini endpoint and makes Durva launchers open the dedicated page.

## Environment
Keep the existing server environment variables. The backend uses the existing `GEMINI_API_KEY` and `GEMINI_MODEL`.

## Deploy
Copy these files into the corresponding TruthLens project locations:
- `server.js` -> project root
- `app.js` -> the served assets location used by the existing server
- `durva.html` -> project root (or the folder your server's `find()` resolves)
- `durva.js` -> assets folder
- `durva.css` -> assets folder

The server mapping already exposes `/durva`, `/assets/durva.js`, and `/assets/durva.css`.

## Important
The uploaded screenshot's current Durva UI was not present in the stored project files available to me, so this is a drop-in backend/page patch rather than a byte-for-byte edit of that exact deployed build. If your deployed build has a newer `server.js`, merge the Durva route and mappings instead of overwriting unrelated changes.
