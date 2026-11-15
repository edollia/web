-- MAIN doll.gg project only. Apply schema.sql first, then this file, then
-- deploy throne-wishlist-sync. Safe to reapply; no catalogue rows are deleted.
-- Existing featured/position values are never changed by reconciliation.
begin;

alter table public.wishlist_sync_state
    add column if not exists last_attempted_at timestamptz,
    add column if not exists lease_token uuid,
    add column if not exists lease_expires_at timestamptz;

insert into public.wishlist_sync_state (id) values (true) on conflict (id) do nothing;

create or replace function public.wishlist_sync_claim(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    current_state public.wishlist_sync_state%rowtype;
    checked_at timestamptz;
    next_token uuid;
begin
    select * into strict current_state from public.wishlist_sync_state where id = true for update;
    checked_at := clock_timestamp();
    if current_state.lease_token is not null and current_state.lease_expires_at > checked_at then
        return jsonb_build_object('acquired', false, 'reason', 'in-progress', 'lastSyncedAt', current_state.last_synced_at);
    end if;
    if not coalesce(p_force, false)
       and greatest(current_state.last_attempted_at, current_state.last_synced_at) > checked_at - interval '2 minutes' then
        return jsonb_build_object('acquired', false, 'reason', 'throttled', 'lastSyncedAt', current_state.last_synced_at);
    end if;
    next_token := gen_random_uuid();
    update public.wishlist_sync_state
       set lease_token = next_token, lease_expires_at = checked_at + interval '45 seconds', last_attempted_at = checked_at
     where id = true;
    return jsonb_build_object('acquired', true, 'leaseToken', next_token, 'lastSyncedAt', current_state.last_synced_at);
end;
$function$;

create or replace function public.wishlist_sync_finish(p_token uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    current_state public.wishlist_sync_state%rowtype;
    checked_at timestamptz;
    marked_unavailable integer;
begin
    -- This lock stays held through every catalogue write and the final stamp.
    -- An expired or superseded worker cannot overwrite a newer worker's data.
    select * into strict current_state from public.wishlist_sync_state where id = true for update;
    checked_at := clock_timestamp();
    if p_token is null or current_state.lease_token is distinct from p_token
       or current_state.lease_expires_at is null or current_state.lease_expires_at <= checked_at then
        raise exception 'wishlist sync lease expired or replaced' using errcode = '55000';
    end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array' then
        raise exception 'invalid wishlist sync items' using errcode = '22023';
    end if;
    -- The Edge Function validates Firestore. Validate the normalized RPC input
    -- as well, before the first catalogue write in this transaction.
    if exists (
        select 1 from jsonb_array_elements(p_items) as item
        where jsonb_typeof(item) <> 'object'
           or jsonb_typeof(item->'throne_item_id') is distinct from 'string'
           or length(btrim(item->>'throne_item_id')) = 0
           or jsonb_typeof(item->'name') is distinct from 'string'
           or length(btrim(item->>'name')) = 0
           or jsonb_typeof(item->'image_url') is distinct from 'string'
           or jsonb_typeof(item->'price_cents') is distinct from 'number'
           or jsonb_typeof(item->'quantity') is distinct from 'number'
    ) then
        raise exception 'invalid wishlist sync item fields' using errcode = '22023';
    end if;
    if exists (
        select 1 from jsonb_to_recordset(p_items) as item(throne_item_id text, price_cents numeric, quantity numeric)
        where price_cents <= 0 or price_cents > 2147483647 or price_cents <> trunc(price_cents)
           or quantity <= 0 or quantity > 2147483647 or quantity <> trunc(quantity)
    ) or exists (
        select 1 from jsonb_to_recordset(p_items) as item(throne_item_id text)
        group by throne_item_id having count(*) > 1
    ) then
        raise exception 'invalid wishlist sync item values' using errcode = '22023';
    end if;

    insert into public.wishlist_items (throne_item_id, name, price_cents, image_url, quantity, is_available, synced_at)
    select throne_item_id, name, price_cents, image_url, quantity, true, checked_at
    from jsonb_to_recordset(p_items) as item(throne_item_id text, name text, price_cents integer, image_url text, quantity integer)
    on conflict (throne_item_id) do update set
        name = excluded.name, price_cents = excluded.price_cents, image_url = excluded.image_url,
        quantity = excluded.quantity, is_available = true, synced_at = excluded.synced_at;

    update public.wishlist_items as existing set is_available = false
    where existing.is_available = true
      and not exists (
          select 1 from jsonb_to_recordset(p_items) as item(throne_item_id text)
          where item.throne_item_id = existing.throne_item_id
      );
    get diagnostics marked_unavailable = row_count;
    update public.wishlist_sync_state
       set last_synced_at = checked_at, lease_token = null, lease_expires_at = null
     where id = true;
    return jsonb_build_object('count', jsonb_array_length(p_items), 'markedUnavailable', marked_unavailable);
end;
$function$;

create or replace function public.wishlist_sync_release(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    released integer;
begin
    update public.wishlist_sync_state set lease_token = null, lease_expires_at = null
    where id = true and lease_token = p_token;
    get diagnostics released = row_count;
    return released = 1;
end;
$function$;

revoke all on function public.wishlist_sync_claim(boolean) from public, anon, authenticated;
revoke all on function public.wishlist_sync_finish(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.wishlist_sync_release(uuid) from public, anon, authenticated;
grant execute on function public.wishlist_sync_claim(boolean) to service_role;
grant execute on function public.wishlist_sync_finish(uuid, jsonb) to service_role;
grant execute on function public.wishlist_sync_release(uuid) to service_role;

commit;
