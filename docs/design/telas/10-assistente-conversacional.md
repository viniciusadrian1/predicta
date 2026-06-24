# 10 — Assistente conversacional

> Arquivos-âncora: `src/pages/Assistente.tsx`, `src/ai/assistant.ts`, `src/ai/tools.ts`.
> Grounding: `src/store/useStore.ts`, `src/engine/simulation.ts`, `src/auth/rbac.ts`, `src/data/seed.ts`, `src/lib/theme.ts`, `src/lib/types.ts`, `src/routes.tsx`, `src/components/ui-shared/index.tsx`, `src/components/layout/chrome.tsx`.

---

## 1. Nome da tela

**Assistente conversacional** (Assistente Técnico Predicta) — chat operacional com *tool use* sobre o gêmeo digital, alertas, telemetria e simulação. Rotas reais: `/assistente` (frota) e `/assistente/:assetId` (contextualizado a um ativo), ambas resolvidas por `Assistente.tsx` em `routes.tsx` (linhas 71–72). Cobre **US-12** (conversacional sugere solução de falhas).

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** A tela já é um assistente *real*, não um mock: `runTurn()` em `Assistente.tsx` posta a conversa no proxy seguro `/api/assistant` via `streamAssistant()` (`src/ai/assistant.ts`), faz **streaming** token-a-token (`onText` acumula em `acc` e re-renderiza a bolha), e implementa um **loop de tool use cliente-lado** com profundidade máxima 5 (`depth < 5`). Quando o modelo retorna `finish_reason: "tool_calls"`, a página executa as ferramentas localmente via `executeTool()` (`src/ai/tools.ts`) contra o **store/engine vivos** e devolve o resultado como mensagens `role:"tool"`, re-chamando `runTurn`. Há cinco ferramentas reais: `get_twin_state`, `list_alerts`, `run_whatif` (chama `runScenario` do motor de simulação, sem afetar estado real), `create_work_order` (efetivamente cria um alerta tipo "Ordem de Serviço" via `s.addAlert`) e `get_fleet_summary`. O `system prompt` (`buildSystem()`) já injeta data/hora simulada (`st.simClock`), já injeta o estado do ativo em foco ou o resumo da frota, e **já declara a nota de honestidade** ("modelo de degradação simulado (físico-informado), não treinado em falhas reais"). Existe painel de contexto lateral (saúde/RUL/temp/vibração + alertas do ativo) quando há `:assetId`, chips de sugestão, "Nova conversa" (`novaConversa`) e `AbortController` para cancelar o stream.

**Objetivo a REFINAR.** Consolidar o assistente como a **camada de linguagem natural da governança Predicta**: um operador que pergunta em PT-BR e recebe respostas *rastreáveis* (todo número apontando ao Dicionário e à Hierarquia), *acionáveis* (sugestões que viram navegação ou OS de fato) e *honestas* (o **padrão único de confiança** — valor + janela + confiança + variáveis + nota — exposto de forma estruturada, não só prosa). Hoje o output de IA é texto livre com `**negrito**`; o refinamento eleva isso a **cards de resposta tipados** (predição, what-if, OS) e fecha a lacuna mais grave: o assistente **executa ações e lê dados sem nenhum gate de RBAC**, divergindo do princípio "toda ação é gated por `can()`". O objetivo é transformar a conversa de "chat que sabe coisas" em "copiloto de operação governado".

---

## 3. Perfil principal que usa a tela

**Primário: (a) Técnico de Manutenção** e **(b) Gestor Industrial**. No seed (`src/data/seed.ts`), o módulo `Assistente` é `full` para *Gerente Industrial* e *Eng. Confiabilidade*, `full` também para *Técnico Manutenção*, `read` para *Analista de Dados* e `none` para *Operador Campo*. Ou seja: o assistente é a porta de entrada de quem opera (Técnico) e de quem decide (Gestor); o Analista só deveria *consultar* (sem `create_work_order`); o Operador **não deveria sequer abrir a tela**. Secundários: **(c) Cliente da Indústria** (US-2, interface amigável — consulta de saúde de frota em linguagem natural, escopo restrito à sua hierarquia) e **(d) Admin Forzy** (auditoria do comportamento do assistente). **(e) TI/Governança** não usa para operar, mas define no RBAC o que o assistente pode ver/fazer por papel.

---

## 4. User stories da Forzy atendidas

| US | Como o assistente atende | Onde no código |
|----|--------------------------|----------------|
| **US-12** (núcleo) | Conversacional que sugere solução de falhas: diagnostica causa provável, recomenda plano de manutenção, gera OS | `Assistente.tsx`, `tools.ts` (`create_work_order`) |
| US-2 | Interface amigável p/ clientes industriais — pergunta em PT-BR, sem navegar painéis | `buildSystem()` ("Responda SEMPRE em português do Brasil") |
| US-7 | Valores atuais via ferramenta em vez de inventar números | `get_twin_state` → `tw.state` (temp/vib/press/corrente/rpm/oleo) |
| US-8 | Baseline operacional referenciado ao explicar normalidade | indireto via `get_twin_state` (saúde/status) |
| US-9 | Previsão de anomalias — `probFalha21d`, modo dominante | `get_twin_state` (`probFalha`, `modoCritico`) |
| US-10 / US-11 | Previsão de parada e manutenção planejada via cenário "e se" e geração de OS | `run_whatif` (`runScenario`), `create_work_order` |
| US-13 | Governança de acessos/dados — **parcialmente**: o RBAC existe mas **ainda não gate-ia** o que o assistente vê/faz (lacuna em §10/§11) | `rbac.ts` existe; `executeTool` não o consulta |

---

## 5. Blocos e seções da tela

| # | Bloco | Conteúdo atual | Refino proposto |
|---|-------|----------------|-----------------|
| B1 | **Page chrome / Topbar** | Breadcrumb `["Assistente", contexto]` + badge "Contexto: ID" + botão "Nova conversa" (`usePageChrome`, linhas 120–125) | Breadcrumb deve ser a **trilha de Hierarquia real** quando há ativo (empresa › planta › área › sistema › ativo), não só `Contexto: BCP-01` |
| B2 | **Thread de conversa** (coluna principal) | Lista de `bubbles` (`user`/`ai`/`tool`) com scroll-to-bottom; bolha AI estilizada `#0F1E35`, bolha user cobalto, chip "Consultou: X" centralizado | Render de **markdown completo** + **cards tipados** para outputs de ferramenta (predição/what-if/OS), não bolha de texto puro |
| B3 | **Indicador de atividade** | "Analisando…" com `Loader2` enquanto `busy` | Estado granular: "Consultando gêmeo de BCP-01…", "Rodando simulação…", "Criando OS…" — espelhando a ferramenta em execução |
| B4 | **Chips de sugestão** | 4 sugestões estáticas dependentes de contexto (`suggestions`, linhas 43–45) | Sugestões **dinâmicas e gated** (ver §11): só "Gerar ordem de serviço" se `can("Alertas","full")`; sugestões derivadas do estado real do ativo |
| B5 | **Composer / input** | Input texto + Enter + botão Send; placeholder contextual | Adicionar `@menção` de ativo, histórico (seta ↑), e desabilitar ações de escrita quando o papel é `read` |
| B6 | **Painel de Contexto Ativo** (lateral 56u, só com `:assetId` e `twin`) | Card com Saúde/Status/RUL/Temp/Vibração (cores por faixa) + card "Alertas do Ativo" (até 4 abertos) | Cada métrica vira **deep-link** (Saúde→`/ativos/:id/saude`, Temp→`/ativos/:id/telemetria`) e exibe **unidade/faixa do Dicionário** |
| B7 | **(novo) Faixa de honestidade** | inexistente como UI (só no system prompt) | Rodapé persistente: "Predição por gêmeo digital simulado — não treinado em falhas reais" + selo de confiança nos cards |

---

## 6. Componentes principais

| Componente | Origem | Papel na tela | Observação de refino |
|------------|--------|---------------|----------------------|
| `streamAssistant()` | `src/ai/assistant.ts` | Cliente SSE: faz fetch a `/api/assistant`, parseia deltas de `content` e `tool_calls` incrementais (`toolBlocks` por índice), entrega `{text, toolCalls, finishReason}` | Robusto; só falta surfacing de `onError` mais rico (hoje vira "⚠️ " + msg na bolha) |
| `runTurn()` (recursivo) | `Assistente.tsx` | Orquestra turno: stream → se `tool_calls`, executa e re-chama (`depth<5`) | Mover para hook `useAssistantTurn` testável; hoje é closure dentro do componente |
| `ASSISTANT_TOOLS` + `executeTool()` | `src/ai/tools.ts` | Schema (formato OpenAI function) + executor contra store/engine | Inserir **gate RBAC** e **envelope de confiança** no retorno (§10/§11) |
| `runScenario()` | `src/engine/simulation.ts` | Núcleo de `run_whatif` (base vs. cenário, RUL, dataFalha) | Já retorna `healthFinal`/`dataFalhaMs`; falta `confianca`/variáveis no payload |
| `useStore` (Zustand) | `src/store/useStore.ts` | Fonte viva: `assets`, `twins`, `alerts`, `simClock`, `dictionary`, `settings`, `addAlert` | `create_work_order` muta store direto — ok, mas precisa de RBAC antes |
| `usePageChrome` | `src/components/layout/chrome.tsx` | Breadcrumb + ações da topbar | Recebe trilha de hierarquia real |
| `Bubble` / render markdown inline | `Assistente.tsx` (linhas 148–152) | Split por `\n` e `**bold**` apenas | Substituir por renderer de markdown + componente `<AssistantCard>` |
| `IBtn`, `Badge` | `src/components/ui-shared/index.tsx` | "Nova conversa", selos | Reuso; adicionar `SevBadge`/`KPI` dentro dos cards de resposta |
| `AbortController` (`abortRef`) | `Assistente.tsx` | Cancela stream em curso / desmontagem | Manter; expor botão "Parar" visível durante `busy` |
| Painel de Contexto (cards laterais) | `Assistente.tsx` (linhas 186–222) | Snapshot do ativo + alertas | Componentizar e tornar métricas clicáveis/ancoradas no Dicionário |

---

## 7. Dados exibidos

| Dado | Campo / origem | Como aparece hoje | Rastreabilidade (refino) |
|------|----------------|-------------------|--------------------------|
| Saúde do ativo | `twin.health` / `get_twin_state.saude` | Painel lateral (cor por faixa) + texto da IA | → derivação do baseline US-8 |
| Status | `twin.status` (`normal/atencao/critico/offline`) | Painel + `get_fleet_summary.porStatus` | → faixa do Dicionário |
| RUL | `twin.rulDias` | Greeting, painel, `run_whatif` | → janela/horizonte explícito |
| Modo de falha dominante | `FAILURE_MODE_LABEL[twin.modoCritico]` | Greeting + `get_twin_state.modoCritico` | → variável explicativa US-9 |
| Prob. de falha 21d | `tw.probFalha.find(h===21).prob` | só via tool, não na UI | expor como **confiança/horizonte** em card |
| Leituras de sensores | `tw.state.{temp,vib,press,corrente,rpm,oleo}` | painel (temp/vib) + tool | unidades V/A/RPM/°C do Dicionário (US-4) |
| Resumo de frota | `get_fleet_summary` (totais, porStatus, alertasAbertos, pioresAtivos) | injetado no system + texto | tabela "piores ativos" clicável |
| Alertas | `s.alerts` via `list_alerts` / painel | painel lateral (até 4) + tool (até 20) | filtro por hierarquia do papel |
| Cenário what-if | `run_whatif`: `rulBaseDias`, `rulCenarioDias`, `deltaRulDias`, `novaDataFalha`, `saudeFinalCenario` | só prosa | **card comparativo** base × cenário |
| OS criada | `create_work_order` → `{ok, id}` + toast | toast + chip | card com link para `/alertas/:id` |
| Data/hora simulada | `st.simClock` via `fmtDateTime` | injetada no system | mostrar no rodapé do chat |
| Nota de honestidade | string fixa no system prompt | invisível ao usuário | **selo de UI persistente** |

---

## 8. Ações do usuário

| Ação | Gatilho atual | Efeito | Gate RBAC esperado (refino) |
|------|---------------|--------|------------------------------|
| Enviar mensagem | `send()` (Enter/botão) | inicia `runTurn`, stream | `can("Assistente","read")` para abrir a tela |
| Usar chip de sugestão | `send(sg)` | mesma rota de envio | idem |
| Consultar gêmeo | modelo chama `get_twin_state` | leitura do twin | leitura: `Ativos`/`Assistente` read |
| Listar alertas | `list_alerts` | leitura filtrada | leitura: `Alertas` read |
| Rodar what-if | `run_whatif` → `runScenario` | simulação efêmera (não muta) | leitura: `Telemetria`/`Assistente` read |
| **Criar OS** | `create_work_order` → `addAlert` | **muta o estado real** + toast | **escrita: `can("Alertas","full")`** — hoje sem gate |
| Resumo de frota | `get_fleet_summary` | leitura agregada | leitura; **restringir à hierarquia do papel** |
| Nova conversa | `novaConversa()` | aborta stream, limpa `bubbles`/`convoRef` | sem gate |
| Cancelar geração | desmontagem aborta (`abortRef`) | encerra stream | expor botão "Parar" durante `busy` |

---

## 9. Relação com outras telas

- **Entrada contextual:** `/assistente/:assetId` é acionado a partir de **Detalhe do Ativo** e suas abas (`/ativos/:id/...`), **Gêmeo Digital** e **Alertas**, herdando o ativo no painel de contexto e no system prompt (`buildSystem` injeta `get_twin_state`). O greeting já reflete RUL e modo dominante do `twin`.
- **Saída acionável (refino):** cada output de ferramenta deve **deep-linkar** para sua tela canônica — predição→`/ativos/:id/saude` (Saúde IA), telemetria→`/ativos/:id/telemetria`, gêmeo/what-if→`/ativos/:id/gemeo`, OS criada→`/alertas/:id` (já existe a rota em `routes.tsx`), frota→`/dashboard` e `/operacional`.
- **Espelho do que existe em outras telas:** `run_whatif` usa o mesmo `runScenario` do **Gêmeo Digital**; `list_alerts`/`create_work_order` escrevem no mesmo store de **Alertas** (`addAlert`), então uma OS gerada aqui aparece imediatamente em `/alertas`. Coerência de IA: o card de predição do assistente deve usar o **mesmo padrão de confiança/honestidade** das telas Saúde IA e Gêmeo Digital.
- **Sidebar/RBAC:** o item de menu "Assistente" deve seguir o mesmo padrão de visibilidade por papel das demais entradas governadas.

---

## 10. Relação com governança

- **Hierarquia (breadcrumb):** hoje o chrome mostra `Contexto: BCP-01` (string). Refino: trilha completa empresa › planta › área › sistema › ativo, e o `get_fleet_summary`/`list_alerts` devem ser **filtrados pela hierarquia do usuário** (cliente só vê sua planta) — princípio "navegação governada".
- **Dicionário:** todo número que o assistente cita (temp, vib, RUL, prob) deve **rastrear ao Dicionário** (campo, unidade, faixa, limite, sensor, direção). Hoje `get_twin_state` retorna valores crus sem unidade/faixa; o executor deve anexar metadados de `s.dictionary` para que a resposta seja auditável.
- **RBAC (lacuna crítica):** a rota `/assistente` **não está envolta em `<Gate>`** em `routes.tsx` (linhas 71–72, ao contrário de Alertas/Cadastro/Governança), e `executeTool()` **não chama `can()`**. Resultado: qualquer sessão pode criar OS e ler a frota inteira via assistente, furando o RBAC. Refino obrigatório: (1) `<Gate modulo="Assistente">` na rota; (2) gate por ferramenta dentro de `executeTool` — `create_work_order` exige `can(rbac, papel, "Alertas", "full")`, `list_alerts` exige `Alertas` read, etc.; (3) negar com mensagem honesta ("Seu papel não permite criar ordens de serviço").
- **D-I-C-I:** uma OS criada pelo assistente é um artefato — deve nascer com referência ao ciclo (Inspeção) e ao ativo, não só `tipo:"Ordem de Serviço"`.
- **Padrão de confiança/honestidade:** a nota "modelo simulado" já está no system prompt, mas é **invisível na UI**; governança exige que confiança + horizonte + variáveis + nota apareçam estruturados em todo output de ML (US-8/9/10/11), não dependendo do modelo "lembrar" de dizê-lo em prosa.

---

## 11. Melhorias de UX/UI sobre o wireframe base

1. **Gate de RBAC na rota e por ferramenta (P0).** Em `routes.tsx` (71–72), envolver `<Assistente/>` em `<Gate modulo="Assistente">`. Em `src/ai/tools.ts`, `executeTool` deve receber/consultar `can()` antes de `create_work_order` e `list_alerts`/`get_fleet_summary`, retornando `{erro:"Sem permissão"}` em vez de executar. É a divergência mais grave do princípio "toda ação é gated".

2. **Cards de resposta tipados em vez de bolha de texto (P0).** Hoje todo output da IA é uma `Bubble` com split de `\n` e `**bold**` (linhas 148–152) — what-if, predição e OS chegam como prosa. Criar `<AssistantCard variant="prediction|whatif|workorder">` que renderiza o **envelope de confiança**: valor + janela/horizonte + barra de confiança (`Bar_`/`KPI` de `ui-shared`) + variáveis explicativas (`SH`) + nota de honestidade. O `run_whatif` já retorna `rulBase/rulCenario/delta/novaDataFalha` — basta um card comparativo (base × cenário) em vez de texto.

3. **Selo de honestidade persistente (P0).** A nota "modelo simulado, não treinado em falhas reais" só existe em `buildSystem()` — invisível. Adicionar um rodapé fixo no chat e um micro-selo âmbar nos cards de predição. Garante o "padrão único de output de IA" independentemente do que o LLM escolher dizer.

4. **Render de markdown completo (P1).** O parser inline só trata `\n` e `**bold**`; listas, tabelas e código quebram. Substituir o map manual (148–152) por um renderer de markdown leve, preservando a paleta (Rajdhani para números, JetBrains Mono para tags/dados).

5. **Trilha de hierarquia no breadcrumb (P1).** `usePageChrome(["Assistente", "Contexto: BCP-01"])` deve virar a trilha empresa›planta›área›sistema›ativo, alinhando a tela à "espinha de governança" presente nas operacionais.

6. **Chips de sugestão dinâmicos e gated (P1).** `suggestions` (43–45) é estático. Derivar do estado real (se `twin.modoCritico` é rolamento → "Simular troca de rolamento") e **esconder ações de escrita** quando o papel não tem `Alertas:full` — não oferecer "Gerar ordem de serviço" a quem não pode criá-la.

7. **Métricas do painel lateral clicáveis e ancoradas no Dicionário (P1).** O card de Contexto Ativo (197–208) mostra Temp/Vibração sem unidade-fonte nem link. Cada linha vira deep-link (Temp→telemetria, Saúde→saude) e exibe a faixa/limite do `dictionary`, tornando o número auditável.

8. **Estados de atividade granulares + botão "Parar" (P2).** "Analisando…" (160) é genérico apesar de o código saber a ferramenta em execução (o chip "Consultou: X" só aparece *depois*). Mostrar "Consultando gêmeo de BCP-01…" durante a chamada e expor um botão "Parar" (o `abortRef` já existe) visível em `busy`.

9. **Tratamento de erro mais rico (P2).** `onError` injeta "⚠️ " + msg como bolha (linha 81) e toast. Diferenciar erro de rede, RBAC negado e limite do modelo, com ação de retry inline, em vez de uma bolha de erro indistinta.

10. **Persistência leve de conversa (P2).** `novaConversa` zera tudo e não há histórico entre sessões. Persistir o último thread por ativo (Zustand + storage) ajuda o Técnico a retomar uma investigação.
