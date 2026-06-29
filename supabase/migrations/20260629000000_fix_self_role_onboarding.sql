-- ============================================================================
-- FIX crítico de onboarding: usuário real conseguir definir o PRÓPRIO papel.
--
-- Sintoma: todo usuário real ficava preso no onboarding (role permanecia 'viewer'),
-- porque:
--   1) user_roles só tinha UNIQUE(user_id, role) — o upsert do app usa
--      onConflict(user_id), que exige UNIQUE(user_id);
--   2) as policies de RLS só permitiam ADMIN escrever em user_roles.
--
-- Correção: constraint que falta + policies pro usuário gravar SÓ o próprio papel
-- (restrito a 'affiliate'/'brand' — nunca 'admin').
-- ============================================================================

-- (1) Upsert onConflict(user_id) precisa deste unique.
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- (2) Usuário autenticado cria o próprio papel (só affiliate/brand).
DROP POLICY IF EXISTS "Users can set own role" ON public.user_roles;
CREATE POLICY "Users can set own role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('affiliate', 'brand'));

-- (3) Usuário autenticado troca o próprio papel (só affiliate/brand).
DROP POLICY IF EXISTS "Users can change own role" ON public.user_roles;
CREATE POLICY "Users can change own role" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND role IN ('affiliate', 'brand'));
