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

## Telegram availability limits

The current checker inspects the public `t.me/:username` page. A found public page is evidence that the username is likely occupied. A missing public page is **not** proof that the username is available: it may be reserved, collectible, or otherwise unavailable.

Telegram's official MTProto `account.checkUsername` method validates availability for an authenticated user account. It is not an anonymous public lookup endpoint. Do not collect a user's Telegram password, login code, or personal session string for this website. A future official-check mode would need a carefully isolated, explicitly authorized account/session and security review.

## Safety and operations

- API requests are rate-limited in memory per process (20/minute); the limit resets on restart.
- The in-memory limit is not shared across multiple instances.
- Never commit API credentials, Telegram sessions, or tokens to the repository.
