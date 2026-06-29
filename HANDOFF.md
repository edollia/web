# doll.gg /rooms Handoff

## What This Is

`/rooms` is a static browser app for live voice/video/chat rooms on doll.gg.
It uses:

- Static HTML/CSS/JS in `rooms/`
- Supabase tables, RLS, Realtime, and Edge Functions
- LiveKit for voice, video, and screen share
- `admin/rooms/` plus `supabase/functions/admin-rooms` for recovery tools

There is no Supabase Auth for normal room users. A room host is authorized by a
private host key returned once by `create-room` and stored in localStorage. The
database stores only a SHA-256 hash in `room_host_keys`.

## Main Files

- `rooms/index.html`: static markup and CSP.
- `rooms/rooms.css`: lobby, room shell, dock, chat, media, mobile layout.
- `rooms/rooms.js`: SPA state, Supabase Realtime, LiveKit lifecycle, chat, media, moderation.
- `rooms/schema.sql`: idempotent Supabase migration.
- `supabase/functions/create-room`: creates rooms and host keys.
- `supabase/functions/room-token`: mints LiveKit tokens and enforces locks, bans, audience mode.
- `supabase/functions/room-control`: verified host mutations, bans, moderation events, LiveKit participant enforcement.
- `supabase/functions/end-room`: verified host room close plus LiveKit room deletion.
- `supabase/functions/admin-rooms`: authenticated admin recovery API.
- `admin/rooms/index.html`: admin UI for listing, inspecting, force-closing, cleanup.

## Database

Tables:

- `rooms`: public room metadata. `host_session_id` is retained for diagnostics/back-compat, but is not authority.
- `room_host_keys`: private host-key hashes. No browser access.
- `room_messages`: persisted text chat, deleted when a room ends.
- `room_bans`: room/global bans. No browser access.
- `room_moderation_events`: trusted service-inserted mute/kick/ban events delivered by Realtime.

Important RLS posture:

- Browser clients can select public `rooms`.
- Browser clients cannot insert or update `rooms`; use `create-room` and `room-control`.
- Browser clients can select/insert `room_messages` only while the room is active and the inserted session/name are not banned.
- Browser clients cannot select or insert `room_bans`.
- Browser clients can select `room_moderation_events` but cannot insert them.
- Service-role Edge Functions bypass RLS and are the authority layer.

## Host And Moderation Flow

1. Client calls `create-room` with slug/title/nickname/sessionId.
2. Function creates the `rooms` row, creates a random host key, stores its hash in `room_host_keys`, and returns `{ room, hostKey }`.
3. Client stores host keys in localStorage under `dg_rooms_host_keys`.
4. Host-only actions call `room-control` with `{ roomSlug, hostKey }`.
5. `room-control` verifies the hash before updating title/lock/audience/member_count/previews, writing bans, inserting moderation events, or changing LiveKit participant permissions.
6. Guests receive room metadata through `rooms` Realtime updates and moderation through `room_moderation_events`.

Do not reintroduce host authorization based on `host_session_id`. It is public.

## LiveKit Flow

- `room-token` verifies room status, lock state, bans, and host key.
- Locked rooms require a valid host key.
- Audience mode is enforced server-side for LiveKit publish permission: host can publish, guests cannot.
- `room-control` updates LiveKit permissions when audience mode changes and when a host mutes/unmutes someone.
- `room-control` removes LiveKit participants for kick/ban actions.
- `end-room` deletes the LiveKit room after the database room is marked ended.
- The mic model intentionally keeps the microphone track acquired once enabled; muting disables transmission without releasing the device.
- On reconnect failure, `wantsMic` keeps the restore intent while `micOn` stays false until LiveKit is back.

## Chat And Images

- Text messages are persisted in `room_messages`.
- Chat history loads the latest 50 messages and renders them oldest-to-newest.
- Ephemeral image messages are broadcast only over the presence channel and are never stored in Supabase.
- Image upload validates MIME, caps at 15 MB, and canvas re-encodes to strip EXIF.
- User strings must go through `escHtml()` before DOM insertion.
- Accent/color values must go through `safeAccent()` before inline style usage.

## Admin

`admin/rooms/` authenticates with a passcode gate plus Supabase Auth. The
`admin-rooms` Edge Function verifies the JWT against a hardcoded admin UID and
uses the service role for list, inspect, force-close, and cleanup actions.

## Local Run

From repo root:

```sh
python3 -m http.server 8421
```

Open `http://localhost:8421/rooms/`. Edge Function CORS allows
`localhost:8421` and `127.0.0.1:8421`.

## Deploy Checklist

- Run the full `rooms/schema.sql` in Supabase SQL Editor.
- Deploy Edge Functions: `create-room`, `room-control`, `room-token`, `end-room`, `admin-rooms`.
- Confirm secrets on functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` for `room-token`, `room-control`, and `end-room`.
- Confirm `supabase_realtime` publication includes `rooms`, `room_messages`, and `room_moderation_events`.
- Confirm `pg_cron` is enabled if relying on scheduled `purge_stale_rooms`.
- Confirm CSP in `rooms/index.html` still allows the Supabase and LiveKit origins.

## Known Remaining Risks

- Normal room users still have no durable account identity.
- Text chat has client-side cooldown but no server-side rate limit.
- LiveKit admin enforcement is best-effort logged. If LiveKit admin secrets are missing, DB state still updates but SFU-level enforcement will not happen.
- Old active rooms created before host-key deployment may not be host-controllable.

## Do Not Casually Break

- Do not store avatars or chat images in Supabase.
- Do not trust Realtime broadcasts for authority decisions.
- Do not expose or select host-key hashes in browser code.
- Do not use `host_session_id` as proof of host.
- Keep schema changes idempotent with `DROP POLICY IF EXISTS` and guarded `ALTER`s.
