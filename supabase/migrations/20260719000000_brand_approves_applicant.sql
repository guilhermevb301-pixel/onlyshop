-- Pedido do Biel (áudio 19/07): a MARCA aprova o perfil ANTES de virar contratação/pagamento.
-- Hoje o influencer aceita e já entra como 'accepted' (e, no modelo process, já dispara
-- o payout de conexão). Agora: ele entra como 'applied' (interesse) e a marca dá o OK.
-- auto_accept=true devolve o comportamento antigo (a marca pode "contratar todos").
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS auto_accept boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.campaigns.auto_accept IS 'Se true, quem se candidata já entra como accepted (sem curadoria da marca). Default false: a marca aprova o perfil antes.';
