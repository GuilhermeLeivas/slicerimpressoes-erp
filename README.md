# Slicer · ERP local para impressão 3D

Seu catálogo, estoque e finanças em um único lugar. Feito para uma pessoa, em um computador, em reais. Funciona sem internet e sem banco ou serviços pagos. Não instala dependências externas.

## 1. Abrir pela primeira vez

1. Abra esta pasta no Explorador de Arquivos.
2. Dê dois cliques em **INICIAR.bat**.
3. Mantenha a janela que aparece aberta.
4. No navegador, acesse **http://127.0.0.1:4310**. Se o navegador abrir antes do sistema terminar de iniciar, atualize a página.
5. Para fechar, clique em **Encerrar sistema** na barra superior e confirme. Aguarde a tela **Sistema encerrado**. Você também pode dar dois cliques em **ENCERRAR.bat**, mesmo se o servidor foi iniciado em outra janela, ou pressionar **Ctrl+C na janela que iniciou o servidor**.

O encerramento bloqueia novas operações, espera as gravações já aceitas terminarem, libera a base e fecha o servidor. Rascunhos que ainda não foram salvos não são gravados automaticamente; a confirmação avisa sobre isso. Fechar somente a aba do navegador não encerra o servidor. Se o ERP foi iniciado pelo Codex, fechar uma outra janela do BAT não encerra aquela instância: use o botão ou **ENCERRAR.bat**. No celular ou em janela estreita, o botão aparece como um ícone de fechar na barra superior.

O iniciador usa o Node.js instalado, ou o Node que acompanha o Codex neste computador. Em outra máquina, instale **Node.js 22 ou superior** pelo site oficial https://nodejs.org. Depois repita os passos. Não precisa executar `npm install`.

Alternativa no terminal, aberto nesta pasta:

```sh
node src/server.js
```

## 2. Configure o seu ateliê

1. Clique em **Configurações**.
2. Informe nome, assinatura, cor e logo. A marca inicial é **Slicer**.
3. Ajuste o custo de energia por kWh, da impressora por hora e do seu trabalho por hora.
4. Configure os canais reais em que vende: venda direta, sua loja, marketplaces etc.
5. Digite as comissões, taxas fixas e impostos que se aplicam à sua operação.
6. Clique em **Salvar configurações**.

**Os parâmetros de produção iniciais são exemplos editáveis. As taxas dos canais começam em zero: configure antes de usar a sugestão de preço.** O sistema não busca tarifas de plataformas nem calcula regras tributárias automaticamente.

## 3. Cadastre seu primeiro produto

1. Abra **Produtos → Novo produto**.
2. Em **Produto**, informe nome e código único (SKU), coleção, material, cor, dimensões e estoque. O **preço-base é automático**, calculado pelo custo e pela margem das configurações.
3. A coleção pode ser qualquer texto, por exemplo “Personagens”, “Séries” ou “Natal”. Coleções existentes aparecem como sugestões.
4. Em **Produção e custos**, informe os valores de **uma unidade**. Peso da peça e descarte são separados. Tempo de máquina é em horas; seu trabalho ativo é em minutos.
5. Informe os gastos de primer, tinta, lixa, cola, embalagem e licença que cabem a essa unidade. Rateie embalagens de tinta ou licenças mensais; não coloque o frasco inteiro em cada peça.
6. Em **Imagens e arquivo 3D**, adicione até seis fotos e um STL, OBJ ou 3MF. A primeira foto é a capa. Imagens: até 8 MB cada; modelo: até 70 MB.
7. Selecione uma ou várias plataformas nas caixas de seleção. Confira o custo, o preço-base e a tabela de preços sugeridos para cada plataforma. Salve. Os detalhes do produto mostram todos esses valores.

No catálogo, busque por nome, SKU, material ou cor; filtre por coleção e estoque. Alterne entre cartões e lista. Clique na imagem para detalhes, composição de custo, download do modelo e últimas movimentações. O lápis edita todas as informações; a lixeira remove o produto do catálogo sem apagar as vendas anteriores. Alterar o estoque registra um ajuste no histórico.

O arquivo 3D fica armazenado e disponível para download. Esta versão não oferece visualizador 3D, fatiamento ou conexão com a impressora.

## 4. Registre uma venda

1. Clique em **Registrar venda**.
2. Informe data, canal, forma de pagamento e referência do pedido. Cliente é opcional.
3. Adicione produtos e quantidades. O preço sugerido do canal é preenchido automaticamente; na venda você informa o preço efetivamente praticado e pode ajustá-lo. Ao trocar o canal, os preços preenchidos automaticamente são recalculados; valores que você editou são mantidos.
4. Confira as taxas vindas do canal. Acrescente desconto, publicidade e frete, se necessário.
5. A taxa adicional de pagamento só deve ser usada quando não estiver incluída na taxa da plataforma.
6. Se souber o custo de produção efetivo de todo o pedido, preencha **Produção real do pedido**. Deixe vazio para usar o custo estimado do cadastro (zero é um valor explícito).
7. Confira o resultado e a seção **Previsto × realizado**, depois confirme.

O estoque é baixado automaticamente. Não é possível vender mais unidades do que há disponíveis nem cadastrar quantidades fracionadas. São vendas **concluídas**, não pedidos pendentes. Para corrigir uma venda, abra seus detalhes, cancele e registre novamente; o cancelamento devolve o estoque e exclui a venda dos indicadores, mantendo o histórico.

O custo e o nome de cada produto, o canal e as taxas ficam **preservados na venda**. Alterar preço do filamento, nome de um produto ou taxas no mês seguinte não reescreve o passado.

## 5. Lance despesas e leia o painel

Em **Despesas**, registre site, sistemas, contabilidade e gastos gerais. Não lance de novo os custos já embutidos nas peças. Uma campanha pode ser rateada por venda ou lançada como despesa geral, mas não das duas formas ao mesmo tempo.

Em **Visão geral**, escolha mês, ano, todo o período ou datas específicas. Filtre também canal e pagamento. Veja:

- **Receita:** produtos − descontos + frete cobrado do cliente.
- **Produção:** custo unitário histórico × quantidades vendidas.
- **Resultado das vendas (contribuição):** receita − produção − taxas − impostos − frete pago − publicidade alocada.
- **Resultado operacional:** contribuição − despesas gerais cadastradas no período.
- Quantidade de pedidos, ticket médio, gráfico mensal, produtos por receita e comparação de canais.

O resultado operacional fica oculto ao filtrar um canal ou pagamento: as despesas gerais não são rateadas arbitrariamente entre eles. O painel não equivale a fluxo de caixa, balanço ou lucro líquido contábil. Não há contas a pagar/receber, conciliação bancária ou emissão fiscal nesta versão.

Em **Vendas**, há busca, filtros de status e ordenação por data, receita ou resultado. **Exportar CSV** respeita os filtros e pode ser aberto em uma planilha; vendas canceladas são identificadas. Os destaques de produto mostram receita bruta dos itens antes de descontos/frete.

## 6. Entenda o preço sugerido

O custo unitário soma filamento da peça + descarte, energia, máquina, trabalho, acabamento, embalagem, licença, outros custos e componentes adicionais (quantidade × custo unitário).

Energia = horas × potência média em watts ÷ 1000 × preço do kWh.

Impressora por hora deve incluir depreciação e manutenção, **sem energia**, pois ela já é calculada separadamente. Potência média precisa ser medida/estimada para sua operação; não é necessariamente a potência máxima da etiqueta da impressora.

Reserva de falhas = custo de filamento, energia e máquina × (1 ÷ (1 − taxa de falha) − 1). Por exemplo, 10% de falhas divide o custo de impressão por 0,9. Não acrescenta automaticamente falhas de pintura nem horas extras de trabalho.

Preço-base = custo unitário ÷ (1 − margem desejada%).

Preço sugerido por canal e pagamento = (custo unitário + fixo do canal + fixo do pagamento) ÷ (1 − comissão% − impostos% − pagamento% − margem desejada%).

O preço-base não é editável no cadastro. Ele e os preços das plataformas acompanham automaticamente custos, margem e taxas atuais. Produtos antigos passam a exibir o cálculo automático; vendas históricas não mudam. Produtos anteriores à seleção de plataformas mostram todos os canais disponíveis até serem editados. Uma nova plataforma deve ser selecionada nos produtos já configurados. Remover um canal das configurações o remove das sugestões atuais, preservando vendas passadas.

A sugestão presume **uma unidade por pedido** e inclui as taxas do pagamento cadastrado, mas não inclui frete, publicidade ou despesas gerais. A margem é sobre o preço de venda, não um acréscimo sobre o custo. Uma combinação que deixa o divisor zero ou negativo é exibida como inviável.

Comissão, impostos e taxa de pagamento da venda incidem sobre sua receita total, incluindo frete. Plataformas com cobrança por item, faixas ou outras bases exigem ajustar a taxa fixa/percentual do pedido. Não há motor de regras tributárias ou de marketplace nesta versão.

### Previsto × realizado: onde foi parar a margem?

Cada nova venda salva uma previsão com os preços sugeridos, custos, margem e taxas do cadastro **no momento do registro**. Essa previsão considera a quantidade vendida, cobra a taxa fixa uma vez por pedido e não pressupõe desconto, frete ou publicidade.

Na prévia, nos detalhes da venda e no dashboard, a diferença é **resultado informado − resultado previsto**. Negativo significa abaixo da previsão; positivo significa acima. Não é necessariamente prejuízo: ainda pode haver resultado positivo abaixo do planejado.

A reconciliação mostra, em sequência, impactos de preço praticado, desconto, frete líquido, publicidade, diferenças de taxas/impostos e produção real. Descontos e frete já consideram as taxas previstas; mudanças nas taxas efetivamente cobradas aparecem na linha de taxas. Esses impactos somam exatamente a diferença, inclusive os arredondamentos.

Exemplo: custo de R$ 30, margem de 30% e comissão de 15% → preço-base R$ 42,86 e preço da plataforma R$ 54,55. Uma unidade vendida nesse preço prevê resultado de R$ 16,37. Frete de R$ 10 pago pela loja, sem cobrança ao cliente, reduz o resultado para R$ 6,37: diferença de −R$ 10, atribuída ao frete.

Se o custo real de produção não for informado, a produção permanece **estimada**. O sistema não mede energia, desperdício ou material automaticamente. O comparativo não inclui despesas gerais (descontadas no resultado operacional).

Vendas anteriores à atualização ficam como **sem previsão histórica**; não reconstruímos uma previsão usando taxas atuais. Vendas com margem inviável também ficam sem comparação. O painel informa quantas vendas têm referência, respeita os filtros e desconsidera cancelamentos. O CSV exporta previsão, diferença e impactos, deixando vazio quando não há referência.

## 7. Onde ficam os dados e como fazer backup

Tudo fica na subpasta **data**, criada no primeiro início:

```text
data/
  database.json       produtos, vendas, despesas, estoque e configurações
  assets/             imagens e modelos 3D, com seus metadados
  backups/            últimas 50 versões da base, anteriores às alterações
  .server.lock        trava enquanto o programa está aberto
```

**Backup completo, passo a passo:**

1. Feche o programa com Ctrl+C.
2. Copie **a pasta data inteira** para um disco externo ou outro lugar seguro.
3. Dê à cópia um nome com a data, por exemplo `slicer-backup-2026-10-05`.
4. Abra o programa novamente.

As 50 cópias automáticas protegem de alterações recentes, mas estão no mesmo disco: não protegem de perda do computador. Elas contêm registros; os anexos são mantidos em `assets`, inclusive depois de remover produtos, para não invalidar backups.

**Restaurar um backup completo:** feche o programa, renomeie a pasta `data` atual para preservá-la, copie a pasta do backup para o local com o nome `data` e abra o programa. Se uma cópia antiga contiver `.server.lock`, remova somente esse arquivo com o sistema fechado.

**Desfazer usando uma cópia automática:** com o programa fechado, preserve uma cópia da pasta `data`. Copie o JSON escolhido de `data/backups` sobre `data/database.json`. Mantenha `assets` intacta. Nunca edite a base enquanto o ERP estiver aberto.

**Exportar registros JSON**, em Configurações, é uma exportação de dados sem anexos. Não substitui o backup completo. A exportação CSV de vendas é um relatório, não um backup.

## 8. Segurança e limites da primeira versão

- Servidor ligado somente em `127.0.0.1`. Não fica acessível na rede ou na internet.
- Sem login: qualquer pessoa com acesso ao seu computador pode abrir o ERP. Use a proteção da sua conta do Windows e bloqueie a tela.
- Verificação de Host, origem e token local nas gravações, política de conteúdo e escape de texto na interface.
- Tipos e limites de anexos controlados; arquivos 3D são servidos como download, nunca executados. Imagens SVG/HTML não são aceitas.
- Gravações sequenciais, troca atômica do JSON e bloqueio de duas instâncias usando a mesma base. Uma venda é salva junto com a baixa de estoque.
- Não há criptografia do disco pelo aplicativo. Use proteção do sistema operacional para isso.
- Não abra portas, altere o endereço de escuta ou exponha este servidor publicamente. Acesso remoto/multiusuário exige autenticação, autorização e revisão da arquitetura de implantação.
- A base inteira é lida em memória. Indicada para operação local pequena; grandes catálogos/históricos justificam migrar o armazenamento.

## 9. Arquitetura e como expandir

```text
src/domain/model.js                 validações, cálculo de custo, venda e indicadores
src/domain/pricing.js               cálculos puros compartilhados com a prévia da tela
src/application/erp.js              casos de uso e coordenação de transações
src/infrastructure/local-store.js   armazenamento JSON e backups
src/infrastructure/local-assets.js  armazenamento local de arquivos
src/server.js                       HTTP, segurança e composição de dependências
public/                            interface responsiva sem dependências externas
tests/                             regras de negócio, persistência e HTTP
```

Dependências apontam para dentro: o domínio não importa infraestrutura nem HTTP. A aplicação recebe os adaptadores por construtor. O servidor é a raiz de composição. Cálculos, validação, armazenamento e apresentação têm responsabilidades distintas. Os contratos pequenos evitam amarrar o caso de uso ao filesystem.

**Porta de registros (`Store`):** `read()` retorna o estado; `transaction(fn)` fornece um estado isolado e persiste todas as mudanças de `fn` atomicamente, ou nenhuma em caso de erro. Operações concorrentes não podem perder atualizações. O JSON implementa isso com fila, backup e substituição atômica. SQL ou MongoDB podem implementar a mesma porta usando transações. Para bases maiores, evolua a porta para consultas e repositórios mais granulares; a porta atual é deliberadamente simples e orientada ao estado local.

**Porta de arquivos (`AssetStore`):** `put({name,data})`, `get(id)` e `bytes(id)` guardam e recuperam arquivos por identificador estável. `put` recebe Base64; `bytes` devolve metadados e Buffer. Um adaptador S3 poderia implementar essa porta sem mudar os casos de uso. Para arquivos grandes, uma evolução para streams é recomendável. S3 guarda anexos; não substitui sozinho uma base transacional de vendas.

Nenhum adaptador SQL, MongoDB ou S3 está implementado. A separação de portas é o ponto de extensão, não uma promessa de migração sem trabalho. A base usa `schemaVersion: 1`; alterações futuras de formato devem ter migrações e testes.

**Identidade:** nome, assinatura, cor e logo ficam nas configurações. Tokens visuais estão em `public/style.css` (`:root`) e ícones/estrutura em `public/app.js`. Não há fontes, scripts ou imagens externas. A identidade final pode substituir esses tokens e o logo sem alterar as regras de negócio.

## 10. Verificar o sistema

No terminal nesta pasta:

```sh
node --test tests/*.test.js
```

Os testes usam diretórios temporários, não a sua base. Cobrem custos, arredondamento, preservação de histórico, concorrência de estoque, cancelamento, filtros, persistência, anexos e segurança HTTP.

Para desenvolvimento/testes com base separada, use `DATA_DIR` e `PORT`. Exemplo PowerShell:

```powershell
$env:DATA_DIR = "$env:TEMP\slicer-teste-manual"
$env:PORT = "4311"
node src/server.js
```

O primeiro início abre uma base vazia: não há vendas fictícias misturadas aos seus números.

## Problemas comuns

- **Página não abre:** mantenha a janela do programa aberta, aguarde o endereço aparecer e atualize o navegador.
- **Porta ocupada:** confira se já existe uma janela do ERP aberta. Acesse a instância existente.
- **Base aberta em outra instância:** feche o outro processo. Não remova a trava com ele em execução.
- **Não foi possível ler a base:** o sistema não apaga os dados nem cria uma base vazia por cima. Preserve a pasta e restaure uma cópia conforme o passo 7.
- **Sessão expirada:** o servidor reiniciou; atualize a página e refaça o cadastro ainda não salvo.
- **Resultado negativo:** confira preço, taxas, custos, frete e descontos. O sistema mostra prejuízo; não aumenta o preço automaticamente.

## Produtos compostos: quadros, molduras e outros materiais

1. Abra **Produtos → Novo produto** (ou edite um existente).
2. Em **Tipo de produto**, escolha Impressão 3D, Quadro com moldura ou Produto composto / outros.
3. Na aba **Produção e custos**, um quadro ganha linhas de **Moldura** e **Arte impressa / fundo**. Preencha quantidade consumida por produto e custo de cada unidade do componente.
4. Use **Adicionar componente** para vidro, fixadores, base de madeira ou qualquer outro material. Pode usar quantidades fracionárias. Remova somente linhas que não compõem o produto.
5. Informe trabalho de montagem no campo de trabalho ativo. Não repita os mesmos gastos em “Outros custos”. Se não houver impressão 3D, deixe os consumos de impressão em zero.
6. Os componentes entram automaticamente no custo, preço-base, sugestões por canal/pagamento e nas vendas. Trocar o tipo não apaga custos. O estoque continua sendo do produto acabado, sem controle separado de estoque dos insumos.

## Loja própria e taxas de pagamento

1. Abra **Configurações → Marketplaces e canais de venda** e adicione um canal chamado Nuvemshop (ou o nome desejado).
2. Escolha **Loja própria** e informe comissão por venda, taxa fixa por pedido e impostos conforme seu contrato. O sistema não consulta nem inventa tarifas.
3. Expanda **Taxas adicionais por forma de pagamento**. Configure percentual e valor fixo de Pix, cartão, boleto etc. Se o marketplace já inclui essa cobrança, deixe os adicionais em zero para não duplicar custos.
4. Salve. Selecione o canal no produto: as sugestões passam a distinguir cada pagamento. Métodos com zero indicam ausência de taxa adicional, não disponibilidade comercial do método.
5. Ao registrar a venda, escolher canal e pagamento preenche taxas e preço sugerido. Preços digitados manualmente são preservados ao trocar o canal/pagamento. Confira as taxas reais, especialmente antecipação e parcelamento, e ajuste no pedido quando necessário.
6. Cadastre a **mensalidade da plataforma em Despesas**, uma vez no mês correspondente. Ela reduz o resultado operacional geral; não é cobrada inteira em cada produto nem rateada automaticamente nos filtros por canal.

Fórmula por unidade: `(custo de produção + fixo do canal + fixo do pagamento) ÷ (1 − margem − comissão − impostos − percentual do pagamento)` (percentuais convertidos para fração). Se a soma inviabiliza a margem, a sugestão informa isso. Na venda, cada taxa fixa é cobrada uma vez por pedido e percentuais incidem na receita após desconto, incluindo frete cobrado. Pedidos com várias unidades podem ter margem maior que a sugestão unitária por compartilhar o fixo. Regras diferentes do contrato precisam de ajuste no registro da venda.

Os registros antigos continuam válidos, com componentes e taxas adicionais ausentes tratados como zero. Vendas já gravadas não são recalculadas. Novas vendas congelam o detalhamento dos componentes e a previsão das taxas do pagamento, permitindo comparar produção e taxas previstas com as efetivamente informadas. Esta versão registra vendas manualmente; não sincroniza pedidos com Nuvemshop.
