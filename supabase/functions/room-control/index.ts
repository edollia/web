// doll.gg /rooms — host-only room controls
// Verifies the private host key before mutating room metadata, bans, or
// trusted moderation events.
// Also applies LiveKit participant permissions/removals for audience mode,
// mute, kick, and ban so controls are not only client-enforced.
//
// Secrets required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://doll.gg', 'https://www.doll.gg',
  'http://localhost:8421', 'http://127.0.0.1:8421',
])

const PUBLIC_ROOM_SELECT = [
  'id', 'slug', 'title', 'status', 'locked', 'audience_mode',
  'host_nickname', 'host_accent', 'member_count', 'created_at', 'ended_at',
  'participant_previews',
].join(', ')

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

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function safeAccent(value: unknown, fallback = '#f08ab5'): string {
  const s = String(value ?? '').trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(s) ? s : fallback
}

function cleanPreviews(value: unknown): Array<{ n: string; a: string }> | null {
  if (value === null) return null
  if (!Array.isArray(value)) return null
  return value.slice(0, 5).map((p) => ({
    n: cleanText((p as { n?: unknown })?.n, 24) || '?',
    a: safeAccent((p as { a?: unknown })?.a),
  }))
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function liveKitHttpUrl(): string {
  return (Deno.env.get('LIVEKIT_URL') ?? '')
    .replace(/^wss:/, 'https:')
    .replace(/^ws:/, 'http:')
    .replace(/\/+$/, '')
}

async function mintLiveKitAdminToken(roomName: string): Promise<string | null> {
  const apiKey = Deno.env.get('LIVEKIT_API_KEY')
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
  if (!apiKey || !apiSecret) return null

  const enc = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: apiKey,
    sub: `rooms-control-${crypto.randomUUID()}`,
    jti: crypto.randomUUID(),
    nbf: now,
    exp: now + 60,
    video: { roomAdmin: true, room: roomName },
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

async function callLiveKit(method: string, roomName: string, body: Record<string, unknown>) {
  const base = liveKitHttpUrl()
  const token = await mintLiveKitAdminToken(roomName)
  if (!base || !token) throw new Error('missing LiveKit admin configuration')

  const res = await fetch(`${base}/twirp/livekit.RoomService/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LiveKit ${method} ${res.status}: ${text.slice(0, 160)}`)
  }
  return res.json().catch(() => ({}))
}

async function setParticipantCanPublish(roomName: string, identity: string, canPublish: boolean) {
  if (!identity) return
  await callLiveKit('UpdateParticipant', roomName, {
    room: roomName,
    identity,
    permission: {
      canSubscribe: true,
      canPublish,
      canPublishData: true,
    },
  })
}

async function removeLiveKitParticipant(roomName: string, identity: string) {
  if (!identity) return
  await callLiveKit('RemoveParticipant', roomName, { room: roomName, identity })
}

async function currentServerMutedIds(
  sb: ReturnType<typeof createClient>,
  roomId: string,
): Promise<Set<string>> {
  const { data } = await sb.from('room_moderation_events')
    .select('target_session_id, muted')
    .eq('room_id', roomId)
    .eq('action', 'mute')
    .order('created_at', { ascending: false })
    .limit(500)

  const seen = new Set<string>()
  const muted = new Set<string>()
  for (const row of data ?? []) {
    const sid = String(row.target_session_id ?? '')
    if (!sid || seen.has(sid)) continue
    seen.add(sid)
    if (row.muted === true) muted.add(sid)
  }
  return muted
}

async function syncAudiencePermissions(
  sb: ReturnType<typeof createClient>,
  roomName: string,
  roomId: string,
  hostSessionId: string,
  audienceMode: boolean,
) {
  const result = await callLiveKit('ListParticipants', roomName, { room: roomName })
  const participants = Array.isArray(result.participants) ? result.participants : []
  const serverMuted = audienceMode ? new Set<string>() : await currentServerMutedIds(sb, roomId)

  for (const participant of participants) {
    const identity = String(participant?.identity ?? '')
    if (!identity || identity === hostSessionId) continue
    await setParticipantCanPublish(roomName, identity, !audienceMode && !serverMuted.has(identity))
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
    const body = await req.json()
    const action = String(body.action ?? '')
    const roomSlug = cleanText(body.roomSlug, 64).toLowerCase()
    if (!roomSlug) return json({ error: 'roomSlug required' }, 400)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: room, error: roomErr } = await sb.from('rooms')
      .select('id, status, host_session_id, audience_mode')
      .eq('slug', roomSlug)
      .single()

    if (roomErr || !room) return json({ error: 'room not found' }, 404)
    if (room.status !== 'active') return json({ error: 'room has ended' }, 410)

    const { data: hostKeyRow, error: keyErr } = await sb.from('room_host_keys')
      .select('host_key_hash')
      .eq('room_id', room.id)
      .single()
    if (keyErr || !(await verifyHostKey(body.hostKey, hostKeyRow?.host_key_hash ?? null))) {
      return json({ error: 'not the host' }, 403)
    }

    if (action === 'update') {
      const incoming = (body.updates && typeof body.updates === 'object') ? body.updates : {}
      const updates: Record<string, unknown> = {}

      if (hasOwn(incoming, 'title')) {
        const title = cleanText((incoming as { title?: unknown }).title, 48)
        updates.title = title || null
      }
      if (hasOwn(incoming, 'locked')) {
        updates.locked = !!(incoming as { locked?: unknown }).locked
      }
      if (hasOwn(incoming, 'audience_mode')) {
        updates.audience_mode = !!(incoming as { audience_mode?: unknown }).audience_mode
      }
      if (hasOwn(incoming, 'member_count')) {
        const count = Number((incoming as { member_count?: unknown }).member_count)
        if (Number.isInteger(count) && count >= 0 && count <= 500) updates.member_count = count
      }
      if (hasOwn(incoming, 'participant_previews')) {
        updates.participant_previews = cleanPreviews((incoming as { participant_previews?: unknown }).participant_previews)
      }

      if (Object.keys(updates).length === 0) return json({ ok: true })
      const audienceModeChanged = hasOwn(updates, 'audience_mode')

      const { data: updated, error } = await sb.from('rooms')
        .update(updates)
        .eq('id', room.id)
        .select(PUBLIC_ROOM_SELECT)
        .single()
      if (error) throw error

      if (audienceModeChanged) {
        try {
          await syncAudiencePermissions(
            sb, roomSlug, room.id, room.host_session_id, !!updates.audience_mode,
          )
        } catch (err) {
          console.error('LiveKit audience sync failed:', err)
        }
      }

      return json({ ok: true, room: updated })
    }

    if (action === 'ban') {
      const type = String(body.type ?? '')
      const rawValue = cleanText(body.value, type === 'nickname' ? 24 : 128)
      const value = type === 'nickname' ? rawValue.toLowerCase() : rawValue
      if (!['session', 'nickname'].includes(type) || !value) {
        return json({ error: 'invalid ban' }, 400)
      }
      const { error } = await sb.from('room_bans').insert({
        room_id: room.id,
        type,
        value,
        is_active: true,
      })
      if (error && error.code !== '23505') throw error
      if (type === 'session') {
        try {
          await removeLiveKitParticipant(roomSlug, value)
        } catch (err) {
          console.error('LiveKit session ban removal failed:', err)
        }
      }
      return json({ ok: true })
    }

    if (action === 'moderate') {
      const moderation = (body.moderation && typeof body.moderation === 'object') ? body.moderation : {}
      const moderationAction = String((moderation as { action?: unknown }).action ?? '')
      const targetSessionId = cleanText((moderation as { targetSessionId?: unknown }).targetSessionId, 128)
      if (!['mute', 'kick', 'ban'].includes(moderationAction) || !targetSessionId) {
        return json({ error: 'invalid moderation event' }, 400)
      }
      const { error } = await sb.from('room_moderation_events').insert({
        room_id: room.id,
        target_session_id: targetSessionId,
        action: moderationAction,
        muted: moderationAction === 'mute' ? !!(moderation as { muted?: unknown }).muted : null,
      })
      if (error) throw error

      try {
        if (moderationAction === 'mute') {
          const muted = !!(moderation as { muted?: unknown }).muted
          await setParticipantCanPublish(roomSlug, targetSessionId, !muted && !room.audience_mode)
        } else {
          await removeLiveKitParticipant(roomSlug, targetSessionId)
        }
      } catch (err) {
        console.error('LiveKit moderation failed:', err)
      }

      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
