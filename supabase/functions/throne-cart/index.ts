// doll.gg wishlist mockup — mints a real Throne cart from our curated items.
//
// Never trust the client with raw Throne item ids: it sends our own
// wishlist_items.id values, and this function resolves them against our
// table before ever talking to Throne. That way this endpoint can only ever
// build carts out of items we've actually curated, on our own creator's
// wishlist — it can't be used as an open proxy to build arbitrary carts on
// arbitrary Throne creators.
//
// Throne's cart API is undocumented (found via network inspection of the
// real checkout flow). If its shape ever changes, this should fail loudly
// server-side (logged) but soft to the client (a plain error the frontend
// falls back on), never an unhandled crash.

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://doll.gg', 'https://www.doll.gg',
  'http://localhost:8421', 'http://127.0.0.1:8421',
])

const THRONE_SOURCE_CREATOR_ID = 'SVtrvPX5wbRctiRcdHeSCeuJT6u2' // @edoll
const THRONE_CART_CREATE_URL = 'https://us-central1-onlywish-9d17b.cloudfunctions.net/api-checkout/v1/cart/create'
const THRONE_WISHLIST_SLUG = 'edoll'
const MAX_ITEMS = 10

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
    const body = await req.json()
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((id: unknown) => typeof id === 'string').slice(0, MAX_ITEMS)
      : []

    if (!itemIds.length) {
      return json({ error: 'no items selected' }, 400)
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: rows, error: dbError } = await sb
      .from('wishlist_items')
      .select('throne_item_id')
      .in('throne_item_id', itemIds)
      .eq('featured', true)
      .eq('is_available', true)

    if (dbError) throw dbError

    const throneItemIds = (rows ?? [])
      .map(row => row.throne_item_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    if (!throneItemIds.length) {
      return json({ error: 'none of the selected items are available' }, 400)
    }

    // Some requested items didn't resolve (sold out / unfeatured since the
    // visitor picked them) — never silently build a smaller cart than what
    // they agreed to. Let the frontend tell them and let them retry.
    if (throneItemIds.length < itemIds.length) {
      return json({
        error: 'some items are no longer available',
        unavailableCount: itemIds.length - throneItemIds.length,
      }, 409)
    }

    const throneRes = await fetch(THRONE_CART_CREATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-throne-source': 'WISHLIST_WEBSITE',
        'Referer': `https://throne.com/${THRONE_WISHLIST_SLUG}`,
      },
      body: JSON.stringify({
        cart: {
          commerceType: 'wishlist',
          currency: 'USD',
          status: 'create',
          updatedAt: Date.now(),
          purposeMetadata: null,
          forterTokenCookie: null,
          forterMobileUID: null,
        },
        items: throneItemIds.map(itemId => ({
          type: 'item',
          contentId: crypto.randomUUID(),
          source: { type: 'wishlist', itemId },
        })),
        contributions: [],
        addOns: [],
        sourceCreatorId: THRONE_SOURCE_CREATOR_ID,
        source: 'throne',
      }),
    })

    if (!throneRes.ok) {
      console.error('throne-cart: cart/create failed', throneRes.status, await throneRes.text().catch(() => ''))
      return json({ error: 'could not start checkout' }, 502)
    }

    const throneBody = await throneRes.json().catch(() => null)
    const cartId = throneBody?.cart?.cartId
    const hasErrors = Array.isArray(throneBody?.errors) && throneBody.errors.length > 0
    if (hasErrors || typeof cartId !== 'string' || !cartId) {
      console.error('throne-cart: unexpected cart/create response', JSON.stringify(throneBody))
      return json({ error: 'could not start checkout' }, 502)
    }

    return json({ checkoutUrl: `https://throne.com/${THRONE_WISHLIST_SLUG}/checkout/${cartId}` })
  } catch (err) {
    console.error('throne-cart error:', err) // detail stays server-side
    return json({ error: 'internal error' }, 500)
  }
})
