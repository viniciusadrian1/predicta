# Auditoria de Coerência entre Módulos — PREDICTA / FORZY

> Documento de governança de design. Produto: **PREDICTA** (FORZY).
> Insumo: as 14 especificações de tela em `docs/design/telas/01..14`.
> Objetivo do usuário: **aumentar a coerência entre módulos** — um único sistema, não 14 telas que se parecem.
> Convenção: **Inconsistência observada** (entre as specs/código) → **Regra/padrão único proposto** → **Arquivos/componentes a tocar**.
> Princípio diretor: cada padrão vira **um componente compartilhado em `src/components/ui-shared/index.tsx`** (ou helper em `src/lib`/`src/store`), consumido por todas as telas, em vez de reimplementado por tela.

---

## Sumário executivo — inconsistências críticas (P0)

As nove dívidas transversais mais graves, que aparecem repetidas em ≥3 telas e quebram a percepção de "produto único":

1. **Breadcrumb sem hierarquia real.** Todas as 14 telas usam `usePageChrome` com rótulos fixos/encurtados (`["Ativos","Lista de Ativos", asset.id]`); nenhuma projeta a cadeia `empresa → planta → área → sistema → ativo`. A "espinha de governança" é prometida em §10 de cada spec e cumprida em zero.
2. **Padrão único de output de IA inexistente como componente.** Saúde & IA, Alertas, Assistente, Dashboard, Mapa, Telemetria e ambos os Cadastros pedem o mesmo bloco "valor + horizonte + confiança + explicação + nota de honestidade" — e cada um propõe criá-lo do zero. A nota de honestidade hoje vive como prosa no system prompt (Assistente) ou texto solto (Saúde & IA), invisível ou divergente nas demais.
3. **RBAC não aplicado uniformemente.** Assistente (telas 10/11) e Mapa (14) **não chamam `useCan` nem `<Gate>`**; o Assistente cria OS sem checar `Alertas:full`. Outras telas gateiam só a rota, não as ações de linha (`Eye`/`MoreHorizontal`/OS).
4. **`AVAIL` (Disponibilidade) é heurística por status apresentada como fato medido** no Dashboard (01) e no header do ativo (04/05/06) — quebra "todo número rastreia ao Dicionário".
5. **Filtros decorativos / botões mortos** repetidos: `<select>` sem `onChange` (Lista de Ativos 03), "Filtrar" sem handler (Mapa 14), `RefreshCw`/"Atualizar"/"Ao vivo" sem `onClick` (Dashboard 01, Telemetria 05, Painel 02), paginação fake (03).
6. **Export CSV ignora o filtro ativo** em ≥3 telas (Alertas 08, Lista de Ativos 03, e o `exportar()` que manda `views`/`alerts` cru) — o usuário exporta a base inteira, não "o que vê".
7. **`Badge` usa cores via classe interpolada quebrada** (`bg-[${C.green}]/10`) enquanto `SevBadge` usa classes estáticas — duas gramáticas de cor de status no mesmo arquivo `ui-shared`.
8. **Card de ativo / dot de status reimplementado por tela** (Painel 02, Mapa 14, Lista 03) com `statusColor` local duplicando `corDoStatus` de `theme.ts`.
9. **Taxonomia de severidade divergente:** o histórico do Dashboard funde "médio+baixo" (3 categorias) enquanto a pizza usa 4; os KPIs de Alertas chamam "Médios" o que agrega médio+baixo. Números "não fecham" entre blocos.

---

## Eixo (a) — Nomenclatura e terminologia

**Inconsistências observadas**

| Conceito | Nomes/formas divergentes entre telas | Onde |
|---|---|---|
| Identificador do ativo | "Tag", "TAG", "ID", "Tag/ID", "Identificador" | 03 (Tag), 04/05 (TAG), 13 (Tag/Identificador) |
| Saúde projetada por IA | "Projeção IA", "Projeção/baseline esperado", "Saúde Real vs Projeção", "linha p" | 01, 05, 06 |
| RUL | "RUL", "Próx. Manut.", "Remaining Useful Life", "RUL (dias)" | 03/06 (RUL), 04 (Próx. Manut. derivado de RUL×0.35), 06 |
| Origem do alerta | "origem", "Método", "Origem & Rastreabilidade" | 08, 09 |
| Disponibilidade | "Disponibilidade Média", "Disponib.", "AVAIL" | 01, 04, 05, 06 |
| Nota de honestidade | "nota de honestidade", "disclaimer", "selo de honestidade", "modelo simulado" | todas as de IA, com fraseado diferente |
| Severidade vs Criticidade | usados como sinônimos em alguns trechos | 03 (criticidade do ativo) vs 08 (severidade do alerta) — conceitos distintos, precisam glossário |

**Regra / padrão único proposto**

- **Glossário canônico** (uma fonte): `TAG` (identidade na Matriz), `Saúde` (0–100, `twin.health`), `RUL` (sempre "RUL", nunca "Próx. Manut." como sinônimo — "Próx. Manut." é a *data derivada*, rotular como tal), `Criticidade` (atributo do ativo, `SevBadge`-like laranja/âmbar) ≠ `Severidade` (atributo do alerta).
- **"Projeção IA"** como rótulo único para a curva extrapolada; **"Baseline"** reservado para a banda esperada por variável (US-8). Nunca misturar.
- **Frase de honestidade única e literal**, constante exportada: *"Predição de modelo de degradação simulado (físico-informado + Weibull) — não treinado em falhas reais."*

**Arquivos a tocar**

- `src/lib/glossario.ts` (novo) — constantes `LABELS`, `HONESTY_NOTE`, `TAG_LABEL`/`TAG_UNIT` consolidados (hoje espalhados em `telemetry.ts` e literais).
- `src/lib/format.ts` — helpers de rótulo de RUL/Próx. Manut.
- Consumido em: `Dashboard.tsx`, `AtivoDetail.tsx`, `SaudeIA.tsx`, `AlertasLista.tsx`, `AlertaDetalhe.tsx`, `Assistente.tsx`, `MapaPlanta.tsx`.

---

## Eixo (b) — Breadcrumb e hierarquia

**Inconsistências observadas**

| Tela | Breadcrumb atual | Problema |
|---|---|---|
| 01 Dashboard | `["Operação","Dashboard"]` | fixo, ignora escopo do papel |
| 02 Painel | `["Operação","Painel Operacional"]` | fixo |
| 03 Lista | `["Ativos","Lista de Ativos"]` | fixo |
| 04–07 Ativo | `["Ativos","Lista de Ativos", asset.id]` | encurtado: pula planta→área→sistema |
| 08/09 Alertas | `["Alertas","Lista de Alertas", al.id]` | sem hierarquia do ativo de origem |
| 10/11 Assistente | `["Assistente","Contexto: BCP-01"]` | string, não trilha |
| 14 Mapa | `["Ativos","Mapa da Planta"]` | fixo, layout não deriva do `HTREE` |

Nenhuma tela projeta `empresa → planta → área → sistema → ativo`, apesar de todas declararem em §10 que deveriam.

**Regra / padrão único proposto**

- **Helper `trilhaHierarquia(assetId)`** que retorna o array `[empresa, planta, área, sistema, TAG]` lido do `HTREE`/`SEED_HIERARCHY`, e um `trilhaEscopo(papel)` para telas de frota (Dashboard/Painel/Mapa/Alertas), que reflete a subárvore autorizada (`Operação › Planta Sul › Dashboard`).
- `usePageChrome` passa a **receber sempre uma trilha derivada da Matriz**, nunca literais. O componente `BC` (já em `ui-shared`) renderiza igual — só muda a fonte dos itens.
- Telas de detalhe de alerta/assistente herdam a trilha do **ativo de origem**.

**Arquivos a tocar**

- `src/store/derive.ts` — `trilhaHierarquia` / `trilhaEscopo` (a partir de `HTREE`).
- `src/components/layout/chrome.tsx` — `usePageChrome` aceitar trilha derivada.
- Todas as 14 páginas — trocar o array literal pela chamada ao helper.

---

## Eixo (c) — Badges de severidade / status / criticidade

**Inconsistências observadas**

- **`Badge` (status) usa classes interpoladas quebradas:** `bg-[${C.green}]/10 text-[${C.green}]` — Tailwind não gera classes dinâmicas em runtime, então o estado `normal` provavelmente não pinta como os demais (que usam classes estáticas `yellow-400`/`red-400`). `SevBadge` usa só classes estáticas. **Duas gramáticas no mesmo arquivo.** (`ui-shared/index.tsx:12-14` vs `:34-38`).
- **`em_analise`**: o `Badge` já tem a chave (âmbar), mas specs 08/09 dizem "falta variante âmbar para em_analise" — ou seja, as specs não sabem que já existe. Sinal de drift spec↔código.
- **Criticidade** (`corDaCriticidade` em `theme.ts`) não tem badge próprio; specs 03/07 pedem "SevBadge-like" para criticidade, mas `SevBadge` é de severidade de alerta (4 níveis diferentes: critico/alto/medio/baixo).
- **Cor de status do ativo** aparece como: `Badge` (texto), dot inline com glow (Painel 02), `sc` map (Mapa 14), `corDoStatus` (theme). Quatro implementações.

**Regra / padrão único proposto**

| Eixo semântico | Componente único | Cores (paleta C) |
|---|---|---|
| Status do ativo (normal/atenção/crítico/offline) | `Badge s={status}` | green/yellow/red/slate |
| Severidade do alerta (critico/alto/medio/baixo) | `SevBadge s={sev}` | red/orange/yellow/slate |
| Status do ciclo (aprovado/em_revisao/pendente) | `Badge` (já cobre) | emerald/yellow/slate |
| Criticidade do ativo (Crítica/Alta/Média/Baixa) | **`CritBadge` (novo)** | orange/orange/yellow/slate via `corDaCriticidade` |
| Dot de status (mapa/painel/cards) | **`StatusDot` (novo)** | `corDoStatus` |

- **Corrigir `Badge`** para usar classes estáticas (mapa explícito por chave, como `SevBadge`) — eliminar a interpolação `bg-[${...}]`.
- **Toda cor de status sai de `corDoStatus`/`corDaSaude`/`corDaCriticidade`** (`theme.ts`); proibir maps locais (`statusColor`, `sc`, `sevColor`).

**Arquivos a tocar**

- `src/components/ui-shared/index.tsx` — corrigir `Badge`; adicionar `CritBadge`, `StatusDot`.
- `src/lib/theme.ts` — já tem os helpers; centralizar.
- `MapaPlanta.tsx` (`sc`), `Painel.tsx` (`statusColor`), `AlertaDetalhe.tsx` (`SEV_COLOR`) — consumir helpers/componentes.

---

## Eixo (d) — Filtros e busca (gramática única)

**Inconsistências observadas**

| Tela | Busca | Filtros | Estado |
|---|---|---|---|
| 03 Lista de Ativos | `q` por nome/id (placeholder promete "área") | 3 `<select>` **decorativos** `.slice(0,3)`, "Filtros" inerte, paginação fake | quebrado |
| 02 Painel | `q` por nome/id | chips de tipo (funcional), contadores **não clicáveis** | parcial |
| 08 Alertas | `q` por título/assetId | selects severidade+status (funcionais), KPI **não clicável**, sem filtro origem/área | parcial |
| 14 Mapa | — | "Filtrar" inerte, legenda/contadores **não clicáveis** | quebrado |

Cada tela inventa sua própria barra; nenhuma compartilha o padrão de **filtro hierárquico encadeado** (planta→área→sistema) que as três (03/08/14) deveriam ter.

**Regra / padrão único proposto**

- **Componente `<FilterBar>`** com gramática única: `busca` (debounced) + **filtros hierárquicos encadeados** (Planta → Área → Sistema, default = escopo do papel) + **chips multi-seleção** (status/severidade/origem/tipo) + **chips de filtro ativo removíveis** + seletor de ordenação.
- **KPIs e contadores são sempre clicáveis = filtros** (clicar "Críticos" filtra a tabela/canvas). Padrão único entre Dashboard, Painel, Alertas, Mapa.
- **Export sempre respeita o resultado filtrado** (`filtered`/`data`), nunca a base crua.

**Arquivos a tocar**

- `src/components/ui-shared/FilterBar.tsx` (novo) + `useHierarchyFilter` hook em `src/store/hooks.ts`.
- `AtivosLista.tsx`, `Painel.tsx`, `AlertasLista.tsx`, `MapaPlanta.tsx`.
- `src/lib/csv.ts` callers — passar a coleção filtrada.

---

## Eixo (e) — Cabeçalho e sistema de abas do ativo

**Inconsistências observadas**

- O header de ativo + 5 abas vive em `AtivoDetail.tsx` e é herdado por Overview/Telemetria/Saúde/Gêmeo/Técnico — **bom**. Mas cada aba define seus **próprios `SH`, grids e tratamento de "sem twin"**: Overview imprime "Ativo offline — sem telemetria ao vivo"; Telemetria imprime "Ativo offline — sem telemetria."; Saúde tem outro guard. Três frases, três layouts para o mesmo estado.
- **KPI "Disponib." do header** é heurística `AVAIL` apresentada como medida (04/05/06), inconsistente com a regra de rastreabilidade.
- `modoCritico` aparece no radar (Overview) mas não no header, embora todas as abas o consumam.

**Regra / padrão único proposto**

- **Wrapper `<AtivoTab>`** que centraliza: guard de `twin` (empty-state único e estruturado), `SH` base, grid base. Telemetria/Saúde/Gêmeo/Técnico herdam a mesma malha.
- **Header de ativo padronizado** em duas linhas: (1) identidade — ícone, nome, TAG, `Badge` status, `modoCritico`, selo D-I-C-I; (2) "stat strip" de KPIs **rastreáveis** (Saúde, RUL, e Disponibilidade só se derivada de uptime real ou rotulada "estimativa").
- **Empty-state offline único** (`<TwinOffline asset={...}/>`) com último valor conhecido + idade de `syncedAt` + CTA de diagnóstico.

**Arquivos a tocar**

- `src/pages/AtivoDetail.tsx` — header em stat-strip; expor `modoCritico`.
- `src/components/ui-shared/AtivoTab.tsx` + `TwinOffline.tsx` (novos).
- `Overview.tsx`, `Telemetria.tsx`, `SaudeIA.tsx`, `GemeoDigital.tsx`, `Tecnico.tsx` — adotar o wrapper.

---

## Eixo (f) — Estados loading / empty / error / realtime / sem-permissão

**Inconsistências observadas**

| Estado | Tratamento por tela | Divergência |
|---|---|---|
| **Empty** | tabela fantasma (03), frase única (04/05), neutro (08), inexistente (14) | sem componente comum |
| **Offline / sem twin** | 3 frases diferentes (04/05/06) | ver eixo (e) |
| **Realtime** | dot `animate-pulse` (02), "ao vivo"/"Offline" (03), badge (05) | sinal de "vivo" não padronizado |
| **Sem-permissão** | rota `<Gate>` em algumas; Assistente/Mapa **sem gate**; ações de linha sem gating | ver eixo (h) |
| **Error** | Assistente injeta "⚠️ " na bolha; OCR faixa vermelha; demais não tratam | sem padrão |
| **Frescura do dado** | `syncedAt` quase nunca exibido (02/03/05 pedem) | invisível |

**Regra / padrão único proposto**

- **Família de componentes de estado** em `ui-shared`: `<EmptyState>` (ícone + título + descrição + CTA), `<ErrorState>` (tipo de erro + retry), `<NoPermission modulo=>` (mensagem honesta), `<LiveDot syncedAt=>` (pulso + "há Ns", esmaece quando stale), `<TwinOffline>`.
- **Distinguir sempre** "filtro sem resultado" de "estado saudável/vazio positivo" (Alertas: fila zerada = verde) e "offline" de "janela sem dados" (Telemetria) de "não comissionado" (D-I-C-I).

**Arquivos a tocar**

- `src/components/ui-shared/states.tsx` (novo) — os 5 componentes.
- Todas as páginas com tabela/lista/canvas: 01, 03, 05, 08, 14 e abas de ativo.

---

## Eixo (g) — Padrão único de output de IA

**Inconsistências observadas**

- **Sete telas** pedem o mesmo bloco e cada uma propõe criá-lo: Dashboard (Projeção IA), Telemetria (overlay baseline), Saúde & IA (`ConfidenceTag`+`ExplainabilityList`+`HonestyNote`), Alertas lista (linha de confiança), Alerta detalhe (`PredictionPanel`), Assistente (`AssistantCard`), Mapa (tooltip de IA), Cadastros (predição inicial).
- A **nota de honestidade** tem fraseado diferente em cada lugar; no Assistente vive só no system prompt (invisível); em Saúde & IA é texto; nas demais está ausente.
- **Recomendações + ficha do modelo estão duplicadas** entre `SaudeIA.tsx` e `GemeoDigital.tsx` com divergências (a nota de Gêmeo cita `PredictionModel`, a de Saúde não).
- **Confiança** quase nunca é exposta; o horizonte é hardcoded "21d" em vários pontos.

**Regra / padrão único proposto**

- **`<AIOutput>`** (envelope canônico) com sub-componentes obrigatórios: `valor + janela/horizonte` (seletor `HORIZONS` de `prediction.ts`, nunca constante) + **`<ConfidenceTag>`** (derivada honestamente de `twin.residual` + dispersão Weibull, sem inventar acurácia) + **`<ExplainabilityList>`** (variáveis dominantes: `modoCritico`, `residual`) + **`<HonestyNote>`** (frase única do glossário, eixo (a)).
- **`<RecommendationCard>`** e **`<ModelCard>`** únicos, com Δ-RUL pré-calculado (migrar `recEffect` de Gêmeo), consumidos por Saúde & IA, Gêmeo, Alerta detalhe e Assistente.
- Aplicar o mesmo envelope em: curva do Dashboard, overlay de Telemetria, banner de Saúde & IA, linha-modelo de Alertas, painel de Alerta detalhe, cards do Assistente, tooltip do Mapa.

**Arquivos a tocar**

- `src/components/ui-shared/ai/` (novo): `AIOutput.tsx`, `ConfidenceTag.tsx`, `ExplainabilityList.tsx`, `HonestyNote.tsx`, `RecommendationCard.tsx`, `ModelCard.tsx`.
- `src/engine/prediction.ts` — expor `confianca` derivada e `HORIZONS` (já existe).
- `SaudeIA.tsx`, `GemeoDigital.tsx`, `AlertaDetalhe.tsx`, `AlertasLista.tsx`, `Assistente.tsx`, `Dashboard.tsx`, `Telemetria.tsx`, `MapaPlanta.tsx`.

---

## Eixo (h) — Navegação governada e RBAC

**Inconsistências observadas**

| Tela | Gate de rota | Gating de ação | Lacuna |
|---|---|---|---|
| 10/11 Assistente | **ausente** (`routes.tsx` 71-72 sem `<Gate>`) | `create_work_order`/`list_alerts` sem `can()` | **crítica** — cria OS e lê frota sem permissão |
| 14 Mapa | **ausente** (`useCan('Mapa')` não chamado) | Exportar sem gate | crítica |
| 04 Ativo | rota ok | `IBtn` OS e "Ver alerta" sem `useCan` | média |
| 06 Saúde & IA | rota ok | botão "Registrar manutenção" (`applyMaintenance`, escrita) sem gate | crítica |
| 03 Lista | rota ok | "Novo Ativo" gated; menu de linha sem gating | baixa |
| 01 Dashboard | rota ok | atalhos B5/B6 levam a destinos sem checar permissão do destino | baixa |

Telas com gate correto (Alertas 08/09, Cadastro 12, OCR 13) coexistem com telas sem nenhum gate — RBAC aplicado "às vezes".

**Regra / padrão único proposto**

- **Toda rota de módulo envolta em `<Gate modulo=>`** (incluir Assistente e Mapa em `routes.tsx`).
- **Toda ação de escrita gated por `useCan(modulo,"full")`**; em `read`, renderizar estado desabilitado + tooltip de permissão (nunca esconder silenciosamente sem feedback quando é uma ação esperada).
- **Atalhos respeitam o RBAC do destino** (Dashboard/Painel/Lista atenuam cards cujo destino o papel não pode abrir).
- **`executeTool` (Assistente) consulta `can()` por ferramenta** antes de executar; nega com mensagem honesta.

**Arquivos a tocar**

- `src/routes.tsx` — `<Gate>` em Assistente e Mapa.
- `src/ai/tools.ts` — gate por ferramenta em `executeTool`.
- `src/components/ui-shared/GatedButton.tsx` (novo) — botão que já encapsula `useCan` + estado desabilitado + tooltip.
- `SaudeIA.tsx`, `AtivoDetail.tsx`, `MapaPlanta.tsx`, `Dashboard.tsx`, `Painel.tsx`, `AtivosLista.tsx`.

---

## Eixo (i) — Tokens e tipografia

**Inconsistências observadas**

- **Tipografia bem padronizada na intenção** (Rajdhani números/títulos, JetBrains Mono dados/tags, Inter corpo) e refletida em `ui-shared` (`KPI` usa Rajdhani, `Badge`/`BC` usam JetBrains Mono). Porém:
  - **Unidades hardcoded** em labels (`"Temperatura (°C)"` cravado em `Telemetria.tsx`) em vez de `TAG_UNIT`/Dicionário — número sem unidade no Painel (02) e cards do Assistente.
  - **`Badge` interpola hex em classe Tailwind** (eixo c) — token aplicado de forma que pode não renderizar.
  - **Cores de status reimplementadas** por tela (`statusColor`, `sc`, `sevColor`) em vez de `theme.ts`.
  - **Alturas de gráfico fixas** (110–155px) e `grid-cols-N` fixos (Painel `grid-cols-5`, Mapa `grid-cols-4`) — não responsivos, divergentes entre telas.

**Regra / padrão único proposto**

- **Toda unidade vem do Dicionário** (`TAG_UNIT`/`tag.un`), nunca literal. Todo número numérico em Rajdhani; toda tag/dado mono em JetBrains; corpo em Inter — aplicado via classes utilitárias compartilhadas (`.num`, `.mono`, `.body`) ou wrappers `<Num>`/`<Mono>`.
- **Zero hex fora de `theme.ts`**; zero cor de status fora de `corDoStatus`/`corDaSaude`/`corDaCriticidade`.
- **Grids responsivos** padronizados (`auto-fill, minmax`) e alturas de gráfico por token, não literais por tela.

**Arquivos a tocar**

- `src/lib/theme.ts` (tokens de altura/grid) + `src/lib/telemetry.ts` (`TAG_UNIT`/`TAG_LABEL` como fonte única).
- `src/components/ui-shared/index.tsx` — `<Num>`/`<Mono>` helpers; corrigir `Badge`.
- `Telemetria.tsx`, `Painel.tsx`, `Assistente.tsx`, `MapaPlanta.tsx`.

---

## Mapa de componentes compartilhados a extrair (consolidação)

| Componente novo | Resolve eixo(s) | Substitui (hoje espalhado em) |
|---|---|---|
| `HONESTY_NOTE` + `LABELS` (`lib/glossario.ts`) | a, g | frases soltas em 6 telas |
| `trilhaHierarquia` / `trilhaEscopo` (`derive.ts`) | b | breadcrumbs literais em 14 telas |
| `Badge` corrigido + `CritBadge` + `StatusDot` | c, i | `Badge` quebrado, `statusColor`, `sc`, `sevColor` |
| `<FilterBar>` + `useHierarchyFilter` | d | selects decorativos (03), "Filtrar" inerte (14), KPIs passivos (01/08) |
| `<AtivoTab>` + `<TwinOffline>` | e, f | guards de twin divergentes (04/05/06) |
| `states.tsx` (`EmptyState`/`ErrorState`/`NoPermission`/`LiveDot`) | f | empty/error ad-hoc em todas |
| `ui-shared/ai/*` (`AIOutput`/`ConfidenceTag`/`ExplainabilityList`/`HonestyNote`/`RecommendationCard`/`ModelCard`) | g | duplicação Saúde↔Gêmeo, ausência nas demais |
| `<Gate>` em todas as rotas + `executeTool` gated + `<GatedButton>` | h | Assistente/Mapa sem gate |
| `<AssetCard>` + `<PlantCanvas>` | c, d, i | card inline (02), svg inline (14) |

---

## Prioridização

- **P0 (governança / credibilidade):** RBAC no Assistente e Mapa (h); padrão único de IA + nota de honestidade (g); breadcrumb hierárquico (b); corrigir `Badge` e centralizar cores de status (c); `AVAIL` rotulado como estimativa (a/e).
- **P1 (coerência operacional):** `<FilterBar>` hierárquica e KPIs clicáveis (d); `<AtivoTab>`/empty-states (e/f); export respeita filtro (d); unidades do Dicionário (i).
- **P2 (polimento):** `<AssetCard>`/`<PlantCanvas>` reutilizáveis; grids responsivos; sincronização cruzada mapa↔lista; persistência de conversa.
