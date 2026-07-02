# /rooms — deploy guide for §8 lock-chat · §9 pinned banner · §10 now-playing

These three features are **code-complete in this repo but dormant** until you
apply the Supabase pieces below. Nothing here is auto-deployed; the client is
written so that shipping it *before* you deploy changes nothing (the columns read
`undefined`, controls stay hidden, guards never trip). Do the steps in order.

The visual redesign (Phases 1–4 + the nuance sweep + the §10 volume slider UI)
is already live and needs none of this.

---

## What's already in the repo

| Piece | State |
|---|---|
| `schema.sql` migration (chat_locked, pinned_in_lobby, now_playing_*, RLS) | ✅ appended, idempotent |
| §8 client: toggle, lock UI, send-guard, realtime handler | ✅ wired, dormant (`updateChatLockUI` / `toggleChatLock`) |
| §9 client: `renderPinnedBanner()` render + card de-dupe | ✅ wired, dormant |
| §10 client: volume slider + `setNowPlaying()` audio hookup | ✅ **live** (UI); audio source still gated on CSP |
| room-control Edge Function changes | ❌ you deploy (not in repo) |
| §8 `postMessage` Edge Function action | ❌ you deploy (not in repo) |
| ROOM_SELECT / mapper column additions | ❌ one-line activations below |
| §9 admin "pin to lobby" toggle control | ❌ small UI TODO (see §9) |
| §10 host "set now playing" control + real audio | ❌ needs a CSP/source decision |

---

## Step 1 — Database (all three)

Run `rooms/schema.sql` against the project (it's idempotent — safe to re-run), or
just the `§8/§9/§10 REDESIGN FEATURE COLUMNS` block at the bottom. This adds
`chat_locked`, `pinned_in_lobby`, `now_playing_kind/title/source/art`, and
re-creates `can_insert_room_message()` with `AND NOT chat_locked`.

> ⚠️ **§8 ordering footgun:** once the RLS change is live, a locked chat blocks
> **every** direct insert — including the host's. Do **not** ship §8 to users
> until Step 2's `postMessage` action **and** Step 3's host-send routing are both
> in place, or the host won't be able to post while locked. §9 and §10 have no
> such coupling and are safe to deploy independently.

## Step 2 — Edge Function `room-control` (deployed in Supabase, not in repo)

1. **`update` action allowlist** — add: `chat_locked`, `pinned_in_lobby`,
   `now_playing_kind`, `now_playing_title`, `now_playing_source`, `now_playing_art`.
2. **§9 admin guard** — only honor `pinned_in_lobby` when the caller is a verified
   admin (`adminJwt`) **and** the room's `host_is_admin` is true. Reject otherwise.
3. **§8 `postMessage` action (new)** — host-key/adminJwt-verified; inserts a
   `room_messages` row with the service role (bypasses RLS) so the host can post
   into a locked chat. Same shape as the existing insert.

## Step 3 — Client activation (`rooms/rooms.js`)

1. `ROOM_SELECT` (near line 20) — append the columns you deployed:
   `chat_locked, pinned_in_lobby, host_is_admin, now_playing_kind, now_playing_title, now_playing_source`.
   (`host_is_admin` already exists in the DB but isn't currently selected; §9 needs it.)
2. Room mapper (`mapRoom`, ~line 378) — add matching fields, e.g.
   `chat_locked: r.chat_locked, pinned_in_lobby: r.pinned_in_lobby, host_is_admin: r.host_is_admin`,
   and `setNowPlaying({ title: r.now_playing_title, source: r.now_playing_source })`
   when `r.now_playing_kind` is set.
3. **§8 host send** — in `sendMessage()` / `sbSendMessage()`, when
   `state.room.chat_locked && role === 'host'`, route through the Step-2
   `postMessage` Edge Function instead of the direct `sb.from('room_messages').insert`.
4. Realtime `onUpdated` already applies `chat_locked` and (via mapper) now-playing;
   `updateChatLockUI()` and `renderPinnedBanner()` light up automatically.

## Remaining UI TODOs (not built — need a product call)

- **§9 pin toggle** — a control to *set* `pinned_in_lobby` (render side is done).
  Suggested: an admin-only row in the settings panel, or a `dock-ctrl admin-ctrl`
  button, shown only when `state.user.isAdmin`; on toggle → `sbUpdateRoom(slug, { pinned_in_lobby })`.
- **§10 set-now-playing** — a host control to set `now_playing_*`, and the audio
  source itself. **CSP note:** `media-src blob: mediastream:` blocks external
  audio/stream URLs — real playback needs either a blob/MediaStream source or a
  CSP relaxation (get sign-off; see spec §10). The volume slider already controls
  `#np-audio` once a permitted source is attached via `setNowPlaying({ mediaStream })`
  or `setNowPlaying({ audioSrc: 'blob:…' })`.

## Test matrix

- **§8**: host locks → non-hosts blocked + see "chat locked by host"; host can still
  post (via EF); unlock restores; `locked` and `chat_locked` independent; no CSP errors.
- **§9**: admin pins → banner shows for all viewers, its normal card disappears;
  non-admin pin attempt rejected by the EF; unpin → back to a normal card.
- **§10**: now-playing text + vinyl show; volume slider + mute persist across reload;
  banner hidden when `now_playing_kind` is null.
