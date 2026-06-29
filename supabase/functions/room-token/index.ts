// doll.gg /rooms — LiveKit room token minter
// Deployed as Supabase Edge Function: supabase/functions/room-token
//
// Secrets required:
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-provided by Supabase)

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://doll.gg', 'https://www.doll.gg'])

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
    const { roomSlug, nickname, sessionId, role } = await req.json()

    if (!roomSlug || !nickname || !sessionId) {
      return json({ error: 'missing fields' }, 400)
    }

    // Service role lets us check room state and bans without RLS interference.
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // Verify room exists and is still active.
    const { data: room, error: roomErr } = await sb
      .from('rooms')
      .select('id, status, locked, host_session_id')
      .eq('slug', roomSlug)
      .single()

    if (roomErr || !room) return json({ error: 'room not found' }, 404)

    if (room.status !== 'active') return json({ error: 'room has ended' }, 410)

    // Locked rooms: only the original host can join.
    if (room.locked && room.host_session_id !== sessionId) {
      return json({ error: 'room is locked' }, 403)
    }

    // Ban check (room-specific or global).
    const { data: ban } = await sb
      .from('room_bans')
      .select('id')
      .or(`room_id.eq.${room.id},room_id.is.null`)
      .or(`value.eq.${sessionId},value.eq.${nickname.toLowerCase()}`)
      .eq('is_active', true)
      .limit(1)

    if (ban && ban.length > 0) return json({ error: 'banned' }, 403)

    const token = await mintToken({
      apiKey:     Deno.env.get('LIVEKIT_API_KEY')!,
      apiSecret:  Deno.env.get('LIVEKIT_API_SECRET')!,
      identity:   sessionId,
      name:       nickname,
      room:       roomSlug,
      canPublish: role !== 'audience',
      ttlSeconds: 30 * 60,
    })

    return json({ token, lkUrl: Deno.env.get('LIVEKIT_URL')! })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
