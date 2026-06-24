## BLOCO 6 — Camada de governança do produto

> **Tese central.** No PREDICTA a governança **não é um item de menu** — é a **espinha ambiente** que dá estrutura, procedência, acesso e navegabilidade a *todas* as telas. Cobre a **US-13** (governança de acessos/dados/rastreabilidade) e é o habilitador transversal de US-1…US-12. Este bloco descreve, de forma **aplicada e ancorada no código real** (`src/`), como os quatro pilares — Matriz de Hierarquia, D-I-C-I/DIKW, Dicionário de Rastreabilidade e RBAC — já existem no produto e como se fecham em camada de controle única. Cada afirmação separa **"já existe"** (funcional no repositório) de **"refinar"** (proposta priorizada).

---

### 6.1 A governança como camada central — quatro eixos, seis telas

A governança do Predicta governa **quatro eixos do produto** e os materializa em **seis telas**, mas seu valor é estar presente *fora* delas — em cada breadcrumb, cada número e cada botão do produto operacional.

| Eixo governado | Pilar da espinha | Tela canônica | O que controla na operação | Âncora no código |
|---|---|---|---|---|
| **Estrutura industrial** | P1 — *breadcrumb = Matriz de Hierarquia* | `02` Hierarquia | escopo, contexto e caminho de Dashboard (contagens), Telemetria, Ativos (`/ativos/:id`) e do breadcrumb de toda tela | `HTREE` (`seed.ts:105`), `setHierarchy` (`useStore.ts:175`) |
| **Fluxo do dado → decisão** | P2 — *todo número rastreia ao Dicionário* | `03` D-I-C-I/DIKW + `04` Dicionário | o Dicionário é a fonte canônica de limites que o motor lê a cada tick; o DIKW expõe o caminho sensor→modelo→OS e a procedência do modelo SIMULADO | `evaluateAlerts` (`simulation.ts:122-147`), `SEED_DICTIONARY` |
| **Acesso por perfil** | P3 — *toda ação é gated por RBAC* | `06` RBAC | a matriz `s.rbac` gateia Sidebar, rotas (`Gate`) e botões (`useCan`) — reativamente | `useCan`/`permLevel` (`rbac.ts:20`), `Sidebar.tsx:56` |
| **Navegação governada** | P4 — *navegação é governada por papel* | `05` Navegação + `01` Visão Geral | o grafo de telas provado navegável por papel; a Visão Geral é o hub-roteador | `routes.tsx`, `Sidebar.tsx` |

**Mapa de composição das 6 telas.** A Visão Geral (`01`) é o nó-pai e roteador: **lê** o estado vivo (`s.dici`) e **despacha** para os quatro subsistemas. Esses quatro **escrevem** no store via cinco ações centralizadas (`setHierarchy`/`setDici`/`upsertTag`/`removeTag`/`setRbac`, `useStore.ts:140-175`). A camada transversal (`05` Navegação + Auditoria) fecha o ciclo: prova que cada percurso é alcançável e gated, e registra cada escrita.

```
                    ┌──────────────────────────────────────────────┐
                    │  01 · VISÃO GERAL (/governanca)              │
                    │  cockpit executivo + hub-roteador            │
                    │  KPIs vivos de dici · cards-portal gated     │
                    └──┬───────┬────────┬────────┬─────────────────┘
            drill ─────┘       │        │        └──────── drill
        ┌────────────┐ ┌───────▼─────┐ ┌▼──────────┐ ┌──────────▼──┐
        │02 HIERARQUIA│ │03 DICI/DIKW │ │04 DICIONÁ.│ │06 RBAC      │
        │ HTREE      │ │ DIKW+Ciclo  │ │ tag→alerta│ │ PERM/ROLES  │
        └─────┬──────┘ └──────┬──────┘ └────┬──────┘ └──────┬──────┘
              │pathToNode     │procedência   │limites        │permLevel
              └──────────┬────┴──────────────┴───────────────┘
                         ▼
        ┌────────────────────────────────────────────────────────┐
        │ 05 · NAVEGAÇÃO GOVERNADA + AUDITORIA                   │
        │ grafo de telas (navGraph) · simulador de papel        │
        │ trilha auditLog: toda escrita de governança vira evento│
        └────────────────────────────────────────────────────────┘
```

Os **dois eixos transversais** da espinha costuram tudo: `pathToNode` (escopo herdado da Hierarquia) e `<TraceableValue>` (todo número → linha do Dicionário).

---

### 6.2 Pilar 1 — Matriz de Hierarquia (o breadcrumb É a espinha)

**Job.** Manter a árvore de ativos canônica **empresa → planta → área → sistema → ativo** que dá escopo e contexto a TODA navegação. Não é uma tela de organograma: é a fonte do **breadcrumb-matriz** e a base do **escopo por papel**.

**JÁ EXISTE (funcional).**
- Árvore editável e persistida (`HTREE`/`SEED_HIERARCHY` em `seed.ts:105`), com `addChildTo`/`renameIn`/`removeFrom`/`countByType` como funções puras (`Hierarquia.tsx`).
- `CHILD_TYPE` impõe a **gramática** da hierarquia (Empresa→Planta→Área→Sistema→Ativo).
- Edição gated por `useCan("Governança","full")`; nó tipo `Ativo` navega a `/ativos/:id/overview`.
- O breadcrumb já existe, mas **estático por tela**: cada página publica `usePageChrome(["Governança","Hierarquia"])` (`chrome.tsx:35`), renderizado pelo `BC` (`ui-shared/index.tsx:90`) como `string[]` com `ChevronRight`.

**REFINAR (a maior lacuna transversal).** Materializar o breadcrumb como a **Matriz de Hierarquia completa e navegável**:

| O quê | Como | Esforço |
|---|---|---|
| `pathToNode(hierarchy, assetId): HNode[]` | helper em `derive.ts` que espelha a recursão já em `Hierarquia.tsx` | **P0** · M |
| `bc: string[]` → `bc: BreadcrumbNode[]` (`{id,label,tp,to}`) | `chrome.tsx` aceita nós ricos; `BC` ganha `onClick`/`to` | **P0** · M |
| `NodeMetaPanel` (id × asset/twin/alerts/dici) | painel de metadados que cruza o nó com a operação | **P0** · M |

**Impacto concreto.** Numa tela de ativo (`/ativos/BCP-01/overview`), o breadcrumb deve ler **Forzy Indústria S.A. › Planta Norte › Bombeamento › Sistema de Recalque #1 › Bomba BCP-01 › Visão Geral** — cada segmento clicável, definindo um **escopo herdado** que Dashboard, Alertas e Telemetria respeitam. Assim a Hierarquia deixa de "terminar onde a operação começa": cada nó tem destino operacional gated pelo RBAC do destino. Estende-se ainda `HTREE` para 8 níveis (Linha/Célula/Sensor/Evento), populando Sensor de `SEED_DICTIONARY` e Evento de `SEED_ALERTS` (H2, P0).

---

### 6.3 Pilar 2 — D-I-C-I: a decisão de produto (DIKW oficial × Ciclo do Ativo)

Existe uma **colisão de significados** sobre a sigla "D-I-C-I" que esta camada **resolve em vez de esconder**.

| Sigla | Leitura | Estado | Papel na governança |
|---|---|---|---|
| **D-I-C-I (DIKW)** — *pedido* | **D**ado → **I**nformação → **C**onhecimento → **I**nteligência/Ação | **não existe ainda** | rastreabilidade do **fluxo do dado** sensor→modelo→decisão |
| **D-I-C-I (documental)** — *implementado* | **D**esenho · **I**nstalação · **C**omissionamento · **I**nspeção | `DICI.tsx`, `DICI`/`SEED_DICI` (`seed.ts:77`), `setDici` (`useStore.ts:173`) | ciclo de vida **documental** do ativo (conformidade) |

**Decisão (reconciliação "duas visões, um módulo").**
1. **Promover a pirâmide DIKW** como o **D-I-C-I oficial** da governança — *"Da Leitura à Decisão"* — porque é o que rastreia o fluxo do dado até a OS (US-13).
2. **Renomear** o artefato implementado para **"Ciclo do Ativo"** (mantém tabela, edição, KPIs e CSV intactos).
3. Apresentá-las como **duas abas** do mesmo módulo `/governanca/dici` (segmented control); default = **Fluxo (DIKW)**.

**A pirâmide DIKW mapeada às camadas reais do motor** (cada estágio é um ponteiro para uma função real — é o "índice executável do motor"):

| Estágio | Domínio industrial | Função real | Saída | Procedência |
|---|---|---|---|---|
| **D — Dado** | leitura raw do sensor (V/A/RPM/°C/bar/%óleo) | `readingFromState()` (`model.ts:72`) | `TelemetrySample` | sensor físico (tag no Dicionário) |
| **I — Informação** | telemetria + baseline + limites | `baseTemp/Vib/...` (`model.ts:47-61`) + Dicionário + `evaluateAlerts` | série + desvio vs. baseline | Dicionário (engenharia define) |
| **C — Conhecimento** | saúde, anomalia, modo crítico, **RUL** | `healthFromDamage`/`worstMode`/`computeRUL`/`failureCurve` (`prediction.ts:39,56`) | health, status, modoCritico, RUL, probFalha | **Modelo SIMULADO** (selo) |
| **In — Inteligência/Ação** | recomendação → OS → manutenção planejada | `recommendationsFor()` (`recommendations.ts:35`) → `applyMaintenance` | `Recommendation{acao,motivo,prazoDias,pri}` → OS | Técnico executa + Gestor planeja |

> **Honestidade da IA (obrigatória).** A transição **C → In** depende de um **modelo de degradação SIMULADO** — *"Predicta Digital Twin Engine v1 · físico-informado + Weibull"* (`prediction.ts:62-63`), **não treinado em falhas reais**. A interface `PredictionModel` (`prediction.ts:25`) permite plugar um modelo treinado — quando isso ocorrer, **o selo troca sozinho**. O nó "Conhecimento" carrega o selo `predictionModel.name`/`.metodo`, reutilizado como **componente único** em Saúde&IA, Gêmeo, Dashboard, Alertas-modelo e OCR.

**Impacto no código (DICI.tsx / seed / store) — o que tocar e o que NÃO tocar:**

| Arquivo | Mudança | Esforço |
|---|---|---|
| `DICI.tsx` | extrair tabela atual p/ `<CicloDoAtivo/>`; criar `<FluxoDIKW/>`; wrapper 2 abas; trocar banner (`DICI.tsx:40`) | A |
| `seed.ts` | **NÃO renomear** `DICI`/`SEED_DICI`/`DiciRow` — só o **rótulo de UI** muda | B |
| `useStore.ts` | `setDici` permanece; nova slice opcional p/ auditar saltos | B |
| `lib/types.ts` | `DiciRow` permanece; **adicionar** `DikwStage`/`StageEvidence` | B |

> **Risco a evitar:** renomear a chave `dici` no store/seed quebraria `Overview.tsx` (KPIs derivam de `dici.flatMap(...)`) e a persistência (`partialize`). A desambiguação é **só de rótulo/UI**, preservando identificadores internos.

---

### 6.4 Pilar 2 (cont.) — Dicionário de Rastreabilidade (tag → alerta, `<TraceableValue>`)

**Job.** Ser a **fonte canônica de verdade dos limites** que governam os alertas do motor — e o destino de rastreabilidade de todo número exibido no produto.

**JÁ EXISTE e está acoplado ao motor.** `SEED_DICTIONARY` define por grandeza: `campo, un, faixaMin/Max, limiteAlerta, limiteCritico, direcao, sensor, ativo`. O motor (`evaluateAlerts`, `simulation.ts:122-147`) lê **exatamente** esses campos (com override por ativo via `asset.limites?.[tag.key]`) a cada tick (1s). **Editar um limite aqui faz um alerta nascer/resolver no próximo ciclo** — tempo real é o coração desta tela. `upsertTag`/`removeTag` (`useStore.ts:140,149`) mutam o store; degradação por permissão já aplicada (`full` edita inputs; `read` vê `<span>` + selo `Lock`).

**A cadeia tag → alerta (a "rota de ouro", US-9 → US-12), instanciada com dados reais do seed:**

| Elo | Valor real | Âncora |
|---|---|---|
| Tag | `TAG-002 vib` · Acelerômetro MEMS · alerta 4.5 / crít 7.1 mm/s · `direcao:"acima"` | `SEED_DICTIONARY` (`seed.ts:132`) |
| Modo/Modelo | `rolamento` (TWIN_SEED `ME-07`); twin SIMULADO calcula health/RUL/probFalha | `TAG_OF_MODE`, `prediction.ts` |
| Regra | `breachCrit = v >= 7.1` → `severidade:"critico"`, `RULE_TITLE.vib` | `simulation.ts:127,135` |
| Alerta (seed) | **ALT-2025-0847** · `ME-07` · "Vibração Crítica Detectada" · `tag:"vib"` | `SEED_ALERTS` (`seed.ts:265`) |
| Ação | ack / resolver / `applyMaintenance(ME-07,"rolamento")` → OS | `recommendations.ts` |
| Perfil | `Técnico Manutenção` (`Alertas:full`) executa; `Operador` só vê (`read`) | `PERM` (`seed.ts:100`) |

**REFINAR.**
- **`<TraceableValue tagKey="temp" value={82} />`** (P0/P1) — componente transversal único que renderiza o número e, ao hover/click, abre a **linha do Dicionário** (campo, unidade, faixa, limite alerta/crítico, direção, sensor) + link a `/governanca/dicionario`. Fecha a espinha "todo número rastreia ao Dicionário", reusado em Telemetria, Alertas, Ativos e na aba Fluxo DIKW. Hoje a rastreabilidade do número→Dicionário **não é inspecionável na UI**.
- **`TagTraceCard`** (P0) — visualiza a cadeia tag→limite→regra→alerta→ativo→perfil, derivada de `RULE_TITLE`/`TAG_OF_MODE`.
- **Limite EFETIVO por ativo** (P0) — join `dictionary × asset.limites`; resolve o **falso-positivo da Corrente** (`TAG-004`: o Dicionário mostra 50/53 A genérico, mas o motor usa override escalado ao FLA, `seed.ts:164-167`; sem a coluna, um auditor conclui que a Turbina de 25 MW vive em sobrecorrente).

---

### 6.5 Pilar 4 — Dicionário de Rastreabilidade e Navegação (grafo + navegação governada)

A rastreabilidade só vira governança quando é **navegável dos dois lados** (subir até a US, descer até a ação/perfil) e **governada por papel**.

**Cadeia canônica (forma normal do grafo):**

```
US-n ─cobre─▶ REQUISITO ─realiza─▶ MÓDULO (MODS) ─expõe─▶ TELA/ROTA (routes.tsx)
                                       │                        │ renderiza
                                  Gate modulo=…            COMPONENTE (src/pages/…)
                                       │ gateado-por PERM       │ lê/escreve
                                  PERFIL (ROLES) ◀─executa─ AÇÃO/RECOMENDAÇÃO
                                       ▲                        ▲ deriva-de
                   SENSOR/TAG ─limite─▶ MODELO ML ─prevê─▶ ALERTA ─aciona─┘
                  (SEED_DICTIONARY)  (prediction.ts)  (evaluateAlerts)
```

O grafo **já existe espalhado e tácito** no motor/seed/roteador: o mesmo `tag.key` percorre `twin.state[tag.key]` → `Alert.tag` → `TAG_OF_MODE[modo]`; o mesmo `modulo` percorre rota → `Gate` → `PERM` → Sidebar → perfil; o mesmo `assetId` percorre `HTREE` → twin → alerta → tela. Faltam dois artefatos para torná-lo **dado de 1ª classe**:

| Artefato (a criar) | O quê | Esforço |
|---|---|---|
| `src/data/traceability.ts` | `TRACE_NODES`/`TRACE_EDGES` (`US`/`Req`/`Modulo`/`Tela`/`Tag`/`Modelo`/`Alerta`/`Acao`/`Perfil`) + `US_COVERAGE`; teste de fumaça casa toda rota↔nó, todo `tag.key`↔aresta, todo módulo↔`PERM` | **P0** · M |
| `src/data/navGraph.ts` | `NavNode`+`NavEdge` derivados de `routes.tsx`+`Sidebar.tsx`; teste casa toda rota e todo `NAV.to` | **P0** · M |

**Interações canônicas (subir/descer a cadeia):** clicar numa US acende toda a cadeia descendente; clicar num alerta sobe até a US e desce até ação+perfis; `<TraceableValue>` abre a linha do Dicionário; **simular papel** re-pinta o grafo (`permLevel(rbac,papel,modulo)` sem login) — nós alcançáveis acendem (cobalto `full`/âmbar `read`), gated escurecem com selo `Lock`. Assim "controle de acesso" (conceito) vira "alcance navegável" (mapa pintado).

**Furos de navegação governada a fechar (P0):**

| Gap | Detalhe | Correção |
|---|---|---|
| `RequireAuth` não montado | existe (`RequireAuth.tsx:11`) mas `routes.tsx` usa só `Gate` → app não força login | envolver o `AppShell` com `<RequireAuth>` |
| Landing órfão | `/`→`/dashboard` mas `Operador.Dashboard="none"` (`seed.ts:102`) → cai em tela que não vê | `firstAllowedRoute(rbac,papel)` no index |
| Menu × rota divergente | `/mapa` e `/ativos/:id/telemetria` têm módulo no Sidebar mas **sem `<Gate>`** (`routes.tsx:61,76`) → URL direta fura o RBAC | adicionar `<Gate modulo="Mapa"/"Telemetria">` |

---

### 6.6 Pilar 3 — RBAC / Permissões (matriz, escopo, ações críticas, auditoria)

**Job.** Definir **quem acessa o quê** (papel × módulo, níveis `none < read < full`) — o gate de toda rota, ação e dado.

**JÁ EXISTE e é robusto.** Matriz `papel × módulo` editável (clique cicla `none→read→full`, `setRbac` em `useStore.ts:174`); **aplicação reativa imediata** (`useCan` é seletor Zustand — mudar uma célula re-renderiza Sidebar e guards na hora); `Gate` renderiza "Acesso negado"; auto-governança (`canEdit = useCan("RBAC","full")`); sessão real com expiração (`useAuth.ts`). O store lê `roles`/`modules` **dinamicamente** — a matriz "cresce sozinha" ao adicionar papéis no seed.

**Matriz `PERM` real (snapshot, `seed.ts:97-103`):**

| Papel \ Módulo | Dash | Ativos | Telem | Alertas | Assist | Cadastro | OCR | Mapa | Govern | RBAC |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Gerente Industrial | full | full | full | full | full | full | full | full | full | **full** |
| Eng. Confiabilidade | full | full | full | full | full | full | full | full | read | none |
| Técnico Manutenção | read | read | read | **full** | **full** | none | none | read | none | none |
| Analista de Dados | read | read | **full** | read | read | none | none | none | **full** | none |
| Operador Campo | none | read | none | read | none | none | none | read | none | none |

> **Concentração de privilégio:** `Gerente Industrial` é `full` em 10/10 e **único** com `RBAC:full` — é o "Administrador Forzy" de fato (auto-governança). É o KPI de governança mais sensível.

**Reconciliação de personas (P0).** As 5 personas obrigatórias **não** mapeiam 1:1 a `ROLES` (papel sem linha em `PERM` cai em `none`, fail-safe porém silencioso):

| Persona obrigatória | Papel real hoje | Ação |
|---|---|---|
| **Administrador Forzy** | de fato `Gerente Industrial` | **criar** `Admin Forzy` (`full` em tudo incl. RBAC) |
| **TI/Governança** | recai em `Analista de Dados` | **criar** dedicado (Governança/Auditoria `full`, RBAC `read` — separação de função) |
| **Usuário cliente** | não existe | **criar** `Usuário Cliente` (`read` em Dash/Ativos/Alertas/Mapa, **escopado ao cliente**) |
| **Técnico de manutenção** | `Técnico Manutenção` ✓ | manter |
| **Gestor industrial** | `Gerente Industrial` ✓ | **rebaixar** `RBAC:full`→`read` ao criar `Admin Forzy` |

**Escopo proposto por planta/linha/cliente (P1 — tenancy B2B, hoje inexistente).** `permLevel(rbac,papel,modulo)` (`rbac.ts:10`) é **global**: um `Ativos:full` vale para todas as plantas. Proposta de escopo herdado da Hierarquia:

```ts
type ScopeKind = "global" | "planta" | "linha" | "cliente";
interface RbacScope { kind: ScopeKind; ids: string[] }      // ids de nós da hierarchy / clienteId
type ScopeMatrix = Record<string /*papel*/, RbacScope>;     // default { kind:"global" }
```

| Papel | Escopo | Efeito |
|---|---|---|
| Admin Forzy / Gerente Industrial | `global` | vê todas as plantas |
| Técnico Manutenção | `planta:["PLT-N"]` | só Planta Norte (`HTREE` ids) |
| Usuário Cliente | `cliente:["CLI-…"]` | só ativos do seu cliente (exige `Asset.clienteId?`) |

Impacto: `canScoped(...)` em `rbac.ts` cruza o nível com `pathToNode(hierarchy, assetId)` — se o caminho do ativo não intersecta `scope.ids`, retorna `none`; consumidores de lista de ativos (Ativos/Dashboard/Mapa/Alertas) filtram por escopo.

**Ações críticas (exigem `full` + auditoria) — catálogo proposto `auth/criticalActions.ts`:**

| Ação crítica | Nível mínimo | Por que crítica | Auditoria |
|---|---|---|---|
| Ciclar célula RBAC | `RBAC:full` | concede/retira acesso | obrigatória |
| Conceder `RBAC:full` | `Admin Forzy` | cria novo administrador | obrigatória **+ step-up** |
| Editar limite no Dicionário | `Governança:full` | altera alarmística do motor (`evaluateAlerts`) | obrigatória (segurança operacional) |
| Alterar escopo planta/cliente | `Admin Forzy` | expande/restringe universo visível | obrigatória |
| Remover ativo / nó | `Cadastro/Governança:full` | quebra rastreabilidade | obrigatória |
| Criar/inativar usuário | `RBAC:full` | muda quem entra | obrigatória |

> **GAP P0 transversal mais crítico:** hoje `applyMaintenance`, criar OS, registrar manutenção e ações de alerta **NÃO passam por `can()`/`useCan()`** — ações de **escrita** não são gated. Fechar isso (cruzando o catálogo de ações críticas acima ao motor) é o P0 de governança número um (US-13).

---

### 6.7 Trilha de auditoria (a maior lacuna — P0 global)

Hoje **nenhuma** mutação de governança é registrada: `setRbac`/`setDici`/`upsertTag`/`removeTag`/`setHierarchy` mutam o store sem log de quem/quando/de→para. O card "Auditoria" do Overview (`Overview.tsx:37`) é placeholder que aponta ao Dicionário.

**Proposta mínima e aderente à arquitetura existente** (as 5 ações já estão centralizadas em `useStore.ts:140-175` — ponto de alavancagem):

```ts
interface AuditEvent {
  id: string; ts: number;
  actor: { userId: number|null; nome: string|null };        // de s.session
  modulo: "RBAC"|"Dicionario"|"DICI"|"Hierarquia"|"Escopo"|"Navegacao";
  entidade: string;                                          // ex.: "Técnico Manutenção · Cadastro"
  acao: "permissao_alterada"|"limite_alterado"|"status_ciclado"
      | "no_adicionado"|"no_removido"|"escopo_alterado"|"usuario_criado";
  de: string; para: string;                                  // "none" → "full"
}
```

Um único wrapper `logAudit(evt)` envolve as 5 ações; nova slice `auditLog: AuditEvent[]` + estender `partialize`; tela `/governanca/auditoria` (tabela filtrável + CSV via `downloadCSV`). Eventos mais críticos: **limite no Dicionário** e **célula RBAC** (afetam alarmística e acesso).

---

### 6.8 Modelo de dados de governança (consolidado)

**O que o store JÁ sustenta** (verificado em `useStore.ts`/`seed.ts`):

| Slice | Tipo | Origem (seed) | Ação de escrita |
|---|---|---|---|
| `hierarchy` | `HNode[]` (`{id,l,tp,kids}`) | `HTREE` (`seed.ts:105`) — 5 níveis | `setHierarchy` (`:175`) |
| `dictionary` | `Tag[]` | `SEED_DICTIONARY` — 6 tags | `upsertTag`/`removeTag` (`:140,149`) |
| `dici` | `DiciRow[]` (`{id,nome,D,I,C,In}`) | `DICI`/`SEED_DICI` — 6 ativos × 4 células | `setDici` (`:173`) |
| `rbac` | `RbacMatrix` (`Record<papel,Record<modulo,nivel>>`) | `PERM` (`seed.ts:97`) — 5×10 | `setRbac` (`:174`) |
| `roles`/`modules` | `string[]` | `ROLES`/`MODS` (`seed.ts:95-96`) | lidos dinamicamente |
| `users`/`session` | `User[]`/`Session` | `SEED_USERS` | `setSession` (`:170`) |

**Entidades NOVAS** que rastreabilidade/escopo/auditoria exigem: `AuditEvent` (§6.7), `RbacScope`/`ScopeMatrix` (§6.6), `TraceLink`/`TRACE_NODES`/`TRACE_EDGES` (§6.5), `NavNode`/`NavEdge` (§6.5), `GovSettings { metaConformidade }` (tira o "95%" hardcoded do código).

**Relações (modelo entidade-relação da camada):**

```
   ROLE ──(PERM)── MODULE        ROLE ──(ScopeMatrix)── HNode/cliente
     │                              │
   USER ──tem──► ROLE          HNode(Ativo) ─id─ Asset ─tem─ Tag ──(RULE)──► Alert ──► Action(OS)
                                    │                  │
                                 DiciRow            ML Model (SIMULADO)
   ── toda escrita (setRbac/upsertTag/setDici/setHierarchy/setScope) ──► AuditEvent
   ── todo nó/rota ──► NavNode ──(NavEdge: trigger)──► NavNode  (pintado por permLevel)
   ── todo número exibido ──(TraceableValue)──► Tag (linha do Dicionário)
```

**Impacto consolidado no código:**

| Arquivo | Mudança | Telas |
|---|---|---|
| `src/store/useStore.ts` | slices `auditLog`/`scopes`/`govSettings`; wrapper `logAudit`; estender `partialize` (`:188`)/`version` | todas |
| `src/data/seed.ts` | papéis `Admin Forzy`/`TI-Governança`/`Usuário Cliente`; `HTREE` p/ 8 níveis; `Asset.clienteId?` | 01,02,06 |
| `src/lib/types.ts` | `AuditEvent`, `RbacScope`/`ScopeMatrix`, `TraceLink`, `NavEdge`/`NavNode`, `GovSettings` | todas |
| `src/auth/rbac.ts` | `canScoped(...)`; `firstAllowedRoute(rbac,papel)` | 05,06 |
| `src/store/derive.ts` | `pathToNode(hierarchy,id)`; `nodeMeta(id)` | 01,02 |
| `src/data/traceability.ts` *(novo)* | `SEED_TRACEABILITY`/`US_COVERAGE` | 01,04 |
| `src/data/navGraph.ts` *(novo)* | `nodes`+`edges` + teste de fumaça | 05 |
| `src/components/governanca/*` *(novos)* | `AuditTrail`, `NodeMetaPanel`, `TagTraceCard`, `TraceableValue`, selo de procedência | 02,03,04,06 |
| `src/routes.tsx` | montar `RequireAuth`; rotas `/governanca/auditoria` e `/navegacao`; `Gate` em `/mapa`/telemetria; landing dinâmico | 05,06 |

---

### 6.9 A governança como espinha ambiente de TODAS as telas

Os quatro pilares **não ficam confinados ao módulo Governança** — aparecem em toda tela:

| Pilar | Onde mora | Como aparece em TODA tela |
|---|---|---|
| **Hierarquia** | `Hierarquia.tsx` | o **breadcrumb É a matriz**: empresa→…→ativo, clicável, com escopo herdado (`pathToNode`) |
| **Dicionário** | `Dicionario.tsx` + `SEED_DICTIONARY` | **todo número rastreia ao Dicionário**: hover/click abre campo/unidade/faixa/limite/sensor/direção (`<TraceableValue>`) |
| **RBAC** | `rbac.ts` + `RBAC.tsx` | **toda ação é gated**: `useCan(modulo,nivel)` decide o render de botões; rota protegida por `Gate` |
| **D-I-C-I** | `DICI.tsx` + `SEED_DICI` | **todo artefato carrega seu ciclo**: `<DiciBadge assetId/>` no detalhe do ativo e no cadastro |

**Convenção única de degradação por permissão** (já aplicada caso-a-caso; documentar como padrão):

| Nível | Render | Selo |
|---|---|---|
| `full` | editável (inputs/cliques ativos) | "✎ Edição habilitada" |
| `read` | somente-leitura (spans/badges) | `Lock` "Somente leitura" |
| `none` | oculto no Sidebar; `Gate` "Acesso negado" | `ShieldAlert` |

> **Critério de pronto da camada (cinco invariantes).** Todo número de governança rastreia a uma fonte do store; todo card leva a um destino real e gated; **toda escrita gera um `AuditEvent`**; todo percurso é provado alcançável por papel; e a honestidade do modelo SIMULADO está visível onde a IA decide. Quando esses cinco valerem, a Governança deixa de "parecer" central e **é** central — fechando a US-13 ponta a ponta.

**Ordem de implementação (máximo desbloqueio, mínimo retrabalho):** (1) montar `RequireAuth`; (2) `auditLog`+`logAudit` nas 5 ações; (3) reconciliar papéis no seed; (4) `pathToNode` (breadcrumb-matriz/escopo/NodeMetaPanel); depois conformidade por planta derivada + `TagTraceCard`/limite efetivo; e por fim selo SIMULADO + abas DIKW, `navGraph`, escopo/tenancy e `<TraceableValue>` transversal.
