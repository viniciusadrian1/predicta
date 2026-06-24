# Tela 01 — Dashboard inicial

> Especificação de refinamento (não redesenho). Produto: **PREDICTA / FORZY**.
> Arquivo de implementação real: `src/pages/Dashboard.tsx`.
> Cobre **US-1** (modularidade), **US-2** (interface amigável p/ clientes) e **US-7** (valores atuais + históricos).

---

## 1. Nome da tela

**Dashboard inicial** — *landing* operacional da PREDICTA. Rota `/` (e `/dashboard`), publicada no breadcrumb como **`Operação › Dashboard`** via `usePageChrome(["Operação","Dashboard"], …)` em `src/pages/Dashboard.tsx:63`. É a primeira superfície que o usuário vê após o login e funciona como **painel-resumo de frota**: agrega o estado de todos os ativos monitorados num único *fold*, com KPIs de entrada, séries temporais de alertas e saúde, e atalhos para as telas de profundidade (Ativos, Alertas).

---

## 2. Objetivo da tela

**Estado atual no produto.** Hoje o `Dashboard.tsx` já é uma tela viva, não um mock: ela lê o store Zustand (`useStore`) e as derivações de `src/store/derive.ts`, então **todos os números reagem ao motor de simulação** (o `commitTick` do engine atualiza `twins`, `alerts` e `simClock` a cada segundo — `useStore.ts:177`). A tela renderiza quatro KPIs (`KPI` de `ui-shared`), um histórico de alertas de 7 dias (`BarChart` empilhado), uma distribuição de severidade (`PieChart`), uma tendência de saúde da frota de 30 dias com projeção IA (`LineChart` com `ReferenceLine` em 60), uma lista de alertas recentes (4 itens) e um grid de "Ativos que Requerem Atenção" (4 cards). Há export CSV de alertas (`downloadCSV` → `exportAlerts`, linha 56) e navegação por clique para `/alertas`, `/alertas/:id`, `/ativos` e `/ativos/:id/overview`.

**Objetivo (o que a tela deve entregar).** Dar, em menos de 5 segundos e sem rolagem, a resposta a três perguntas operacionais: (1) *a frota está saudável agora?* — KPIs + distribuição; (2) *o que está piorando e em que direção?* — tendência de saúde + projeção IA; (3) *para onde eu vou agir primeiro?* — alertas recentes + ativos em atenção. É o ponto de entrada que **roteia a atenção** para o trabalho, materializando US-2 (clareza para o cliente industrial) e US-7 (atual + histórico no mesmo *fold*). O refinamento deve elevar essa tela de "painel bonito e correto" para "painel **modular por persona** e **rastreável ao Dicionário/Hierarquia**", hoje seus pontos mais fracos.

---

## 3. Perfil principal que usa a tela

**Primário: Gestor Industrial (b).** É a única persona cuja jornada *começa e frequentemente termina* nesta tela — visão de frota agregada, KPIs de SLA (disponibilidade, manutenções pendentes), tendência. A densidade atual (4 KPIs + 4 gráficos/listas) é calibrada para o gestor.

**Secundários:**
- **Técnico de Manutenção (a)** — usa o Dashboard como *triagem* (alertas recentes, ativos em atenção) antes de mergulhar em `/ativos/:id`. Quer menos KPI estratégico e mais "minha fila de trabalho".
- **Cliente da Indústria (c)** — versão simplificada (US-2): disponibilidade e saúde, sem ruído operacional interno.
- **Admin Forzy (e/d)** — visão multi-planta/multi-cliente (hoje a tela conta `plantas` mas não segmenta por cliente).

O RBAC (`src/auth/rbac.ts`, módulo `Dashboard`) já decide *se* a tela abre; o refinamento propõe que ele também module *qual densidade* abre (ver §11).

---

## 4. User stories da Forzy atendidas

| US | Como a tela atende (estado real) | Refinamento proposto |
|----|----------------------------------|----------------------|
| **US-1** Solução modular | A tela é um conjunto de blocos independentes (KPIs, barras, pizza, linha, recentes, atenção) montados num grid. Cada bloco já lê sua própria derivação isolada. | Tornar os blocos **cards desmontáveis/reordenáveis por persona** (layout salvo no store `settings`), assumindo a modularidade de fato. |
| **US-2** Interface amigável p/ clientes industriais | KPIs com rótulo + valor grande (`Rajdhani`) + subtítulo de contexto; paleta semântica (verde/âmbar/vermelho); navegação por clique direto nos cards. | Perfil "Cliente" com densidade reduzida e linguagem sem jargão; tooltips explicando cada KPI. |
| **US-7** Valores atuais + gráficos históricos | KPIs = valores atuais (frota); `BarChart` 7 dias + `LineChart` 30 dias = histórico; tudo recalculado em `simClock`. | Marcar visualmente "agora" na série; expor a **origem no Dicionário** de cada número (faixa/limite). |
| **US-9** (parcial) Previsão de anomalias | A linha tracejada `Projeção IA` (`fleetHealthTrend`, `derive.ts:84`) é a extrapolação do motor de degradação. | Aplicar o **padrão único de output de IA** (confiança + horizonte + explicação + nota de honestidade) à projeção da frota. |

---

## 5. Blocos e seções da tela

A composição real é uma pilha vertical de quatro faixas (`<div className="grid …">`), todas dentro do `AppShell` (que provê Sidebar + Topbar com breadcrumb).

| # | Bloco | Layout real | Conteúdo | Origem (derive/store) |
|---|-------|-------------|----------|------------------------|
| B1 | **Faixa de KPIs** | `grid-cols-4 gap-3` (linha 66) | 4 cards `KPI`: Ativos Monitorados · Alertas Críticos · Disponibilidade Média · Manutenções Pendentes | `views.length`, `criticos`/`open`, `fleetAvailability`, `pend` (recommendations) |
| B2 | **Histórico de Alertas — 7 dias** | `col-span-2` de `grid-cols-3` (linha 75) | `BarChart` empilhado por severidade (Crítico/Alto/Médio+Baixo) + botão export CSV | `alertsByDay(alerts, simClock)` (`derive.ts:52`) |
| B3 | **Distribuição** | `col-span-1` (linha 90) | `PieChart` donut + legenda com contagens por severidade | `severityDistribution(alerts)` (`derive.ts:71`) |
| B4 | **Tendência de Saúde da Frota — 30 dias** | `col-span-2` (linha 113) | `LineChart`: Saúde Real (steel) + Projeção IA (tracejada) + `ReferenceLine y=60` (limiar crítico) | `fleetHealthTrend(assets, twins, dictionary, simClock)` (`derive.ts:84`) |
| B5 | **Alertas Recentes** | `col-span-1` (linha 128) | Lista de 4 alertas abertos (mais novos), cada um botão → `/alertas/:id`; link "Ver todos" → `/alertas` | `open` ordenado por `criadoEm` |
| B6 | **Ativos que Requerem Atenção** | faixa full-width, `grid-cols-4` (linha 150) | 4 cards de ativos com `status !== "normal"`: TAG + `Badge` + nome + `Bar_` de saúde + % | `views.filter(status !== normal).slice(0,4)` |

**Faixas ambientais (fora do componente, mas presentes):** breadcrumb governado (Topbar via `chrome.tsx`), Sidebar com módulos *gated* por RBAC, controles de simulação (velocidade/pause) na Topbar.

---

## 6. Componentes principais

| Componente | Origem | Papel na tela | Observação de refinamento |
|------------|--------|---------------|----------------------------|
| `KPI` | `src/components/ui-shared/index.tsx:53` | Card de KPI (label, val, sub, ícone, cor) | Hoje `cursor-default` e não clicável — deveria navegar (ver §11) |
| `SH` | `ui-shared:69` | *Section header* uppercase + slot `right` | Reaproveitado em B2–B6 |
| `Bar_` | `ui-shared:44` | Barra de saúde 0–100 com cor semântica | Usado em B6 |
| `Badge` / `SevBadge` | `ui-shared:10` / `:33` | Status do ativo / severidade do alerta | B5/B6 |
| `IBtn` | `ui-shared:103` | Botão-ícone (Atualizar, Download) | "Atualizar" (linha 63) hoje **sem `onClick`** — botão morto |
| `TT_` | `ui-shared:78` | Tooltip custom dos gráficos Recharts | Formata número com `toFixed(2)` |
| `BarChart`/`LineChart`/`PieChart` | `recharts` | Visualizações B2/B3/B4 | `ResponsiveContainer` com alturas fixas (110–155px) |
| `usePageChrome` | `layout/chrome.tsx:35` | Publica breadcrumb + ação no Topbar | Breadcrumb fixo `["Operação","Dashboard"]` |
| `useAssetViews` / derive\* | `store/derive.ts` | Funde `assets` + `twins` e agrega | Fonte de todos os números |
| `recommendationsFor` | `lib/recommendations.ts:35` | Conta manutenções pendentes/urgentes | Driver do KPI "Manutenções Pendentes" |
| `downloadCSV` | `lib/csv.ts` | Export de alertas | Só em B2 |

---

## 7. Dados exibidos

| Dado / KPI | Valor exibido | Cálculo real | Rastreio ao Dicionário/Hierarquia |
|------------|---------------|--------------|------------------------------------|
| **Ativos Monitorados** | `views.length` + `${plantas} plantas ativas` | contagem de `useAssetViews()`; `plantas` = `Set(views.map(planta)).size` | Hierarquia (planta = nível 2 da Matriz) |
| **Alertas Críticos** | `criticos` + `${open.length} abertos no total` | `open = alerts.filter(status!=="resolvido")`; `criticos = open.filter(sev==="critico")` | Severidade origina-se do cruzamento leitura×limite do Dicionário |
| **Disponibilidade Média** | `${avail}%` + `Meta: 98%` | `fleetAvailability` = média de `AVAIL[status]` (normal 99.5 / atenção 98 / crítico 92 / offline 70 — `derive.ts:45`) | **Heurística por status, não medida** — precisa de nota de honestidade |
| **Manutenções Pendentes** | `pend.total` + `${pend.urgentes} urgentes` | soma de `recommendationsFor(twin, 0.2)`; urgentes = `pri==="Alta"` | Deriva do `damage` por `FailureMode` do twin |
| **Histórico 7 dias** | barras `c/a/m` por dia | `alertsByDay` agrupa alertas por dia de `criadoEm` vs `simClock` | "Médio" funde médio+baixo (linha 64) |
| **Distribuição** | contagens crítico/alto/médio/baixo | `severityDistribution(open)` | Só alertas **abertos** |
| **Saúde Real (30d)** | linha contínua | reconstrução: `avgHealth + avgDrop·dias` retroagindo 22 dias (`derive.ts:97`) | **Reconstruída do modelo**, não log histórico real |
| **Projeção IA** | linha tracejada (7d à frente) | `avgHealth − avgDrop·dias` com `dailyRate` Weibull/físico | Simulada (não treinada em falhas reais) |
| **Alertas Recentes** | título · `assetId` · `fmtTime(criadoEm)` · `SevBadge` | 4 mais novos de `open` | TAG = ativo na Hierarquia |
| **Ativos em Atenção** | TAG · `Badge(status)` · nome · `saude%` | `views` com status ≠ normal | `saude` = `twin.health` |

---

## 8. Ações do usuário

| Ação | Gatilho | Resultado | Estado real |
|------|---------|-----------|-------------|
| Exportar alertas (CSV) | `IBtn Download` em B2 (linha 76) | `downloadCSV("alertas-…", …)` com ID/Ativo/Título/Tipo/Severidade/Status/Origem/Criado | Funciona |
| Abrir alerta | clique no card de B5 | `navigate("/alertas/:id")` | Funciona |
| Ver todos os alertas | link em B5 | `navigate("/alertas")` | Funciona |
| Abrir ativo | clique no card de B6 | `navigate("/ativos/:id/overview")` | Funciona |
| Ver todos os ativos | link em B6 | `navigate("/ativos")` | Funciona |
| "Atualizar" | `IBtn` no Topbar (linha 63) | **nenhum** — sem `onClick` | **Bug/placeholder** (ver §11) |
| Hover nos gráficos | mouse | Tooltip `TT_` com valores | Funciona |
| Clicar num KPI | — | **nada** (`cursor-default`) | Oportunidade (ver §11) |

---

## 9. Relação com outras telas

- **→ Alertas (`/alertas`, `/alertas/:id`):** B2, B3 e B5 são *funis* para a central de alertas. B5 navega direto ao detalhe; "Ver todos" à lista. O Dashboard é o resumo; Alertas é o trabalho.
- **→ Ativos (`/ativos`, `/ativos/:id/overview`):** B6 e o KPI "Ativos Monitorados" levam ao inventário/gêmeo digital. O card de atenção entra direto no *overview* do ativo (onde mora a telemetria viva — US-7 em profundidade).
- **→ Telemetria / Gêmeo Digital:** indireta, via `/ativos/:id`. O Dashboard mostra o agregado; a telemetria por sensor (V/A/RPM/°C — US-4) vive na tela do ativo.
- **→ Mapa/Hierarquia:** hoje **sem link**; o KPI de "plantas" deveria abrir o Mapa filtrado (oportunidade).
- **→ Governança/Dicionário:** sem link direto hoje; cada número deveria oferecer "ver no Dicionário" (ver §10).

A tela é o **hub de roteamento de atenção**: nunca executa o trabalho, sempre encaminha para a tela que o faz.

---

## 10. Relação com governança

- **Hierarquia (Matriz):** o breadcrumb `Operação › Dashboard` (`usePageChrome`) é o ponto de ancoragem. **Refinar:** o Dashboard ignora o *escopo* hierárquico do usuário — sempre agrega a frota inteira. Um gestor de "Planta Sul" deveria ver KPIs filtrados pela sua subárvore (empresa→planta→área), respeitando "navegação governada".
- **Dicionário:** os números **derivam** do Dicionário (severidade de alerta = leitura×faixa×limite; saúde = `damage` por modo), mas a tela **não expõe esse rastreio**. Cada KPI/série deveria oferecer *drill* ao campo/unidade/faixa/limite/sensor que o originou (US-13).
- **RBAC (`rbac.ts`):** o acesso à tela é *gated* pelo módulo `Dashboard` (`can("Dashboard","read")`). Os atalhos de B5/B6 levam a módulos (`Alertas`, `Ativos`) que **também** têm gating — hoje o card aparece mesmo se o usuário não puder abrir o destino, gerando navegação para tela vazia/negada. **Refinar:** ocultar/atenuar atalhos sem permissão de destino.
- **Ciclo D-I-C-I:** ausente nesta tela. A frota agregada poderia sinalizar ativos fora de "Inspeção" (D-I-C-I incompleto) como uma faceta de risco — hoje só status operacional é considerado.
- **Nota de honestidade (padrão único de IA):** a "Projeção IA" (B4) e a "Disponibilidade Média" (heurística por status) precisam declarar que são **modelo simulado / proxy**, não medição real (interface `PredictionModel` em `src/engine/prediction.ts` já prevê plugar modelo treinado).

---

## 11. Melhorias de UX/UI sobre o wireframe base

Crítica concreta, ancorada no arquivo real. Ordenadas por prioridade.

**P0 — KPIs sem rastreio e sem navegação (`ui-shared/index.tsx:53` + `Dashboard.tsx:66-71`).**
O `KPI` é `cursor-default` e não navega; o número aparece "do nada". Refinar: (a) tornar cada KPI clicável para seu destino lógico (Ativos Monitorados → `/ativos`; Alertas Críticos → `/alertas?sev=critico`; Manutenções → `/ativos?aba=manutencao`); (b) adicionar um *micro-link* "origem" abrindo um popover com campo/unidade/faixa/limite do Dicionário. Eleva US-13 e US-7 sem mudar a identidade.

**P0 — Honestidade da IA e da Disponibilidade (`Dashboard.tsx:113-126` + `derive.ts:45,84`).**
A "Projeção IA" (linha tracejada) e a "Disponibilidade Média" (média de `AVAIL[status]`, uma heurística) são apresentadas como fato. Refinar: aplicar o **padrão único de output de IA** — adicionar à B4 uma faixa de confiança (banda ao redor da projeção), o horizonte (7 dias), as variáveis dominantes (`worstMode`) e uma **nota de honestidade** ("projeção de modelo físico-informado simulado, não treinado em falhas reais"). No KPI de disponibilidade, marcar como *estimativa por status* com tooltip.

**P1 — Botão "Atualizar" morto (`Dashboard.tsx:63`).**
`<IBtn icon={RefreshCw} label="Atualizar" />` não tem `onClick`. Como a tela já é viva via `commitTick`, o botão é redundante e confunde. Refinar: ou removê-lo, ou ressignificá-lo como indicador de "última sincronização" (`twin.syncedAt` / `simClock`) + controle de pausa do relógio de simulação — mais honesto sobre o caráter *real-time*.

**P1 — "Saúde Real" reconstruída apresentada como medida (`derive.ts:84-104`).**
A linha "Saúde Real" é uma reconstrução para trás (`avgHealth + avgDrop·dias`), não um log de 30 dias — o próprio comentário do código admite. Visualmente é idêntica a um histórico medido. Refinar: rotular o trecho retroativo como "reconstrução de modelo" (estilo distinto do "agora" para frente) e desenhar um marcador vertical em `off=0` separando passado reconstruído de futuro projetado.

**P1 — Densidade fixa ignora a persona / US-1 modularidade (`Dashboard.tsx` inteiro).**
O layout é hard-coded em quatro `grid` fixos, idênticos para gestor, técnico e cliente. Isso desperdiça a modularidade (US-1) e contraria US-2 para o cliente. Refinar: introduzir **presets de layout por papel** (lidos de `session.papel` + RBAC), salvos em `settings` do store — Técnico vê B5/B6 no topo (fila de trabalho), Cliente vê só disponibilidade+saúde com linguagem simplificada, Gestor mantém o atual. Os blocos já são independentes; falta o *container* modular.

**P2 — Atalhos não respeitam RBAC do destino (`Dashboard.tsx:129,151,154`).**
Links/cards para `/alertas` e `/ativos` aparecem mesmo sem permissão de destino. Refinar: envolver com `useCan("Alertas")` / `useCan("Ativos")` e atenuar/ocultar quando `none`.

**P2 — Escopo hierárquico não aplicado (`derive.ts` agregações).**
Todas as derivações recebem `assets`/`alerts` completos. Refinar: passar a subárvore da Hierarquia do usuário às funções de `derive`, materializando "navegação governada"; o título/breadcrumb passa a refletir o escopo (ex.: `Operação › Planta Sul › Dashboard`).

**P2 — "Médio" funde médio+baixo no histórico (`derive.ts:64`) vs. pizza com 4 fatias (`Dashboard.tsx:46-51`).**
Inconsistência de taxonomia entre B2 (3 categorias) e B3 (4). Refinar: alinhar as duas em 4 severidades, ou explicitar a fusão na legenda da barra, para o gestor não ler números que "não fecham".

**P2 — Hierarquia visual plana entre blocos (`SH` uniforme).**
Todos os `SH` têm o mesmo peso; o olho não sabe que B1 (KPIs) > B4 (tendência) > B6 (atenção) em prioridade decisória. Refinar: dar à faixa de KPIs respiro/destaque maior, e elevar B6 ("Ativos que Requerem Atenção") — hoje no rodapé — para logo após os KPIs quando houver ativos críticos, pois é o bloco *acionável*.
