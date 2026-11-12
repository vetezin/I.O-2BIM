# Navegação lateral e atalhos do Dashboard

Design aprovado na conversa em 12/11/2026.

- Retirar Home, Compras, Decisões e Dashboard do header e colocar em menu lateral nas quatro páginas; indicar página atual.
- No celular, menu recolhido com botão Menu acessível por teclado.
- Mover os seis atalhos do Dashboard para o header. Destacar seção selecionada com azul forte e texto branco. Preservar navegação por rolagem e todos os painéis visíveis.
- Preservar filtros, cálculos, gráficos, decisões e chat. Não adicionar dependências.

## Abordagens
Menu lateral escolhido pelo usuário: libera header para navegação contextual. Manter abas no header não atende ao espaço necessário. Uma segunda barra geral no topo duplicaria navegação sem benefício.

## Decisões técnicas
Reutilizar HTML/CSS/JavaScript existentes. Estilos compartilhados para menu lateral e comportamento em js/cabecalho.js, já carregado nas quatro páginas. Seleção contextual acompanha clique e seção visível, permanece após atualização dos filtros. Sem alterações de backend ou segredos.
