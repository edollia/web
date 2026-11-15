-- Wishlist mockup grid v3: full auto-sync from Throne's public Firestore
-- data instead of manual entry. See throne-wishlist-sync for how this gets
-- populated.
--
-- This belongs to the MAIN site project (zvqdodzkhmcptwkjlfeu), not the
-- /rooms project this repo's `supabase/` CLI folder is linked to. Run this
-- in that project's SQL editor (or link the CLI to it separately).
--
-- Preserving setup: existing catalogue rows, featured choices and ordering
-- remain intact. Apply sync-lease-migration.sql after this setup and before
-- deploying the updated throne-wishlist-sync Edge Function.

begin;

create table if not exists public.wishlist_items (
    throne_item_id text primary key,
    name text not null default '',
    price_cents integer not null default 0,
    image_url text not null default '',
    quantity integer not null default 0,
    is_available boolean not null default true,
    featured boolean not null default false,
    position integer not null default 0,
    synced_at timestamptz,
    first_synced_at timestamptz not null default now()
);

create index if not exists wishlist_items_featured_position_idx
    on public.wishlist_items (position)
    where featured = true and is_available = true;

create table if not exists public.wishlist_sync_state (
    id boolean primary key default true,
    last_synced_at timestamptz,
    constraint wishlist_sync_state_single_row check (id)
);

insert into public.wishlist_sync_state (id) values (true) on conflict (id) do nothing;

alter table public.wishlist_items enable row level security;
alter table public.wishlist_sync_state enable row level security;

-- Public (anon) can read featured + currently-available items only.
drop policy if exists "wishlist_items_public_read" on public.wishlist_items;
create policy "wishlist_items_public_read"
    on public.wishlist_items
    for select
    using (featured = true and is_available = true);

-- Admin (matches the existing ADMIN_UID pattern used by drawings/questions)
-- can do everything, including seeing unfeatured/unavailable rows.
drop policy if exists "wishlist_items_admin_all" on public.wishlist_items;
create policy "wishlist_items_admin_all"
    on public.wishlist_items
    for all
    using (auth.uid() = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3')
    with check (auth.uid() = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3');

-- wishlist_sync_state has no public policy at all — only the service-role
-- edge function touches it. Admin reads it too, for the "last synced" label.
drop policy if exists "wishlist_sync_state_admin_read" on public.wishlist_sync_state;
create policy "wishlist_sync_state_admin_read"
    on public.wishlist_sync_state
    for select
    using (auth.uid() = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3');

commit;
