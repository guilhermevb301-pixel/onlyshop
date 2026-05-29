-- =============================================================================
-- Meus Influencers — personas de IA por usuário (Estúdio IA)
-- Cada usuário tem seu espaço pra criar/reusar influencers a partir de fotos.
-- A photo_url vira o rosto do vídeo (image-to-video do Seedance 2.0).
-- =============================================================================

create table if not exists public.user_influencers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  niche       text,
  description text not null default '',   -- vai pro prompt (aparência + vibe)
  photo_url   text not null,              -- URL pública no Storage (vira image_url do clip)
  created_at  timestamptz not null default now()
);

create index if not exists user_influencers_user_id_idx on public.user_influencers(user_id);

alter table public.user_influencers enable row level security;

create policy "own_select" on public.user_influencers
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.user_influencers
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.user_influencers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on public.user_influencers
  for delete using (auth.uid() = user_id);

-- Storage bucket público (o fal.ai baixa a foto server-side via URL).
insert into storage.buckets (id, name, public)
values ('influencer-photos', 'influencer-photos', true)
on conflict (id) do nothing;

create policy "infl_read_public" on storage.objects
  for select using (bucket_id = 'influencer-photos');

create policy "infl_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'influencer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "infl_delete_own" on storage.objects
  for delete using (
    bucket_id = 'influencer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
