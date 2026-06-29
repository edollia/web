// doll.gg /rooms — admin recovery tools
// Auth: Supabase JWT (Bearer token from rooms project session).
//       Only UID 9ea1a89e-5a00-4b91-b98c-d69a5e383df4 is allowed.
//       Verified server-side via auth.getUser() with the service role key.
//
// Secrets required (all auto-provided by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Actions: list-recent, list-stale, inspect, force-close, cleanup

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://doll.gg', 'https://www.doll.gg',
  'http://localhost:8421', 'http://127.0.0.1:8421',
])
const ADMIN_UID       = '9ea1a89e-5a00-4b91-b98c-d69a5e383df4'
const STALE_HOURS     = 3

function buildCors(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.has(origin) ? origin : 'https://doll.gg',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

serve(async (req) => {
  const CORS = buildCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  // ── Server-side auth: verify the Supabase JWT ────────────────────
  // Use service role key for admin operations; separately verify the
  // caller's identity by checking their JWT against the auth system.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'unauthorized' }, 401)

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // getUser() validates the JWT signature against Supabase Auth — no spoofing.
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return json({ error: 'unauthorized' }, 401)
  if (user.id !== ADMIN_UID) return json({ error: 'forbidden' }, 403)

  try {
    const { action, roomSlug } = await req.json()

    // ── list-recent ───────────────────────────────────────────────
    if (action === 'list-recent') {
      const { data, error } = await sb.from('rooms')
        .select('id, slug, title, status, member_count, created_at, ended_at, host_nickname, locked, audience_mode')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return json({ rooms: data ?? [] })
    }

    // ── list-stale ────────────────────────────────────────────────
    if (action === 'list-stale') {
      const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()
      const { data, error } = await sb.from('rooms')
        .select('id, slug, title, status, member_count, created_at, host_nickname')
        .eq('status', 'active')
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true })
      if (error) throw error
      return json({ stale: data ?? [], staleHours: STALE_HOURS })
    }

    // ── inspect ───────────────────────────────────────────────────
    if (action === 'inspect') {
      if (!roomSlug) return json({ error: 'roomSlug required' }, 400)
      const { data: room, error } = await sb.from('rooms')
        .select('id, slug, title, status, locked, audience_mode, member_count, created_at, ended_at, host_nickname, host_accent, participant_previews')
        .eq('slug', roomSlug)
        .single()
      if (error || !room) return json({ error: 'room not found' }, 404)

      const { count: msgCount } = await sb.from('room_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id)

      const { count: banCount } = await sb.from('room_bans')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .eq('is_active', true)

      return json({ room, msgCount: msgCount ?? 0, banCount: banCount ?? 0 })
    }

    // ── force-close ───────────────────────────────────────────────
    if (action === 'force-close') {
      if (!roomSlug) return json({ error: 'roomSlug required' }, 400)
      const { data: room, error } = await sb.from('rooms')
        .select('id, status')
        .eq('slug', roomSlug)
        .single()
      if (error || !room) return json({ error: 'room not found' }, 404)
      if (room.status === 'ended') return json({ ok: true, note: 'already ended' })

      const { error: updateErr } = await sb.from('rooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', room.id)
      if (updateErr) throw updateErr
      return json({ ok: true, slug: roomSlug })
    }

    // ── cleanup ───────────────────────────────────────────────────
    if (action === 'cleanup') {
      const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()
      const { data: stale, error: listErr } = await sb.from('rooms')
        .select('id, slug')
        .eq('status', 'active')
        .lt('created_at', cutoff)
      if (listErr) throw listErr

      const closed: string[] = []
      for (const r of stale ?? []) {
        const { error } = await sb.from('rooms')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', r.id)
        if (!error) closed.push(r.slug)
      }

      // Purge messages from rooms ended more than 24h ago that slipped through cleanup
      const msgCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { error: msgErr, count: msgsPurged } = await sb.from('room_messages')
        .delete({ count: 'exact' })
        .lt('created_at', msgCutoff)

      return json({
        closed,
        closedCount: closed.length,
        msgsPurged: msgsPurged ?? 0,
        msgPurgeError: msgErr ? String(msgErr) : null,
      })
    }

    return json({ error: 'unknown action' }, 400)

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
