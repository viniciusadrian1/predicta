# Tela 04 — Detalhe do ativo: Visão Geral

> Refinamento de produto. Arquivos reais de referência: `src/pages/AtivoDetail.tsx` (cabeçalho + abas + outlet), `src/pages/ativo/Overview.tsx` (conteúdo da aba). Grounding: `src/lib/types.ts` (`AssetTwin`, `Asset`, `FailureMode`, `TagKey`), `src/lib/recommendations.ts`, `src/components/ui-shared/index.tsx`, `src/components/layout/chrome.tsx`, `src/auth/rbac.ts`, `src/lib/theme.ts`.

---

## 1. Nome da tela

**Detalhe do ativo — Visão Geral** (`/ativos/:id/overview`).

É a aba inicial da rota de detalhe do ativo. O componente pai `AtivoDetail` (`src/pages/AtivoDetail.tsx`) renderiza um **cabeçalho persistente do ativo** + uma **barra de 5 abas** (`Visão Geral`, `Telemetria`, `Saúde & IA`, `Gêmeo Digital`, `Dados Técnicos`) e injeta `{ asset, twin }` via `Outlet context`. A aba "Visão Geral" (`src/pages/ativo/Overview.tsx`) é a **vitrine de síntese** do ativo — o ponto de partida da trilha de inspeção. Esta especificação cobre o cabeçalho + a aba Overview como uma unidade de leitura, porque no produto real elas funcionam juntas (o cabeçalho nunca aparece sem uma aba).

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** Hoje `AtivoDetail` resolve o ativo por `useParams().id` contra o store (`assets.find`), busca o gêmeo digital vivo em `twins[asset.id]`, e calcula três KPIs de cabeçalho: `saude` (de `twin.health`), `proxManut` (do primeiro item de `recommendationsFor(twin, 0.15)`, em dias) e `Disponib.` (de um mapa estático `AVAIL` por status — `normal:99.5, atencao:98, critico:92, offline:70`). O cabeçalho mostra ícone, nome (`asset.nome`), `Badge` de status, TAG mono (`asset.id`), localização (`asset.area — asset.planta`), tipo e um indicador ao-vivo/offline. A aba Overview entrega quatro cards de leitura em tempo real (temp/vib/press/corrente) com pulso de cor por limite, um sparkline de temperatura das últimas 72 amostras, o alerta aberto do ativo (se houver), o **score de saúde** grande com radar dos 5 modos de falha, e as **próximas ações** (até 3 recomendações). Se não há `twin`, a aba imprime "Ativo offline — sem telemetria ao vivo."

**Objetivo a consolidar (o que REFINAR).** A tela deve ser o **resumo executivo de 5 segundos** de um ativo: responder, sem rolagem, a três perguntas — *Qual a saúde agora? Quanto tempo tenho? O que faço a seguir?* — e servir de **átrio de navegação** para as abas profundas (Telemetria, Saúde & IA, Gêmeo, Técnico). Cumpre US-7 (valores atuais + gráficos históricos) e é a porta de entrada para US-8/9/10/11 (que vivem nas abas Saúde & IA e Gêmeo). O refino central é elevar a Visão Geral de "coleção de cards" para **narrativa de decisão hierarquizada**, com cada número rastreável ao Dicionário e cada predição carregando o padrão único de IA (valor + janela + confiança + explicação + nota de honestidade).

---

## 3. Perfil principal que usa a tela

| Persona | Uso primário | Nível RBAC esperado (`módulo Ativos`) |
|---|---|---|
| **Técnico de Manutenção** | Persona dominante. Abre o ativo a partir de um alerta ou da lista, lê saúde/RUL, vê próximas ações e decide a trilha (ir para Telemetria ou Gêmeo). | `read`/`full` |
| **Gestor Industrial** | Verifica disponibilidade e criticidade de um ativo específico, usa como prova para priorizar manutenção planejada (US-11). | `read` |
| **Cliente da Indústria** | Visão amigável (US-2) do seu ativo: está saudável? Há intervenção prevista? Sem jargão de engenharia. | `read` |
| **Admin Forzy** | Diagnóstico transversal, valida coerência entre twin e cadastro. | `full` |
| **TI/Governança** | Audita rastreabilidade número→Dicionário e gating por papel/hierarquia. | `read` |

O cabeçalho + Overview são propositalmente **legíveis para todas as personas**; a densidade técnica cresce nas abas seguintes.

---

## 4. User stories da Forzy atendidas

- **US-7 (núcleo desta tela)** — valores atuais (4 cards de leitura ao vivo, `twin.state.*`) + gráficos históricos (sparkline de 72 amostras via `toChartData`). É o cumprimento explícito do escopo desta tela.
- **US-2** — interface amigável para o cliente industrial: o score de saúde grande com rótulo verbal ("Saudável / Atenção — Degradação detectada / Crítico — Intervenção urgente") traduz ML em linguagem operacional.
- **US-4** — sensores em V/A/RPM/°C: a aba expõe °C, A, mm/s e bar diretos do `twin.state`.
- **US-8/9/10/11 (átrio)** — a Visão Geral *resume e linka* baseline, anomalia, parada e manutenção planejada, que se aprofundam na aba Saúde & IA e no Gêmeo. As "Próximas Ações" (`recommendationsFor`) são a face de US-11 nesta tela.
- **US-12** — botão "Assistente" no chrome (`IBtn` → `/assistente/${asset.id}`) leva o conversacional já contextualizado no ativo.
- **US-13** — toda a tela é governada (breadcrump de hierarquia, RBAC, rastreio ao Dicionário).

---

## 5. Blocos e seções da tela

| # | Bloco | Origem real | Conteúdo |
|---|---|---|---|
| A | **Chrome / Breadcrumb + ações** | `usePageChrome(["Ativos","Lista de Ativos",asset.id], …)` em `AtivoDetail` | Breadcrumb na Topbar + `IBtn` Assistente / Alertas / Ordem de Serviço |
| B | **Cabeçalho do ativo** | `AtivoDetail` linhas 50–81 | Ícone, nome, `Badge` status, TAG mono, localização, tipo, ao-vivo/offline, 3 KPIs (Saúde, Próx. Manut., Disponib.) |
| C | **Barra de abas** | `AtivoDetail` linhas 83–92, array `TABS` | 5 `NavLink` com sublinhado `steel` no ativo |
| D | **Leituras em Tempo Real** | `Overview` linhas 45–70 | 4 cards (temp/vib/press/corrente) + sparkline de temperatura (72 amostras) |
| E | **Alerta do ativo** (condicional) | `Overview` linhas 72–88 | Card âmbar com título, `SevBadge`, descrição, id+timestamp, "Ver alerta" |
| F | **Score de Saúde** | `Overview` linhas 91–106 | Número 52px colorido + rótulo verbal + radar dos 5 modos de falha |
| G | **Próximas Ações** | `Overview` linhas 108–123 | Até 3 recomendações (`recommendationsFor(twin,0.1)`) com ação + prazo |

Layout atual: Overview é `grid-cols-3` — coluna esquerda (`col-span-2`) com D+E, coluna direita com F+G.

---

## 6. Componentes principais

| Componente | Arquivo | Papel na tela |
|---|---|---|
| `AtivoDetail` (layout) | `src/pages/AtivoDetail.tsx` | Resolve `asset`/`twin`, monta cabeçalho + abas, provê `AtivoCtx` via `Outlet` |
| `useAtivo()` | `src/pages/AtivoDetail.tsx:15` | Hook de contexto consumido por todas as abas |
| `Badge` | `src/components/ui-shared/index.tsx` | Status do ativo no cabeçalho |
| `SevBadge` | `ui-shared` | Severidade do alerta do ativo |
| `SH` (section header) | `ui-shared` | Títulos "Leituras em Tempo Real", "Score de Saúde", "Próximas Ações" |
| `TT_` | `ui-shared` | Tooltip do gráfico Recharts |
| `IBtn` | `ui-shared` | Ações do chrome (Assistente/Alertas/OS) |
| `usePageChrome` | `src/components/layout/chrome.tsx` | Publica breadcrumb + ações na Topbar |
| `AreaChart` / `RadarChart` | `recharts` | Sparkline de temperatura + radar de modos de falha |
| `recommendationsFor` | `src/lib/recommendations.ts` | Gera ações por dano acumulado do twin |
| `toChartData` | `src/lib/telemetry` | Converte histórico do twin em dados do gráfico |

---

## 7. Dados exibidos

| Dado | Fonte real | Unidade / faixa | Rastreio ao Dicionário |
|---|---|---|---|
| Nome / TAG / tipo / local | `asset.nome`, `asset.id`, `asset.tipo`, `asset.area`, `asset.planta` | — | Identidade (Hierarquia) |
| Status | `twin.status` (ou `offline`) | normal/atenção/crítico/offline | banda derivada do dano |
| Saúde | `twin.health` | 0–100 | derivado de `damage` |
| Próx. Manut. | `recommendationsFor(twin,0.15)[0].prazoDias` | dias | derivado de RUL × 0.35 |
| Disponibilidade | mapa estático `AVAIL[status]` | % | **não rastreado — heurística** |
| Temperatura | `twin.state.temp` | °C | tag `temp`, limite `limOf("temp")` |
| Vibração | `twin.state.vib` | mm/s | tag `vib` |
| Pressão | `twin.state.press` | bar | tag `press` (direção "abaixo") |
| Corrente | `twin.state.corrente` | A | tag `corrente` |
| Histórico temp | `twin.history.slice(-72)` | série 72 pts | US-7 |
| Radar modos de falha | `1 - twin.damage[m]` por `FAILURE_MODES` | 0–100% | 5 modos |
| Alerta | `alerts.find(assetId && status!=="resolvido")` | título/sev/desc/id/data | `origem` (regra/modelo/manual) |
| Próximas ações | `recommendationsFor` → `acao`, `prazoDias`, `motivo`, `pri`, `damage` | — | US-11 |

---

## 8. Ações do usuário

| Ação | Gatilho real | Destino / efeito | Gate RBAC |
|---|---|---|---|
| Trocar de aba | `NavLink` em `TABS` | `/ativos/:id/{overview,telemetria,saude,gemeo,tecnico}` | `Ativos:read` |
| Abrir Assistente | `IBtn` Assistente | `/assistente/${asset.id}` | `Assistente:read` |
| Abrir Alertas | `IBtn` Alertas | `/alertas` | `Alertas:read` |
| Ordem de Serviço | `IBtn` Wrench | **sem handler hoje** (placeholder) | deveria ser `Ativos:full` |
| Ver alerta do ativo | botão "Ver alerta" | `/alertas/${assetAlert.id}` | `Alertas:read` |
| Ler leituras/saúde/ações | leitura | — | `Ativos:read` |

---

## 9. Relação com outras telas

- **Lista de Ativos (03)** → entrada via `/ativos/:id`; breadcrumb retorna.
- **Abas irmãs**: Telemetria (séries por tag, US-7), Saúde & IA (US-8/9/10), Gêmeo Digital (what-if, US-11), Dados Técnicos (nameplate/OCR US-5, ciclo D-I-C-I).
- **Alertas (06)**: o card de alerta e o `IBtn` levam à central; alertas têm `origem` regra/modelo/manual.
- **Assistente (07)**: contextualizado no ativo (US-12).
- **Mapa/Hierarquia**: breadcrumb ancora empresa→planta→área→sistema→ativo.

---

## 10. Relação com governança

- **Hierarquia** — o breadcrumb `["Ativos","Lista de Ativos",asset.id]` é o fio da Matriz; falta expandir para a cadeia completa planta→área→sistema (hoje encurtado).
- **Dicionário** — cada leitura rastreia a um `Tag` (campo, unidade, faixa, limite, direção). O `warn` dos cards usa `limOf(key)` com override por ativo (`asset.limites`) e fallback ao dicionário. **Refinar:** tornar esse rastreio *clicável/inspecionável* (qual sensor, qual limite, qual direção).
- **RBAC** — toda ação deve passar por `can(módulo, nível)`. Hoje os `IBtn` e a aba **não checam RBAC explicitamente**; é o ponto de governança a fechar.
- **D-I-C-I** — a Visão Geral não expõe o ciclo; ele vive em Dados Técnicos. Refino: um selo de estágio D-I-C-I no cabeçalho.
- **Honestidade de IA** — saúde/RUL/ações vêm de modelo SIMULADO (físico-informado + Weibull, `src/engine/prediction.ts`), não treinado em falhas reais — isso deve estar visível, não implícito.

---

## 11. Melhorias de UX/UI sobre o wireframe base

1. **KPI "Disponib." é mentira de governança — corrigir (P0).** Em `AtivoDetail.tsx:25,73` a disponibilidade vem do mapa estático `AVAIL` por status, não rastreia a nenhum dado. Ou deriva de uptime real (histórico de offline/MTBF) ou rotular explicitamente como estimativa e remover do trio de KPIs de cabeçalho, que deveria conter só números rastreáveis. Hoje quebra a regra "todo número rastreia ao Dicionário".

2. **Próx. Manut. e Saúde precisam carregar o padrão único de IA (P0).** O KPI "Próx. Manut." (`AtivoDetail.tsx:38`) e o "Score de Saúde" (`Overview.tsx:96`) são saídas de ML sem **confiança**, **horizonte** explícito nem **nota de honestidade**. Refinar: ao lado do número de saúde, um chip "modelo simulado · não treinado em falhas reais" + tooltip com as variáveis dominantes (`twin.modoCritico`, `twin.residual`). O RUL deve aparecer com janela (P10–P90), não só um número de dias.

3. **Cabeçalho deve virar "barra de comando" persistente e mais hierárquica (P1).** Hoje os 3 KPIs (`AtivoDetail.tsx:69–80`) competem visualmente com nome/status. Reorganizar: linha 1 = identidade (nome + TAG + status + selo D-I-C-I), linha 2 = KPIs como "stat strip" com micro-rótulo de fonte. O `modoCritico` do twin deveria estar no cabeçalho (qual modo domina o risco), hoje só aparece implícito no radar.

4. **Cards de leitura: o pulso de cor é binário, falta a banda crítica (P1).** Em `Overview.tsx:50–57` a borda fica âmbar quando `warn` (≥ `limiteAlerta`), mas não distingue **alerta vs crítico** (o Dicionário tem `limiteCritico`). Adicionar terceiro estado vermelho e mostrar o valor do limite ao passar o mouse, ancorando ao `Tag`. A pressão usa direção "abaixo" (`Overview.tsx:31`) com lógica invertida embutida — extrair para a mesma função `limOf` com direção, evitando o caso especial frágil.

5. **Sparkline só de temperatura subaproveita o histórico (P1).** `Overview.tsx:60–69` plota só `temp`. Como é a aba de *visão geral*, o gráfico deveria ser multivariável compacto ou um seletor de tag (chips), reaproveitando o mesmo `toChartData` que já carrega todas as séries. Hoje o usuário precisa ir para a aba Telemetria para ver vibração — fricção desnecessária.

6. **"Próximas Ações" deve ser acionável, não decorativa (P0).** `Overview.tsx:113–121` lista a ação e o prazo mas **não tem CTA**. `recommendationsFor` já devolve `modo` (mapeável a `applyMaintenance(assetId, modo)`) e `motivo`/`pri`. Refinar: cada item ganha badge de prioridade (`pri`), o `motivo` em tooltip, e botão "Registrar manutenção" (gated `Ativos:full`) + "Criar OS". Isso fecha o loop US-11 que hoje morre na exibição.

7. **Estado "offline / sem twin" é pobre demais (P2).** `Overview.tsx:40` devolve uma frase única. Para um ativo offline o usuário ainda precisa de identidade, último valor conhecido, há quanto tempo está offline e ação ("verificar gateway"). Refinar para um empty-state estruturado que preserve o cabeçalho e ofereça a trilha de diagnóstico — coerente com US-13 (a hierarquia não some quando o dado some).

8. **RBAC ausente nas ações (P0 governança).** Nem o `IBtn` "Ordem de Serviço" (`AtivoDetail.tsx:44`, sem handler) nem o botão "Ver alerta" passam por `useCan`. Aplicar `can("Ativos","full")` para OS/registrar manutenção e ocultar/desabilitar o que o papel não permite. É requisito de US-13 e hoje está aberto.

9. **Coerência entre abas (consistência exigida no foco da tela) (P1).** As 5 abas compartilham `AtivoCtx`, mas cada uma define seus próprios `SH`, grids e tratamentos de "sem twin". Padronizar: um wrapper `<AtivoTab>` que centraliza o guard de twin, o cabeçalho de seção e o grid base, para que Telemetria/Saúde/Gêmeo herdem a mesma malha — eliminando divergência visual entre abas.

10. **Alerta do ativo deveria mostrar `origem` e linkar ao Dicionário (P2).** `Overview.tsx:73–88` mostra título/sev/desc mas não a `origem` (regra=limite do dicionário, modelo=predição do twin, manual). Exibir um chip de origem rastreável fecha a narrativa de governança "de onde veio este alerta".
