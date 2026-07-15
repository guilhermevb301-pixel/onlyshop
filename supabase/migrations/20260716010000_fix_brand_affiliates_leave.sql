-- Fix da auditoria da Fase 2: a policy "ba: self leave update" travava só status
-- no WITH CHECK → o afiliado podia, no MESMO UPDATE de saída, reescrever brand_id
-- (escrita cross-tenant) / monthly_fee_cents (billing) / source. Postgres não
-- expõe OLD no WITH CHECK, então: remove a policy permissiva e move "sair do time"
-- pra função SECURITY DEFINER (espelha join_team) — mexe SÓ na própria linha.
DROP POLICY IF EXISTS "ba: self leave update" ON public.brand_affiliates;

CREATE OR REPLACE FUNCTION public.leave_team(_brand_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.brand_affiliates
     SET status = 'removed', removed_at = now()
   WHERE affiliate_user_id = auth.uid()
     AND brand_id = _brand_id;
$$;
GRANT EXECUTE ON FUNCTION public.leave_team(uuid) TO authenticated;
