# Painel de Suprimentos Alcar

Protótipo acadêmico com dados fictícios. HTML, CSS, JavaScript e base simulada separados, sem dependências para executar o painel.

## Executar

Com Node.js instalado, execute na pasta do projeto:

```sh
node serve.cjs
```

Abra http://127.0.0.1:4173. Use sempre a mesma origem (endereço e porta) para preservar filtros e decisões entre as páginas. Também pode hospedar os arquivos em qualquer servidor estático.

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
- Agente acessível por botão flutuante que abre uma janela modal com fechamento por botão ou Escape.

## Validação

Os testes usam Playwright previamente instalado; não há instalação automática:

```sh
node tests/smoke.cjs
```

Se necessário, defina `PLAYWRIGHT_MODULE_PATH` com o caminho do módulo instalado e `CHROME_PATH` com o executável do navegador. Os testes usam uma porta local livre e um contexto de navegador isolado.

O protótipo não possui autenticação real, integração SAP ou IA generativa. Perfis são demonstrativos; decisões e filtros ficam no armazenamento local do navegador. A aprovação representa uma requisição simulada, sem entrada física de estoque. O mapa não deve ser usado como informação meteorológica operacional.
