-- SPLIT AUTOMÁTICO DO MERCADO PAGO (decisão do Gui 21/07: automático, abrindo mão do escrow).
-- O afiliado autoriza a plataforma via OAuth; o pagamento é criado com o access_token
-- DELE + application_fee (nossa taxa) → o dinheiro cai direto na conta MP dele.
--
-- SEGURANÇA: o access_token do afiliado é SEGREDO (movimenta a conta dele). A tabela
-- fica TRANCADA: RLS ligada e NENHUMA policy → nem anon nem authenticated leem/escrevem.
-- Só o service_role (que ignora RLS, usado nos endpoints /api) enxerga. O front nunca
-- toca nesses tokens — ele só lê o flag público profiles.mp_connected.
CREATE TABLE IF NOT EXISTS public.affiliate_mp_accounts (
  user_id       uuid PRIMARY KEY,
  mp_user_id    text NOT NULL,
  access_token  text NOT NULL,
  refresh_token text,
  public_key    text,
  expires_at    timestamptz,
  connected_at  timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_mp_accounts ENABLE ROW LEVEL SECURITY;
-- Sem policies de propósito = deny-all pro cliente. Remove qualquer uma que exista.
DROP POLICY IF EXISTS "mp: own select" ON public.affiliate_mp_accounts;
DROP POLICY IF EXISTS "mp: own write"  ON public.affiliate_mp_accounts;
REVOKE ALL ON public.affiliate_mp_accounts FROM anon, authenticated;
COMMENT ON TABLE public.affiliate_mp_accounts IS 'Tokens MP do afiliado (split). SEGREDO: service_role apenas — RLS sem policies.';

-- Flag PÚBLICO (sem segredo): o app só precisa saber SE está conectado.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_connected boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.mp_connected IS 'true = afiliado autorizou o Mercado Pago (split automático). Só flag, sem token.';
