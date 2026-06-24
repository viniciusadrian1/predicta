# 11 — Assistente com contexto técnico do ativo

> **Nota de leitura.** Esta NÃO é uma tela nova. É a **mesma** tela do Assistente Técnico
> (`src/pages/Assistente.tsx`), um único componente React, operando em **modo contextual**.
> A diferença é binária e está expressa no código por uma única variável:
> `const ctx = !!asset;` (linha 27). Quando a rota carrega com `:assetId`
> (`assistente/:assetId` em `src/routes.tsx:72`), o ativo existe, `ctx` vira `true`, e a
> mesma superfície muda de "copiloto de frota" para "copiloto de **um ativo**". Este
> documento refina **o que muda** nesse modo — o snapshot injetado no contexto do LLM, o
> painel lateral de contexto, as perguntas de causa-raiz/solução, e a transição
> alerta/ativo → assistente — separando rigorosamente **o que JÁ EXISTE** de **o que REFINAR**.

---

## 1. Nome da tela

**Assistente Técnico — Modo Contextual (Ativo em Foco)**
Rota: `/assistente/:assetId` (ex.: `/assistente/BCP-01`).
Componente: `src/pages/Assistente.tsx` — o mesmo de `/assistente` (modo frota), diferenciado em runtime por `ctx`.

Identidade no chrome (já implementado, `usePageChrome` linha 120): título `["Assistente", "Contexto: BCP-01"]` no modo contextual vs. `["Assistente", "Assistente IA"]` no modo frota. Um chip de contexto cobalto (`Cpu` + `Contexto: {asset.id}`) aparece na barra de ações **somente** quando `ctx` é verdadeiro (linha 122).

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** Hoje, ao abrir `/assistente/BCP-01`, o componente já faz três coisas concretas: (1) injeta o **snapshot do gêmeo digital** do ativo no *system prompt* via `buildSystem()` → `JSON.stringify(executeTool("get_twin_state", { assetId: asset.id }))` (linhas 55–56), em vez do resumo de frota; (2) personaliza a **saudação** com ID, nome, RUL em dias e modo de falha dominante (linhas 29–31); (3) troca as **4 sugestões** de pergunta para o repertório de causa-raiz/solução: "Qual a causa provável da degradação?", "Simular impacto da parada", "Plano de manutenção recomendado", "Gerar ordem de serviço" (linha 44); e (4) renderiza um **painel lateral de contexto** de 224px (`w-56`) com KPIs do twin e alertas abertos do ativo (linhas 186–222). O motor de tool use é idêntico ao modo frota — as mesmas cinco ferramentas de `src/ai/tools.ts` (`get_twin_state`, `list_alerts`, `run_whatif`, `create_work_order`, `get_fleet_summary`) ficam disponíveis; o que muda é o **viés de contexto** que o snapshot e as sugestões imprimem.

**Objetivo a consolidar.** Transformar o assistente, quando ancorado num ativo, num **copiloto de diagnóstico de causa-raiz e decisão de manutenção** sobre aquele equipamento específico: o usuário não precisa redigitar a TAG, o modelo já "sabe" o estado, e a conversa parte de "este ativo, agora" para "por que está degradando, o que fazer, e qual o impacto de cada opção". É a ponte conversacional entre o diagnóstico (telemetria/predição) e a ação (OS, what-if), cobrindo **US-12** (conversacional sugere solução de falhas) com forte interseção em **US-9** (a explicação da anomalia que o snapshot carrega vira insumo de conversa).

---

## 3. Perfil principal que usa a tela

| Persona | Uso predominante no modo contextual | Nível RBAC esperado |
|---|---|---|
| **(a) Técnico de Manutenção** | Persona-alvo principal. Chega via alerta/ativo, pergunta causa provável, pede plano de manutenção, gera OS. | `Assistente: full`, `Alertas: full` |
| **(b) Gestor Industrial** | Avalia impacto de parar/reduzir carga (`run_whatif`), pondera priorização sem mexer no estado real. | `Assistente: full`, `Telemetria: read` |
| **(c) Cliente da Indústria** | Pergunta em linguagem natural "este equipamento está bem?" — US-2, leitura amigável do snapshot. | `Assistente: read/full`, `Ativos: read` |
| **(d) Admin Forzy** | Valida qualidade das respostas e a honestidade do disclaimer de modelo simulado. | full em tudo |
| **(e) TI/Governança** | Audita que o snapshot injetado respeita a hierarquia/escopo do papel e que ações (OS) são gated. | `Governança/RBAC: full` |

> **Lacuna de governança identificada.** `src/auth/rbac.ts` define o módulo `Assistente`, mas `Assistente.tsx` **não** invoca `useCan("Assistente", ...)` para gatear a tela nem `useCan("Alertas","full")` antes de `create_work_order`. Ver §10 e §11.

---

## 4. User stories da Forzy atendidas

- **US-12 — Conversacional sugere solução de falhas (núcleo).** É a razão de ser do modo contextual: causa-raiz ("Qual a causa provável da degradação?"), plano de manutenção e geração de OS, com o ativo já no contexto. Implementado via `streamAssistant` + `ASSISTANT_TOOLS` + `executeTool`.
- **US-9 — Previsão de anomalias (interseção forte).** O snapshot injeta `modoCritico`, `probFalha21d`, `residual` (via twin) e leituras — a explicação da anomalia que o modelo verbaliza vem desses campos. A pergunta de causa-raiz consome o output de US-9.
- **US-10/US-11 — Parada/manutenção planejada (apoio).** `run_whatif` projeta RUL sob `cargaPct`/`manutencaoModo` (linhas 105–125 de `tools.ts`), e `create_work_order` materializa a manutenção planejada como alerta tipo "Ordem de Serviço".
- **US-7 — Valores atuais (apoio).** O painel de contexto e o snapshot expõem temp, vibração, RUL, saúde atuais.
- **US-2 — Interface amigável (transversal).** Linguagem natural sobre um ativo, sem exigir conhecimento da TAG ou navegação por dashboards.
- **US-8 — Baseline (indireto).** O `residual` (desvio do baseline saudável, `simulation.ts:36-37`) é o sinal que fundamenta a conversa de anomalia.

---

## 5. Blocos e seções da tela

A tela é um **layout de duas colunas** (`flex gap-4`, altura `calc(100vh - 148px)`, linha 128). No modo frota a coluna direita **não existe**; ela é montada condicionalmente por `{ctx && twin && (...)}` (linha 186). Esse é o delta visual mais importante entre os dois modos.

| # | Bloco | Onde (arquivo:linha) | O que muda no modo contextual |
|---|---|---|---|
| B1 | **Chrome / breadcrumb + chip de contexto** | `usePageChrome` L120–125 | Subtítulo vira `Contexto: BCP-01`; surge chip cobalto `Cpu Contexto: {id}`. |
| B2 | **Coluna de chat (esquerda, `flex-1`)** | L130–183 | Estrutura idêntica; muda só o conteúdo (saudação, placeholder, sugestões). |
| B2.1 | Stream de bolhas (user / ai / tool) | L131–164 | Bolha-pílula `tool` ("Consultou: …") aparece igual; conversa parte do snapshot. |
| B2.2 | Indicador "Analisando…" | L156–163 | Spinner durante `busy`. |
| B2.3 | **Chips de sugestão** | L166–171 | Repertório causa-raiz/solução (L44) substitui o de frota (L45). |
| B2.4 | Input + botão enviar | L173–182 | Placeholder vira `Pergunte sobre BCP-01...` (L176). |
| B3 | **Painel de Contexto (direita, `w-56`)** | L186–222 | **Existe só aqui.** Dois cards. |
| B3.1 | Card **Contexto Ativo** (KPIs do twin) | L188–209 | ID, nome, Saúde, Status, RUL, Temp., Vibração. |
| B3.2 | Card **Alertas do Ativo** | L211–220 | Até 4 alertas abertos `a.assetId===id && status!=="resolvido"`. |

---

## 6. Componentes principais

| Componente / símbolo | Origem (arquivo) | Papel no modo contextual |
|---|---|---|
| `Assistente` (default export) | `src/pages/Assistente.tsx` | Componente único; `ctx = !!asset` decide o modo. |
| `useParams().assetId` | `react-router` | Chave que liga rota → ativo → modo contextual. |
| `buildSystem()` | `Assistente.tsx:47` | **Injeta o snapshot.** Ramo `if (asset && twin)` → `get_twin_state`; senão `get_fleet_summary`. |
| `streamAssistant` / `ChatMessage` | `src/ai/assistant.ts` | Stream SSE via proxy seguro `/api/assistant`; loop de tool use (`runTurn`, depth ≤ 5). |
| `ASSISTANT_TOOLS` / `executeTool` | `src/ai/tools.ts` | As 5 ferramentas client-side; executadas contra store/engine vivos. |
| `runScenario` | `src/engine/simulation.ts:281` | Backend de `run_whatif` — projeção headless não-persistente. |
| `IBtn` (`RotateCcw`) | `ui-shared` | "Nova conversa" (`novaConversa`, L113) — reseta convo, mantém o contexto. |
| Chip de contexto (`Cpu`) | inline L122 | Indicador de modo na barra de ações. |
| Cards do painel | inline L188–220 | KPIs do twin + alertas; usa `C.green/yellow/red` por faixa de saúde. |
| `FAILURE_MODE_LABEL` | `src/lib/types` | Traduz `modoCritico` na saudação e no snapshot. |

---

## 7. Dados exibidos

Há **duas superfícies de dados**: o **painel visível** (humano) e o **snapshot invisível** (LLM). Ambos partem do mesmo `twin`, mas hoje **divergem** — o que o usuário lê não é exatamente o que o modelo recebe.

**Painel de Contexto (visível, L197–208):**

| Campo | Fonte | Unidade / formato | Cor por estado |
|---|---|---|---|
| ID + Nome | `asset.id`, `asset.nome` | texto | — |
| Saúde | `twin.health` | `%` | ≥75 verde · ≥50 âmbar · <50 vermelho |
| Status | `twin.status` | normal/atenção/crítico/offline | steel |
| RUL | `twin.rulDias` | `d` (dias) | steel |
| Temp. | `twin.state.temp` | `°C` (1 casa) | laranja |
| Vibração | `twin.state.vib` | `mm/s` (2 casas) | âmbar |
| Alertas | `alerts.filter(...).slice(0,4)` | título + ID | âmbar |

**Snapshot injetado no LLM (`get_twin_state`, `tools.ts:86-93`):**

| Campo | Observação |
|---|---|
| `id, nome, tipo, criticidade` | contexto do ativo |
| `saude, status, rulDias` | espelham o painel |
| `modoCritico` (rótulo PT) | **só no snapshot**, não no painel |
| `probFalha21d` | **só no snapshot** — confiança de US-9 |
| `cargaPct` (%) | **só no snapshot** |
| `leituras{temp,vib,press,corrente,rpm,oleo}` | 6 tags vs. 2 no painel |

> **Achado-chave (alimenta §11).** O **painel mostra 2 leituras** (temp, vib) enquanto o **snapshot carrega 6** (+ press, corrente, rpm, óleo), além de `modoCritico` e `probFalha21d`. O usuário vê menos do que o modelo "sabe", o que produz respostas que citam pressão/corrente sem âncora visual. Há também **ausência total de exposição do disclaimer de modelo simulado no painel** — ele só existe no system prompt (L53). E os campos do painel são um **array `[label, value, color]` hardcoded** (L197–208) que não rastreia ao Dicionário (sem unidade/faixa/sensor por trás).

---

## 8. Ações do usuário

| Ação | Gatilho (arquivo:linha) | Efeito | Gated por RBAC hoje? |
|---|---|---|---|
| Perguntar (texto livre) | input + Enter / Send → `send()` L105 | `runTurn` com convo acumulada | Não |
| Clicar sugestão causa-raiz/solução | chips L167–170 → `send(sg)` | Dispara pergunta pré-pronta | Não |
| **Causa-raiz** | sugestão "Qual a causa provável da degradação?" | Modelo lê `modoCritico`+`leituras`+`residual` e explica | Não |
| **Simular parada/cenário** | "Simular impacto da parada" → `run_whatif` | Projeta ΔRUL sem afetar estado real | Não |
| **Plano de manutenção** | "Plano de manutenção recomendado" | Recomendação textual + possível `run_whatif(manutencaoModo)` | Não |
| **Gerar OS** | "Gerar ordem de serviço" → `create_work_order` | **Cria alerta** "Ordem de Serviço" + toast (`tools.ts:132`) | **Não — deveria exigir `Alertas:full`** |
| Nova conversa | `IBtn` RotateCcw → `novaConversa` L113 | Reseta convo; **mantém** o ativo em contexto | Não |
| Abortar stream | unmount → `abortRef.abort()` L40 | Cancela request em voo | — |

---

## 9. Relação com outras telas

A entrada canônica deste modo é a **transição contextual** — clicar "Perguntar ao Assistente" de uma tela de diagnóstico navega para `/assistente/:assetId`.

| Tela de origem | Como leva ao modo contextual | O que carrega |
|---|---|---|
| **Detalhe do Ativo / Gêmeo Digital** | botão "Assistente" → `/assistente/{id}` | o ativo inteiro como contexto |
| **Alertas (detalhe)** | "Investigar com Assistente" no alerta → `/assistente/{alert.assetId}` | ativo do alerta; conversa de causa-raiz |
| **Telemetria** | ao notar anomalia, saltar para chat ancorado | leituras atuais via snapshot |
| **Dashboard / Mapa** | drill-down num ativo crítico | mesmo padrão |
| **Assistente (modo frota)** `/assistente` | o usuário pede "fale sobre BCP-01" → modelo usa `get_twin_state`, mas **sem** trocar de modo/painel | conversa contextual sem o painel lateral |

**Saídas:** `create_work_order` cria um alerta que reaparece em **Alertas** e no card B3.2 do próprio painel; `run_whatif` espelha (sem persistir) a simulação que a tela de **Gêmeo Digital** roda com persistência.

> **Achado (alimenta §11):** a transição entrada existe na arquitetura de rotas, mas **a volta** (chat → ativo) não tem âncora: ID e alertas do painel são texto, não links. O técnico não consegue saltar do alerta citado no painel de volta ao detalhe do alerta.

---

## 10. Relação com governança

| Eixo de governança | Estado atual | Refinar |
|---|---|---|
| **Hierarquia (breadcrumb)** | Chrome mostra "Assistente / Contexto: BCP-01" — **não** mostra empresa→planta→área→sistema→ativo | Breadcrumb deve herdar a cadeia de hierarquia do ativo. |
| **Dicionário (rastreabilidade do número)** | KPIs do painel são `[label,value,color]` hardcoded; snapshot tem leituras cruas sem faixa/limite/sensor | Cada número do painel deve carregar tooltip do Dicionário (campo, unidade, faixa, limite, direção, sensor). |
| **RBAC (`can`)** | `src/auth/rbac.ts` tem o módulo `Assistente`, mas a tela **não** chama `useCan`; `create_work_order` não checa `Alertas:full` | Gatear acesso à tela e gatear `create_work_order` por permissão de escrita. |
| **Ciclo D-I-C-I** | Não exposto | Snapshot/painel poderiam expor o estágio D-I-C-I do ativo (Inspeção pendente vira contexto de causa-raiz). |
| **Navegação governada** | Snapshot é montado client-side sem filtro de escopo do papel | TI/Governança: garantir que o `get_twin_state` respeite hierarquia/escopo do usuário. |
| **Honestidade de IA (padrão único)** | Disclaimer "modelo de degradação simulado" existe **só** no system prompt (L53), invisível ao usuário | Tornar o disclaimer visível na UI (rodapé do painel/chat) — todo output de ML deve expor confiança + nota de honestidade. |

---

## 11. Melhorias de UX/UI sobre o wireframe base

**Crítica concreta, ancorada no arquivo real (`src/pages/Assistente.tsx` salvo onde indicado).**

1. **[P0] Expor o disclaimer de modelo simulado na UI (honestidade de IA).**
   Hoje a nota "predição de degradação simulada, não treinada em falhas reais" vive apenas no `buildSystem()` (L53) — o usuário nunca a vê. **Refinar:** adicionar um rodapé fixo de baixa-saliência no painel de contexto (B3) ou abaixo do input, ex.: *"Predição via gêmeo digital simulado (físico-informado). Não é modelo treinado em falhas reais."* Esforço **baixo**. Impacto de governança alto.

2. **[P0] Painel de contexto = output completo de US-9 (valor + confiança + explicação).**
   O card B3.1 (L197–208) mostra Saúde/Status/RUL/Temp/Vibração, mas **omite `probFalha21d` e `modoCritico`** que já estão no snapshot. **Refinar:** o painel deve liderar com o **modo de falha dominante** (`FAILURE_MODE_LABEL[twin.modoCritico]`) e a **probabilidade/confiança em 21d** como bloco de destaque, seguindo o padrão único de output de ML. O modelo já "sabe" — o humano precisa ver o mesmo.

3. **[P1] Reorganizar painel em abas/seções: Saúde · Leituras · Alertas.**
   Hoje o array hardcoded de 5 KPIs (L197–208) expõe só temp e vibração, enquanto o snapshot carrega 6 leituras. **Refinar:** card "Leituras" com as 6 tags (temp, vib, press, corrente, rpm, óleo), cada uma rastreando ao Dicionário (unidade/faixa/limite). Fecha a divergência painel↔snapshot apontada em §7. Esforço **médio** (substituir array literal por mapa derivado do dicionário).

4. **[P1] Tornar o painel navegável (governança + fluxo de volta).**
   Em B3.2 (L213–217), os alertas são texto (`titulo` + `id`) sem link. **Refinar:** cada alerta vira link para `/alertas/{id}`; o cabeçalho do ativo vira link para o detalhe do ativo. Resolve o "beco sem saída" de §9. Esforço **baixo**.

5. **[P0] Gatear `create_work_order` e a tela por RBAC.**
   `executeTool("create_work_order")` (`tools.ts:126`) escreve no store sem checar `can(...,"Alertas","full")`; a tela não chama `useCan("Assistente")`. **Refinar:** envolver a execução da ferramenta e o acesso à rota em checagens RBAC; se o papel não tem escrita, o assistente explica que não pode criar OS e sugere quem pode. Esforço **médio**.

6. **[P2] Pílula de tool use citar o argumento, não só o nome.**
   Hoje a bolha-pílula mostra "Consultou: run_whatif" (L96). **Refinar:** mostrar "Simulou: carga 0% → ΔRUL +12d" — transparência da cadeia de raciocínio. Esforço **baixo**.

7. **[P2] Chip de contexto com saúde/severidade, não só ID.**
   O chip cobalto (L122) mostra só "Contexto: BCP-01". **Refinar:** colorir a borda pela saúde (verde/âmbar/vermelho) e anexar mini-badge de RUL, dando sinal de estado sem abrir o painel. Esforço **baixo**.

8. **[P1] Breadcrumb com a cadeia de hierarquia.**
   `usePageChrome(["Assistente", "Contexto: BCP-01"])` (L120) não mostra empresa→planta→área. **Refinar:** herdar a Matriz de Hierarquia do ativo para o breadcrumb — governança como espinha ambiente. Esforço **médio**.
