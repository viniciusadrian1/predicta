## BLOCO 7 — Recomendações finais de melhoria do design

> **Síntese das 3 rodadas de refino** (governança transversal · 14 telas operacionais · auditoria de coerência) destilada
> em recomendações acionáveis. Voz de Lead Product Designer / Systems Designer / Information Architect.
> Princípio condutor confirmado em todas as fontes: **o PREDICTA já é um produto vivo e governado** — o que falta
> não é construir do zero, é **aplicar consistentemente** o que já existe (gating RBAC, honestidade de IA,
> rastreabilidade ao Dicionário) e **expor na UI** o que hoje só vive no engine, no seed e no system prompt.
> Quase todo P0 é "ligar fio existente", não inventar.
>
> Fontes destiladas: `telas/COERENCIA.md` (9 eixos de inconsistência) · `telas/README.md` (backlog de 82 itens) ·
> `governanca/README.md` (52 itens de governança) · `01-design-system.md` (5 estados + `AIConfidence`) ·
> `README.md` (roadmap P0 por tema A–H) · `governanca/RASTREABILIDADE.md` (grafo mestre US↔código).

---

### Índice do bloco

- (a) Melhorias de **CONSISTÊNCIA** — padronizações entre módulos
- (b) Oportunidades de **SIMPLIFICAÇÃO**
- (c) Como **APROFUNDAR a experiência do TÉCNICO de manutenção**
- (d) Melhorias para a **APRESENTAÇÃO VISUAL no Figma**
- (e) **COMPONENTES** que devem virar **PADRÃO do design system**
- (f) **ROADMAP P0 / P1 / P2 consolidado** (tabela única priorizada)

---

## (a) Melhorias de CONSISTÊNCIA — um sistema, não 14 telas que se parecem

A auditoria de coerência identificou **nove dívidas transversais** que se repetem em ≥3 telas e quebram a percepção de
"produto único". A regra-mãe é uma só: **cada padrão vira um componente compartilhado** em `src/components/ui-shared/`
(ou helper em `src/lib`/`src/store`), consumido por todas as telas, em vez de reimplementado por tela.

### a.1 — Breadcrumb = Matriz de Hierarquia (hoje cumprido em zero telas)

| Estado atual | Padrão único proposto |
|---|---|
| As 14 telas usam `usePageChrome` com rótulos fixos/encurtados (`["Ativos","Lista de Ativos", asset.id]`); nenhuma projeta `empresa → planta → área → sistema → ativo`. Detalhe de alerta/assistente nem herda a trilha do ativo de origem. | Helper **`trilhaHierarquia(assetId)`** (lê `HTREE`/`pathToNode`) retorna `[empresa, planta, área, sistema, TAG]` clicável; **`trilhaEscopo(papel)`** para telas de frota reflete a subárvore autorizada. `usePageChrome` passa a **receber sempre trilha derivada da Matriz**, nunca literais. O componente `BC` renderiza igual — só muda a fonte. Telas de detalhe **herdam a trilha do ativo de origem**. |

**Arquivos:** `src/store/derive.ts` (`pathToNode`/`trilhaHierarquia`/`trilhaEscopo`) · `src/components/layout/chrome.tsx`
(aceitar `BreadcrumbNode[]{label,to}` em vez de `string[]`) · `ui-shared` (`BC` navegável) · todas as 14 páginas.

### a.2 — Badges de severidade / status / criticidade (quatro gramáticas → uma)

Hoje convivem: `Badge` com **classes Tailwind interpoladas quebradas** (`bg-[${C.green}]/10` — não renderiza em runtime)
ao lado de `SevBadge` com classes estáticas; cores de status reimplementadas por tela (`statusColor` no Painel, `sc` no Mapa,
`SEV_COLOR` no Alerta). **Eixo semântico → componente único:**

| Eixo semântico | Componente único | Cores (paleta C) |
|---|---|---|
| Status do ativo (normal/atenção/crítico/offline) | `Badge s={status}` **corrigido** (classes estáticas por chave) | green / yellow / red / slate |
| Severidade do alerta (crítico/alto/médio/baixo) | `SevBadge s={sev}` | red / orange / yellow / slate |
| Status do ciclo (aprovado/em_revisão/pendente) | `Badge` (já cobre) | emerald / yellow / slate |
| Criticidade do ativo (Crítica/Alta/Média/Baixa) | **`CritBadge` (novo)** via `corDaCriticidade` | orange / orange / yellow / slate |
| Origem do alerta (regra / modelo / manual) | **`OrigemBadge` (novo)** | ícone+chip distinguindo fato medido × predição |
| Dot de status (mapa/painel/cards) | **`StatusDot` (novo)** via `corDoStatus` | mapa de status |

**Regra dura:** toda cor de status sai de `corDoStatus`/`corDaSaude`/`corDaCriticidade` (`theme.ts`); **proibir maps locais**.

### a.3 — Filtros e busca (gramática única + KPIs clicáveis)

Cada tela inventa sua própria barra; selects decorativos (Lista de Ativos `.slice(0,3)` sem `onChange`), "Filtrar" inerte
(Mapa), KPIs passivos (Dashboard/Alertas). **Padrão único `<FilterBar>`:** busca *debounced* + **filtros hierárquicos
encadeados** (Planta → Área → Sistema, default = escopo do papel) + chips multi-seleção (status/severidade/origem/tipo) +
**chips de filtro ativo removíveis** + ordenação. Invariante: **KPIs e contadores são sempre clicáveis = filtros**
(clicar "Críticos" filtra a tabela/canvas) e **Export sempre respeita o resultado filtrado**, nunca a base crua.

### a.4 — Cabeçalho e sistema de abas do ativo

O shell `AtivoDetail.tsx` (header + 5 abas) é herdado por Overview/Telemetria/Saúde/Gêmeo/Técnico — **bom** — mas cada aba
define seu próprio guard de "sem twin" (três frases, três layouts para o mesmo estado offline) e seu próprio `SH`/grid.
**Padrão:** wrapper **`<AtivoTab>`** centraliza guard de `twin` (empty-state único), `SH` e grid base; **header em stat-strip
de duas linhas** — (1) identidade (ícone, nome, TAG, `Badge` status, `modoCritico`, selo D-I-C-I) + (2) KPIs **rastreáveis**
(Saúde, RUL, e Disponibilidade **só se derivada de uptime real ou rotulada "estimativa"**); empty-state offline único
**`<TwinOffline>`** (último valor conhecido + idade de `syncedAt` + CTA de diagnóstico).

### a.5 — Família única de estados (loading / empty / error / realtime / sem-permissão)

Hoje: empty é tabela fantasma (Lista), frase única (Ativo), neutro (Alertas) ou inexistente (Mapa); error só tratado no
Assistente e no OCR; realtime sem marcação padronizada apesar de `syncedAt`/`residual` existirem. **Padrão:** família em
`ui-shared/states.tsx` — `<EmptyState>`, `<ErrorState>`, `<NoPermission>`, `<LiveTag syncedAt>` (pulso steel, "há Ns",
esmaece quando *stale*, vira "PAUSADO" âmbar em `settings.paused`), `<TwinOffline>` + **usar o `Skeleton` que já existe**.
Regra: **distinguir sempre** "filtro sem resultado" de "vazio positivo" (fila zerada = verde) e "offline" de "janela sem
dados" de "não comissionado" (D-I-C-I).

### a.6 — Padrão único de output de IA (a inconsistência #1 do produto, recorre em 9 telas)

Sete a nove telas pedem o mesmo bloco "valor + horizonte + confiança + explicação + nota de honestidade" e **cada uma propõe
criá-lo do zero**. A nota de honestidade hoje vive só no system prompt (invisível) ou como prosa solta. **Padrão:** envelope
canônico **`AIConfidence`** (ver §e) reutilizado em Saúde & IA, Gêmeo, Dashboard (Projeção IA), Alertas-modelo, Telemetria
(overlay baseline), Mapa (tooltip) e Cadastros. **Nenhuma predição pode aparecer "nua".**

### a.7 — Glossário e tokens canônicos

Identificador do ativo aparece como "Tag/TAG/ID/Identificador"; "RUL" é confundido com "Próx. Manut." (que é a *data
derivada*); unidades hardcoded em labels (`"Temperatura (°C)"` cravado) em vez de virem do Dicionário (`TAG_UNIT`). **Padrão:**
`src/lib/glossario.ts` (constantes `LABELS`, `HONESTY_NOTE`, `TAG_LABEL`/`TAG_UNIT`); **zero hex fora de `theme.ts`**;
**unidade sempre do Dicionário**; helpers `<Num>`/`<Mono>` para aplicar Rajdhani/JetBrains de forma uniforme. Unificar também
os **dois sistemas de paleta divergentes** (`C` em `theme.ts` `#07101E`/`#0C1829` vs tokens CSS `#080C14`/`#0D1829`).

---

## (b) Oportunidades de SIMPLIFICAÇÃO

> Tese: o produto sofre menos de "falta feature" e mais de **superfície redundante e botões mortos**. Simplificar = remover
> o que não funciona, fundir o que se repete, e deixar o estado vivo falar por si.

| # | Oportunidade | O que simplificar | Onde |
|---|---|---|---|
| S1 | **Matar controles decorativos** | Remover/ativar: selects sem `onChange` (Lista), "Filtrar" inerte (Mapa), `RefreshCw`/"Atualizar"/"Ao vivo" sem handler (Dashboard/Telemetria/Painel), paginação fake `[1,2,3,…,12]` (Lista). Botão morto é pior que ausência: promete e não entrega. | `AtivosLista`, `MapaPlanta`, `Dashboard`, `Telemetria`, `Painel` |
| S2 | **Um envelope de IA, não sete** | Em vez de 7 implementações de "card de predição", **um** `AIConfidence`. Reduz superfície de manutenção e elimina divergências (ex.: nota de honestidade que muda de frase por tela). | `ui-shared/ai/*` |
| S3 | **Uma fonte de cor de status** | Eliminar `statusColor`, `sc`, `SEV_COLOR`, `bg-[${...}]` → tudo deriva de `theme.ts`. Menos código, zero drift. | `MapaPlanta`, `Painel`, `AlertaDetalhe`, `ui-shared` |
| S4 | **Fundir banners redundantes no OCR** | Banner de status + "Campos Detectados" → **um painel único de Resultado da Leitura** com aplicar-por-campo. Hoje o usuário lê a mesma informação em dois lugares. | `CadastroOCR.tsx` (B3/B4) |
| S5 | **Recomendação + ficha do modelo deduplicadas** | `RecommendationCard`/`ModelCard` hoje duplicados entre `SaudeIA` e `GemeoDigital` com divergências. Um componente, Δ-RUL pré-calculado (migrar `recEffect`). | `SaudeIA`, `GemeoDigital`, `ui-shared` |
| S6 | **Taxonomia de severidade única** | Dashboard funde "médio+baixo" na barra (3 cat.) mas usa 4 na pizza; Alertas chama "Médios" o que agrega médio+baixo. **Os números não fecham entre blocos** — alinhar em 4 categorias canônicas. | `derive.ts`, `Dashboard.tsx`, `AlertasLista.tsx` |
| S7 | **Selos por permissão, não telas duplicadas** | Em vez de variantes de tela por papel, **degradação por nível** (`full` editável / `read` somente-leitura+`Lock` / `none` oculto+`Gate`). Uma tela, três níveis de render. | convenção transversal |
| S8 | **Login honesto e enxuto** | Remover KPIs hardcoded (247/5/97.4%/2.1h que o seed de 10 ativos contradiz) e credenciais demo pré-preenchidas sem flag de ambiente. | `Login.tsx` |
| S9 | **`SegmentedControl` único** | Unificar os seletores de janela/segmento espalhados (Telemetria, horizontes) num só controle reutilizável. | `ui-shared`, `Telemetria.tsx` |

---

## (c) Aprofundar a experiência do TÉCNICO de manutenção

> O **Técnico de Manutenção** é a persona de chão de fábrica (`Alertas:full`, `Assistente:full`, demais `read`/`none`).
> Seu job é uma **fila de ordens**, não um dashboard executivo. Hoje a UI o atende mal em três frentes: a *default view*
> errada, a fila que não é fila, e as ações de escrita que ou não existem ou não são governadas.

### c.1 — Primeiro minuto: cair na fila certa

- **Default view = `/alertas`**, não `/dashboard`. Login hoje sempre vai a `/dashboard`; para o Técnico (e pior, para o
  Operador Campo com `Dashboard:none`) isso é um beco. Implementar `firstAllowedRoute(rbac, papel)` e a default view por papel.
- **Painel Operacional deve depender do módulo `Ativos`, não `Dashboard`** — hoje o Sidebar esconde a tela de *war room* mais
  útil do chão de fábrica justamente de quem tem `Dashboard:none`.

### c.2 — Converter listas em filas de manutenção

- **Surfacer RUL e modo crítico** como colunas/badges na Lista de Ativos e no Painel (hoje descartados pelo `AssetView`).
- **Ordenar por severidade/RUL** com faixa de prioridade fixa (triagem da frota). A lista deixa de ser inventário e vira
  fila acionável.
- **KPIs e contadores viram filtros** (clicar "Críticos"/"Em atenção" filtra). Implementar o **modo List do Painel** (o toggle
  existe no estado, não renderiza).

### c.3 — Ações de campo reais, governadas e auditáveis (fecha US-11 + US-13)

> **Este é o GAP P0 transversal mais crítico para o Técnico.** `applyMaintenance`, criar OS, registrar manutenção e ações de
> alerta hoje **não passam por `can()`/`useCan()`**. Pior: o Assistente cria OS (`create_work_order`) sem checar `Alertas:full`.

- **"Próximas Ações" acionáveis** na Visão Geral: badge de prioridade + "Registrar manutenção" / "Criar OS"
  (`recommendationsFor`), **gated por `Ativos:full`** — em `read`, botão desabilitado + tooltip de permissão (nunca esconder
  silenciosamente uma ação esperada).
- **OS real** com drawer pré-preenchido + relação OS↔alerta que **resolve ao concluir**, e **evento auditável D-I-C-I**
  (RUL antes/depois). Conecta o motor ao ciclo do ativo.
- **`executeTool` do Assistente consulta `can()` por ferramenta** antes de executar; nega com mensagem honesta e **remove a
  tool da lista** quando o papel só tem `read`.

### c.4 — Telemetria como ferramenta de diagnóstico, não vitrine

- **Cobrir as 6 grandezas** (rpm, press, óleo — não só temp/vib/corrente) e exibir **valor atual** no header de cada card.
- **Plotar limites** de atenção + crítico + faixa operacional respeitando `tag.direcao`, e **colorir leituras por banda do
  Dicionário** — o Técnico vê de relance o que está fora.
- **Frescura do dado**: badge "há Ns" (`syncedAt`), esmaecer card *stale*, "Ao vivo" vira toggle de pausa real.

### c.5 — A ponte para o Assistente (US-12) a partir da triagem

- Ação **"Investigar com Assistente"** a partir do alerta/lista, passando `{assetId, tag, modoCritico}` — hoje a ponte só
  existe a partir do Detalhe do Alerta. É a aresta de maior alavancagem para o Técnico fechar US-12 já na triagem.
- **Tornar o painel do Assistente navegável**: IDs e alertas citados viram links (hoje são texto = beco sem saída). O Técnico
  precisa saltar do alerta citado de volta ao detalhe.

---

## (d) Melhorias para a APRESENTAÇÃO VISUAL no Figma

> Objetivo: o documento final + Figma devem **demonstrar o sistema, não só telas**. As recomendações abaixo tornam a
> apresentação fiel ao produto vivo e legível como blueprint.

| # | Recomendação de apresentação | Por quê |
|---|---|---|
| F1 | **Montar a biblioteca de componentes como *página-índice* no Figma** (`AIConfidence`, `TraceableValue`, `LiveTag`, `AssetHeader+Tabs`, `HierarchyBreadcrumb`, `SevBadge`/`Badge`/`CritBadge`/`OrigemBadge`, `EmptyState`/`ErrorState`) com todas as variantes/estados lado a lado. | Mostra que o produto é um *sistema* — refletir 1:1 o `ui-shared`. |
| F2 | **Documentar os 5 estados de cada bloco de dados** (loading via Skeleton · empty · error · tempo real · sem-permissão) como *variants* navegáveis. | Hoje os estados são ad-hoc; o Figma deve prová-los como contrato. |
| F3 | **Anatomia anotada do `AIConfidence`** (valor · horizonte · confiança · explicação · selo SIMULADO) com *callouts* explicando a honestidade. | É a tese central de credibilidade — merece destaque visual. |
| F4 | **Breadcrumb hierárquico completo** desenhado como componente (empresa→planta→área→sistema→ativo, com escopo por papel destacado). | Materializa a Matriz; hoje é a promessa cumprida em zero telas. |
| F5 | **Drill de rastreabilidade (`TraceableValue`)** prototipado: clicar um número abre o popover com campo/unidade/faixa/limite/sensor/direção. | Torna inspecionável "todo número → Dicionário". |
| F6 | **Tabela de personas × default view × RBAC** como *slide* de abertura da apresentação. | Explica modularidade (US-1) e o "primeiro minuto" por papel. |
| F7 | **Unificar tokens de cor no Figma com a paleta C única** (resolver a divergência `#07101E`↔`#080C14`); aplicar tipografia Rajdhani/JetBrains Mono/Inter como *text styles* nomeados. | Evita drift entre Figma, código e este documento. |
| F8 | **Grids responsivos demonstrados** (4→2→1 col; tabela densa → cards no mobile; sidebar → drawer) e **alturas de gráfico por token**. | Hoje há `grid-cols-N` e alturas fixas divergentes por tela. |
| F9 | **Selo D-I-C-I e selo de procedência do modelo SIMULADO** como *stickers* reutilizáveis anexáveis a qualquer artefato. | Reforça a espinha de governança presente em toda tela. |
| F10 | **Contraste AA validado nos mockups** (`slate #6D8196` sobre `bgCard` fica ~4.0:1 < 4.5:1 — usar `textSub #8FA8BC` para texto <14px). | Acessibilidade como atributo de qualidade visível. |

---

## (e) COMPONENTES que devem virar PADRÃO do design system

> Mapa consolidado dos componentes a extrair. Cada um **substitui** implementações espalhadas e **resolve** eixos da
> auditoria de coerência. Esta é a "Onda 0" de fundações compartilhadas que desbloqueia o resto do backlog.

| Componente | Arquivo proposto | Resolve | Substitui (hoje espalhado em) |
|---|---|---|---|
| **`AIConfidence`** (envelope: valor + horizonte `HORIZONS` + `ConfidenceTag` + `ExplainabilityList` + `HonestyNote`/selo SIMULADO) | `ui-shared/ai/AIConfidence.tsx` | output único de IA; honestidade visível | duplicação Saúde↔Gêmeo + ausência nas 7 demais telas |
| **`TraceableValue`** (número → popover campo/unidade/faixa/limite/sensor/direção, lendo `s.dictionary`) | `components/governanca/TraceableValue.tsx` | "todo número rastreia ao Dicionário" inspecionável na UI | rastreabilidade hoje tácita no seed/engine |
| **`HierarchyBreadcrumb`** (`BC` navegável alimentado por `pathToNode`/`trilhaHierarquia` + escopo por papel) | `ui-shared` + `chrome.tsx` + `derive.ts` | breadcrumb = Matriz de Hierarquia | breadcrumbs literais em 14 telas |
| **`EmptyState` / `ErrorState` / `NoPermission` / `LiveTag` / `TwinOffline`** (família de estados) | `ui-shared/states.tsx` | os 5 estados padronizados; realtime de 1ª classe | empty/error ad-hoc; "Carregando…"/"Nenhum…" soltos |
| **`AssetHeader + Tabs` (`AtivoTab`)** (stat-strip rastreável + guard de twin único) | `ui-shared/AtivoTab.tsx` + `AtivoDetail.tsx` | coerência de header/abas; empty offline único | 3 guards de twin divergentes (Overview/Telemetria/Saúde) |
| **`SevBadge` unificado + `Badge` corrigido + `CritBadge` + `StatusDot` + `OrigemBadge`** | `ui-shared/index.tsx` + `theme.ts` | badges de status/severidade/criticidade/origem coesos | `Badge` quebrado (`bg-[${}]`), `statusColor`, `sc`, `SEV_COLOR` |
| **`FilterBar` + `useHierarchyFilter`** | `ui-shared/FilterBar.tsx` + `store/hooks.ts` | gramática única de filtro hierárquico + KPIs clicáveis | selects decorativos, "Filtrar" inerte, KPIs passivos |
| **`GatedButton`** (encapsula `useCan` + estado desabilitado + tooltip de permissão) | `ui-shared/GatedButton.tsx` | toda ação de escrita gated, com feedback honesto | botões mutadores sem `useCan` em 5+ telas |
| **`AuditTrail`** (últimas N mudanças de governança) + slice `auditLog`/`logAudit` | `components/governanca/AuditTrail.tsx` + `useStore.ts` | trilha de auditoria das ações de governança | **nenhuma** mutação de governança registrada hoje |
| **`DiciBadge`** (selo D-I-C-I: 4 micro-badges de `DiciRow`) + selo procedência do modelo SIMULADO | `ui-shared` + `prediction.ts` | ciclo do ativo + honestidade do modelo anexáveis | selo só no system prompt / header de `prediction.ts` |
| **`UpsellModule`** (módulo não-contratado: cadeado + "Falar com a Forzy") + flag `contratados` | `ui-shared` + `seed.ts`/store | separar "não-contratado" de "sem-permissão" (US-1) | Sidebar trata ambos como "some o item" |
| **`AssetCard` + `PlantCanvas`** (card de ativo / canvas SVG reutilizáveis) | `ui-shared` | dot/card de status reimplementado por tela | card inline (Painel), SVG inline (Mapa) |

---

## (f) ROADMAP P0 / P1 / P2 CONSOLIDADO

> Backlog único deduplicado das 3 rodadas (82 itens operacionais + 52 de governança + recomendações do design system),
> agrupado por **tema** e priorizado. **Esforço:** B(aixo) · M(édio) · A(lto). A ordem dentro de P0 respeita dependências:
> **fundações compartilhadas → tampar vazamentos de RBAC → padrão de IA → rastreabilidade**.
>
> **Os quatro itens de topo (em destaque) são os que esta priorização exige fechar primeiro:** o **GAP de RBAC em ações de
> escrita**, a **rastreabilidade `<TraceableValue>`**, o componente **`AIConfidence`** e a **trilha de auditoria**.

### P0 — Credibilidade de governança e honestidade (fechar primeiro)

| # | Item | Tema | Pri | Esf | Arquivo(s) |
|---|---|---|:--:|:--:|---|
| **P0-1** | **GAP de RBAC em ações de ESCRITA** — gatear por `useCan(modulo,"full")`: `applyMaintenance`, criar OS, registrar manutenção, ações de alerta (Resolver/Ack/Reabrir/Comentar) e `create_work_order` no `executeTool` do Assistente; `<GatedButton>` com estado desabilitado + tooltip | RBAC | **P0** | B–M | `SaudeIA.tsx`, `AtivoDetail.tsx`, `AlertaDetalhe.tsx`, `ai/tools.ts`, `ui-shared/GatedButton.tsx` |
| **P0-2** | **Rastreabilidade `<TraceableValue>`** — número → popover campo/unidade/faixa/limite/sensor/direção, lendo `s.dictionary`; aplicar em KPIs, alertas, detalhe do ativo, leituras | Rastreab. | **P0** | M | `components/governanca/TraceableValue.tsx` |
| **P0-3** | **Componente `AIConfidence`** — adicionar `confianca` ao `PredictionModel` (deriva de `twin.residual`); envelope único valor+horizonte+confiança+explicação+selo SIMULADO; aplicar em Saúde&IA, Gêmeo, Dashboard, Alertas-modelo, Telemetria, Mapa, OCR | IA | **P0** | M–A | `engine/prediction.ts`, `ui-shared/ai/*` |
| **P0-4** | **Trilha de AUDITORIA** — slice `auditLog` + wrapper `logAudit` nas 5 ações (`setRbac`/`setDici`/`upsertTag`/`removeTag`/`setHierarchy`) + tela `/governanca/auditoria` (quem/quando/de→para) | Auditoria | **P0** | M | `useStore.ts:140-175`, `Auditoria.tsx` (novo), `routes.tsx` |
| P0-5 | **Montar `RequireAuth` + `<Gate>` nas rotas faltantes** (`/assistente`, `/assistente/:id`, `/mapa`, `/operacional`); sem login forçado o RBAC é decorativo | RBAC | P0 | B | `routes.tsx`, `auth/RequireAuth.tsx` |
| P0-6 | **Selo de honestidade SIMULADO persistente na UI** (Assistente, Dashboard Projeção IA, trilha do ativo, Alertas-modelo) — deriva de `predictionModel.name/metodo`; troca sozinho com modelo treinado | IA | P0 | B | `Assistente.tsx`, `Dashboard.tsx`, `prediction.ts` |
| P0-7 | **Breadcrumb hierárquico navegável** — `pathToNode`/`trilhaHierarquia` + `BC` clicável com escopo por papel | Hierarquia | P0 | M | `derive.ts`, `chrome.tsx`, `ui-shared` |
| P0-8 | **Corrigir `Badge` (classes estáticas) + centralizar cores de status** em `theme.ts`; eliminar `statusColor`/`sc`/`SEV_COLOR`/`bg-[${}]` | Consistência | P0 | B | `ui-shared/index.tsx`, `MapaPlanta.tsx`, `Painel.tsx`, `AlertaDetalhe.tsx` |
| P0-9 | **`AVAIL`/Disponibilidade rotulada como estimativa** (heurística por status, não fato medido) ou derivada de uptime real | Consistência | P0 | B | `derive.ts`, `AtivoDetail.tsx`, `Dashboard.tsx` |
| P0-10 | **Filtros reais e hierárquicos** na Lista de Ativos (matar selects decorativos `.slice(0,3)`) + contadores do Painel viram filtros + modo List | Navegação | P0 | M–A | `AtivosLista.tsx`, `Painel.tsx` |
| P0-11 | **Surfacer RUL/modo crítico + ordenar por urgência** (Lista e Painel) — converte inventário em fila de manutenção | Técnico | P0 | M | `derive.ts`, `AtivosLista.tsx`, `Painel.tsx` |
| P0-12 | **"Próximas Ações" acionáveis** na Visão Geral (Registrar manutenção / Criar OS, gated) — fecha US-11 | Técnico | P0 | A | `Overview.tsx`, `recommendations.ts` |
| P0-13 | **Card de predição honesto** para alertas `origem:"modelo"` + `ReferenceLine` do limite no mini-gráfico do alerta | IA | P0 | M | `AlertaDetalhe.tsx` |
| P0-14 | **Cobrir 6 grandezas na Telemetria** + valor atual no header + limites/banda do Dicionário (`tag.direcao`) | Realtime | P0 | B–M | `Telemetria.tsx` |
| P0-15 | **Reconciliar papéis** (`Admin Forzy`/`TI-Governança`/`Usuário Cliente`) + **default view por papel** (`firstAllowedRoute`); Painel depende de `Ativos` não `Dashboard` | RBAC/US-1 | P0 | M | `seed.ts`, `routes.tsx`, `Sidebar.tsx`, `Login.tsx` |
| P0-16 | **Cadastro ancorado na Matriz** (selects encadeados Planta/Área) + início do ciclo D-I-C-I na criação + trava de confiança OCR <90% | Governança | P0 | M–A | `CadastroManual.tsx`, `CadastroOCR.tsx`, `createAsset.ts` |

### P1 — Coerência operacional e materialização da espinha

| # | Item | Tema | Pri | Esf | Arquivo(s) |
|---|---|---|:--:|:--:|---|
| P1-1 | **Família de estados** `EmptyState`/`ErrorState`/`NoPermission`/`LiveTag`/`TwinOffline` + usar `Skeleton` | Estados | P1 | M | `ui-shared/states.tsx` |
| P1-2 | **`<AtivoTab>` + header em stat-strip** rastreável (guard de twin único) | Consistência | P1 | A | `AtivoDetail.tsx`, `ui-shared/AtivoTab.tsx` |
| P1-3 | **`<FilterBar>` + `useHierarchyFilter`** compartilhado (Lista/Painel/Alertas/Mapa) + **export respeita filtro** | Navegação | P1 | M | `ui-shared/FilterBar.tsx`, `store/hooks.ts`, `lib/csv.ts` |
| P1-4 | **`OrigemBadge`** (regra×modelo×manual) + coluna/flag na Lista de Alertas + bloco "Origem & Rastreabilidade" no Detalhe | Rastreab. | P1 | B–M | `AlertasLista.tsx`, `AlertaDetalhe.tsx`, `ui-shared` |
| P1-5 | **"Investigar com Assistente"** a partir de alerta/lista `{assetId,tag,modoCritico}` + painel do Assistente navegável (links) | Navegação | P1 | M | `AlertasLista.tsx`, `Assistente.tsx` |
| P1-6 | **OS real** (drawer + relação OS↔alerta, resolve ao concluir) + `Alert.eventos[]` auditável (autor/timestamp) | Técnico | P1 | A | `AlertaDetalhe.tsx`, `types.ts`, `useStore.ts` |
| P1-7 | **Baseline (US-8) e Anomalia (US-9) com bloco próprio** (hoje dissolvidos na curva) + overlay de baseline na Telemetria | IA | P1 | A | `SaudeIA.tsx`, `Telemetria.tsx`, `engine/*` |
| P1-8 | **Frescura do dado** (`syncedAt`, "há Ns", esmaecer stale, "Ao vivo" → toggle) + refletir `settings.paused` no Painel | Realtime | P1 | M | `Painel.tsx`, `Telemetria.tsx`, `AtivosLista.tsx` |
| P1-9 | **`NodeMetaPanel` na Hierarquia** + vínculos do nó à operação (gated) + `HTREE` 8 níveis | Hierarquia | P1 | M–A | `Hierarquia.tsx`, `derive.ts`, `seed.ts` |
| P1-10 | **`TagTraceCard` + limite EFETIVO por ativo** + abas Ciclo do Ativo / Fluxo DIKW no D-I-C-I | Rastreab. | P1 | M–A | `Dicionario.tsx`, `DICI.tsx`, `prediction.ts` |
| P1-11 | **Unidades do Dicionário** (matar `"°C"` hardcoded) + `<Num>`/`<Mono>` + corrigir FLA (`flaFromKw`) | Consistência | P1 | B–M | `Telemetria.tsx`, `Tecnico.tsx`, `lib/glossario.ts` |
| P1-12 | **Mapa derivado da Hierarquia** (elimina drift mapa↔cadastro) + marcador codifica saúde/criticidade + tooltip | US-6 | P1 | M–A | `MapaPlanta.tsx`, `derive.ts` |
| P1-13 | **Δ-RUL pré-calculado** nas recomendações + `RecommendationCard`/`ModelCard` únicos (dedup Saúde↔Gêmeo) | IA | P1 | M | `SaudeIA.tsx`, `GemeoDigital.tsx`, `ui-shared` |
| P1-14 | **Empty/erro/validação** no Cadastro (validação por etapa, Sensores ligados ao Dicionário) + handoff OCR→Manual via route state | Onboarding | P1 | M | `CadastroManual.tsx`, `CadastroOCR.tsx` |
| P1-15 | **`UpsellModule` + flag `contratados`** (separar não-contratado de sem-permissão, US-1) | US-1 | P1 | M | `Sidebar.tsx`, `seed.ts`, `ui-shared` |

### P2 — Polimento, densidade e robustez

| # | Item | Tema | Pri | Esf | Arquivo(s) |
|---|---|---|:--:|:--:|---|
| P2-1 | **`AssetCard` + `PlantCanvas`** reutilizáveis + grids responsivos (`auto-fill/minmax`) + sidebar→drawer mobile | Visual | P2 | M | `Painel.tsx`, `MapaPlanta.tsx`, `theme.ts`, `AppShell` |
| P2-2 | **Sincronização cruzada mapa↔lista** (hover compartilhado) + marcador fantasma D-I-C-I sem twin | Mapa | P2 | M | `MapaPlanta.tsx`, `derive.ts` |
| P2-3 | **Unificar paleta** `C`↔tokens CSS (`#07101E`↔`#080C14`) + tokens de espaçamento nomeados + auditoria de contraste AA | Visual | P2 | B | `theme.ts`, `theme.css` |
| P2-4 | **Persistência leve de conversa** por ativo no Assistente + render markdown completo + tratamento de erro diferenciado (rede/RBAC/limite) | Assistente | P2 | B–M | `Assistente.tsx`, `ai/assistant.ts` |
| P2-5 | **Sparklines inline** (saúde/temp) no card do Painel/Overview (US-7 sem clique) + seletor de tag | Realtime | P2 | M | `Painel.tsx`, `Overview.tsx` |
| P2-6 | **Escopo hierárquico nas agregações** (navegação governada) + gating de atalhos do Dashboard pelo destino | Governança | P2 | A | `derive.ts`, `Dashboard.tsx` |
| P2-7 | **Heatmap RBAC + diff de papéis** + simulador de Navegação Governada exportável + `navGraph.ts` com teste de fumaça | Governança | P2 | M | `RBAC.tsx`, `data/navGraph.ts` |
| P2-8 | **Procedência Manual/OCR persistida** + dado real vs fabricado na aba Técnico (IP55/380V hard-coded) | Onboarding | P2 | M | `Tecnico.tsx`, `createAsset.ts`, `types.ts` |
| P2-9 | **Painel de comparação** na Telemetria (2 grandezas / janela vs janela) + tira-resumo da janela | Realtime | P2 | A | `Telemetria.tsx` |
| P2-10 | **Visão em cards (perfil Cliente, US-2)** toggle tabela↔cards na Lista + confirmação ao cancelar cadastro dirty | Visual | P2 | M | `AtivosLista.tsx`, `CadastroManual.tsx` |

---

### Critério de pronto (invariantes que provam o design consolidado)

Quando estes cinco invariantes valerem, o PREDICTA deixa de "parecer" coeso e governado e **é**:

1. **Toda ação de escrita é gated** por `useCan`, com feedback honesto em `read` (P0-1, P0-5).
2. **Todo número rastreia ao Dicionário** de forma inspecionável (`TraceableValue`, P0-2).
3. **Nenhuma predição aparece "nua"** — sempre com confiança + explicação + selo SIMULADO (`AIConfidence`, P0-3/P0-6).
4. **Toda mutação de governança gera um `AuditEvent`** (trilha de auditoria, P0-4).
5. **Todo breadcrumb materializa a Matriz** e aplica o escopo do papel (P0-7).
