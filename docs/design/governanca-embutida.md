# Predicta · Governança Embutida — dissolvendo o módulo "Governança" no produto

> **Regra central:** governança **não** é uma aba, uma macroárea, nem telas teóricas. Ela é uma
> **camada transversal** que vive dentro das telas operacionais e administrativas — como contexto do
> dado, origem do alerta, explicação da recomendação, rastreabilidade da decisão, estrutura de
> navegação e restrição de acesso. Este documento mostra **como** redistribuir as 5 estruturas de
> governança nas telas já existentes do Predicta, **removendo** o menu/área "Governança".

Voz: Product Designer / UX Strategist / Systems Designer sênior. Ancorado no produto real
(`src/components/layout/Sidebar.tsx`, `chrome.tsx`/`BC`, `auth/rbac.ts`, `store` slices `hierarchy`/`dici`/
`dictionary`/`rbac`/`users`, `engine/simulation.evaluateAlerts`, `engine/prediction`). Dá continuidade à
decisão já tomada: **D-I-C-I = pirâmide DIKW "Da Leitura à Decisão"** (Dado→Informação→Conhecimento→
Inteligência/Ação) + **"Ciclo do Ativo"** (Desenho→Instalação→Comissionamento→Inspeção) como visão
documental.

---

## BLOCO 1 — Nova lógica de governança embutida no produto

**Tese.** Hoje a governança existe como um grupo de menu "GOVERNANÇA" com 5 telas (Visão Geral,
Hierarquia, D-I-C-I, Dicionário, RBAC). Isso a faz parecer um *sistema paralelo, teórico*. A reformulação
**dissolve esse grupo** e o substitui por dois movimentos:

1. **Consumo distribuído (95% dos casos):** a governança aparece *onde a decisão acontece* — embutida nas
   telas de operação, ativos, alertas e assistente — como **6 manifestações nativas**:
   - **Breadcrumb = Hierarquia.** A barra `empresa › planta › área › sistema › ativo` no topo de toda tela
     *é* a Matriz de Hierarquia. Navegar pela operação é navegar pela hierarquia industrial.
   - **TraceableValue = Dicionário.** Todo número é clicável e revela sua tag (campo, unidade, faixa,
     limite, sensor, direção). Rastreabilidade vira um gesto, não uma tela.
   - **Trilha do dado (D-I-C-I/DIKW).** No detalhe do ativo e do alerta, um painel mostra a cadeia
     Dado→Informação→Conhecimento→Inteligência/Ação. Governança como *explicação*, não como diagrama.
   - **Selo de IA governada (AIConfidence).** Todo output de ML expõe valor + horizonte + confiança +
     explicação + nota de honestidade (modelo SIMULADO / fonte do RAG). Honestidade visível.
   - **Gating de ação (RBAC).** Botões/ações carregam o RBAC: badge de permissão, desabilitação com
     motivo, ocultação de módulos não contratados (modular, US-1). Acesso é sentido, não lido.
   - **Trilha de auditoria contextual.** Cada escrita (resolver alerta, registrar manutenção, editar
     limite/permissão) deixa um evento auditável *no contexto do objeto*, não numa tela à parte.

2. **Gestão concentrada (5% dos casos):** os *datasets* de governança que precisavam de telas dedicadas
   (matriz RBAC, estrutura da planta, dicionário de tags, status do Ciclo do Ativo, auditoria) migram para
   uma área de **Administração** — percebida como *"administrar a operação"* (usuários, acessos, catálogo,
   estrutura, auditoria), **não** como "Governança". É a diferença entre um *painel de configuração normal*
   de um produto industrial e uma seção abstrata de governança.

**Como o usuário percebe.** O técnico nunca "entra na governança": ele clica num número e vê de onde veio;
clica num ativo citado pelo assistente e abre o ativo; vê por que um alerta disparou (regra do dicionário
vs. modelo); tenta uma ação e o sistema mostra se ele pode. O gestor vê KPIs já recortados pelo seu escopo
de planta. O admin gerencia acessos e catálogo numa área de Administração comum. **Governança deixou de ser
um lugar e virou uma propriedade do sistema.**

**Quais telas absorvem o quê (resumo):**

| Estrutura | Vive principalmente em | Forma dominante |
|---|---|---|
| Matriz de Hierarquia | **todas** (breadcrumb) + Lista de Ativos, Painel, Mapa, Cadastro, Administração | breadcrumb · filtro hierárquico · árvore espacial |
| D-I-C-I (DIKW) | Saúde & IA, Detalhe do Alerta (+ Telemetria) | painel "trilha do dado" · timeline |
| Dicionário de Rastreabilidade | **todas** (TraceableValue) + Telemetria, Detalhe do Alerta, Dados Técnicos, Administração | tooltip/popover de origem · tabela de linhagem |
| Rastreabilidade & Navegação | breadcrumbs + cross-links Alerta→Ativo→Assistente→OS + links de ativo no chat | navegação governada · grafo contextual |
| RBAC | **todas** (gating) + Administração (matriz) | badge/desabilitação de ação · matriz em Admin |

---

## BLOCO 2 — Redistribuição das 5 estruturas dentro das telas existentes

### 1. Matriz de Hierarquia → o ambiente de navegação
- **Toda tela** → **breadcrumb hierárquico** (`empresa › planta › área › sistema › ativo`) gerado de
  `pathToNode(hierarchy, id)`, clicável em cada nível (sobe a árvore). Componente `HierarchyBreadcrumb`
  substitui o `BC` atual e passa a refletir a cadeia completa (hoje é raso).
- **Lista de Ativos, Painel, Mapa, Lista de Alertas** → **filtro hierárquico encadeado**
  (planta → área → linha), com a contagem por nó. O recorte respeita o **escopo do papel** (um operador de
  uma planta só vê a subárvore dele) — RBAC × Hierarquia juntos.
- **Mapa da Planta** → a hierarquia **espacializada**: clicar numa área entra nela; cada ativo é um nó.
- **Cadastro (manual/OCR)** → é **aqui que a hierarquia é editada**: ao criar o ativo você o pendura em
  planta/área/sistema. Sem tela "Hierarquia": a estrutura nasce no fluxo de cadastro e é ajustável em
  Administração → Estrutura da Planta.

### 2. D-I-C-I (DIKW) → a explicação da decisão
- **Saúde & IA do ativo** → painel vertical **"Da Leitura à Decisão"**: **Dado** (leituras + sensor/tag) →
  **Informação** (baseline + limites do dicionário) → **Conhecimento** (saúde, anomalia, RUL, modo crítico)
  → **Inteligência/Ação** (recomendação + registrar manutenção/OS). Cada degrau é clicável e rastreável.
- **Detalhe do Alerta** → a mesma cadeia, do gatilho à ação: leitura que cruzou o limite → informação
  (limite do dicionário) → conhecimento (severidade/modo) → ação (resolver/OS/abrir ativo).
- **Telemetria** → expõe as camadas Dado→Informação (série bruta + baseline/limite sobreposto).
- *Ciclo do Ativo* (D-I-C-I documental) vira **timeline** em Dados Técnicos + selo no cabeçalho do ativo.

### 3. Dicionário de Rastreabilidade → o contexto do número
- **Toda tela com número** → `TraceableValue`: passar/clip num valor abre **popover de origem** (campo,
  unidade, faixa, `limiteAlerta`/`limiteCritico`, sensor, direção, e se há override por ativo em
  `asset.limites`). Ex.: temperatura `82 °C` → "Tag temp · °C · 0–120 · alerta>75 · crítico>80 · PT100".
- **Detalhe do Alerta** → **tabela de linhagem** tag → limite cruzado → modelo → ação.
- **Administração → Catálogo** → o dicionário de tags continua **editável** (criar/editar limite); editar um
  limite ali recalcula alertas no motor (efeito já existente em `evaluateAlerts`). Sem tela "Dicionário"
  isolada: é o catálogo de uma área de Administração.

### 4. Dicionário de Rastreabilidade e Navegação → o fluxo governado
- **Cross-links contextuais**: Alerta → Ativo → (aba Saúde) → Assistente → criar OS, cada salto preservando
  o objeto e o breadcrumb. A **navegação É a rastreabilidade**.
- **Assistente** → **ativos citados viram links** (já implementado) e **citações do RAG são clicáveis**
  (documento + página) — o caminho da informação até a fonte.
- O antigo "mapa tela × requisito × US" deixa de ser tela e vira **metadado de produto** (documentação +,
  opcionalmente, um diagnóstico em Administração → Sistema), nunca uma seção teórica para o usuário final.

### 5. RBAC → a restrição sentida, não lida
- **Toda ação de escrita** (resolver/reabrir alerta, registrar manutenção, criar OS, novo ativo, editar
  limite/permissão) → `GatedButton`: se o papel não pode, o botão fica **desabilitado com tooltip de
  motivo** ("Requer Ativos = total") em vez de sumir silenciosamente. Fecha o **gap P0** atual (hoje
  `applyMaintenance`/criar OS não passam por `can()`).
- **Sidebar/rotas** → módulos sem permissão são ocultados; módulo não contratado vira **upsell** (US-1),
  nunca tela quebrada.
- **Administração → Acessos** → a **matriz papel × módulo** (hoje em Governança→RBAC) e os **usuários**
  passam a viver no gerenciamento de usuários — administração comum, não "Governança".

---

## BLOCO 3 — Reestruturação tela por tela

Legenda das colunas: **(1)** como a governança entra · **(2)** qual estrutura · **(3)** como aparece visualmente ·
**(4)** padrão de UI · **(5)** user stories sustentadas.

### 1. Login
1. Estabelece a **identidade e o escopo** (papel) que governa todo o resto; decide a *default view* por papel.
2. RBAC (origem) + Hierarquia (escopo do papel).
3. Discreto: selo "acesso protegido · SSO+MFA" (já existe) e **roteamento por papel** após entrar.
4. **Restrição/roteamento** (não há UI de governança visível).
5. US-13.

### 2. Dashboard inicial
1. KPIs já **recortados pelo escopo** de planta do usuário; tiles adaptam-se aos módulos contratados.
2. Hierarquia (breadcrumb/escopo) + RBAC (tiles) + IA (tile de projeção).
3. Breadcrumb `empresa › planta`; tiles bloqueados viram **upsell**; o tile "Projeção IA" traz **selo de
   confiança + SIMULADO**.
4. **Breadcrumb + cards gated + badge de confiança**.
5. US-1, US-7, US-8, US-13.

### 3. Painel operacional
1. Monitoramento recortado pela hierarquia; status de cada ativo rastreável ao limite.
2. Hierarquia (filtro) + Dicionário (status) + RBAC (ações rápidas) + realtime honesto.
3. **Filtro planta/área/linha**; dot de status com `TraceableValue`; selo "ao vivo" respeita `paused`.
4. **Filtro hierárquico + status rastreável + ação gated**.
5. US-7, US-4, US-13.

### 4. Lista de ativos
1. Recorte + rastreabilidade das colunas + estágio de ciclo por ativo.
2. Hierarquia (breadcrumb+filtro) + Dicionário (colunas) + Ciclo do Ativo (chip) + RBAC ("Novo Ativo").
3. Breadcrumb+filtro; saúde/status com `TraceableValue`; **chip de estágio** (D/I/C/I); botão "Novo Ativo"
   gated.
4. **Breadcrumb + filtro + TraceableValue + chip de status + GatedButton**.
5. US-7, US-13.

### 5. Detalhe do ativo — visão geral
1. Cabeçalho carrega identidade governada (hierarquia, ciclo, procedência); métricas rastreáveis.
2. Hierarquia (breadcrumb completo) + Ciclo do Ativo (selo) + Dicionário (métricas) + RBAC (ações).
3. Breadcrumb `empresa→…→ativo`; **selo "Ciclo do Ativo"** + **procedência (Manual/OCR)**; KPIs com
   `TraceableValue`.
4. **Breadcrumb + metadata/selo no header + TraceableValue + ações gated**.
5. US-7, US-13.

### 6. Detalhe do ativo — telemetria
1. Cada grandeza tem origem; baseline/limites mostram a camada de "Informação".
2. Dicionário (séries/limites) + D-I-C-I (Dado→Informação) + RBAC (export).
3. Legenda/eixo com `TraceableValue` por tag; **linha de limite** (ReferenceLine) do dicionário; overlay de
   baseline com **nota SIMULADO**; export gated.
4. **Tooltip/popover de origem + overlay + GatedButton**.
5. US-4, US-7, US-3, US-13.

### 7. Detalhe do ativo — saúde / baseline / anomalia / manutenção
1. É a **casa do D-I-C-I (DIKW)**: do dado bruto à ação recomendada, tudo explicado e rastreável.
2. D-I-C-I (DIKW completo) + Dicionário (limites) + IA (confiança) + RBAC (registrar manutenção).
3. **Painel "Da Leitura à Decisão"** (4 degraus clicáveis) + **envelope AIConfidence** (valor+horizonte+
   confiança+explicação+SIMULADO); "Registrar manutenção" gated + gera **evento auditável**.
4. **Painel lateral/timeline + bloco de IA governada + GatedButton + auditoria**.
5. US-8, US-9, US-10, US-11, US-13.

### 8. Detalhe do ativo — dados técnicos
1. A ficha **é** o dicionário aplicado ao ativo + o ciclo documental.
2. Dicionário (campos→tags) + Ciclo do Ativo (D-I-C-I documental) + procedência + RBAC (edição).
3. Cada campo com `TraceableValue` (e override `asset.limites` visível); **timeline do Ciclo do Ativo**
   (Desenho/Instalação/Comissionamento/Inspeção); selo de procedência (Manual/OCR + confiança).
4. **Tabela de metadados + timeline + tags + edição gated**.
5. US-5, US-13, US-4.

### 9. Cadastro manual de ativo
1. É **onde a hierarquia é autorada** e o ciclo nasce.
2. Hierarquia (vínculo planta/área/sistema) + Ciclo do Ativo (D=pendente) + Dicionário (tags por classe) +
   RBAC (Cadastro=full).
3. **Seletor hierárquico** (planta→área→sistema) no formulário; estágio inicial do ciclo; tela inteira
   gated.
4. **Filtro/seletor hierárquico + restrição de acesso + estado inicial de ciclo**.
5. US-3, US-13, US-1.

### 10. Cadastro por imagem da placa (OCR)
1. Governa a **procedência e a qualidade** do dado de origem (placa).
2. Dicionário/procedência (origem OCR + confiança por campo) + Hierarquia (vínculo) + RBAC (OCR).
3. **Confiança por campo** + validação humana antes de salvar (aceite governado); selo "origem: OCR".
4. **Metadata de origem + bloco de validação + restrição**.
5. US-5, US-13.

### 11. Mapa da planta
1. A hierarquia industrial **espacializada** e navegável.
2. Hierarquia (espacial) + Dicionário (status dos marcadores) + Navegação governada + RBAC (escopo).
3. Planta como fundo; **marcadores por status** (rastreáveis), clique → ativo; camadas por área.
4. **Árvore/mapa hierárquico + status + navegação**.
5. US-6, US-13.

### 12. Lista de alertas
1. Cada alerta carrega **de onde veio** (regra do dicionário vs. modelo de IA).
2. Dicionário (origem-regra) + IA (origem-modelo) + Hierarquia (filtro) + RBAC (ack/resolver) + auditoria.
3. **Badge de origem** (regra/modelo) + severidade rastreável ao limite; filtro hierárquico; ações gated;
   ciclo de vida.
4. **Tag de origem + filtro + GatedButton + status/ciclo**.
5. US-9, US-12, US-13.

### 13. Detalhe do alerta
1. É a **casa da rastreabilidade**: do alerta ao sensor, limite, modelo e ação.
2. Dicionário (linhagem) + D-I-C-I + Navegação (cross-links) + RBAC (ações) + auditoria.
3. **Tabela de linhagem** alerta→tag→limite→modelo→ação; mini-gráfico com **linha de limite**; trilha
   D-I-C-I; ações (resolver/OS/abrir ativo/perguntar ao assistente) gated; **timeline de auditoria**.
4. **Tabela de rastreabilidade + timeline + cross-links + GatedButton + bloco de auditoria**.
5. US-9, US-12, US-13.

### 14. Assistente conversacional
1. IA **governada**: toda resposta tem origem, confiança e honestidade; navegação rastreável.
2. IA (confiança/honestidade) + Navegação (links) + RBAC (o que o assistente vê/faz) + Dicionário (citações).
3. **AIConfidence** por resposta; **ativos citados viram links** (feito); **citações do RAG clicáveis**
   (doc+página) + estado "sem fonte"; ações sugeridas gated por papel.
4. **Badge de confiança + links/citações + restrição de ação**.
5. US-12, US-13.

### 15. Assistente com contexto técnico do ativo
1. Mesmo, com o **contexto do ativo** (hierarquia + dicionário + alertas) injetado e governado.
2. Hierarquia/Dicionário (painel de contexto) + IA + RBAC + Navegação.
3. **Painel de contexto** (saúde/RUL/alertas do ativo, rastreáveis) + respostas com confiança;
   criar OS gated; rastreabilidade ativo→resposta.
4. **Painel lateral de contexto + badge + GatedButton**.
5. US-12, US-9, US-13.

### 16. Administração / usuários / permissões
1. O **único** lugar de **gestão** dos datasets de governança — enquadrado como administração da operação.
2. RBAC (matriz + usuários) + Hierarquia (estrutura da planta) + Dicionário (catálogo) + Ciclo do Ativo +
   Auditoria.
3. **Matriz papel × módulo** (click-cycle none→read→full) + lista de usuários; **editor de estrutura da
   planta**; **catálogo de tags/limites**; status do Ciclo do Ativo; **trilha de auditoria** consolidada.
4. **Tabelas/matriz + editores + bloco de auditoria**, sob o rótulo **Administração** (não "Governança"),
   tudo gated a admin/TI.
5. US-13 (sustenta todas as demais).

---

## BLOCO 4 — Regras de design para governança embutida

**R1 · Permissão sem burocracia.** Nunca uma "tela de permissões" no fluxo do operador. RBAC aparece como
**estado da ação**: `GatedButton` (desabilitado + tooltip com o motivo e o nível exigido), módulos ocultos na
sidebar, módulo não contratado como **upsell**. A matriz papel×módulo só existe em **Administração**.

**R2 · Rastreabilidade sem poluir.** Origem do dado é **sob demanda**, não permanente: todo número é
`TraceableValue` (afeta o hover/clique, não o layout). O detalhe completo (linhagem tag→limite→modelo→ação)
só aparece **no Detalhe do Alerta** e em **Dados Técnicos**, onde é esperado. Um número, um clique, a fonte.

**R3 · D-I-C-I onde a decisão mora.** Use o padrão **"Da Leitura à Decisão"** (Dado→Informação→Conhecimento→
Inteligência/Ação) **apenas** em Saúde & IA (ativo) e Detalhe do Alerta — como **painel/timeline**, não como
diagrama abstrato. O **Ciclo do Ativo** (D-I-C-I documental) é um **selo + timeline** em Dados Técnicos.
Nunca uma tela "D-I-C-I" solta.

**R4 · Hierarquia é navegação, não cadastro.** A Matriz de Hierarquia se manifesta como **breadcrumb
clicável** (toda tela) + **filtro hierárquico** (listas/mapa) + **escopo por papel**. Sua **edição** acontece
no **Cadastro** (nascimento) e em **Administração → Estrutura**, jamais numa tela "Hierarquia" teórica.

**R5 · IA governada por padrão.** Todo output de ML usa o **mesmo envelope** (`AIConfidence`): valor +
janela/horizonte + **confiança** + **explicação** (variáveis) + **nota de honestidade** (modelo SIMULADO /
fonte do RAG / "sem fonte"). O assistente exibe **origem, contexto e recomendação** — e **linka** o ativo e a
fonte citados. Honestidade é componente, não texto avulso.

**R6 · Auditoria no contexto do objeto.** Toda escrita registra um evento auditável **onde o objeto vive**
(timeline no alerta/ativo) e é **consolidada** em Administração → Auditoria. Sem "tela de logs" desconectada.

**R7 · Vocabulário de componentes da governança** (viram padrão do design system, em `ui-shared`):
`HierarchyBreadcrumb`, `TraceableValue`, `DataToDecisionPanel` (DIKW), `AIConfidence`, `GatedButton`,
`OriginBadge` (regra/modelo · manual/OCR), `LifecycleTimeline` (Ciclo do Ativo + auditoria), `AssetLink`
(citação→ativo), `CitationChip` (RAG). Cada um encapsula uma estrutura de governança como **micro-padrão**
reutilizável — é assim que a governança fica embutida e coerente, não "enfiada".

**R8 · Distribuição por domínio.** Operação (Dashboard/Painel) → breadcrumb + escopo + confiança. Ativos →
TraceableValue + D-I-C-I + ciclo + gating. Alertas → origem + linhagem + auditoria. Assistente → confiança +
links + restrição. Administração → matriz RBAC + estrutura + catálogo + auditoria. **Nenhum domínio chamado
"Governança".**

---

## Implicação de implementação (o que muda no código)

- **Remover** o grupo "GOVERNANÇA" da `Sidebar` e as rotas `/governanca/*`.
- **Realocar:** `governanca/RBAC` → **Administração → Acessos** (matriz + usuários, hoje já há a tabela de
  usuários em `RBAC.tsx`); `governanca/Hierarquia` → **Administração → Estrutura** + seletor no Cadastro;
  `governanca/Dicionario` → **Administração → Catálogo** + `TraceableValue` em todo lugar;
  `governanca/DICI` → **Ciclo do Ativo** (selo/timeline no ativo) + status em Administração;
  `governanca/Overview` → KPIs migram para o Dashboard/Administração.
- **Criar** os micro-padrões da R7 em `src/components/ui-shared/` e aplicá-los nas telas (P0: `GatedButton`
  nas ações de escrita; `HierarchyBreadcrumb`; `AIConfidence`; `TraceableValue`).
- **Administração** passa a ser um item normal da sidebar (gated a admin/TI), absorvendo a gestão — sem o
  rótulo "Governança".
