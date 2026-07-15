-- Gate server-side: MARCA não aceita campanha (só cria). O gate no React
-- (CampaignSheet) era só cosmético — via console uma conta marca conseguia
-- inserir candidatura. Policy RESTRICTIVE (AND com as permissivas) só no INSERT.
DROP POLICY IF EXISTS "brand cannot accept campaigns" ON public.campaign_applications;
CREATE POLICY "brand cannot accept campaigns"
  ON public.campaign_applications
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT EXISTS (SELECT 1 FROM public.brands b WHERE b.user_id = auth.uid()));
