-- =============================================================================
-- Cron de atualização das tendências (TikTok Creative Center via Apify).
-- Roda NA NUVEM do Supabase, 1x/dia — não depende de nenhum PC ligado.
--
-- COMO LIGAR (uma vez, quando tiver acesso ao projeto):
--   1) Dashboard Supabase → Database → Extensions → habilite "pg_cron" e "pg_net"
--   2) Troque <PROJECT_REF> e <SERVICE_ROLE_KEY> abaixo
--   3) Rode este SQL no SQL Editor
--
-- Depois disso, todo dia ~6h (BRT) o cache de produtos/hashtags/criativos de BR
-- é atualizado sozinho. Outros países entram sob demanda (quando o usuário troca
-- o seletor, a função busca e cacheia aquele país também).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior (se existir) antes de recriar.
select cron.unschedule('refresh-tiktok-trends')
where exists (select 1 from cron.job where jobname = 'refresh-tiktok-trends');

-- Atualiza os 3 tipos para o Brasil, todo dia às 09:00 UTC (~06:00 BRT).
select cron.schedule(
  'refresh-tiktok-trends',
  '0 9 * * *',
  $$
  select
    net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/tiktok-trends',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body := jsonb_build_object('type', t.type, 'country', 'BR', 'period', 7)
    )
  from (values ('products'), ('hashtags'), ('creatives')) as t(type);
  $$
);

-- Conferir os jobs agendados:
--   select * from cron.job;
-- Ver execuções recentes:
--   select * from cron.job_run_details order by start_time desc limit 20;
