# Verificação da versão local

## Encerramento local

14 testes automatizados passaram, incluindo proteção do comando de encerramento por token e origem, espera de gravações já aceitas, rejeição de novas alterações durante o fechamento, remoção da trava e execução do comando usado por `ENCERRAR.bat`. O botão foi confirmado no navegador em uma instância isolada: a tela mostrou **Sistema encerrado**, a porta deixou de responder e o processo terminou com código 0. A instância de uso na porta 4310 foi deixada desligada conforme solicitado.

## Atualização 1.1 — preços automáticos e comparação

Doze testes automatizados passaram. Quatro testes adicionais cobrem preço-base e múltiplas plataformas, soma exata dos impactos (com arredondamento), diferenças favoráveis e margem inviável, preservação da previsão após alteração de taxas, filtros, cancelamentos e vendas antigas sem referência.

No navegador, em base separada: custo R$ 30 → base R$ 42,86; canal com 15% → R$ 54,55. O cadastro salvou ambas as plataformas; os detalhes mostraram os dois preços. Remover uma seleção e salvar manteve somente a plataforma escolhida. A venda preencheu o preço do canal; com R$ 10 de frete pago, a prévia e o dashboard exibiram R$ 16,37 previstos, R$ 6,37 realizados e diferença de −R$ 10 atribuída ao frete. Nenhuma venda de teste foi criada na base de uso.

Verificado em 5 de outubro de 2026. Dados usados no navegador foram criados em uma base de testes separada (`test-results/qa-data`), sem registros fictícios na base de uso (`data`).

## Testes automatizados

Oito testes passam com `node --test tests/*.test.js`:

- Custo de produção, perdas e margem sobre venda.
- Venda com fotografia financeira, edição posterior do produto e cancelamento sem devolução duplicada.
- Duas vendas concorrentes disputando o mesmo estoque.
- SKU duplicado, números inválidos, estoque fracionado, item duplicado, data e desconto inválidos.
- Filtros, despesas gerais e preservação de vendas após exclusão do produto.
- Reabertura da base e conteúdo do backup anterior à alteração.
- Tipos de anexos, assinatura de imagem e proteção de caminhos.
- Gravação HTTP, token de sessão, bloqueio de origem e Host, exportação e bloqueio de duas instâncias.

## Navegador

- Cadastro de produto com coleção, material, preço, estoque e custos.
- Custo de R$ 25,11 para a combinação de teste cadastrada.
- Venda de duas unidades por R$ 179,80 com comissão de 12%: produção R$ 50,22 e resultado R$ 108,00.
- Baixa de estoque de 12 para 10.
- Despesa de R$ 20: resultado operacional de R$ 88.
- Filtro por Pix oculta resultado operacional sem ratear despesas gerais.
- Alteração de taxa de canal e salvamento das configurações.
- Upload de PNG e STL, salvamento, reabertura do produto e download do STL.
- Reinício do servidor mantendo os registros.
- Cancelamento de venda, preservação do histórico e retorno do estoque a 12.
- Busca sem correspondências e exclusão do produto do catálogo.
- Painel verificado em largura de 390 px, sem transbordamento horizontal da página.
- Nenhum erro ou aviso registrado no console durante os fluxos verificados.

## Limites desta verificação

Não é uma auditoria externa de segurança. Não inclui uso prolongado, queda física de energia, cargas grandes, todos os navegadores ou validação de impressão dos arquivos 3D. Os testes usam dados ilustrativos e não certificam taxas fiscais ou tarifas de plataformas.

## 10/10/2026 — Produtos compostos e pagamentos por canal

- 18 testes automatizados aprovados, incluindo componentes, taxas percentuais/fixas, múltiplas unidades, previsão × realizado, compatibilidade e preservação histórica.
- Testes executados com bases temporárias; testes HTTP executados com acesso ao loopback local. Base real não alterada.
- Navegador: cadastro de quadro com moldura (20) + arte (5), custo 25 e base 35,71. Canal próprio de teste com comissão 2%, cartão 5% + fixo 2: sugestão 42,86; venda com contribuição 12,86 e diferença zero; estoque passou de 5 para 4.
- Edição reaberta preservou componentes. Verificação responsiva em 390 × 844: página sem transbordamento horizontal. Evidências: componentes-desktop.png e componentes-mobile.png.
- Tarifas usadas na verificação são fictícias, não tarifas da Nuvemshop. Mensalidade permanece despesa geral. Sem sincronização externa ou estoque separado de insumos.
