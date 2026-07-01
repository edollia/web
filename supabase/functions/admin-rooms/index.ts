// doll.gg /rooms — admin recovery tools
// Auth: Supabase JWT (Bearer token from rooms project session).
//       Only UID 9ea1a89e-5a00-4b91-b98c-d69a5e383df4 is allowed.
//       Verified server-side via auth.getUser() with the service role key.
//
// Secrets required (all auto-provided by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
//
// Actions: list-recent, list-stale, inspect, force-close, cleanup,
//          set-lockdown, force-close-all, list-bans, add-ban, remove-ban,
//          list-participants, remove-participant

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://doll.gg', 'https://www.doll.gg',
  'http://localhost:8421', 'http://127.0.0.1:8421',
])
const ADMIN_UID       = '9ea1a89e-5a00-4b91-b98c-d69a5e383df4'
const STALE_HOURS     = 3  // SQL purge_stale_rooms() auto-closes at 2h; admin panel shows 3h+ as stale for manual review

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function liveKitHttpUrl(): string {
  return (Deno.env.get('LIVEKIT_URL') ?? '')
    .replace(/^wss:/, 'https:')
    .replace(/^ws:/, 'http:')
    .replace(/\/+$/, '')
}

async function mintLiveKitRoomToken(roomName: string): Promise<string | null> {
  const apiKey = Deno.env.get('LIVEKIT_API_KEY')
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
  if (!apiKey || !apiSecret) return null
  const enc = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: apiKey, sub: `admin-rooms-${crypto.randomUUID()}`,
    jti: crypto.randomUUID(), nbf: now, exp: now + 60,
    video: { roomCreate: true, roomAdmin: true, room: roomName },
  }
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const msg  = `${head}.${body}`
  const key  = await crypto.subtle.importKey(
    'raw', enc.encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg))))
  return `${msg}.${sig}`
}

async function callLiveKit(method: string, roomName: string, body: Record<string, unknown>) {
  const base  = liveKitHttpUrl()
  const token = await mintLiveKitRoomToken(roomName)
  if (!base || !token) throw new Error('missing LiveKit admin configuration')
  const res = await fetch(`${base}/twirp/livekit.RoomService/${method}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(`LiveKit ${method} ${res.status}: ${text.slice(0, 160)}`)
  }
  return res.json().catch(() => ({}))
}

async function deleteLiveKitRoom(roomName: string): Promise<void> {
  await callLiveKit('DeleteRoom', roomName, { room: roomName })
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

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
    const body = await req.json()
    const { action, roomSlug } = body

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
      if (room.status === 'ended') {
        // Still attempt LK cleanup for rooms that may have been ended without it.
        await deleteLiveKitRoom(roomSlug).catch(err => console.error('LK delete (already-ended):', err))
        return json({ ok: true, note: 'already ended' })
      }

      const { error: updateErr } = await sb.from('rooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', room.id)
      if (updateErr) throw updateErr

      // Disconnect all LiveKit participants immediately — don't wait for Realtime.
      await deleteLiveKitRoom(roomSlug).catch(err => console.error('LK delete failed:', err))

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
        if (!error) {
          closed.push(r.slug)
          await deleteLiveKitRoom(r.slug).catch(err => console.error(`LK delete ${r.slug}:`, err))
        }
      }

      // Purge messages older than 24h — SQL cron cleans at 12h but may miss if pg_cron is down
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

    // ── set-lockdown ─────────────────────────────────────────────
    if (action === 'set-lockdown') {
      const locked = !!body.locked
      const note = typeof body.note === 'string' ? cleanText(body.note, 200) : null
      const { error } = await sb.from('app_settings')
        .upsert({
          id: 'global',
          rooms_locked: locked,
          locked_note: note,
          locked_at: locked ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
      if (error) throw error
      return json({ ok: true, rooms_locked: locked })
    }

    // ── force-close-all ──────────────────────────────────────────
    if (action === 'force-close-all') {
      const { data: active, error: listErr } = await sb.from('rooms')
        .select('id, slug')
        .eq('status', 'active')
      if (listErr) throw listErr

      const closed: string[] = []
      for (const r of active ?? []) {
        const { error } = await sb.from('rooms')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', r.id)
        if (!error) {
          closed.push(r.slug)
          await deleteLiveKitRoom(r.slug).catch(err => console.error(`LK delete ${r.slug}:`, err))
        }
      }
      return json({ closed, closedCount: closed.length })
    }

    // ── list-bans ─────────────────────────────────────────────────
    if (action === 'list-bans') {
      const { data, error } = await sb.from('room_bans')
        .select('id, type, value, created_at')
        .is('room_id', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return json({ bans: data ?? [] })
    }

    // ── add-ban ───────────────────────────────────────────────────
    if (action === 'add-ban') {
      const type = String(body.type ?? '')
      const rawValue = cleanText(body.value, type === 'nickname' ? 24 : 128)
      const value = type === 'nickname' ? rawValue.toLowerCase() : rawValue
      if (!['session', 'nickname'].includes(type) || !value) {
        return json({ error: 'invalid ban' }, 400)
      }
      const { error } = await sb.from('room_bans').insert({
        room_id: null,
        type,
        value,
        is_active: true,
      })
      if (error && error.code !== '23505') throw error
      return json({ ok: true })
    }

    // ── remove-ban ────────────────────────────────────────────────
    if (action === 'remove-ban') {
      const banId = String(body.banId ?? '')
      if (!banId) return json({ error: 'banId required' }, 400)
      const { error } = await sb.from('room_bans')
        .update({ is_active: false })
        .eq('id', banId)
      if (error) throw error
      return json({ ok: true })
    }

    // ── list-participants ────────────────────────────────────────
    if (action === 'list-participants') {
      if (!roomSlug) return json({ error: 'roomSlug required' }, 400)
      const result = await callLiveKit('ListParticipants', roomSlug, { room: roomSlug })
      const participants = (Array.isArray(result.participants) ? result.participants : []).map(
        (p: Record<string, unknown>) => ({
          identity: p.identity ?? '',
          name: p.name ?? '',
          joinedAt: p.joinedAt ?? null,
        }),
      )
      return json({ participants })
    }

    // ── remove-participant ───────────────────────────────────────
    if (action === 'remove-participant') {
      if (!roomSlug) return json({ error: 'roomSlug required' }, 400)
      const identity = cleanText(body.identity, 128)
      if (!identity) return json({ error: 'identity required' }, 400)
      await callLiveKit('RemoveParticipant', roomSlug, { room: roomSlug, identity })
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
