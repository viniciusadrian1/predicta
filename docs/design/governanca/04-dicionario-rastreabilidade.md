# Tela 04 — Dicionário de Rastreabilidade (PREDICTA · FORZY)

> Documento de design de produto + arquitetura da informação + governança. Tela do módulo **Governança**, rota `/governanca/dicionario`, arquivo `src/pages/governanca/Dicionario.tsx`.
> Cobre **US-13** (governança de acessos/dados/rastreabilidade — a US central desta etapa), **US-3** (dado raw / base histórica) e **US-4** (sensores V/A/RPM/°C).
> Continuidade: alinhado à espinha de governança em `docs/design/00-governanca-espinha.md` (Tela 19) — este documento **aprofunda** aquela tela, promovendo-a de "dicionário de tags" para **matriz de rastreabilidade de produto**.

---

## 1. Nome da tela

**Dicionário de Rastreabilidade** — `/governanca/dicionario`

Breadcrumb atual (estático): `Governança › Dicionário de Rastreabilidade` (via `usePageChrome([...])`, `Dicionario.tsx:37`).

O nome já vendido na UI ("Dicionário de Rastreabilidade", e não "Dicionário de Tags") é uma **promessa de produto que o código ainda não cumpre**: hoje a tela é só o dicionário de tags de sensor. Este documento trata o nome como **roadmap**: a tela deve RELACIONar, e não apenas LISTAR.

---

## 2. Objetivo da tela

**Objetivo-alvo:** ser a **matriz de rastreabilidade única do Predicta** — o lugar onde um auditor, gestor ou TI/Governança consegue responder, em uma tela, à pergunta de US-13:

> "De onde vem este número, qual sensor o mede, qual limite o governa, qual modelo de ML o usa, qual alerta ele dispara, qual ação isso gera, e qual perfil pode ver/editar tudo isso?"

Ou seja, fechar a cadeia **US ↔ requisito ↔ módulo ↔ tela ↔ componente ↔ sensor/tag ↔ modelo de ML ↔ alerta ↔ ação ↔ perfil**, mantendo o dicionário de tags como **uma das entidades** dessa matriz (não a única).

### Reconhecimento do estado atual (o que JÁ EXISTE)

A tela hoje é **funcional, acoplada ao motor e gated por RBAC** — não é maquete. Inventário real:

| Capacidade | Onde mora | Estado |
|---|---|---|
| Tabela do **dicionário de tags** (6 grandezas) | `Dicionario.tsx:59-89`, seed `SEED_DICTIONARY` (`seed.ts:130-137`) | Funcional. Colunas: ID Tag · Grandeza · Sensor(rótulo+unidade) · Faixa · Limite Alerta · Limite Crítico · Direção · Aplicável a |
| **Edição de limites** que muda alertas em tempo real | `numField()` (`Dicionario.tsx:23-28`), `upsertTag` (`useStore.ts:140`) | Funcional e **acoplado ao motor**: `evaluateAlerts` (`simulation.ts:122-147`) lê `tag.limiteAlerta/limiteCritico/direcao` a cada tick (1 s) |
| **Gating por papel** (full edita, read vê com cadeado) | `useCan("Governança","full")` (`Dicionario.tsx:20`), banner (`:46-50`) | Funcional. `read` → `<span>` + selo `Lock`; `full` → `<input>`/`<select>` |
| **Add/remove tag** + **export CSV** | `novaEntrada` (`:30-34`), `removeTag` (`useStore.ts:149`), `exportar`→`downloadCSV` (`:35`) | Funcional, gated por `canEdit` |

**Honestidade do estado atual — o que NÃO existe ainda (e este doc propõe):**
1. A "rastreabilidade" do nome **não está visualizada**: a tela não mostra o caminho tag → alerta → ação → ativo → perfil. O acoplamento existe no motor mas é **invisível ao usuário**.
2. O campo de **busca não filtra** (`Dicionario.tsx:52-56` é um `<input>` sem `onChange` ligado a estado).
3. As demais "entidades de rastreabilidade" (US, requisitos, módulos, telas, componentes, modelos de ML, perfis) **não existem como dados** — só a entidade Tag existe.
4. **Sem trilha de auditoria**: editar um limite (ação que muda alarmística) não registra quem/quando/de→para.

---

## 3. Usuários/perfis que acessam

Módulo governado: **`Governança`** (RBAC em `src/auth/rbac.ts` · `useCan(modulo, nivel)` → `none`/`read`/`full`). Reconciliação dos perfis obrigatórios com os papéis reais do seed (`ROLES`, `PERM`, `SEED_USERS` em `seed.ts`):

| Persona obrigatória | Papel real (seed) | Nível `Governança` (PERM) | Comportamento nesta tela |
|---|---|---|---|
| **Administrador Forzy** | *(papel a criar — hoje aproximado por "Gerente Industrial")* | `full` | Edita limites, add/remove tag, edita relações da matriz, exporta |
| **Gestor industrial** | `Gerente Industrial` | `full` (`PERM`/`seed.ts:98`) | Idem acima — visão completa de rastreabilidade |
| **TI/Governança** | *(papel a criar — `Governança:full` + foco em auditoria)* | `full` | **Persona-alvo desta tela**: audita a cadeia dado→decisão, valida procedência |
| **Técnico de manutenção** | `Técnico Manutenção` | `none` (`seed.ts:100`) | **Não vê o módulo** (Sidebar oculta; rota cai em `Gate` "Acesso negado") |
| **Usuário cliente** | `Analista de Dados` | `full` (`seed.ts:101`) | Edita tags (foco em definição de grandezas); deveria ser `read` na matriz de produto |
| *(adicional)* Eng. Confiabilidade | `Eng. Confiabilidade` | `read` (`seed.ts:99`) | Lê limites como `<span>`, selo `Lock`; consulta rastreabilidade, não edita |

**Lacuna de governança a reconciliar (§9):** `Analista de Dados` com `Governança:full` pode editar limites que disparam alertas em produção — isso deveria ser **`read` na matriz de produto** mas `full` apenas no sub-escopo "definição de tag". Hoje o RBAC é por módulo inteiro, sem sub-escopo. Recomendação: separar a permissão de **editar limite** (afeta alarmística → crítico) da de **navegar a rastreabilidade** (leitura).

> **Auto-governança:** quem edita esta tela edita a alarmística de todo o produto. A própria edição precisa ser auditada (ver §7 e §9), tornando esta tela tão sensível quanto a RBAC.

---

## 4. User stories da Forzy cobertas

| US | Como esta tela cobre | Âncora no código |
|---|---|---|
| **US-13** (núcleo — governança de acessos/dados/rastreabilidade) | É a **matriz de rastreabilidade**: relaciona US↔requisito↔módulo↔tela↔componente↔tag↔modelo↔alerta↔ação↔perfil; toda edição é gated e (a refinar) auditada | Toda a tela; `useCan` (`:20`) |
| **US-4** (sensores V/A/RPM/°C) | Define cada grandeza física como **tag canônica**: tipo, unidade, faixa, limite, direção, sensor físico | `SEED_DICTIONARY` (`seed.ts:130-137`); `TAG_LABEL`/`TAG_UNIT` (`types.ts:27-38`) |
| **US-3** (dado raw / base histórica) | O dicionário é o **esquema** do dado bruto que alimenta a base histórica: define faixaMin/Max e tipo (`Float`/`Integer`) de cada amostra | `Tag` (`types.ts:107-120`); `TelemetrySample` (`types.ts:62-70`) é instância do esquema |
| US-7 / US-8 / US-9 (suporte) | Todo gráfico, baseline e detector de anomalia **referenciam estas definições** de grandeza/unidade/faixa | `readingFromState`, `residual` (`simulation.ts:32-37`) usam as tags |
| US-10 / US-11 / US-12 (suporte) | A coluna "Modelo de ML" da matriz expandida liga tag→modo de falha→predição→ação de manutenção→sugestão do Assistente | `TAG_OF_MODE` (`degradation.ts:74`); `predict` (`engine/prediction.ts`) |

---

## 5. Estrutura da tela

### 5.1 Estrutura ATUAL (o que está renderizado hoje)

```
Topbar: [breadcrumb] Governança › Dicionário de Rastreabilidade        [Nova entrada] [Exportar]
─────────────────────────────────────────────────────────────────────────────
Banner de estado de edição (steel se full / slate+Lock se read)
[ 🔍 Buscar campo, sensor, unidade... ]   ← input SEM filtro funcional
┌──────────────────────────────────────────────────────────────────────────┐
│ ID Tag │ Grandeza │ Sensor │ Faixa │ Lim.Alerta │ Lim.Crítico │ Direção │ Aplicável a │ ✕ │
│ TAG-001│ Temp.Mancal │ Temperatura(°C) │ 0–120 │ [75] │ [80] │ acima │ Rotativos │ 🗑 │
│ ...6 linhas...                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Estrutura PROPOSTA (matriz de rastreabilidade — §9 detalha o impacto)

Layout em **3 zonas**: filtros transversais · tabela-matriz filtrável · painel de relação (drill lateral).

```
┌── Zona A: Filtros de rastreabilidade ───────────────────────────────────────┐
│ [Entidade ▾: Tag|US|Requisito|Módulo|Tela|Modelo|Alerta|Ação|Perfil]        │
│ [Buscar... 🔍 (funcional)]  [Ativo ▾]  [Perfil ▾]  [Origem: regra|modelo]   │
├── Zona B: Tabela-matriz (aba ativa = Tags por default) ──────────────────────┤
│ Tag │ Sensor │ Limite │→ gera Alerta │→ Modelo ML │→ Ação │ Perfis que veem  │
├── Zona C: Painel de relação (abre ao clicar uma linha) ──────────────────────┤
│  Cadeia de procedência do dado → decisão (mini-grafo / breadcrumb de tag)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Abas da matriz (cada uma é uma "lente" sobre o mesmo grafo de rastreabilidade):**

| Aba | Eixo principal | Pergunta que responde |
|---|---|---|
| **Tags** (default — mantém a tela atual) | Tag/Sensor | "Que grandeza é esta e que limite a governa?" |
| **Tag → Alerta** | Tag → regra → alerta | "Qual alerta este limite dispara?" (origem do dado → decisão) |
| **Cobertura de US** | US-1..US-13 → módulo/tela/componente | "Que código atende cada user story da Forzy?" |
| **Modelos de ML** | Modo de falha → tag → predição → ação | "Que modelo usa esta tag e que ação ele recomenda?" |
| **Acesso (RBAC)** | Entidade → perfil | "Quem pode ver/editar cada artefato?" |

---

## 6. Dados e entidades mostradas

### 6.1 Entidade Tag (existe hoje — fonte canônica de limites)

Estrutura real `Tag` (`types.ts:107-120`), instanciada em `SEED_DICTIONARY`:

| Campo | Tipo | Exemplo (TAG-002) | Papel na rastreabilidade |
|---|---|---|---|
| `id` | string | `TAG-002` | Identificador canônico (mono `JetBrains Mono`, `C.steel`) |
| `key` | `TagKey` | `vib` | Liga ao motor: `twin.state[tag.key]` (`simulation.ts:126`) |
| `campo` | string | `Vibração RMS` | Rótulo humano |
| `tipo` | string | `Float` | Esquema do dado raw (US-3) |
| `un` | string | `mm/s` | Unidade (US-4) |
| `faixaMin`/`faixaMax` | number | `0` / `15` | Faixa válida do sensor |
| `limiteAlerta` | number | `4.5` | **Limite âmbar** — dispara alerta `alto` |
| `limiteCritico` | number | `7.1` | **Limite vermelho** — dispara alerta `crítico` |
| `direcao` | `"acima"\|"abaixo"` | `acima` | Sentido da violação (`simulation.ts:127-128`) |
| `ativo` | string | `Rotativos` | Classe de ativo aplicável |
| `sensor` | string | `Acelerômetro MEMS` | **Procedência física do dado** |

As 6 tags do seed (`seed.ts:131-136`): TAG-001 Temperatura do Mancal (PT100) · TAG-002 Vibração RMS (Acelerômetro MEMS) · TAG-003 Pressão de Saída (Transdutor 4-20mA, direção `abaixo`) · TAG-004 Corrente Elétrica (TC Split-core) · TAG-005 RPM (Encoder Hall) · TAG-006 Nível de Óleo (Ultrassônico, direção `abaixo`).

### 6.2 A cadeia REAL tag → modo de falha → alerta (já no código — basta visualizar)

Esta é a relação mais valiosa para tornar a governança **visual e não abstrata**. Ela já existe espalhada no motor; a tela deve materializá-la:

| Tag (key) | Modo de falha (`TAG_OF_MODE` invertido, `degradation.ts:74`) | Título do alerta-regra (`RULE_TITLE`, `simulation.ts:56`) | Tipo (`RULE_TIPO`, `:64`) | Severidade |
|---|---|---|---|---|
| `temp` | Isolamento / Térmico | "Temperatura Elevada no Mancal" | Térmico | alerta→`alto`, crítico→`critico` |
| `vib` | Rolamento | "Vibração Acima do Limite" | Mecânico | idem (regra de `simulation.ts:131-139`) |
| `press` | Cavitação | "Pressão Abaixo do Setpoint" | Processo | direção `abaixo` |
| `corrente` | *(override por ativo)* | "Sobrecorrente Detectada" | Elétrico | usa `asset.limites?.corrente` (`seed.ts:164-167`) |
| `rpm` | Desalinhamento | "Rotação Fora do Padrão" | Mecânico | — |
| `oleo` | Lubrificação | "Nível de Óleo Baixo" | Manutenção | direção `abaixo` |

> **Insight de governança:** a coluna "Corrente" prova a necessidade de rastreabilidade visual. O limite genérico do dicionário (50 A) é um valor de motor pequeno; o motor usa **override por ativo** escalado ao FLA da placa (`seed.ts:164-167`, `flaFromKw`). Sem visualizar isso, um auditor olha o dicionário e conclui erradamente que a Turbina (25 MW) está sempre em sobrecorrente. A tela precisa mostrar **limite efetivo por ativo**, não só o limite-base.

### 6.3 Entidades da matriz expandida (a criar — semente proposta)

| Entidade | Origem do dado | Já existe? |
|---|---|---|
| **User Story** (US-1..US-13) | Constante nova `SEED_TRACEABILITY` | Não — proposta |
| **Requisito** | Deriva da US | Não |
| **Módulo** | `MODS` (`seed.ts:96`) | **Sim** |
| **Tela/rota** | `src/routes.tsx` | Sim (a indexar) |
| **Componente** | Caminhos `src/pages/...` | Sim (a indexar) |
| **Sensor/Tag** | `SEED_DICTIONARY` | **Sim** |
| **Modelo de ML** | `engine/prediction.ts` (físico-informado + Weibull, **simulado**) | Sim (a rotular) |
| **Alerta** | `RULE_TITLE`/`evaluateAlerts` | **Sim** (derivável) |
| **Ação** | resolver/analisar alerta, manutenção planejada | Parcial |
| **Perfil** | `ROLES`/`PERM` (`seed.ts:95-103`) | **Sim** |

---

## 7. Ações possíveis

| Ação | Quem (RBAC) | Estado atual | Efeito / governança |
|---|---|---|---|
| **Editar `limiteAlerta`/`limiteCritico`** | `Governança:full` | ✅ existe (`numField`, `:23-28`) | **Muda alarmística em tempo real** (`evaluateAlerts` no próximo tick). Ação mais sensível da tela → **deve ser auditada** |
| **Editar `direcao`** | `full` | ✅ existe (`:78-82`) | Inverte o sentido da violação — idem, crítico |
| **Adicionar tag** | `full` | ✅ existe (`novaEntrada`, `:30-34`) | Cria `TAG-90x`; passa a ser avaliada pelo motor |
| **Remover tag** | `full` | ✅ existe (`removeTag`, `:84`) | Some a regra de alerta correspondente; **deve avisar alertas órfãos** |
| **Exportar CSV** | qualquer com acesso à tela | ✅ existe (`exportar`, `:35`) | Snapshot do dicionário; estende-se à matriz completa |
| **Buscar/filtrar** | qualquer | ⚠️ input inerte (`:52-56`) | **A implementar** (filtro funcional por campo/sensor/ativo/perfil) |
| **Drill "tag → alerta"** | qualquer com leitura | ❌ não existe | **Propor**: clicar a tag abre painel com regra, ativos afetados, alertas abertos, perfil que recebe |
| **Navegar a entidade relacionada** | conforme RBAC do alvo | ❌ não existe | **Propor**: linha da matriz linka para `/ativos/:id`, `/alertas`, `/governanca/rbac` etc. |
| **Selo de procedência do modelo** | leitura | ❌ não existe | **Propor**: badge "modelo SIMULADO, não treinado em falhas reais" na linha de ML |

---

## 8. Relação com o restante do produto

Esta tela é o **hub de rastreabilidade**; nenhuma outra mostra a cadeia inteira. Conexões reais:

- **→ Motor / Alertas (Telemetria → Decisão):** o vínculo mais forte e **já implementado**. `evaluateAlerts` (`simulation.ts:122-147`) lê cada `Tag` do dicionário a cada tick; editar um limite aqui faz nascer/resolver um alerta em `/alertas`. O dicionário é a **origem do dado-de-controle**; o alerta é a **decisão**. Esta tela deve tornar essa ponte explícita (origem→decisão).
- **→ Ativos:** o limite **efetivo** combina a tag-base com `asset.limites?.[tag.key]` (override por FLA, `seed.ts:164-167`). A matriz deve mostrar "limite-base × override por ativo".
- **→ Cadastro/OCR (US-5):** um ativo recém-cadastrado herda as tags por classe (`tag.ativo`). A rastreabilidade liga a placa OCR → classe → tags aplicáveis.
- **→ Hierarquia (breadcrumb-matriz):** o "breadcrumb de tag" (`Dicionário › Vibração RMS › limite 7.1 mm/s → ALT-2025-0847`) é o análogo, no eixo do dado, do breadcrumb empresa→planta→ativo (espinha §43-49 do doc 00).
- **→ RBAC:** a coluna "Perfis que veem/editam" cruza cada entidade com `PERM` — fecha a US-13 (acesso por perfil rastreável).
- **→ Assistente IA (US-12):** quando o Assistente sugere solução de falha, deve citar a **tag e o limite daqui** como evidência. Esta tela é o denominador de confiança da explicação.
- **→ Espinha transversal `<TraceableValue>`** (doc 00 §51-57): todo número exibido no produto (KPI, card de alerta, detalhe do ativo) faz hover/click e abre **uma linha desta tela**. Esta tela é o **destino** de toda rastreabilidade de número.

---

## 9. Melhorias sobre o wireframe base

Cada item aponta arquivo/componente real e prioriza tornar a governança **visual, navegável e ligada à operação**.

### P0 — Visualizar a cadeia tag → alerta (origem do dado → decisão) — US-13, US-4
Hoje o acoplamento dicionário→motor é invisível. Criar uma **aba/painel "Tag → Alerta"** que, para a linha selecionada, renderize um mini-fluxo derivado do código:
`Sensor (campo `sensor`) → Tag (key) → Limite (alerta/crítico) → Regra (RULE_TITLE/RULE_TIPO) → Severidade → Ativos afetados (cruza `asset.limites`) → Alertas abertos (filtra `alerts` por `tag===key`) → Perfis que recebem (PERM × módulo Alertas)`.
**Impacto:** novo `src/components/governanca/TagTraceCard.tsx` lendo `useStore(s=>({dictionary,alerts,assets,rbac}))`; deriva a cadeia das constantes já existentes (`RULE_TITLE`/`RULE_TIPO`/`TAG_OF_MODE`). **Esforço: médio.**

### P0 — Auditar edição de limite (a ação altera alarmística) — US-13
Editar `limiteAlerta`/`limiteCritico`/`direcao` muda a alarmística de produção sem registro. Encaixar `logAudit` em `upsertTag`/`removeTag` (`useStore.ts:140,149`), gravando `{ts, actor: session.nome, entidade: tag.id, campo, de, para}`. É o evento de governança mais crítico desta tela (par com a célula RBAC).
**Impacto:** slice `auditLog` no store + wrapper nas 2 ações (alinhado ao doc 00 §319-327). **Esforço: médio.**

### P0 — Mostrar limite EFETIVO por ativo (resolver o falso-positivo da Corrente) — US-4
A tabela exibe só o limite-base; o motor usa override por ativo (`asset.limites`, `seed.ts:164-167`). Adicionar coluna/expansão "Limite efetivo por ativo" para que o auditor não conclua erradamente que a Turbina vive em sobrecorrente.
**Impacto:** join `dictionary × assets.limites` em `Dicionario.tsx`; linha expansível. **Esforço: baixo.**

### P1 — Tornar a busca funcional + filtros de rastreabilidade — US-13
O input de busca (`Dicionario.tsx:52-56`) não filtra. Ligar a estado e adicionar filtros por **ativo aplicável**, **perfil** e **origem (regra|modelo)**, virando a barra de filtros da Zona A (§5.2).
**Impacto:** `useState`+`useMemo` de filtro em `Dicionario.tsx`. **Esforço: baixo.**

### P1 — Aba "Cobertura de User Stories" (US ↔ módulo ↔ tela ↔ componente) — US-13, US-1
Materializar a matriz de rastreabilidade de produto numa constante `SEED_TRACEABILITY` (US → requisito → MODS → rota → componente → tags/modelos relacionados). Vira tabela filtrável + visual de cobertura (heatmap de US atendidas).
**Impacto:** nova constante em `src/data/traceability.ts`; aba na tela. **Esforço: médio.**

### P1 — Selo de procedência do modelo de ML (honestidade da IA) — US-8/9/10
Onde a matriz cita modelo de ML, exibir badge **"Modelo de degradação SIMULADO (físico-informado + Weibull) — não treinado em falhas reais"** (interface `PredictionModel`, `engine/prediction.ts`). O selo troca automaticamente quando um modelo treinado for plugado. A Governança é guardiã desse selo (doc 00 §332-333).
**Impacto:** badge lendo o tipo de modelo ativo. **Esforço: baixo.**

### P1 — Avisar alertas/ativos órfãos ao remover tag — US-13
`removeTag` some com a regra silenciosamente. Antes de remover, contar ativos/alertas que dependem da tag e confirmar.
**Impacto:** guard em `removeTag`/`novaEntrada` + diálogo. **Esforço: baixo.**

### P2 — Validação de coerência de limites — US-4
Validar `faixaMin ≤ limiteAlerta/Critico ≤ faixaMax` e coerência com `direcao` (`acima` ⇒ crítico ≥ alerta; `abaixo` ⇒ crítico ≤ alerta — note TAG-003 e TAG-006 invertem). Bloquear/avisar valores incoerentes que tornariam a regra inalcançável.
**Impacto:** validação em `numField`/`patch` (`Dicionario.tsx:22-28`). **Esforço: baixo.**

### P2 — Breadcrumb de tag clicável + `<TraceableValue>` transversal — US-13
Transformar o breadcrumb estático em caminho de rastreabilidade clicável e expor `<TraceableValue tagKey value>` (doc 00 §51-57) que aponta de volta para a linha desta tela — fechando "todo número rastreia ao Dicionário".
**Impacto:** `src/components/governanca/TraceableValue.tsx`; aplicar em Telemetria/Alertas/Ativos. **Esforço: médio.**

---

> **Resumo da tese:** a tela já é o **coração funcional** da rastreabilidade (acopla dicionário→motor→alerta em tempo real), mas hoje só **lista** tags. As melhorias acima a transformam no que o nome promete — uma **matriz de rastreabilidade de produto visual e navegável** — sem perder o dicionário de tags como entidade central, e sem violar a identidade dark-industrial (tokens `C.*` de `src/lib/theme.ts`, Rajdhani/JetBrains Mono/Inter).
