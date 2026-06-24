## BLOCO 1 — Visão geral do produto

### 1.1 O que é o Predicta

O **PREDICTA** (by **FORZY**) é uma **plataforma IIoT de manutenção preditiva industrial** — um produto B2B,
em **dark mode**, voltado a operações fabris que monitoram ativos rotativos críticos (motores, bombas,
compressores). Não é um wireframe estático nem uma maquete: é um **aplicativo React/TS já funcional** deste
repositório, com:

- **Estado vivo** em Zustand (`src/store/useStore.ts`), persistido por `partialize`;
- **Motor de simulação físico-informado + Weibull** (`src/engine/*`), que gera telemetria, degradação e um
  **gêmeo digital** por ativo (`twin.state`, `twin.health`, `twin.residual`, `twin.history`);
- **Alertas vivos** avaliados a cada tick contra os **limites do Dicionário** (`evaluateAlerts`,
  `src/engine/simulation.ts`);
- **RBAC reativo** (`src/auth/rbac.ts`, matriz `PERM` em `src/data/seed.ts`);
- **OCR de placa** via Tesseract (`src/ai/ocr.ts`);
- **Assistente conversacional** com *tool use* sobre o estado vivo (`src/ai/*`).

A camada de IA preditiva é **honesta por construção**: o `PredictionModel` (`src/engine/prediction.ts`) é um
**modelo de degradação SIMULADO** ("Predicta Digital Twin Engine v1 · físico-informado + Weibull"), **não
treinado em falhas reais**. A interface já permite plugar um modelo treinado — quando isso ocorrer, o selo de
honestidade troca sozinho.

### 1.2 Qual problema resolve

O Predicta ataca o ciclo **"da leitura à decisão"** (DIKW: Dado → Informação → Conhecimento → Inteligência/Ação)
em manutenção industrial:

| Dor do chão de fábrica | Resposta do Predicta | User stories |
|---|---|---|
| Falhas inesperadas, parada não planejada | Predição de RUL (`rulDias`) e probabilidade de falha (`prob21`) por ativo | US-9, US-10, US-11 |
| Dado de sensor solto, sem rastreabilidade | Dicionário canônico (campo · unidade · faixa · limite · sensor · direção) que o motor consome | US-3, US-4, US-13 |
| Telemetria sem contexto histórico | Par "valor agora + série temporal" (US-7) em quase toda tela | US-7 |
| Onboarding lento de novos ativos | Cadastro manual + **OCR da placa** + posicionamento no mapa | US-5, US-6 |
| Acesso a dados sensíveis sem controle | RBAC por papel × módulo (none/read/full), gateando navegação e ações | US-13 |
| "Caixa-preta" da IA | Padrão único de output (valor + horizonte + confiança + explicação + nota de honestidade) | US-8/9/10/11 |
| Diagnóstico que depende de especialista | Assistente conversacional sugere solução de falhas sobre o estado vivo | US-12 |

### 1.3 Quais perfis usam (personas × RBAC)

O produto é multi-perfil. A matriz canônica vive em `seed.ts` (`PERM`) e é **editável em runtime** via
`/governanca/rbac` (mudar uma célula re-renderiza Sidebar, rotas e botões na hora). O briefing FORZY consolida
**cinco perfis-alvo** — três já implantados no seed e dois a reconciliar (lacuna P0 de governança):

| Perfil (briefing FORZY) | Status no código | Job principal | Default view recomendada |
|---|---|---|---|
| **Administrador Forzy** | a criar em `ROLES`/`PERM`/`SEED_USERS` | superusuário do fabricante; tudo `full` | `/dashboard` / `/governanca` |
| **Gestor industrial** (≈ Gerente Industrial) | implantado — tudo `full` | saúde da planta + KPIs | `/dashboard` |
| **Técnico de manutenção** | implantado — `Alertas:full`, demais read/none | trabalhar a fila de alertas | `/alertas` |
| **Usuário cliente** | a criar (≈ visão amigável US-2) | consumo somente-leitura | `/ativos` (cards) |
| **TI / Governança** | a criar (≈ Analista de Dados como proxy) | dono do Dicionário/RBAC/auditoria | `/governanca/dicionario` |

Convenção única de degradação por permissão: `full` → editável ("✎ Edição habilitada"); `read` →
somente-leitura (`Lock`); `none` → oculto na Sidebar e `Gate` "Acesso negado" na rota.

### 1.4 Quais os módulos do sistema

Os módulos (`MODS` em `seed.ts`) são as unidades de contrato, de RBAC e de navegação:

| Módulo | Macroárea | Papel no produto |
|---|---|---|
| **Dashboard** | Operação | Visão de frota / cockpit executivo |
| **Ativos** | Ativos | Inventário + detalhe (Visão Geral, Telemetria, Saúde & IA, Técnico, Gêmeo) |
| **Telemetria** | Ativos | Séries temporais por grandeza (subdomínio de Ativos) |
| **Alertas** | Alertas | Fila viva regra × modelo × manual |
| **Assistente** | Assistente | Agente conversacional com *tool use* (US-12) |
| **Cadastro** | Cadastro e Digitalização | Onboarding manual de ativo |
| **OCR** | Cadastro e Digitalização | Leitura da placa (US-5) |
| **Mapa** | Cadastro/Operação | Planta digital navegável (US-6) |
| **Governança** | Governança | Hierarquia, D-I-C-I, Dicionário, navegação |
| **RBAC** | Governança | Permissões por papel × módulo |

> **Modularidade (US-1) — lacuna conhecida.** É preciso separar *módulo não-contratado* (implantação parcial →
> cadeado + upsell, nunca tela quebrada) de *módulo sem permissão do papel* (RBAC → oculto). Hoje a Sidebar
> trata os dois como "some o item"; nenhuma tela lê a flag `contratados`.

### 1.5 Lógica geral de navegação

O fluxo segue **da frota ao ativo ao incidente**, sempre governado por papel:

1. **Acesso.** `/login` é público; todo o resto vive sob o layout `AppShell` (`routes.tsx`). *RequireAuth ainda
   não está montado — sem login forçado, o RBAC fica enfraquecido (P0).*
2. **Operação (visão de frota).** Dashboard (saúde + KPIs) e Painel Operacional (*war room*) são os pontos de
   partida; o Mapa dá a visão espacial.
3. **Drill ao ativo.** Dashboard/Painel/Mapa/Lista → `/ativos/:id`, cujo shell (`AtivoDetail.tsx`) expõe 5 abas
   (Visão Geral, Telemetria, Saúde & IA, Gêmeo Digital, Dados Técnicos) sob um cabeçalho comum + `Outlet
   context {asset, twin}`.
4. **Incidente.** Alertas (lista → detalhe) e a ponte "Investigar com Assistente" (US-12) fecham o ciclo
   diagnóstico.
5. **Onboarding.** Cadastro Manual ↔ OCR da placa → novo ativo nasce e (deveria) aparecer no Mapa.

A **default view por papel** ainda é fixa em `/dashboard` — quebra para perfis com `Dashboard:none` (P0).

### 1.6 Como a governança se integra ao produto (a "espinha")

A Governança **não é um item de menu**: é uma **espinha ambiente** que aparece *dentro de cada tela*. São
quatro pilares invariantes, com fonte de verdade no store e materialização transversal na UI:

| Pilar | Regra invariante | Fonte de verdade | Materialização |
|---|---|---|---|
| **Hierarquia (Matriz)** | O breadcrumb **É** a matriz empresa → planta → área → sistema → ativo, clicável, com escopo herdado | `HTREE` / `Hierarquia.tsx` | `BC` (`ui-shared`); `pathToNode` a criar |
| **Dicionário** | **Todo número rastreia ao Dicionário** (campo · unidade · faixa · limite · sensor · direção) | `SEED_DICTIONARY` / `Dicionario.tsx`; consumido por `evaluateAlerts` | `<TraceableValue>` a criar |
| **RBAC** | **Toda ação é gated** por `useCan(modulo, nivel)`; rota protegida por `Gate` | `PERM` / `rbac.ts` / `RBAC.tsx` | botões/inputs degradam por nível |
| **D-I-C-I** | **Todo artefato carrega seu ciclo** Desenho → Instalação → Comissionamento → Inspeção | `SEED_DICI` / `DICI.tsx` | `<DiciBadge>` a criar |

Duas decisões consolidadas das rodadas de refino: (a) adotar a **pirâmide DIKW** ("Da Leitura à Decisão") como
o D-I-C-I oficial e renomear o ciclo documental para **"Ciclo do Ativo"**; (b) introduzir a **trilha de
auditoria** (`auditLog` + `logAudit`) nas cinco escritas de governança (`setRbac`/`setDici`/`upsertTag`/
`removeTag`/`setHierarchy`), hoje ausente — a maior lacuna de governança. A honestidade da IA (selo SIMULADO)
é tratada como **requisito de governança**, não como detalhe de UI.

> **Princípio condutor.** O produto já é vivo e governado por RBAC; o que falta é **aplicar consistentemente**
> o que já existe (gating, honestidade, rastreabilidade) e **expor na UI** o que hoje só vive no engine/prompt.

---

## BLOCO 2 — Arquitetura das telas

Todas as telas do **inventário canônico**, agrupadas por macroárea, com propósito e **rota real**
(`src/routes.tsx`). Legenda de gating real: 🔒 = rota com `<Gate>` hoje · ⚠ = rota **sem** `<Gate>` (vazamento
RBAC, P0) · — = pública/estrutural.

### ACESSO

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Login** | `/login` | — | Porta pública de entrada; deveria definir a *default view* por papel e o escopo da sessão. |

### OPERAÇÃO

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Dashboard inicial** | `/dashboard` | ⚠ | Cockpit de frota: KPIs de saúde, projeção IA, alertas recentes e ativos em atenção. |
| **Painel Operacional** | `/operacional` | ⚠ | *War room* do chão de fábrica: cards de ativos ao vivo, status e micro-leituras de sensores. |

### ATIVOS

O detalhe do ativo é um shell único (`AtivoDetail.tsx`) com 5 abas que compartilham cabeçalho e `Outlet
context {asset, twin}`.

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Lista de Ativos** | `/ativos` | ⚠ | Inventário monitorado; entrada para triagem da frota (RUL/severidade a surfacar). |
| **Detalhe — Visão Geral** | `/ativos/:id/overview` | ⚠ | Resumo do ativo: saúde, leituras-chave, alertas e próximas ações. |
| **Detalhe — Telemetria** | `/ativos/:id/telemetria` | ⚠ | Séries temporais por grandeza (V/A/RPM/°C…) com limites do Dicionário (US-3/4/7). |
| **Detalhe — Saúde & IA** | `/ativos/:id/saude` | ⚠ | Padrão único de IA: RUL, anomalia, modo crítico, baseline e recomendações (US-8/9/10/11). |
| **Detalhe — Dados Técnicos** | `/ativos/:id/tecnico` | ⚠ | Placa, sensores instalados e dados de projeto; âncora do OCR e do D-I-C-I. |
| **Gêmeo Digital** | `/ativos/:id/gemeo` | ⚠ | Simulação "E se…" físico-informada; efeito de manutenção sobre RUL (US-11). |

### ALERTAS

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Lista de Alertas** | `/alertas` | 🔒 | Fila viva regra × modelo × manual; triagem por severidade/origem. |
| **Detalhe do Alerta** | `/alertas/:id` | 🔒 | Incidente: evidência (mini-gráfico + limite), origem, predição e ações (resolver/OS/assistente). |

### ASSISTENTE

As telas 10 e 11 são **um único componente** (`Assistente.tsx`) em dois modos, alternados por `const ctx =
!!asset`.

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Assistente conversacional (frota)** | `/assistente` | ⚠ | Agente com *tool use* sobre o estado da frota; sugere solução de falhas (US-12). |
| **Assistente com contexto do ativo** | `/assistente/:assetId` | ⚠ | Mesmo agente com o ativo em foco (modo crítico + `probFalha21` no painel de contexto). |

### CADASTRO E DIGITALIZAÇÃO

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Cadastro Manual** | `/cadastro` | 🔒 | Onboarding em etapas de um novo ativo (deveria exigir `Cadastro:full`). |
| **Cadastro por OCR da placa** | `/cadastro/ocr` | 🔒 | Captura da placa via Tesseract; auto-preenche campos com confiança por campo (US-5). |
| **Mapa Digital da Planta** | `/mapa` | ⚠ | Planta navegável: ativos posicionados por área, abrindo o detalhe (US-6). |

### ADMINISTRATIVAS

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Configurações** | `/configuracoes` | — | Sessão/papel, simulação (pausar/velocidade) e reset do estado do app. |

### GOVERNANÇA

| Tela | Rota real | Gate | Propósito (1 linha) |
|---|---|:--:|---|
| **Visão Geral** | `/governanca` | 🔒 | Cockpit executivo + hub-roteador; KPIs vivos de conformidade e cards-portal gated. |
| **Matriz de Hierarquia** | `/governanca/hierarquia` | 🔒 | Árvore empresa→planta→área→sistema→ativo (`HTREE`); fonte do breadcrumb e do escopo. |
| **D-I-C-I** | `/governanca/dici` | 🔒 | Ciclo do Ativo (Desenho→Instalação→Comissionamento→Inspeção) + fluxo DIKW da decisão. |
| **Dicionário de Rastreabilidade** | `/governanca/dicionario` | 🔒 | Fonte canônica de tags/limites que `evaluateAlerts` consome; cadeia tag→alerta→ativo→perfil. |
| **Dicionário de Rastreabilidade e Navegação** | `/governanca/navegacao` *(proposta)* | — | Grafo de telas + simulador de papel + auditoria; prova que todo percurso é alcançável e gated. |
| **RBAC / Permissões** | `/governanca/rbac` | 🔒 | Matriz papel × módulo (none/read/full) editável; gateia toda a navegação e ações em runtime. |

> **Notas de rota (ancoradas em `routes.tsx`).** Hoje só **Alertas, Cadastro, OCR, Governança e RBAC** têm
> `<Gate>`; **Dashboard, Operacional, Ativos (+abas), Assistente e Mapa vazam acesso por URL** (⚠) — fechar é
> P0 transversal. As rotas `/governanca/navegacao` e `/governanca/auditoria` ainda **não existem** no roteador
> (propostas). `/` redireciona estaticamente a `/dashboard` (`index: true`), o que quebra a *default view* de
> perfis com `Dashboard:none`.
