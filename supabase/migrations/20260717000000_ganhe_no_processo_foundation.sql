-- =============================================================================
-- 20260717000000_ganhe_no_processo_foundation.sql
-- UMA migration idempotente. Consolida TODO o DDL sem-pagamento + o DDL aditivo
-- de pagamento (só colunas/índices, nenhum crédito é movido aqui).
--
-- ORDEM DE SEGURANÇA: o bloco (0) HARDEN LEDGER vem primeiro e é o único que
-- toca o caminho de dinheiro que JÁ funciona. Os índices são COMPOSTOS/parciais
-- de propósito (ver comentários) — um unique só em (provider_ref) QUEBRARIA o
-- mp-webhook, que insere topup+campaign_hold com o MESMO provider_ref.
-- 100% ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS. Reaplicável.
-- =============================================================================

-- =========================================================================
-- (0) HARDEN LEDGER — idempotência à prova de corrida SEM quebrar o existente
-- =========================================================================

-- (0a) referral_earnings NÃO tem provider_ref hoje (confirmado). Sem ele o
-- repasse de 5% ao indicador duplica em retry/corrida. Adiciona + unique parcial.
ALTER TABLE public.referral_earnings ADD COLUMN IF NOT EXISTS provider_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS referral_earnings_provider_ref_uidx
  ON public.referral_earnings(provider_ref) WHERE provider_ref IS NOT NULL;

-- (0b) platform_credits: unique COMPOSTO (provider_ref, kind) — é EXATAMENTE o
-- que o mp-webhook.ts on_conflict=provider_ref,kind sempre assumiu (e que hoje é
-- NO-OP por falta do índice). Torna válido o par topup/campaign_hold (kinds
-- diferentes, mesmo paymentId) E os payouts por etapa (connect/video/live) à
-- prova de corrida. Parcial: só onde provider_ref not null (lançamentos sem ref
-- não colidem). NÃO usar índice só em (provider_ref) — quebraria o webhook.
-- Guard anti-falha em banco sujo: conta duplicatas por (provider_ref, kind) —
-- NÃO por provider_ref só (senão todo banco com campanha financiada, que tem
-- pares topup/hold legítimos com mesmo ref, cairia para índice não-único).
DO $$
DECLARE dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT provider_ref, kind FROM public.platform_credits
    WHERE provider_ref IS NOT NULL
    GROUP BY provider_ref, kind HAVING count(*) > 1
  ) d;
  IF dup_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS platform_credits_provider_ref_kind_uidx
      ON public.platform_credits(provider_ref, kind) WHERE provider_ref IS NOT NULL;
  ELSE
    RAISE NOTICE 'platform_credits: % pares (provider_ref,kind) duplicados — criando índice NAO-unico. Limpar duplicatas REAIS e recriar como unique.', dup_count;
    CREATE INDEX IF NOT EXISTS platform_credits_provider_ref_kind_uidx
      ON public.platform_credits(provider_ref, kind) WHERE provider_ref IS NOT NULL;
  END IF;
END $$;

-- (0c) Índice pro CAP por fase (COUNT platform_credits por campanha + prefixo do
-- provider_ref: connect-% / video-% / live-%). Não-único, só performance.
CREATE INDEX IF NOT EXISTS platform_credits_campaign_ref_idx
  ON public.platform_credits(campaign_id, provider_ref);

-- NOTA sobre withdraw.ts: hoje provider_ref=`saque|tipo|chave` NÃO é único por
-- saque (2 saques pra mesma chave colidem). O fix é NO CÓDIGO (usar
-- `saque|${userId}|${Date.now()}` ou uuid, guardando tipo/chave em metadata) —
-- NÃO no DDL. Como withdrawal tem provider_ref repetível, ele fica excluído do
-- unique por design: se o código NÃO for corrigido antes de aplicar (0b), o 2º
-- saque legítimo pra mesma chave vai FALHAR. Corrigir withdraw.ts na fatia 0.

-- =========================================================================
-- (1) CAMPANHAS: discriminador de modelo + config das fases (aditivo, s/ dinheiro)
-- =========================================================================
-- campaign_kind: 'standard' (fee 20% em cima, payout único) | 'process' (fee
-- embutido por fase). Sem CHECK enum rígido — segue o padrão text-livre do repo
-- (reward_type/status). Validar no wizard/createCampaign e nos endpoints de etapa.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS campaign_kind text NOT NULL DEFAULT 'standard';
COMMENT ON COLUMN public.campaigns.campaign_kind IS 'standard | process (Ganhe no Processo: paga por conexao/video/live, fee embutido)';

-- phases: config das fases (só process). Shape canonico. Default = modelo do Biel
-- (marca 25/25/84=134 por vaga; afiliado 20/20/70=110; OnlyShop 24 — fee embutido).
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS phases jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.campaigns.phases IS 'Config das fases (so process). connection{brand,affiliate} video{amount,max} live{amount,max}. {} em standard.';

-- =========================================================================
-- (2) CANDIDATURAS: tracking de progresso por etapa (server-truth p/ a UI e CAP)
-- =========================================================================
-- Timestamps/contadores idempotentes. connection_paid_at (timestamp, nao boolean,
-- p/ auditoria alinhada a product_received_at/posted_at). videos_paid/lives_paid
-- sao os contadores que a UI LE (server-truth) — os endpoints de etapa ESCREVEM.
-- O CAP real dos endpoints usa o COUNT no ledger (fonte de verdade do dinheiro);
-- estes contadores sao p/ UI e leitura barata.
ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS connection_paid_at timestamptz;
ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS videos_paid int NOT NULL DEFAULT 0;
ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS lives_paid int NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.campaign_applications.videos_paid IS 'Nº de videos ja pagos (0..phases.video.max). UI le; endpoint de etapa escreve.';
COMMENT ON COLUMN public.campaign_applications.lives_paid IS 'Nº de dias de live ja pagos (0..phases.live.max).';

-- =========================================================================
-- (3) CADASTRO DO AFILIADO — endereço de ENTREGA em tabela SEPARADA (PII/LGPD)
-- =========================================================================
-- NAO colocar endereço em profiles: profiles.SELECT e USING(true) (publico ate
-- p/ anon, cuja key esta no bundle) — vazaria o endereço de TODO usuario sem
-- login e sem candidatura. PostgREST nao tem RLS por coluna. Tabela dedicada com
-- RLS: o dono le/grava; a marca so le se tiver application ACEITA daquele afiliado.
CREATE TABLE IF NOT EXISTS public.affiliate_shipping (
  user_id            uuid PRIMARY KEY,
  address_cep        text,
  address_street     text,
  address_number     text,
  address_complement text,
  address_district   text,
  address_city       text,
  address_state      text,
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_shipping ENABLE ROW LEVEL SECURITY;

-- dono le/grava o proprio endereço
DROP POLICY IF EXISTS "shipping: own select" ON public.affiliate_shipping;
CREATE POLICY "shipping: own select" ON public.affiliate_shipping
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "shipping: own upsert" ON public.affiliate_shipping;
CREATE POLICY "shipping: own upsert" ON public.affiliate_shipping
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "shipping: own update" ON public.affiliate_shipping;
CREATE POLICY "shipping: own update" ON public.affiliate_shipping
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- marca le o endereço SO de quem ACEITOU uma campanha dela (candidatura existe)
DROP POLICY IF EXISTS "shipping: brand of accepted app" ON public.affiliate_shipping;
CREATE POLICY "shipping: brand of accepted app" ON public.affiliate_shipping
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_applications ca
      JOIN public.campaigns c ON c.id = ca.campaign_id
      JOIN public.brands b ON b.id = c.brand_id
      WHERE ca.influencer_user_id = affiliate_shipping.user_id
        AND b.user_id = auth.uid()
        AND ca.status IN ('accepted','approved','delivered','paid')
    )
  );

-- tiktok_username (handle) JA existe em profiles e JA e exposto — nada a criar.
-- (Opcional) so o link completo do perfil, se quiser separar do handle:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok_url text;

-- =========================================================================
-- RLS: nenhuma policy nova de ESCRITA em platform_credits (créditos de etapa
-- passam OBRIGATORIAMENTE pelos endpoints service_role B/C/D). campaigns/
-- campaign_applications herdam as policies existentes (marca-dona / influencer-own).
-- =========================================================================