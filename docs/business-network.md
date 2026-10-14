# Negócios — regras e verificação

## Visibilidade aprovada

- Conversas privadas entre os participantes. O histórico das mensagens permanece
  acessível mesmo após encerrar uma campanha ou deixar de seguir o contato.
- Posts e imagens do feed visíveis apenas ao autor e às conexões mútuas.
  Imagens em bucket privado, com links temporários de cinco minutos.
- Histórico de campanhas concluídas e avaliações públicos nos perfis.
- Sem publicar mensagens privadas, comprovantes, dados financeiros ou contatos
  pessoais no histórico público.

## Fluxos

`/negocios` contém Feed, Conexões e Histórico. Marcas e creators podem publicar
textos e imagens, seguir perfis e curtir posts que têm permissão de ver. Marcas
podem vincular uma campanha própria e ativa; o link abre seus detalhes.

O chat de uma campanha é iniciado por sua candidatura. O servidor encontra as
duas partes e cria a conversa e os participantes na mesma transação, com trava
contra duplicação. DMs sem campanha exigem conexão mútua ou relacionamento
anterior. Apenas `last_read_at` pode ser alterado na associação de participantes.

Avaliações são de uma a cinco estrelas, com comentário opcional. Só as duas
partes de uma campanha financiada e concluída podem avaliar, uma vez cada;
autoavaliação não é permitida. A avaliação geral não inventa notas por critério.

As novas datas de aceite, entrega e conclusão são registradas pelo banco.
Registros anteriores sem essas datas aparecem sem prazo de entrega calculado.
O histórico carrega 50 parcerias por página e permite consultar as anteriores.

Permutas exibem **Permuta**, parceria e produto recebido, sem sugerir recompensa
em dinheiro. A taxa de R$ 25 por vaga pertence ao fluxo de cobrança da plataforma;
não é um repasse ao creator. Campanhas por etapas exibem **Por etapas**.

## Testes

- `npm test`: regressões de chat, pagamentos e restante da aplicação.
- `npm run test:business`: PostgreSQL isolado via PGlite, executando as migrações
  reais e verificando privacidade de posts/imagens, criação atômica de chat,
  avaliações, proteção de datas e rollback dos dados sintéticos.
- `npx tsc -p tsconfig.app.json --noEmit`: checagem real dos tipos da aplicação.
- Prévia local em navegador com dados fictícios: publicar, curtir, conexões,
  avaliação e link para campanha; layout mobile e desktop.

Testes sintéticos em produção foram recusados pela revisão automática e não
foram executados. Em produção foram verificadas apenas configurações e consultas
de leitura, além da aplicação das migrações autorizadas.
