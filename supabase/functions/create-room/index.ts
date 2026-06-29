// doll.gg /rooms — server-side room creation
// Creates a room with a private host capability. The raw host key is returned
// once to the browser and stored only in localStorage; Postgres stores a hash.

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

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomHostKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return b64url(bytes)
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function cleanNick(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, '_').slice(0, 24)
}

function safeAccent(value: unknown): string | null {
  const s = String(value ?? '').trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(s) ? s : null
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
    const slug = cleanText(body.roomSlug, 64).toLowerCase()
    const nickname = cleanNick(body.nickname)
    const sessionId = cleanText(body.sessionId, 128)
    const title = cleanText(body.title, 48)
    const hostAccent = safeAccent(body.hostAccent)
    const locked = !!body.locked

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return json({ error: 'invalid room slug' }, 400)
    }
    if (nickname.length < 2 || !sessionId) {
      return json({ error: 'missing host identity' }, 400)
    }

    const hostKey = randomHostKey()
    const hostKeyHash = await sha256Hex(hostKey)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: room, error } = await sb.from('rooms')
      .insert({
        slug,
        title: title || null,
        locked,
        audience_mode: false,
        host_nickname: nickname,
        host_session_id: sessionId,
        host_accent: hostAccent,
        status: 'active',
        member_count: 1,
      })
      .select(PUBLIC_ROOM_SELECT)
      .single()

    if (error) {
      if (error.code === '23505') return json({ error: 'room slug already exists' }, 409)
      throw error
    }

    const { error: keyError } = await sb.from('room_host_keys')
      .insert({ room_id: room.id, host_key_hash: hostKeyHash })

    if (keyError) {
      await sb.from('rooms').delete().eq('id', room.id)
      throw keyError
    }

    return json({ room, hostKey })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
