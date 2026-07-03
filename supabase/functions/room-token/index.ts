// doll.gg /rooms — LiveKit room token minter
// Deployed as Supabase Edge Function: supabase/functions/room-token
//
// Secrets required:
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-provided by Supabase)

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://doll.gg', 'https://www.doll.gg',
  'http://localhost:8421', 'http://127.0.0.1:8421',
])

function buildCors(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.has(origin) ? origin : 'https://doll.gg',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifyHostKey(rawKey: unknown, storedHash: string | null): Promise<boolean> {
  if (!storedHash || typeof rawKey !== 'string' || rawKey.length < 20) return false
  return timingSafeEqual(await sha256Hex(rawKey), storedHash)
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

async function mintToken(opts: {
  apiKey: string; apiSecret: string
  identity: string; name: string; room: string
  canPublish: boolean; ttlSeconds: number
}): Promise<string> {
  const enc = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: opts.apiKey, sub: opts.identity, name: opts.name,
    jti: crypto.randomUUID(), nbf: now, exp: now + opts.ttlSeconds,
    video: {
      roomJoin: true, room: opts.room,
      canPublish: opts.canPublish, canSubscribe: true,
    },
  }
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const msg  = `${head}.${body}`
  const key  = await crypto.subtle.importKey(
    'raw', enc.encode(opts.apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg))))
  return `${msg}.${sig}`
}

serve(async (req) => {
  const CORS = buildCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    const { roomSlug, nickname, sessionId, hostKey, adminJwt } = await req.json()

    if (!roomSlug || !nickname || !sessionId) {
      return json({ error: 'missing fields' }, 400)
    }

    const ADMIN_UID = '9ea1a89e-5a00-4b91-b98c-d69a5e383df4'

    // Service role lets us check room state and bans without RLS interference.
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // Verify admin JWT if provided — admin bypasses locked/ban checks and gets host role.
    let isAdmin = false
    if (adminJwt && typeof adminJwt === 'string') {
      const { data: { user } } = await sb.auth.getUser(adminJwt)
      isAdmin = user?.id === ADMIN_UID
    }

    // Verify room exists and is still active.
    const { data: room, error: roomErr } = await sb
      .from('rooms')
      .select('id, status, locked, audience_mode, host_is_admin')
      .eq('slug', roomSlug)
      .single()

    if (roomErr || !room) return json({ error: 'room not found' }, 404)

    if (room.status !== 'active') return json({ error: 'room has ended' }, 410)

    // During a lockdown, only the admin and rooms the admin themself created
    // remain joinable — everything else is closed to new joins.
    const { data: settings } = await sb.from('app_settings')
      .select('rooms_locked')
      .eq('id', 'global')
      .single()
    if (settings?.rooms_locked && !isAdmin && !room.host_is_admin) {
      return json({ error: 'rooms are temporarily disabled' }, 403)
    }

    const { data: hostKeyRow } = await sb
      .from('room_host_keys')
      .select('host_key_hash')
      .eq('room_id', room.id)
      .single()
    const isHost = await verifyHostKey(hostKey, hostKeyRow?.host_key_hash ?? null)

    // Locked rooms: only the holder of the private host key (or admin) can join.
    if (room.locked && !isHost && !isAdmin) {
      return json({ error: 'room is locked' }, 403)
    }

    const cleanSessionId = cleanText(sessionId, 128)
    const effectiveRole = (isHost || isAdmin) ? 'host' : 'guest'

    // Ban check skipped for admin.
    if (!isAdmin) {
      const cleanNickname = cleanText(nickname, 24).toLowerCase()
      const { data: ban } = await sb
        .from('room_bans')
        .select('id, type, value')
        .or(`room_id.eq.${room.id},room_id.is.null`)
        .in('type', ['session', 'nickname'])
        .in('value', [cleanSessionId, cleanNickname])
        .eq('is_active', true)
        .limit(10)

      const isBanned = (ban ?? []).some((row) =>
        (row.type === 'session' && row.value === cleanSessionId) ||
        (row.type === 'nickname' && row.value === cleanNickname)
      )
      if (isBanned) return json({ error: 'banned' }, 403)
    }
    const token = await mintToken({
      apiKey:     Deno.env.get('LIVEKIT_API_KEY')!,
      apiSecret:  Deno.env.get('LIVEKIT_API_SECRET')!,
      identity:   cleanSessionId,
      name:       cleanText(nickname, 24),
      room:       roomSlug,
      canPublish: effectiveRole === 'host' || !room.audience_mode,
      ttlSeconds: 30 * 60,
    })

    return json({ token, lkUrl: Deno.env.get('LIVEKIT_URL')!, role: effectiveRole })

  } catch (err) {
    console.error('room-token error:', err) // detail stays server-side
    return json({ error: 'internal error' }, 500)
  }
})
