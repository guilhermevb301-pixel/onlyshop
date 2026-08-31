# OnlyShop Launch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar os bloqueadores de lançamento do OnlyShop, provar os fluxos críticos com testes e preparar uma publicação segura no Supabase/Vercel.

**Architecture:** O navegador deixa de ser autoridade para contratos financeiros. APIs autenticadas calculam valores no servidor e delegam mutações monetárias a RPCs PostgreSQL atômicas, serializadas e idempotentes. Sessão, PWA e integrações legadas deixam de persistir ou cachear segredos.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Vercel Functions, Supabase/PostgreSQL, Mercado Pago.

**Spec:** `engineering-audit-2026-08-18.md` (evidência histórica) + auditoria independente do commit `5251e83` realizada em 2026-08-31.

## Global Constraints

- Projeto Supabase canônico: `mvhxyqwicmvnshmqkdan`.
- Nunca gravar service-role, tokens de provedor ou chaves PIX em Git, logs ou `localStorage`.
- Taxa OnlyShop: 20% cobrada da marca; creator recebe 100% do `reward_amount`.
- Campanha paga: mínimo R$ 10 por vaga; permuta: R$ 25 por vaga; processo: R$ 134 por vaga e cap creator R$ 110.
- Toda mutação monetária deve ser autenticada, atômica e idempotente.
- Nenhuma publicação em `main` antes de testes, lint, build, audit e validação das migrations.

---

### Task 1: Fundação testável das APIs

**Files:**
- Create: `api/_lib/auth.ts`
- Create: `api/_lib/money.ts`
- Create: `api/_lib/crypto.ts`
- Create: `src/test/api/auth.test.ts`
- Create: `src/test/api/money.test.ts`
- Create: `src/test/api/crypto.test.ts`

**Interfaces:**
- Produces: `authenticateRequest(req): Promise<AuthenticatedUser>`.
- Produces: `deriveCampaignMoney(input, splitLive): CampaignMoney`.
- Produces: `encryptSensitiveValue(value, key)` e `decryptSensitiveValue(payload, key)`.

- [ ] **Step 1: Write failing tests** cobrindo token ausente/inválido, valores manipulados, limites, fórmulas de standard/permuta/process e round-trip AES-256-GCM.
- [ ] **Step 2: Run tests to verify RED** com `npm test -- src/test/api/auth.test.ts src/test/api/money.test.ts src/test/api/crypto.test.ts`.
- [ ] **Step 3: Implement minimal helpers** sem dependência do React e com dependências externas injetáveis onde necessário.
- [ ] **Step 4: Run tests to verify GREEN** usando o mesmo comando.
- [ ] **Step 5: Commit** com `test: add launch security foundations`.

### Task 2: Banco financeiro atômico

**Files:**
- Create: `supabase/migrations/20260831180000_launch_financial_integrity.sql`
- Create: `supabase/tests/launch_financial_integrity.sql`

**Interfaces:**
- Produces: tabela `campaign_fundings` com contrato imutável por tentativa.
- Produces: tabela `withdrawal_requests` com chave PIX cifrada fora do ledger.
- Produces: RPC service-only `confirm_campaign_funding(uuid,text,numeric)`.
- Produces: RPC service-only `approve_delivery_atomic(uuid,uuid)`.
- Produces: RPC service-only `request_withdrawal_atomic(uuid,numeric,text,text,text)`.
- Produces: triggers que normalizam inserts de campanha e bloqueiam alteração posterior de campos financeiros.

- [ ] **Step 1: Write SQL tests** para insert manipulando `funded/fee/total`, confirmação duplicada, aprovação concorrente e dois saques sobre o mesmo saldo.
- [ ] **Step 2: Verify tests fail against the current schema** com Supabase local ou transaction rollback no banco linkado.
- [ ] **Step 3: Implement the migration** usando `pg_advisory_xact_lock`, `FOR UPDATE`, índices únicos e `REVOKE ALL ... FROM public, anon, authenticated` nas RPCs service-only.
- [ ] **Step 4: Re-run SQL tests** e exigir zero falhas.
- [ ] **Step 5: Commit** com `sec(db): make funding payouts and withdrawals atomic`.

### Task 3: APIs financeiras deixam de confiar no navegador

**Files:**
- Create: `api/create-campaign.ts`
- Modify: `api/fund-campaign.ts`
- Modify: `api/mp-webhook.ts`
- Modify: `api/approve-delivery.ts`
- Modify: `api/withdraw.ts`
- Modify: `api/payout-process.ts`
- Create: `src/test/api/financial-handlers.test.ts`

**Interfaces:**
- `POST /api/create-campaign` recebe apenas campos comerciais, autentica e deriva `funded`, `pay_mode`, fee e total.
- `POST /api/fund-campaign` recebe somente `campaignId`, valida dono e usa valor persistido.
- Webhook exige `MP_WEBHOOK_SECRET`, compara pagamento ao `campaign_fundings` e confirma via RPC.
- Aprovação e saque chamam exclusivamente RPCs atômicas.

- [ ] **Step 1: Write failing handler tests** para 401 sem JWT, preço do body ignorado, usuário não-dono, webhook sem secret, amount mismatch, retry idempotente e falha do RPC.
- [ ] **Step 2: Verify RED** com `npm test -- src/test/api/financial-handlers.test.ts`.
- [ ] **Step 3: Implement authenticated handlers** e retornar 5xx em falhas transitórias do webhook para permitir retry do provedor.
- [ ] **Step 4: Verify GREEN** e rodar toda a suíte.
- [ ] **Step 5: Commit** com `sec(api): enforce server-side financial contracts`.

### Task 4: Frontend seguro e onboarding consistente

**Files:**
- Modify: `src/hooks/useBrand.ts`
- Modify: `src/components/brands/CampaignPaymentStep.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/lib/accounts.ts`
- Modify: `src/components/layout/UserMenu.tsx`
- Modify: `src/hooks/useAuth.tsx`
- Modify: `src/pages/Onboarding.tsx`
- Modify: `vite.config.ts`
- Modify: `src/pages/Landing.tsx`
- Create: `src/test/security/client-security.test.tsx`

**Interfaces:**
- Criação usa `/api/create-campaign` com bearer token.
- Financiamento envia apenas `campaignId` com bearer token e nunca marca localmente como pago.
- Rotas privadas redirecionam anônimos para `/auth`.
- Lista multi-conta persiste somente metadados; troca exige reautenticação.
- PWA não cacheia Supabase/API autenticada.
- Onboarding só avança depois de gravação real confirmada.

- [ ] **Step 1: Write failing client tests** para rota anônima, storage sem tokens e payload de funding sem preço/identidade.
- [ ] **Step 2: Verify RED** com `npm test -- src/test/security/client-security.test.tsx`.
- [ ] **Step 3: Implement the client changes** e corrigir copy 80/20 para a regra real de 100% do reward ao creator.
- [ ] **Step 4: Verify GREEN** e rodar a suíte completa.
- [ ] **Step 5: Commit** com `sec(app): protect sessions routes and payment calls`.

### Task 5: Reduzir superfície legada e segredos TikTok

**Files:**
- Modify: `supabase/config.toml`
- Create: `supabase/functions/_shared/auth.ts`
- Modify: `supabase/functions/tiktok-auth/index.ts`
- Modify: `supabase/functions/tiktok-metrics/index.ts`
- Modify: `supabase/functions/tiktok-post/index.ts`
- Modify: `supabase/functions/tiktok-shop/index.ts`
- Create: `supabase/migrations/20260831190000_tiktok_token_privacy.sql`

**Interfaces:**
- Todas as funções TikTok exigem JWT verificado.
- Tokens são selecionados pelo servidor para `auth.uid()` e nunca retornam ao browser.
- Cliente autenticado lê apenas metadados públicos da própria conexão.

- [ ] **Step 1: Add failing contract tests** para chamada sem JWT e resposta contendo token.
- [ ] **Step 2: Verify RED**.
- [ ] **Step 3: Implement server-side token custody** e privilégios por coluna/RPC.
- [ ] **Step 4: Verify functions and tests**.
- [ ] **Step 5: Commit** com `sec(tiktok): keep provider tokens server-side`.

### Task 6: Toolchain, CI e dívida bloqueadora

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `eslint.config.js`
- Create: `.nvmrc`
- Create: `.github/workflows/ci.yml`
- Modify: arquivos apontados por regras de hooks/erros reais do lint.

**Interfaces:**
- Produces: `npm run check` executando lint, tests e build.
- Produces: CI Node 22 em todo push/PR.
- Produces: zero vulnerabilidades críticas/altas conhecidas ou exceção documentada com pacote e motivo.

- [ ] **Step 1: Upgrade dependencies** com `npm audit fix` e upgrades mínimos explícitos quando necessário.
- [ ] **Step 2: Run audit/build/tests** e corrigir regressões.
- [ ] **Step 3: Make lint a useful gate**: erros reais corrigidos; dívida `no-explicit-any` vira warning temporário em vez de esconder hooks quebrados.
- [ ] **Step 4: Add CI and run `npm run check` locally**.
- [ ] **Step 5: Commit** com `ci: enforce launch quality gates`.

### Task 7: Aplicação e validação operacional

**Files:**
- Modify: `supabase/config.toml`
- Verify: Vercel environment and public deploy.

**Interfaces:**
- Supabase linkado exclusivamente a `mvhxyqwicmvnshmqkdan`.
- Migrations aplicadas com registro verificável.
- Deploy identifica o commit por `VITE_GIT_COMMIT_SHA` ou metadado equivalente.

- [ ] **Step 1: Link and dry-run migrations** com `supabase link --project-ref mvhxyqwicmvnshmqkdan` e `supabase db push --dry-run`.
- [ ] **Step 2: Apply backward-compatible migrations** e verificar RPCs/tabelas no OpenAPI.
- [ ] **Step 3: Run smoke tests** de auth, RLS, criação, funding sandbox, webhook duplicado, aprovação e saque concorrente sem movimentar dinheiro real.
- [ ] **Step 4: Run final gates**: `npm run check`, `npm audit --audit-level=high`, `git diff --check` e build do commit exato.
- [ ] **Step 5: Push the hardening branch**; só integrar em `main` quando as variáveis obrigatórias estiverem configuradas e o preview passar.

