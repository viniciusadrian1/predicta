# 09 — Detalhe do Alerta

> Especificação de refinamento (Lead Product Designer / UX Strategist / Information Architect)
> Produto: **PREDICTA** — FORZY · Tela operacional de resposta a evento
> Arquivo real: `src/pages/AlertaDetalhe.tsx` · Rota: `/alertas/:id` (`src/routes.tsx`)

---

## 1. Nome da tela

**Detalhe do Alerta** — a página de "pronto-atendimento" de um evento individual. É o destino de toda navegação a partir da Lista de Alertas (tela 08), do Dashboard (tela 02), do Mapa (tela 13) e de qualquer badge de severidade espalhado pelo produto. Internamente é o componente `AlertaDetalhe` (`src/pages/AlertaDetalhe.tsx`), montado com chrome de página via `usePageChrome(["Alertas","Lista de Alertas", al.id], …)`.

Funciona como a unidade atômica do fluxo de governança de manutenção: pega um `Alert` do store (`useStore(s => s.alerts)`), o cruza com seu `Asset` e seu `AssetTwin` (gêmeo digital), e expõe **contexto + origem rastreada + evidência (telemetria) + ciclo de vida + ações**. É onde o evento bruto da Lista vira decisão.

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** Hoje a tela já entrega uma estrutura de duas colunas (`grid grid-cols-3`, 2/3 + 1/3) com: (i) **header card** colorido por severidade (`SEV_COLOR[al.severidade]`), com `SevBadge` + `Badge` de status; (ii) grade **Detalhes do Alerta** com ID, ativo, tipo, data/hora de detecção, método e origem; (iii) **mini-gráfico** "Telemetria em Torno do Alerta" (`AreaChart` Recharts sobre `twin.history.slice(-40)` via `toChartData`), com a `dataKey` escolhida pela `al.tag` (temp/corrente/press/vib); (iv) **Linha do Tempo** sintetizada (Detecção → Alerta Criado → Em Análise → Resolvido); (v) card **Ativo Relacionado** com `Bar_` de saúde do twin e link para o overview; (vi) **Ações Rápidas** (criar OS, abrir no assistente, ver histórico, escalar, falso positivo); (vii) **comentário** (apenas com `useCan("Alertas","full")`). As ações de ciclo de vida (`ackAlert`/`resolveAlert`/`reopenAlert`) já estão no `usePageChrome` e gated por RBAC.

**O que existe mas é raso (a REFINAR).** A "origem" hoje é só um texto traduzido (`ORIGEM_METODO`); **não há ancoragem real ao Dicionário** (campo, unidade, faixa, limite, direção, sensor) nem ao **padrão de output de IA** (valor + horizonte + confiança + explicação + nota de honestidade) para alertas de `origem === "modelo"`. O mini-gráfico **não marca o limite nem o instante do disparo**. A Linha do Tempo é **fabricada com offsets fixos** (`criadoEm + 3000`, `+9min`) e não persiste eventos reais. "Criar OS" é um `toast` placeholder. O comentário não é persistido. Falta o **breadcrumb de hierarquia** real e a **nota de honestidade** do modelo simulado.

**Objetivo de refino.** Transformar a tela de "ficha do alerta" em **estação de decisão governada**: cada número rastreável ao Dicionário, cada predição honesta sobre ser modelo simulado (`src/engine/prediction.ts`/`simulation.ts`), evidência visual que prova o disparo (limite + cruzamento), ciclo de vida persistido e auditável, e uma ponte limpa para ativo, assistente (US-12) e ordem de serviço.

---

## 3. Perfil principal que usa a tela

| Persona | Uso da tela | Nível RBAC (`can("Alertas", …)`) |
|---|---|---|
| **(a) Técnico de Manutenção** | Persona primária. Recebe o alerta, lê a evidência, reconhece, executa, resolve ou abre OS. | `full` — vê e usa todas as ações de ciclo de vida e comentário |
| **(b) Gestor Industrial** | Triagem e priorização: avalia severidade, criticidade do ativo, escala para engenharia. | `full` em geral |
| **(e) TI/Governança** | Audita rastreabilidade: origem→Dicionário, quem reconheceu/resolveu, integridade do ciclo. | `read`/`full` conforme matriz |
| **(c) Cliente da Indústria** | Leitura do estado do próprio ativo; vê o alerta mas **não** age. | `read` — ações de escrita escondidas (`canWrite` falso oculta header + comentário + ações `write:true`) |
| **(d) Admin Forzy** | Suporte/diagnóstico cross-cliente. | `full` |

O gating já é real: `const canWrite = useCan("Alertas","full")`. Com `read`, o bloco de ações do chrome some, o card de comentário some, e em Ações Rápidas o `.filter(act => canWrite || !act.write)` remove "Escalar" e "Falso Positivo".

---

## 4. User stories da Forzy atendidas

- **US-9 (ML previsão de anomalias)** — núcleo da tela quando `al.origem === "modelo"`: o alerta nasce no `evaluateAlerts` quando `prob21 > 0.6 && rulDias < 60` (`src/engine/simulation.ts`), carregando RUL, probabilidade em 21 dias e modo dominante (`twin.modoCritico`). A tela é onde essa anomalia prevista é explicada e qualificada.
- **US-12 (conversacional sugere solução de falhas)** — ação "Abrir no Assistente IA" leva a `/assistente/${al.assetId}`, transportando o contexto do alerta para o assistente com tool use.
- **US-7 (valores atuais + gráficos históricos)** — mini-gráfico de telemetria em torno do evento, sobre `twin.history`.
- **US-13 (governança de acessos/dados)** — todo o gating RBAC + rastreabilidade de origem/ciclo de vida.
- *Tangencia* **US-4** (sensores V/A/RPM/°C, via `al.tag` → série do gráfico) e **US-10/11** (quando o alerta preditivo aponta parada/manutenção planejada, a ação "Criar OS" é a ponte).

---

## 5. Blocos e seções da tela

| # | Bloco | Coluna | Componente real | Conteúdo | Estado |
|---|---|---|---|---|---|
| B1 | **Chrome / Header de página** | topo | `usePageChrome` (`src/components/layout/chrome`) | Breadcrumb `Alertas › Lista de Alertas › {al.id}` + botões Reconhecer/Reabrir + Resolver | EXISTE |
| B2 | **Header card do alerta** | esq (2/3) | `div` tintado por `sevColor`, `AlertTriangle`, `SevBadge`, `Badge` | Título, severidade, status, descrição | EXISTE |
| B3 | **Detalhes do Alerta** | esq | `SH` + grade 2 col | ID, Ativo, Tipo, Data/Hora, Método, Origem | EXISTE — raso |
| B4 | **Telemetria em Torno do Alerta** | esq | `ResponsiveContainer`+`AreaChart` | Série da `al.tag` nos últimos 40 samples | EXISTE — sem limite/marcador |
| B5 | **Linha do Tempo** | esq | lista vertical com nós coloridos | Detecção, Criado, Em Análise, Resolvido | EXISTE — sintética |
| B6 | **Ativo Relacionado** | dir (1/3) | botão → `/ativos/:id/overview`, `Bar_` | Nome, ID, status do twin, saúde %, syncedAt | EXISTE |
| B7 | **Ações Rápidas** | dir | lista de botões | OS, Assistente, Histórico, Escalar, Falso Positivo | EXISTE — OS é placeholder |
| B8 | **Adicionar Comentário** | dir | `textarea` + botão | Registro de observação | EXISTE — não persiste |
| **B9** | **Origem & Rastreabilidade (Dicionário)** | esq | *novo* | Para `regra`: campo/unidade/faixa/limite alerta/crítico/direção/sensor. | **REFINAR** |
| **B10** | **Predição & Honestidade (modelo)** | esq | *novo* | Para `modelo`: valor+horizonte+confiança+variáveis+nota de honestidade | **REFINAR** |
| **B11** | **D-I-C-I do ativo** | dir | *novo* | Mini chips do ciclo do ativo de origem | **REFINAR** |

---

## 6. Componentes principais

| Componente | Origem | Papel na tela | Refino proposto |
|---|---|---|---|
| `SH` (section header) | `ui-shared` | Título de cada card | Suportar slot à direita (link "ver no Dicionário") |
| `SevBadge` / `Badge` | `ui-shared` | Severidade e status (`aberto`/`em_analise`/`resolvido`) | Manter; status ganha cor consistente com tela 08 |
| `Bar_` | `ui-shared` | Barra de saúde do twin no card de ativo | Manter |
| `IBtn` | `ui-shared` | Botões do chrome (Reconhecer/Reabrir) | Manter |
| `AreaChart` (Recharts) | `recharts` | Mini-gráfico de evidência | Adicionar `ReferenceLine` no limite e `ReferenceLine`/`ReferenceDot` no instante de disparo |
| `TT_` | `ui-shared` | Tooltip do gráfico | Manter |
| `usePageChrome` | `layout/chrome` | Breadcrumb + ações de ciclo de vida | Breadcrumb deve refletir hierarquia real do ativo |
| `toChartData` | `lib/telemetry` | Transforma `TelemetrySample[]` em série | Manter |
| `useCan("Alertas","full")` | `auth/rbac` | Gate de escrita | Manter; estender para gate de "Criar OS" |
| `ackAlert/resolveAlert/reopenAlert` | `store/useStore` | Mutações de ciclo de vida | Persistir autor/timestamp em eventos (ver §11) |
| `ORIGEM_METODO` / `SEV_COLOR` | local | Mapas de label/cor | `ORIGEM_METODO` vira fonte para o card B9/B10 |
| *`PredictionPanel`* | *novo* | Bloco B10 do padrão de IA | Consome `twin.rulDias`, `twin.probFalha`, `twin.modoCritico` |
| *`DiciTraceCard`* | *novo* | Bloco B9 | Lê `Tag` do `dictionary` por `al.tag` |

---

## 7. Dados exibidos

| Dado | Fonte real | Campo/derivação | Rastreabilidade |
|---|---|---|---|
| Título / descrição | `Alert.titulo` / `Alert.descricao` | gerados em `RULE_TITLE`/`ruleDesc` (engine) | — |
| Severidade | `Alert.severidade` | `critico/alto/medio/baixo` → `SEV_COLOR` | — |
| Status | `Alert.status` | `aberto/em_analise/resolvido` | — |
| ID | `Alert.id` | `ALT-{ano}-{seq}` (`newId`) | sequência do engine |
| Ativo | `Alert.assetId` + `Asset.nome` | join em `assets` | → Matriz de Hierarquia |
| Tipo | `Alert.tipo` | `Térmico/Mecânico/Elétrico/…` (`RULE_TIPO`) | — |
| Data/Hora detecção | `Alert.criadoEm` | `fmtDateTime` (tempo simulado, `simClock`) | — |
| Método / Origem | `Alert.origem` | `regra` / `modelo` / `manual` → `ORIGEM_METODO` | **→ Dicionário (B9) ou Modelo (B10)** |
| Tag disparadora | `Alert.tag` | `TagKey` → série do gráfico | **→ `Tag` do dicionário** |
| Evidência | `twin.history.slice(-40)` | `toChartData` → série | US-7 |
| **Limite alerta/crítico** | `asset.limites?.[tag.key] ?? tag.limiteAlerta/limiteCritico` | engine usa em `evaluateAlerts` | **→ Dicionário** (a expor em B4/B9) |
| **Faixa / unidade / direção / sensor** | `Tag.faixaMin/Max`, `TAG_UNIT`, `Tag.direcao`, `Tag.sensor` | `dictionary` | **→ Dicionário** (a expor em B9) |
| Saúde / status do ativo | `twin.health`, `twin.status` | `deriveTwinHealth` | gêmeo digital |
| Sync | `twin.syncedAt` | `fmtDate` | física↔digital |
| **RUL / prob 21d / modo** | `twin.rulDias`, `twin.probFalha`, `twin.modoCritico` | `predict()` (`prediction.ts`) | **modelo SIMULADO — nota de honestidade** |
| Responsável | `Alert.responsavel` | exibido na timeline | — |

---

## 8. Ações do usuário

| Ação | Gatilho UI | Função real | RBAC |
|---|---|---|---|
| Reconhecer | `IBtn` no chrome | `ackAlert(al.id)` → `status:"em_analise"` + toast | `Alertas:full` |
| Resolver | botão verde no chrome | `resolveAlert(al.id)` → `status:"resolvido"` + `resolvidoEm` | `Alertas:full` |
| Reabrir | `IBtn` (quando `resolvido`) | `reopenAlert(al.id)` → `aberto`, limpa `resolvidoEm` | `Alertas:full` |
| Criar Ordem de Serviço | Ações Rápidas | hoje `toast` placeholder → **conectar a fluxo de OS (US-11)** | `Alertas:full` (a aplicar) |
| Abrir no Assistente IA | Ações Rápidas | `navigate('/assistente/'+assetId)` | `Assistente:read` (a checar) |
| Ver Histórico do Ativo | Ações Rápidas | `navigate('/ativos/'+assetId+'/telemetria')` | `Telemetria:read` |
| Escalar para Engenharia | Ações Rápidas (`write`) | `ackAlert` + toast | `Alertas:full` |
| Fechar como Falso Positivo | Ações Rápidas (`write`) | `resolve()` | `Alertas:full` |
| Abrir ativo relacionado | card B6 | `navigate('/ativos/'+assetId+'/overview')` | `Ativos:read` |
| Comentar | `textarea` + Registrar | hoje só toast → **persistir em eventos do alerta** | `Alertas:full` |

---

## 9. Relação com outras telas

- **← Lista de Alertas (08)** — origem principal. O breadcrumb `usePageChrome` referencia "Lista de Alertas".
- **← Dashboard (02) / Mapa (13)** — qualquer `SevBadge`/marcador navega para cá por `al.id`.
- **→ Ativo Overview (10)** — card B6 e link `/ativos/:id/overview`. Vínculo bidirecional: o overview do ativo lista seus alertas.
- **→ Telemetria do Ativo (11)** — "Ver Histórico" leva ao gráfico completo; a evidência B4 é a versão "zoom no momento".
- **→ Assistente IA (12)** — US-12; transporta `assetId` (idealmente também `alertId` para contexto).
- **→ Ordem de Serviço (futuro, US-11)** — "Criar OS"; fechar a OS deveria poder resolver o alerta.
- **↔ Dicionário (Governança)** — B9 deve linkar para a `Tag` que define o limite violado.

---

## 10. Relação com governança

- **Hierarquia (breadcrumb):** o breadcrumb atual é estático (`["Alertas","Lista de Alertas", al.id]`). Refino: inserir a trilha real do ativo (empresa → planta → área → sistema → ativo) a partir de `asset.planta`/`asset.area`, ancorando o evento na Matriz de Hierarquia.
- **Dicionário (todo número rastreia):** alertas de `origem:"regra"` nascem de `tag.limiteAlerta/limiteCritico` e `tag.direcao` (`evaluateAlerts`). A tela **precisa expor** essa proveniência: campo, unidade, faixa, limite, sensor, direção. Hoje só mostra o texto "Limite do dicionário (threshold)" sem o registro.
- **RBAC (toda ação é gated):** já real via `useCan("Alertas","full")` no chrome, comentário e ações `write`. Estender o gate a "Criar OS".
- **D-I-C-I:** o ativo de origem tem ciclo Desenho→Instalação→Comissionamento→Inspeção (`DiciRow`); o detalhe do alerta deve mostrar um mini-status D-I-C-I (B11) — útil para distinguir alerta em ativo recém-comissionado vs. inspecionado.
- **Padrão único de output de IA + nota de honestidade:** para `origem:"modelo"`, expor **valor + horizonte + confiança + variáveis + nota de honestidade** de que a predição vem de modelo **físico-informado/Weibull SIMULADO** (`prediction.ts`), não treinado em falhas reais.

---

## 11. Melhorias de UX/UI sobre o wireframe base

**1) Mini-gráfico que PROVA o disparo (B4, P0).** Hoje o `AreaChart` em `AlertaDetalhe.tsx` (linhas ~105–114) mostra a série da `al.tag` sem limite nem instante de cruzamento — é decorativo, não evidência. Adicionar `ReferenceLine y={limCritico}` (vermelho tracejado) e `y={limAlerta}` (âmbar), além de um `ReferenceLine x` / `ReferenceDot` no `al.criadoEm`. Sombrear a faixa em violação na cor da severidade. Assim o gráfico responde "por que disparou" em um olhar. Impacto: `src/pages/AlertaDetalhe.tsx` (bloco do gráfico) + leitura de `asset.limites`/`tag`.

**2) Bloco "Origem & Rastreabilidade" para alertas de regra (B9, P0).** Promover a grade B3 a algo governado: para `origem:"regra"`, puxar a `Tag` do `dictionary` por `al.tag` e mostrar **Campo · Unidade · Faixa (min–max) · Limite alerta · Limite crítico · Direção · Sensor**, com link "abrir no Dicionário". Hoje `ORIGEM_METODO[al.origem]` resume tudo em uma frase. Impacto: novo `DiciTraceCard`, lê `useStore(s=>s.dictionary)`.

**3) Painel de Predição com nota de honestidade (B10, P0).** Para `origem:"modelo"`, o alerta carrega no twin `rulDias`, `probFalha` (curva), `modoCritico`. Renderizar o **padrão único de IA**: probabilidade em 21d + RUL + modo dominante (valor), horizonte, **barra de confiança**, variáveis explicativas (vibração/residual/dano por modo), e uma **NOTA DE HONESTIDADE** explícita: "Predição de modelo físico-informado + Weibull simulado — não treinado em falhas reais (`src/engine/prediction.ts`)". Hoje a tela trata alerta de modelo igual a alerta de regra. Impacto: novo `PredictionPanel`.

**4) Linha do tempo real, não fabricada (B5, P1).** Hoje os eventos são offsets fixos (`criadoEm + 3000`, `+9*60000`) — não auditável. Refino: persistir um array `eventos[]` no `Alert` (detecção, ack com autor/`responsavel`, comentário, resolução, reabertura), populado em `ackAlert/resolveAlert/reopenAlert` (`useStore.ts`). A timeline passa a ser registro de auditoria. Impacto: `src/lib/types.ts` (campo `eventos`), `src/store/useStore.ts`, `src/pages/AlertaDetalhe.tsx`.

**5) Hierarquia no breadcrumb (chrome, P1).** Trocar `["Alertas","Lista de Alertas", al.id]` por trilha que inclui planta/área/ativo, conectando o evento à Matriz de Hierarquia. Impacto: `usePageChrome` em `AlertaDetalhe.tsx`.

**6) "Criar OS" real e relação OS↔alerta (B7, P1, US-11).** Hoje é `toast("Fluxo de OS em breve")`. Mesmo sem o módulo completo, abrir um drawer de OS pré-preenchido (ativo, modo crítico, severidade) e registrar a OS no estado; ao concluir a OS, oferecer resolver o alerta. Gate por `can("Alertas","full")`. Impacto: `AlertaDetalhe.tsx` + store.

**7) Persistir comentário (B8, P2).** O `textarea` hoje só dá toast e limpa (linha ~178). Anexar o comentário aos `eventos[]` do alerta (item 4) com autor da `session` e `simClock`. Impacto: `useStore.ts` + `AlertaDetalhe.tsx`.

**8) Hierarquia visual da coluna esquerda (P2).** Reordenar para fluxo de leitura de incidente: **Header → Origem/Rastreabilidade (regra) ou Predição (modelo) → Evidência (gráfico) → Timeline**. Hoje Detalhes vem antes do gráfico mas sem destaque para a causa. Agrupar Detalhes + Origem em um card só com abas ("Resumo" / "Rastreabilidade") reduz scroll. Impacto: reorganização de blocos em `AlertaDetalhe.tsx`.

**9) Status `em_analise` visível e consistente (P2).** O `Badge` de status deve diferenciar claramente `aberto`/`em_analise`/`resolvido` com a paleta (âmbar/cobalto/verde) e o chrome deve mostrar "Em análise por {responsavel}" quando aplicável. Impacto: `ui-shared` (`Badge`) + chrome.

**10) Estado vazio / alerta inexistente (P2).** Hoje `alerts.find(...) ?? alerts[0]` faz fallback silencioso para o primeiro alerta — confunde em deep-link inválido. Tratar `id` inexistente com empty state ("Alerta não encontrado") e CTA para a Lista. Impacto: guard no topo de `AlertaDetalhe.tsx`.
