-- D1 (áudio 2): aprovação instantânea opcional. A marca pode marcar a campanha
-- como auto_approve: quando o influencer posta (entrega), o approve-delivery aprova
-- e paga automático, SEM revisão manual. É opt-in da marca; approve-delivery só
-- deixa o influencer disparar se auto_approve=true AND funded=true AND status=delivered
-- AND ele é o dono da candidatura AND tem comprovante. Aditivo, default false.
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.campaigns.auto_approve IS 'Se true, a entrega do influencer é aprovada/paga automaticamente ao postar (opt-in da marca; exige campanha funded).';
