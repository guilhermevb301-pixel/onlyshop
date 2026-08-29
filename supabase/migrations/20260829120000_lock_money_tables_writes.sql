-- =============================================================================
-- FIN-14 (auditoria Augusto): defesa em profundidade nas tabelas de DINHEIRO.
-- O ledger (platform_credits) e as tabelas legadas (orders/order_items) tinham
-- GRANT de INSERT/UPDATE/DELETE pra anon+authenticated. O RLS já negava a maioria,
-- mas a permissão ampla é risco. O app NÃO escreve nessas tabelas pelo navegador
-- (verificado: 0 escritas no front) — só as APIs server-side (service_role).
-- Revogar a escrita do cliente é REVERSÍVEL (basta re-GRANT) e fecha o buraco de
-- "cliente forjar saldo/pedido". A LEITURA (SELECT) continua, gated por RLS.
-- =============================================================================
REVOKE INSERT, UPDATE, DELETE ON public.platform_credits FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.orders            FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items       FROM anon, authenticated;
