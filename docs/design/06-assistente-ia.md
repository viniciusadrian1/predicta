# Assistente — conversacional (14) e com contexto do ativo (15)

> Produto: **PREDICTA** (by **FORZY**) · Escopo: assistente técnico conversacional
> Telas: **(14)** Assistente geral · **(15)** Assistente com contexto do ativo
> User story principal: **US-12** (conversacional sugere solução de falhas)
> Arquivos de referência: `src/pages/Assistente.tsx`, `src/ai/assistant.ts`, `src/ai/tools.ts`,
> `src/engine/prediction.ts`, `src/engine/simulation.ts` (`runScenario`), `src/auth/rbac.ts`,
> `src/data/seed.ts` (matriz `PERM`)

---

## Estado atual no produto (o que JÁ EXISTE)

O Assistente **não é um mock** — é um agente conversacional real com **tool use** rodando contra o
estado vivo do produto. Uma única rota e um único componente (`src/pages/Assistente.tsx`) atendem
às duas telas do escopo, diferenciadas apenas pela presença do parâmetro `:assetId`:

- `path: "assistente"` → Tela **14** (modo frota, sem contexto)
- `path: "assistente/:assetId"` → Tela **15** (modo contexto de ativo)

O que já está implementado e funcional, ancorado no código:

| Capacidade | Onde vive | Comportamento real |
|---|---|---|
| **Streaming SSE** | `src/ai/assistant.ts` → `streamAssistant()` | Faz `POST /api/assistant` (proxy seguro que injeta a chave e prepende o system), lê o stream OpenAI Chat Completions, acumula `delta.content` e `delta.tool_calls` por índice. |
| **Tool use cliente** | `src/ai/tools.ts` → `ASSISTANT_TOOLS` + `executeTool()` | 5 ferramentas executadas **no cliente** contra o store/engine: `get_twin_state`, `list_alerts`, `run_whatif`, `create_work_order`, `get_fleet_summary`. |
| **Loop de turnos agênticos** | `Assistente.tsx` → `runTurn(messages, depth)` | Se `finish_reason === "tool_calls"`, executa as ferramentas, injeta resultados como mensagens `role:"tool"` e re-chama o modelo. Recursão limitada a `depth < 5`. |
| **System prompt contextual** | `Assistente.tsx` → `buildSystem()` | Injeta data/hora simulada (`st.simClock`) e, no modo contexto, o **snapshot completo do gêmeo** via `executeTool("get_twin_state", …)`; no modo frota, `get_fleet_summary`. |
| **Nota de honestidade nativa** | `buildSystem()` + `prediction.ts` (cabeçalho) | O system **já instrui** o modelo: *"A predição de falha vem de um gêmeo digital com modelo de degradação simulado (físico-informado), não de um modelo treinado em falhas reais."* |
| **Painel de contexto** | `Assistente.tsx` (lado direito, `w-56`) | Só no modo contexto: card "Contexto Ativo" (Saúde, Status, RUL, Temp., Vibração) + card "Alertas do Ativo" (abertos, top 4). |
| **Sugestões acionáveis** | `Assistente.tsx` → `suggestions` | Chips diferentes por modo: frota (pior saúde, alertas críticos, resumo do dia, planejar mês) × contexto (causa da degradação, simular parada, plano de manutenção, gerar OS). |
| **Criação de OS** | `executeTool("create_work_order")` | Cria de fato um `Alert` (`tipo:"Ordem de Serviço"`, `origem:"manual"`) via `s.addAlert(...)` e dispara `toast.success`. **Muta o estado real.** |
| **Cancelamento / Nova conversa** | `abortRef` (AbortController) + `novaConversa()` | Aborta o stream em voo, zera `convoRef`, reseta as bolhas para o greeting. |
| **Greeting consciente do RUL** | `Assistente.tsx` → `greeting` | No modo contexto já anuncia `RUL` e `modoCritico` do twin antes da 1ª pergunta. |

**Lacuna crítica de governança encontrada no código real:** as rotas `assistente` e
`assistente/:assetId` em `src/routes.tsx` (linhas 71–72) **não estão envolvidas por `<Gate
modulo="Assistente">`**, diferentemente de `Cadastro`, `OCR`, `Governança` e `RBAC`. A matriz `PERM`
(`src/data/seed.ts`) define `Assistente:"none"` para o **Operador Campo** e `read` para o **Analista
de Dados**, mas **nada disso é aplicado** — qualquer papel autenticado entra e executa ferramentas
que mutam estado (`create_work_order`). Esta é a recomendação **P0** número 1 abaixo.

A seguir, o gabarito completo por tela.

---

## TELA 14 — Assistente conversacional (modo frota)

### 1. Job & propósito
Dar ao operador uma **interface única em linguagem natural** para interrogar a frota inteira (pior
ativo, alertas críticos, resumo do dia) e disparar ações de manutenção sem navegar por 5 telas.

### 2. Personas × RBAC × Default view

Módulo de referência na matriz: **`Assistente`** (`src/data/seed.ts` → `PERM`).

| Persona / Papel | Nível `Assistente` | Pode ver | Pode fazer (ações) | DEFAULT VIEW |
|---|---|---|---|---|
| Gerente Industrial | `full` | Tudo (frota, alertas, twin) | Todas as tools, incl. `create_work_order` | Resumo operacional do dia |
| Eng. Confiabilidade | `full` | Tudo | Todas as tools | "Qual ativo tem pior saúde?" |
| Técnico Manutenção | `full` | Tudo | Todas as tools (foco em OS) | "Listar alertas críticos" |
| Analista de Dados | `read` | Consultas (twin, alertas, what-if) | **Sem** `create_work_order` (read-only) | "Resumo operacional do dia" |
| Operador Campo | `none` | — | — | **Acesso negado** (upsell, US-1) |

> Hoje o RBAC do Assistente **não é checado**. A coluna "pode fazer" acima é a **especificação
> alvo**, não o comportamento atual. Ver P0-1 e P0-2.

### 3. Arquitetura de informação
1. **Primário:** o fluxo de conversa (coluna `flex-1`, bolhas + indicador "Analisando…").
2. **Secundário:** chips de sugestão (logo acima do input) — atalhos para os jobs mais comuns.
3. **Sob demanda:** pílulas `role:"tool"` ("Consultou: …") — transparência de qual ferramenta rodou.
4. Ordem de leitura: greeting → turnos → input fixo no rodapé (`borderTop`).

### 4. Blocos & componentes (tokens reais — `src/lib/theme.ts`)

| Bloco | Componente / origem | Tokens |
|---|---|---|
| Bolha IA | `Assistente.tsx` map de `bubbles` (`role:"ai"`) | bg `#0F1E35`, borda `C.border`, **negrito** renderizado em `C.steel` |
| Bolha usuário | idem (`role:"user"`) | bg `${C.cobalt}28`, ícone `User` em `C.steel` |
| Pílula tool | idem (`role:"tool"`) | bg `C.bgDeep`, ícone `Wrench` em `C.steel`, fonte mono |
| Indicador vivo | bloco `busy` | `Loader2` animado em `C.steel` + "Analisando…" |
| Chips sugestão | `suggestions.map(...)` | borda `C.border`, texto `C.slate`, `disabled:opacity-40` durante `busy` |
| Input | rodapé | bg `C.bgDeep`; botão `Send` em `C.cobalt`, `disabled` se vazio/busy |
| Chrome | `usePageChrome([...])` | breadcrumb "Assistente" → "Assistente IA" |

Tipografia: títulos/números **Rajdhani**, tags/dados **JetBrains Mono** (pílulas tool, IDs),
corpo **Inter**.

### 5. Estados (dado vivo é estado de 1ª classe)

| Estado | Como aparece hoje | Refinamento alvo |
|---|---|---|
| **Loading** | bloco `busy` ("Analisando…") + chips/input desabilitados | OK; adicionar skeleton de "executando ferramenta X" distinto de "pensando" |
| **Empty** | greeting de frota como 1ª bolha | OK |
| **Error** | `onError` → bolha "⚠️ …" + `toast.error("Assistente")` | OK; tratar timeout/429 com retry sugerido |
| **TEMPO REAL** | `buildSystem()` é **reconstruído a cada turno** → injeta `simClock` e snapshot atual; tools leem `useStore.getState()` ao vivo | Honra dado vivo. **Refinar:** marcar visualmente quando uma resposta usou snapshot que já "envelheceu" (twin avançou desde a resposta). |
| **Sem-permissão** | **não existe** (lacuna) | Renderizar `<Gate modulo="Assistente">` → painel "Acesso negado" (P0-1) |

### 6. User stories cobertas
- **US-12** (núcleo): conversacional que sugere solução de falhas — coberta via `run_whatif`
  (testar intervenções) + texto explicativo do modelo.
- **US-7** (apoio): valores atuais expostos por `get_twin_state` / `get_fleet_summary`.
- **US-10/US-11** (apoio): predição de parada e plano de manutenção citados nas respostas
  (RUL/`probFalha21d` vindos de `prediction.ts`).
- **US-13**: rastreabilidade das ações (cada OS criada nasce como `Alert` com `origem:"manual"`).
- **US-1**: módulo ausente = upsell, nunca tela quebrada (a implementar com o Gate).

### 7. Governança nativa DENTRO da tela
- **RBAC:** o módulo `Assistente` deve gatear (a) o acesso à tela e (b) cada tool por nível
  (`read` ≠ `full`). Hoje **ausente** — ver P0.
- **Dicionário:** todo número que o assistente cita (limite, unidade, direção) origina de
  `s.dictionary`; as ferramentas já leem o dicionário indiretamente (alertas vêm de
  `evaluateAlerts` que usa `tag.limiteAlerta/limiteCritico`). Refinar: o assistente deve **citar a
  fonte** (ex.: "vibração 7,2 mm/s vs. limite 6,0 do dicionário, direção 'acima'").
- **Hierarquia:** a OS criada herda `assetId` → rastreável até empresa→planta→área→sistema→ativo via
  o ativo.
- **D-I-C-I:** uma OS gerada pelo assistente é um artefato que deveria entrar no ciclo
  (Desenho→Instalação→Comissionamento→Inspeção) — hoje nasce como alerta simples; ver P1.

### 8. Confiança da IA (padrão único de output)
O **system prompt já carrega a nota de honestidade** (`buildSystem()`): a predição é de modelo
**simulado físico-informado**, não treinado em falhas reais. O alvo é tornar isso **visível na UI**,
não só no prompt. Todo output de ML citado pelo assistente deve expor:

| Campo do padrão | De onde vem | Status |
|---|---|---|
| **Valor** | `get_twin_state.rulDias`, `probFalha21d` | já disponível |
| **Janela/horizonte** | `HORIZONS = [7,14,21,30,60]` (`prediction.ts`); `run_whatif.horizonteDias` | disponível |
| **Confiança** | Weibull `WEIBULL_BETA=2.2` → `failureProb()` dá a probabilidade | disponível como prob; **falta** um selo de confiança qualitativo |
| **Explicação** | `modoCritico` (`worstMode`), leituras de sensor, residual | disponível |
| **Nota de honestidade** | system prompt + cabeçalho de `prediction.ts` | no prompt; **falta selo de UI** |

### 9. Recomendações priorizadas
- **P0-1** Envolver as rotas `assistente` e `assistente/:assetId` com `<Gate modulo="Assistente">`
  (`src/routes.tsx`). **Esforço: baixo.**
- **P0-2** Gatear `create_work_order` por nível `full` em `executeTool` (`src/ai/tools.ts`):
  se o papel só tem `read`, retornar `{ erro: "Sem permissão para criar OS." }` e remover a tool da
  lista `ASSISTANT_TOOLS` enviada ao modelo. **Esforço: médio.**
- **P0-3** Selo de honestidade persistente na UI ("Predição: modelo SIMULADO físico-informado").
  **Esforço: baixo.**
- **P1** Citação de fonte do dicionário nas respostas numéricas. **Esforço: médio.**
- **P2** Render de Markdown completo (hoje só `**negrito**` e quebras de linha são tratados). **Esforço: médio.**

---

## TELA 15 — Assistente com contexto do ativo

### 1. Job & propósito
Conversar **já ancorado em um ativo específico** (RUL, modo dominante, alertas abertos pré-carregados)
para diagnosticar a causa da degradação, simular intervenções e gerar a OS certa — sem o usuário
precisar repetir "qual ativo".

### 2. Personas × RBAC × Default view
Mesma matriz da Tela 14 (módulo `Assistente`). Diferença operacional:

| Papel | DEFAULT VIEW (contexto) | Observação |
|---|---|---|
| Técnico Manutenção | "Plano de manutenção recomendado" → "Gerar ordem de serviço" | persona primária desta tela |
| Eng. Confiabilidade | "Qual a causa provável da degradação?" | foco diagnóstico |
| Gerente Industrial | "Simular impacto da parada" | foco decisão de negócio |
| Analista de Dados (`read`) | "Simular impacto da parada" (what-if read-only) | **sem** "Gerar OS" |
| Operador Campo (`none`) | Acesso negado | — |

O greeting (`Assistente.tsx` linha 30) já personaliza por ativo: *"Estou com o ativo **{id} —
{nome}** em contexto … (RUL {rulDias} dias, modo dominante {modoCritico})"*.

### 3. Arquitetura de informação
Layout em duas colunas (`flex gap-4`):
1. **Primário (esquerda, `flex-1`):** conversa, idêntica à Tela 14, mas com sugestões de contexto.
2. **Secundário persistente (direita, `w-56`):** o **painel de contexto** — leitura ambiente
   contínua do twin, independente da conversa.
   - Card "Contexto Ativo": Saúde (cor por faixa: ≥75 verde, ≥50 âmbar, senão vermelho), Status, RUL,
     Temp. (laranja), Vibração (âmbar).
   - Card "Alertas do Ativo": top 4 abertos, ou "Nenhum alerta aberto."

### 4. Blocos & componentes
Tudo da Tela 14 **mais**:

| Bloco | Origem | Tokens |
|---|---|---|
| Pílula "Contexto: {id}" no chrome | `usePageChrome(... ctx ...)` | bg `${C.cobalt}18`, ícone `Cpu`, texto `C.steel` |
| Card Contexto Ativo | painel direito | borda `${C.cobalt}35`; valores mono; cores por faixa de saúde |
| Linhas de KPI | `[["Saúde",…],["RUL",…]]` | label `C.slate`, valor mono bold colorido |
| Card Alertas do Ativo | `alerts.filter(assetId===, status!=="resolvido").slice(0,4)` | bg âmbar translúcido, título `text-yellow-400`, id mono `C.slate` |

### 5. Estados
| Estado | Hoje | Refinamento |
|---|---|---|
| Loading | igual Tela 14 | — |
| Empty (sem alertas) | "Nenhum alerta aberto." | OK |
| Error | bolha ⚠️ + toast | — |
| **TEMPO REAL** | o painel de contexto re-renderiza a cada tick do engine (subscrição a `twins`/`alerts`); o system é reinjetado a cada turno | **forte.** Refinar: destacar quando saúde/RUL muda **durante** a conversa (delta vivo). |
| **Ativo inexistente** | `ctx = !!asset` é `false` → cai no modo frota silenciosamente | **Refinar:** se `:assetId` é inválido, mostrar empty-state "Ativo não encontrado" em vez de degradar para frota sem avisar. |
| Sem-permissão | ausente | Gate (P0-1) |

### 6. User stories cobertas
- **US-12** (núcleo) com contexto: diagnóstico ("causa provável") + sugestão de intervenção via
  `run_whatif` (`manutencaoModo` reduz dano do modo para 8% — `runScenario` linha 285) + `create_work_order`.
- **US-7**: painel de contexto = valores atuais ao vivo.
- **US-9/US-10/US-11**: anomalia (residual), parada prevista (RUL), plano (what-if comparando base × cenário).
- **US-13**: OS rastreável ao ativo + alertas do ativo visíveis.

### 7. Governança nativa
- **Hierarquia:** o ativo em foco é o nó-folha; o breadcrump/painel ancora a posição na matriz.
- **Dicionário:** Temp./Vibração no painel devem exibir **unidade + limite** do dicionário ao
  passar o mouse (hoje mostram só valor+unidade). O assistente, ao explicar, deve referenciar a
  faixa do dicionário.
- **RBAC:** idem Tela 14 — gatear acesso e ações.
- **D-I-C-I:** ao gerar OS a partir do contexto, capturar a fase (ex.: "Inspeção") do artefato.

### 8. Confiança da IA
No contexto, a explicabilidade fica **mais rica** porque o snapshot do twin (modo dominante,
leituras, residual) está no system. Padrão de resposta-alvo para qualquer afirmação preditiva:

> "**RUL ~{rulDias} d** (horizonte Weibull β=2.2) · **modo dominante: {modoCritico}** ·
> dirigido por **vibração {vib} mm/s** acima do baseline (residual {residual}%).
> ⚠️ *Predição de modelo SIMULADO físico-informado, não treinado em falhas reais.*"

A interface `PredictionModel` (`src/engine/prediction.ts`, linhas 25–29) permite plugar um modelo
treinado depois **sem tocar na UI** — quando isso acontecer, o selo de honestidade troca para
"modelo treinado" automaticamente se derivado de `predictionModel.name/metodo`.

### 9. Recomendações priorizadas
- **P0-1 / P0-2 / P0-3** (idênticas à Tela 14 — gate de rota, gate de tool, selo de honestidade).
- **P0-4** Tratar `:assetId` inválido com empty-state explícito em vez de degradar para frota.
  **Esforço: baixo.**
- **P1** Painel de contexto: tooltip com limite/unidade/direção do dicionário em Temp./Vibração.
  **Esforço: médio.**
- **P1** Botão "Abrir gêmeo digital" no card de contexto (link para `ativo/:id/gemeo`). **Esforço: baixo.**
- **P2** "Resumo da conversa → anexar à OS" ao criar a OS pelo assistente. **Esforço: médio.**

---

## Preocupações transversais do domínio

### Tool use — contrato e governança (`src/ai/tools.ts`)

| Tool | Lê/Muta | Nível RBAC alvo | Saída expõe confiança? |
|---|---|---|---|
| `get_twin_state` | lê | `read` | sim (saúde, RUL, prob21d, leituras) |
| `list_alerts` | lê | `read` | n/a (fatos de regra/dicionário) |
| `run_whatif` | lê (não persiste — `runScenario` clona) | `read` | sim (RUL base × cenário, Δ, nova data) |
| `get_fleet_summary` | lê | `read` | sim (piores ativos, contagem por severidade) |
| **`create_work_order`** | **muta** (`s.addAlert`) | **`full`** | n/a (ação) |

Regra transversal: **toda tool que muta exige `full`**; toda tool de leitura exige `read`. Hoje
nenhuma é gateada (P0-2). O loop `runTurn` limita recursão a `depth < 5` — bom guard-rail contra
loops de tool.

### Padrão único de output de IA
Reforçar no system (`buildSystem`) que **toda** afirmação numérica preditiva carregue os 5 campos
(valor · horizonte · confiança · explicação · honestidade). Hoje o prompt pede honestidade e
"não invente números"; falta exigir o **formato estruturado** da resposta preditiva.

### Streaming & resiliência (`src/ai/assistant.ts`)
Parsing SSE robusto (buffer por linha, tool_calls por índice, `[DONE]`, `evt.error`). Refinos:
back-off em 429, distinguir "pensando" de "executando ferramenta" na UI, e expor token de
cancelamento já existente (`AbortController`) num botão "Parar" visível durante `busy`.

### Modularidade (US-1)
Com o Gate ativo, papel sem o módulo `Assistente` vê **upsell** ("Assistente não contratado/sem
permissão") — nunca tela quebrada. Alinha com `Operador Campo: Assistente:"none"`.

---

## Resumo das decisões-chave
1. Uma rota/componente serve as duas telas; `:assetId` é o único discriminador (frota × contexto).
2. O system prompt é **reconstruído a cada turno** → dado vivo (simClock + snapshot do twin) é estado de 1ª classe.
3. Tool use roda **no cliente** contra o store/engine; `create_work_order` **muta** estado real.
4. A nota de honestidade do modelo simulado já existe **no prompt** e em `prediction.ts`; falta torná-la **visível na UI**.
5. **Lacuna P0:** Assistente não é gateado por RBAC (rota e tools) — diferente de todos os outros módulos.
