# Tela 05 — Detalhe do ativo · Telemetria histórica

> Refinamento de produto · PREDICTA / FORZY · Lead Product Design + UX Strategy + Information Architecture
> Arquivo-fonte real: `src/pages/ativo/Telemetria.tsx` · helpers: `src/lib/telemetry.ts`
> Contexto de aba: `src/pages/AtivoDetail.tsx` (`useAtivo()` → `{ asset, twin }`)

---

## 1. Nome da tela

**Telemetria histórica do ativo** — aba `telemetria` dentro do Detalhe do Ativo (`/ativos/:id/telemetria`).

É uma das cinco abas do shell de ativo definido em `src/pages/AtivoDetail.tsx` (`Visão Geral · Telemetria · Saúde & IA · Gêmeo Digital · Dados Técnicos`). A tela não tem cabeçalho próprio: herda o header de ativo (nome, `Badge` de status, TAG `asset.id`, hierarquia `area — planta`, e os três KPIs Saúde / Próx. Manut. / Disponib.) e o breadcrumb `["Ativos","Lista de Ativos", asset.id]` registrado por `usePageChrome`. Esta especificação trata exclusivamente do **corpo da aba** — a leitura temporal das grandezas físicas do ativo.

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** Hoje, `AtivoTelemetria` resolve `asset` e `twin` via `useAtivo()`, janela o histórico rolante do gêmeo (`twin.history`) com `windowSamples(history, range)` para uma das cinco janelas fixas (`1h · 6h · 24h · 7d · 30d`, default `24h`), e renderiza **três** `AreaChart` (Recharts) empilhados verticalmente — Temperatura (°C), Vibração RMS (mm/s) e Corrente (A). Cada card mostra Mín/Máx/Média calculados por `stats(samples, key)` e uma única `ReferenceLine` tracejada no limite **crítico** da grandeza, obtido por `critOf(key)` = override do ativo (`asset.limites[key].critico`) **ou** fallback no Dicionário (`dictionary.find(t => t.key===key).limiteCritico`). Há export CSV (`downloadCSV`) com **as seis grandezas** (`temp, vib, press, corrente, rpm, oleo`) e um botão `RefreshCw` **sem handler**. Quando o ativo está offline (`!twin`), exibe um placeholder textual "Ativo offline — sem telemetria.".

**Objetivo a consolidar (o que REFINAR).** Tornar esta a tela de **leitura forense da grandeza física no tempo** — onde o técnico e o gestor confirmam *o que o sensor mediu, em que faixa, contra qual limite e qual baseline*, com rastreabilidade total ao Dicionário. O objetivo de produto: cobrir as seis grandezas reais (não só três), expor para cada série não apenas o valor mas **a faixa operacional, o limite de atenção E o crítico, o baseline esperado e o desvio (residual)**, e permitir **seleção de período, comparação e overlay** — fechando o ciclo US-3 (dado raw → base histórica), US-4 (V/A/RPM/°C + vib/press/óleo) e US-7 (valores atuais + histórico). A telemetria aqui é a **camada de evidência** que sustenta as predições da aba Saúde & IA: tudo que o ML afirma deve ser auditável grandeza a grandeza nesta tela.

---

## 3. Perfil principal que usa a tela

| Persona | Uso primário desta tela | Nível RBAC esperado (`Telemetria`) |
|---|---|---|
| **(a) Técnico de Manutenção** | Persona-âncora. Investiga *por que* um ativo degradou: cruza pico de vibração com subida de temperatura, confere se a corrente saiu da faixa, valida se um alerta de regra foi um transiente ou tendência. | `read` / `full` |
| **(b) Gestor Industrial** | Lê tendência agregada (7d/30d), confirma estabilidade pós-intervenção, exporta CSV para relatório. | `read` |
| **(c) Cliente da Indústria** | Vê telemetria do próprio parque de forma legível (US-2), sem jargão de engenharia de sinais. | `read` (escopado por hierarquia) |
| **(d) Admin Forzy** | Valida ingestão (US-3): a série está chegando, sem gaps, dentro da faixa do Dicionário. | `full` |
| **(e) TI/Governança** | Audita rastreabilidade dado↔Dicionário e integridade da base histórica. | `read` |

A tela em si não tem ações destrutivas; o gate RBAC relevante é **visibilidade do módulo `Telemetria`** (`can('Telemetria', ...)`) — quem não tem `read` nunca chega na aba.

---

## 4. User stories da Forzy atendidas

- **US-4 — sensores em V, A, RPM, °C (núcleo).** A tela é a materialização das grandezas físicas. Hoje plota 3 das 6 (`temp, vib, corrente`); o CSV já carrega as 6 (`temp, vib, press, corrente, rpm, oleo`). REFINAR: trazer `rpm`, `press` e `oleo` para o grid visual. (Tensão/V não está em `TagKey` — ver §11 nota de honestidade.)
- **US-7 — valores atuais + gráficos históricos (núcleo).** Estado atual = histórico (`AreaChart` por janela) + estatística (min/max/avg). REFINAR: cravar o **valor atual** (`twin.state[key]`) como leitura destacada em cada card, hoje ausente — a tela mostra só o agregado.
- **US-3 — leitura de dado raw → base histórica (suporte).** `twin.history` é a base rolante; `windowSamples` faz o janelamento; `downloadCSV` exporta o raw. REFINAR: indicador de cobertura/gaps da janela e timestamp de `syncedAt`.
- **US-8 (baseline) — gancho.** A tela é o lugar natural para o **overlay de baseline operacional** sobre a série medida (hoje inexistente). Ver §11.
- **US-13 — governança (transversal).** Todo limite plotado rastreia ao Dicionário via `critOf`; REFINAR para expor a proveniência (override do ativo vs. Dicionário) na própria UI.

---

## 5. Blocos e seções da tela

Estado atual = barra de janelas + N cards de gráfico. Estrutura refinada proposta:

| # | Bloco | Conteúdo | Estado |
|---|---|---|---|
| **B1** | **Barra de controle temporal** | Seletor de janela (`1h·6h·24h·7d·30d`), ações à direita (CSV, Refresh). | EXISTE — `WINDOWS.map` + `IBtn` (linhas 44-55). REFINAR: adicionar toggles de overlay (Limites / Baseline / Comparar), `syncedAt`, e tornar Refresh funcional. |
| **B2** | **Faixa de saúde da janela** *(novo)* | Tira-resumo: nº de amostras, % de cobertura da janela, quantas grandezas estouraram limite no período, pior desvio. | REFINAR (não existe). Dá contexto antes do scroll vertical de cards. |
| **B3** | **Grid de grandezas** | Um card por grandeza com: título + unidade (do Dicionário), **valor atual**, Mín/Máx/Média, gráfico de área, `ReferenceLine` de limite. | EXISTE parcial — 3 cards, sem valor atual, só limite crítico. REFINAR: 6 grandezas, atenção+crítico, baseline. |
| **B4** | **Card de grandeza (unidade interna)** | Header (label·un·valor atual·sparkstats) / corpo (chart) / rodapé (faixa do Dicionário + proveniência do limite). | EXISTE só header+chart. REFINAR rodapé de proveniência. |
| **B5** | **Painel de comparação** *(novo, opcional)* | Sobrepor 2 grandezas normalizadas, ou a mesma grandeza em duas janelas (ex.: 24h vs. semana anterior). | REFINAR (não existe). Cobre "comparação" do escopo. |
| **B6** | **Estado vazio / offline** | "Ativo offline — sem telemetria." | EXISTE — linha 40. REFINAR: distinguir *offline* de *janela sem dados* e oferecer ação (trocar janela / ir ao Gêmeo). |

---

## 6. Componentes principais

| Componente | Origem real | Papel | Refino |
|---|---|---|---|
| Seletor de janela | `<button>` inline com estilo cobalto-on-active (linhas 45-50) | Define `range: Win` | Extrair para `SegmentedControl` reutilizável; hoje é botão solto repetido |
| `IBtn` | `ui-shared/index.tsx` | Ações CSV / Refresh | Refresh precisa de `onClick` (hoje vazio, linha 53) |
| Card de gráfico | `<div>` com `C.bgCard`/`C.border` | Container da grandeza | Padronizar via `SH`/`KPI` do design system |
| `AreaChart` (Recharts) | `recharts` (linhas 4-6) | Série temporal | `isAnimationActive={false}` mantido; `interval` dinâmico (linha 72) ok |
| `ReferenceLine` | Recharts | Limite plotado | Hoje 1 linha (crítico). REFINAR: 2 linhas (atenção âmbar + crítico vermelho) + banda de faixa |
| `TT_` | `ui-shared` | Tooltip do ponto | Enriquecer com unidade e delta vs. baseline |
| `stats()` | `lib/telemetry.ts` | Min/Máx/Média | Adicionar `last` (valor atual) e desvio-padrão/residual |
| `windowSamples()` | `lib/telemetry.ts` | Janelamento | Expor `coverage`/contagem para B2 |
| `toChartData()` | `lib/telemetry.ts` | Shape p/ chart | Já carrega as 6 grandezas — basta consumir |
| `downloadCSV()` | `lib/csv.ts` | Export raw | Já completo (6 grandezas) |
| `critOf()` | local (linha 26) | Resolve limite | Generalizar p/ `alertaOf` + `critOf` + proveniência |

---

## 7. Dados exibidos

| Dado | Fonte real | Onde aparece | Estado |
|---|---|---|---|
| Janela ativa | `range: Win` (`useState`) | B1 | EXISTE |
| Amostras janeladas | `windowSamples(twin.history, range)` | base de tudo | EXISTE |
| Série por grandeza | `chart[key]` de `toChartData` | B3 chart | EXISTE (3 de 6) |
| **Valor atual** | `twin.state[key]` | header do card | **AUSENTE — REFINAR** |
| Mín / Máx / Média | `stats(samples, key)` | header do card | EXISTE |
| Unidade | `TAG_UNIT[key]` / `tag.un` | label | EXISTE (hardcoded no label) — REFINAR p/ Dicionário |
| Limite **crítico** | `asset.limites[key].critico` → `tag.limiteCritico` | `ReferenceLine` | EXISTE |
| Limite **atenção** | `tag.limiteAlerta` / `asset.limites[key].alerta` | — | **AUSENTE — REFINAR** |
| Faixa operacional | `tag.faixaMin` / `tag.faixaMax` | — | **AUSENTE — REFINAR** (rodapé/banda) |
| Direção do limite | `tag.direcao` (`acima`/`abaixo`) | — | **AUSENTE — REFINAR** (semântica da linha) |
| Sensor de origem | `tag.sensor` | — | **AUSENTE — REFINAR** (rastreabilidade US-3) |
| `syncedAt` | `twin.syncedAt` | B1 | **AUSENTE — REFINAR** |
| Baseline esperado | (engine US-8) | overlay | **AUSENTE — REFINAR** |
| Residual / desvio | `twin.residual` | B2/tooltip | **AUSENTE — REFINAR** |

Toda célula numérica deve carregar **unidade do Dicionário** (`tag.un`), nunca um literal solto — hoje `"Temperatura (°C)"` está cravado em código (linha 28).

---

## 8. Ações do usuário

| Ação | Disparo | Efeito | Estado |
|---|---|---|---|
| Trocar janela | `setRange(r)` (linhas 46) | Re-janela e re-renderiza | EXISTE |
| Exportar CSV | `exportCSV` → `downloadCSV` (33-38) | Baixa raw da janela | EXISTE |
| Atualizar | `RefreshCw` (53) | — | **QUEBRADO: sem handler — REFINAR** |
| Toggle overlay Limites | (novo) | Mostra/oculta atenção+crítico+banda | REFINAR |
| Toggle overlay Baseline | (novo) | Sobrepõe baseline US-8 | REFINAR |
| Comparar grandezas/janelas | (novo) | Abre B5 | REFINAR |
| Hover ponto | `TT_` | Valor + hora | EXISTE — enriquecer |
| Saltar p/ Saúde & IA | (novo) | Da grandeza anômala → predição | REFINAR (coerência inter-aba) |

CSV/export deve permanecer gated por `can('Telemetria','read')`; nenhuma ação aqui escreve estado.

---

## 9. Relação com outras telas

- **Header + abas do ativo** (`AtivoDetail.tsx`): é irmã de `overview`, `saude`, `gemeo`, `tecnico`; compartilha `useAtivo()` → `{ asset, twin }`. O **valor atual** que falta aqui é o mesmo `twin.state` mostrado na Visão Geral — coerência a unificar.
- **Saúde & IA** (`saude`): consome a **mesma série** que sustenta baseline (US-8), anomalia (US-9) e RUL (US-10/11). A telemetria é a evidência auditável da predição — deve haver salto bidirecional (grandeza anômala → explicação do modelo).
- **Gêmeo Digital** (`gemeo`): `twin.residual`/`syncedAt` que esta tela deveria expor vêm do mesmo objeto; offline aqui ↔ dessincronia lá.
- **Alertas** (`/alertas`): alertas de `origem: "regra"` nascem exatamente do cruzamento série × limite do Dicionário plotado aqui (`tag.direcao` + `limiteCritico`). Um alerta deve linkar de volta para esta tela na janela e grandeza certas.
- **Dicionário** (Governança): fonte de `un`, `faixaMin/Max`, `limiteAlerta/Critico`, `direcao`, `sensor`.
- **Assistente** (`/assistente/:id`): o conversacional (US-12) cita esta série como evidência.

---

## 10. Relação com governança

- **Hierarquia / Matriz**: breadcrumb `["Ativos","Lista de Ativos", asset.id]` + header `area — planta` posicionam o ativo na árvore empresa→planta→área→sistema→ativo.
- **Dicionário (rastreabilidade do número)**: `critOf()` já encadeia override do ativo → Dicionário; cada limite plotado deve declarar **campo, unidade, faixa, limite, sensor, direção** (`Tag` em `types.ts`). REFINAR: hoje a unidade é literal e a proveniência (override vs. Dicionário) é invisível — viola "todo número rastreia ao Dicionário".
- **RBAC**: visibilidade gated por `can('Telemetria', nivel)`; export idem.
- **D-I-C-I**: a série histórica é evidência da fase **Inspeção** (e da linha-base de Comissionamento) — o eixo temporal pode marcar o instante de comissionamento/última intervenção.
- **Nota de honestidade**: quando baseline (US-8) for sobreposto, deve ostentar que vem de **modelo de degradação SIMULADO** (físico-informado + Weibull, não treinado em falhas reais) — padrão único valor + janela + confiança + explicação + honestidade.

---

## 11. Melhorias de UX/UI sobre o wireframe base

Crítica ancorada em `src/pages/ativo/Telemetria.tsx` e `src/lib/telemetry.ts`.

1. **[P0] Cobrir as 6 grandezas, não 3.** O array `charts` (linhas 27-31) lista só `temp, vib, corrente`, mas `toChartData` e o CSV já carregam `rpm, press, oleo`. Isso quebra US-4/US-7 visualmente. Adicionar os três cards faltantes derivando label/unidade de `TAG_LABEL`/`TAG_UNIT` em vez de literais. **Esforço baixo.**

2. **[P0] Mostrar o valor atual em cada card.** Hoje só há agregado (min/max/avg, linhas 63-65); o número que o usuário mais procura — a leitura atual `twin.state[key]` — não aparece. Inserir uma leitura grande (Rajdhani) com unidade e cor por banda (`C.green/yellow/red`) no header do card. Fecha US-7. **Esforço baixo.** Arquivo: `Telemetria.tsx` header do card (59-67).

3. **[P0] Plotar atenção + crítico + faixa, não só crítico.** A `ReferenceLine` única (linha 75) ignora `limiteAlerta` e `faixaMin/Max` do Dicionário. Adicionar segunda linha (âmbar `#FBBF24` = atenção, vermelha `#F87171` = crítico) e uma banda sombreada da faixa operacional; respeitar `tag.direcao` para orientar a leitura (estouro "acima" vs. "abaixo"). Generalizar `critOf` em `alertaOf`+`critOf`+`faixaOf`. **Esforço médio.** Arquivos: `Telemetria.tsx` (26, 75), Dicionário em `useStore`.

4. **[P1] Tira-resumo da janela (B2) acima do grid.** Antes do scroll vertical, uma linha com nº de amostras, cobertura da janela (`windowSamples` → contagem vs. esperado), grandezas em estouro e pior residual (`twin.residual`). Dá contexto e evita "rolar 6 cards para entender o estado". **Esforço médio.**

5. **[P1] Overlay de baseline (US-8) com nota de honestidade.** Toggle em B1 que sobrepõe a curva esperada à medida, com banda de confiança e selo "modelo simulado — não treinado em falhas reais". É a ponte governada com Saúde & IA. **Esforço alto** (depende do engine de baseline). Arquivos: `Telemetria.tsx` + `src/engine/prediction.ts`.

6. **[P1] Consertar o Refresh.** `IBtn icon={RefreshCw}` (linha 53) não tem `onClick` — botão morto. Ligar a um re-pull/re-sync do twin e exibir `syncedAt`. **Esforço baixo.**

7. **[P1] Proveniência do limite na UI.** `critOf` silenciosamente cai do override do ativo para o Dicionário (linha 26). Exibir no rodapé do card a origem do limite e o `sensor`/`campo` do Dicionário — cumpre "todo número rastreia". **Esforço baixo.**

8. **[P2] Painel de comparação (B5).** Cobrir o "comparação" do escopo: sobrepor duas grandezas normalizadas ou a mesma grandeza em 24h vs. semana anterior. Vira aba/painel colapsável para não competir com o grid. **Esforço alto.**

9. **[P2] Unificar o seletor de janela em `SegmentedControl`.** Botões soltos repetidos (45-50) deveriam ser um componente único do design system, reaproveitável nas outras abas. **Esforço baixo.**

10. **[P2] Estado vazio inteligente.** "Ativo offline — sem telemetria." (linha 40) confunde *offline* com *janela sem dados*. Distinguir os dois e oferecer ação (trocar janela / abrir Gêmeo). **Esforço baixo.**

> **Nota de honestidade (TagKey × US-4):** a US-4 cita "V" (tensão), mas `TagKey` em `types.ts` é `temp·vib·press·corrente·rpm·oleo` — **não há canal de tensão** no modelo de dados atual. A tela deve ser honesta: cobre A/RPM/°C + vib/press/óleo, e tensão fica como lacuna explícita do schema, não como afirmação falsa.
