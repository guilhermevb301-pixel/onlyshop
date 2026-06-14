-- =============================================================================
-- MVP "Uber localizado de campanhas" — pivô 11/06/2026
--
-- Lojista cria campanha + paga -> influencer PERTO aceita e entrega ->
-- plataforma retem 20% e repassa 80%. SEM geracao de video (fase 2).
--
-- Reaproveita: brands, profiles(latitude/longitude), wallet_transactions,
-- haversine_km(). Estende campaigns + cria campaign_applications + ledger.
-- =============================================================================

-- 1) Estende campaigns com o modelo "gig" localizado --------------------------
alter table public.campaigns
  add column if not exists reward_type      text    not null default 'per_video',  -- per_video | commission
  add column if not exists reward_amount    numeric not null default 0,            -- R$ por influencer (ex: 50)
  add column if not exists slots            int     not null default 1,            -- quantos influencers (ex: 20)
  add column if not exists slots_filled     int     not null default 0,
  add column if not exists target_city      text,
  add column if not exists target_state     text,
  add column if not exists target_gender    text    default 'any',                 -- any | female | male
  add column if not exists min_followers    int     default 0,
  add column if not exists deadline_hours   int     default 168,                   -- 24 | 48 | 168
  add column if not exists physical_item    text,                                  -- "um bone" (opcional)
  add column if not exists platform_fee_pct numeric not null default 20,
  add column if not exists total_budget     numeric not null default 0,            -- slots * reward_amount
  add column if not exists funded           boolean not null default false;        -- lojista ja pagou?

-- 1b) Perfil do influencer: genero (pro filtro target_gender da campanha) -----
alter table public.profiles
  add column if not exists gender text; -- 'female' | 'male' | null
-- (followers_count e latitude/longitude ja existem em profiles)

-- 2) Candidaturas/entregas dos influencers ------------------------------------
create table if not exists public.campaign_applications (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.campaigns(id) on delete cascade,
  influencer_user_id  uuid not null,
  status              text not null default 'applied',  -- applied|accepted|delivered|approved|paid|rejected
  delivery_url        text,                              -- link do video postado
  distance_km         numeric,                           -- distancia no momento do match
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (campaign_id, influencer_user_id)
);

alter table public.campaign_applications enable row level security;

-- influencer gerencia as proprias candidaturas
drop policy if exists "app: influencer own" on public.campaign_applications;
create policy "app: influencer own" on public.campaign_applications
  for all using (influencer_user_id = auth.uid()) with check (influencer_user_id = auth.uid());

-- lojista ve/aprova as candidaturas das SUAS campanhas
drop policy if exists "app: brand owner" on public.campaign_applications;
create policy "app: brand owner" on public.campaign_applications
  for all using (
    exists (
      select 1 from public.campaigns c
      join public.brands b on b.id = c.brand_id
      where c.id = campaign_applications.campaign_id and b.user_id = auth.uid()
    )
  );

-- 3) Ledger de creditos/escrow (split 20/80) ----------------------------------
-- Lojista carrega credito (topup) -> hold por campanha -> no approve libera
-- payout (80%) + platform_fee (20%). Escrito pela service_role (edge function).
create table if not exists public.platform_credits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  kind         text not null,                            -- topup|campaign_hold|payout|platform_fee|refund|withdrawal
  amount       numeric not null,                         -- + entra / - sai
  campaign_id  uuid references public.campaigns(id),
  status       text not null default 'completed',
  provider     text,                                     -- pix|mercadopago|asaas|stripe
  provider_ref text,                                     -- id da transacao no provedor
  created_at   timestamptz not null default now()
);

alter table public.platform_credits enable row level security;

drop policy if exists "credits: own select" on public.platform_credits;
create policy "credits: own select" on public.platform_credits
  for select using (user_id = auth.uid());
-- insert/update SO via service_role (edge function) — sem policy de escrita.

-- 4) Campanhas perto de mim (mapa estilo Uber) --------------------------------
-- Retorna campanhas ATIVAS e PAGAS ordenadas pela distancia ate a marca.
create or replace function public.campaigns_near(
  _lat numeric, _lon numeric, _radius_km numeric default 100, _limit int default 50
)
returns table (
  campaign_id uuid, brand_id uuid, brand_name text, title text, reward_amount numeric,
  reward_type text, slots int, slots_filled int, target_city text, target_state text,
  physical_item text, deadline_hours int, distance_km numeric, brand_lat numeric, brand_lon numeric
)
language sql stable as $$
  select c.id, c.brand_id, b.name, c.name, c.reward_amount, c.reward_type, c.slots,
         c.slots_filled, c.target_city, c.target_state, c.physical_item, c.deadline_hours,
         public.haversine_km(_lat, _lon, b.latitude, b.longitude) as distance_km,
         b.latitude, b.longitude
  from public.campaigns c
  join public.brands b on b.id = c.brand_id
  where c.funded = true
    and c.status = 'active'
    and c.slots_filled < c.slots
    and b.latitude is not null and b.longitude is not null
    and public.haversine_km(_lat, _lon, b.latitude, b.longitude) <= _radius_km
  order by distance_km asc
  limit _limit;
$$;
