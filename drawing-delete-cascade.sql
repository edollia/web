-- Run once in the Supabase SQL editor for the MAIN doll.gg project.
--
-- A dood can have rows in public.drawing_likes. If that foreign key uses
-- PostgreSQL's default ON DELETE NO ACTION, only doods with reactions fail
-- when the admin dashboard deletes them. Cascading is the intended behavior:
-- deleting the dood also removes reactions that no longer have a parent.

begin;

do $migration$
declare
    constraint_row record;
begin
    if to_regclass('public.drawings') is null
       or to_regclass('public.drawing_likes') is null then
        raise exception 'public.drawings or public.drawing_likes is missing';
    end if;

    -- Keep reaction writes out of the tiny drop/recreate window and remove
    -- any unusable orphan rows first. Normally there are none because an FK
    -- already exists; this also makes schema-drift recovery deterministic.
    lock table public.drawing_likes in share row exclusive mode;
    delete from public.drawing_likes as reaction
    where reaction.drawing_id is null
       or not exists (
           select 1
           from public.drawings as drawing
           where drawing.id = reaction.drawing_id
       );

    -- Remove every non-cascading FK between these exact columns, regardless
    -- of the name Supabase/Postgres originally gave the constraint.
    for constraint_row in
        select constraint_info.conname
        from pg_constraint as constraint_info
        where constraint_info.contype = 'f'
          and constraint_info.conrelid = 'public.drawing_likes'::regclass
          and constraint_info.confrelid = 'public.drawings'::regclass
          and constraint_info.confdeltype <> 'c'
          and constraint_info.conkey = array[
              (
                  select attribute.attnum
                  from pg_attribute as attribute
                  where attribute.attrelid = 'public.drawing_likes'::regclass
                    and attribute.attname = 'drawing_id'
                    and not attribute.attisdropped
              )
          ]::smallint[]
          and constraint_info.confkey = array[
              (
                  select attribute.attnum
                  from pg_attribute as attribute
                  where attribute.attrelid = 'public.drawings'::regclass
                    and attribute.attname = 'id'
                    and not attribute.attisdropped
              )
          ]::smallint[]
    loop
        execute format(
            'alter table public.drawing_likes drop constraint %I',
            constraint_row.conname
        );
    end loop;

    -- Keep an existing correct cascade constraint, otherwise create it.
    if not exists (
        select 1
        from pg_constraint as constraint_info
        where constraint_info.contype = 'f'
          and constraint_info.conrelid = 'public.drawing_likes'::regclass
          and constraint_info.confrelid = 'public.drawings'::regclass
          and constraint_info.confdeltype = 'c'
          and constraint_info.conkey = array[
              (
                  select attribute.attnum
                  from pg_attribute as attribute
                  where attribute.attrelid = 'public.drawing_likes'::regclass
                    and attribute.attname = 'drawing_id'
                    and not attribute.attisdropped
              )
          ]::smallint[]
          and constraint_info.confkey = array[
              (
                  select attribute.attnum
                  from pg_attribute as attribute
                  where attribute.attrelid = 'public.drawings'::regclass
                    and attribute.attname = 'id'
                    and not attribute.attisdropped
              )
          ]::smallint[]
    ) then
        alter table public.drawing_likes
            add constraint drawing_likes_drawing_id_cascade_fkey
            foreign key (drawing_id)
            references public.drawings (id)
            on delete cascade;
    end if;
end
$migration$;

commit;
