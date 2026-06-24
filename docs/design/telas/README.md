# PREDICTA / FORZY — Índice Mestre das Especificações de Tela

> Conjunto de **14 especificações de refinamento** (não redesenho) das telas do produto PREDICTA.
> Cada spec ancora-se no código real (`src/...`) e separa rigorosamente **o que JÁ EXISTE** de **o que REFINAR**.
> Este README é o mapa de leitura: visão geral, cobertura de user stories, grafo de navegação,
> backlog de UX consolidado e priorizado, e a ordem de ataque no código.

---

## 1. Visão geral do conjunto e como navegá-lo

As 14 telas descrevem um sistema industrial B2B de manutenção preditiva já implementado em React/TS, com
estado vivo em Zustand (`src/store/useStore.ts`), motor de simulação físico-informado + Weibull
(`src/engine/*`), gêmeo digital, alertas vivos por limite do Dicionário, RBAC (`src/auth/rbac.ts`),
OCR Tesseract (`src/ai/ocr.ts`) e assistente com tool use (`src/ai/*`). As specs **refinam** essa base —
aprofundam arquitetura de informação, coerência inter-módulo e maturidade de produto.

### As 14 telas, agrupadas por fluxo

| # | Tela | Rota real (`src/routes.tsx`) | Arquivo principal | Spec |
|---|------|------------------------------|-------------------|------|
| **Operação (visão de frota)** | | | | |
| 01 | Dashboard inicial | `/dashboard` | `src/pages/Dashboard.tsx` | [01-dashboard.md](01-dashboard.md) |
| 02 | Painel Operacional (*war room*) | `/operacional` | `src/pages/Painel.tsx` | [02-painel-operacional.md](02-painel-operacional.md) |
| 14 | Mapa Digital da Planta | `/mapa` | `src/pages/MapaPlanta.tsx` | [14-mapa-planta.md](14-mapa-planta.md) |
| **Ativos (inventário → detalhe)** | | | | |
| 03 | Lista de Ativos Monitorados | `/ativos` | `src/pages/AtivosLista.tsx` | [03-lista-ativos.md](03-lista-ativos.md) |
| 04 | Detalhe do ativo — Visão Geral | `/ativos/:id/overview` | `src/pages/ativo/Overview.tsx` (+ `AtivoDetail.tsx`) | [04-ativo-visao-geral.md](04-ativo-visao-geral.md) |
| 05 | Detalhe do ativo — Telemetria | `/ativos/:id/telemetria` | `src/pages/ativo/Telemetria.tsx` | [05-ativo-telemetria.md](05-ativo-telemetria.md) |
| 06 | Detalhe do ativo — Saúde & IA | `/ativos/:id/saude` | `src/pages/ativo/SaudeIA.tsx` | [06-ativo-saude-ia.md](06-ativo-saude-ia.md) |
| 07 | Detalhe do ativo — Dados Técnicos | `/ativos/:id/tecnico` | `src/pages/ativo/Tecnico.tsx` | [07-ativo-tecnico.md](07-ativo-tecnico.md) |
| **Alertas (fila → incidente)** | | | | |
| 08 | Lista de Alertas | `/alertas` | `src/pages/AlertasLista.tsx` | [08-alertas-lista.md](08-alertas-lista.md) |
| 09 | Detalhe do Alerta | `/alertas/:id` | `src/pages/AlertaDetalhe.tsx` | [09-alerta-detalhe.md](09-alerta-detalhe.md) |
| **Assistente (US-12)** | | | | |
| 10 | Assistente conversacional (frota) | `/assistente` | `src/pages/Assistente.tsx` | [10-assistente-conversacional.md](10-assistente-conversacional.md) |
| 11 | Assistente contextual (ativo em foco) | `/assistente/:assetId` | `src/pages/Assistente.tsx` (`ctx = !!asset`) | [11-assistente-contexto-ativo.md](11-assistente-contexto-ativo.md) |
| **Cadastro (onboarding de ativo)** | | | | |
| 12 | Cadastro Manual de Ativo | `/cadastro` | `src/pages/CadastroManual.tsx` | [12-cadastro-manual.md](12-cadastro-manual.md) |
| 13 | Cadastro por Imagem da Placa (OCR) | `/cadastro/ocr` | `src/pages/CadastroOCR.tsx` | [13-cadastro-ocr.md](13-cadastro-ocr.md) |

> **Nota de leitura.** As telas 10 e 11 são **um único componente** (`Assistente.tsx`) em dois modos:
> frota vs. ativo-em-foco, alternados em runtime por `const ctx = !!asset`. As abas 04–07 compartilham o
> shell `AtivoDetail.tsx` (cabeçalho + 5 abas + `Outlet context {asset, twin}`); a aba **Gêmeo Digital**
> (`/ativos/:id/gemeo`) existe no código mas não tem spec própria neste conjunto — é referenciada como irmã
> exploratória da tela 06.

### Como ler cada spec

Toda spec segue o **mesmo gabarito de 11 seções**: (1) Nome · (2) Objetivo · (3) Persona principal ·
(4) User stories · (5) Blocos e seções · (6) Componentes · (7) Dados exibidos · (8) Ações · (9) Relação com
outras telas · (10) Relação com governança · (11) Melhorias de UX/UI. Comece pela §2 (separa EXISTE/REFINAR)
e pule para a §11 (backlog acionável daquela tela, ancorado em arquivo/linha).

### A espinha de governança (presente em toda tela)

- **Hierarquia** = breadcrumb da Matriz (empresa → planta → área → sistema → ativo);
- **Dicionário** = todo número rastreia a campo/unidade/faixa/limite/sensor/direção;
- **RBAC** = toda ação é *gated* por `can(modulo, nivel)`;
- **D-I-C-I** = todo artefato tem ciclo Desenho → Instalação → Comissionamento → Inspeção;
- **Honestidade de IA** = todo output de ML expõe valor + horizonte + **confiança** + **explicação** +
  **nota de honestidade** ("modelo de degradação simulado, físico-informado + Weibull, não treinado em
  falhas reais" — `src/engine/prediction.ts`).

---

## 2. Matriz Tela × User Story (cobertura US-1…US-13)

Legenda: **N** = núcleo da tela · **A** = apoio/parcial · **R** = previsto só no refino (§11) · vazio = não se aplica.

| Tela | US-1 | US-2 | US-3 | US-4 | US-5 | US-6 | US-7 | US-8 | US-9 | US-10 | US-11 | US-12 | US-13 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 01 Dashboard | N | N | | | | | N | | R | | A | | R |
| 02 Painel Operacional | A | A | A | A | | | N | | A | A | | R | R |
| 03 Lista de Ativos | | A | A | | | | N | | R | R | R | R | N |
| 04 Ativo · Visão Geral | | A | | A | | | N | A | A | A | A | A | A |
| 05 Ativo · Telemetria | | A | N | N | | | N | R | | | | A | A |
| 06 Ativo · Saúde & IA | | A | | A | | | A | N | N | N | N | R | A |
| 07 Ativo · Dados Técnicos | | A | A | A | N | | | | | | | | N |
| 08 Lista de Alertas | | A | A | A | | | A | | N | A | A | R | A |
| 09 Detalhe do Alerta | | A | | A | | | A | | N | A | A | A | N |
| 10 Assistente (frota) | A | A | | A | | | A | A | A | A | A | N | R |
| 11 Assistente (ativo) | A | A | | A | | | A | A | N | A | A | N | R |
| 12 Cadastro Manual | N | A | A | A | A | | | A | A | A | | | N |
| 13 Cadastro OCR | A | A | A | A | N | A | | | | | | | A |
| 14 Mapa da Planta | A | A | | | | N | A | | A | A | | | R |

### Leitura da cobertura

- **US-7 (atual + histórico)** é o tecido conjuntivo: presente em 11 das 14 telas. É o que justifica o
  par "valor agora + série temporal" em quase todo lugar.
- **US-13 (governança)** é núcleo onde se cadastra/audita (03, 07, 09, 12) e **lacuna a refinar** onde
  deveria ser transversal mas hoje não gateia (01, 02, 10/11, 14 — ver backlog P0).
- **US-8 (baseline)** é a US **menos materializada**: aparece como núcleo só na tela 06 e, mesmo lá, está
  "dissolvida na curva". É a maior dívida do padrão único de IA.
- **US-5 (OCR)** vive nas telas 13 (captura) → 07 (leitura auditável); o handoff entre elas é fraco.
- **US-6 (planta baixa navegável)** concentra-se na tela 14, hoje com layout hard-coded (não derivado da
  Hierarquia nem importado de planta baixa real).
- **US-12 (assistente)** é núcleo em 10/11 e ponte (R) a partir de 03, 08, 09 — mas a ponte raramente existe
  no código (é o item recorrente "Investigar com Assistente").

---

## 3. Mapa de navegação entre telas

Grafo de fluxos reais (setas sólidas = existe no código) e propostos (tracejado = refino §11/§9 das telas).
Gatilho anotado em cada aresta.

```
                          ┌──────────────────────────────────────────────┐
                          │            GOVERNANÇA (espinha)               │
                          │  Hierarquia · Dicionário · DICI · RBAC        │
                          └───────────────┬──────────────────────────────┘
                                          │ define escopo, limites, ciclo, papéis
                                          ▼
        ┌─────────────┐  KPI "Críticos"   ┌─────────────────┐  card crítico   ┌──────────────┐
        │ 01 Dashboard │ ───drill-down──▶ │ 03 Lista Ativos │ ◀──triagem────  │ 02 Painel Op │
        │  (frota)     │ ───B5 alerta────┐│  (inventário)   │                 │ (war room)   │
        └──────┬───────┘                 │└────────┬────────┘                 └──────┬───────┘
               │ B6 ativo em atenção     │         │ clique na linha                │ clique no card
               │                          │         ▼                                │
               │                          │  ┌──────────────────────────────────────▼──────┐
               │ KPI plantas (R)          │  │   04 Ativo · Visão Geral  (shell AtivoDetail)│
               ▼                          │  │   ├─ 05 Telemetria   (aba)                   │
        ┌─────────────┐  marcador/lista   │  │   ├─ 06 Saúde & IA    (aba, US-8/9/10/11)     │
        │ 14 Mapa     │ ───abrir ativo────┼─▶│   ├─ (Gêmeo Digital) (aba, what-if US-11)     │
        │  da Planta  │                   │  │   └─ 07 Dados Técnicos(aba, placa/OCR/D-I-C-I)│
        └─────────────┘                   │  └───────┬───────────────────────┬──────────────┘
                                          │          │ IBtn Assistente       │ IBtn/“Ver alerta”
        ┌─────────────┐                   │          ▼                       ▼
        │ 08 Lista de │ ──linha/olho────▶ ┌─┴───────────────┐        ┌──────────────────┐
        │   Alertas   │                   │ 10/11 Assistente │        │ 09 Detalhe Alerta│
        │  (fila)     │ ◀─KPI/Dashboard── │  /assistente[/id]│ ◀──────│ “Investigar IA”(R)│
        └──────┬──────┘                   └────────┬─────────┘ create_ └────────┬─────────┘
               │ “Investigar c/ IA” (R)            │ work_order        B6 ativo │ / B4 evidência
               └───────────────────────────────────┘ ──▶ vira alerta           ▼
                                                       em 08/09           05 Telemetria (Ver histórico)

        ┌──────────────────┐  “Novo Ativo” (gated Cadastro:full)   ┌──────────────────┐
        │ 03 Lista de Ativos│ ───────────────────────────────────▶ │ 12 Cadastro Manual│
        └──────────────────┘                                       └────────┬─────────┘
                                                  “Usar OCR” ▲ │ handoff (R)  │ submit → createAsset
                                                            │ ▼              ▼
                                                   ┌──────────────────┐  ┌────────────────────────┐
                                                   │ 13 Cadastro OCR  │─▶│ 04 Ativo · Visão Geral  │
                                                   └──────────────────┘  │ (gêmeo novo nasce verde)│
                                                                          └────────────────────────┘
```

### Arestas principais (de → para · gatilho · estado)

| De | Para | Gatilho | Estado |
|----|------|---------|--------|
| 01 Dashboard | 09 Detalhe Alerta | clique em alerta recente (B5) | existe |
| 01 Dashboard | 08 Lista Alertas | "Ver todos" | existe |
| 01 Dashboard | 04 Ativo Overview | card "Ativos em Atenção" (B6) | existe |
| 01 Dashboard | 03 Lista / 14 Mapa | KPI "Ativos"/"plantas" | refino (drill governado) |
| 02 Painel | 04 Ativo Overview | clique no card do ativo | existe |
| 02 Painel | 08 / 10 | "Ver alertas" / "Perguntar à IA" no card | refino (gated RBAC) |
| 03 Lista | 04 Ativo Overview | clique na linha / `Eye` | existe (Eye sem handler — refino) |
| 03 Lista | 12 Cadastro | "Novo Ativo" (gated `Cadastro:full`) | existe |
| 04–07 (shell) | 10/11 Assistente | `IBtn` Assistente → `/assistente/:id` | existe |
| 04/06 | 08/09 Alertas | `IBtn` Alertas / "Ver alerta" | existe |
| 05 Telemetria | 06 Saúde & IA | grandeza anômala → predição | refino (salto inter-aba) |
| 08 Lista Alertas | 09 Detalhe | linha clicável / olho | existe |
| 08 Lista Alertas | 10/11 Assistente | "Investigar com Assistente" | refino (US-12) |
| 09 Detalhe Alerta | 04 Ativo Overview | card "Ativo Relacionado" (B6) | existe |
| 09 Detalhe Alerta | 05 Telemetria | "Ver Histórico" | existe |
| 09 Detalhe Alerta | 10/11 Assistente | "Abrir no Assistente IA" | existe |
| 10/11 Assistente | 08/09 Alertas | `create_work_order` → novo alerta | existe (sem gate RBAC — P0) |
| 12 Cadastro | 13 OCR | "Usar OCR" | existe (sem handoff de dados) |
| 13 OCR | 12 Cadastro | "Formulário completo" | existe (descarta extração — refino) |
| 12/13 Cadastro | 04 Ativo Overview | submit `createAsset` | existe |
| 14 Mapa | 04 Ativo Overview | clique marcador/lista | existe |
| 14 Mapa | 08 Alertas | área crítica → alertas da área | refino (bidirecional) |

**Achados estruturais de navegação:**

1. **A "volta" do Assistente é um beco sem saída** (telas 10/11 §9): IDs e alertas no painel lateral são
   texto, não links. O técnico não salta do alerta citado de volta ao detalhe.
2. **A ponte "Investigar com Assistente"** (US-12) é prometida em 03/08/09 mas só existe a partir de 09.
   É a aresta de maior alavancagem para fechar US-12 a partir da triagem.
3. **Drift Mapa ↔ cadastro** (tela 14): o canvas plota 8 ativos literais; ativos cadastrados via 12/13 não
   aparecem no mapa. A navegação 14→04 só funciona para os 8 hard-coded.

---

## 4. Backlog de UX consolidado e priorizado

Todas as melhorias §11 das 14 telas, deduplicadas e agrupadas por **tema**, ordenadas por prioridade
(P0 > P1 > P2). Esforço: B(aixo)/M(édio)/A(lto).

### Tema A — Padrão único de output de IA (honestidade + confiança + explicação)

> **Tema #1 do produto.** Recorre em 9 telas. A nota de honestidade existe hoje só no system prompt do
> assistente e na ficha de modelo da tela 06; em todo o resto, predição é apresentada como fato.

| # | Item | Tela | Pri | Esf | Arquivo |
|---|------|------|:--:|:--:|---------|
| A1 | Criar `ConfidenceTag` + `ExplainabilityList` + `HonestyNote` compartilhados (valor + horizonte + confiança + variáveis + nota) | 06 → todas | P0 | A | `src/components/ui-shared/index.tsx` (novos) |
| A2 | Selo de honestidade persistente na UI do Assistente (hoje só no `buildSystem`) | 10, 11 | P0 | B | `src/pages/Assistente.tsx` |
| A3 | Cards de resposta tipados no Assistente (prediction/whatif/workorder) em vez de bolha de texto | 10 | P0 | A | `src/pages/Assistente.tsx` |
| A4 | Aplicar padrão de IA à Projeção IA + honestidade da Disponibilidade Média | 01 | P0 | A | `src/pages/Dashboard.tsx:113-126` + `src/store/derive.ts:45,84` |
| A5 | Saúde/RUL carregam confiança + horizonte (P10–P90) + nota de modelo simulado | 04 | P0 | A | `AtivoDetail.tsx:38` + `ativo/Overview.tsx:96` |
| A6 | Painel de Predição (B10) com padrão único no Detalhe do Alerta (`origem:modelo`) | 09 | P0 | A | `AlertaDetalhe.tsx` (novo `PredictionPanel`) |
| A7 | Linha de confiança preditiva nos alertas `origem:modelo` da lista (prob% + horizonte + nota) | 08 | P0 | M | `AlertasLista.tsx` + `twin.probFalha/rulDias` |
| A8 | Promover horizonte de falha a controle (7/14/21/30/60) reusando `HORIZONS` | 06 | P0 | B | `ativo/SaudeIA.tsx:28` + `engine/prediction.ts` |
| A9 | Painel de contexto do Assistente = output completo de US-9 (liderar com `modoCritico` + `probFalha21`) | 11 | P0 | B | `Assistente.tsx` (card B3.1 L197-208) |
| A10 | Dar bloco próprio ao Baseline (US-8) e à Anomalia (US-9), hoje dissolvidos na curva | 06 | P1 | A | `ativo/SaudeIA.tsx` + `engine/model.ts`/`degradation.ts` |
| A11 | Overlay de baseline (US-8) na Telemetria com nota de honestidade | 05 | P1 | A | `ativo/Telemetria.tsx` + `engine/prediction.ts` |
| A12 | Trazer Δ-RUL pré-calculado (já em `GemeoDigital.recEffect`) às recomendações da Saúde & IA | 06 | P1 | M | `ativo/SaudeIA.tsx:82-104` + `GemeoDigital.tsx:80-83` |
| A13 | Reorganizar B1 em grade/sparkline dos 5 horizontes de `probFalha` + corrigir `ReferenceLine` | 06 | P1 | M | `ativo/SaudeIA.tsx:69-79` |
| A14 | Nota de honestidade fixa no rodapé do canvas do Mapa | 14 | P2 | B | `MapaPlanta.tsx` (rodapé svg) |
| A15 | Fatorar `RecommendationCard`/`ModelCard`/`HonestyNote` entre Saúde & IA e Gêmeo | 06 | P2 | M | `SaudeIA.tsx` + `GemeoDigital.tsx` + `ui-shared` |

### Tema B — Governança / RBAC / Hierarquia / Dicionário / D-I-C-I

> Lacunas de gating são **as falhas de governança mais graves** — Assistente e Mapa renderizam e escrevem
> sem `useCan`. Confirmado em `src/routes.tsx`: `/assistente`, `/assistente/:assetId` e `/mapa` **não têm
> `<Gate>`** (ao contrário de Alertas/Cadastro/OCR/Governança).

| # | Item | Tela | Pri | Esf | Arquivo |
|---|------|------|:--:|:--:|---------|
| B1 | Gate de RBAC na rota e por ferramenta do Assistente (`executeTool` consulta `can()` antes de `create_work_order`/`list_alerts`) | 10, 11 | P0 | M | `routes.tsx:71-72` + `src/ai/tools.ts` |
| B2 | Gatear `create_work_order` e acesso à tela contextual por RBAC | 11 | P0 | M | `tools.ts:126` + `Assistente.tsx` (`useCan`) |
| B3 | Gatear render/Exportar do Mapa por `useCan('Mapa')` e escopar `useAssetViews` pela subárvore da Hierarquia | 14 | P0 | M | `MapaPlanta.tsx` + `derive.ts` + `rbac.ts` |
| B4 | Aplicar RBAC (`useCan`) nas ações do ativo: OS e Registrar manutenção gated por `Ativos:full` | 04 | P0 | B | `AtivoDetail.tsx:44` |
| B5 | Gatear botão Registrar manutenção por `can('Ativos','full')`; modo `read` vira leitura | 06 | P0 | B | `ativo/SaudeIA.tsx:97-100` |
| B6 | Ancorar Planta/Área na Matriz de Hierarquia via selects encadeados (substituir texto livre) | 12, 13 | P0 | A | `CadastroManual.tsx` step2 / `CadastroOCR.tsx` + `createAsset.ts`/`types.ts` |
| B7 | Iniciar ciclo D-I-C-I na criação do ativo (criar `DiciRow` Desenho `em_revisao`) + selo na Revisão | 12 | P0 | M | `createAsset.ts` + `seed.ts` (SEED_DICI) |
| B8 | Derivar layout do Mapa da Hierarquia (`HNode`/`Asset.area`), eliminando drift mapa↔cadastro | 14 | P0 | A | `MapaPlanta.tsx:19-32` |
| B9 | Gate de validação por confiança OCR antes de salvar (campos <90% exigem confirmação humana) | 13 | P0 | M | `CadastroOCR.tsx` `cadastrar()` + `fieldRow` |
| B10 | Separar dado real de fabricado (IP55/380V/Monitorado hard-coded) + estender `Asset` | 07 | P0 | M | `ativo/Tecnico.tsx` + `types.ts` |
| B11 | Persistir e exibir procedência Manual/OCR + confiança no `Asset` | 07, 13 | P0 | M | `createAsset.ts` + `CadastroOCR.tsx`/`Tecnico.tsx` |
| B12 | KPIs clicáveis com rastreio ao Dicionário (origem campo/unidade/faixa/limite) | 01 | P0 | M | `ui-shared` (KPI) + `Dashboard.tsx:66-71` |
| B13 | Embutir linha D-I-C-I do ativo nas abas (edição gated) | 04, 07 | P1 | M | `ativo/Tecnico.tsx` + `governanca/DICI.tsx` |
| B14 | Introduzir ações + gating RBAC na aba Técnico (hoje 100% leitura sem rbac) | 07 | P1 | M | `ativo/Tecnico.tsx` + `rbac.ts` |
| B15 | Breadcrumb com hierarquia real do ativo (empresa→planta→área→sistema→ativo) | 09, 10, 11, 02, 03 | P1 | B–M | `usePageChrome` nas páginas |
| B16 | Tornar etapa Sensores funcional e ligada ao Dicionário (`SEED_DICTIONARY` → `Asset.tagsMonitoradas`) | 12 | P1 | A | `CadastroManual.tsx` step4 + `types.ts` |
| B17 | Proveniência do limite na UI (override do ativo vs. Dicionário) + sensor/campo | 05, 07 | P1 | B | `ativo/Telemetria.tsx:26` / `Tecnico.tsx` |
| B18 | Bloco "Origem & Rastreabilidade" ao Dicionário no Detalhe do Alerta (`origem:regra`) | 09 | P0 | M | `AlertaDetalhe.tsx` (novo `DiciTraceCard`) |
| B19 | Badge/coluna de Origem (regra×modelo×manual) + flag `managed` na lista de alertas | 08 | P0 | B | `AlertasLista.tsx` + `OrigemBadge` em `ui-shared` |
| B20 | Métricas do painel/KPIs ancoradas no Dicionário (unidade/faixa + deep-link) | 10, 11 | P1 | M | `Assistente.tsx:197-208` |
| B21 | Distinguir offline operacional de artefato não-comissionado (D-I-C-I) | 02, 03, 14 | P1–P2 | M | `Painel.tsx` / `AtivosLista.tsx` / `MapaPlanta.tsx` |
| B22 | Gating de atalhos B5/B6 do Dashboard pela permissão do destino (`useCan`) | 01 | P2 | B | `Dashboard.tsx:129,151,154` + `rbac.ts` |
| B23 | Aplicar escopo hierárquico do usuário às agregações (navegação governada) | 01, 02 | P2 | A | `derive.ts` (alertsByDay/fleetAvailability/fleetHealthTrend) |
| B24 | Linhas técnicas com link ao Dicionário + selo override por ativo | 07, 05 | P2 | M | `Tecnico.tsx`/`Telemetria.tsx` + `governanca/Dicionario.tsx` |
| B25 | Filtros adicionais por Origem e Área/Hierarquia com visibilidade RBAC (alertas) | 08 | P2 | M | `AlertasLista.tsx:125-136` |

### Tema C — Navegação, fluxo e ações acionáveis

| # | Item | Tela | Pri | Esf | Arquivo |
|---|------|------|:--:|:--:|---------|
| C1 | "Próximas Ações" acionáveis: badge de prioridade + "Registrar manutenção"/"Criar OS" (fecha US-11) | 04 | P0 | A | `ativo/Overview.tsx:108-123` + `recommendations.ts` |
| C2 | Contadores da barra de status viram botões-filtro acionáveis | 02 | P0 | B | `Painel.tsx:56-61` |
| C3 | Tornar filtros decorativos da Lista de Ativos reais e hierárquicos (planta/área/sistema + chips) | 03 | P0 | A | `AtivosLista.tsx:45-48` |
| C4 | Implementar modo List do Painel (toggle existe no estado, não renderiza) | 02 | P0 | M | `Painel.tsx:25/88` |
| C5 | Ação "Investigar com Assistente" passando `{assetId, tag, modoCritico}` (US-12) | 08 | P1 | M | `AlertasLista.tsx:160-164` → rota Assistente |
| C6 | Ligar botões de linha `Eye`/`MoreHorizontal` (menu de ações + `stopPropagation`) | 03 | P1 | B | `AtivosLista.tsx:86-87` |
| C7 | Criar OS real (drawer pré-preenchido + relação OS↔alerta, resolve ao concluir) | 09, 06, 04 | P1 | A | `AlertaDetalhe.tsx` + store |
| C8 | Tornar painel do Assistente navegável (alertas e ativo viram links) | 11 | P1 | B | `Assistente.tsx:213-217` |
| C9 | Chips de sugestão do Assistente dinâmicos e gated (esconder "Gerar OS" sem `Alertas:full`) | 10 | P1 | M | `Assistente.tsx:43-45` |
| C10 | Transportar dados OCR para o Formulário completo via route state | 13, 12 | P1 | B | `CadastroOCR.tsx` + `CadastroManual.tsx` |
| C11 | Handoff OCR↔Manual: placa lida pré-preenche o manual na etapa Revisão | 12 | P2 | M | `CadastroOCR.tsx` + `CadastroManual.tsx` + store |
| C12 | Botão "Explicar no Assistente" no modo crítico → `/assistente/:id` (US-12) | 06 | P2 | B | `ativo/SaudeIA.tsx` |
| C13 | Painel de detalhe da área no clique do Mapa (`sel` hoje só realça borda) | 14 | P1 | M | `MapaPlanta.tsx:71` + `SevBadge` |
| C14 | Legenda de status + contadores do Mapa viram filtros clicáveis | 14 | P1 | B | `MapaPlanta.tsx:44-50,99-107` |
| C15 | Ações rápidas no card do Painel (Ver alertas / Perguntar à IA) gated por RBAC | 02 | P2 | A | `Painel.tsx:90` + `rbac.ts` |
| C16 | Conectar Registrar manutenção a OS + evento auditável D-I-C-I (RUL antes/depois) | 06 | P2 | A | `AtivoDetail.tsx:44` + `useStore.ts:151-163` |
| C17 | Implementar botão Filtrar do Mapa (camadas área/sistema + zoom/pan) | 14 | P2 | A | `MapaPlanta.tsx:37,52-94` |

### Tema D — Estados, realtime e frescura do dado

| # | Item | Tela | Pri | Esf | Arquivo |
|---|------|------|:--:|:--:|---------|
| D1 | Cobrir as 6 grandezas na Telemetria (rpm, press, oleo), não só temp/vib/corrente | 05 | P0 | B | `ativo/Telemetria.tsx:27-31` |
| D2 | Exibir valor atual (`twin.state[key]`) no header de cada card de Telemetria | 05 | P0 | B | `ativo/Telemetria.tsx:59-67` |
| D3 | Plotar limite de atenção + crítico + faixa operacional, respeitando `tag.direcao` | 05 | P0 | M | `ativo/Telemetria.tsx:26,75` |
| D4 | Completar US-4 no Painel: exibir Corrente (A) e RPM + unidades nas micro-leituras | 02 | P1 | B | `Painel.tsx:107-120` |
| D5 | Colorir leituras por banda do Dicionário (`limiteAlerta`/`limiteCritico` + direção) | 02, 04 | P1 | M | `Painel.tsx:102-120` / `Overview.tsx:50-57` |
| D6 | Frescura/confiança do dado: badge "há Ns" (`syncedAt`) + esmaecer card stale; "Ao vivo" → toggle pausar | 02, 03, 05 | P1 | M | `Painel.tsx:46,121-123` / `AtivosLista.tsx:81-83` / `Telemetria.tsx:53` |
| D7 | Consertar botões Refresh/Atualizar mortos (sem `onClick`) e expor `syncedAt` | 01, 05 | P1 | B | `Dashboard.tsx:63` / `Telemetria.tsx:53` |
| D8 | Tira-resumo da janela na Telemetria (amostras, cobertura, estouros, pior residual) | 05 | P1 | M | `lib/telemetry.ts` + `Telemetria.tsx` |
| D9 | Tornar visível dedup/snooze/auto-resolução do motor (toast + selo "auto") | 08 | P1 | M | `engine/simulation.ts:95-163` + `AlertasLista.tsx` |
| D10 | Ativar status `em_analise` via Atribuir/Assumir (seta `responsavel`) | 08, 09 | P1 | M | `AlertasLista.tsx` + `Badge` âmbar em `ui-shared` |
| D11 | Mini-gráfico que prova o disparo: `ReferenceLine` no limite + marcador no instante de criação | 09 | P0 | M | `AlertaDetalhe.tsx:105-114` |
| D12 | Distinguir "Saúde Real" reconstruída do futuro projetado (marcador vertical em off=0) | 01 | P1 | M | `derive.ts:84-104` + `Dashboard.tsx:113-126` |
| D13 | Linha do tempo real e auditável do alerta (eventos persistidos com autor/timestamp) | 09 | P1 | A | `types.ts` (Alert.eventos) + `useStore.ts` + `AlertaDetalhe.tsx` |
| D14 | Persistir comentário do alerta nos eventos (autor da session + simClock) | 09 | P2 | M | `useStore.ts` + `AlertaDetalhe.tsx:176-178` |
| D15 | Codificar saúde/criticidade no marcador do Mapa (anel ∝ `twin.health` / tamanho por criticidade) | 14 | P1 | M | `MapaPlanta.tsx:86-88` |
| D16 | Tooltip on-hover no marcador do Mapa (nome/status/saúde/modo crítico) | 14 | P1 | B | `MapaPlanta.tsx:82-91` |
| D17 | Sparkline inline de saúde/temp no card do Painel/Overview (US-7 sem clique) | 02, 04 | P1–P2 | M | `Painel.tsx:88-126` / `Overview.tsx:60-69` |
| D18 | Sparkline da Visão Geral multivariável ou com seletor de tag (reusar `toChartData`) | 04 | P1 | M | `ativo/Overview.tsx:60-69` |
| D19 | Cards de leitura: estado crítico (`limiteCritico`) além do alerta + limite no hover | 04 | P1 | M | `ativo/Overview.tsx:31,50-57` |
| D20 | Surfacer RUL e modo crítico como colunas na Lista de Ativos (hoje descartados pelo `AssetView`) | 03 | P0 | M | `derive.ts:11-16` + `AtivosLista.tsx:55` |
| D21 | Triagem da frota: ordenar por severidade/RUL + faixa de prioridade fixa (Painel e Lista) | 02, 03 | P0 | M | `Painel.tsx:88` / `AtivosLista.tsx:55,61` + `derive.ts` |
| D22 | Prévia dos limites de corrente derivados (`flaFromKw`) na Revisão do Cadastro | 12 | P1 | B | `CadastroManual.tsx` step3/5 + `engine/model.ts` |
| D23 | Corrigir FLA exibida — usar `flaFromKw` direto, não derivar de alerta/1.05 | 07 | P0 | B | `ativo/Tecnico.tsx` + `engine/model.ts` |
| D24 | Sensores instalados derivados de dictionary/asset + status online/stale do twin | 07 | P1 | A | `ativo/Tecnico.tsx` |
| D25 | Card de alerta com chip de origem (regra/modelo/manual) + link ao Dicionário | 04 | P2 | B | `ativo/Overview.tsx:73-88` |

### Tema E — Hierarquia visual, densidade e estados vazios

| # | Item | Tela | Pri | Esf | Arquivo |
|---|------|------|:--:|:--:|---------|
| E1 | Coluna Tag/Valor rastreando ao Dicionário na linha do alerta (ex.: vib 7,2 mm/s lim 6,0) | 08 | P1 | B | `AlertasLista.tsx` (coluna Título/Ativo) |
| E2 | KPIs viram filtros clicáveis com delta de tendência vs. tick anterior (alertas) | 08 | P1 | M | `AlertasLista.tsx:85-100` + KPI compartilhado |
| E3 | Visão em cards para o perfil Cliente (US-2), toggle tabela↔cards | 03 | P1 | M | `AtivosLista.tsx` + `ui-shared` |
| E4 | Cabeçalho do ativo vira barra de comando hierárquica (stat-strip + `modoCritico` + selo D-I-C-I) | 04 | P1 | M | `AtivoDetail.tsx:69-80` |
| E5 | Estado vazio e mensagem de recorte de hierarquia (tabela hoje fica fantasma) | 03 | P1 | B | `AtivosLista.tsx:60` |
| E6 | Empty-state offline/sem-twin estruturado (último valor, tempo offline, trilha de diagnóstico) | 04, 05 | P1–P2 | M | `ativo/Overview.tsx:40` / `Telemetria.tsx:40` |
| E7 | Validação por etapa antes de avançar (`trigger`) + completar `FIELD_STEP` + marcar etapa com erro | 12 | P1 | B | `CadastroManual.tsx` |
| E8 | Fundir banner de status + Campos Detectados num painel único de Resultado da Leitura (aplicar-por-campo) | 13 | P1 | M | `CadastroOCR.tsx` (B3/B4) |
| E9 | Preservar procedência ao editar campo OCR (badge "Bot OCR" → "Editado") | 13 | P1 | B | `CadastroOCR.tsx` `fieldRow` |
| E10 | Padronizar coerência entre abas via wrapper `<AtivoTab>` (guard de twin, SH, grid base) | 04 | P1 | A | `AtivoDetail.tsx` + `ativo/*` |
| E11 | Hierarquia visual entre blocos do Dashboard: elevar "Ativos que Requerem Atenção" com críticos | 01 | P2 | M | `Dashboard.tsx:150` + `ui-shared` SH |
| E12 | Grid responsivo (auto-fill/minmax) no Painel + extrair `<AssetCard>` compartilhado | 02 | P2 | M | `Painel.tsx:88-126` + `theme.ts` (corDoStatus) |
| E13 | Reorganizar coluna esquerda do Alerta por fluxo de incidente (Detalhes+Origem em abas) | 09 | P2 | M | `AlertaDetalhe.tsx` |
| E14 | Empty-state distinguindo filtro vazio de planta saudável (fila zerada) | 08 | P2 | B | `AlertasLista.tsx:169` |
| E15 | Estado vazio para alerta inexistente (em vez de fallback silencioso para `alerts[0]`) | 09 | P2 | B | `AlertaDetalhe.tsx:34` |
| E16 | Estado vazio inteligente na Telemetria (offline vs. janela sem dados) | 05 | P2 | B | `ativo/Telemetria.tsx:40` |
| E17 | Hierarquia visual da aba Técnico (cabeçalho de identidade + placa em blocos semânticos) | 07 | P2 | B | `ativo/Tecnico.tsx` |
| E18 | Painel de comparação na Telemetria (2 grandezas normalizadas / janela vs. janela) | 05 | P2 | A | `ativo/Telemetria.tsx` |
| E19 | Unificar seletores de janela/segmento em `SegmentedControl` reutilizável | 05 | P2 | B | `ativo/Telemetria.tsx:45-50` + `ui-shared` |
| E20 | Presets de layout modular do Dashboard por persona (US-1), lidos de `session.papel`/RBAC | 01 | P1 | A | `Dashboard.tsx` + `useStore.ts` (settings) |
| E21 | Paginação funcional ou virtualização na Lista de Ativos (hoje `[1,2,3,...,12]` estática) | 03 | P1 | M | `AtivosLista.tsx:97-100` |
| E22 | Export respeita o filtro/visão ativa (alertas e ativos exportam `filtered`/`data`, não a base crua) | 03, 08 | P2 | B | `AtivosLista.tsx:19-24` / `AlertasLista.tsx:48-53` |
| E23 | Alinhar taxonomia de severidade entre barra (3 cat.) e pizza (4 cat.) no Dashboard | 01 | P2 | B | `derive.ts:64` + `Dashboard.tsx:46-51` |
| E24 | Render de markdown completo no Assistente (listas/tabelas/código) | 10 | P1 | M | `Assistente.tsx:148-152` |
| E25 | Estados de atividade granulares + botão Parar visível no Assistente (`abortRef`) | 10 | P2 | B | `Assistente.tsx:160` |
| E26 | Tratamento de erro diferenciado do Assistente (rede/RBAC/limite) + retry inline | 10 | P2 | B | `Assistente.tsx:81` + `ai/assistant.ts` |
| E27 | Persistência leve de conversa por ativo + pílula de tool use com argumento + chip de contexto colorido | 10, 11 | P2 | B–M | `Assistente.tsx` (convoRef/L96/L122) |
| E28 | Marcador fantasma (tracejado + badge de fase) para ativos D-I-C-I sem twin no Mapa | 14 | P2 | M | `MapaPlanta.tsx` + `derive.ts:22` |
| E29 | Sincronização cruzada mapa↔lista (hover compartilhado) + extrair `<PlantCanvas>` | 14 | P2 | M | `MapaPlanta.tsx:52-94,110-118` |
| E30 | Microcopy/extras OCR: nota de honestidade (qualidade de leitura ≠ predição), expor IP + texto cru, captura por câmera, pré-tratamento de imagem | 13 | P2 | B–A | `CadastroOCR.tsx` + `ai/ocr.ts` |
| E31 | Confirmação ao Cancelar cadastro quando o form está dirty (`formState.isDirty`) | 12 | P2 | B | `CadastroManual.tsx` |
| E32 | Agrupamento colapsável da tabela de alertas (Severidade/Ativo/Origem) | 08 | P2 | A | `AlertasLista.tsx:138-173` |

### Resumo quantitativo do backlog

- **Total de itens consolidados:** 82 (deduplicados das ~107 melhorias §11 brutas das 14 telas).
- **Por prioridade:** P0 ≈ 24 · P1 ≈ 38 · P2 ≈ 20.
- **Por tema:** A (IA) 15 · B (Governança) 25 · C (Navegação) 17 · D (Realtime) 25 · E (Visual/estados) 32.
  (Vários itens cruzam temas; classificados pelo eixo dominante.)

---

## 5. Próximos passos — o que implementar primeiro no código real

Sequência de implementação que maximiza valor por esforço e respeita dependências (componentes
compartilhados antes dos consumidores).

### Onda 0 — Fundações compartilhadas (desbloqueiam o resto)

1. **`ui-shared`: criar `ConfidenceTag`, `ExplainabilityList`, `HonestyNote`, `OrigemBadge`** (A1, B19).
   São pré-requisito de quase todo o Tema A e da tela 08. Sem eles, cada tela reinventa o cartão de IA.
2. **`Asset`/`NewAssetInput`: estender com `origem`, `ocrConfianca`, `sistemaId/parentId`, `tagsMonitoradas`,
   `tensao/frequencia/classeProtecao`** (B6, B10, B11, B16). Mudança de schema que destrava cadastro,
   Técnico e Mapa de uma vez.
3. **`Alert.eventos[]` + mutações auditáveis em `useStore`** (`ack/resolve/reopen` gravam autor+timestamp) (D13).

### Onda 1 — Fechar as lacunas de governança P0 (risco mais alto)

4. **RBAC no Assistente e no Mapa** (B1, B2, B3): `<Gate>` nas rotas `/assistente`, `/assistente/:id`, `/mapa`
   em `routes.tsx` (hoje **ausente**, confirmado no arquivo) + `can()` dentro de `executeTool` antes de
   `create_work_order`/`list_alerts`. É a divergência mais grave do princípio "toda ação é gated".
5. **Gate das ações de escrita do ativo** (B4, B5): Registrar manutenção / OS gated por `Ativos:full`.
6. **Selo de honestidade visível** (A2): rodapé do Assistente + nota nos cards de predição. Esforço baixo,
   impacto de governança alto.

### Onda 2 — Padrão único de IA onde a predição já existe

7. **Card de IA na Saúde & IA (06)** (A8, A10, A12, A13) consumindo os componentes da Onda 0 — é a tela onde
   o motor já entrega tudo; vira a referência visual do padrão.
8. **Propagar o padrão** para Detalhe do Alerta (A6, B18, D11), Lista de Alertas (A7, B19, E1) e Visão Geral
   do ativo (A5, C1). Aqui a navegação "Investigar com Assistente" (C5) fecha US-12.

### Onda 3 — Triagem e realtime (valor operacional diário)

9. **Surfacer RUL/modo crítico e ordenar por urgência** (D20, D21) na Lista (03) e no Painel (02) — converte
   listas em filas de manutenção. Inclui implementar o modo List (C4) e os filtros reais (C2, C3).
10. **Completar US-4/US-7 na Telemetria** (D1, D2, D3) e colorir leituras por banda do Dicionário (D5) —
    baixo esforço, alta legibilidade.
11. **Frescura do dado** (D6, D7): `syncedAt`, badges "há Ns", consertar Refresh mortos.

### Onda 4 — Hierarquia como fonte de verdade

12. **Cadastro ancorado na Matriz** (B6) + início do D-I-C-I (B7) + Sensores reais (B16).
13. **Mapa derivado da Hierarquia** (B8) eliminando o drift mapa↔cadastro, depois painel de detalhe (C13) e
    filtros (C14).
14. **Breadcrumbs hierárquicos reais** (B15) e escopo por papel nas agregações (B23) — fecham "navegação
    governada" em todas as telas.

> **Princípio de sequência:** componentes compartilhados (Onda 0) → tapar buracos de governança (Onda 1) →
> consistência de IA (Onda 2) → valor operacional (Onda 3) → governança estrutural (Onda 4). Cada onda
> entrega um incremento testável e nenhuma depende de módulo ainda inexistente — só de refino do que já vive
> no código.
