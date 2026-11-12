# Navegação lateral Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Liberar header e destacar navegação contextual do Dashboard.
**Architecture:** Menu lateral compartilhado nas quatro páginas. Atalhos renderizados pelo Dashboard no header; cabecalho.js mede alturas e acompanha seção ativa.
**Tech Stack:** HTML, CSS, JavaScript nativos; Node test e Playwright existentes.
**Spec:** docs/superpowers/specs/2026-11-12-navegacao-design.md

## Global Constraints
Sem dependências novas. Preservar dados, filtros, chat e decisões. Sem push sem autorização.

## Review Focus
- Tela estreita: menu acessível, sem transbordamento horizontal.
- Teclado: botão Menu expõe aria-expanded e links continuam acessíveis.
- Filtros: rerender não remove atalhos nem seleção.
- Rolagem: header/filtros não cobrem título de destino.
- Quatro páginas: somente página atual tem aria-current=page.

### Task 1: Navegação compartilhada e Dashboard
**Files:** index.html, compras.html, decisoes.html, dashboard.html, css/navegacao.css (novo), js/cabecalho.js, dashboard/app.mjs, tests/layout-navigation.cjs (novo).
**Interfaces:** Navegação principal existente movida para aside; #dashboard-panel-nav recebe atalhos; seleção usa aria-current=location.

- [x] Criar teste de navegador para menu lateral, página atual, atalhos no header, seleção após clique/filtro e menu mobile.
- [x] Executar teste e confirmar falha antes da implementação.
- [x] Implementar menu lateral compartilhado, layout responsivo e botão Menu.
- [x] Mover atalhos para header e sincronizar seleção sem alterar filtros no hash.
- [x] Executar novo teste e testes existentes pertinentes.
- [x] Reconstruir Docker, conferir desktop/mobile e console em navegador.
- [x] Revisar diff, corrigir regressões, atualizar checklist e criar commit local.
