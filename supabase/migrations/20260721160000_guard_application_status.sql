-- =============================================================================
-- FECHA ROUBO EM PRODUCAO: o afiliado se auto-aprovava e sacava.
--
-- A policy "app: influencer own" e FOR ALL sem restricao de coluna, entao o
-- proprio afiliado podia rodar no console:
--     update campaign_applications set status='accepted' where id=<a dele>
-- e em seguida chamar /api/payout-process phase=connection. O endpoint so
-- recusava 'applied'/'rejected', entao pagava os R$20 da conexao como saldo
-- SACAVEL. Repetivel em toda campanha 'process' financiada da plataforma,
-- sem a marca ter aprovado ninguem.
--
-- RLS com WITH CHECK nao resolve: ela nao enxerga o valor ANTIGO, entao qualquer
-- regra sobre status quebraria o afiliado ao editar comprovantes de uma
-- candidatura ja aceita. Por isso a trava e um trigger, que compara OLD x NEW.
--
-- Regra: o afiliado so move o PROPRIO status para 'delivered' ou 'rejected'
-- (entregar e desistir). Quem aprova e a marca. service_role (auth.uid() nulo)
-- passa direto — e por onde os endpoints de dinheiro trabalham.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.guard_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  actor uuid := auth.uid();
BEGIN
  -- Servidor (service_role) nao tem auth.uid(): nao e barrado.
  IF actor IS NULL THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND actor = NEW.influencer_user_id THEN
    SELECT b.user_id INTO owner_id
      FROM public.campaigns c
      JOIN public.brands b ON b.id = c.brand_id
     WHERE c.id = NEW.campaign_id;

    -- Se ele for o dono da campanha (testando a propria loja), segue.
    IF actor IS DISTINCT FROM owner_id AND NEW.status NOT IN ('delivered', 'rejected') THEN
      RAISE EXCEPTION 'o creator nao pode mudar o proprio status para %', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- pay_mode define por onde o dinheiro sai: nunca pelo cliente.
  IF NEW.pay_mode IS DISTINCT FROM OLD.pay_mode THEN
    RAISE EXCEPTION 'pay_mode e definido pelo servidor' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_application_status_trg ON public.campaign_applications;
CREATE TRIGGER guard_application_status_trg
  BEFORE UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_application_status();
