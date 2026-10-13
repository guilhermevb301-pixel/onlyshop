# Teste de pagamento direto com creator

O split de teste é habilitado no servidor apenas para a marca identificada por
`MP_SPLIT_TEST_BRAND_ID`. `MP_SPLIT_LIVE` permanece desligado. Campanhas novas
com pagamento por vídeo dessa marca usam split; permutas e pagamentos por etapas
continuam no fluxo de financiamento antecipado. Campanhas antigas não mudam.

## Execução

1. O creator acessa `/wallet` e conecta sua própria conta Mercado Pago. A conta
   deve ser diferente da conta da plataforma.
2. A marca habilitada cria uma campanha nova por vídeo, com uma vaga e recompensa
   de R$ 10. Ela publica sem cobrança antecipada.
3. O creator se candidata. A marca aprova o perfil e acessa **Pagar contratados**.
4. O checkout cobra R$ 12: R$ 10 para o creator antes das tarifas do Mercado Pago
   e R$ 2 de taxa OnlyShop. Confirme os valores no checkout antes de pagar.
5. Depois do pagamento, volte ao painel. O webhook confirma o pagamento; se a
   notificação falhar, o painel consulta o provedor a cada 30 segundos enquanto
   visível e ao voltar à janela.
6. Confira o ID, status aprovado, destinatário, taxa da plataforma e tarifas no
   Mercado Pago. Confira no Supabase que `split_payments.status` é `paid` e que
   existe somente um lançamento informativo `split_payout` para esse pagamento.
7. Recarregue o painel: a vaga paga não pode oferecer nova cobrança e o split
   não pode virar saldo disponível para saque na carteira OnlyShop.

O teste só é concluído depois de conferir o pagamento real nas duas contas.
Não interpretar a criação do checkout nem testes com respostas simuladas como
prova de recebimento do dinheiro.

## Recuperação de financiamento antecipado

`POST /api/fund-campaign` com `action: "reconcile"` e `campaignId` exige sessão
da marca dona. A confirmação verifica o pagamento diretamente no Mercado Pago,
incluindo status, referência, moeda, valor e estorno, e usa o RPC atômico existente.
O retorno do checkout nunca é tratado como comprovante de pagamento.

## Credenciais da plataforma

`MP_PLATFORM_OAUTH_USER_ID` e `MP_PLATFORM_USER_ID` identificam a conexão já
verificada da plataforma. O servidor usa essa conexão na mesma aplicação do
OAuth e renova o token próximo do vencimento, persistindo o refresh token rotacionado.
Não alterar essa conexão para uma conta de creator.
