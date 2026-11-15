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
// Callable by anyone (same anon-key auth as throne-cart). A database lease
// serializes workers, including workers in different Edge Function isolates.
// Two ways to bypass the cooldown and force a real sync: a valid
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
const FIRESTORE_DOCUMENT_PREFIX = 'projects/onlywish-9d17b/databases/(default)/documents/creators/' + THRONE_CREATOR_ID + '/wishlistItems/'
const UPSTREAM_TIMEOUT_MS = 20000 // shorter than the database's 45s lease

type WishlistItem = { throne_item_id: string; name: string; price_cents: number; image_url: string; quantity: number }
type SyncDatabase = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: {
      wishlist_sync_claim: { Args: { p_force: boolean }; Returns: unknown }
      wishlist_sync_finish: { Args: { p_token: string; p_items: WishlistItem[] }; Returns: unknown }
      wishlist_sync_release: { Args: { p_token: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
class UpstreamSyncError extends Error {}

function buildCors(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.has(origin) ? origin : 'https://doll.gg',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
    'Vary': 'Origin',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function fv(fields: Record<string, unknown>, key: string): unknown {
  const wrapped = fields[key]
  if (!isRecord(wrapped)) return undefined
  if ('stringValue' in wrapped) return wrapped.stringValue
  if ('integerValue' in wrapped) return Number(wrapped.integerValue)
  if ('doubleValue' in wrapped) return wrapped.doubleValue
  if ('booleanValue' in wrapped) return wrapped.booleanValue
  return undefined
}

function parseWishlistResponse(entries: unknown): WishlistItem[] {
  if (!Array.isArray(entries) || !entries.length) throw new UpstreamSyncError('missing RunQuery results')
  const rows: WishlistItem[] = []
  const ids = new Set<string>()
  for (const entry of entries) {
    if (!isRecord(entry) || Object.keys(entry).some(key => !['document', 'readTime', 'skippedResults', 'done'].includes(key))) {
      throw new UpstreamSyncError('invalid RunQuery entry')
    }
    // Firestore documents its empty result as readTime without document.
    // An empty array, arbitrary object, or skipped malformed document must
    // never be mistaken for an authoritative empty wishlist.
    if (!('document' in entry)) {
      if (typeof entry.readTime !== 'string' || !Number.isFinite(Date.parse(entry.readTime))) {
        throw new UpstreamSyncError('invalid RunQuery progress entry')
      }
      continue
    }
    const doc = entry.document
    if (!isRecord(doc) || typeof doc.name !== 'string' || !doc.name.startsWith(FIRESTORE_DOCUMENT_PREFIX)
        || !isRecord(doc.fields)) throw new UpstreamSyncError('invalid wishlist document')
    const id = doc.name.slice(FIRESTORE_DOCUMENT_PREFIX.length)
    const name = fv(doc.fields, 'name')
    const price = fv(doc.fields, 'price')
    const quantity = fv(doc.fields, 'quantity')
    const image = fv(doc.fields, 'imgLink')
    if (!id || id.includes('/') || ids.has(id) || typeof name !== 'string' || !name.trim()
        || typeof price !== 'number' || !Number.isInteger(price) || price <= 0 || price > 2147483647
        || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647
        || (image !== undefined && typeof image !== 'string')
        || fv(doc.fields, 'isHidden') !== false || fv(doc.fields, 'isSavedForLater') !== false) {
      throw new UpstreamSyncError('invalid wishlist document fields')
    }
    ids.add(id)
    rows.push({ throne_item_id: id, name, price_cents: price, image_url: image ?? '', quantity })
  }
  return rows
}

serve(async (req) => {
  const CORS = buildCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  let sb: ReturnType<typeof createClient<SyncDatabase>> | null = null
  let leaseToken: string | null = null
  try {
    sb = createClient<SyncDatabase>(
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

    const { data: claim, error: claimError } = await sb.rpc('wishlist_sync_claim', { p_force: trusted })
    if (claimError) throw claimError
    if (!isRecord(claim) || typeof claim.acquired !== 'boolean') throw new Error('invalid sync lease response')
    if (!claim.acquired) {
      if (claim.reason !== 'throttled' && claim.reason !== 'in-progress') throw new Error('invalid sync lease state')
      return json({ synced: false, reason: claim.reason, lastSyncedAt: claim.lastSyncedAt ?? null })
    }
    if (typeof claim.leaseToken !== 'string' || !claim.leaseToken) throw new Error('missing sync lease token')
    leaseToken = claim.leaseToken

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
    let rows: WishlistItem[]
    try {
      const fsRes = await fetch(FIRESTORE_QUERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
          },
        }),
      })
      if (!fsRes.ok) throw new UpstreamSyncError(`Firestore query failed (${fsRes.status})`)
      rows = parseWishlistResponse(await fsRes.json())
    } catch (error) {
      if (error instanceof UpstreamSyncError) throw error
      throw new UpstreamSyncError(controller.signal.aborted ? 'Firestore query timed out' : 'unreadable Firestore response')
    } finally {
      clearTimeout(timeout)
    }

    // The RPC locks and rechecks ownership before its first catalogue write;
    // upsert, unavailable reconciliation and success stamp are one transaction.
    const { data: result, error: finishError } = await sb.rpc('wishlist_sync_finish', { p_token: leaseToken, p_items: rows })
    if (finishError) throw finishError
    if (!isRecord(result) || result.count !== rows.length || typeof result.markedUnavailable !== 'number') {
      throw new Error('invalid sync reconciliation response')
    }
    leaseToken = null
    return json({ synced: true, count: result.count, markedUnavailable: result.markedUnavailable })
  } catch (err) {
    console.error('throne-wishlist-sync error:', err)
    return json({ error: err instanceof UpstreamSyncError ? 'sync failed' : 'internal error' }, err instanceof UpstreamSyncError ? 502 : 500)
  } finally {
    if (sb && leaseToken) {
      try {
        const { data: released, error: releaseError } = await sb.rpc('wishlist_sync_release', { p_token: leaseToken })
        if (releaseError || typeof released !== 'boolean') console.error('throne-wishlist-sync: could not release lease', releaseError)
      } catch (releaseError) {
        console.error('throne-wishlist-sync: could not release lease', releaseError)
      }
      // A failed cleanup cannot unlock a newer worker. The bounded lease is
      // the recovery path if the database connection itself is unavailable.
    }
  }
})
