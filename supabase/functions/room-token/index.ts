// doll.gg /voice — LiveKit room token minter
// Deployed as Supabase Edge Function: supabase/functions/room-token
// Secrets required: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    video: { roomJoin: true, room: opts.room, canPublish: opts.canPublish, canSubscribe: true },
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { roomSlug, nickname, sessionId, role } = await req.json()
    if (!roomSlug || !nickname || !sessionId) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const token = await mintToken({
      apiKey:     Deno.env.get('LIVEKIT_API_KEY')!,
      apiSecret:  Deno.env.get('LIVEKIT_API_SECRET')!,
      identity:   sessionId,
      name:       nickname,
      room:       roomSlug,
      canPublish: role !== 'audience',
      ttlSeconds: 4 * 3600,
    })

    return new Response(JSON.stringify({ token, lkUrl: Deno.env.get('LIVEKIT_URL')! }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
