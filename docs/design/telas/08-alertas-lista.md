# Tela 08 — Lista de Alertas

> Refinamento de produto · PREDICTA / FORZY · Dark mode industrial B2B
> Arquivo real: `src/pages/AlertasLista.tsx` · Motor: `src/engine/simulation.ts`
> Cobre **US-9** (previsão de anomalias) e **US-12** (assistente sugere solução de falhas).

---

## 1. Nome da tela

**Lista de Alertas** — fila operacional única de eventos que exigem atenção humana, consolidando três
origens heterogêneas em um modelo de dado comum (`Alert`): **regra** (limite do Dicionário rompido),
**modelo** (projeção do gêmeo digital) e **manual** (registro humano). É a tela de triagem entre o
monitoramento contínuo (Dashboard/Telemetria) e a ação corretiva (Detalhe do Alerta, Assistente, Ativo).

No breadcrumb (`usePageChrome(["Alertas","Lista de Alertas"])`) ela se posiciona como a *fila de trabalho*
do módulo Alertas — não um histórico, mas uma bancada de priorização viva.

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE):** hoje `AlertasLista.tsx` já entrega uma fila funcional e
viva. Quatro KPIs no topo (Total Abertos, Críticos, Altos, Médios) calculados sobre `alerts` filtrando
`status !== "resolvido"`; busca textual (`q` sobre `titulo` + `assetId`); dois selects de filtro
(severidade e status); uma tabela densa de 7 colunas ordenada por `criadoEm` desc; linha clicável que
navega para `/alertas/:id`; ações inline de Ver (olho) e Resolver (check, gated por `useCan("Alertas",
"full")`); criação de alerta manual via formulário inline com geração de ID sequencial (`ALT-{ano}-{seq}`);
e exportação CSV. **A inteligência de fila real mora no motor**, não na tela: `evaluateAlerts()` em
`simulation.ts` já faz **dedup** (`openFor` impede duplicar um alerta aberto do mesmo `assetId`+`tag`+`origem`),
**auto-resolução** (quando o valor volta para dentro do limite ou `prob21 < 0.4`, o alerta `managed` vira
`resolvido`), **auto-escalada** (alerta `alto` vira `critico` quando rompe o limite crítico) e **snooze**
(janela de 24h sim que impede recriar um alerta recém-resolvido enquanto a condição persiste).

**O que REFINAR:** o objetivo desta tela deve ser elevado de *"listar e resolver"* para **"priorizar com
contexto e despachar para investigação"**. A tela precisa (a) tornar visível a **origem** (regra×modelo×manual)
e o atributo `managed` — hoje completamente ausentes da UI apesar de existirem no dado; (b) expor o status
intermediário **`em_analise`** (existe em `AlertStatus` e no filtro, mas não há ação que o atinja);
(c) traduzir a mecânica invisível de dedup/snooze/auto-resolução em **feedback legível** ("auto-resolvido
pelo motor", "re-suprimido por 24h"); e (d) abrir o caminho para **investigar** — a ponte para o Assistente
(US-12) que hoje não existe a partir desta fila. O objetivo é que um Técnico ou Gestor, em até 5 segundos,
saiba *o que ataca primeiro, por quê, e com qual ferramenta*.

---

## 3. Perfil principal que usa a tela

| Persona | Uso primário | Nível RBAC típico (`Alertas`) |
|---|---|---|
| **(a) Técnico de Manutenção** | Persona-foco. Triagem diária, pega o crítico, investiga, resolve. | `full` |
| **(b) Gestor Industrial** | Visão de carga da fila, SLA, distribuição por área/criticidade; delega. | `full` ou `read` |
| **(c) Cliente da Indústria** | Acompanha alertas dos próprios ativos; leitura, sem resolver. | `read` |
| **(d) Admin Forzy** | Visão cross-cliente, valida comportamento do motor (dedup/snooze). | `full` |
| **(e) TI/Governança** | Audita rastreabilidade (alerta → Dicionário → sensor), origem e ciclo. | `read` |

O gating real já distingue leitura de escrita: `canWrite = useCan("Alertas","full")` controla *Novo alerta*,
*Resolver* e (no refino) *Investigar/Snooze/Atribuir*. A própria entrada na tela é governada por
`can("Alertas","read")` na rota.

---

## 4. User stories da Forzy atendidas

| US | Como esta tela atende | Estado |
|---|---|---|
| **US-9** (ML previsão de anomalias) | Alertas `origem: "modelo"` nascem de `prob21 > 0.6 && rulDias < 60` no `evaluateAlerts()`; título "Falha prevista em ~N dias". | JÁ EXISTE no motor; **REFINAR** exibição (origem + confiança na linha). |
| **US-12** (conversacional sugere solução) | Ponte "Investigar com Assistente" a partir do alerta, passando contexto (ativo, modo, tag). | **REFINAR** — hoje inexistente; ação de investigar leva só ao detalhe. |
| US-3/US-4 (dado raw, sensores V/A/RPM/°C) | Alerta de regra carrega `tag` (temp/vib/press/corrente/rpm/oleo) e descreve valor vs. limite com unidade. | JÁ EXISTE (`ruleDesc`); **REFINAR** mostrar a tag/valor na fila. |
| US-7 (valores + histórico) | Cada alerta linka ao ativo cujo gráfico histórico contextualiza o evento. | JÁ EXISTE via navegação. |
| US-10/US-11 (parada/manutenção planejada) | Alerta preditivo expõe RUL e modo dominante → insumo para planejar manutenção. | JÁ EXISTE no dado; **REFINAR** CTA "Agendar manutenção". |
| US-13 (governança de acessos/dados) | RBAC gateia escrita; rastreabilidade alerta→Dicionário→sensor; ciclo D-I-C-I do ativo. | Parcial; **REFINAR** trilha de auditoria do alerta. |

---

## 5. Blocos e seções da tela

| # | Bloco | Conteúdo / função | Arquivo-âncora |
|---|---|---|---|
| B1 | **Page chrome** (breadcrumb + ações) | "Alertas › Lista de Alertas"; à direita *Exportar* (CSV) e *Novo alerta* (gated). | `usePageChrome(...)` linhas 72-81 |
| B2 | **Faixa de KPIs (4 cards)** | Total Abertos / Críticos / Altos / Médios, com ponto pulsante colorido. Cores: red/red/orange/yellow. | linhas 85-100 |
| B3 | **Formulário inline de novo alerta** (colapsável, gated) | Título + select de ativo + select de severidade + Criar/Cancelar. | linhas 102-123 |
| B4 | **Barra de filtros** | Busca textual + select severidade + select status. | linhas 125-136 |
| B5 | **Tabela de alertas** | 7 colunas, zebra, hover, linha clicável, ações inline; empty-state. | linhas 138-173 |

**Reorganização proposta (refino):** introduzir um **B2.5 — barra de segmentação por origem e SLA**
(chips *Regra · Modelo · Manual* + *Vence em <2h*) entre KPIs e filtros; e converter B5 de uma tabela
plana para uma tabela **agrupável** (por severidade ou por ativo) sem perder a densidade.

---

## 6. Componentes principais

| Componente | Papel na tela | Origem real | Refino |
|---|---|---|---|
| `SevBadge` | Pílula de severidade (crítico/alto/médio/baixo). | `ui-shared/index.tsx` | Reaproveitar; manter cor canônica. |
| `Badge` | Pílula de status (aberto/em_análise/resolvido). | `ui-shared` | Adicionar variante para `em_analise` com âmbar. |
| `IBtn` | Botão-ícone "Exportar". | `ui-shared` | OK. |
| KPI cards (inline) | 4 contadores vivos. | inline 85-100 | Extrair para `KPI` compartilhado; torná-los **filtros clicáveis**. |
| Tabela `<table>` (inline) | Fila densa. | inline 138-173 | Adicionar colunas Origem + Tag/Valor; agrupamento. |
| Filtros `<select>` (inline) | Severidade/Status. | inline 130-135 | Adicionar filtro **Origem** e **Ativo/Área**. |
| Formulário novo alerta (inline) | Criação manual. | inline 102-123 | OK; validação já presente (`toast.error`). |
| `downloadCSV` | Export. | `src/lib/csv.ts` | Respeitar filtro ativo (exportar `filtered`, não `alerts`). |
| `toast` (sonner) | Feedback de ação. | dep | Usar também para auto-resolução/snooze. |
| `OrigemBadge` (**novo**) | Distingue regra×modelo×manual + flag `managed`. | a criar em `ui-shared` | **Criar.** |
| Linha de **confiança preditiva** (**novo**) | Para `origem: "modelo"`, exibir % e horizonte. | derivar de `twin.probFalha` | **Criar.** |

---

## 7. Dados exibidos

| Campo na UI | Origem no dado (`Alert` / store) | Unidade / formato | Observação de refino |
|---|---|---|---|
| ID | `a.id` (`ALT-2026-0850`) | mono, `C.steel` | OK. |
| Título | `a.titulo` | Rajdhani-ish, `C.text` | OK. |
| Ativo | `a.assetId` + `nomeOf[assetId]` | mono, `C.slate` | Linkar ao breadcrump/hierarquia. |
| Tipo | `a.tipo` (Térmico/Mecânico/Elétrico/Processo/Manutenção/Conectividade/Preditivo) | texto | Vem de `RULE_TIPO`/literais do motor. |
| Severidade | `a.severidade` | `SevBadge` | OK. |
| Status | `a.status` | `Badge` | Falta atingir `em_analise`. |
| Data/Hora | `a.criadoEm` via `fmtDateTime` | mono, `C.slate` | Adicionar "há X" relativo. |
| **Origem** | `a.origem` (`regra`/`modelo`/`manual`) | — | **Ausente na UI hoje.** Exibir. |
| **Gerido pelo motor** | `a.managed` | flag | **Ausente.** Marcar "auto". |
| **Tag disparadora** | `a.tag` (TagKey) | ex.: `vib 7.2 mm/s` | **Ausente.** Rastreia ao Dicionário. |
| **Confiança (modelo)** | `twin.probFalha[21].prob`, `twin.rulDias` | %, dias | **Ausente.** Para US-9. |
| Resolvido em | `a.resolvidoEm` | só no CSV/detalhe | Mostrar em linha resolvida. |
| Responsável | `a.responsavel` | — | Campo existe, sem UI. |
| KPI Abertos/Crít/Altos/Médios | derivado de `open` | número Rajdhani | "Médios" agrega médio+baixo (linha 38) — documentar. |

---

## 8. Ações do usuário

| Ação | Gatilho atual | Gating | Refino proposto |
|---|---|---|---|
| Buscar | input `q` (título/assetId) | livre | Estender a `tipo`/`tag`/origem. |
| Filtrar severidade | select `sev` | livre | OK. |
| Filtrar status | select `st` | livre | OK. |
| Abrir detalhe | clique na linha / olho → `/alertas/:id` | `read` | OK. |
| Resolver | check inline → `resolveAlert(id)` | `full` | Pedir nota/causa antes de resolver `managed`. |
| Criar alerta manual | form inline → `addAlert(...)` | `full` | OK. |
| Exportar CSV | `exportar()` | `read` | Exportar **filtrados**, não todos. |
| **Investigar (Assistente)** | — | `full` | **Novo:** abre Assistente com contexto (US-12). |
| **Atribuir responsável** | — | `full` | **Novo:** seta `responsavel`, move p/ `em_analise`. |
| **Snooze manual** | — | `full` | **Novo:** expõe o snooze do motor para o humano. |
| **Filtrar por origem** | — | livre | **Novo:** chip Regra/Modelo/Manual. |
| **KPI como filtro** | — | livre | **Novo:** clicar "Críticos" filtra a tabela. |

---

## 9. Relação com outras telas

- **Detalhe do Alerta** (`/alertas/:id`) — destino de toda linha; é onde a investigação aprofunda.
- **Ativo / Gêmeo Digital** — todo alerta aponta a um `assetId`; o crítico-preditivo deve linkar ao ativo
  cujo RUL/health (`twin`) o gerou (US-7/US-10).
- **Telemetria** — alerta de regra rastreia à tag/valor; "ver no gráfico" deve abrir a série temporal do tag.
- **Dashboard** — os KPIs daqui espelham o cartão de alertas do Dashboard; manter consistência de contagem.
- **Assistente** (US-12) — ponte "Investigar": passar `{assetId, tag, modoCritico, severidade}` como contexto.
- **Dicionário** — origem `regra` deriva de `Tag` (campo, unidade, faixa, limite, direção); link de auditoria.
- **Cadastro de Ativo / Manutenção** — alerta preditivo deve oferecer "Agendar manutenção" (US-11).
- **Governança / RBAC** — a tela respeita papel/hierarquia; a fila mostra só ativos visíveis ao usuário.

---

## 10. Relação com governança

A Lista de Alertas é uma tela **operacional** que, ainda assim, deve carregar a espinha de governança:

- **Hierarquia (Matriz):** o breadcrumb já posiciona Alertas; o refino deve filtrar a fila por
  empresa→planta→área→sistema→ativo do usuário, e cada linha deve permitir subir/descer na hierarquia do ativo.
- **Dicionário:** todo alerta `origem: "regra"` tem rastreabilidade direta ao `Tag` que o disparou
  (`a.tag` → `campo, un, faixaMin/Max, limiteAlerta, limiteCritico, direcao, sensor`). Exibir essa âncora
  ("vib ≥ 6,0 mm/s · sensor SV-204 · direção acima") converte um alerta em **fato auditável**, não opinião.
- **RBAC:** `useCan("Alertas","full")` já gateia escrita; o refino mantém *Investigar/Snooze/Atribuir/Resolver*
  sob `full`, leitura sob `read`.
- **Ciclo D-I-C-I:** o ativo do alerta tem ciclo Desenho→Instalação→Comissionamento→Inspeção; um alerta
  sobre ativo ainda *em comissionamento* deve ser visualmente distinto (pode ser ruído de partida, não falha).
- **Nota de honestidade (padrão único de IA):** alertas `origem: "modelo"` devem expor **valor + janela
  (21d/RUL) + confiança + variáveis (modo dominante) + nota** de que a predição vem de modelo de degradação
  **simulado** (físico-informado + Weibull), não treinado em falhas reais (`PredictionModel` em
  `src/engine/prediction.ts` permite plugar o real). Sem isso, a fila mistura fato medido (regra) com
  projeção (modelo) sem sinalizar a diferença epistêmica — risco de governança.

---

## 11. Melhorias de UX/UI sobre o wireframe base

Crítica concreta, ancorada no código real de `AlertasLista.tsx`:

**1. (P0) Coluna/Badge de Origem — tornar regra×modelo×manual visível.**
O dado `a.origem` e a flag `a.managed` existem (`types.ts` 82-85) e são centrais ao motor, mas a tabela
(linhas 142-166) **não os mostra**. Hoje um técnico não distingue um fato medido de uma projeção. *Criar
`OrigemBadge`* em `ui-shared/index.tsx` e inserir como coluna entre "Tipo" e "Severidade": `regra` (steel),
`modelo` (cobalto), `manual` (slate), com sufixo "auto" quando `managed`. **Esforço baixo, impacto alto.**

**2. (P0) Linha de confiança para alertas preditivos (US-9 + padrão único de IA).**
Alertas `origem:"modelo"` (motor, linhas 152-159) trazem RUL e modo no título, mas a fila não expõe
**confiança nem nota de honestidade**. Sob o título, em alertas-modelo, renderizar uma microlinha:
`prob 72% · 21d · modo Rolamento · modelo simulado`. Puxar de `twin.probFalha`/`twin.rulDias`. Diferencia
visualmente projeção de medição — exigência de governança.

**3. (P1) KPIs viram filtros e revelam tendência.**
Os 4 cards (linhas 85-100) são hoje passivos. Torná-los **clicáveis** (clicar "Críticos" seta `sev="critico"`)
fecha o loop priorização→ação sem descer aos selects. Adicionar delta vs. tick anterior (↑2 na última hora)
usando o histórico do store dá noção de *fila piorando/aliviando*. Extrair para o `KPI` compartilhado.

**4. (P1) Coluna Tag/Valor — rastreabilidade ao Dicionário na própria linha.**
`a.tag` existe mas só aparece no detalhe. Mostrar `vib 7,2 mm/s (lim 6,0)` na coluna Título/Ativo aproxima
o alerta do Dicionário (§10) e evita um clique para entender *por quê*. Direção e limite vêm de `Tag`.

**5. (P1) Ação "Investigar com Assistente" (US-12).**
A tela cobre US-12 no papel, mas a única ação hoje é navegar ao detalhe (linhas 160-164). Adicionar um
botão inline *Investigar* (gated `full`) que abre o Assistente já com o contexto `{assetId, tag, modoCritico}`.
É a ponte que materializa US-12 a partir da triagem.

**6. (P1) Expor a mecânica invisível do motor (dedup/snooze/auto-resolução).**
`evaluateAlerts()` faz auto-resolução e snooze de 24h (linhas 95-97, 144-146, 161-163) **sem nenhum sinal
na UI** — o alerta simplesmente some. Quando um alerta `managed` é auto-resolvido, emitir `toast`
("Auto-resolvido pelo motor — vib normalizou") e, no filtro Resolvidos, marcar a linha com selo "auto".
Sem isso o usuário desconfia do sistema ("sumiu meu alerta"). Reaproveita `sonner` já importado.

**7. (P1) Ativar o status `em_analise`.**
`AlertStatus` e o filtro `ST_LABEL` (linha 16) preveem `em_analise`, mas **nenhuma ação o atinge** — o
status é morto. Adicionar *Atribuir/Assumir* que seta `responsavel` e move para `em_analise`, dando um
estado de "em tratamento" distinto de aberto. Adicionar variante âmbar no `Badge`.

**8. (P2) Agrupamento e densidade da tabela.**
A tabela plana ordenada por data (linha 46) dispersa os críticos quando a fila cresce. Oferecer toggle
**Agrupar por: Severidade | Ativo | Origem** com cabeçalhos de seção colapsáveis, preservando o `sort` por
`criadoEm` dentro de cada grupo. Mantém a densidade industrial sem rolagem cega.

**9. (P2) Export deve respeitar o filtro.**
`exportar()` (linhas 48-53) exporta `alerts` (tudo), ignorando `filtered`. Trocar para `filtered` — quem
filtra "Críticos abertos" espera exportar isso, não a base inteira. Bug de expectativa, correção de 1 linha.

**10. (P2) Filtro por Origem e por Área/Hierarquia.**
A barra de filtros (linhas 125-136) só tem severidade e status. Adicionar select de **Origem**
(regra/modelo/manual) e **Área/Ativo** ancorado na hierarquia (§10), respeitando a visibilidade RBAC do
usuário — alinha a fila à navegação governada.

**11. (P2) Empty-state e estado "fila zerada" com tom positivo.**
O empty-state atual (linha 169) é neutro ("Nenhum alerta corresponde ao filtro"). Distinguir *"filtro sem
resultado"* de *"nenhum alerta aberto — planta saudável"* (verde, com timestamp do último tick) reforça
confiança operacional quando a fila esvazia.
