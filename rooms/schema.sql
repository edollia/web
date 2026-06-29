-- ══════════════════════════════════════════════════════════════════
--  doll.gg /rooms — Supabase schema (idempotent migration)
--  Safe to run multiple times on a fresh or existing database.
--
--  Run in the Supabase SQL Editor → paste the whole file and click Run.
--  Every section is guarded so re-runs are no-ops, not errors.
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- ── §1  TABLES ─────────────────────────────────────────────────────
-- CREATE TABLE IF NOT EXISTS is already idempotent.
-- Inline constraints only apply on first creation; §2 adds them to
-- pre-existing tables via guarded ALTER TABLE.

CREATE TABLE IF NOT EXISTS rooms (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text        NOT NULL UNIQUE,
  title            text,
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','ended')),
  locked           boolean     NOT NULL DEFAULT false,
  audience_mode    boolean     NOT NULL DEFAULT false,
  host_nickname    text        NOT NULL,
  host_session_id  text        NOT NULL,
  host_accent      text,
  member_count     int         NOT NULL DEFAULT 1 CHECK (member_count >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  CONSTRAINT rooms_ended_at_valid
    CHECK (ended_at IS NULL OR ended_at >= created_at)
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
  room_id    uuid        REFERENCES rooms(id) ON DELETE CASCADE, -- NULL = global ban
  type       text        NOT NULL CHECK (type IN ('session','nickname')),
  value      text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── §2  ADD CONSTRAINTS TO EXISTING TABLES ─────────────────────────
-- These are no-ops if the constraint already exists.

DO $$
BEGIN
  -- rooms: member_count must not go negative
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rooms_member_count_nonneg'
      AND conrelid = 'rooms'::regclass
  ) THEN
    ALTER TABLE rooms
      ADD CONSTRAINT rooms_member_count_nonneg CHECK (member_count >= 0);
  END IF;

  -- rooms: ended_at must not precede created_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rooms_ended_at_valid'
      AND conrelid = 'rooms'::regclass
  ) THEN
    ALTER TABLE rooms
      ADD CONSTRAINT rooms_ended_at_valid
        CHECK (ended_at IS NULL OR ended_at >= created_at)
        NOT VALID; -- validate in background so existing data can't break this
  END IF;
END $$;

-- Lobby bubble previews: accent + initial only, never photos (data URLs never hit Supabase)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'participant_previews'
  ) THEN
    ALTER TABLE rooms ADD COLUMN participant_previews jsonb;
  END IF;
END $$;

-- ── §3  INDEXES ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rooms_status
  ON rooms (status);

CREATE INDEX IF NOT EXISTS idx_rooms_slug
  ON rooms (slug);

CREATE INDEX IF NOT EXISTS idx_rooms_host_session
  ON rooms (host_session_id);

CREATE INDEX IF NOT EXISTS idx_rooms_created_at
  ON rooms (created_at);

CREATE INDEX IF NOT EXISTS idx_rooms_ended_at
  ON rooms (ended_at) WHERE ended_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_room
  ON room_messages (room_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_session
  ON room_messages (session_id);

CREATE INDEX IF NOT EXISTS idx_bans_lookup
  ON room_bans (room_id, type, value) WHERE is_active;

-- Unique room-scoped bans: prevent duplicate ban records per room.
-- NULL room_id values (global bans) are excluded — handled by separate index below.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bans_unique_room
  ON room_bans (room_id, type, value)
  WHERE room_id IS NOT NULL;

-- Unique global bans (room_id IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_bans_unique_global
  ON room_bans (type, value)
  WHERE room_id IS NULL;

-- ── §4  ROW LEVEL SECURITY — ENABLE ────────────────────────────────
-- ENABLE ROW LEVEL SECURITY is idempotent (no-op if already enabled).

ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bans     ENABLE ROW LEVEL SECURITY;

-- ── §5  RLS POLICIES ───────────────────────────────────────────────
-- Always DROP IF EXISTS before CREATE so re-runs never fail with
-- "policy already exists".  Every policy is re-created from scratch.

-- ── rooms ──

DROP POLICY IF EXISTS "rooms_open"   ON rooms;  -- legacy catch-all
DROP POLICY IF EXISTS "rooms_select" ON rooms;
DROP POLICY IF EXISTS "rooms_insert" ON rooms;
DROP POLICY IF EXISTS "rooms_update" ON rooms;
DROP POLICY IF EXISTS "rooms_delete" ON rooms;

-- SELECT: all rows visible to anon clients.
-- Required so that Supabase Realtime delivers the status→'ended' event
-- to guests watching a room; if we filtered on status='active' here,
-- the realtime UPDATE payload would be suppressed and guests would never
-- see the "host ended the room" notification.
CREATE POLICY "rooms_select" ON rooms
  FOR SELECT
  USING (true);

-- INSERT: only valid, active rooms.  Prevents clients from inserting
-- pre-ended rooms or rooms with empty host identity fields.
CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT
  WITH CHECK (
    status          = 'active'
    AND member_count >= 1
    AND length(trim(coalesce(host_session_id, ''))) > 0
    AND length(trim(coalesce(host_nickname,   ''))) > 0
  );

-- UPDATE: anon clients may update metadata of active rooms (title, locked,
-- audience_mode, member_count) but CANNOT change status.  Ending a room
-- goes through the end-room Edge Function (service role, verified host).
CREATE POLICY "rooms_update" ON rooms
  FOR UPDATE
  USING    (status = 'active')   -- can only target active rows
  WITH CHECK (status = 'active'); -- status must stay 'active'; only service role can set 'ended'

-- DELETE: blocked for anon clients.  Cleanup is server-side only:
-- purge_stale_rooms() runs under the postgres role (pg_cron) which
-- bypasses RLS, and ON DELETE CASCADE handles child rows.
CREATE POLICY "rooms_delete" ON rooms
  FOR DELETE
  USING (false);

-- ── room_messages ──

DROP POLICY IF EXISTS "msgs_open"    ON room_messages;
DROP POLICY IF EXISTS "msgs_select"  ON room_messages;
DROP POLICY IF EXISTS "msgs_insert"  ON room_messages;
DROP POLICY IF EXISTS "msgs_update"  ON room_messages;
DROP POLICY IF EXISTS "msgs_delete"  ON room_messages;

CREATE POLICY "msgs_select" ON room_messages
  FOR SELECT
  USING (true);

-- INSERT: only allowed while the room is active.  Prevents clients from
-- writing messages into already-closed rooms.
CREATE POLICY "msgs_insert" ON room_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE  id = room_id AND status = 'active'
    )
  );

-- UPDATE: no client-side message editing.
CREATE POLICY "msgs_update" ON room_messages
  FOR UPDATE
  USING (false);

-- DELETE: the host's sbEndRoom cleanup path is allowed only after the
-- room has been marked ended.  The trg_on_room_ended trigger (§6) runs
-- first within the same UPDATE transaction, so by the time the app
-- issues its separate DELETE call the room is already 'ended' and this
-- policy passes (with 0 rows remaining to delete).
-- Server-side pg_cron bypasses RLS entirely.
CREATE POLICY "msgs_delete" ON room_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE  id = room_id AND status = 'ended'
    )
  );

-- ── room_bans ──

DROP POLICY IF EXISTS "bans_open"    ON room_bans;
DROP POLICY IF EXISTS "bans_select"  ON room_bans;
DROP POLICY IF EXISTS "bans_insert"  ON room_bans;
DROP POLICY IF EXISTS "bans_update"  ON room_bans;
DROP POLICY IF EXISTS "bans_delete"  ON room_bans;

CREATE POLICY "bans_select" ON room_bans
  FOR SELECT
  USING (true);

-- INSERT: hosts can add bans (the app limits this to host role client-side;
-- no auth means we can't enforce it at the DB level without Supabase Auth).
CREATE POLICY "bans_insert" ON room_bans
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: no client-side ban editing.
CREATE POLICY "bans_update" ON room_bans
  FOR UPDATE
  USING (false);

-- DELETE: server-side cleanup only (purge_stale_rooms, CASCADE).
CREATE POLICY "bans_delete" ON room_bans
  FOR DELETE
  USING (false);

-- ── §6  FUNCTIONS & TRIGGERS ───────────────────────────────────────

-- 6a. Prevent reopening an ended room.
--     Runs BEFORE every UPDATE so no host-identity bypass is possible.
--     The "rooms_update" RLS policy (USING status='active') already
--     blocks anon clients from targeting ended rows, but this trigger
--     is a server-side guard for service-role or future server paths.
CREATE OR REPLACE FUNCTION prevent_room_reopen()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'ended' AND NEW.status != 'ended' THEN
    RAISE EXCEPTION 'room % cannot be reopened once ended', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_room_reopen ON rooms;
CREATE TRIGGER trg_prevent_room_reopen
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION prevent_room_reopen();

-- 6b. Prevent host identity from being changed after room creation.
--     host_session_id and host_nickname are set once on INSERT and must
--     never change (they are the only identity anchor we have without
--     Supabase Auth).
CREATE OR REPLACE FUNCTION prevent_host_field_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.host_session_id IS DISTINCT FROM OLD.host_session_id
     OR NEW.host_nickname IS DISTINCT FROM OLD.host_nickname
  THEN
    RAISE EXCEPTION 'host_session_id and host_nickname are immutable after room creation'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_host_field_change ON rooms;
CREATE TRIGGER trg_prevent_host_field_change
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION prevent_host_field_change();

-- 6c. Server-side cleanup when a room is ended.
--     Fires AFTER the status transition commits.  SECURITY DEFINER
--     means it runs as the function owner (postgres) and bypasses RLS,
--     so the message delete succeeds regardless of the msgs_delete
--     policy.  This is the primary cleanup path; the host's explicit
--     DELETE call in sbEndRoom is belt-and-suspenders.
CREATE OR REPLACE FUNCTION on_room_ended()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'ended' THEN
    -- Immediately purge chat history.
    DELETE FROM room_messages WHERE room_id = NEW.id;
    -- Bans stay active for the room's lifetime and are expired by
    -- purge_stale_rooms() after 7 days.
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_room_ended ON rooms;
CREATE TRIGGER trg_on_room_ended
  AFTER UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION on_room_ended();

-- ── §7  SCHEDULED PURGE FUNCTION ───────────────────────────────────
-- Safety net for rooms whose host vanished without calling leaveRoom.
-- Called by pg_cron every 5 minutes; also callable manually.
-- SECURITY DEFINER runs as postgres (bypasses RLS) so it can delete
-- rooms even though the "rooms_delete" policy blocks anon clients.

CREATE OR REPLACE FUNCTION purge_stale_rooms()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  -- Mark abandoned active rooms as ended.  trg_on_room_ended fires for
  -- each row and deletes its messages within the same transaction.
  UPDATE rooms
    SET    status   = 'ended',
           ended_at = now()
  WHERE  status   = 'active'
    AND  created_at < now() - interval '2 hours';

  -- Delete ended rooms 1 hour after they closed.
  -- ON DELETE CASCADE removes any remaining room_messages and room_bans.
  DELETE FROM rooms
  WHERE  status = 'ended'
    AND  coalesce(ended_at, created_at) < now() - interval '1 hour';

  -- Belt-and-suspenders: trim any orphaned messages older than 12 hours
  -- (catches edge cases where the trigger didn't run, e.g. partial failures).
  DELETE FROM room_messages
  WHERE  created_at < now() - interval '12 hours';

  -- Expire old ban records.
  DELETE FROM room_bans
  WHERE  created_at < now() - interval '7 days';
$$;

-- ── §8  REALTIME PUBLICATION ────────────────────────────────────────
-- Guarded so re-running doesn't throw "relation already exists in publication".

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
      AND  tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
      AND  tablename = 'room_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
  END IF;
END $$;

-- ── §9  pg_cron SCHEDULE ────────────────────────────────────────────
-- Enable the "pg_cron" extension first in Supabase:
--   Database → Extensions → search pg_cron → enable
-- Safe to skip if pg_cron is not available; call purge_stale_rooms()
-- manually instead.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('purge_stale_rooms');
    EXCEPTION WHEN OTHERS THEN NULL; -- job not yet scheduled; ignore
    END;
    PERFORM cron.schedule(
      'purge_stale_rooms',
      '*/5 * * * *',
      'SELECT purge_stale_rooms()'
    );
  END IF;
END $$;

COMMIT;
