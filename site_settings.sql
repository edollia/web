create table if not exists public.site_settings (
    id text primary key,
    value jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
using (true);

drop policy if exists "Admin can manage site settings" on public.site_settings;
create policy "Admin can manage site settings"
on public.site_settings
for all
using (auth.uid() = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3'::uuid)
with check (auth.uid() = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3'::uuid);

insert into public.site_settings (id, value)
values (
    'links',
    '{
        "snapchat_url": "https://www.snapchat.com/add/dumidoll",
        "snapchat_enabled": true,
        "instagram_url": "https://www.instagram.com/pawswirl",
        "instagram_enabled": true,
        "kofi_url": "https://ko-fi.com/edoll",
        "kofi_enabled": true
    }'::jsonb
)
on conflict (id) do nothing;
