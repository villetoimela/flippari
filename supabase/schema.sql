-- Flippari – Supabase-skeema
-- Aja tämä Supabasen SQL Editorissa (Project → SQL Editor → New query → Run).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Asetukset (yksi rivi per käyttäjä)
-- ---------------------------------------------------------------
create table if not exists public.settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  anthropic_key  text,
  ai_model       text not null default 'claude-sonnet-4-5',
  postal_code    text,
  city           text,
  signature_fi   text default '',
  signature_en   text default '',
  platforms      jsonb not null default '{"tori": true, "vinted": true, "ebay": false}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Tuotteet
-- ---------------------------------------------------------------
create table if not exists public.items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status          text not null default 'draft'
                  check (status in ('draft','ready','listed','sold','shipped','archived')),
  title           text not null default '',
  description     text not null default '',
  title_en        text not null default '',
  description_en  text not null default '',
  brand           text not null default '',
  category        text not null default '',     -- vapaa kuvaus, esim. "Naiset > Takit > Kuoritakit"
  category_vinted text not null default '',     -- Vintedin polku " > " -eroteltuna
  category_tori   text not null default '',     -- Torin polku " > " -eroteltuna
  size            text not null default '',
  condition       text not null default 'good'
                  check (condition in ('new_tags','new','very_good','good','satisfactory')),
  color           text not null default '',
  material        text not null default '',
  material_en     text not null default '',
  purchase_price  numeric(10,2),
  price           numeric(10,2),
  min_price       numeric(10,2),
  sold_price      numeric(10,2),
  sold_platform   text,
  sold_at         timestamptz,
  shipping_size   text not null default 'S' check (shipping_size in ('S','M','L','XL')),
  notes           text not null default '',
  ai_raw          jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists items_user_status_idx on public.items(user_id, status);

-- ---------------------------------------------------------------
-- Kuvat (tiedostot Storage-bucketissa "item-images")
-- ---------------------------------------------------------------
create table if not exists public.item_images (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id    uuid not null references public.items(id) on delete cascade,
  path       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists item_images_item_idx on public.item_images(item_id, position);

-- ---------------------------------------------------------------
-- Ilmoitukset per alusta
-- ---------------------------------------------------------------
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id     uuid not null references public.items(id) on delete cascade,
  platform    text not null check (platform in ('tori','vinted','ebay','huuto','other')),
  status      text not null default 'pending'
              check (status in ('pending','listed','removed','sold')),
  url         text,
  price       numeric(10,2),
  listed_at   timestamptz,
  removed_at  timestamptz,
  updated_at  timestamptz not null default now(),
  unique (item_id, platform)
);

-- ---------------------------------------------------------------
-- Ostoapurin arviot (historia)
-- ---------------------------------------------------------------
create table if not exists public.deals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  query       text not null default '',
  buy_price   numeric(10,2),
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Tärpit: flip-radarin löytämät alihintaiset ilmoitukset
-- ---------------------------------------------------------------
create table if not exists public.finds (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform     text not null,
  external_id  text not null,
  url          text not null,
  title        text not null default '',
  subtitle     text not null default '',
  image        text,
  price        numeric(10,2) not null,
  median       numeric(10,2),
  discount     numeric(10,2),
  status       text not null default 'new' check (status in ('new','saved','dismissed','bought')),
  source       text not null default 'flippari',   -- 'flippari' (laajennus) tai 'flip-radar'
  search_name  text not null default '',
  est_net      numeric(10,2),                      -- flip-radarin nettovoittoarvio
  est_resale_low  numeric(10,2),
  est_resale_high numeric(10,2),
  hot          boolean not null default false,
  ai_reason    text,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  unique (user_id, platform, external_id)
);
create index if not exists finds_user_status_idx on public.finds(user_id, status, discount desc);

-- ---------------------------------------------------------------
-- updated_at-triggeri
-- ---------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();
drop trigger if exists listings_touch on public.listings;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security: jokainen näkee vain omat rivinsä
-- ---------------------------------------------------------------
alter table public.settings    enable row level security;
alter table public.items       enable row level security;
alter table public.item_images enable row level security;
alter table public.listings    enable row level security;
alter table public.deals       enable row level security;
alter table public.finds       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','items','item_images','listings','deals','finds'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Storage: yksityinen bucket, polku alkaa käyttäjän id:llä
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', false)
on conflict (id) do nothing;

drop policy if exists "own images read"   on storage.objects;
drop policy if exists "own images write"  on storage.objects;
drop policy if exists "own images update" on storage.objects;
drop policy if exists "own images delete" on storage.objects;

create policy "own images read" on storage.objects for select to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images write" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images update" on storage.objects for update to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------
-- Realtime: uudet tärpit näkyvät dashboardilla heti
-- ---------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.finds;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------
-- flip-radarin vienti ilman service_role-avainta:
-- käyttäjä luo dashboardin Asetuksissa oman tutka-avaimen, jolla
-- flip-radar saa VAIN lisätä tärppejä (RPC ingest_finds).
-- ---------------------------------------------------------------
create table if not exists public.ingest_tokens (
  token      text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.ingest_tokens enable row level security;
drop policy if exists "own rows" on public.ingest_tokens;
create policy "own rows" on public.ingest_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.ingest_finds(p_token text, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid; n int;
begin
  select user_id into uid from public.ingest_tokens where token = p_token;
  if uid is null then raise exception 'invalid ingest token'; end if;
  insert into public.finds (user_id, platform, external_id, url, title, subtitle, image, price, median, discount,
                            est_net, est_resale_low, est_resale_high, hot, search_name, ai_reason, source, last_seen)
  select uid, r->>'platform', r->>'external_id', r->>'url', coalesce(r->>'title',''), coalesce(r->>'subtitle',''),
         r->>'image', (r->>'price')::numeric, (r->>'median')::numeric, (r->>'discount')::numeric,
         (r->>'est_net')::numeric, (r->>'est_resale_low')::numeric, (r->>'est_resale_high')::numeric,
         coalesce((r->>'hot')::boolean, false), coalesce(r->>'search_name',''), r->>'ai_reason', 'flip-radar', now()
  from jsonb_array_elements(p_rows) r
  on conflict (user_id, platform, external_id) do update set
    price = excluded.price, median = excluded.median, discount = excluded.discount, est_net = excluded.est_net,
    est_resale_low = excluded.est_resale_low, est_resale_high = excluded.est_resale_high, hot = excluded.hot,
    ai_reason = coalesce(excluded.ai_reason, public.finds.ai_reason), title = excluded.title,
    subtitle = excluded.subtitle, image = excluded.image, url = excluded.url, last_seen = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ingest_finds(text, jsonb) from public;
grant execute on function public.ingest_finds(text, jsonb) to anon, authenticated;
