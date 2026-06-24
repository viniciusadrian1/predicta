# PREDICTA · FORZY — Índice Mestre das Especificações de Design

> **O que é este documento.** O conjunto `docs/design/*.md` é a especificação de produto/UX do
> PREDICTA (plataforma IIoT de manutenção preditiva da FORZY) — não um wireframe, mas o **refinamento
> ancorado no código React/TS já funcional** deste repositório (estado em Zustand, motor de simulação
> físico-informado, gêmeo digital, alertas vivos por limite do Dicionário, RBAC, OCR Tesseract,
> assistente com tool use). Cada documento separa rigorosamente **o que JÁ EXISTE** de
> **o que REFINAR/ADICIONAR**, sempre indicando o **impacto no produto real** (arquivos/componentes).
>
> Este README é o **mapa de navegação + mapa de consistência + matriz de cobertura + roadmap P0
> consolidado** do conjunto. Leia-o antes de mergulhar em qualquer doc específico.

---

## 1. Visão geral do conjunto e como navegá-lo

São **7 documentos**, organizados do transversal para o específico. O `00` e o `01` são as
**fundações** que todos os demais referenciam; `02`–`06` cobrem as telas por jornada de uso.

| # | Documento | Escopo / Telas | User stories foco | Quando ler |
|---|---|---|---|---|
| **00** | [`00-governanca-espinha.md`](./00-governanca-espinha.md) | Governança como espinha transversal + telas **16–20** (Visão Geral, Hierarquia, D-I-C-I, Dicionário, RBAC) | **US-13** + suporte a todas | Para entender a **tese de governança ambiente** e o subsistema de Governança |
| **01** | [`01-design-system.md`](./01-design-system.md) | Fundações: tokens, tipografia, componentes, 5 estados, personas×RBAC, padrão de IA | US-1, US-2, US-7, US-8/9/10/11, US-13 | **Primeiro.** É a base que `02`–`06` consomem |
| **02** | [`02-acesso-operacao.md`](./02-acesso-operacao.md) | Telas **1–3**: Login, Dashboard, Painel Operacional | US-2, US-7 (+ US-1/8/9/10/13) | "Primeiro minuto" de cada persona |
| **03** | [`03-trilha-do-ativo.md`](./03-trilha-do-ativo.md) | Telas **4–8** + Gêmeo Digital: Lista, Visão Geral, Telemetria, Saúde & IA, Dados Técnicos, Gêmeo + "E se…" | US-4, US-7, US-8/9/10/11, US-13 | Fluxo profundo do ativo e o **padrão único de IA** |
| **04** | [`04-onboarding-ativo.md`](./04-onboarding-ativo.md) | Telas **9–11**: Cadastro Manual, OCR da Placa, Mapa/Planta Digital | US-5, US-6 (+ US-3/4/7/8) | Nascimento de um ativo no sistema |
| **05** | [`05-alertas.md`](./05-alertas.md) | Telas **12–13**: Lista de Alertas, Detalhe do Alerta | US-9, US-12 (+ US-7/13) | Pipeline vivo de alertas (regra × modelo × manual) |
| **06** | [`06-assistente-ia.md`](./06-assistente-ia.md) | Telas **14–15**: Assistente conversacional (frota) e com contexto do ativo | US-12 (+ US-7/10/11/13/1) | Agente com tool use sobre o estado vivo |

**Ordem de leitura recomendada:** `01` (fundações) → `00` (tese de governança) → depois por jornada
(`02` → `04` → `03` → `05` → `06`), conforme o seu foco de implementação.

**Gabarito comum a todas as telas** (use como checklist ao ler/escrever specs): (1) Job & propósito ·
(2) Personas × RBAC + default view · (3) Arquitetura de informação · (4) Blocos & componentes ·
(5) Estados (loading/empty/error/**tempo real**/sem-permissão) · (6) User stories cobertas ·
(7) Governança nativa · (8) Confiança da IA · (9) Recomendações priorizadas (P0/P1/P2).

---

## 2. Mapa de Consistência — decisões transversais que valem para TODAS as telas

Estas cinco decisões são **invariantes de produto**. Qualquer tela nova ou refino deve respeitá-las.

### 2.1 Governança é uma ESPINHA AMBIENTE, não um item de menu

Os quatro pilares aparecem **dentro de cada tela**, não confinados ao módulo Governança:

| Pilar | Regra invariante | Onde mora a fonte de verdade | Materialização na tela |
|---|---|---|---|
| **Hierarquia (Matriz)** | O **breadcrumb É a matriz** empresa → planta → área → sistema → ativo, clicável, com escopo herdado | `Hierarquia.tsx` + `SEED_HIERARCHY`/`HTREE` (`seed.ts`) | `BC` (`ui-shared`) alimentado por `usePageChrome`; hoje estático (gap) |
| **Dicionário** | **Todo número rastreia ao Dicionário** (campo · unidade · faixa · limite · sensor · direção) | `Dicionario.tsx` + `SEED_DICTIONARY`; consumido por `evaluateAlerts` (`simulation.ts`) | `<TraceableValue>` transversal (a criar) em KPIs, alertas e detalhe |
| **RBAC** | **Toda ação é gated**: `useCan(modulo, nivel)` decide render; rota protegida por `Gate` | `rbac.ts` + `RBAC.tsx` + matriz `PERM` (`seed.ts`) | botões/inputs degradam por nível; rota cai em "Acesso negado" |
| **D-I-C-I** | **Todo artefato carrega seu ciclo** Desenho → Instalação → Comissionamento → Inspeção | `DICI.tsx` + `SEED_DICI` | `<DiciBadge assetId>` (a criar) no header do ativo e no cadastro |

**Convenção única de degradação por permissão** (já aplicada caso-a-caso; deve virar padrão):

| Nível | Render | Selo |
|---|---|---|
| `full` | Editável (inputs/cliques ativos) | "✎ Edição habilitada" |
| `read` | Somente-leitura (spans/badges) | `Lock` "Somente leitura" |
| `none` | Oculto no Sidebar; `Gate` "Acesso negado" na rota | `ShieldAlert` |

### 2.2 Padrão único de output de IA (transversal — US-8/9/10/11)

**Todo** output de ML é renderizado pelo **mesmo invólucro** (`AIConfidence`, a criar) que expõe sempre
**cinco campos**:

1. **Valor** — a predição (RUL `rulDias`, prob. de falha `prob21`, modo crítico).
2. **Janela / horizonte** — `HORIZONS = [7,14,21,30,60]` dias (`prediction.ts`).
3. **CONFIANÇA** — nível qualitativo (Alta/Média/Baixa). *Hoje inexistente no engine* → derivar de
   `twin.residual` (`simulation.ts:37`, desvio medido × esperado). **Lacuna P0 transversal.**
4. **EXPLICAÇÃO** — variáveis/causa: `modoCritico` (`worstMode`) + tags contribuintes + `residual`,
   ancorado no Dicionário.
5. **NOTA DE HONESTIDADE** — selo persistente derivado de `predictionModel.name/.metodo`:
   *"Modelo de degradação **SIMULADO** (físico-informado + Weibull), **não treinado em falhas reais**."*
   A interface `PredictionModel` (`prediction.ts`) já permite plugar um modelo treinado — **o selo
   troca sozinho** quando isso acontecer.

> **Honestidade é requisito de governança.** Distinguir "modelo simulado × treinado" e "regra (fato
> medido, confiança 100% no valor) × modelo (predição probabilística)" não é opcional.

### 2.3 Modularidade (US-1) — nav/dashboard se adaptam aos módulos contratados

- Separar **dois conceitos hoje confundidos**: *módulo não-contratado* (implantação parcial) ≠
  *módulo sem permissão do papel* (RBAC). Hoje a Sidebar trata ambos como "some o item".
- **Módulo não-contratado** → item bloqueado com cadeado + `UpsellModule` ("Falar com a Forzy"),
  **nunca** tela quebrada. Exige flag `contratados: string[]` no store/seed (hoje `modules` existe mas
  **nenhuma tela lê**).
- **Módulo contratado, sem permissão** → oculto na nav; acesso direto cai no `Gate`.
- Dashboard adaptativo: blocos declarados por módulo, renderizados só se contratado **e** visível.

### 2.4 Personas × RBAC e a DEFAULT VIEW por papel

Matriz canônica (verbatim de `seed.ts` → `PERM`; **editável em runtime** via `/governanca/rbac`):

| Papel (seed) | Dashboard | Ativos | Telemetria | Alertas | Assistente | Cadastro | OCR | Mapa | Governança | RBAC |
|---|---|---|---|---|---|---|---|---|---|---|
| **Gerente Industrial** | full | full | full | full | full | full | full | full | full | full |
| **Eng. Confiabilidade** | full | full | full | full | full | full | full | full | read | none |
| **Técnico Manutenção** | read | read | read | **full** | full | none | none | read | none | none |
| **Analista de Dados** | read | read | **full** | read | read | none | none | none | **full** | none |
| **Operador Campo** | **none** | read | none | read | none | none | none | read | none | none |

**Default view por papel** (a primeira rota com permissão ≥ read; **hoje todos caem em `/dashboard`**,
o que quebra para Operador Campo com `Dashboard:none`):

| Papel | Default view recomendada | Por quê |
|---|---|---|
| Gerente Industrial | `/dashboard` | visão de saúde da planta + KPIs |
| Eng. Confiabilidade | `/dashboard` → `/ativos` | confiabilidade por ativo/modo |
| Técnico Manutenção | **`/alertas`** | seu job é a fila; tem `Alertas:full` |
| Analista de Dados | **`/governanca/dicionario`** ou `/operacional` | dono do Dicionário + Telemetria full |
| Operador Campo | **`/operacional`** ou `/ativos` | Dashboard=none; visão de chão de fábrica |

### 2.5 Design System (já vivo em `src/lib/theme.ts`) — NÃO redesenhar a identidade

- **Cores:** fundo `#07101E` · card `#0C1829` · cobalto `#0047AB` (ação) · navy `#000080` ·
  steel `#82C8E5` (dado/realtime) · slate `#6D8196` (texto secundário) · verde `#34D399` /
  âmbar `#FBBF24` / vermelho `#F87171` / laranja `#FB923C`.
- **Tipografia:** Rajdhani (títulos/números) · JetBrains Mono (dados/tags) · Inter (corpo).
- **Risco conhecido:** dois sistemas de cor paralelos divergem em hex — `C` (`theme.ts`,
  `bg #07101E`/`card #0C1829`) vs tokens CSS (`theme.css`, `--background #080C14`/`--card #0D1829`).
  **Unificar (P0).**
- **Tempo real é estado de 1ª classe:** dado vivo em **steel**, `LiveTag` pulsante, `syncedAt` como
  caption, e refletir `settings.paused` (não "mentir ao vivo" quando pausado).
- **Componentes a adicionar (transversais):** `EmptyState`, `ErrorState`, `LiveTag`, `UpsellModule`,
  `AIConfidence`, `TraceableValue`, `DiciBadge` + usar o `Skeleton` existente.

---

## 3. Matriz Tela × User Story (cobertura US-1…US-13)

`●` = cobertura central da tela · `○` = cobertura de apoio/parcial · vazio = não se aplica.

| Tela (doc) | US-1 | US-2 | US-3 | US-4 | US-5 | US-6 | US-7 | US-8 | US-9 | US-10 | US-11 | US-12 | US-13 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Design System (01) | ● | ● | | | | | ○ | ● | ● | ● | ● | | ● |
| Login (02) | | ● | | | | | | | | | | | ○ |
| Dashboard (02) | ○ | ● | | | | | ● | ○ | ○ | ○ | | | ○ |
| Painel Operacional (02) | ○ | ● | | ○ | | | ● | | | | | | ○ |
| Lista de Ativos (03) | ○ | ● | | | | | ● | | ○ | | | | ○ |
| Visão Geral do Ativo (03) | | ○ | | ● | | | ● | | ● | | ● | | ○ |
| Telemetria (03) | | | ● | ● | | | ● | | | | | | ○ |
| Saúde & IA (03) | | | | | | | ○ | ● | ● | ● | ● | | ● |
| Dados Técnicos (03) | | | | ● | ● | | | | | | | | ● |
| Gêmeo Digital (03) | | | | ○ | | ● | ○ | ● | ● | ● | ● | | ● |
| Cadastro Manual (04) | ○ | ○ | ○ | ● | ○ | | ○ | ○ | | | | | ● |
| OCR da Placa (04) | | ● | ○ | ● | ● | | ○ | | | | | | ● |
| Mapa / Planta (04) | ○ | ● | | | | ● | ● | | | | | | ○ |
| Lista de Alertas (05) | ○ | | | | | | ○ | | ● | | | | ● |
| Detalhe do Alerta (05) | | | | | | | ● | | ● | ○ | | ● | ● |
| Assistente frota (06) | ○ | | | | | | ○ | | | ○ | ○ | ● | ● |
| Assistente contexto (06) | ○ | | | | | | ● | | ○ | ● | ● | ● | ● |
| Governança · Overview (00) | ○ | | | | | | | | | | | | ● |
| Hierarquia (00) | | | | | | ○ | ○ | | | | | | ● |
| D-I-C-I (00) | | | | | ○ | ○ | | | | | | | ● |
| Dicionário (00) | | | | ● | | | ○ | ○ | ○ | | | | ● |
| RBAC (00) | ○ | | | | | | | | | | | ○ | ● |

**Leitura da cobertura:**
- **US-13 (governança)** é a mais transversal — toca quase toda tela (espinha ambiente).
- **US-5 (OCR)** e **US-6 (planta navegável)** são as mais localizadas (onboarding, doc `04`).
- **US-8/9/10/11 (ML)** concentram-se na trilha do ativo (`03`) e nos alertas-modelo (`05`); todas
  dependem do padrão único de IA (`01` §2.2).
- **Lacuna estrutural:** US-1 (modularidade) é hoje cobertura de **apoio** em quase tudo, mas **não
  está cabeada** (nenhuma tela lê `modules`/`contratados`) — ver roadmap.

---

## 4. Roadmap P0 Consolidado — backlog único priorizado por tema

As recomendações P0 dos 7 docs foram **deduplicadas e agrupadas por tema**. Itens que apareciam em
vários docs (ex.: "gatear rota por `Gate`") foram fundidos numa única linha com todos os pontos de
toque. Esforço: **B**aixo · **M**édio · **A**lto.

### Tema A — Fechar os vazamentos de RBAC (montar o gating que falta)

> A maior fragilidade do produto hoje: o RBAC existe e é robusto (`useCan` reativo), mas **rotas e
> ações sensíveis não o aplicam** — a Sidebar só esconde o link. Acesso direto por URL e botões
> mutadores vazam. Conserto barato, crédito de credibilidade altíssimo.

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| Montar `RequireAuth` nas rotas (o app não força login hoje) | `routes.tsx` / `auth/RequireAuth.tsx` | Sem login forçado, **todo o RBAC fica enfraquecido** | B |
| Envolver `/dashboard`, `/operacional`, `/mapa`, `alertas`, `assistente` e `assistente/:assetId` em `<Gate>` | `routes.tsx` (50-51,71-72,76) | Hoje só Cadastro/OCR/Governança/RBAC têm Gate; o resto vaza `none` por URL (US-13) | B |
| Gatear ações mutadoras por nível `full` | Alertas (Resolver/Novo/Exportar/Reconhecer/Reabrir/Comentar), `applyMaintenance` em `SaudeIA.tsx:43` e `GemeoDigital.tsx:92`, ações de chrome em `AtivoDetail.tsx` (Assistente/OS) | "Toda ação é gated por RBAC"; hoje papel `read` (Analista/Operador) clica ações que mutam estado | B |
| Gatear `create_work_order` por `full` em `executeTool` + remover a tool da lista quando o papel só tem `read` | `ai/tools.ts` | Tool muta estado real (`s.addAlert`) sem checagem; read-only não deveria criar OS | M |
| Cadastro Manual exigir nível `full` no Gate (hoje default `read`) | `routes.tsx` | Criar ativo é ação de escrita, não leitura | B |
| Painel Operacional depender do módulo `Ativos`, não `Dashboard` | `Sidebar.tsx:25` | Oculta a tela mais útil do chão de fábrica justamente do Operador Campo (`Dashboard:none`, `Ativos:read`) | B |

### Tema B — Trilha de auditoria (a maior lacuna de governança)

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| `auditLog` no store + tela `/governanca/auditoria` via wrapper `logAudit` nas 5 ações | `useStore.ts:140-175` (`setRbac`, `setDici`, `upsertTag`/`removeTag`, `setHierarchy`); nova `Auditoria.tsx` | **Nenhuma** mutação de governança é registrada hoje; mudança de limite e de RBAC são as ações mais sensíveis (quem/quando/de-para). O card "Auditoria" do Overview é placeholder que aponta ao Dicionário | M |

### Tema C — Padrão único de IA com CONFIANÇA + selo de honestidade visível

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| Adicionar `confianca` ao `PredictionModel` + criar `AIConfidence` (invólucro único) | `engine/prediction.ts`; novo componente | Engine retorna `rulDias/probFalha/modoCritico` **sem confiança**; deriva de `twin.residual` (`simulation.ts:37`). Unifica Saúde & IA, Gêmeo, Visão Geral, Dashboard e Alertas | M |
| Selo de honestidade "modelo SIMULADO" persistente na UI (deriva de `predictionModel.name/metodo`) | Assistente, Dashboard (Projeção IA), trilha do ativo, Alertas-modelo | A honestidade já existe no system prompt e no header de `prediction.ts`, mas **não aparece na interface**; troca sozinha quando um modelo treinado for plugado | B |
| Nota de honestidade + horizonte na "Projeção IA" do Dashboard | `Dashboard.tsx` / `fleetHealthTrend` (`derive.ts`) | As séries "Projeção IA" e "Saúde Real" são extrapolação/reconstrução do motor SIMULADO, não log medido nem ML treinado; a UI não expõe confiança nem nota | B |
| Card de predição honesto para alertas `origem:"modelo"` (valor+horizonte/RUL+confiança+explicação+nota) | `AlertaDetalhe.tsx` | Alertas do gêmeo (`prob21>0.6`, `rulDias<60`) hoje parecem certeza; sem o padrão a predição é "nua" (US-9) | M |
| Banner de honestidade + trava de baixa confiança no OCR | `CadastroOCR.tsx` / `ai/ocr.ts` | O parser já calcula confiança por campo, mas a tela não exibe a nota ("OCR óptico, revise") nem impede cadastrar campos auto abaixo do limiar — auto-preenchimento sem revisão vira dado não confiável | B |

### Tema D — Rastreabilidade ao Dicionário e Hierarquia (materializar a espinha)

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| Componente transversal `<TraceableValue>` ligando todo número ao Dicionário | novo `components/governanca/TraceableValue.tsx` lendo `useStore(s=>s.dictionary)`; aplicar em KPIs, alertas, detalhe do ativo, leituras da Visão Geral | Concretiza "todo número rastreia ao Dicionário"; o Dicionário já é fonte canônica que `evaluateAlerts` consome | M |
| Breadcrumb navegável que materializa a Matriz de Hierarquia | helper `pathToNode(hierarchy, assetId)` (espelha recursivos de `Hierarquia.tsx`); enriquecer `chrome.tsx` + `BC` (`ui-shared:90`) | `usePageChrome` usa `bc:string[]` estático; não materializa empresa→planta→área→sistema→ativo clicável (escopo herdado) | M |
| `ReferenceLine` de limite do Dicionário + instante do disparo no mini-gráfico do alerta | `AlertaDetalhe.tsx` (`twin.history.slice(-40)`) | O gráfico mostra a curva mas não a linha de `limiteAlerta`/`limiteCritico` (por `al.tag`) nem o instante de ruptura; a evidência fica sem âncora ao Dicionário | M |
| Sensores e dados de placa derivados do Dicionário/asset, não hard-coded | `Tecnico.tsx:32-43,16` (IP55/380V/60Hz e 4 cards de sensores fixos no JSX) | Divergem do Dicionário real (`tag.sensor/tag.key`) se ele mudar, quebrando a rastreabilidade | M |
| Ancorar Localização/áreas na Hierarquia e posicionar ativos novos no mapa | `CadastroManual.tsx` (planta/área texto livre), `MapaPlanta.tsx` (`areas`/`apos` hardcoded) | Ativos recém-criados não aparecem no SVG (só na lista); US-6 "perde" ativos novos e a Hierarquia não é a espinha que deveria ser | M |

### Tema E — Distinção origem/honestidade nas listas e telas factuais

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| Distinguir visualmente origem `regra` (fato medido) × `modelo` (predição) na Lista e no Detalhe | `AlertasLista.tsx`, `AlertaDetalhe.tsx` (`ORIGEM_METODO`) | `Alert.origem` já é estrutural mas a UI mostra texto cru; sem ícone/chip o usuário não diferencia limite cruzado (100% medido) de probabilidade preditiva | B |
| Honestidade da janela de telemetria (7d/30d só têm 24h reais) + filtros funcionais na Lista de Ativos | `Telemetria.tsx` (`HISTORY_CAP=288`), `AtivosLista.tsx` (3 selects `.slice(0,3)` sem `onChange`, botão Filtros decorativo, sem empty state) | Escolher 30d mostra 24h silenciosamente; filtros da lista são decorativos | M |

### Tema F — Coerência de tempo real e fundações visuais

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| Honestidade de tempo real no Painel (refletir `settings.paused`) + ação no `IBtn "Ao vivo"` | `Painel.tsx:54` | "Transmissão ao vivo" e o ponto pulsante mentem quando a simulação está pausada | B |
| Unificar a paleta entre `C` (`theme.ts`) e tokens CSS (`theme.css`) | `theme.ts` ↔ `theme.css` | Divergência de hex (`#07101E`↔`#080C14`, `#0C1829`↔`#0D1829`) cria risco de drift visual | B |
| Componentizar os 5 estados: `EmptyState`, `ErrorState`, `LiveTag` + usar o `Skeleton` existente | `ui-shared` / `app/components/ui/skeleton.tsx` | Cada tela improvisa ("Carregando…", "Nenhum…"); não há estado de erro e o realtime não tem marcação apesar de `syncedAt`/`residual` existirem | M |

### Tema G — Modularidade (US-1) e default view por papel

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| Separar "módulo não-contratado" de "sem-permissão" + criar `UpsellModule` | `Sidebar.tsx` (`visible`); flag `contratados` no store/seed | Hoje a sidebar só filtra por `permLevel`, tratando não-contratado e sem-permissão como a mesma coisa, sem upsell. US-1 exige módulo ausente → upsell, nunca tela quebrada | M |
| Default view por papel pós-login (não fixar em `/dashboard`) | `Login.tsx:18`, `routes.tsx:49` | Operador Campo tem `Dashboard:none` (`seed.ts:102`) mas é mandado para `/dashboard`; cada persona deve cair na rota mais útil que seu RBAC permite | M |
| Substituir KPIs hardcoded e credenciais pré-preenchidas do Login | `Login.tsx:49-52` (247/5/97.4%/2.1h) | Os 4 KPIs são literais que o Dashboard real contradiz (10 ativos no seed); email/senha demo ficam pré-preenchidos sem flag de ambiente (risco demo→produção) | B |

### Tema H — Robustez de fluxo (degradação silenciosa)

| Item | Tela / arquivo | Por quê | Esforço |
|---|---|---|---|
| Consistência de header/abas: `<TwinGate>` único para offline + cabeçalho herdado | `AtivoDetail.tsx` + abas | Cada aba repete seu próprio early-return "Ativo offline" e o header não marca números de IA; extrair gate único garante o contrato de consistência da trilha | M |
| Tratar `:assetId` inválido no Assistente com empty-state, em vez de degradar para frota | `Assistente.tsx` (`ctx = !!asset`) | Um `assetId` inválido cai no modo frota sem avisar, perdendo o contexto pedido | B |
| Derivar "Conformidade por Planta" do estado real (`hierarchy` × `dici`) | `Overview.tsx:56-59` | Conformidade por planta é hardcoded em vez de cruzar hierarquia × D-I-C-I | B |

---

## 5. Próximos passos — o que implementar primeiro no produto real

A sequência abaixo maximiza **credibilidade de governança por esforço**, respeitando dependências.

1. **Onda 1 — Tampar os vazamentos de RBAC (Tema A).** Esforço majoritariamente **baixo**, impacto de
   credibilidade altíssimo. Montar `RequireAuth`, envolver as rotas faltantes em `<Gate>`, gatear
   ações mutadoras e corrigir o módulo do Painel (`Dashboard`→`Ativos`). É o pré-requisito ético para
   tudo: sem isso, o RBAC é decorativo.

2. **Onda 2 — Trilha de auditoria (Tema B).** Um único `logAudit` nas 5 ações do store + a tela
   `/governanca/auditoria`. Fecha a lacuna mais grave de governança e dá rastreabilidade quem/quando/
   de-para às ações sensíveis (limite e RBAC).

3. **Onda 3 — Padrão único de IA com confiança e honestidade (Temas C + E).** Adicionar `confianca`
   ao `PredictionModel` (de `twin.residual`), criar `AIConfidence` e o selo `SIMULADO` persistente,
   e aplicá-los em Saúde & IA, Gêmeo, Dashboard (Projeção IA), Alertas-modelo e OCR. Garante que
   nenhuma predição apareça "nua".

4. **Onda 4 — Materializar a espinha de rastreabilidade (Tema D).** `<TraceableValue>`,
   `pathToNode`/breadcrumb navegável, `ReferenceLine` no Detalhe do Alerta e sensores derivados do
   Dicionário. Transforma a tese "todo número rastreia ao Dicionário/Hierarquia" em comportamento.

5. **Onda 5 — Fundações visuais e coerência de tempo real (Tema F).** Unificar a paleta, criar
   `EmptyState`/`ErrorState`/`LiveTag`, plugar `Skeleton` e refletir `settings.paused`. Baixo risco,
   paga dívida acumulada e prepara o terreno para fonte de dados real.

6. **Onda 6 — Modularidade e primeiro minuto por persona (Tema G) + robustez (Tema H).** Flag
   `contratados` + `UpsellModule`, default view por papel, limpeza do Login, `<TwinGate>` único e
   tratamento de `assetId` inválido. Completa a jornada Login → default view → módulos contratados →
   tela que respeita permissão.

> **Princípio condutor.** O produto já é vivo e governado por RBAC; o que falta é **aplicar
> consistentemente** o que já existe (gating, honestidade de IA, rastreabilidade ao Dicionário) e
> **expor na UI** o que hoje só vive no engine/prompt. Quase todo P0 é "ligar fio existente", não
> construir do zero.
