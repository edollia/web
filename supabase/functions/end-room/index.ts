// doll.gg /rooms — end-room Edge Function
// Verifies the caller is the room's host before ending it.
// Uses the Supabase service role key (server-only secret) so host
// identity is confirmed server-side — anon clients cannot spoof it.
// The trg_on_room_ended trigger deletes chat immediately on status change.
//
// Secrets required (all auto-provided by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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

serve(async (req) => {
  const CORS = buildCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    const { roomSlug, sessionId } = await req.json()

    if (!roomSlug || !sessionId) {
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
      .select('id, status, host_session_id')
      .eq('slug', roomSlug)
      .single()

    if (fetchErr || !room) return json({ error: 'room not found' }, 404)

    // Already ended — idempotent success (closing twice is not an error).
    if (room.status === 'ended') return json({ ok: true })

    // Reject if caller is not the host.
    if (room.host_session_id !== sessionId) {
      return json({ error: 'not the host' }, 403)
    }

    // End the room.  The AFTER UPDATE trigger (trg_on_room_ended) deletes
    // all messages within the same transaction, server-side.
    const { error: updateErr } = await sb
      .from('rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', room.id)

    if (updateErr) throw updateErr

    return json({ ok: true })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
