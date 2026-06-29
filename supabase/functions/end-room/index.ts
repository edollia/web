// doll.gg /rooms — end-room Edge Function
// Verifies the caller is the room's host before ending it.
// Uses the Supabase service role key (server-only secret) so host
// authority is confirmed by a private host key — anon clients cannot spoof it.
// The trg_on_room_ended trigger deletes chat immediately on status change.
// LiveKit room deletion disconnects any clients that ignore the DB update.
//
// Secrets required (all auto-provided by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET

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

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
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
    iss: apiKey,
    sub: `rooms-end-${crypto.randomUUID()}`,
    jti: crypto.randomUUID(),
    nbf: now,
    exp: now + 60,
    video: { roomCreate: true, roomAdmin: true, room: roomName },
  }
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const msg = `${head}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg))))
  return `${msg}.${sig}`
}

async function deleteLiveKitRoom(roomName: string) {
  const base = liveKitHttpUrl()
  const token = await mintLiveKitRoomToken(roomName)
  if (!base || !token) throw new Error('missing LiveKit admin configuration')

  const res = await fetch(`${base}/twirp/livekit.RoomService/DeleteRoom`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ room: roomName }),
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(`LiveKit DeleteRoom ${res.status}: ${text.slice(0, 160)}`)
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

  try {
    const { roomSlug, hostKey } = await req.json()

    if (!roomSlug || !hostKey) {
      return json({ error: 'missing fields' }, 400)
    }

    // Service role bypasses RLS; host verification is our auth layer here.
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: room, error: fetchErr } = await sb
      .from('rooms')
      .select('id, status')
      .eq('slug', roomSlug)
      .single()

    if (fetchErr || !room) return json({ error: 'room not found' }, 404)

    const { data: hostKeyRow, error: keyErr } = await sb
      .from('room_host_keys')
      .select('host_key_hash')
      .eq('room_id', room.id)
      .single()

    // Reject if caller does not hold the private host key.
    if (keyErr || !(await verifyHostKey(hostKey, hostKeyRow?.host_key_hash ?? null))) {
      return json({ error: 'not the host' }, 403)
    }

    // Already ended — idempotent success, but still retry LiveKit cleanup.
    if (room.status === 'ended') {
      try {
        await deleteLiveKitRoom(roomSlug)
      } catch (err) {
        console.error('LiveKit room delete failed:', err)
      }
      return json({ ok: true })
    }

    // End the room.  The AFTER UPDATE trigger (trg_on_room_ended) deletes
    // all messages within the same transaction, server-side.
    const { error: updateErr } = await sb
      .from('rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', room.id)

    if (updateErr) throw updateErr

    try {
      await deleteLiveKitRoom(roomSlug)
    } catch (err) {
      console.error('LiveKit room delete failed:', err)
    }

    return json({ ok: true })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
