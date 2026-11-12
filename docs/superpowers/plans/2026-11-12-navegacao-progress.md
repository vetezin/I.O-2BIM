# SDD ledger — plan: docs/superpowers/plans/2026-11-12-navegacao.md

Pre-flight: tarefa única; sem interfaces entre tarefas.
Base: fa6ef09. Baseline: 18/18 testes Node passaram.
Ruling: usar branch feat/navegacao-lateral no checkout atual, sem worktree adicional — mantém Docker e chave local no caminho autorizado, sem criar cópias extras; main não será alterada. Risco: alterações visíveis no mesmo checkout.
Ruling: registro neste documento e comandos nativos Windows substituem scripts shell auxiliares — manter rastreabilidade sem dependências adicionais.

Task 1: complete — suíte Node 23/23; Docker 3/3, execução sequencial.
Final review: revisor independente encontrou dois P2; ambos corrigidos.
Final: fixed foco mobile — assert de foco no primeiro link RED→GREEN.
Final: fixed seleção ao retornar ao topo — espera por painel-1 RED→GREEN, suíte 23/23.
Final: minor (deferred): teste smoke.cjs apresentou falha intermitente em leitura de filtro após navegação ao rodar navegadores concorrentes no Docker; repetição isolada e conjunto sequencial 3/3 passaram. Sem alteração do código de filtros; risco de instabilidade do teste concorrente permanece.

- RED: tests/layout-navigation.cjs falhou pela ausência de .sidebar .navegacao.
- GREEN: suíte completa 23/23 passou; testes layout-navigation, dashboard.smoke e smoke também passaram contra Docker reconstruído (3/3).
- Navegador OpenCode aberto no Dashboard; console sem erros/avisos. Captura gerada, mas modelo não consegue inspecionar imagens; validação feita por DOM, estilos computados e geometria.
- Diagnóstico: favicon.ico retornava 403 nas três telas antigas. Corrigido com favicon vazio explícito, como já existia no Dashboard; teste passou sem ignorar console.
- Teste existente navegacao-chat.cjs adaptado para abrir menu recolhido antes de acessar links no mobile.
