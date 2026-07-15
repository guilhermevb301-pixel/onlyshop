-- Migration ÚNICA e idempotente: 20260715000000_mvp_media_kit_linktree.sql
-- Somente a feature C requer DDL; A/B/D/E/F são 100% frontend (dbMigrationSql = "nenhuma").
-- Todo o bloco roda em transação; todos os statements são IF NOT EXISTS / CREATE OR REPLACE.
-- CORREÇÃO BLOQUEANTE aplicada: c.name (NÃO c.title — coluna 'title' não existe em public.campaigns; o nome é 'name', verificado no schema).
-- NÃO toca split/webhook/fund-campaign/Mercado Pago. RPC é leitura de vitrine (SECURITY DEFINER apenas para contornar RLS de campaign_applications, expondo campos públicos sanitizados).

BEGIN;

-- 1) Colunas novas de perfil (linktree). instagram_username/tiktok_username/website JÁ existem (migrations anteriores); aqui só as que faltam.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;          -- só dígitos (DDI+DDD+numero), montado como wa.me no cliente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intro_video_url text;   -- URL YouTube/Vimeo OU URL pública do bucket intro-videos

-- 2) Bucket público para vídeo de apresentação (upload opcional; alternativa é colar link YouTube).
INSERT INTO storage.buckets (id, name, public)
VALUES ('intro-videos', 'intro-videos', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Policies do bucket intro-videos: leitura pública; dono escreve só na própria pasta (prefixo = user_id).
DROP POLICY IF EXISTS "intro videos public read" ON storage.objects;
CREATE POLICY "intro videos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'intro-videos');

DROP POLICY IF EXISTS "intro videos owner write" ON storage.objects;
CREATE POLICY "intro videos owner write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'intro-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "intro videos owner update" ON storage.objects;
CREATE POLICY "intro videos owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'intro-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "intro videos owner delete" ON storage.objects;
CREATE POLICY "intro videos owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'intro-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) RPC pública de PORTFÓLIO do creator (aba "Campanhas" do media-kit).
-- SECURITY DEFINER porque campaign_applications tem RLS restrita (só dono/marca leem).
-- Expõe SOMENTE campos de vitrine sanitizados das entregas APROVADAS/PAGAS. NÃO expõe split/custos/ids de pagamento.
-- proofs (jsonb livre do influencer) é devolvido cru — sanitizar/validar na UI (http-only, target=_blank rel=noopener, nunca render como HTML).
CREATE OR REPLACE FUNCTION public.public_creator_portfolio(_user_id uuid)
RETURNS TABLE (
  application_id  uuid,
  campaign_title  text,
  brand_name      text,
  reward_amount   numeric,
  posted_at       timestamptz,
  proofs          jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    ca.id,
    c.name,            -- CORRIGIDO: campaigns.name (não c.title)
    b.name,
    c.reward_amount,
    ca.posted_at,
    ca.proofs
  FROM public.campaign_applications ca
  JOIN public.campaigns c ON c.id = ca.campaign_id
  JOIN public.brands    b ON b.id = c.brand_id
  WHERE ca.influencer_user_id = _user_id
    AND ca.status IN ('approved','paid')
  ORDER BY ca.posted_at DESC NULLS LAST
  LIMIT 24;
$$;

REVOKE ALL ON FUNCTION public.public_creator_portfolio(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_creator_portfolio(uuid) TO anon, authenticated;

COMMIT;