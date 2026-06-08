-- trends_cache — cache dos indicadores do TikTok (Creative Center via Apify).
-- A edge function tiktok-trends lê/grava aqui. Um cron atualiza 1x/dia.
create table if not exists public.trends_cache (
  cache_key   text primary key,           -- ex: "products:BR:7:all"
  type        text not null,              -- products | hashtags | creatives
  country     text not null default 'BR',
  period      int  not null default 7,    -- 1 | 7 | 30 (dias)
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Leitura pública (dados de tendência não são sensíveis). Escrita só service_role.
alter table public.trends_cache enable row level security;

drop policy if exists "trends_cache readable by everyone" on public.trends_cache;
create policy "trends_cache readable by everyone"
  on public.trends_cache for select
  using (true);

-- Sem policy de insert/update/delete → só a service_role (edge function) escreve.
