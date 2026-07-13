// doll.gg wishlist mockup — mirrors the live Throne wishlist into our own
// table so the grid never shows something that's actually sold/removed.
//
// Reads Throne's public Firestore document-query endpoint (confirmed
// intentionally public by Throne directly, over email, to the site owner —
// this is the same filter/sort Throne's own frontend uses to decide what's
// "available," found via network inspection of the real wishlist page).
// Never writes to Throne, never touches the streaming Listen channel, only
// the plain document query.
//
// Callable by anyone (same anon-key auth as throne-cart) — safe because of
// the throttle below, not because of a secret. A burst of visitors opening
// the widget collapses into at most one real Firestore call per throttle
// window. Two ways to bypass the throttle and force a real sync: a valid
// admin JWT (dashboard "sync now" button) or a shared secret known only to
// the GitHub Actions cron (never shipped in any client bundle).

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://doll.gg', 'https://www.doll.gg',
  'http://localhost:8421', 'http://127.0.0.1:8421',
])

const ADMIN_UID = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3'
const THRONE_CREATOR_ID = 'SVtrvPX5wbRctiRcdHeSCeuJT6u2' // @edoll
const FIRESTORE_QUERY_URL = 'https://firestore.googleapis.com/v1/projects/onlywish-9d17b/databases/(default)/documents/creators/' + THRONE_CREATOR_ID + ':runQuery'
const THROTTLE_MS = 2 * 60 * 1000

function buildCors(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.has(origin) ? origin : 'https://doll.gg',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
    'Vary': 'Origin',
  }
}

function fv(fields: any, key: string): unknown {
  const wrapped = fields?.[key]
  if (!wrapped) return undefined
  if ('stringValue' in wrapped) return wrapped.stringValue
  if ('integerValue' in wrapped) return Number(wrapped.integerValue)
  if ('doubleValue' in wrapped) return wrapped.doubleValue
  if ('booleanValue' in wrapped) return wrapped.booleanValue
  return undefined
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
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // Determine trust: shared secret (CI) or admin JWT (dashboard button).
    let trusted = false
    const syncSecret = req.headers.get('x-sync-secret')
    if (syncSecret && Deno.env.get('SYNC_SHARED_SECRET') && syncSecret === Deno.env.get('SYNC_SHARED_SECRET')) {
      trusted = true
    } else {
      const authHeader = req.headers.get('Authorization') || ''
      const bearer = authHeader.replace(/^Bearer\s+/i, '')
      if (bearer) {
        const { data: { user } } = await sb.auth.getUser(bearer)
        if (user?.id === ADMIN_UID) trusted = true
      }
    }

    const { data: syncState } = await sb.from('wishlist_sync_state').select('last_synced_at').eq('id', true).maybeSingle()
    const lastSyncedAt = syncState?.last_synced_at ? new Date(syncState.last_synced_at).getTime() : 0
    const age = Date.now() - lastSyncedAt

    if (!trusted && age < THROTTLE_MS) {
      return json({ synced: false, reason: 'throttled', lastSyncedAt: syncState?.last_synced_at ?? null })
    }

    const fsRes = await fetch(FIRESTORE_QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'wishlistItems' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                { fieldFilter: { field: { fieldPath: 'quantity' }, op: 'GREATER_THAN', value: { integerValue: '0' } } },
                { fieldFilter: { field: { fieldPath: 'price' }, op: 'GREATER_THAN', value: { integerValue: '0' } } },
                { fieldFilter: { field: { fieldPath: 'isHidden' }, op: 'EQUAL', value: { booleanValue: false } } },
                { fieldFilter: { field: { fieldPath: 'isSavedForLater' }, op: 'EQUAL', value: { booleanValue: false } } },
              ],
            },
          },
          orderBy: [
            { field: { fieldPath: 'itemIndex' }, direction: 'DESCENDING' },
            { field: { fieldPath: 'quantity' }, direction: 'DESCENDING' },
          ],
          limit: 300,
        },
      }),
    })

    if (!fsRes.ok) {
      console.error('throne-wishlist-sync: Firestore query failed', fsRes.status, await fsRes.text().catch(() => ''))
      return json({ error: 'sync failed' }, 502)
    }

    const entries = await fsRes.json().catch(() => [])
    const rows: { throne_item_id: string; name: string; price_cents: number; image_url: string; quantity: number }[] = []

    for (const entry of Array.isArray(entries) ? entries : []) {
      const doc = entry?.document
      if (!doc?.name) continue
      const throneItemId = String(doc.name).split('/').pop()
      if (!throneItemId) continue
      rows.push({
        throne_item_id: throneItemId,
        name: String(fv(doc.fields, 'name') ?? ''),
        price_cents: Number(fv(doc.fields, 'price') ?? 0),
        image_url: String(fv(doc.fields, 'imgLink') ?? ''),
        quantity: Number(fv(doc.fields, 'quantity') ?? 0),
      })
    }

    if (rows.length) {
      const { error: upsertError } = await sb.from('wishlist_items').upsert(
        rows.map(row => ({ ...row, is_available: true, synced_at: new Date().toISOString() })),
        { onConflict: 'throne_item_id' }
      )
      if (upsertError) throw upsertError
    }

    let markedUnavailable = 0
    const syncedIds = rows.map(row => row.throne_item_id)
    const staleQuery = sb.from('wishlist_items').update({ is_available: false }).eq('is_available', true)
    const { data: staleRows, error: staleError } = syncedIds.length
      ? await staleQuery.not('throne_item_id', 'in', `(${syncedIds.map(id => `"${id}"`).join(',')})`).select('throne_item_id')
      : await staleQuery.select('throne_item_id')
    if (staleError) throw staleError
    markedUnavailable = staleRows?.length ?? 0

    await sb.from('wishlist_sync_state').update({ last_synced_at: new Date().toISOString() }).eq('id', true)

    return json({ synced: true, count: rows.length, markedUnavailable })
  } catch (err) {
    console.error('throne-wishlist-sync error:', err)
    return json({ error: 'internal error' }, 500)
  }
})
