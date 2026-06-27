-- ══════════════════════════════════════════════════════════════
--  doll.gg /voice — Phase 2 Supabase schema
--  Run this in your Supabase SQL Editor (once).
-- ══════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text        NOT NULL UNIQUE,
  title            text,
  status           text        NOT NULL DEFAULT 'active'  CHECK (status IN ('active','ended')),
  locked           boolean     NOT NULL DEFAULT false,
  audience_mode    boolean     NOT NULL DEFAULT false,
  host_nickname    text        NOT NULL,
  host_session_id  text        NOT NULL,
  host_accent      text,
  member_count     int         NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz
);

CREATE TABLE IF NOT EXISTS room_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname    text        NOT NULL,
  session_id  text        NOT NULL,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  hidden      boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_bans (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid        REFERENCES rooms(id) ON DELETE CASCADE, -- null = global
  type       text        NOT NULL CHECK (type IN ('session','nickname')),
  value      text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rooms_status       ON rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_slug         ON rooms (slug);
CREATE INDEX IF NOT EXISTS idx_messages_room      ON room_messages (room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bans_lookup        ON room_bans (room_id, type, value) WHERE is_active;

-- ── Enable Row Level Security ────────────────────────────────────

ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bans     ENABLE ROW LEVEL SECURITY;

-- Open policies: app code handles all filtering (status='active', hidden=false, etc.)
-- Per-command SELECT policies with status filters bleed into UPDATE's WITH CHECK
-- and prevent updating status → 'ended', so we use FOR ALL instead.
CREATE POLICY "rooms_open" ON rooms        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "msgs_open"  ON room_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bans_open"  ON room_bans     FOR ALL USING (true) WITH CHECK (true);

-- ── Enable Realtime ──────────────────────────────────────────────
-- (also go to Table Editor → rooms → Enable Realtime toggle in Supabase dashboard)

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
