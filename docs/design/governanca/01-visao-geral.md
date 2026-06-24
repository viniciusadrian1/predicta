# Governança — Visão Geral (Tela 01)

> **Produto:** PREDICTA · **Empresa:** FORZY · **Módulo:** Governança · **Rota:** `/governanca`
> **Arquivo de implementação:** `src/pages/governanca/Overview.tsx`
> **User story central:** **US-13** (governança de acessos/dados/rastreabilidade)
> **Continuidade:** alinhado a `docs/design/00-governanca-espinha.md` (Tela 16) — este documento **aprofunda** aquela base com foco executivo, KPIs derivados de dados reais e cards navegáveis.

---

## 1. Nome da tela

**Governança — Visão Geral** (rotulada no breadcrumb como `Governança › Visão Geral`, publicado por `usePageChrome(["Governança","Visão Geral"])` em `Overview.tsx:12`).

É a **tela-âncora do módulo Governança** e a porta de entrada do subsistema de controle do Predicta: o *cockpit executivo* que dá, num só olhar, o pulso de conformidade documental, saúde da rastreabilidade, status de hierarquia, status de permissões e cobertura das user stories — e despacha (drill) para cada subsistema especializado (Hierarquia, D-I-C-I, Dicionário, RBAC, Auditoria).

Não é um diagrama teórico: é o **hub de navegação governado por papel** e o painel onde a governança do produto se torna **visível e operável**, não abstrata.

---

## 2. Objetivo da tela

Dar ao **Gestor industrial** e à **TI/Governança** um **pulso único** do estado de governança do Predicta e servir de **roteador para os quatro subsistemas** (mais Auditoria e Configurações), com KPIs que **não são decorativos** — derivam do estado vivo do store.

### Estado atual reconhecido (o que JÁ EXISTE — `Overview.tsx`)

A tela já está implementada e **parcialmente derivada de dados reais**:

| Bloco existente | Origem do dado | Veredito |
|---|---|---|
| Faixa de 4 KPIs (`Documentos Aprovados`, `Em Revisão`, `Pendentes`, `Conformidade Geral`) | **Real** — `dici.flatMap(r => [r.D, r.I, r.C, r.In])` sobre as 4 células de cada ativo no store (`Overview.tsx:15-20`) | ✅ Genuinamente vivo: ciclar uma célula em `/governanca/dici` re-renderiza estes KPIs |
| Conformidade Geral = `aprovados / total` | **Real** — 24 células (6 ativos × 4 fases) no seed `DICI` (`seed.ts:77-84`) → hoje ≈ 79% | ✅ Derivado, com meta fixa "95%" |
| Grade 3×2 de cards-portal (Hierarquia, D-I-C-I, Dicionário, RBAC, Rastreabilidade/Auditoria, Configurações) | Estático — `navigate(item.to)` (`Overview.tsx:31-50`) | ⚠️ Navegável, mas **um card é placeholder**: "Rastreabilidade / Auditoria" aponta para `/governanca/dicionario` (`Overview.tsx:37`), pois **não existe tela de auditoria** |
| Barras "Conformidade por Planta" (Norte 89%, Sul 88%, Geração 81%) | **Hardcoded** (`Overview.tsx:56-59`) | ❌ Números inventados, **não derivam** de `hierarchy` × `dici` |

**Síntese honesta do estado:** os KPIs de topo são reais e vivos; a grade de cards é navegável mas tem um link placeholder; e as barras por planta são fixas. A meta desta etapa é **fechar a lacuna entre "parece governança" e "é governança"** — todo número rastreável a uma fonte do store, todo card levando a um destino real e gated por RBAC, e a cobertura das user stories tornada explícita e auditável.

---

## 3. Usuários/perfis que acessam

Acesso governado pelo módulo `Governança` na matriz RBAC (`PERM` em `seed.ts:97-103`, avaliada por `permLevel`/`can` em `src/auth/rbac.ts`). A rota inteira é envolvida por `<Gate modulo="Governança">` (`routes.tsx:79`).

| Persona (obrigatória) | Papel reconciliado no seed (`ROLES`) | Nível em `Governança` | Nível em `RBAC` | Comportamento na Visão Geral |
|---|---|---|---|---|
| **Administrador Forzy** | *(não existe papel literal no seed; mapeia hoje a)* **Gerente Industrial** | `full` | `full` | Vê tudo; card "Permissões RBAC" acionável; pode editar nos drills |
| **Gestor industrial** | **Gerente Industrial** | `full` | `full` | Overview completo + acesso a RBAC e Auditoria |
| **TI/Governança** | *(papel a criar)* — hoje recai em **Analista de Dados** | `full` (Analista) / a definir | `none` (Analista) | Overview + foco em Dicionário/Auditoria; **sem** card RBAC acionável |
| **Usuário cliente** | *(não há papel "cliente" no seed)* — proxy: **Analista de Dados** | `full` | `none` | Overview + Dicionário; RBAC bloqueado |
| **Técnico de manutenção** | **Técnico Manutenção** | `none` | `none` | **Não vê o módulo** — Sidebar oculta (`permLevel !== "none"`); rota cai no `Gate` "Acesso negado" |

> **Lacuna de reconciliação de papéis (a refinar — §9):** as personas obrigatórias **Administrador Forzy**, **TI/Governança** e **Usuário cliente** **não têm papel literal** em `ROLES` (`seed.ts:95`). Hoje colapsam em Gerente Industrial / Analista de Dados. Recomenda-se criar os papéis reais e dar a cada um sua linha em `PERM` (senão `permLevel` cai em `"none"` silenciosamente — fail-safe, mas confuso). **Importante:** apenas papéis com `RBAC:full` (hoje só Gerente Industrial) podem chegar à edição da matriz — auto-governança do sistema de permissões.

A **entrada** na tela é controlada por `useCan("Governança","read")`; o **card "Permissões RBAC"** só deveria ser acionável com `useCan("RBAC","read")` — hoje o card sempre navega, e o bloqueio ocorre só no destino (`Gate modulo="RBAC"`). Refinamento em §9.

---

## 4. User stories da Forzy cobertas

| US | Como esta tela a cobre |
|---|---|
| **US-13 (núcleo)** | A própria tela **É** a vitrine executiva da governança de acessos/dados/rastreabilidade: KPIs de conformidade documental (dado), grade de subsistemas (acessos via RBAC + estrutura via Hierarquia), e o destino de auditoria (rastreabilidade). |
| **US-1 (modular)** | A grade de cards é o **mapa de módulos governados**. Cards de módulos não contratados devem virar *upsell* (não link quebrado) — ver §9. A modularidade por papel já se manifesta porque o Sidebar oculta o que o papel não acessa. |
| **US-2 (interface amigável)** | Densidade executiva: 1 faixa de KPIs + 1 grade navegável + 1 bloco de barras. Leitura em <5s do risco documental. |
| **US-3 (dado raw / base histórica)** | Indireta: a Conformidade reflete o ciclo D-I-C-I (Desenho→Inspeção), que é a procedência documental do ativo cujos dados raw alimentam o resto. |
| **US-13 → suporte a US-4/7/8/9** | O card **Dicionário** liga à fonte canônica de tags (V/A/RPM/°C) que governa alertas e gráficos — esta tela é o ponto de partida para auditar essa procedência. |

> **Proposta de §9:** adicionar um card-bloco **"Cobertura de User Stories (US-1…13)"** explícito nesta tela — hoje a cobertura é implícita. Torna US-13 *auto-rastreável* (a governança mostrando que governa as próprias US).

---

## 5. Estrutura da tela

Layout vertical em três faixas (refletindo `Overview.tsx`), com a proposta de uma quarta faixa de cobertura (§9). Componentes compartilhados: `KPI` e `SH` de `@/components/ui-shared` (`index.tsx:53,69`).

### 5.1 Faixa 1 — KPIs executivos (`grid grid-cols-4`)

| # | KPI | Valor (fonte real) | Sub | Ícone | Cor (token `C`) |
|---|---|---|---|---|---|
| 1 | **Documentos Aprovados** | `aprovados` = células `=== "aprovado"` | `{%} do total` | `FileText` | `C.green` `#34D399` |
| 2 | **Em Revisão** | `emRevisao` = células `=== "em_revisao"` | "Ação necessária" | `Clock` | `C.yellow` `#FBBF24` |
| 3 | **Pendentes** | `pendentes` = células `=== "pendente"` | "Sem documentação" | `AlertCircle` | `C.red` `#F87171` |
| 4 | **Conformidade Geral** | `Math.round(aprovados/total*100)` % | "Meta: 95%" | `Target` | `C.steel` `#82C8E5` |

> Base de cálculo: `total = dici.length × 4` células (hoje 6 ativos → 24 células). `total || 1` evita divisão por zero (`Overview.tsx:16`).

### 5.2 Faixa 2 — Grade de cards-portal (`grid grid-cols-3`, 3×2)

Cada card é um `<button onClick={() => navigate(to)}>` com ícone colorido, título Rajdhani e descrição em `C.slate`.

| Card | Descrição | Destino (`to`) | Cor | Estado |
|---|---|---|---|---|
| **Hierarquia de Ativos** | empresa › planta › área › ativo | `/governanca/hierarquia` | `C.cobalt` | ✅ Real |
| **Matriz D-I-C-I** | Ciclo de vida documental | `/governanca/dici` | `C.steel` | ✅ Real |
| **Dicionário de Rastreabilidade** | Definições, unidades, limites | `/governanca/dicionario` | `C.slate` | ✅ Real |
| **Permissões RBAC** | Usuários, papéis, acesso | `/governanca/rbac` | `C.green` | ✅ Real (mas sem checar `useCan("RBAC")` antes de navegar) |
| **Rastreabilidade / Auditoria** | Trilha de eventos | `/governanca/dicionario` | `C.yellow` | ❌ **Placeholder** — não há rota de auditoria |
| **Configurações do Sistema** | Simulação, ambiente, demo | `/configuracoes` | `C.slate` | ✅ Real |

### 5.3 Faixa 3 — Conformidade por Planta (card `SH "Conformidade por Planta"`)

Barra empilhada (aprovado verde / em revisão âmbar / pendente cinza) + % à direita, colorida por faixa (`≥88` verde, `≥80` âmbar, senão vermelho).

| Planta | Total | Aprov. | Revisão | Pend. | % |
|---|---|---|---|---|---|
| Planta Norte | 89 | 79 | 6 | 4 | **89%** ❌ hardcoded |
| Planta Sul | 42 | 37 | 3 | 2 | **88%** ❌ hardcoded |
| Planta Geração | 32 | 26 | 4 | 2 | **81%** ❌ hardcoded |

### 5.4 Faixa 4 — PROPOSTA (§9): "Saúde da Governança" derivada

Três blocos de status macro, todos **derivados do store**, substituindo abstração por dado:
- **Status da Hierarquia:** nº de plantas/áreas/sistemas/ativos (`countByType` de `Hierarquia.tsx` sobre `hierarchy`).
- **Status das Permissões:** matriz papéis × módulos; nº de células `full` / `read` / `none`; alerta de "papel morto" (sem nenhum `full`).
- **Saúde da Rastreabilidade:** nº de tags no Dicionário (`dictionary.length`), nº de ativos sem linha D-I-C-I, % de números do produto com tag definida.

---

## 6. Dados e entidades mostradas

| Entidade | Fonte no store (`useStore`) | Forma (`src/lib/types`) | Como aparece na tela |
|---|---|---|---|
| **DiciRow** (ciclo documental) | `s.dici` (seed `DICI`/`SEED_DICI`, `seed.ts:77-84,283`) | `{ id, nome, D, I, C, In }` com status `aprovado\|em_revisao\|pendente` | Alimenta os 4 KPIs (24 células) |
| **RbacMatrix** (papel × módulo) | `s.rbac` (seed `PERM`, `seed.ts:97-103`) | `Record<papel, Record<modulo, "none"\|"read"\|"full">>` | (proposto) Status de Permissões; hoje só gateia o acesso |
| **HNode** (hierarquia) | `s.hierarchy` (seed `HTREE`, `seed.ts:105-121`) | árvore `{ id, l, tp, kids }` | (proposto) Status da Hierarquia + base real do "por Planta" |
| **Tag** (dicionário) | `s.dictionary` (seed `SEED_DICTIONARY`, `seed.ts:130-137`) | `{ key, campo, un, faixaMin/Max, limiteAlerta, limiteCritico, direcao, sensor, ativo }` | (proposto) Saúde da Rastreabilidade |
| **User / Session** | `s.users`, `s.session` (`SEED_USERS`, `seed.ts:274-280`) | `{ nome, email, papel, status, mods }` | (proposto) "Acessos críticos": usuários `full` em RBAC/Governança |
| **Asset** | `s.assets` (`SEED_ASSETS`) | nameplate `{ id, nome, planta, criticidade, … }` | Denominador real do "por Planta" e dos cards de cobertura |

### Indicadores derivados (KPIs) — fórmulas

| KPI | Fórmula | Valor atual (seed) |
|---|---|---|
| Documentos Aprovados | `cells.filter(c => c === "aprovado").length` | 19 de 24 |
| Em Revisão | `cells.filter(c => c === "em_revisao").length` | 2 |
| Pendentes | `cells.filter(c => c === "pendente").length` | 3 |
| Conformidade Geral | `round(aprovados / total × 100)` | **≈ 79%** |

> **Acessos críticos (proposto):** `users.filter(u => can(rbac, u.papel, "RBAC", "full"))` → quem pode reescrever o controle de acesso (hoje: Ricardo Teixeira / Gerente Industrial). É o KPI de governança mais sensível — quem detém as chaves.

> **Papéis × módulos com permissão full (proposto):** `roles.map(r => modules.filter(m => can(rbac, r, m, "full")).length)` → expõe concentração de privilégio (Gerente Industrial = 10/10 módulos `full`).

---

## 7. Ações possíveis

| Ação | Gatilho na UI | Efeito | Gating RBAC |
|---|---|---|---|
| **Drill → Hierarquia** | clique no card | `navigate("/governanca/hierarquia")` | `Gate Governança` no destino |
| **Drill → D-I-C-I** | clique no card | `navigate("/governanca/dici")` | `Gate Governança` |
| **Drill → Dicionário** | clique no card | `navigate("/governanca/dicionario")` | `Gate Governança` |
| **Drill → RBAC** | clique no card | `navigate("/governanca/rbac")` | `Gate RBAC` (destino) — **deveria gatear no card** (§9) |
| **Drill → Auditoria** | clique no card | hoje cai no Dicionário (placeholder) | — (rota a criar) |
| **Drill → Configurações** | clique no card | `navigate("/configuracoes")` | sem gate hoje |
| **Leitura de KPIs** | render | reflete `s.dici` ao vivo | leitura para todos com `Governança:read` |
| **(proposto) Exportar pulso de governança** | `IBtn "Exportar"` no header | CSV/snapshot (reusa `downloadCSV` de D-I-C-I) | `read` |
| **(proposto) Reagir a "papel morto" / acesso crítico** | clique no alerta → RBAC | `navigate("/governanca/rbac")` filtrado | `RBAC:read` |

> **Honestidade:** esta tela **não muta** o store — é leitura + navegação. Toda escrita acontece nos drills (`setDici`, `setRbac`, `setHierarchy`, `upsertTag`/`removeTag` em `useStore.ts:140-175`). Por isso a Visão Geral é o lugar certo para **espelhar a trilha de auditoria** dessas escritas (§9), não para gerá-la.

---

## 8. Relação com o restante do produto

A Visão Geral é o **nó-pai do grafo de rastreabilidade** US↔módulos↔telas↔sensores↔modelos↔alertas↔ações↔perfis. Conexões reais:

- **→ Hierarquia (`/governanca/hierarquia`):** a árvore `HTREE` é a fonte do **breadcrumb-matriz** transversal (ver Espinha 1 em `00-governanca-espinha.md`). O nó tipo `Ativo` já navega para `/ativos/:id/overview`. O "por Planta" desta tela **deveria** cruzar essa árvore.
- **→ D-I-C-I (`/governanca/dici`):** mesma fonte (`s.dici`) dos KPIs de topo — **dado vivo bidirecional**: ciclar status lá muda os KPIs aqui na hora.
- **→ Dicionário (`/governanca/dicionario`):** fonte canônica de limites que **alimenta os alertas do motor** (`evaluateAlerts` em `src/engine/simulation.ts` lê `tag.limiteAlerta/limiteCritico/direcao`). Logo a Governança rastreia a origem de **cada alerta** do Predicta.
- **→ RBAC (`/governanca/rbac`):** a matriz `s.rbac` gateia **todo** o produto — Sidebar (`Sidebar.tsx:56`), rotas (`Gate` em `routes.tsx`), e botões (`useCan`). Mudar uma célula re-renderiza navegação e guards imediatamente (`useCan` reativo, `rbac.ts:20`).
- **→ Assistente / Alertas / Dashboard:** consomem o que a Governança define (limites → alertas; papel → quem fala com o Assistente; ativos válidos → contagens do Dashboard).
- **→ Cadastro / OCR:** todo ativo cadastrado (US-5/US-6) **deveria nascer** com linha D-I-C-I `pendente` — o que **abaixaria** a Conformidade aqui, fechando o laço cadastro→governança.
- **Honestidade da IA:** qualquer link futuro a "Saúde IA" deve carregar o selo **"modelo de degradação SIMULADO (físico-informado + Weibull), não treinado em falhas reais"** (interface `PredictionModel` em `src/engine/prediction.ts`). A Governança é a guardiã desse selo de procedência.

---

## 9. Melhorias sobre o wireframe base

Crítica e refino concretos, sempre apontando arquivo/componente real. Governança **mais visual, menos abstrata**, ligada às operações reais.

### P0 — Eliminar dado falso e link quebrado

1. **Derivar "Conformidade por Planta" do estado real.** Hoje hardcoded (`Overview.tsx:56-59`). Cruzar `s.hierarchy` (plantas) × `s.assets` (mapa ativo→planta) × `s.dici` (status por ativo): para cada planta, contar células `aprovado/em_revisao/pendente` dos ativos daquela planta. **Arquivo:** `Overview.tsx` (substituir o array literal por `useMemo` sobre o store). **Esforço: médio.**

2. **Card "Auditoria" → rota real `/governanca/auditoria`.** Hoje aponta a `/governanca/dicionario` (`Overview.tsx:37`) — placeholder enganoso. Criar a slice `auditLog: AuditEvent[]` no store e um wrapper `logAudit` chamado dentro de `setRbac`/`setDici`/`upsertTag`/`removeTag`/`setHierarchy` (todos centralizados em `useStore.ts:140-175`); nova tela `src/pages/governanca/Auditoria.tsx` (tabela filtrável + `downloadCSV`); item no Sidebar e rota em `routes.tsx`. Mudança de limite no Dicionário e de célula RBAC são os eventos mais críticos. **Esforço: médio.**

3. **Gatear o card RBAC pela permissão de RBAC, não só pelo destino.** Hoje o card sempre navega; só o `Gate` no destino bloqueia. Envolver com `useCan("RBAC","read")` → render esmaecido + selo `Lock` quando `none`. **Arquivo:** `Overview.tsx`. **Esforço: baixo.**

### P1 — Tornar a cobertura e os status VISUAIS (menos abstrato)

4. **Adicionar faixa "Cobertura de User Stories (US-1…13)".** Mapa visual (grade de 13 chips ou heatmap) US → módulo/tela/arquivo, com status (coberta / parcial / pendente). Cobre US-13 *auto-rastreável* e US-1. Fonte: um manifesto `US_COVERAGE` em `src/data/` linkando cada US a rota+arquivo. **Esforço: médio.**

5. **Bloco "Saúde da Governança" derivado** (Faixa 4, §5.4): três mini-cards navegáveis — Hierarquia (`countByType`), Permissões (contagem `full/read/none` + alerta "papel morto"), Rastreabilidade (`dictionary.length`, ativos sem D-I-C-I). Substitui números inventados por leitura do store. **Esforço: médio.**

6. **KPI "Acessos críticos".** `users.filter(u => can(rbac, u.papel, "RBAC", "full"))` — quem detém as chaves do controle de acesso, com drill para RBAC filtrado. É a métrica de governança mais sensível e hoje invisível. **Esforço: baixo.**

### P1 — Reconciliar personas e papéis

7. **Criar os papéis reais "Administrador Forzy" e "TI/Governança"** em `ROLES` (`seed.ts:95`) com linha própria em `PERM`, e reconciliar a persona "Usuário cliente". Hoje colapsam em Gerente/Analista, e papel sem linha cai em `none` silenciosamente. **Esforço: médio.**

### P2 — Polimento

8. **Empty-state e meta configurável.** Se `dici` vazio, mostrar "Nenhum ativo no ciclo D-I-C-I" em vez de `0%`. A meta "95%" (hoje string fixa, `Overview.tsx:28`) deveria vir de `s.settings`. **Esforço: baixo.**

9. **Conformidade clicável.** Cada KPI/barra deveria drillar para D-I-C-I **filtrado** pelo status/planta clicados (ex.: clicar "Pendentes" → D-I-C-I filtrado em pendente), tornando o pulso acionável. **Esforço: médio.**

### Como isto liga a governança às operações reais

O fio condutor: **todo número desta tela deve rastrear a uma fonte do store, todo card a um destino gated, e toda escrita nos drills a um evento de auditoria espelhado aqui.** Assim a Visão Geral deixa de ser um painel decorativo e vira o **cockpit operacional** que conecta conformidade documental (D-I-C-I) → procedência do dado (Dicionário → motor de alertas) → quem pode agir (RBAC → Sidebar/rotas) → onde isso vive na planta (Hierarquia → breadcrumb-matriz) — fechando o ciclo US-13 com rastreabilidade ponta a ponta.
