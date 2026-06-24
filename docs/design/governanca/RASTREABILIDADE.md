# GRAFO MESTRE DE RASTREABILIDADE — PREDICTA · FORZY

> **Documento-síntese da governança.** Liga, em cadeia única e ponta-a-ponta:
> **USER STORY → REQUISITO → MÓDULO → TELA/ROTA → COMPONENTE → SENSOR/TAG → MODELO DE ML → ALERTA → AÇÃO/RECOMENDAÇÃO → PERFIL (RBAC)**.
>
> Consolida as 6 specs já escritas (`01-visao-geral` … `06-rbac-permissoes`) e **ancora cada elo no código real**: `src/data/seed.ts` (`ROLES`/`MODS`/`PERM`/`SEED_DICTIONARY`/`SEED_ALERTS`/`HTREE`/`SEED_USERS`), `src/routes.tsx`, `src/auth/rbac.ts`, `src/engine/simulation.ts` (`evaluateAlerts`, `RULE_TITLE`, `RULE_TIPO`), `src/engine/degradation.ts` (`TAG_OF_MODE`), `src/engine/prediction.ts` (`PredictionModel`).
>
> **Tese:** o Predicta já contém todo o grafo — ele vive **espalhado e tácito** no motor, no seed e no roteador. Este documento o **materializa como artefato de governança de 1ª classe** (US-13) e especifica como torná-lo **navegável na UI**.
>
> **Selo de honestidade da IA (transversal):** todo elo "MODELO DE ML" abaixo refere-se a um **modelo de degradação SIMULADO** — *"Predicta Digital Twin Engine v1 · físico-informado + Weibull"* (`src/engine/prediction.ts`), **não treinado em falhas reais**. A interface `PredictionModel` permite plugar um modelo treinado; quando isso ocorrer, o selo troca sozinho. A Governança é a guardiã dessa procedência.

---

## 0. Legenda de identificadores reais (chaves de junção do grafo)

O grafo inteiro se costura por **6 chaves de junção** que já existem no código:

| Chave | Tipo | Onde nasce | Liga |
|---|---|---|---|
| `assetId` (`BCP-01`, `ME-07`…) | string | `SEED_ASSETS` (`seed.ts:148`), `HTREE` (`seed.ts:110`) | Tela ↔ ativo ↔ twin ↔ alerta ↔ nó da hierarquia |
| `tag.key` (`vib`, `temp`, `press`, `corrente`, `rpm`, `oleo`) | `TagKey` | `SEED_DICTIONARY` (`seed.ts:130`) | Sensor ↔ limite ↔ regra de alerta ↔ modo de falha |
| `FailureMode` (`rolamento`…`cavitacao`) | union | `degradation.ts` / `TWIN_SEED` (`seed.ts:171`) | Tag ↔ modelo ↔ recomendação |
| `modulo` (`Alertas`, `Governança`, `RBAC`…) | string | `MODS` (`seed.ts:96`) | Rota (`Gate`) ↔ Sidebar ↔ `PERM` ↔ perfil |
| `papel` (`Gerente Industrial`…) | string | `ROLES` (`seed.ts:95`) | `PERM` ↔ `SEED_USERS` ↔ `session.papel` ↔ `useCan` |
| `US-n` (US-1…US-13) | catálogo | briefing Forzy (a materializar em `src/data/traceability.ts`) | requisito ↔ módulo ↔ tela |

> **`tag.key` é a espinha do grafo de dado:** ele aparece literalmente em `twin.state[tag.key]` (`simulation.ts:126`), em `tag` do `Alert` (`seed.ts:265`, `tag:"vib"`) e em `TAG_OF_MODE[modoCritico]` (`simulation.ts:158`). É o que prova que "origem do dado → decisão" não é retórica: é o **mesmo símbolo** percorrendo sensor, limite, alerta e modelo.

---

## 1. A cadeia canônica (forma normal do grafo)

```
US-n ──cobre──▶ REQUISITO ──realizado-por──▶ MÓDULO (MODS) ──exposto-em──▶ TELA/ROTA (routes.tsx)
                                                   │                              │
                                                   │                        renderiza
                                                   ▼                              ▼
                                            Gate modulo=…                    COMPONENTE (src/pages/…)
                                                   │                              │
                                          gateado-por PERM                  lê/escreve
                                                   ▼                              ▼
                                            PERFIL (ROLES) ◀──executa── AÇÃO/RECOMENDAÇÃO
                                                   ▲                              ▲
                                                   │                        deriva-de
                                                   │                              │
                            SENSOR/TAG ──limite──▶ MODELO ML ──prevê──▶ ALERTA ──aciona──┘
                            (SEED_DICTIONARY)   (prediction.ts)   (evaluateAlerts)
```

Lida em prosa: **uma user story** define **um requisito**, realizado por **um módulo** (`MODS`), exposto em **uma tela/rota** (`routes.tsx`), renderizada por **um componente** (`src/pages/…`). O componente lê **tags/sensores** (`SEED_DICTIONARY`), cujos limites são avaliados a cada tick por **`evaluateAlerts`** (mediado pelo **modelo SIMULADO** `prediction.ts` na camada preditiva) gerando **alertas**, que disparam **ações/recomendações**, executáveis apenas por **perfis** com nível suficiente na matriz **`PERM`** (avaliada por `can`/`useCan` em `rbac.ts`).

---

## 2. TABELA MESTRE — rastreabilidade ponta-a-ponta (exemplos REAIS)

Cada linha é uma cadeia completa instanciada com dados que **existem no seed/motor**. Severidade e títulos saem de `RULE_TITLE`/`RULE_TIPO` (`simulation.ts:56-66`); modo de falha de `TAG_OF_MODE` (`degradation.ts`); limites de `SEED_DICTIONARY`; alertas-exemplo de `SEED_ALERTS`; perfis de `PERM`.

| # | US | Requisito | Módulo | Tela / Rota | Componente | Sensor / Tag (limite) | Modo / Modelo ML | Alerta (regra → exemplo seed) | Ação / Recomendação | Perfis que executam (`PERM` ≥ `full`) |
|---|---|---|---|---|---|---|---|---|---|---|
| **A** | **US-9** (ML anomalia) | Detectar anomalia de vibração e abrir alerta | **Alertas** | `/alertas` · `/alertas/:id` | `AlertasLista` · `AlertaDetalhe` | `vib` — Acelerômetro MEMS · alerta **4.5** / crít **7.1** mm/s (`TAG-002`) | `rolamento` · `evaluateAlerts` (regra) + twin SIMULADO | `RULE_TITLE.vib` = "Vibração Acima do Limite" → seed **ALT-2025-0847** (`ME-07`, 8.2 mm/s, crítico) | Criar OS / `applyMaintenance(ME-07,"rolamento")`; ack/resolver | **Técnico Manutenção** (`Alertas:full`), **Gerente Industrial** (`full`), **Eng. Confiabilidade** (`full`) |
| **B** | **US-8/US-10** (baseline → parada provável) | Prever falha e antecipar parada | **Alertas / Ativos** | `/alertas` ; `/ativos/:id/saude` | `AlertaDetalhe` · `AtivoSaudeIA` | `vib`/`oleo`/`temp` (tag do `modoCritico`) | `worstMode` → `predict`/`computeRUL`/`failureCurve` (**modelo SIMULADO**) | regra `origem:"modelo"`: "Falha prevista em ~N dias" (`simulation.ts:155`) → análogo a **ALT-2025-0843** (`GR-04`, `origem:"modelo"`, `tag:"oleo"`) | Manutenção planejada (`prazoDias`) → OS | **Gerente Industrial**, **Técnico Manutenção** (`Alertas:full`); **Analista de Dados** só lê (`Alertas:read`) |
| **C** | **US-4/US-7** (sensores V/A/RPM/°C · atuais+históricos) | Exibir telemetria e série histórica | **Ativos / Telemetria** | `/ativos/:id/telemetria` | `AtivoTelemetria` | `temp` (PT100, 75/80 °C), `corrente` (TC, override FLA), `rpm` (Encoder), `press` (4-20mA) | — (camada Dado/Informação) | `RULE_TITLE.temp` = "Temperatura Elevada no Mancal" → **ALT-2025-0845** (`BCP-01`, 82 °C, alto) | Ajustar lubrificação; abrir alerta de processo | **Gerente Industrial**, **Eng. Confiabilidade**, **Analista de Dados** (`Telemetria:full`); Técnico/Operador `read`/`none` |
| **D** | **US-13/US-4** (rastreabilidade do dado) | Editar limite que governa a alarmística | **Governança** | `/governanca/dicionario` | `Dicionario` | qualquer `tag` — ex. `vib.limiteCritico` | acopla a `evaluateAlerts` no próximo tick | editar limite **cria/resolve** alerta em `/alertas` (origem do dado → decisão) | `upsertTag` / `removeTag` (`useStore.ts:140,149`) → **deve auditar** (`logAudit`) | **Gerente Industrial**, **Analista de Dados** (`Governança:full`); Eng. Confiabilidade `read`; Técnico/Operador `none` |
| **E** | **US-12** (conversacional sugere solução) | Explicar falha e recomendar ação | **Assistente** | `/assistente` · `/assistente/:assetId` | `Assistente` | cita `tag`+limite como evidência (Dicionário) | percorre `recommendationsFor` (mesma cadeia C→In) | referencia o alerta aberto do ativo (ex. ALT-2025-0847) | sugerir solução de falha → deep-link a Ativo/Alerta | **Gerente Industrial**, **Eng. Confiabilidade**, **Técnico Manutenção** (`Assistente:full`); Analista `read`; Operador `none` |
| **F** | **US-5/US-6** (OCR da placa → artefato navegável) | Cadastrar ativo da placa e aterrissar na árvore | **Cadastro / OCR** | `/cadastro` · `/cadastro/ocr` | `CadastroManual` · `CadastroOCR` (lazy) | herda tags por classe (`tag.ativo`: "Rotativos"…) | `buildHealthyTwin` (twin novo, damage≈0) | nasce **sem** alerta; nasce linha D-I-C-I `pendente` | criar ativo → vira nó em `HTREE` (Hierarquia) | **Gerente Industrial** (`Cadastro:full`,`OCR:full`), **Eng. Confiabilidade** (`Cadastro:full`); Técnico/Analista/Operador `none` |
| **G** | **US-6/US-13** (planta navegável · estrutura) | Navegar a estrutura empresa→ativo | **Governança** | `/governanca/hierarquia` | `Hierarquia` | nível Sensor (extensão) referencia `SEED_DICTIONARY` | — | nível Evento/Alerta (extensão) **é** um `Alert` (`SEED_ALERTS`) | add/rename/remove nó (`setHierarchy`) → **deve auditar** | **Gerente Industrial** (`Governança:full`), **Analista de Dados** (`full`); Eng. Confiabilidade `read` |
| **H** | **US-13** (governança de acessos) | Conceder/retirar acesso por papel | **RBAC** | `/governanca/rbac` | `RBAC` | — | — | — | ciclar célula `PERM` (`setRbac`) → re-pinta Sidebar/Gates na hora → **deve auditar** | **somente** `RBAC:full` = **Gerente Industrial** (único hoje) |
| **I** | **US-1/US-13** (modular · navegação governada) | Provar cobertura tela↔US↔papel | **Governança** | `/governanca/navegacao` *(proposta)* | *(grafo de navegação)* | nós-destino: Saúde IA/Gêmeo (selo SIMULADO) | — | aresta "viva" Sidebar→Alertas (`useOpenAlertCount`) | simular papel; exportar atlas; detectar becos | **Gerente Industrial** (`Governança:full`) edita; demais `read`/`none` |

### 2.1 Foco — cadeia A expandida elo a elo (a "rota de ouro" US-9 → US-12)

A linha **A** é a cadeia mais valiosa do produto. Detalhada por elo, com âncora de código:

| Elo | Valor real | Âncora |
|---|---|---|
| **US** | US-9 (ML anomalia) — sobe a US-13 (governança) | briefing |
| **Requisito** | "detectar vibração acima do limite e abrir alerta rastreável" | — |
| **Módulo** | `Alertas` | `MODS` (`seed.ts:96`) |
| **Rota** | `/alertas` → `/alertas/:id` (ambas `<Gate modulo="Alertas">`) | `routes.tsx:68-69` |
| **Componente** | `AlertasLista` → `AlertaDetalhe` | `routes.tsx:28-29` |
| **Sensor/Tag** | `TAG-002 vib` · Acelerômetro MEMS · alerta 4.5 / crít 7.1 mm/s · `direcao:"acima"` | `SEED_DICTIONARY` (`seed.ts:132`) |
| **Modo/Modelo** | `rolamento` (TWIN_SEED `ME-07`); twin SIMULADO calcula `health`/`RUL`/`probFalha` | `seed.ts:174`, `prediction.ts` |
| **Regra** | `breachCrit = v >= 7.1` → `severidade:"critico"`, `titulo:RULE_TITLE.vib`, `tipo:RULE_TIPO.vib` | `simulation.ts:127,135` |
| **Alerta (exemplo seed)** | **ALT-2025-0847** · `ME-07` · "Vibração Crítica Detectada" · `tag:"vib"` · `responsavel:"Carlos H. Matos"` | `SEED_ALERTS` (`seed.ts:265`) |
| **Ação** | ack / resolver / `applyMaintenance(ME-07,"rolamento")` → OS | `recommendations.ts` |
| **Perfil** | `Técnico Manutenção` (`Alertas:full`) executa; `Operador Campo` só vê (`Alertas:read`); Assistente (US-12) explica a `Técnico`/`Eng.`/`Gerente` (`Assistente:full`) | `PERM` (`seed.ts:100,102`) |

> **Subida e descida (o que a UI deve permitir):** partindo de **ALT-2025-0847** deve-se **subir** até US-9 (qual requisito esta cadeia atende) e **descer** até a ação (criar OS) e o perfil (quem pode). Hoje cada elo existe, mas o percurso é tácito — §4 especifica como acendê-lo.

---

## 3. MATRIZ MÓDULO × PERFIL × US (recorte do `PERM` real cruzado com cobertura de US)

Cruza `PERM` (`seed.ts:97-103`) com as US que cada módulo realiza. Níveis: **F**=full · **R**=read · **·**=none. "US realizadas" = quais user stories aquele módulo materializa.

| Módulo | US realizadas | Gerente Ind. | Eng. Confiab. | Técnico Manut. | Analista Dados | Operador Campo | Rota gated? |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard | US-1,2,7 | F | F | R | R | **·** | não |
| Ativos | US-1,3,7 | F | F | R | R | R | não |
| Telemetria | US-4,7 | F | F | R | **F** | **·** | não† |
| Alertas | US-9,10 | F | F | **F** | R | R | **Gate** |
| Assistente | US-12 | F | F | **F** | R | **·** | não |
| Cadastro | US-1,3,5 | F | F | **·** | **·** | **·** | **Gate** |
| OCR | US-5 | F | F | **·** | **·** | **·** | **Gate** |
| Mapa | US-6 | F | F | R | **·** | R | não† |
| Governança | US-13,1,3,4 | F | **R** | **·** | **F** | **·** | **Gate** |
| RBAC | US-13 | **F** | **·** | **·** | **·** | **·** | **Gate** |

> † **Divergência menu × rota (achado):** `Telemetria` e `Mapa` têm `modulo` no Sidebar (governam visibilidade), mas **não há `<Gate>`** nas rotas `/ativos/:id/telemetria` e `/mapa` (`routes.tsx:61,76`). Acesso direto por URL fura o controle. (Cobertura ampliada em §5.)
>
> **Concentração de privilégio:** **Gerente Industrial = `full` em 10/10 módulos** e **único** com `RBAC:full` — é o "Administrador Forzy" de fato (auto-governança: só ele edita a matriz). É o KPI de governança mais sensível (Overview §6, "Acessos críticos").

---

## 4. Como tornar o grafo NAVEGÁVEL na UI

A rastreabilidade só vira governança quando é **clicável dos dois lados**. Especificação concreta, ancorada em arquivos reais.

### 4.1 Fonte de verdade declarativa — `src/data/traceability.ts` (a criar)

Materializar o grafo como **dado de 1ª classe**, espelhando o que hoje é tácito:

```ts
// um nó por elo da cadeia; arestas tipadas pela relação do §1
export interface TraceNode { kind: "US"|"Req"|"Modulo"|"Tela"|"Componente"|"Tag"|"Modelo"|"Alerta"|"Acao"|"Perfil"; id: string; label: string; ref?: string /* arquivo:linha */ }
export interface TraceEdge { from: string; to: string; rel: "cobre"|"realiza"|"expoe"|"renderiza"|"le-tag"|"prevê"|"aciona"|"executa"|"gateado-por" }
export const TRACE_NODES: TraceNode[]; export const TRACE_EDGES: TraceEdge[];
```

Derivar **sem inventar**: `kind:"Tag"` de `SEED_DICTIONARY`; `kind:"Alerta"` de `RULE_TITLE`/`SEED_ALERTS`; `kind:"Modulo"` de `MODS`; `kind:"Perfil"` de `ROLES`; `kind:"Tela"` de `routes.tsx`. Um **teste de fumaça** garante que toda rota é nó, todo `tag.key` tem aresta `le-tag`, e todo módulo aparece em `PERM` — impedindo divergência grafo↔código.

### 4.2 Interações canônicas (subir/descer a cadeia)

| Gesto na UI | Origem | Efeito (realça a cadeia inteira) | Componente |
|---|---|---|---|
| **Clicar numa US** (chip de cobertura) | Overview faixa "Cobertura de US" / Dicionário aba "Cobertura" | acende **toda a cadeia descendente**: módulo→tela→tag→alerta→ação→perfil | `src/components/governanca/TraceGraph.tsx` (a criar) |
| **Clicar num alerta** | `AlertaDetalhe` | **sobe** até a US (US-9) e **desce** até ação (criar OS) + perfis que podem | painel "Procedência" em `AlertaDetalhe` |
| **Hover/click num número** (`<TraceableValue>`) | KPI, card de alerta, detalhe de ativo | abre a **linha do Dicionário** que governa aquele número (tag+limite+regra) | `src/components/governanca/TraceableValue.tsx` (espinha §51-57) |
| **Simular papel** | `/governanca/navegacao` (proposta) | re-pinta o grafo: nós alcançáveis acendem, gated escurecem — `permLevel(rbac,papel,modulo)` sem login | `Sidebar.tsx:56` lógica reusada |
| **Breadcrumb-matriz** | qualquer tela | `pathToNode(hierarchy,id)` → segmentos clicáveis Empresa›Planta›…›Ativo | `chrome.tsx:35`, `BC` (`ui-shared/index.tsx:90`) |

### 4.3 Pintura por RBAC (governança visível)

O mesmo grafo se **re-pinta em tempo real** quando uma célula `PERM` muda em `/governanca/rbac` (`setRbac` é reativo via `useCan`, `rbac.ts:20`): elos cujo `modulo`-alvo é `none` para o papel simulado ficam esmaecidos + selo `Lock`; `read` em âmbar; `full` em cobalto. Assim "controle de acesso" (conceito) vira "alcance navegável" (mapa pintado).

### 4.4 Onde cada elo já tem casa real (não é tela nova do zero)

- **US/Requisito/Módulo/Tela:** aba "Cobertura de US" do **Dicionário** (spec 04 §5.2) + faixa no **Overview** (spec 01 §9.4) + matriz do **Mapa de Navegação** (spec 05 §5.4).
- **Tag→Alerta:** `TagTraceCard` no **Dicionário** (spec 04 §9 P0), derivado de `RULE_TITLE`/`TAG_OF_MODE`.
- **Modelo→Alerta:** selo de procedência no estágio "Conhecimento" do **D-I-C-I/Fluxo DIKW** (spec 03 §5.1) e em **Saúde IA**.
- **Alerta→Ação→Perfil:** painel "Procedência" no **AlertaDetalhe** + catálogo "Ações críticas" no **RBAC** (spec 06 §5.4/§7.2).

---

## 5. GAPS DE COBERTURA (US sem tela · tela sem US · sensor sem alerta · ação sem perfil · auditoria)

Achados reais, cada um acionável e ancorado.

### 5.1 US ↔ tela

| Gap | Detalhe | Impacto / correção |
|---|---|---|
| **US-13 sem tela de navegação/auditoria** | A US central só tem Overview+Hierarquia+D-I-C-I+Dicionário+RBAC; **falta** `/governanca/navegacao` (grafo de fluxo) e `/governanca/auditoria` (trilha) | Criar as 2 rotas (specs 05 e 01 §9 P0); sem auditoria, `setRbac`/`upsertTag`/`setHierarchy` mutam sem registro de quem/quando/de→para |
| **US-1 (modular) sem visualização de cobertura** | Modularidade existe (Sidebar oculta por `none`) mas não há **prova** de que US-1…13 têm telas | Manifesto `traceability.ts` + heatmap de cobertura (§4.1) |
| **US-11 (manutenção planejada) parcial** | `applyMaintenance`/`recommendationsFor` existem, mas não há tela de **plano/calendário** de manutenção dedicada | Aba "Plano" em `AtivoTecnico` ou módulo OS futuro |

### 5.2 Tela ↔ US (telas sem proteção coerente)

| Gap | Detalhe | Correção |
|---|---|---|
| **`/mapa` e `/ativos/:id/telemetria` sem `<Gate>`** | Sidebar oculta por `modulo`, mas a rota não protege → acesso direto por URL fura o RBAC (`routes.tsx:61,76`) | Adicionar `<Gate modulo="Mapa">` / `"Telemetria"` ou remover o `modulo` do Sidebar — a matriz §3 é o checklist |
| **`RequireAuth` não montado** | Existe (`RequireAuth.tsx:11`) mas `routes.tsx` usa só `Gate`; o app **não força login** | Envolver o `AppShell` com `<RequireAuth>` |
| **Landing órfão do Operador Campo** | `/` → `/dashboard` (`routes.tsx:49`) mas `Operador.Dashboard = "none"` (`seed.ts:102`) → cai em tela que não vê | `firstAllowedRoute(rbac,papel)` no `index` redirect |

### 5.3 Sensor/Tag ↔ alerta ↔ modelo

| Gap | Detalhe | Correção |
|---|---|---|
| **`corrente` (TAG-004) — falso-positivo de limite-base** | Dicionário mostra limite genérico (50/53 A), mas o motor usa **override por ativo** escalado ao FLA (`seed.ts:164-167`). Auditor conclui errado que a Turbina (25 MW) vive em sobrecorrente | Coluna "limite efetivo por ativo" no Dicionário (spec 04 §9 P0) |
| **Tag↔modo de falha invisível** | `TAG_OF_MODE` (vib→rolamento, oleo→lubrificacao, temp→isolamento, rpm→desalinhamento, press→cavitacao) liga tag a modelo, mas não é exibido | `TagTraceCard` materializa a relação (já no motor) |
| **Alerta de modelo sem tela de procedência** | alertas `origem:"modelo"` (ex. ALT-2025-0843) não exibem **qual modelo** os gerou nem o selo SIMULADO | Selo de procedência em `AlertaDetalhe` + Fluxo DIKW |

### 5.4 Ação ↔ perfil

| Gap | Detalhe | Correção |
|---|---|---|
| **Edição de limite (Dicionário) = ação crítica sem auditoria** | `Analista de Dados` tem `Governança:full` e pode editar limite que dispara alerta em produção (`evaluateAlerts`) **sem registro** | Sub-escopo: separar "editar limite" de "navegar rastreabilidade"; `logAudit` em `upsertTag` |
| **Ações de campo sem perfil ideal** | `Técnico Manutenção` tem `Governança:none` mas é quem mais navegaria nó→alerta→ação na Hierarquia | "Modo navegação operacional" liberado em `read` (spec 02 §3) |
| **Concessão de `RBAC:full` sem step-up** | Criar novo administrador é só um clique de célula; nenhuma reconfirmação | Step-up + proteção do "último Admin" (spec 06 §9) |

### 5.5 Personas ↔ papéis (reconciliação RBAC)

As 5 personas obrigatórias **não** mapeiam 1:1 a `ROLES`; hoje colapsam silenciosamente (papel sem linha em `PERM` → `none`):

| Persona obrigatória | Papel real hoje | Lacuna |
|---|---|---|
| **Administrador Forzy** | de fato `Gerente Industrial` (`RBAC:full`) | criar papel `Admin Forzy` dedicado |
| **TI/Governança** | recai em `Analista de Dados` (`Governança:full`, `RBAC:none`) | criar papel dedicado (auditoria/conformidade) |
| **Usuário cliente** | não existe | criar `Usuário Cliente` + escopo por cliente/planta |
| **Técnico de manutenção** | `Técnico Manutenção` ✓ | ok (nome difere do briefing) |
| **Gestor industrial** | `Gerente Industrial` ✓ | rebaixar `RBAC:full`→`read` ao criar `Admin Forzy` |

### 5.6 Resumo executivo dos gaps (prioridade)

1. **P0 — Trilha de auditoria global** (`logAudit` em `setRbac`/`upsertTag`/`removeTag`/`setHierarchy`/`setDici`): nenhuma mutação de governança é registrada hoje. Maior lacuna do produto.
2. **P0 — Coerência menu × rota** (`Gate` em `/mapa`,`/telemetria`) + montar `RequireAuth` + landing dinâmico.
3. **P0 — Manifesto `traceability.ts`** que torna o grafo dado de 1ª classe (e testável).
4. **P1 — Limite efetivo por ativo** no Dicionário (resolve falso-positivo da corrente).
5. **P1 — Reconciliar papéis** (`Admin Forzy`, `TI/Governança`, `Usuário Cliente`) + escopo por planta/cliente.
6. **P1 — Selo de procedência SIMULADO** nos pontos de chegada da IA (Alerta de modelo, Saúde IA, Fluxo DIKW).

---

## 6. Síntese

O Predicta **já é** um sistema rastreável: o mesmo `tag.key` percorre sensor → limite → `evaluateAlerts` → alerta → modo de falha → modelo; o mesmo `modulo` percorre rota → `Gate` → `PERM` → Sidebar → perfil; o mesmo `assetId` percorre `HTREE` → twin → alerta → tela. O que falta **não é o grafo** — é **torná-lo visível, navegável e auditável**. Este documento é o mapa-mestre; as 6 specs são as telas que o instanciam; o manifesto `traceability.ts` (§4.1) e a trilha `logAudit` (§5.6) são os dois artefatos que fecham a US-13 ponta a ponta — todo número rastreia ao Dicionário, toda ação é gated por RBAC, toda mutação vira evento auditável, e a procedência (inclusive a honestidade do modelo SIMULADO) é exposta no ponto de chegada.
