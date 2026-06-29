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

## Presence And Participant List

Presence is event-driven — there is no heartbeat interval. `sbJoinPresence(slug)` in
`rooms.js` creates a Supabase Realtime presence channel and calls
`channel.track(buildPresencePayload())` once when the channel status becomes `SUBSCRIBED`.
After that, presence is updated only on explicit state changes: mic toggle
(`_syncMicPresence`), camera/screen toggle (`_syncSharingPresence`), host-issued server
mute, identity edit, or ghost-mode toggle.

`buildPresencePayload()` sends: nickname, role, muted, serverMuted, sharing
(`null`/`'cam'`/`'screen'`), accent, avatar data-URL, sessionId.

Self is pre-inserted into `state.participants` before the subscription is established so
the first render is not blank. A race-condition guard re-inserts self if the first
presence sync fires before `track()` completes (Supabase can deliver an empty sync
immediately).

Host-only: the member count and participant previews in the `rooms` row are updated on
every presence sync, debounced 2 s via `_memberCountTimer`, through
`sbUpdateRoom → room-control`. This requires a valid host key in localStorage.

Stale participants (disconnected without calling `untrack()`) are removed after the
Supabase Realtime WebSocket times out (~30 s). The `pagehide` event calls `untrack()`
synchronously to remove the user immediately for others.

## Reconnect Logic

LiveKit has its own internal reconnect. On top of that, `lkOnDisconnected()` in
`rooms.js` runs a custom backoff when `RoomEvent.Disconnected` fires:

```
_LK_RECONNECT_DELAYS = [2000, 5000, 10000]  // ~17 s total
```

Each call to `lkOnDisconnected` either schedules the next attempt or, on exhaustion,
removes the user from presence and shows a manual "Rejoin" banner.

State during reconnect:
- `state.media.micOn` is set to `false` immediately on disconnect.
- `state.media.wantsMic` retains the user's intent (true if mic was on before disconnect).
- `state.media.cameraOn` and `screenOn` are set to `false`.
- The mic button shows `mic-disconnected` (disabled, dimmed) while `state._lkRoom` is null.

On reconnect success:
- `lkConnect` calls `setMic(true, { silent: true })` if `wantsMic` is true.
- `sbTrackPresence({})` is called to reappear in others' participant lists.
- `_lkReconnectAttempt` is reset to 0.

`lkOnConnectionState()` also handles `ConnectionState.Reconnecting` from LiveKit's own
layer, showing a separate "Reconnecting to voice…" banner.

## Device Selection

`populateDevices()` enumerates `navigator.mediaDevices.enumerateDevices()`. It is called
after the first microphone permission grant (device labels are empty before permission).
It also runs on the `devicechange` event (hot-plug/unplug).

- Fills `<select>` elements for mic, camera, and speaker in the settings panel.
- On iOS Safari, `audiooutput` returns zero entries; the speaker select is hidden.
- Device IDs are stored in `state.settings.micDeviceId`, `cameraDeviceId`,
  `speakerDeviceId` and applied on next track publish.

`flipCamera()` detects multiple cameras via `hasMultipleCameras`. On toggle it
unpublishes the current camera track and republishes with the opposite
`facingMode` (`'user'` / `'environment'`). Falls back to browser default if the exact
deviceId fails.

## Database Triggers

All triggers are in `rooms/schema.sql` and recreated idempotently with `CREATE OR REPLACE`.

- **`trg_prevent_room_reopen`** (BEFORE UPDATE on `rooms`): raises an exception if
  `status` changes from `'ended'` to anything else. Prevents any service-role path from
  reopening a closed room.

- **`trg_prevent_host_field_change`** (BEFORE UPDATE on `rooms`): raises an exception if
  `host_session_id` or `host_nickname` are changed after creation. These fields are
  display/diagnostics only; authorization uses `room_host_keys`.

- **`trg_on_room_ended`** (AFTER UPDATE on `rooms`, SECURITY DEFINER): fires when
  `status` transitions from `'active'` to `'ended'`. Immediately deletes all
  `room_messages` rows for the room. Runs before Realtime delivers the update to clients,
  so chat is gone by the time guests receive the end notification.

- **`purge_stale_rooms()`** (pg_cron, every 5 min): marks rooms older than 2 hours as
  ended; deletes ended rooms older than 1 hour after ending (cascade removes messages and
  bans); expires bans older than 7 days. Runs as the `postgres` role, bypassing RLS.
  Requires `pg_cron` enabled in Supabase dashboard → Database → Extensions.

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

## Manual Testing Checklist

Paths that must be verified in a real browser — no unit tests cover these:

1. **Create room**: host key appears in localStorage (`dg_rooms_host_keys`).
2. **Join locked room as guest**: must fail with "room is locked" error.
3. **Join locked room as host** (correct localStorage key): must succeed.
4. **Host mutes guest**: guest's mic button locks; LiveKit publish permission revoked by `room-control`.
5. **Host kicks guest**: guest sees "You were removed" banner and returns to lobby; LiveKit participant removed.
6. **Host bans guest**: guest can't rejoin (ban checked at token time in `room-token`).
7. **Camera toggle**: track unpublishes (others lose the video tile) and republishes (tile reappears).
8. **Mic mute**: OS mic indicator stays active (device kept acquired); others see the muted badge.
9. **Screen share**: track publishes and appears in the screen share area for all participants.
10. **Reconnect**: disable network for 5–20 s; should auto-reconnect and restore mic state.
11. **Reconnect exhaustion**: disable network for 30+ s; mic button goes disabled; "Rejoin" banner appears.
12. **Leave confirmation**: turn on camera, press Leave — should show "end?" and a banner before actual leave.
13. **Tab close while hosting**: room should be marked ended within seconds (keepalive fetch); `purge_stale_rooms` is the fallback after 2 h.
14. **Admin force-close**: room marked ended, guests see "host ended this room", LK room deleted.
15. **Migration (pre-host-key rooms)**: admin force-close works; host cannot close via normal flow (expect 403 logged silently).
16. **pagehide cleanup**: mic/camera OS indicator goes dark immediately on tab close.
17. **Image send**: appears in chat for all participants; not persisted after room ends.
18. **Schema rerun**: paste full `rooms/schema.sql` into Supabase SQL Editor; must complete with no errors.

## Deploy Checklist

- Run the full `rooms/schema.sql` in Supabase SQL Editor.
- Deploy Edge Functions: `create-room`, `room-control`, `room-token`, `end-room`, `admin-rooms`.
- Confirm secrets on functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` for `room-token`, `room-control`, and `end-room`.
- Confirm `supabase_realtime` publication includes `rooms`, `room_messages`, and
  `room_moderation_events`. Without `room_moderation_events`, host mute/kick/ban events
  will not be delivered to guests.
- Confirm `pg_cron` is enabled (Supabase dashboard → Database → Extensions) for
  `purge_stale_rooms` to run automatically.
- Confirm `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set as Edge
  Function secrets on `room-token`, `room-control`, and `end-room`. Without them,
  LiveKit SFU enforcement silently degrades (DB state updates but participants are not
  removed from the call).
- Confirm CSP in `rooms/index.html` still allows the Supabase and LiveKit origins.
- RLS enabled (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`) on all five tables: `rooms`,
  `room_host_keys`, `room_messages`, `room_bans`, `room_moderation_events`. The schema
  migration sets this, but verify in Supabase dashboard → Table Editor if in doubt.

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
