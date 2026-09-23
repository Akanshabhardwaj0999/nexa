# Nexa

Listen to the same song at the same time with someone else. One person creates a room and shares the code or invite link. Play, pause, seek, skip and the shared queue stay in sync for both of you.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS 4
- Supabase: Postgres for rooms, queue and the last playback state; Realtime broadcast and presence for live sync
- Music comes from Jamendo. If Jamendo fails (for example the client ID is invalid or suspended), Nexa switches to [Audius](https://audius.org), which needs no key.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings
   - `VITE_JAMENDO_CLIENT_ID` from <https://devportal.jamendo.com> (optional; without it Audius is used)
3. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. You can run it again safely.
4. `npm run dev`

## How sync works

- Every room has a Realtime channel. Presence shows who is online.
- When you play, pause, seek or change the song, the change is broadcast to the other listener and saved to `room_playback`.
- The listener who joined first acts as the clock. Every 4 seconds while music plays, it broadcasts its position. The other listener seeks to match if the two are more than 0.6s apart.
- When someone joins or reconnects, they ask the room what is playing and get the live position back. If nobody else is online, the room resumes from the saved state, paused.
- Browsers block audio that starts before you interact with the page. When that happens, Nexa shows **Tap to listen along**. One tap starts playback in sync.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run oxlint |
| `npm run preview` | Preview the production build |

## Deploying

This is a single-page app. Configure your host to serve `index.html` for every route (for example `/room/ABC123`).
