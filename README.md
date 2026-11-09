# Painel de Suprimentos Alcar

Protótipo acadêmico com dados fictícios. HTML, CSS, JavaScript e base simulada separados, sem dependências para executar o painel.

## Nova aba Dashboard

Abra `dashboard.html` pelo menu. A aba usa exclusivamente `dashboard/dados_alcar.json` do contrato DW, com seis painéis, filtros conforme a matriz do guia, exportação CSV, visão tabular, simulação de nível de serviço e decisões persistidas localmente. Home, Compras e Decisões preservam o protótipo anterior.

Especificação em `docs/dashboard/GUIA_DASHBOARD_SAD.md`; resultados, limitações do contrato e respostas às perguntas finais em `docs/dashboard/VALIDACAO.md`.

Testes adicionais:

```sh
node --test tests/dashboard.test.cjs
node tests/dashboard.smoke.cjs
```

## Executar

Com Node.js instalado, execute na pasta do projeto:

```sh
node serve.cjs
```

Abra http://127.0.0.1:4173. Use sempre a mesma origem (endereço e porta) para preservar filtros e decisões entre as páginas. Também pode hospedar os arquivos em qualquer servidor estático.

O servidor precisa permanecer em execução durante o uso. O Dashboard mostra um erro com opção de tentar novamente se seus módulos falharem ou o JSON não responder em 15 segundos.

### Docker Compose no CMD do Windows

Com o Docker Desktop iniciado, abra o CMD na pasta do projeto:

```bat
cd /d "C:\Users\Victor\Desktop\Faculdade\I.O\painel"
docker compose up --build -d
docker compose logs -f painel
```

Abra [o painel](http://127.0.0.1:4173/). Para sair dos logs, pressione Ctrl+C. Para parar e remover o contêiner, execute `docker compose down`.

A imagem usa o JSON já versionado em `dashboard/dados_alcar.json`. A geração por Python e SQLite continua separada. Decisões e filtros são guardados pelo navegador na origem `http://127.0.0.1:4173`.

Com o painel no ar e o Playwright configurado conforme a seção Validação, rode no CMD:

```bat
node --test tests/dashboard.test.cjs
set "PAINEL_URL=http://127.0.0.1:4173/"
node tests/smoke.cjs
node tests/dashboard.smoke.cjs
set "PAINEL_URL="
```

Validação no Docker Desktop para Windows em 09/11/2026: seis testes do Dashboard e os dois testes de navegador acima passaram. Os fluxos cobriram Home, Compras, Decisões e Dashboard, incluindo carregamento do JSON, filtros, chat local e decisões após recarregar.

### Ativar o Gemini no CMD

No [Google AI Studio](https://aistudio.google.com/apikey), selecione um projeto e crie uma chave **Auth** para a Gemini API. Salve somente a chave no arquivo aberto pelo Bloco de Notas e feche o editor.

```bat
mkdir "%LOCALAPPDATA%\Alcar"
notepad "%LOCALAPPDATA%\Alcar\gemini_api_key.txt"
set "GEMINI_KEY_FILE=%LOCALAPPDATA%\Alcar\gemini_api_key.txt"
docker compose -f compose.yaml -f compose.gemini.yaml up --build -d
```

Se você já salvou a chave no arquivo local ignorado `API_KEY.txt` na pasta do painel, use `set "GEMINI_KEY_FILE=%CD%\API_KEY.txt"` no lugar do caminho acima. O servidor também aceita uma única linha no formato `API_KEY=valor` ou `GEMINI_API_KEY=valor`, sem aspas.

O Compose monta uma chave por instalação como segredo em `/run/secrets/gemini_api_key`. O arquivo fica fora do projeto. O navegador envia a pergunta ao Node, que calcula o recorte e envia ao Gemini somente os fatos selecionados da base fictícia e do acervo do painel. O histórico e o último item ficam na conversa da página aberta. Fechar e reabrir o chat na mesma página preserva a conversa. Com o Compose padrão, o chat usa as regras locais.

O servidor usa o modelo estável `gemini-3.5-flash-lite`, com faixa gratuita. Consulte as cotas ativas por projeto e modelo no AI Studio. Na faixa gratuita, o Google pode usar entradas e saídas para melhorar seus produtos e submetê-las a revisão humana. [Modelo](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) · [Cotas](https://aistudio.google.com/rate-limit) · [Termos](https://ai.google.dev/gemini-api/terms)

**Simulado.** Rode `node --test tests/gemini.test.cjs`. O teste usa uma chave fictícia e substitui a chamada externa.

**Real.** Após subir com a chave, na Home filtre o item `AL-344425` e abra a consulta. Pergunte “Qual é o saldo do AL-344425?” e depois “E o ponto de pedido?”. Compare com a tabela de risco. No nível de serviço de 95%, o saldo é 2 unidades e o ponto de pedido é 4 unidades. As respostas geradas indicam “redação: Gemini” junto à fonte. Se o Google rejeitar a chave, confira o projeto no AI Studio e copie uma chave válida, sozinha em uma linha no arquivo salvo em UTF-8. Depois recrie o contêiner com `--force-recreate`.

Em 09/11/2026, os 12 testes de integração simulada passaram. No Chrome com Docker e API simulada, o saldo e o ponto de pedido coincidiram com a Home. A geração com Gemini 3.8 Flash excedeu o tempo limite. Após a troca para Gemini 3.5 Flash-Lite, as duas consultas reais pelo chat no Docker passaram, com saldo de 2 unidades e ponto de pedido de 4 unidades, iguais aos valores da Home.

## Ajustes da Home e Compras

- Setas junto aos títulos de risco e benchmarking substituem os botões de recolher/expandir.
- Os seis indicadores da Home têm botão de informação com significado e fórmula. As explicações abrem por mouse, teclado ou toque; Escape fecha.
- Compras possui filtro de criticidade (Crítico/Atenção), preservado na navegação e recarga e removido por Limpar filtros.
- O cabeçalho acompanha a rolagem nas quatro telas; a posição dos filtros considera a altura real do cabeçalho.
- Home, Compras, Decisões e Dashboard usam a mesma disposição agrupada dos links de navegação.
- A consulta de IA abre uma caixa flutuante expansível, sem bloquear a página. Fechar ou pressionar Escape dentro da consulta preserva a conversa para reabertura na mesma página.

Verificação adicional: `node tests/ajustes-home.cjs` (mesma configuração de Playwright e Chrome dos demais testes).

Navegação e consulta flutuante: `node tests/navegacao-chat.cjs`.

## Arquivos

- `index.html`: Home, indicadores, consumo, clima, risco e benchmarking.
- `compras.html`: sugestões, aceite/recusa do analista e aprovação/devolução do setor de compras.
- `decisoes.html`: histórico persistido no navegador e exportação CSV.
- `css/`: estilos existentes e ajustes de navegação e layout.
- `js/dados.js`: base simulada original, com semente fixa.
- `js/app.js`: cálculos, gráficos e regras do protótipo original.
- `js/interface.js`: navegação, filtros compartilhados, janela do agente, mapa demonstrativo e exportação XLSX.
- `tests/smoke.cjs`: testes funcionais com Playwright.

## Ajustes do documento

- Filtro “Família” renomeado para “Tipo de item”. Período substituído por datas inicial/final. Como a base é semanal, entram semanas que se sobrepõem ao intervalo informado.
- Filtros de item, fornecedor, tipo, safra, demanda, ABC, risco e nível de serviço preservados ao navegar. As datas filtram o consumo histórico; risco e compras representam o estoque atual. As decisões atuais continuam visíveis mesmo fora do período histórico, respeitando os filtros dos itens.
- Consumo exportado como `.xlsx` com valores numéricos, respeitando datas, itens e unidade selecionada. A planilha contém o histórico real/previsto do recorte, sem as oito semanas de projeção ilustrativa.
- Card climático alterna com um mapa esquemático da usina fictícia. Não há localização ou serviço meteorológico definido no documento: o mapa usa os mesmos dados simulados, sem radar nem previsão real.
- Compras e decisões possuem páginas próprias, com links no cabeçalho. A Home contém um resumo e botão para abrir as compras. Aceites, recusas, aprovações e devoluções aparecem no histórico.
- Risco ocupa a largura disponível; risco e benchmarking possuem controles de recolher/expandir.
- Agente acessível por botão flutuante que expande uma caixa de conversa sem bloquear a página, com fechamento por botão ou Escape.

## Validação

Os testes usam Playwright previamente instalado; não há instalação automática:

```sh
node tests/smoke.cjs
```

Se necessário, defina `PLAYWRIGHT_MODULE_PATH` com o caminho do módulo instalado e `CHROME_PATH` com o executável do navegador. Os testes usam uma porta local livre e um contexto de navegador isolado.

Os perfis são demonstrativos, sem autenticação real. Decisões e filtros ficam no armazenamento local do navegador. A aprovação representa uma requisição simulada, sem entrada física de estoque ou integração SAP. O mapa é ilustrativo.
