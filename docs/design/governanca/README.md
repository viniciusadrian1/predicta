# Governança do PREDICTA — Índice Mestre, Arquitetura e Backlog (FORZY)

> **Camada central do produto.** Este README é o índice executável das 6 telas de governança do Predicta e o contrato de arquitetura que as liga ao produto operacional. Voz de Lead Product Designer / Systems Designer / Information Architect sênior, ancorada no **código real** (`src/`). Cobre a US central **US-13** (governança de acessos/dados/rastreabilidade) e suas amarras a US-1…US-12.
>
> **As 6 specs** (leia em ordem):
> 1. [`01-visao-geral.md`](01-visao-geral.md) — Governança · Visão Geral (`/governanca` · `Overview.tsx`)
> 2. [`02-matriz-hierarquia.md`](02-matriz-hierarquia.md) — Matriz de Hierarquia (`/governanca/hierarquia` · `Hierarquia.tsx`)
> 3. [`03-dici.md`](03-dici.md) — D-I-C-I / DIKW + Ciclo do Ativo (`/governanca/dici` · `DICI.tsx`)
> 4. [`04-dicionario-rastreabilidade.md`](04-dicionario-rastreabilidade.md) — Dicionário de Rastreabilidade (`/governanca/dicionario` · `Dicionario.tsx`)
> 5. [`05-rastreabilidade-navegacao.md`](05-rastreabilidade-navegacao.md) — Navegação Governada (`/governanca/navegacao` — *proposta*)
> 6. [`06-rbac-permissoes.md`](06-rbac-permissoes.md) — RBAC / Permissões (`/governanca/rbac` · `RBAC.tsx`)
>
> Continuidade: alinhado a [`../00-governanca-espinha.md`](../00-governanca-espinha.md) — este documento **consolida e prioriza** o que aquela espinha abriu.

---

## 1. Visão de arquitetura — a Governança como camada central

A Governança do Predicta **não é um menu lateral de relatórios**: é a **camada de controle transversal** que define, para todo o resto do produto, *qual é a estrutura da planta, de onde vem cada número, quem pode ver/agir, e por onde se navega*. Operacionalmente, ela governa quatro eixos e os materializa em seis telas.

### 1.1 Os quatro eixos de governança × pilares da espinha

| Eixo governado | Pilar da espinha | Tela canônica | O que controla no produto operacional |
|---|---|---|---|
| **Estrutura industrial** | Pilar 1 — *breadcrumb = Matriz de Hierarquia* | `02` Hierarquia | A árvore `HTREE` dá **escopo, contexto e caminho** a Dashboard (contagens), Telemetria (escopo de gráfico), Ativos (`/ativos/:id`) e ao breadcrumb de toda tela. |
| **Fluxo do dado → decisão** | Pilar 2 — *todo número rastreia ao Dicionário* | `03` D-I-C-I/DIKW + `04` Dicionário | O Dicionário é a **fonte canônica de limites** que o motor (`evaluateAlerts`, `simulation.ts`) lê a cada tick; o DIKW expõe o caminho sensor→modelo→OS e a **procedência do modelo SIMULADO**. |
| **Acesso por perfil** | Pilar 3 — *toda ação é gated por RBAC* | `06` RBAC | A matriz `s.rbac` gateia Sidebar (`Sidebar.tsx:56`), rotas (`Gate`), e botões (`useCan`) — **reativamente**: mudar uma célula re-renderiza a navegação inteira. |
| **Navegação governada** | Pilar 4 — *navegação é governada por papel* | `05` Navegação + `01` Visão Geral | O grafo de telas (derivado de `routes.tsx`/`Sidebar.tsx`) provado navegável por papel; a Visão Geral é o hub-roteador. |

### 1.2 Como as 6 telas se compõem (mapa de composição)

```
                        ┌─────────────────────────────────────────────┐
                        │  01 · VISÃO GERAL  (/governanca)            │
                        │  cockpit executivo + hub-roteador           │
                        │  KPIs vivos de dici · cards-portal gated    │
                        └───┬─────────┬─────────┬─────────┬───────┬───┘
              drill ────────┘         │         │         │       └──────── drill
        ┌──────────────┐   ┌──────────▼──────┐  │  ┌──────▼──────┐  ┌────────▼────────┐
        │ 02 HIERARQUIA│   │ 03 D-I-C-I/DIKW │  │  │ 04 DICIONÁRIO│  │ 06 RBAC         │
        │ estrutura    │   │ fluxo do dado   │  │  │ tag→alerta   │  │ acesso/perfil   │
        │ HTREE        │   │ DIKW + Ciclo    │  │  │ SEED_DICTION.│  │ PERM/ROLES      │
        └──────┬───────┘   └────────┬────────┘  │  └──────┬──────┘  └────────┬────────┘
               │ pathToNode         │ procedência│         │ limites          │ permLevel
               │ (escopo herdado)   │ do modelo  │         │ efetivos         │ (gate global)
               └──────────┬─────────┴────────────┴─────────┴──────────────────┘
                          ▼
        ┌─────────────────────────────────────────────────────────────────────┐
        │ 05 · NAVEGAÇÃO GOVERNADA (/governanca/navegacao)  +  AUDITORIA       │
        │ grafo de telas (navGraph) · simulador de papel · matriz tela×US×RBAC │
        │ trilha auditLog transversal: toda escrita de governança vira evento  │
        └─────────────────────────────────────────────────────────────────────┘
```

**Leitura do mapa.** A Visão Geral (`01`) é o nó-pai e o roteador; ela **lê** o estado vivo (`s.dici`) e **despacha** para os quatro subsistemas de domínio (Hierarquia, DICI, Dicionário, RBAC). Esses quatro **escrevem** no store via ações centralizadas (`setHierarchy`/`setDici`/`upsertTag`/`removeTag`/`setRbac`, `useStore.ts:140-175`). A camada transversal (`05` + Auditoria) fecha o ciclo: **(a)** o grafo de navegação prova que cada percurso é alcançável e gated, e **(b)** a trilha `auditLog` registra cada escrita das outras cinco telas. Os dois eixos transversais da espinha — `pathToNode` (escopo herdado da Hierarquia) e `<TraceableValue>` (todo número → linha do Dicionário) — costuram tudo.

### 1.3 Conexão com o produto operacional (não é diagrama teórico)

| Tela de governança | Para onde a decisão sai (operação real) | Âncora no código |
|---|---|---|
| Hierarquia | nó `Ativo` → `/ativos/:id/overview`; `countByType` → contagens do Dashboard | `Hierarquia.tsx:55`, `derive.ts` |
| Dicionário | limite editado → **alerta nasce/resolve** no próximo tick em `/alertas` | `evaluateAlerts` (`simulation.ts:122-147`) |
| D-I-C-I/DIKW | estágio "Ação" → `recommendationsFor` → OS / `applyMaintenance` | `recommendations.ts:35`, `useStore.ts:151` |
| RBAC | célula ciclada → Sidebar/rotas/botões re-renderizam **na hora** | `useCan` (`rbac.ts:20`), `Sidebar.tsx:56` |
| Navegação | landing route, gating de URL, becos sem saída por papel | `routes.tsx`, `Sidebar.tsx` |
| Visão Geral | KPIs de conformidade derivam de `dici.flatMap` | `Overview.tsx:15-20` |

---

## 2. Matriz tela × user story (cobertura US-1…US-13)

`■` = cobertura primária/núcleo · `□` = cobertura de suporte/indireta · vazio = não cobre.

| Tela ＼ US | 1 modular | 2 amigável | 3 dado raw | 4 sensores | 5 OCR | 6 planta | 7 hist. | 8 baseline | 9 anomalia | 10 parada | 11 manut. | 12 assist. | **13 GOV.** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **01 Visão Geral** | □ | □ | □ | □ | | | | | | | | | **■** |
| **02 Hierarquia** | □ | □ | | □ | □ | ■ | □ | | | | | □ | **■** |
| **03 D-I-C-I/DIKW** | | □ | ■ | □ | □ | | □ | ■ | ■ | ■ | ■ | □ | **■** |
| **04 Dicionário** | | | ■ | ■ | □ | | □ | □ | □ | □ | □ | □ | **■** |
| **05 Navegação** | ■ | ■ | | | | □ | | | □ | □ | | □ | **■** |
| **06 RBAC** | ■ | □ | □ | | □ | | | □ | □ | □ | □ | ■ | **■** |
| **Cobertura** | 4 | 5 | 4 | 4 | 4 | 2 | 4 | 3 | 4 | 4 | 3 | 5 | **6** |

**Lacunas de cobertura visíveis (acionáveis):**
- **US-6 (planta baixa → artefato navegável)** tem a menor cobertura (2 telas): só Hierarquia (como destino estrutural) e Navegação (referência). O elo Mapa→Hierarquia precisa ser fechado.
- **US-13** é a única coberta como núcleo por **todas as 6 telas** — é, por construção, o assunto da camada.
- A **aba "Cobertura de US"** proposta no Dicionário (`04`) e a **faixa de cobertura** proposta na Visão Geral (`01`) tornam *esta própria matriz* um artefato vivo dentro do produto (`US_COVERAGE`/`SEED_TRACEABILITY`), fazendo a US-13 auto-rastreável.

---

## 3. Modelo de dados de governança proposto

### 3.1 O que o store JÁ sustenta (verificado em `useStore.ts`/`seed.ts`)

| Slice | Tipo | Origem (seed) | Ação de escrita |
|---|---|---|---|
| `hierarchy` | `HNode[]` (`{id,l,tp,kids}`) | `HTREE` (`seed.ts:105`) — **5 níveis** | `setHierarchy` (`:175`) |
| `dictionary` | `Tag[]` | `SEED_DICTIONARY` — 6 tags | `upsertTag`/`removeTag` (`:140,149`) |
| `dici` | `DiciRow[]` (`{id,nome,D,I,C,In}`) | `DICI`/`SEED_DICI` — 6 ativos × 4 células | `setDici` (`:173`) |
| `rbac` | `RbacMatrix` (`Record<papel,Record<modulo,nivel>>`) | `PERM` (`seed.ts:97`) — 5 papéis × 10 módulos | `setRbac` (`:174`) |
| `roles` / `modules` | `string[]` | `ROLES` / `MODS` (`seed.ts:95-96`) | (lidos dinamicamente) |
| `users` / `session` | `User[]` / `Session` | `SEED_USERS` | `setSession` (`:170`) |

> **Achado-chave de arquitetura:** as cinco ações de escrita de governança já estão **centralizadas** em `useStore.ts:140-175`, e tudo é persistido por `partialize` (`:188`). Isso torna a auditoria e o escopo **baratos de plugar** — basta envolver essas ações e estender o `partialize`. É o ponto de alavancagem do backlog inteiro.

### 3.2 Entidades NOVAS que a rastreabilidade/escopo/auditoria exigem

```ts
// ── AUDITORIA (transversal — habilita a tela /governanca/auditoria) ──────────
interface AuditEvent {
  id: string; ts: number;
  actor: { userId: number | null; nome: string | null };        // de s.session
  modulo: "RBAC" | "Dicionario" | "DICI" | "Hierarquia" | "Escopo" | "Navegacao";
  entidade: string;                                              // ex.: "Técnico Manutenção · Cadastro"
  acao: "permissao_alterada" | "limite_alterado" | "status_ciclado"
      | "no_adicionado" | "no_removido" | "escopo_alterado" | "usuario_criado";
  de: string; para: string;                                      // "none" → "full"
}

// ── ESCOPO (habilita tenancy multi-planta/cliente — herda de HTREE) ──────────
type ScopeKind = "global" | "planta" | "linha" | "cliente";
interface RbacScope { kind: ScopeKind; ids: string[] }           // ids de nós de hierarchy / clienteId
type ScopeMatrix = Record<string /*papel*/, RbacScope>;          // default { kind:"global", ids:[] }

// ── RASTREABILIDADE DE PRODUTO (US ↔ módulo ↔ tela ↔ componente) ─────────────
interface TraceLink {
  us: `US-${number}`; requisito: string;
  modulo: string;     rota: string;     componente: string;      // de routes.tsx
  tags?: string[];    modelos?: string[];
}

// ── GRAFO DE NAVEGAÇÃO (deixa de ser tácito) ─────────────────────────────────
interface NavEdge { from: string; to: string; trigger: string; modulo: string }
interface NavNode { id: string; rota: string; componente: string; modulo: string; us: string[] }

// ── SETTINGS de governança (tira strings fixas do código) ────────────────────
interface GovSettings { metaConformidade: number }               // hoje "95%" hardcoded
```

### 3.3 Relações (modelo entidade-relação da camada)

```
   ROLE ──(PERM)── MODULE        ROLE ──(ScopeMatrix)── HNode/cliente
     │                              │
   USER ──tem──► ROLE          HNode(Ativo) ─id─ Asset ─tem─ Tag ──(RULE)──► Alert ──► Action(OS)
                                    │                  │
                                 DiciRow            ML Model (SIMULADO)
                                    │
   ── toda escrita (setRbac/upsertTag/setDici/setHierarchy/setScope) ──► AuditEvent
   ── todo nó/rota ──► NavNode ──(NavEdge: trigger)──► NavNode  (pintado por permLevel)
   ── todo número exibido ──(TraceableValue)──► Tag (linha do Dicionário)
```

### 3.4 Impacto consolidado no código

| Arquivo | Mudança | Telas que destrava |
|---|---|---|
| `src/store/useStore.ts` | slices `auditLog`, `scopes`, `govSettings`; wrapper `logAudit` nas 5 ações; estender `partialize` (`:188`) e `version` (`:183`) | todas |
| `src/data/seed.ts` | criar papéis `Admin Forzy`/`TI-Governança`/`Usuário Cliente` em `ROLES`/`PERM`/`SEED_USERS`; estender `HTREE` p/ 8 níveis; `Asset.clienteId?` | 01,02,06 |
| `src/lib/types.ts` | `AuditEvent`, `RbacScope`/`ScopeMatrix`, `TraceLink`, `NavEdge`/`NavNode`, `GovSettings` | todas |
| `src/auth/rbac.ts` | `canScoped(...)` cruzando `pathToNode`; `firstAllowedRoute(rbac,papel)` | 05,06 |
| `src/store/derive.ts` | `pathToNode(hierarchy,id)`; `nodeMeta(id)` (junção asset/twin/alerts/dici) | 01,02 |
| `src/data/traceability.ts` *(novo)* | `SEED_TRACEABILITY` / `US_COVERAGE` | 01,04 |
| `src/data/navGraph.ts` *(novo)* | `nodes`+`edges` derivados de `routes.tsx`+`Sidebar.tsx` + teste de fumaça | 05 |
| `src/components/governanca/*` *(novos)* | `AuditTrail`, `NodeMetaPanel`, `TagTraceCard`, `TraceableValue`, selo de procedência do modelo | 02,03,04,06 |
| `src/routes.tsx` | montar `RequireAuth`; rota `/governanca/auditoria` e `/governanca/navegacao`; `Gate` em `/mapa` e telemetria; landing dinâmico | 05,06 |

---

## 4. Backlog consolidado (priorizado)

Consolidação das **§9 das 6 telas**, sem redundância (itens repetidos foram fundidos — ver coluna "telas"). Prioridade P0 (corrige furo de governança/dado falso) → P2 (polimento). Esforço: B(aixo)/M(édio)/A(lto).

### 4.1 Tema — Auditoria / Conformidade

| # | Item | Pri | Esf | Arquivo | Telas |
|---|---|:--:|:--:|---|---|
| A1 | **Slice `auditLog` + `logAudit` envolvendo as 5 ações** (`setRbac`/`setDici`/`upsertTag`/`removeTag`/`setHierarchy`) — captura quem/quando/de→para | **P0** | M | `useStore.ts:140-175`, `lib/types.ts` | 02,03,04,06 |
| A2 | **Tela/rota `/governanca/auditoria`** (tabela filtrável + CSV) e card "Auditoria" da Visão Geral apontando para ela (hoje placeholder → Dicionário) | **P0** | M | `Auditoria.tsx`(novo), `Overview.tsx:37`, `routes.tsx` | 01,05 |
| A3 | Componente `AuditTrail.tsx` + bloco "últimas 10 mudanças" embutido no RBAC/Dicionário | P1 | M | `components/governanca/AuditTrail.tsx` | 04,06 |
| A4 | Derivar **"Conformidade por Planta"** de `hierarchy × assets × dici` (eliminar hardcode) | **P0** | M | `Overview.tsx:56-59` | 01 |

### 4.2 Tema — RBAC / Escopo

| # | Item | Pri | Esf | Arquivo | Telas |
|---|---|:--:|:--:|---|---|
| R1 | **Montar `RequireAuth` nas rotas** (existe, não montado — app não força login) | **P0** | B | `routes.tsx` | 06 |
| R2 | **Reconciliar papéis**: criar `Admin Forzy`/`TI-Governança`/`Usuário Cliente`; banner de papel órfão/morto | **P0** | M | `seed.ts:95-103`, `RBAC.tsx` | 01,02,03,04,05,06 |
| R3 | Gatear card RBAC da Visão Geral com `useCan("RBAC","read")` (esmaecer + `Lock`) | **P0** | B | `Overview.tsx` | 01 |
| R4 | **Escopo por planta/linha/cliente** (`ScopeMatrix` + `canScoped` cruzando `pathToNode`) — tenancy B2B | P1 | A | `rbac.ts`, `useStore.ts`, `seed.ts` | 06 |
| R5 | Ativar CRUD de usuários/papéis (botões inertes) + step-up ao conceder `RBAC:full` | P1 | A | `RBAC.tsx` | 06 |
| R6 | Catálogo de **Ações Críticas** (`criticalActions.ts`) ligando RBAC ao motor | P1 | M | `RBAC.tsx`, `auth/criticalActions.ts` | 06 |
| R7 | KPI "Acessos críticos" = usuários com `RBAC:full`, drill p/ RBAC filtrado | P1 | B | `Overview.tsx` | 01 |
| R8 | Busca/filtro funcional de usuários e papéis na matriz | P2 | B | `RBAC.tsx` | 06 |
| R9 | Selo auto-governança + proteção do último Admin (`RBAC:full`) | P2 | B | `RBAC.tsx`, `useStore.ts` | 06 |

### 4.3 Tema — Hierarquia / Estrutura

| # | Item | Pri | Esf | Arquivo | Telas |
|---|---|:--:|:--:|---|---|
| H1 | **`pathToNode(hierarchy,id)`** → breadcrumb-matriz navegável c/ escopo herdado (Espinha 1) | **P0** | M | `store/derive.ts`, `chrome.tsx`, `ui-shared/index.tsx` | 02,05 |
| H2 | **Estender `HTREE` p/ 8 níveis** (Linha/Célula/Sensor/Evento) populando Sensor de `SEED_DICTIONARY` e Evento de `ALERTS` | **P0** | M | `seed.ts`, `Hierarquia.tsx:14,37-38` | 02 |
| H3 | **Painel de Metadados do nó** (`NodeMetaPanel`) cruzando id × asset/twin/alerts/dici | **P0** | M | `Hierarquia.tsx`, `components/governanca/NodeMetaPanel.tsx`, `derive.ts` | 02 |
| H4 | Vínculos do nó "clicar leva à operação" (Dashboard/Telemetria/Alertas/Saúde IA/Assistente) gated por RBAC do destino | P1 | M | `Hierarquia.tsx`, `NodeMetaPanel.tsx` | 02 |
| H5 | Busca funcional que filtra e auto-expande o caminho dos matches | P1 | B | `Hierarquia.tsx:104` | 02 |
| H6 | Validação no remove p/ impedir órfãos (twin vivo/alertas abertos) | P1 | M | `Hierarquia.tsx:48` | 02 |
| H7 | Badges de status + mini-DiciBadge inline no nó; exportar árvore; empty-state de raiz | P2 | B | `Hierarquia.tsx:88,114` | 02 |

### 4.4 Tema — Rastreabilidade / Dicionário / DIKW

| # | Item | Pri | Esf | Arquivo | Telas |
|---|---|:--:|:--:|---|---|
| T1 | **`TagTraceCard`**: visualizar cadeia tag→limite→regra→alerta→ativo→perfil (origem do dado→decisão) | **P0** | M | `components/governanca/TagTraceCard.tsx`, `Dicionario.tsx` | 04 |
| T2 | **Limite EFETIVO por ativo** (join `dictionary × asset.limites`) — resolve falso-positivo da Corrente | **P0** | B | `Dicionario.tsx`, `seed.ts:164-167` | 04 |
| T3 | **Aba Fluxo (DIKW)**: diagrama D→I→C→In com números vivos do twin, cada estágio abre a função real | **P0** | A | `DICI.tsx`, `prediction.ts`, `recommendations.ts` | 03 |
| T4 | **Selo de procedência do modelo SIMULADO** (`predictionModel.name/.metodo`) — componente compartilhado c/ Saúde IA | **P0** | B | `prediction.ts`, `ui-shared/index.tsx` | 03,04 |
| T5 | Desambiguar "D-I-C-I": rotular tabela atual como "Ciclo do Ativo" + DIKW oficial, 2 abas, **sem renomear a chave `dici`** | **P0** | A | `DICI.tsx`, `seed.ts`, `lib/types.ts` | 03 |
| T6 | `<TraceableValue>` transversal: número→linha do Dicionário (Telemetria/Alertas/Ativos/DIKW) | P1 | M | `components/governanca/TraceableValue.tsx`, `Dicionario.tsx` | 03,04 |
| T7 | Busca funcional + filtros (ativo/perfil/origem) no Dicionário | P1 | B | `Dicionario.tsx:52-56` | 04 |
| T8 | Aba/manifesto **Cobertura de US** (`SEED_TRACEABILITY`) + faixa de cobertura na Visão Geral | P1 | M | `data/traceability.ts`(novo), `Dicionario.tsx`, `Overview.tsx` | 01,04 |
| T9 | Deep-links operacionais por estágio DIKW (Dado→Telemetria, Conhec.→Saúde IA, Ação→Alertas/OS) | P1 | M | `DICI.tsx`, `routes.tsx` | 03 |
| T10 | Avisar alertas/ativos órfãos ao remover tag | P1 | B | `Dicionario.tsx` (guard `removeTag`) | 04 |
| T11 | Anexo + responsável + data por célula do Ciclo do Ativo | P1 | A | `lib/types.ts`, `DICI.tsx` | 03 |
| T12 | Validação de coerência de limites (faixa e direção) | P2 | B | `Dicionario.tsx:22-28` | 04 |
| T13 | Ativo recém-cadastrado nasce com linha no Ciclo do Ativo (D=pendente) | P2 | B | `pages/cadastro`, `useStore.ts` | 03 |

### 4.5 Tema — Navegação Governada

| # | Item | Pri | Esf | Arquivo | Telas |
|---|---|:--:|:--:|---|---|
| N1 | **`src/data/navGraph.ts`** (nodes de `routes.tsx` + edges) com teste de fumaça casando toda rota e todo `NAV.to` | **P0** | M | `data/navGraph.ts`(novo), `routes.tsx`, `Sidebar.tsx` | 05 |
| N2 | **Corrigir landing route órfão**: `/`→`/dashboard` mas Operador tem `Dashboard:none` → `firstAllowedRoute(rbac,papel)` | **P0** | B | `routes.tsx:49,86`, `rbac.ts` | 05 |
| N3 | **Reconciliar "visível no menu" × "rota protegida"**: `/mapa` e telemetria têm módulo no Sidebar mas sem `<Gate>` na rota | **P0** | B | `routes.tsx:61,76`, `Sidebar.tsx` | 05 |
| N4 | Breadcrumb navegável: `chrome.tsx` de `string[]` → `BreadcrumbNode[]{label,to}` | P1 | M | `chrome.tsx`, `ui-shared/index.tsx` | 05 |
| N5 | Simulador "Navegação Governada" como auditoria exportável (alcançáveis/bloqueadas/órfãs por papel) | P1 | M | `pages/governanca`(nova), `rbac.ts` | 05 |
| N6 | Clusters do grafo = módulos contratados; módulos `none`-p/-todos apagados c/ CTA de upsell (US-1) | P2 | B | `navGraph.ts`, `seed.ts` | 05 |

### 4.6 Tema — Visualização / Polimento

| # | Item | Pri | Esf | Arquivo | Telas |
|---|---|:--:|:--:|---|---|
| V1 | Bloco "Saúde da Governança" derivado (Hierarquia `countByType`, Permissões full/read/none + papel morto, Rastreab. `dictionary.length`) | P1 | M | `Overview.tsx` | 01 |
| V2 | Matriz RBAC como heatmap de cobertura + diff de dois papéis | P1 | M | `RBAC.tsx` | 06 |
| V3 | KPIs/barras clicáveis com drill p/ D-I-C-I filtrado por status/planta | P2 | M | `Overview.tsx` | 01 |
| V4 | Empty-states explícitos (DICI vazio, ambas abas DIKW) + meta de conformidade vinda de `settings` | P2 | B | `Overview.tsx`, `DICI.tsx`, `useStore.ts` | 01,03 |

**Resumo:** **52 melhorias** consolidadas — **17 P0**, **22 P1**, **13 P2**.

---

## 5. Próximos passos — o que implementar primeiro no código real

A ordem abaixo maximiza desbloqueio com mínimo de retrabalho: **fundações de store primeiro**, depois telas que delas dependem.

### Sprint 0 — Fundações de governança (destrava quase tudo)
1. **R1 — Montar `RequireAuth`** (`routes.tsx`). *Esforço B, risco alto se ausente:* sem isso o RBAC é decorativo. **Faça primeiro.**
2. **A1 — `auditLog` + `logAudit`** envolvendo as 5 ações em `useStore.ts:140-175`. Habilita A2/A3 e satisfaz a §9 P0 de 4 telas de uma vez.
3. **R2 — Reconciliar papéis** em `seed.ts` (`ROLES`/`PERM`/`SEED_USERS`). A matriz "cresce sozinha" (store lê `roles`/`modules` dinâmico), então é barato e desbloqueia as personas obrigatórias.
4. **H1 — `pathToNode`** em `derive.ts`. É o maior ganho transversal (breadcrumb-matriz, escopo, NodeMetaPanel).

### Sprint 1 — Tornar a governança visível (matar dado falso)
5. **A4 — Conformidade por Planta derivada** + **R3 — gatear card RBAC** + **A2 — rota `/governanca/auditoria`** (consome A1). Fecha a Visão Geral honesta.
6. **T2 — limite efetivo por ativo** + **T1 — `TagTraceCard`**. Torna o Dicionário a matriz que o nome promete.
7. **H3 — `NodeMetaPanel`** (consome H1). A Hierarquia deixa de "terminar onde a operação começa".

### Sprint 2 — Fluxo do dado e navegação como dado
8. **T4 — selo de procedência do modelo SIMULADO** (componente compartilhado) + **T5/T3 — abas Ciclo do Ativo + Fluxo DIKW**. Expõe a honestidade da IA no ponto exato.
9. **N1 — `navGraph.ts`** + teste de fumaça, depois **N2/N3** (landing dinâmico + reconciliar Gate). Fecha os furos de acesso por URL.

### Depois (estrutural, mais caro)
10. **H2 — `HTREE` 8 níveis**, **R4 — escopo/tenancy**, **R5 — CRUD de usuários/papéis**, **T6 — `<TraceableValue>` transversal**, **N5 — simulador exportável**.

> **Critério de pronto da camada:** todo número de governança rastreia a uma fonte do store; todo card leva a um destino real e gated; toda escrita gera um `AuditEvent`; todo percurso é provado alcançável por papel; e a honestidade do modelo SIMULADO está visível onde a IA decide. Quando esses cinco invariantes valerem, a Governança deixa de "parecer" central e **é** central.
