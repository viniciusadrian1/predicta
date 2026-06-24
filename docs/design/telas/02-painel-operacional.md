# Tela 02 — Painel Operacional

> Especificação de refinamento (FORZY · PREDICTA). Base implementada em `src/pages/Painel.tsx`.
> Convenção: **JÁ EXISTE** = comportamento real no código · **REFINAR** = proposta de maturação.

---

## 1. Nome da tela

**Painel Operacional** — rota `/painel` (grupo *Operação*; breadcrumb `["Operação", "Painel Operacional"]` definido em `usePageChrome` dentro de `src/pages/Painel.tsx`).

É o *war room* ao vivo da frota: a primeira tela que um operador de turno deixa aberta no telão. Não é o dashboard analítico (esse é a tela 01, com KPIs, tendência de saúde e gráfico de alertas por dia); é o **monitor de estado de 1ª classe**, granular por ativo, otimizado para responder *"o que exige minha ação agora?"* em menos de 5 segundos.

---

## 2. Objetivo da tela

**Estado atual no produto.** Hoje `Painel.tsx` já entrega um painel vivo funcional: lê `useAssetViews()` (junção `Asset` estático × `AssetTwin` vivo do motor de simulação) e o relógio do simulador `simClock`; renderiza uma **barra de status ao vivo** com a contagem agregada (`statusCounts`) de Normais/Atenção/Críticos/Offline + timestamp; oferece **busca textual** (nome ou id), **filtro por tipo** (Todos/Bombas/Motores/Compressores/Turbinas via `TYPE_MATCH`) e **toggle grid/list**; e desenha um **grid de cards** por ativo com id (mono), dot de status com glow, nome, área, barra de saúde (`Bar_`), três micro-leituras do gêmeo (temp/vib/press de `a.twin.state`) e selo `ao vivo`/`Offline`. Cada card navega para `/ativos/:id/overview`. O pulso visual (`animate-pulse` no dot, dado `font-mono` em `steel`) já comunica tempo real.

**O que esta tela deve ser (objetivo de refino).** Tornar o tempo real um **estado de primeira classe e legível**: (a) dar à frota uma leitura de *triagem* — o que está pior primeiro, não em ordem de seed; (b) ancorar cada número exibido no Dicionário (unidade, faixa, limite, direção de violação) para que a micro-leitura deixe de ser um número solto e passe a sinalizar proximidade do limite; (c) transformar a barra de status em **filtro acionável** (clicar "Críticos" filtra a frota); (d) expor a frescura do dado (`syncedAt`, idade da sincronização) e a degradação de conexão (offline) como sinais de confiança, não só como cor; (e) preparar o salto operacional do *ver* para o *agir* (atalho a alerta/assistente sem sair do contexto). Cobre primariamente **US-7** (valores atuais + acesso ao histórico) e **US-4** (sensores em V, A, RPM, °C — hoje a tríade temp/vib/press; refino amplia para corrente/rpm).

---

## 3. Perfil principal que usa a tela

| Persona | Uso primário | Nível RBAC esperado (módulo `Dashboard`/`Telemetria`) |
|---|---|---|
| **(a) Técnico de Manutenção** | **Persona-âncora.** Vigília de turno; varre a frota, identifica o card crítico, salta para o ativo/alerta. | `read`+ em Dashboard e Telemetria |
| (b) Gestor Industrial | Visão de saúde da frota e priorização macro; usa contagens e filtro por área. | `read`/`full` |
| (c) Cliente da Indústria | Acompanha *seus* ativos (escopo por hierarquia); leitura amigável (US-2), sem jargão. | `read` (escopo limitado) |
| (d) Admin Forzy | Suporte/diagnóstico cross-cliente; valida que o motor está sincronizando. | `full` |
| (e) TI/Governança | Audita frescura de dado e conectividade; não é foco operacional. | `read` |

A tela é desenhada **para o técnico em pé diante de um telão**: alto contraste, números grandes (Rajdhani), zero rolagem para o que importa.

---

## 4. User stories da Forzy atendidas

| US | Como esta tela atende | Estado |
|---|---|---|
| **US-7** Valores atuais + gráficos históricos | Card mostra leitura atual (saúde + temp/vib/press de `a.twin.state`); clique abre `/ativos/:id/overview` (histórico). | JÁ EXISTE (atual) / REFINAR (sparkline inline para "histórico no card") |
| **US-4** Sensores em V, A, RPM, °C | Micro-leituras de temperatura (°C), vibração (mm/s) e pressão (bar). | JÁ EXISTE parcial — falta **corrente (A)** e **RPM**; REFINAR |
| US-2 Interface amigável p/ cliente industrial | Linguagem de status em PT-BR, código de cor consistente, cards autocontidos. | JÁ EXISTE / REFINAR (modo cliente sem jargão técnico) |
| US-1 Solução modular | Painel é módulo independente, gated por RBAC `Dashboard`. | JÁ EXISTE (rota/RBAC) |
| US-13 Governança de acessos | Visibilidade respeita papel/hierarquia do usuário. | REFINAR (escopo por hierarquia ainda não aplicado ao grid) |
| US-9/US-10 Anomalia / parada | Status `critico`/`atencao` deriva do motor (Weibull + físico-informado). Painel é o **ponto de entrada** para a predição detalhada. | JÁ EXISTE (status) / REFINAR (badge de RUL no card) |

---

## 5. Blocos e seções da tela

| # | Bloco | Conteúdo | Estado / arquivo |
|---|---|---|---|
| B0 | **Chrome da página** | Breadcrumb `Operação › Painel Operacional`; ações no header: toggle grid/list + `IBtn "Ao vivo"`. | JÁ EXISTE — `usePageChrome([...], <header/>)` em `Painel.tsx` L36–48 |
| B1 | **Barra de status ao vivo** | Dot pulsante "Transmissão ao vivo" · 4 contadores (Normais/Atenção/Críticos/Offline) em Rajdhani 18px coloridos · timestamp `fmtDate — fmtTimeSec` do `simClock` à direita. | JÁ EXISTE — L52–63 |
| B2 | **Faixa de filtros** | Input de busca (ícone `Search`, placeholder "Filtrar ativos...") + chips de tipo (`TYPE_FILTERS`). | JÁ EXISTE — L65–79 |
| B3 | **Estado vazio** | Card "Nenhum ativo corresponde ao filtro." quando `filtered.length === 0`. | JÁ EXISTE — L81–85 |
| B4 | **Grid de ativos** | `grid grid-cols-5`; um card-botão por ativo filtrado. | JÁ EXISTE — L87–126 |
| B4.a | *Card › cabeçalho* | id mono (steel) + dot de status com glow. | JÁ EXISTE — L96–99 |
| B4.b | *Card › identidade* | nome (semibold) + área (slate). | JÁ EXISTE — L100–101 |
| B4.c | *Card › saúde* | label "Saúde" + valor % colorido por faixa + `Bar_`. | JÁ EXISTE — L102–106 |
| B4.d | *Card › tríade telemetria* | grid 3 col (Thermometer/Radio/Gauge) — só se online e com twin. | JÁ EXISTE — L107–120 |
| B4.e | *Card › conectividade* | `Wifi ao vivo` (verde) / `WifiOff Offline`. | JÁ EXISTE — L121–123 |
| B5 *(REFINAR)* | **Faixa de prioridade** | Tira fixa no topo com os 1–3 ativos mais críticos da frota (triagem), acima do grid. | NOVO — alimentado por ordenação de `views` por severidade/RUL |
| B6 *(REFINAR)* | **Visão List** | O toggle `list` existe no estado (`view`), mas **só o grid é renderizado**; não há ramo `view==="list"`. | LACUNA real — `Painel.tsx` L25/L88 |

---

## 6. Componentes principais

| Componente | Origem | Papel na tela | Refino proposto |
|---|---|---|---|
| `usePageChrome(crumbs, actions)` | `src/components/layout/chrome` | Injeta breadcrumb (hierarquia) e ações do header. | Breadcrumb deve refletir **escopo de hierarquia ativo** (planta/área selecionada), não rótulo fixo. |
| `IBtn` | `ui-shared/index.tsx` | Botão "Ao vivo" (refresh) e toggles. | "Ao vivo" deveria virar **toggle pausar/retomar stream** (ligado a `Settings.paused`), não um refresh decorativo. |
| `Bar_({v})` | `ui-shared` | Barra de saúde com cor por faixa (75/50). | Adicionar marcador do limite de atenção; tooltip com origem (Dicionário). |
| Dot de status | inline | Cor + glow por status. | Manter; padronizar via helper `corDoStatus` (já existe em `theme.ts`) em vez de map local `statusColor`. |
| `KPI` | `ui-shared` | **Não usado aqui** (é da tela 01). | Não trazer — manter o Painel granular, não agregado. |
| `Badge`/`SevBadge` | `ui-shared` | Não usados no card hoje. | Usar `Badge` para status textual no modo **List**; `SevBadge` na faixa de prioridade (B5). |
| Card-botão de ativo | inline (`<button onClick={navigate}>`) | Unidade de varredura + navegação. | Extrair para `<AssetCard>` reutilizável (Painel + Mapa + Ativos compartilham). |
| `useAssetViews()` / `statusCounts()` | `src/store/derive.ts` | Fonte derivada (Asset×Twin) + agregação. | Adicionar `byArea`/ordenação por severidade no `derive.ts` para B5 e filtro por área. |

---

## 7. Dados exibidos

| Dado | Origem real | Unidade / formato | Ancoragem no Dicionário | Estado |
|---|---|---|---|---|
| Contadores Normais/Atenção/Críticos/Offline | `statusCounts(views)` ← `twin.status` | inteiro, cor por status | status deriva das bandas de limite do Dicionário | JÁ EXISTE |
| Timestamp da frota | `simClock` via `fmtDate`/`fmtTimeSec` | `dd/mm/aaaa — hh:mm:ss` | relógio do motor de simulação | JÁ EXISTE |
| id do ativo | `a.id` | mono, steel | chave da Matriz de Hierarquia | JÁ EXISTE |
| Nome / Área | `a.nome` / `a.area` | texto | nó planta→área→ativo | JÁ EXISTE |
| Saúde | `a.saude` ← `twin.health` (0–100) | `%`, cor 75/50 | derivada de `damage` por modo (Weibull) | JÁ EXISTE |
| Temperatura | `a.twin.state.temp` | `°C` (`.toFixed(0)`) | tag `temp`, faixa/limite/direção | JÁ EXISTE (sem unidade visível) |
| Vibração | `a.twin.state.vib` | `mm/s` (`.toFixed(1)`) | tag `vib` | JÁ EXISTE (sem unidade) |
| Pressão | `a.twin.state.press` | `bar` (`.toFixed(1)`) | tag `press` | JÁ EXISTE (sem unidade) |
| Corrente (A) / RPM | `twin.state.corrente` / `.rpm` | `A` / `rpm` | tags `corrente`/`rpm` | **NÃO exibido — REFINAR (US-4)** |
| Conectividade | `a.status==="offline"` | "ao vivo" / "Offline" | fato operacional (`asset.offline`) | JÁ EXISTE |
| RUL / modo crítico | `twin.rulDias` / `twin.modoCritico` | dias / rótulo | predição (honestidade: modelo simulado) | **NÃO exibido — REFINAR** |
| Frescura do dado | `twin.syncedAt` | "há Ns" | última sync físico↔digital | **NÃO exibido — REFINAR** |

---

## 8. Ações do usuário

| Ação | Gatilho real | Resultado | Estado |
|---|---|---|---|
| Filtrar por texto | input `q` (`setQ`) | filtra por `nome`/`id` (case-insensitive) | JÁ EXISTE — L31–34 |
| Filtrar por tipo | chips `TYPE_FILTERS` (`setTypeF`) | aplica `TYPE_MATCH[typeF]` | JÁ EXISTE — L71–78 |
| Alternar grid/list | toggle `setView` | muda `view` — **mas list não renderiza** | JÁ EXISTE parcial (lacuna B6) |
| Abrir ativo | clique no card | `navigate('/ativos/:id/overview')` | JÁ EXISTE — L90 |
| "Ao vivo" / refresh | `IBtn` | hoje sem handler real (decorativo) | LACUNA — REFINAR p/ pausar stream |
| Filtrar pela contagem de status | — | **inexistente**; contadores não são clicáveis | REFINAR (B1 acionável) |
| Filtrar por área/hierarquia | — | inexistente; só tipo | REFINAR |
| Ação rápida no card (ver alerta / abrir assistente) | — | inexistente | REFINAR (gated por RBAC `Alertas`/`Assistente`) |

---

## 9. Relação com outras telas

- **→ Visão geral do ativo** (`/ativos/:id/overview`): destino primário do clique no card — é o salto *frota → ativo* (US-7 histórico). JÁ EXISTE.
- **↔ Dashboard / Visão da Frota** (tela 01): complementar — Dashboard agrega (KPIs, `fleetHealthTrend`, `alertsByDay`); Painel granulariza. Refino: alinhar paleta de status e permitir do KPI "Críticos" do Dashboard **saltar para o Painel já filtrado em Críticos**.
- **↔ Mapa / Gêmeo Digital**: o `<AssetCard>` extraído (§6) deve ser o mesmo átomo usado no Mapa; o dot de status deve ser idêntico ao do nó no mapa (coerência inter-módulo).
- **→ Alertas**: REFINAR — card crítico deve oferecer atalho ao(s) alerta(s) abertos do ativo (filtra a tela de Alertas por `assetId`).
- **→ Assistente**: REFINAR — "perguntar à IA sobre este ativo" abre o Assistente com contexto do `assetId` (US-12), gated por RBAC `Assistente`.

---

## 10. Relação com governança

- **Hierarquia (breadcrumb):** `Operação › Painel Operacional` é fixo hoje. REFINAR: o breadcrumb e o conjunto de ativos exibidos devem refletir o **escopo de hierarquia** do usuário (empresa→planta→área), e o filtro por área (§8) materializa a navegação governada.
- **Dicionário:** cada micro-leitura (temp/vib/press, e os futuros corrente/rpm) deve **rastrear ao Dicionário** — unidade, faixa, limite de alerta/crítico e direção de violação. Hoje o card mostra o número cru; refino: colorir o número quando se aproxima do `limiteAlerta`/`limiteCritico` da tag e expor a tag em tooltip. O próprio `twin.status` já nasce dessas bandas — o Painel deve tornar essa origem **visível**, não implícita.
- **RBAC (`can(modulo, nivel)`):** a rota é gated por `Dashboard`. As ações rápidas propostas (§8/§9) devem checar `Alertas`/`Assistente` antes de aparecer (`useCan`). Personas sem `read` em Telemetria não devem ver as micro-leituras.
- **Ciclo D-I-C-I:** ativos ainda não comissionados (status de artefato em Desenho/Instalação) deveriam ser **visualmente distintos** de um ativo operacional offline — hoje ambos caem em cinza/"Offline", confundindo *"sem dado por não estar instalado"* com *"queda de conexão"*.
- **Honestidade de IA:** ao trazer RUL/modo crítico ao card (§7), aplicar a **nota de honestidade** padrão — predição vem de modelo de degradação **simulado** (físico-informado + Weibull), não treinado em falhas reais (`src/engine/prediction.ts`).

---

## 11. Melhorias de UX/UI sobre o wireframe base

Crítica ancorada em `src/pages/Painel.tsx` (e dependências em `derive.ts`, `theme.ts`, `ui-shared`).

**P0 — Triagem: a frota não está priorizada.**
O grid renderiza `filtered` na **ordem do seed** (`useAssetViews()` → `assets.map`). Num telão, o ativo crítico pode estar no rodapé. *Refino:* ordenar por severidade do status e, em empate, por `twin.rulDias` ascendente; adicionar **faixa de prioridade fixa** (B5) com os 1–3 piores ativos em destaque (usar `SevBadge`). Impacto: ordenação nova em `derive.ts`; novo bloco antes do grid em `Painel.tsx` L88.

**P0 — A barra de status (B1) deve ser acionável.**
Os 4 contadores (`Painel.tsx` L56–61) são puramente informativos. *Refino:* torná-los **botões-filtro** (clicar "Críticos" filtra o grid; estado ativo destacado). Reaproveita o padrão visual dos chips de tipo (L71–78). Fecha o loop *ver número → ver os ativos por trás dele*.

**P0 — Modo List existe no estado mas não renderiza (bug de cobertura).**
`view` alterna entre `grid`/`list` (L25, L39–44) mas só há `grid grid-cols-5` (L88); `list` não tem ramo. *Refino:* implementar tabela densa (id · nome · área · status `Badge` · saúde `Bar_` · temp/vib/press/corrente/rpm · RUL · sync), ideal para frota grande e leitura por coluna. Sem isso, o toggle é um controle morto.

**P1 — US-4 incompleta: faltam Corrente (A) e RPM.**
A tríade do card (L107–120) só mostra temp/vib/press; `twin.state` carrega `corrente` e `rpm`. *Refino:* no grid, rotacionar/expandir para 5 leituras (ou priorizar por relevância ao `modoCritico`); no modo List, todas as colunas. **Exibir a unidade** (°C/mm/s/bar/A/rpm) — hoje os números são adimensionais, o que viola a ancoragem ao Dicionário.

**P1 — Números crus sem relação com o limite.**
As micro-leituras não indicam proximidade do limite — um `temp` de 78°C parece igual a um de 45°C. *Refino:* colorir o valor por banda do Dicionário (`limiteAlerta`/`limiteCritico`, respeitando `direcao`) e mini-marcador. Reforça que **todo número rastreia ao Dicionário**.

**P1 — Frescura e confiança do dado invisíveis.**
"ao vivo" (L121–123) é binário; não mostra **há quanto tempo** sincronizou (`twin.syncedAt`) nem o `residual` (sinal de anomalia do twin). *Refino:* badge "há Ns"; quando `syncedAt` envelhece, esmaecer o card (dado stale) — confiança como cidadão de 1ª classe. O `IBtn "Ao vivo"` (L46) deve virar **toggle real** de pausar/retomar o stream (`Settings.paused`), não refresh decorativo.

**P1 — Offline ≠ não-comissionado (governança D-I-C-I).**
`status==="offline"` some com a telemetria e cinza o card (L93/L107/L122), misturando *queda de conexão* com *ativo ainda não instalado*. *Refino:* estado visual próprio para artefatos pré-comissionamento (D/I), distinto de offline operacional.

**P2 — Densidade e hierarquia do card.**
`grid-cols-5` fixo (L88) não responde à largura; em telas largas desperdiça, em estreitas espreme. *Refino:* grid responsivo (`auto-fill, minmax`) e card com hierarquia mais firme — saúde+status no topo como âncora visual, telemetria secundária. Adicionar **sparkline** da saúde/temp (mini-histórico inline) entrega o "gráfico histórico" de US-7 sem exigir o clique.

**P2 — Reuso: extrair `<AssetCard>` e usar `corDoStatus`.**
O card é JSX inline em `Painel.tsx`; o `statusColor` local (L28) duplica `corDoStatus` de `theme.ts`. *Refino:* extrair `<AssetCard>` compartilhado (Painel/Mapa/Ativos) e consumir os helpers de `theme.ts` — coerência inter-módulo e menos drift visual.

**P2 — Ações rápidas no card (do ver ao agir), gated por RBAC.**
O card só navega para overview. *Refino:* hover/menu com "Ver alertas" (→ Alertas filtrado por `assetId`) e "Perguntar à IA" (→ Assistente com contexto, US-12), cada um condicionado por `useCan('Alertas')`/`useCan('Assistente')`.
