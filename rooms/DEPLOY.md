# Rooms — deploy runbook

Everything you need to run to push the latest rooms changes live. **Frontend files
(`rooms/*.js`, `*.css`, `*.html`) need no deploy** — they're served statically; just
publish the repo as usual. Only the **Supabase edge functions** (and any **SQL**)
below require a manual deploy.

Project ref: `karogcjefsnnrvlxlgpf`

---

## 0. One-time prereqs
```bash
# Install once (Homebrew shown; see supabase.com/docs for other OSes)
brew install supabase/tap/supabase

# Auth + link this repo to the project (once per machine)
supabase login
supabase link --project-ref karogcjefsnnrvlxlgpf
```

## 1. Deploy the edge functions
Run these from the repo root. **Redeploy the four marked ⚠️ — they changed and are
currently stale in production.**

```bash
# ⚠️ changed — cleanPreviews now keeps the `s` (cam/screen) flag → lobby "live" dot,
#    and errors are sanitized
supabase functions deploy room-control --project-ref karogcjefsnnrvlxlgpf

# ⚠️ changed — sanitized error responses
supabase functions deploy create-room  --project-ref karogcjefsnnrvlxlgpf
supabase functions deploy room-token   --project-ref karogcjefsnnrvlxlgpf
supabase functions deploy end-room     --project-ref karogcjefsnnrvlxlgpf

# unchanged — deploy only if you're unsure it's current
supabase functions deploy admin-rooms  --project-ref karogcjefsnnrvlxlgpf
```

Or just deploy everything in one go (safe — idempotent):
```bash
supabase functions deploy --project-ref karogcjefsnnrvlxlgpf
```

## 2. Verify
- Lobby: with someone on cam/screen in a room, that room's card shows the pulsing **live** dot.
- Host taps the room title → renames → other people in the room see the new title live.
- Trigger an error path (e.g. bad request) → the response says `internal error`, not a raw stack.

---

## 3. SQL to run
Run any SQL below in the Supabase SQL editor (Dashboard → SQL), top to bottom.

**Nothing new in this batch** — no schema changes were made. When a change adds SQL,
the complete, copy-pasteable statement(s) will be appended here at the very end.

<!-- NEW SQL GOES BELOW THIS LINE (full, copy-paste-ready) -->
