# USERHUNT

USERHUNT is a web app with a Node.js API.

## Deploy as a Render Web Service

Connect repository `Vlameet/HGH`, branch `main`:
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`

The service serves the frontend and API from one origin.

## API

- `GET /api/health` — service health.
- `GET /api/check/telegram/:username` — cautious public-page probe for a Telegram username.
- Instagram, TikTok and X currently return `unsupported`.

## Important limitations

A public Telegram web page is not an authoritative username-availability API. The endpoint reports a visible public page, a 404 response, or an inconclusive result. A 404 does **not** prove that a username can be registered. Definitive checks require an authorized Telegram client/API flow and must respect platform rules and rate limits.

The in-memory rate limit is per process and resets on restart. Use a shared store before scaling to multiple instances.
