# Tela 03 — D-I-C-I (`/governanca/dici`) · PREDICTA · FORZY

> Documento de design de produto + arquitetura da informação + governança. Voz de Lead Product Designer / Systems Designer sênior, ancorada no **código real** do repositório. Cobre **US-3, US-8, US-9, US-10, US-11 e US-13**.
>
> **Aviso conceitual (lê-se antes de tudo):** existe uma **colisão de significados** sobre a sigla "D-I-C-I" neste produto que esta tela precisa resolver — não esconder. Ver §2.

---

## 1. Nome da tela

**D-I-C-I — Da Leitura à Decisão (Pirâmide DIKW do ativo)**
Rota: `/governanca/dici` · Breadcrumb publicado: `["Governança","Matriz D-I-C-I"]` (`src/pages/governanca/DICI.tsx:30`).

A tela tem **dois sentidos legítimos de "D-I-C-I"** no Predicta, e o nome precisa carregar essa decisão de produto explicitamente:

| Sigla | Leitura | Onde vive hoje | Papel na governança |
|---|---|---|---|
| **D-I-C-I (DIKW)** — *pedido nesta etapa* | **D**ado → **I**nformação → **C**onhecimento → **I**nteligência/Ação | **Não existe ainda** (a especificar aqui) | Rastreabilidade do **fluxo do dado** sensor → modelo → decisão |
| **D-I-C-I (ciclo documental)** — *implementado* | **D**esenho · **I**nstalação · **C**omissionamento · **I**nspeção | `DICI.tsx`, `DICI`/`SEED_DICI` (`src/data/seed.ts:77`), `setDici` (`useStore.ts:173`) | Ciclo de vida **documental** do ativo (conformidade) |

Decisão de produto proposta (detalhada em §9): **renomear o artefato implementado para "Ciclo do Ativo"** e promover a **pirâmide DIKW como o D-I-C-I oficial** da governança — mantendo ambos como **duas abas/visões do mesmo módulo**, porque rastreiam coisas diferentes e complementares (o *fluxo do dado* vs. o *ciclo do artefato*).

---

## 2. Objetivo da tela

### 2.1 Objetivo-alvo (DIKW)
Tornar **visível e auditável o caminho que cada número percorre** dentro do Predicta — da leitura crua do sensor até a Ordem de Serviço — e ancorar cada camada num **arquivo/componente real** do motor. A tela responde a uma pergunta de governança que hoje **nenhuma tela responde**: *"a recomendação que aciona um técnico veio de onde, passando por quais transformações, e quem/o-quê é responsável por cada salto?"*

A pirâmide DIKW mapeada às camadas reais do Predicta:

| Camada DIKW | No domínio industrial | Camada real no código | Artefato concreto |
|---|---|---|---|
| **D — Dado** | Leitura raw do sensor (V, A, RPM, °C, bar, %óleo) | `engine/model.ts` → `readingFromState()` (`model.ts:72`); tags definidas no Dicionário (`SEED_DICTIONARY`) | `TelemetrySample` (temp, vib, press, corrente, rpm, oleo) |
| **I — Informação** | Telemetria contextualizada + baseline + limites | Dicionário (faixa/limite/direção) + `evaluateAlerts` lendo limites; baseline `baseTemp/baseVib/...` (`model.ts:47-61`) | Série temporal + faixa nominal + desvio vs. baseline |
| **C — Conhecimento** | Saúde, anomalia, modo crítico, **RUL** | `healthFromDamage` (`model.ts:20`), `worstMode` (`model.ts:35`), `computeRUL` + `failureCurve` (`engine/prediction.ts:39,56`) | `AssetTwin.health/status/modoCritico/rulDias/probFalha` |
| **In — Inteligência/Ação** | Recomendação → OS → manutenção planejada | `recommendationsFor()` (`src/lib/recommendations.ts:35`) → `applyMaintenance(assetId, modo)` | `Recommendation{ modo, pri, acao, motivo, prazoDias }` → OS |

> **Honestidade da IA (transversal, obrigatória nesta tela):** a transição **C → In** depende de um **modelo de degradação SIMULADO** — `Predicta Digital Twin Engine v1`, *"Degradação físico-informada + Weibull"* (`prediction.ts:62-63`), **não treinado em falhas reais**. A tela DIKW é o lugar canônico para **expor essa procedência**: o nó "Conhecimento" carrega o selo do `predictionModel.name`/`.metodo`, e a interface `PredictionModel` (`prediction.ts:25`) já permite trocar por um modelo treinado — quando isso ocorrer, o selo troca sozinho.

### 2.2 Estado atual reconhecido (o que JÁ EXISTE — sem fingir)
O `DICI.tsx` **hoje implementa o ciclo documental**, não a pirâmide DIKW:
- Tabela `ativo × {D,I,C,In}` onde cada célula é um `DiciStatus` (`aprovado | em_revisao | pendente`, `lib/types.ts:13`).
- Clique cicla `aprovado → em_revisao → pendente → aprovado` (`NEXT`, `DICI.tsx:12`), **gated** por `useCan("Governança","full")` (`DICI.tsx:22`).
- 4 cards-resumo contam status por coluna; export CSV via `downloadCSV` (`DICI.tsx:28`).
- Banner declara textualmente: *"D-I-C-I: ciclo de vida documental"* (`DICI.tsx:40`).

Logo, o produto **já tem** um D-I-C-I funcional — mas é **outro conceito** do pedido. Esta especificação **não reescreve por cima fingindo equivalência**: ela (a) projeta a visão DIKW pedida e (b) reconcilia honestamente com o ciclo documental existente como **duas visões coexistentes** do módulo (§9).

---

## 3. Usuários/perfis que acessam

Módulo governado: **`Governança`** (gate em `routes.tsx` via `Gate modulo="Governança"`). Reconciliação dos perfis RBAC obrigatórios com os papéis reais do seed (`ROLES`, `SEED_USERS`):

| Persona (obrigatória) | Papel real no seed | Nível Governança | O que vê/faz nesta tela |
|---|---|---|---|
| **Administrador Forzy / TI–Governança** | (papel a criar; hoje aproxima-se de *Gerente Industrial*) | `full` | Edita ciclo do ativo (ciclar status), enxerga a procedência DIKW completa, audita saltos, valida selo do modelo |
| **Gestor industrial** | `Gerente Industrial` | `full` | Edita ciclo documental + lê o fluxo DIKW como leitura de risco/decisão |
| **Eng. Confiabilidade** | `Eng. Confiabilidade` | `read` | Lê o fluxo DIKW (foco em C→In: RUL, anomalia, recomendação) + exporta CSV; **não cicla** status |
| **Analista de Dados** | `Analista de Dados` | `full`/`read` | Foco D→I (qualidade do dado, baseline, tags); audita procedência do número |
| **Técnico de manutenção** | `Técnico Manutenção` | `none` | **Não vê o módulo** (Sidebar oculta; rota cai no `Gate` "Acesso negado") — porém recebe o **resultado** (a OS) no módulo Alertas/Ativos |
| **Usuário cliente / Operador** | `Operador Campo` | `none` | Idem — bloqueado na Governança, consome a ação a jusante |

Convenção de degradação por permissão (padrão único da espinha): `full` → editável; `read` → somente-leitura com selo `Lock`; `none` → `Gate` "Acesso negado". O código já aplica isto via `disabled={!canEdit}` nas células (`DICI.tsx:81`); a tela DIKW herda a mesma convenção.

---

## 4. User stories da Forzy cobertas

| US | Cobertura nesta tela |
|---|---|
| **US-3** (dado raw / base histórica) | É a **camada D**: a tela mostra a origem raw (`readingFromState`) e que toda informação parte do dado bruto + base histórica |
| **US-8** (ML baseline) | Camada **I → C**: baseline `baseTemp/baseVib/...` é o referencial contra o qual o desvio vira informação |
| **US-9** (ML anomalia) | Camada **C**: anomalia = desvio vs. baseline materializado em `damage[mode]` e `health` |
| **US-10** (ML parada/manutenção) | Camada **C → In**: `computeRUL`/`failureCurve` (parada provável) → recomendação |
| **US-11** (manutenção planejada) | Camada **In**: `recommendationsFor` → `prazoDias` → OS planejada → `applyMaintenance` |
| **US-13** (governança central) | **Núcleo da tela**: rastreabilidade dado→decisão + procedência do modelo + ciclo de vida do artefato + gating por papel |

Suporte indireto: **US-4** (V/A/RPM/°C são as tags da camada D), **US-12** (o Assistente cita esta cadeia ao explicar uma falha).

---

## 5. Estrutura da tela

Proposta: **módulo com duas abas** no topo (segmented control), reusando `usePageChrome`. Aba default = **Fluxo (DIKW)**; aba secundária = **Ciclo do Ativo** (o atual `DICI.tsx`, preservado).

### 5.1 Aba "Fluxo (DIKW)" — a visão pedida (a especificar/construir)

| Bloco | Conteúdo | Ancoragem real |
|---|---|---|
| **Banner de procedência** | Selo do modelo ativo + nota de honestidade | `predictionModel.name`/`.metodo` (`prediction.ts:62`) |
| **Pirâmide / fluxo horizontal (4 estágios)** | Cards D → I → C → In ligados por setas (`ChevronRight`, mesmo separador do breadcrump/árvore) | Cada card abre o arquivo/função responsável |
| **Seletor de ativo** | Dropdown de ativo (escopo) → o fluxo se instancia com **números vivos** daquele twin | `useStore(s=>s.assets/twins)` |
| **Painel de evidência por estágio** | Ao clicar um estágio: entradas, transformação, saídas, **responsável** (sensor/engine/modelo/papel) | tabela §6 |
| **Trilha "deste número até a regra"** | Mini-breadcrumb de rastreabilidade do valor selecionado | liga ao Dicionário (`/governanca/dicionario`) |

Detalhe de cada **estágio** (card) na aba Fluxo:

| Estágio | Cor (token) | Entrada | Transformação (função real) | Saída | Responsável (procedência) |
|---|---|---|---|---|---|
| **D — Dado** | `C.steel` (dado/realtime) | sinal físico do sensor | `readingFromState()` `model.ts:72` | `TelemetrySample` raw | Sensor físico (PT100, MEMS, encoder...) — tag no Dicionário |
| **I — Informação** | `C.steel`→`C.slate` | raw + faixa/limite/baseline | `baseTemp/Vib/Press/...` + Dicionário | telemetria contextualizada + desvio | Dicionário (engenharia define limites) |
| **C — Conhecimento** | `C.yellow` (atenção) | desvio + carga | `healthFromDamage`/`worstMode`/`computeRUL`/`failureCurve` | health, status, modoCritico, RUL, probFalha | **Modelo SIMULADO** (selo de honestidade) |
| **In — Inteligência/Ação** | `C.cobalt` (ação) | RUL + damage por modo | `recommendationsFor()` `recommendations.ts:35` | Recomendação (acao, motivo, prazoDias, pri) → OS | Técnico (executa) + Gestor (planeja) |

### 5.2 Aba "Ciclo do Ativo" — a visão atual (preservada, renomeada)

Exatamente a tabela hoje em `DICI.tsx` (`ativo × {D,I,C,In}` de conformidade documental), com o banner ajustado para **"Ciclo do Ativo: Desenho · Instalação · Comissionamento · Inspeção"**:

| Coluna | Significado | Status possíveis | Editável? |
|---|---|---|---|
| **Desenho** (`D`) | Projeto/desenho de engenharia entregue | aprovado / em_revisao / pendente | `full` cicla; `read`/`none` lê |
| **Instalação** (`I`) | Ativo instalado em campo | idem | idem |
| **Comissionamento** (`C`) | Comissionado e aceito | idem | idem |
| **Inspeção** (`In`) | Inspeção periódica em dia | idem | idem |

4 cards-resumo (contagem por status por coluna) + tabela + export CSV — **inalterados**.

---

## 6. Dados e entidades mostradas

### 6.1 Aba Fluxo (DIKW) — entidades por estágio

| Entidade | Tipo / campos | Origem no código |
|---|---|---|
| `TelemetrySample` | `{ temp, vib, press, corrente, rpm, oleo, t }` | `model.ts` (`readingFromState`) |
| `Tag` (Dicionário) | `campo, un, faixaMin/Max, limiteAlerta, limiteCritico, direcao, sensor, ativo` | `SEED_DICTIONARY` |
| `AssetTwin` | `damage[5 modos], health, status, modoCritico, rulDias, probFalha, cargaPct` | `lib/types.ts`, derivado em `model.ts`/`prediction.ts` |
| `Prediction` | `{ rulDias, probFalha: ProbPoint[], modoCritico }` | `prediction.ts:19` |
| `PredictionModel` | `{ name, metodo, predict() }` — **a procedência** | `prediction.ts:25,61` |
| `Recommendation` | `{ modo, pri, acao, motivo, prazoDias, damage }` | `recommendations.ts:10` |
| `FailureMode` | `rolamento | desalinhamento | lubrificacao | isolamento | cavitacao` | `lib/types.ts` |

### 6.2 Aba Ciclo do Ativo — entidades (estado atual)

| Entidade | Campos | Origem |
|---|---|---|
| `DiciRow` | `{ id, nome, D, I, C, In }` | `lib/types.ts:141`, seed `DICI` (`seed.ts:77`) |
| `DiciStatus` | `aprovado | em_revisao | pendente` | `lib/types.ts:13` |

Seed atual (6 ativos): `BCP-01`, `CA-03`, `ME-07`, `RV-12`, `VT-05`, `TG-01`.

---

## 7. Ações possíveis

| Ação | Aba | Gate (RBAC) | Efeito real | Ancoragem |
|---|---|---|---|---|
| **Selecionar ativo** (instancia o fluxo) | Fluxo | qualquer `read+` | Recalcula os 4 estágios com números do twin | `useStore` |
| **Inspecionar estágio** (drill) | Fluxo | `read+` | Abre painel de evidência (entrada→transformação→saída→responsável) | — (a construir) |
| **Rastrear número até a regra** | Fluxo | `read+` | Abre linha do Dicionário / navega `/governanca/dicionario` | espinha "todo número rastreia ao Dicionário" |
| **Ver procedência do modelo** | Fluxo | `read+` | Mostra `name`/`metodo` + selo de honestidade | `prediction.ts:62` |
| **Saltar para a OS/recomendação** | Fluxo | conforme módulo destino | Navega ao detalhe do ativo / Alertas; `applyMaintenance` exige permissão | `recommendations.ts` |
| **Ciclar status** (D/I/C/In) | Ciclo do Ativo | `Governança:full` | `setDici(...)` muta store persistido | `DICI.tsx:24-27` |
| **Exportar CSV** | Ciclo do Ativo | `read+` | `downloadCSV` | `DICI.tsx:28` |

---

## 8. Relação com o restante do produto

A tela DIKW é, conceitualmente, **o índice executável do motor** — cada estágio é um ponteiro para um módulo real:

- **Telemetria** (US-7): a camada **D/I** é literalmente a tela de Telemetria; o estágio "Dado" deveria deep-linkar para `/ativos/:id/telemetria`.
- **Ativos · Saúde IA** (US-9/10): a camada **C** é o que a tela de Saúde IA já mostra (health, RUL, probFalha vindos de `predict`). O selo de honestidade aqui e lá deve ser **o mesmo componente**.
- **Alertas** (US-9): a transição **I→C** é onde `evaluateAlerts` (`engine/simulation.ts`) nasce um alerta ao cruzar limite do Dicionário.
- **Assistente** (US-12): ao "sugerir solução de falhas", o Assistente percorre **exatamente** esta cadeia (`recommendationsFor` é a mesma fonte) — a tela DIKW é a **explicação canônica** do que o Assistente faz.
- **Dicionário** (Tela 04 da governança): destino de rastreabilidade da camada **I**; o "limite que disparou" mora lá.
- **Hierarquia / breadcrumb** (Tela 02): o seletor de ativo respeita o **escopo herdado** da Matriz de Hierarquia.
- **Cadastro / OCR** (US-5/6): um ativo recém-cadastrado **nasce** com uma linha na aba Ciclo do Ativo (`D=pendente`) e entra na pirâmide DIKW assim que tiver telemetria.
- **Overview da Governança** (Tela 01): os KPIs de conformidade do Overview derivam de `dici.flatMap(...)` — **a aba Ciclo do Ativo é a fonte desses KPIs**; renomear não pode quebrar essa derivação (ver §9, impacto no código).

---

## 9. Melhorias sobre o wireframe base

### 9.1 DECISÃO DE PRODUTO (a mais importante) — desambiguar "D-I-C-I"
**Recomendação:** adotar a opção **"duas visões, um módulo"** (não jogar fora o que existe):

1. **Renomear** o artefato implementado de "D-I-C-I (ciclo documental)" para **"Ciclo do Ativo"** — mantém a tabela, a edição, os KPIs e o CSV intactos.
2. **Promover a pirâmide DIKW** como o **D-I-C-I oficial** da governança (Dado→Informação→Conhecimento→Inteligência), porque é o que rastreia o *fluxo do dado até a decisão* (US-13).
3. Apresentá-las como **duas abas** do mesmo módulo `/governanca/dici` (segmented control), default = Fluxo.

**Impacto concreto no código (separando o que tocar):**
| Arquivo | Mudança | Esforço |
|---|---|---|
| `src/pages/governanca/DICI.tsx` | Extrair a tabela atual para `<CicloDoAtivo/>`; criar `<FluxoDIKW/>`; wrapper com 2 abas; trocar banner texto (`DICI.tsx:40`) | **alto** |
| `src/data/seed.ts` | **Não renomear** `DICI`/`SEED_DICI`/`DiciRow` para não quebrar Overview (`dici.flatMap`) e store — manter a chave, mudar só o **rótulo de UI** | **baixo** |
| `src/store/useStore.ts` | `setDici` permanece; **nova slice opcional** para auditar saltos/edições | **baixo** |
| `src/lib/types.ts` | `DiciRow` permanece; **adicionar** tipos DIKW (`DikwStage`, `StageEvidence`) | **baixo** |

> **Risco a evitar:** renomear a chave `dici` no store/seed quebraria `Overview.tsx` (KPIs) e a persistência (`partialize`, `useStore.ts:194`). A desambiguação deve ser **só de rótulo/UI**, preservando os identificadores internos.

### 9.2 Tornar a governança VISUAL e não abstrata (o fluxo do dado)
- **P0** — Construir a **aba Fluxo (DIKW)** como diagrama horizontal D→I→C→In com **números vivos** do twin selecionado; cada estágio clicável abre a função real (`readingFromState`, `computeRUL`, `recommendationsFor`). Hoje o "fluxo do dado" **não existe como tela** — é o maior ganho de US-13. *Esforço: alto.*
- **P0** — **Selo de procedência do modelo** no estágio "Conhecimento", lendo `predictionModel.name`/`.metodo` (`prediction.ts:62`) — expõe a honestidade (modelo SIMULADO) no ponto exato onde a IA entra. Componente reutilizável compartilhado com a tela Saúde IA. *Esforço: baixo.*
- **P1** — **Rastreabilidade clicável "número → regra"**: ligar cada valor da camada I à linha do Dicionário (espinha "todo número rastreia ao Dicionário"); reusar o futuro `<TraceableValue>`. *Esforço: médio.*

### 9.3 Ligar a governança às operações reais
- **P0** — **Auditar saltos e edições**: registrar quem ciclou um status (Ciclo do Ativo) e quem despachou uma recomendação como OS (`de→para`, ator, timestamp) — alimenta a trilha de auditoria global (lacuna P0 do produto). *Esforço: médio.*
- **P1** — **Deep-links operacionais**: estágio "Dado" → `/ativos/:id/telemetria`; "Conhecimento" → Saúde IA; "Ação" → Alertas/OS. Transforma a tela de diagrama em **navegação governada**. *Esforço: médio.*
- **P1** — **Anexo + responsável + data por célula** do Ciclo do Ativo (hoje o status é abstrato; desenho/ART/laudo não têm artefato anexado). *Esforço: alto.*
- **P2** — Ativo recém-cadastrado (US-5/6) **nasce** com linha no Ciclo do Ativo (`D=pendente`) e aparece na pirâmide assim que houver telemetria. *Esforço: baixo.*
- **P2** — Empty-state explícito em ambas as abas ("Nenhum ativo no ciclo" / "Selecione um ativo para ver o fluxo"). *Esforço: baixo.*
