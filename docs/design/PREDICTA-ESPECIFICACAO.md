# Predicta — Especificação de Produto & Wireframes

**(by Forzy)** — plataforma IIoT de manutenção preditiva industrial · B2B · dark mode.

> **Como usar este documento:** base de apresentação · guia para refinar o Figma · roteiro de prototipação · blueprint do produto.

---

## Sumário executivo

O **PREDICTA** (by **FORZY**) é uma plataforma IIoT de manutenção preditiva industrial — um aplicativo React/TS **já funcional** (não wireframe), com estado vivo em Zustand, motor de simulação físico-informado + Weibull que gera telemetria, gêmeo digital e predição por ativo, alertas avaliados a cada tick contra os limites do Dicionário, RBAC reativo, OCR de placa via Tesseract e um assistente conversacional com *tool use* sobre o estado vivo. Cobre o ciclo "da leitura à decisão" (DIKW) para as 13 user stories da Forzy, atendendo cinco perfis (Administrador Forzy · Técnico · Gestor industrial · Usuário cliente · TI/Governança).

A especificação consolida três rodadas de refino sobre o inventário canônico de telas (Acesso, Operação, Ativos, Alertas, Assistente, Cadastro/Digitalização, Administrativas e Governança) e ancora cada decisão no código real, separando "já existe" de "refinar".

Três maiores movimentos **P0** orientam a evolução: (1) **fechar o gap de RBAC nas ações de escrita** — `applyMaintenance`, criar/registrar OS e ações de alerta hoje não passam por `can()`/`useCan()`, o furo de governança mais crítico (US-13); (2) **tornar a IA honesta e inspecionável** — um envelope único `AIConfidence` (valor + horizonte + confiança + explicação + selo "modelo SIMULADO") e `<TraceableValue>` ligando todo número ao Dicionário; (3) **materializar a espinha de governança** — breadcrumb = Matriz de Hierarquia navegável e a **trilha de auditoria** ausente nas cinco escritas de governança. O princípio condutor é uniforme: aplicar consistentemente o que já existe e expor na UI o que hoje só vive no engine, no seed e no system prompt.

## Índice

- [BLOCO 1 — Visão geral do produto](#bloco-1--visão-geral-do-produto)
- [BLOCO 2 — Arquitetura das telas](#bloco-2--arquitetura-das-telas)
- [BLOCO 3 — Especificação final das telas](#bloco-3--especificação-final-das-telas)
- [BLOCO 4 — Matriz tela × user story](#bloco-4--matriz-tela--user-story)
- [BLOCO 5 — Mapa de navegação do sistema](#bloco-5--mapa-de-navegação-do-sistema)
- [BLOCO 6 — Camada de governança do produto](#bloco-6--camada-de-governança-do-produto)
- [BLOCO 7 — Recomendações finais de melhoria do design](#bloco-7--recomendações-finais-de-melhoria-do-design)
- [Anexos — specs detalhadas](#anexos--specs-detalhadas)

---

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


---

## BLOCO 3 — Especificação final das telas

> Especificação detalhada de cada tela do inventário canônico, em três partes: **(A)** Acesso, Operação e a trilha do Ativo; **(B)** Alertas, Assistente, Cadastro/Digitalização e Administrativas; **(C)** Governança. Cada tela mantém seu próprio `###`.

### Parte A — Acesso · Operação · Trilha do Ativo

### Login

> Spec-fonte: `docs/design/02-acesso-operacao.md` (Tela 1) · código real: `src/pages/Login.tsx`, `src/auth/useAuth.ts`.

1. **Objetivo.** Autenticar o usuário corporativo e estabelecer a **sessão/papel** que define todo o restante da experiência (módulos visíveis, permissões via RBAC, *default view*). É a única tela **pré-RBAC** do produto — a porta que decide quem é o usuário antes de qualquer governança.
2. **Perfil principal.** Todos os perfis (Administrador Forzy · Técnico · Gestor industrial · Usuário cliente · TI/Governança). Login não distingue papel na entrada; o papel nasce da `Session` criada aqui (`Session.papel`), semeado em `SEED_USERS` (`src/data/seed.ts`).
3. **User stories atendidas.** US-2 (interface amigável, copy PT-BR, prova social industrial) · US-13 (a sessão carrega `papel`, base de todo o RBAC subsequente).
4. **Componentes principais.** Layout bipartido (painel-marca `lg:hidden` à esquerda + formulário `w-[400px]` à direita); logo `Target` em gradiente `cobalt→navy`; headline Rajdhani 42px; grid 2×2 de cards de prova social (`steel`); inputs com borda `red` em erro; CTA `ENTRAR` (gradiente cobalto→navy); faixa de erro com `AlertCircle`; toggle "Manter conectado".
5. **Dados exibidos.** Campos e-mail/senha; 4 KPIs de prova social (`247 / 5 / 97.4% / 2.1h` — **hardcoded**, descolados do store); faixa "SSO + MFA habilitado" (**copy decorativa**, sem SSO/MFA real); rodapé de segurança/versão. Mensagens de erro reais de `login()`: "Usuário não encontrado", "Senha incorreta", "Usuário inativo".
6. **Ações do usuário.** Login (`login(email, senha, keep)` → valida e-mail contra `SEED_USERS`, senha demo `predicta`, bloqueia usuário `inativo`, cria `Session` persistida — **30 dias** se "Manter conectado", **1 dia** caso contrário); toggle "Manter conectado"; "Esqueci a senha" (**botão morto**, sem handler). Sem estado de *loading* (login síncrono).
7. **Conexões com outras telas.** Saída única: *default view* pós-login → hoje **sempre `/dashboard`** (`Login.tsx:18`, `routes.tsx:49`), inclusive para papéis com `Dashboard: none` (ex.: Operador de Campo). Guarda de autenticação global em `AppShell` (`src/components/layout/AppShell.tsx:17`) redireciona para `/login` se não autenticado.
8. **Relação com governança.** A `Session` é o **artefato de governança raiz**: `Session.papel` alimenta `permLevel` em todo o app; `expiresAt` é política de sessão. Único *gate* de status no produto (usuário `inativo` barrado aqui). **Falta:** registro de auditoria de login (US-13 pede rastreabilidade) e exibição de "último acesso" (`user.acesso` existe na semente, não exibido).
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** Trocar os 4 KPIs hardcoded por valores reais do store (ou rótulos neutros) — abrir o produto com `247` ativos que o Dashboard contradiz com `10` reais fere a credibilidade; remover credenciais pré-preenchidas fora de modo demo (flag `import.meta.env`).
   - **[P0]** **Default view por papel:** pós-login, redirecionar para a 1ª rota que o papel pode ver (a partir de `rbac`/`modules`), nunca fixo em `/dashboard` — Técnico → `/alertas` (fila), Operador → `/operacional`/`/mapa`.
   - **[P1]** Estado `submitting` no CTA (spinner + disable) preparando auth assíncrona/SSO real; tornar "Esqueci a senha" funcional ou ocultar.
   - **[P2]** Mostrar "último acesso" + nota de auditoria; alinhar a copy "SSO+MFA" à realidade enquanto não existir.

---

### Dashboard inicial

> Spec-fonte: `docs/design/telas/01-dashboard.md` e `docs/design/02-acesso-operacao.md` (Tela 2) · código real: `src/pages/Dashboard.tsx`, `src/store/derive.ts`.

1. **Objetivo.** *Landing* operacional (rota `/` e `/dashboard`): responder em <5s, sem rolagem, a três perguntas — *a frota está saudável agora? o que está piorando e em que direção? para onde agir primeiro?* É o **hub de roteamento de atenção** que encaminha para o trabalho (Alertas, Ativos); nunca executa o trabalho.
2. **Perfil principal.** **Gestor industrial** (única persona cuja jornada começa e frequentemente termina aqui — visão de frota agregada, KPIs de SLA, tendência). Secundários: Técnico (triagem), Usuário cliente (versão simplificada US-2), Admin Forzy (multi-planta).
3. **User stories atendidas.** US-1 (blocos modulares montados num grid) · US-2 (KPIs com rótulo + valor + contexto, navegação por clique) · US-7 (KPIs atuais + histórico 7d/30d no mesmo *fold*) · US-9 parcial (linha "Projeção IA" da `fleetHealthTrend`).
4. **Componentes principais.** `KPI` ×4 (`ui-shared:53`); `SH` (section header); `BarChart`/`PieChart`/`LineChart` (Recharts) com `ReferenceLine y=60` (limiar crítico); `Bar_` (saúde); `Badge`/`SevBadge`; `IBtn` (Atualizar/Download); `TT_` (tooltip); `usePageChrome` (breadcrumb `Operação › Dashboard`); derivações de `derive.ts` (`statusCounts`, `fleetAvailability`, `alertsByDay`, `severityDistribution`, `fleetHealthTrend`) e `recommendationsFor`.
5. **Dados exibidos.** Faixa de 4 KPIs: **Ativos Monitorados** (`views.length` + nº plantas) · **Alertas Críticos** (`open.filter(sev==="critico")`) · **Disponibilidade Média** (`fleetAvailability` — **heurística por status** `AVAIL`, não medição) · **Manutenções Pendentes** (`recommendationsFor`, urgentes = `pri==="Alta"`). Histórico de Alertas 7d (barras empilhadas por severidade); Distribuição (donut por severidade, só abertos); Tendência de Saúde 30d (Saúde Real `steel` **reconstruída** + Projeção IA tracejada, ambas do motor); Alertas Recentes (4 mais novos); Ativos que Requerem Atenção (4 cards com `status !== normal`).
6. **Ações do usuário.** Exportar alertas CSV (`downloadCSV`, funciona); abrir alerta → `/alertas/:id`; "Ver todos" → `/alertas`; abrir ativo → `/ativos/:id/overview`; hover nos gráficos (tooltip). **Mortas:** "Atualizar" (`IBtn` sem `onClick`); clique no KPI (`cursor-default`, sem navegação).
7. **Conexões com outras telas.** → Alertas (B2/B3/B5 são funis); → Ativos (B6 + KPI "Ativos Monitorados"); → Telemetria/Gêmeo (indireto via ativo); ← entrada via Login. Sem link hoje para Mapa/Hierarquia nem Dicionário (oportunidades).
8. **Relação com governança.** Breadcrumb `Operação › Dashboard` é o ponto de ancoragem na Matriz, mas **ignora o escopo hierárquico** do usuário (agrega sempre a frota inteira — fere navegação governada). Números **derivam** do Dicionário (severidade = leitura×faixa×limite; saúde = `damage`) mas o rastreio não é exposto. **Rota sem `Gate`** → `Dashboard: none` (Operador) vaza por URL. Disponibilidade + Projeção IA precisam de **nota de honestidade** (heurística/modelo simulado).
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** KPIs clicáveis + micro-link "origem" (popover campo/unidade/faixa/limite do Dicionário); envolver `/dashboard` (e `/operacional`, `/mapa`) em `<Gate modulo="Dashboard">`.
   - **[P0]** Honestidade da IA: banda de confiança + horizonte ("+7d") + variável dominante (`worstMode`) + nota "modelo simulado, não treinado em falhas reais" na Projeção IA; tooltip de proveniência no KPI Disponibilidade (estimativa nominal por status).
   - **[P1]** Remover/ressignificar "Atualizar" morto (indicador "atualizado há Xs" + pausa de `settings.paused`); rotular "Saúde Real" como reconstrução de modelo (estilo distinto do futuro projetado, marcador vertical em `off=0`); estados loading/empty/error.
   - **[P1]** Presets de layout por papel (US-1): Técnico vê B5/B6 no topo, Cliente só disponibilidade+saúde simplificadas, Gestor mantém o atual; adaptar blocos à modularidade (`store.modules`).
   - **[P2]** Atalhos respeitando RBAC do destino (`useCan`); escopo hierárquico nas derivações; alinhar taxonomia de severidade entre barra (3 categorias) e pizza (4); elevar B6 ("Ativos que Requerem Atenção") para logo após os KPIs quando houver críticos.

---

### Painel Operacional

> Spec-fonte: `docs/design/telas/02-painel-operacional.md` e `docs/design/02-acesso-operacao.md` (Tela 3) · código real: `src/pages/Painel.tsx` (rota `/operacional`).

1. **Objetivo.** *War room* ao vivo da frota — o monitor de turno deixado aberto no telão. Não é o dashboard analítico (tela 01): é o **monitor de estado de 1ª classe, granular por ativo**, otimizado para responder *"o que exige minha ação agora?"* em <5s.
2. **Perfil principal.** **Técnico de manutenção** (persona-âncora — vigília de turno em pé diante de um telão: alto contraste, números grandes, zero rolagem). Secundários: Gestor (priorização macro), Usuário cliente (seus ativos, US-2), Admin Forzy (diagnóstico), TI/Governança (frescura/conectividade).
3. **User stories atendidas.** US-7 (leitura atual no card + clique → histórico) · US-4 parcial (temp/vib/press — **faltam corrente A e RPM**) · US-2 (status em PT-BR, cards autocontidos) · US-1 (módulo gated por RBAC) · US-9/US-10 (status crítico/atenção deriva do motor; é o ponto de entrada para a predição detalhada).
4. **Componentes principais.** Barra de status ao vivo (dot pulsante + 4 contadores Rajdhani + relógio `simClock`); faixa de filtros (busca `Search` + chips de tipo `TYPE_FILTERS`); grid `grid-cols-5` de cards-botão de ativo (id mono · dot de status com glow · nome/área · `Bar_` de saúde · tríade telemetria · selo `Wifi`/`WifiOff`); `usePageChrome`; `IBtn` (toggle grid/list, "Ao vivo"); fontes `useAssetViews()`/`statusCounts()`.
5. **Dados exibidos.** Contadores Normais/Atenção/Críticos/Offline (`statusCounts`); timestamp da frota; por card: id, nome/área, saúde % (`twin.health`), temperatura (°C), vibração (mm/s), pressão (bar) — **sem unidade visível hoje**; conectividade. **Não exibidos (refinar):** corrente (A)/RPM (US-4), RUL/`modoCritico`, frescura `syncedAt`.
6. **Ações do usuário.** Filtrar por texto (`nome`/`id`); filtrar por tipo (chips); abrir ativo → `/ativos/:id/overview`. **Quebradas/ausentes:** toggle grid/**list** (estado existe, `list` não renderiza — controle morto); "Ao vivo" (`IBtn` sem handler); contadores de status não-clicáveis; sem filtro por área/hierarquia; sem ação rápida (ver alerta / assistente).
7. **Conexões com outras telas.** → Visão Geral do ativo (destino do clique, salto frota→ativo); ↔ Dashboard (complementar — Dashboard agrega, Painel granulariza); ↔ Mapa/Gêmeo (mesmo átomo `<AssetCard>` a extrair, dot de status idêntico); → Alertas e → Assistente (atalhos por ativo a adicionar, US-12).
8. **Relação com governança.** Breadcrumb e conjunto de ativos devem refletir o **escopo de hierarquia** do usuário (hoje fixo/frota inteira); cada micro-leitura deve **rastrear ao Dicionário** (unidade/faixa/limite/direção) e colorir ao se aproximar do limite — `twin.status` já nasce dessas bandas, falta tornar visível. **Inconsistência:** Painel depende do módulo `Dashboard` na Sidebar, mas é a tela mais útil ao Operador (que tem `Ativos:read`, não `Dashboard`) — deveria depender de `Ativos`. Offline ≠ não-comissionado (D-I-C-I). Ao trazer RUL ao card, aplicar nota de honestidade.
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** Triagem: o grid renderiza na **ordem do seed** — ordenar por severidade + `rulDias` asc e adicionar faixa de prioridade fixa (1–3 piores); tornar os 4 contadores de status **botões-filtro**; implementar o **modo List** (tabela densa) que hoje é controle morto.
   - **[P0]** Mudar o módulo de visibilidade do Painel de `Dashboard` → `Ativos` (acesso do Operador/Técnico); honestidade de tempo real: refletir `settings.paused` ("Pausado" em vez de "Transmissão ao vivo") e dar ação real ao `IBtn "Ao vivo"`.
   - **[P1]** Completar US-4 (corrente A + RPM, com unidades); colorir números por banda do Dicionário; expor frescura "há Ns" (`syncedAt`) e esmaecer cards *stale*; estado visual próprio para artefatos pré-comissionamento (D/I) distinto de offline.
   - **[P2]** Grid responsivo (`auto-fill, minmax`) + sparkline inline (US-7 sem clique); extrair `<AssetCard>` compartilhado e usar `corDoStatus` de `theme.ts`; ações rápidas no card ("Ver alertas"/"Perguntar à IA") gated por `useCan`.

---

### Lista de Ativos

> Spec-fonte: `docs/design/telas/03-lista-ativos.md` e `docs/design/03-trilha-do-ativo.md` (Tela 4) · código real: `src/pages/AtivosLista.tsx`.

1. **Objetivo.** Tela-índice da frota (`/ativos`): a **central de triagem** — encontrar o ativo certo dentro da hierarquia (planta→área→sistema), priorizá-lo por saúde/criticidade/RUL, ler seu estado sem abrir o detalhe e descer ao gêmeo digital em um clique. Deve ser **navegação governada** (o que aparece/ordena/permite é função de papel + hierarquia).
2. **Perfil principal.** **Técnico de manutenção** (localiza o ativo da OS, ordena por saúde para atacar o pior). Secundários: Gestor (distribuição por área, exporta CSV, ordena por criticidade×RUL), Usuário cliente (só ativos da sua planta, US-2), Admin Forzy (cria/edita, valida pós-OCR), TI/Governança (audita coerência ativo↔hierarquia↔dicionário).
3. **User stories atendidas.** US-7 (saúde atual + status ao vivo, trampolim p/ histórico) · US-13 (gated/filtrada por RBAC + hierarquia) · US-2 (densidade controlada, busca direta) · US-3 ("Última Leitura"/"ao vivo") · suporte US-10/US-11 (RUL na ordenação → fila de manutenção).
4. **Componentes principais.** `usePageChrome` + ações ("Exportar" CSV, "Novo Ativo" gated por `useCan("Cadastro","full")`); `<input>` de busca; 3 `<select>` de status (**decorativos**, `.slice(0,3)`, sem `value`/`onChange`); botão "Filtros" `SlidersHorizontal` (**inerte**); `<table>` 8 colunas zebra/hover/clique-na-linha; `Badge`, `Bar_`; botões de linha `Eye`/`MoreHorizontal` (**sem `onClick`**); paginação `[1,2,3,…,12]` (**estática, fake**); `useAssetViews()`; `downloadCSV`.
5. **Dados exibidos.** Por linha: **Tag** (`a.id` mono steel) · **Nome/Tipo** · **Área/Planta** · **Status** (`twin.status` band) · **Saúde** (`twin.health` + `Bar_`) · **Criticidade** · **Última Leitura** ("ao vivo"/Offline). **Calculados mas não exibidos (refinar):** `rulDias`, `modoCritico`/`worstMode`, `cargaPct`, `residual`, nameplate (kW/RPM/série — só vai no CSV).
6. **Ações do usuário.** Buscar (funcional, só `nome`/`id` — placeholder promete "área"); abrir ativo (clique na linha → overview); exportar CSV (funcional, mas exporta `views` cru ignorando filtro); "Novo Ativo" (gated). **Inexistentes/quebradas:** filtrar por status (selects decorativos), filtrar por hierarquia, ordenar, paginação real, menu de linha.
7. **Conexões com outras telas.** → Detalhe do ativo (overview e suas 5 abas); ← Dashboard (drill-down "ver críticos"); → Cadastro/OCR ("Novo Ativo"); ↔ Alertas (menu de linha → filtrado por `assetId`); ↔ Assistente (US-12); ↔ Mapa (mesma frota, visão espacial); ↔ Governança › Hierarquia (os filtros planta/área/sistema **são** a Matriz projetada).
8. **Relação com governança.** Tag/Área/Planta são nós da árvore empresa→planta→área→sistema→ativo; lista visível deve ser **recortada pela hierarquia do papel**. Status e Saúde **derivam** dos limites do Dicionário (não são crus). "Novo Ativo" já gated; exportação e ações de linha devem respeitar `Ativos`/`Cadastro`. Cada ativo tem ciclo D-I-C-I (indicador de estágio por linha). RUL/modo vêm de modelo **simulado** → marcar como estimativa.
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** Transformar os 3 `<select>` decorativos em **filtros reais e hierárquicos** (planta→área→sistema encadeados, default = hierarquia do papel) + chips multi-seleção de status/criticidade + drawer de "Filtros" com contador; **surfacer RUL e Modo Crítico** (estender `AssetView`, hoje descarta `twin.rulDias`/`twin.modoCritico`) — é o que vira fila de manutenção (US-10/11); **ordenação real** (`<thead>` clicável, default saúde asc).
   - **[P1]** Paginação funcional ou virtualização (a fake `[…,12]` é ficção — `data.map` já mostra todos); ligar `Eye`/`MoreHorizontal` (menu de ações rápidas com `stopPropagation`); visão em cards default para o Cliente (US-2); empty-state da busca + mensagem honesta de recorte de hierarquia.
   - **[P2]** Indicador de estágio D-I-C-I + idade de `syncedAt` por linha; exportação coerente com a visão filtrada/ordenada (hoje exporta `views` inteiro).

---

### Detalhe — Visão Geral

> Spec-fonte: `docs/design/telas/04-ativo-visao-geral.md` e `docs/design/03-trilha-do-ativo.md` (Tela 5 + Header/Abas) · código real: `src/pages/AtivoDetail.tsx` (cabeçalho + abas), `src/pages/ativo/Overview.tsx`.

1. **Objetivo.** Resumo executivo de 5s de um ativo — responder, sem rolagem, *qual a saúde agora? quanto tempo tenho? o que faço a seguir?* — e servir de **átrio de navegação** para as abas profundas. Esta spec cobre **cabeçalho persistente + aba Overview** como unidade (no produto nunca aparecem separados).
2. **Perfil principal.** **Técnico de manutenção** (persona dominante — abre o ativo a partir de alerta/lista, lê saúde/RUL, decide a trilha). Secundários: Gestor (disponibilidade/criticidade para priorizar US-11), Usuário cliente (visão amigável US-2), Admin Forzy (coerência twin↔cadastro), TI/Governança (rastreabilidade número→Dicionário).
3. **User stories atendidas.** US-7 (núcleo: 4 leituras ao vivo + sparkline 72 amostras) · US-2 (score de saúde com rótulo verbal) · US-4 (°C/A/mm/s/bar) · US-8/9/10/11 (átrio: resume e linka baseline/anomalia/parada/manutenção; "Próximas Ações" é a face de US-11) · US-12 (`IBtn` Assistente → `/assistente/:id`) · US-13 (tela governada).
4. **Componentes principais.** `AtivoDetail` (resolve `asset`/`twin`, monta cabeçalho + 5 abas `NavLink`, provê `AtivoCtx` via `Outlet`); `useAtivo()`; `Badge`/`SevBadge`; `SH`; `TT_`; `IBtn` (Assistente/Alertas/OS); `AreaChart` (sparkline temp) + `RadarChart` (5 modos de falha); `recommendationsFor`; `toChartData`; `usePageChrome`.
5. **Dados exibidos.** Cabeçalho: nome/TAG/tipo/local, `Badge` status, ao-vivo/offline + 3 KPIs (Saúde `twin.health` · Próx. Manut. `recommendationsFor[0].prazoDias` · **Disponibilidade — mapa estático `AVAIL`, não rastreado**). Overview: 4 cards de leitura (temp/vib/press/corrente com pulso por limite `limOf`), sparkline temp (72 amostras), alerta aberto do ativo (condicional), Score de Saúde 52px + radar dos 5 modos, até 3 Próximas Ações.
6. **Ações do usuário.** Trocar de aba (`NavLink` → overview/telemetria/saude/gemeo/tecnico); abrir Assistente; abrir Alertas; "Ver alerta" → `/alertas/:id`. **Mortas:** "Ordem de Serviço" (`IBtn` Wrench sem handler); "Próximas Ações" **sem CTA** (decorativa).
7. **Conexões com outras telas.** ← Lista de Ativos (entrada via `/ativos/:id`); abas-irmãs (Telemetria, Saúde & IA, Gêmeo, Técnico); → Alertas (card + `IBtn`, alertas têm `origem` regra/modelo/manual); → Assistente (US-12); ↔ Mapa/Hierarquia (breadcrumb).
8. **Relação com governança.** Breadcrumb `["Ativos","Lista de Ativos",asset.id]` é o fio da Matriz — falta expandir à cadeia completa planta→área→sistema. Cada leitura rastreia a um `Tag` (campo/unidade/faixa/limite/direção via `limOf` + override `asset.limites`) — **refinar para clicável**. **RBAC ausente nas ações** (`IBtn`/aba não checam `can`) — ponto P0 de governança. D-I-C-I não exposto (vive em Dados Técnicos). Saúde/RUL/ações vêm de modelo **simulado** — deve estar visível.
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** KPI "Disponib." é **mentira de governança** (mapa estático, não rastreável) — derivar de uptime/MTBF real ou rotular como estimativa e tirar do trio; carregar o **padrão único de IA** (confiança + horizonte + nota) em Saúde e Próx. Manut., com RUL em janela P10–P90; tornar "Próximas Ações" **acionável** (badge `pri`, `motivo` em tooltip, botões "Registrar manutenção" gated `Ativos:full` + "Criar OS") fechando US-11; **gatear todas as ações por `useCan`** (OS, "Ver alerta").
   - **[P1]** Cabeçalho como "barra de comando" hierárquica (identidade em linha 1, KPIs como *stat strip* com micro-rótulo de fonte, `modoCritico` visível); cards de leitura com 3º estado vermelho (atenção vs crítico) e limite no hover; sparkline multivariável/seletor de tag (hoje só temp); wrapper `<AtivoTab>`/`<TwinGate>` único para guard de twin e malha consistente entre abas.
   - **[P2]** Empty-state estruturado para offline/sem-twin (preserva cabeçalho + último valor + trilha de diagnóstico); chip de `origem` rastreável no alerta do ativo; selo D-I-C-I no cabeçalho.

---

### Detalhe — Telemetria

> Spec-fonte: `docs/design/telas/05-ativo-telemetria.md` e `docs/design/03-trilha-do-ativo.md` (Tela 6) · código real: `src/pages/ativo/Telemetria.tsx`, `src/lib/telemetry.ts`.

1. **Objetivo.** Leitura **forense da grandeza física no tempo** (`/ativos/:id/telemetria`) — onde técnico e gestor confirmam *o que o sensor mediu, em que faixa, contra qual limite e qual baseline*, com rastreabilidade total ao Dicionário. É a **camada de evidência** auditável que sustenta as predições da aba Saúde & IA.
2. **Perfil principal.** **Técnico de manutenção** (persona-âncora — investiga *por que* o ativo degradou: cruza pico de vibração com subida de temperatura, valida transiente vs tendência). Secundários: Gestor (tendência 7d/30d, exporta CSV), Usuário cliente (leitura amigável escopada), Admin Forzy (valida ingestão US-3), TI/Governança (audita rastreabilidade dado↔Dicionário).
3. **User stories atendidas.** US-4 (núcleo — grandezas físicas; hoje plota 3 de 6: temp/vib/corrente) · US-7 (histórico por janela + min/max/avg; **falta o valor atual** `twin.state[key]`) · US-3 (`twin.history` + `windowSamples` + export raw) · US-8 (gancho de overlay de baseline) · US-13 (limites rastreiam ao Dicionário via `critOf`).
4. **Componentes principais.** Seletor de janela (`1h·6h·24h·7d·30d`, default `24h`, botões inline a unificar em `SegmentedControl`); `IBtn` (CSV; **Refresh sem handler**); 3 cards `AreaChart` (`isAnimationActive={false}`); `ReferenceLine` (hoje só limite crítico); `TT_`; `stats()`/`windowSamples()`/`toChartData()` (já carrega as 6 grandezas); `downloadCSV` (já com 6 grandezas); `critOf()` (override `asset.limites[key].critico` → fallback Dicionário).
5. **Dados exibidos.** Janela ativa; amostras janeladas; série por grandeza (3 de 6); Mín/Máx/Média (`stats`); limite crítico (`ReferenceLine`). **Ausentes (refinar):** valor atual, limite de **atenção** (`tag.limiteAlerta`), faixa operacional (`faixaMin/Max`), direção (`tag.direcao`), sensor de origem (`tag.sensor`), `syncedAt`, baseline esperado (US-8), residual. Unidade hoje é **literal no código**, deve vir do Dicionário (`tag.un`).
6. **Ações do usuário.** Trocar janela (`setRange`); exportar CSV da janela; hover (tooltip valor + hora). **Quebrada:** Refresh (`RefreshCw` sem `onClick`). **A adicionar:** toggles de overlay (Limites/Baseline/Comparar), salto para Saúde & IA da grandeza anômala. Nenhuma ação escreve estado.
7. **Conexões com outras telas.** Irmã de overview/saude/gemeo/tecnico (mesmo `useAtivo()`); → Saúde & IA (consome a mesma série que sustenta baseline/anomalia/RUL — salto bidirecional); ↔ Gêmeo (`residual`/`syncedAt` do mesmo objeto); → Alertas (alertas `origem:"regra"` nascem do cruzamento série×limite plotado); → Dicionário (fonte de un/faixa/limites/direção/sensor); → Assistente (US-12 cita a série como evidência).
8. **Relação com governança.** Breadcrumb + `area — planta` posicionam o ativo na Matriz. **Cada limite plotado deve declarar campo/unidade/faixa/limite/sensor/direção e a proveniência** (override do ativo vs Dicionário — hoje invisível, viola "todo número rastreia"). RBAC: aba + export gated por `can('Telemetria', nivel)`. D-I-C-I: a série é evidência da fase Inspeção. Baseline (US-8), quando sobreposto, deve ostentar nota de honestidade (modelo simulado).
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** Cobrir as **6 grandezas** (adicionar rpm/press/oleo, derivando label/unidade de `TAG_LABEL`/`TAG_UNIT`); mostrar o **valor atual** em cada card (Rajdhani, unidade, cor por banda); plotar **atenção + crítico + faixa** (não só crítico), respeitando `tag.direcao`; **honestidade da janela** (7d/30d só têm ~24h reais via `HISTORY_CAP=288` — avisar ou reconstruir do modelo); gate RBAC.
   - **[P1]** Tira-resumo da janela (nº amostras, cobertura, grandezas em estouro, pior residual); overlay de baseline (US-8) com nota de honestidade; consertar o Refresh (re-sync + `syncedAt`); proveniência do limite no rodapé do card; empty-state por gráfico.
   - **[P2]** Painel de comparação (2 grandezas normalizadas ou 24h vs semana anterior); unificar seletor de janela em `SegmentedControl`; estado vazio inteligente (offline ≠ janela sem dados). **Nota de honestidade de schema:** US-4 cita "V" (tensão), mas `TagKey` não tem canal de tensão — a tela cobre A/RPM/°C + vib/press/óleo e deixa tensão como lacuna explícita, não afirmação falsa.

---

### Detalhe — Saúde & IA

> Spec-fonte: `docs/design/telas/06-ativo-saude-ia.md` e `docs/design/03-trilha-do-ativo.md` (Tela 7) · código real: `src/pages/ativo/SaudeIA.tsx`, `src/engine/prediction.ts`.

1. **Objetivo.** Converter degradação em **decisão de manutenção** — quando vai falhar, por quê, e o que fazer, com um clique para registrar a manutenção. É a face **decisória/sumária** do par cuja face exploratória é o Gêmeo Digital. Onde o gêmeo digital vira prognóstico (score, baseline, prob. por horizonte, RUL, modo dominante, recomendações que escrevem de volta no estado).
2. **Perfil principal.** **Técnico de manutenção** (persona-âncora — lê RUL/modo, aciona "Registrar manutenção" após executar a OS; precisa de `Ativos:full`/write). Secundários: Gestor (prioriza por prob×criticidade, planeja parada US-11), Usuário cliente (transparência, modo leitura sem botões), TI/Governança (audita procedência do número + nota de honestidade), Admin Forzy (valida ficha do modelo).
3. **User stories atendidas.** US-8 (saúde real vs baseline/projeção; `residual` = aderência ao modelo) · US-9 (residual + modos `damage` = anomalias tipadas) · US-10 (núcleo: `computeRUL` + `failureCurve` Weibull β=2.2, prob. por horizonte) · US-11 (`recommendationsFor` + `applyMaintenance`) · US-2/US-13 transversais (nota de honestidade + gating).
4. **Componentes principais.** `SH`, `Bar_` (5 modos), `TT_`; `LineChart`/`Line`/`ReferenceLine` (saúde real `steel` × projeção IA `yellow` tracejada de `runScenario(...,14)`, `ReferenceLine y=50`); banner de severidade (`sevColor` por `prob21`); cartão de recomendação + botão "Registrar manutenção" (`applyMaintenance`); `predictionModel` (`name`/`metodo`); `recommendationsFor`. **A criar:** `ConfidenceTag`, `ExplainabilityList`, `HonestyNote` padronizados em `ui-shared`.
5. **Dados exibidos.** Saúde (`twin.health` via `healthFromDamage`); RUL (`twin.rulDias`, cap `RUL_CAP=3650`); Prob. falha 21d (`twin.probFalha[21]`); modo crítico (`worstMode`); dano por modo (`twin.damage[m]`, cada um mapeia a uma TAG via `TAG_OF_MODE`); residual; variáveis (temp/vib/press/corrente/rpm/oleo); ficha do modelo (`predictionModel.name`/`.metodo`, sync/inferência); **nota de honestidade** ("modelo simulado físico-informado, não treinado em falhas reais"). **Lacuna:** cada número deveria carregar visualmente sua faixa/limite do Dicionário.
6. **Ações do usuário.** **Registrar manutenção** (`applyMaintenance(asset.id, modo)` → dano do modo cai a ~8%, óleo→100 se lubrificação, recalcula health/status/`modoCritico`, `syncedAt=simClock`, toast); inspecionar curva (hover). **A criar:** alternar horizonte (7/14/21/30/60 via `HORIZONS`); "Planejar parada"/OS (botão OS hoje placeholder); "Explicar no Assistente" (US-12).
7. **Conexões com outras telas.** ↔ Gêmeo Digital (irmã exploratória — simulador "E se…", Δ-RUL pré-calculado `recEffect`, sobreposição de recomendações/ficha a fatorar); → Telemetria (fonte das variáveis raw; anomalia deve linkar à série-fonte); → Visão Geral/Técnico (placa/OCR/D-I-C-I); → Alertas (`IBtn` no header; recs de alta prioridade deveriam virar alertas); → Assistente (US-12); ↔ Mapa/Hierarquia (breadcrumb).
8. **Relação com governança.** Predição só mostrada para ativos visíveis ao papel/hierarquia. Motor já consome `dictionary` (`computeRUL`, `pressAlertThreshold`) — a UI deve **expor** o vínculo. **RBAC:** `applyMaintenance` é **escrita** e precisa de `can('Ativos','full')` — hoje **não gateado** (risco). D-I-C-I: registrar manutenção é evento de Inspeção/Comissionamento e deveria gravar artefato auditável (quem/quando/modo/RUL antes-depois). Honestidade: nota de B6 é requisito de governança de IA — replicar em cada output, com `name`/`metodo` de `predictionModel` (sobrevive à troca pela interface `PredictionModel`).
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** Padronizar o **cartão de output de IA** (valor + horizonte + **CONFIANÇA** + **EXPLICAÇÃO** + **HONESTIDADE**) — falta o campo CONFIANÇA: derivar honestamente de `twin.residual` (residual baixo ⇒ alta aderência) + dispersão Weibull; promover o **horizonte a controle** (hoje "21d" hardcoded, reusar `HORIZONS`); **gatear "Registrar manutenção"** por `Ativos:full` (em `read`, chip "somente leitura").
   - **[P1]** Bloco próprio para Baseline (US-8: score + banda esperada por variável via `readingFromState`) e Anomalia (US-9: variável de maior desvio → modo provável → confiança); trazer o **Δ-RUL pré-calculado** para as recomendações ("+N dias de RUL"); B1 como grade dos 5 horizontes (`twin.probFalha`) com `ReferenceLine` na linha de falha (saúde→0), não 50%.
   - **[P2]** Rastreio ao Dicionário em hover (popover de procedência); conectar B4 ao fluxo de OS + ciclo D-I-C-I (artefato auditável, não mutação silenciosa); "Explicar no Assistente" no modo crítico; **fatorar componentes compartilhados** com o Gêmeo (`<RecommendationCard>`, `<ModelCard>`, `<HonestyNote>`) para o padrão único.

---

### Detalhe — Dados Técnicos

> Spec-fonte: `docs/design/telas/07-ativo-tecnico.md` e `docs/design/03-trilha-do-ativo.md` (Tela 8) · código real: `src/pages/ativo/Tecnico.tsx`, origem em `src/store/createAsset.ts`.

1. **Objetivo.** A **ficha de identidade física estática** do ativo — a "certidão de nascimento"/placa digital rastreável. Ser a fonte de verdade do nameplate e o **ponto de auditoria** onde cada dado técnico responde: *de onde veio? (manual/OCR/sistema) · a que regra do Dicionário se ancora? · em que fase D-I-C-I está?* Diferente das outras 4 abas, consome o `Asset` estático (não o twin vivo).
2. **Perfil principal.** **TI/Governança** (persona-alvo — audita procedência, ancoragem ao Dicionário e estágio D-I-C-I). Secundários: Técnico (confere fabricante/modelo/série antes de pedir peça), Admin Forzy (corrige nameplate, reprocessa OCR, edita `asset.limites`), Gestor (conferência rápida), Usuário cliente (transparência do próprio equipamento).
3. **User stories atendidas.** US-5 (destino de leitura do que o OCR capturou — fabricante/modelo/série/potência/rotação; refinar p/ exibir procedência + confiança `f.confidence`) · US-13 (cada linha vira dado rastreável: ancora ao Dicionário, gating de edição, ciclo D-I-C-I) · US-4 (declara grandezas instrumentadas — hoje fixas) · US-3 (cabeçalho de identidade do dado raw histórico).
4. **Componentes principais.** `SH` (com slot `right` p/ badges de origem + botão Editar gated); `Badge` (selos D-I-C-I e status do sensor); linha k/v mono (extrair p/ `<SpecRow label value origin? dictLink?>`); chips de sensor (parametrizar por `TagKey`); `fmtDate`; `IBtn` (Editar placa/Reprocessar OCR/Exportar ficha — **novos**); `useCan`/`usePermLevel` (**hoje ausentes** — aba sem gating); `useAtivo()`; `dictionary`/`dici` do store (novo consumo).
5. **Dados exibidos.** Identificação real (`id`, `nome`, `tipo`, `serie`, `fabricante`, `modelo`, `criticidade`, `instaladoEm`); Dados Técnicos (mistura real `potenciaKw`/`rpmNominal`/FLA derivada com **hard-coded** `"IP55"`, `"380V / 60Hz"`, `"Monitorado"`); Sensores Instalados (**4 sensores fixos no JSX** — PT100/MEMS/4-20mA/TC, não vêm do `Asset`/dicionário). **Não persistidos/exibidos:** procedência (manual/OCR), `ocrConfianca`, `criadoEm`, tensão (OCR captura mas descarta), status de sensor ao vivo, linha D-I-C-I do ativo.
6. **Ações do usuário.** Hoje **100% leitura, sem nenhum gating**. **A adicionar (gated):** copiar Tag/Série (livre); Editar placa (`Ativos:full`); Reprocessar OCR/ver imagem (`OCR:full`); Editar limites por ativo (`Ativos:full`); Avançar status D-I-C-I (`Governança:full`, reusa `cycle`/`NEXT` de `DICI.tsx`); Exportar ficha CSV/PDF.
7. **Conexões com outras telas.** Âncora de identidade das 4 abas-irmãs (o `id`/`tipo` definem quais `Tag`s e limites se aplicam); ← Cadastro Manual e OCR (telas de origem, ambas chamam `createAsset` — destino auditável, link "reprocessar/editar"); → Dicionário (cada grandeza/limite linka à `Tag`); → Matriz D-I-C-I (projeção filtrada por `asset.id`); → Hierarquia (breadcrumb); ← Mapa (seleção pode abrir direto nesta aba).
8. **Relação com governança.** Materializa as 4 colunas da espinha: **Hierarquia** (breadcrumb + `area`/`planta`), **Dicionário** (todo número técnico rastreia a uma `Tag`; mostrar override por ativo vs padrão), **RBAC** (leitura p/ todos com `Ativos:read`; escrita gated — hoje **zero** chamadas a `rbac.ts`, destoa do resto do produto), **D-I-C-I** (ciclo visível no contexto do ativo, não só na matriz global). Honestidade de **origem** (manual/OCR/padrão + confiança) é a aplicação do princípio de honestidade na camada de cadastro.
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** Separar **dado real de dado fabricado** (estender `Asset` com `tensao`/`frequencia`/`classeProtecao`; o OCR já captura `tensao` mas descarta; onde faltar, `—` + micro-tag "não informado", nunca placeholder convincente — veneno para a persona Governança); **persistir e exibir a procedência** (`origem: manual|ocr|sistema` + `ocrConfianca`, faixa de procedência no topo); **corrigir a FLA** (hoje engenharia reversa `limites.corrente.alerta/1.05` — exibir `flaFromKw(potenciaKw)` direto e os limites ancorados ao Dicionário).
   - **[P1]** Sensores **derivados do Dicionário** (`Tag.ativo` casando com `asset.tipo`, cruzado com `twin.state`/`syncedAt` p/ selo online/stale), não array literal; trazer a **linha D-I-C-I do ativo** inline (4 selos `Badge`, edição gated); introduzir **ações + gating** no header da aba (a aba não tem nenhum RBAC hoje).
   - **[P2]** Hierarquia visual (Tag/Série/Criticidade como cabeçalho de identidade destacado, placa por blocos Elétrico/Mecânico/Proteção); link "→ Dicionário" + selo "override por ativo" por grandeza; estado vazio honesto com CTA gated ("Completar placa"/"Ler placa por OCR").

---

### Gêmeo Digital

> Spec-fonte: `docs/design/03-trilha-do-ativo.md` (seção "Gêmeo Digital — a peça central da trilha") · código real: `src/pages/ativo/GemeoDigital.tsx`, `src/engine/simulation.ts`.

1. **Objetivo.** A **réplica viva** do ativo (`/ativos/:id/gemeo`): comparar físico × esperado, projetar a vida útil e responder *"e se eu mudar carga/ambiente/fizer manutenção agora?"* sem tocar a produção. É a face **exploratória** do par cuja face decisória é Saúde & IA, e o artefato digital navegável de US-6.
2. **Perfil principal.** **Gestor industrial** e **Eng. de Confiabilidade** (donos da exploração de cenários — decisão de produção pico-vs-parar). Secundários: Técnico (lê o "parar agora", simulador em leitura), Usuário cliente/Analista (leem curvas), Admin Forzy (valida ficha do modelo). O simulador é **headless e não-persistente** (`runScenario` num `clone`) — seguro para qualquer leitor; só "Registrar manutenção" muda o gêmeo real e precisa de gate.
3. **User stories atendidas.** US-6 (o gêmeo é o artefato digital navegável) · US-8 (baseline esperado via `readingFromState`) · US-9 (residual = anomalia) · US-10 (RUL + data de falha + gauge Weibull `failureProb`) · US-11 (simular manutenção + Δ-RUL + registrar) · US-13 (ficha do modelo = governança da IA).
4. **Componentes principais.** Digital Thread (2 painéis "Motor Real (medido)" `twin.state` × "Gêmeo (esperado)" `readingFromState`, **residual** colorido); Vida Útil & Predição (RUL 44px + gauge `PieChart` `failureProb(rul, gaugeH)`, horizontes 7/14/21/30/60); Modos de Falha (ranking por `twin.damage[m]`, cores `MODE_COLOR`); Curva de Degradação (`LineChart` por modo + `ReferenceLine y=100` "Falha"); Simulador "E se…" (sliders carga/ambiente/horizonte + select manutenção + presets, overlay `base`×`cenario`, 3 KPIs, resumo PT-BR `summary`); Recomendações com `recEffect(modo)` (Δ-RUL) + botão Registrar; Ficha do Modelo + nota de honestidade.
5. **Dados exibidos.** Medido vs esperado por grandeza; **residual** (verde/âmbar/vermelho) como sinal de anomalia/qualidade do gêmeo; RUL + `dataFalhaMs`; prob. de falha por horizonte; contribuição % por modo; curva de degradação por modo; resultado do cenário (base × cenário, Δ-RUL); `predictionModel.*`; nota de honestidade completa (menciona a interface `PredictionModel` plugável).
6. **Ações do usuário.** Ajustar sliders de carga/ambiente/horizonte (recomputa `userScenario` memo + resumo PT-BR — feedback imediato, não-persistente); selecionar manutenção/presets; alternar horizonte do gauge; **Registrar manutenção** (`applyMaintenance` → toast "saúde e RUL recalculados ao vivo"). Offline → early-return "gêmeo digital sem sincronismo ao vivo".
7. **Conexões com outras telas.** Irmã de overview/telemetria/saude/tecnico (mesmo `useAtivo()`); ↔ Saúde & IA (sobreposição de recomendações/ficha/Δ-RUL a fatorar — Gêmeo explora, Saúde decide); → Telemetria (`residual`/`syncedAt` do mesmo objeto); → ação de chrome "Ordem de Serviço" (salvar cenário como plano → OS, laço a fechar); ↔ Mapa/Hierarquia (breadcrumb).
8. **Relação com governança.** Curva por modo mapeia a `TAG_OF_MODE` → Dicionário. O **residual** é a métrica auditável de qualidade do gêmeo. Simulador não-persistente = **segurança por design** (qualquer leitor explora sem efeito colateral). Só **Registrar manutenção** (escrita) precisa de `can('Ativos','full')` — hoje **não gateado**. Ficha do Modelo + nota de honestidade são o padrão de governança de IA, aqui em sua forma mais completa.
9. **Observações de UX/UI e refinamentos.**
   - **[P0]** Promover **residual → CONFIANÇA** explícita (também no gauge: "prob 21d · confiança média"), unificando o padrão único de IA em toda a trilha; **gatear "Registrar manutenção"** por `Ativos:full`, mantendo o simulador livre para leitores.
   - **[P1]** Memoizar `recEffect(modo)` (hoje roda `runScenario` por recomendação a cada render — custo); persistir/exportar um cenário ("salvar plano") para virar Ordem de Serviço, fechando o laço com a ação de chrome.
   - **[P2]** Banda de incerteza na curva de degradação conforme a confiança; fatorar `<RecommendationCard>`/`<ModelCard>`/`<HonestyNote>` compartilhados com Saúde & IA (hoje duplicados com pequenas divergências — ex.: a nota de honestidade do Gêmeo cita a interface `PredictionModel`, a de Saúde não).


### Parte B — Alertas · Assistente · Cadastro e Digitalização · Administrativas

### Lista de Alertas

> Fonte: `docs/design/telas/08-alertas-lista.md` · `docs/design/05-alertas.md` · arquivo real `src/pages/AlertasLista.tsx` + `src/engine/simulation.ts` (`evaluateAlerts`).

1. **Nome** — Lista de Alertas. Fila operacional única de eventos que exigem atenção humana, consolidando três origens heterogêneas no modelo comum `Alert`: **regra** (limite do Dicionário rompido), **modelo** (projeção do gêmeo) e **manual** (registro humano). Breadcrumb `Alertas › Lista de Alertas`. É a bancada de triagem entre monitoramento (Dashboard/Telemetria) e ação corretiva (Detalhe, Assistente, Ativo).
2. **Objetivo** — JÁ EXISTE: 4 KPIs vivos (Total/Críticos/Altos/Médios sobre `status !== "resolvido"`), busca textual, filtros de severidade+status, tabela densa de 7 colunas ordenada por `criadoEm` desc, ações inline Ver/Resolver (gated `useCan("Alertas","full")`), criação manual `ALT-{ano}-{seq}` e export CSV. A inteligência de fila mora no motor (`evaluateAlerts`: dedup, auto-resolução, auto-escalada, snooze 24h). REFINAR: elevar de "listar e resolver" para "priorizar com contexto e despachar", tornando visíveis **origem** e flag `managed` (hoje ausentes na UI), ativando o status `em_analise` (morto), traduzindo a mecânica do motor em feedback legível e abrindo a ponte **Investigar com Assistente** (US-12).
3. **Perfil** — Técnico de Manutenção (persona-foco, `full`); Gestor Industrial (carga/SLA, `full`/`read`); Cliente (`read`); Admin Forzy (cross-cliente, valida motor); TI/Governança (audita rastreabilidade, `read`).
4. **User stories** — US-9 (alertas `origem:"modelo"` de `prob21>0.6 && rulDias<60`); US-12 (ponte de investigação — REFINAR); US-3/US-4 (`tag` + valor vs. limite com unidade); US-7 (link ao histórico); US-10/US-11 (RUL → agendar manutenção); US-13 (RBAC + rastreabilidade alerta→Dicionário).
5. **Blocos** — B1 page chrome (Exportar/Novo alerta); B2 faixa de 4 KPIs; B3 formulário inline de novo alerta (gated); B4 barra de filtros; B5 tabela densa clicável. Refino: B2.5 segmentação por origem/SLA + tabela agrupável (severidade/ativo/origem).
6. **Componentes** — `SevBadge`, `Badge` (variante âmbar p/ `em_analise`), `IBtn`, KPI cards (→ tornar filtros clicáveis), tabela inline, `downloadCSV`, `toast`. Novos: `OrigemBadge` (regra steel / modelo cobalto / manual slate + sufixo "auto") e microlinha de confiança preditiva.
7. **Dados** — ID, Título, Ativo (`assetId`+`nomeOf`), Tipo, Severidade, Status, Data/Hora; ausentes hoje na UI mas presentes no dado: **Origem** (`a.origem`), **`a.managed`**, **`a.tag`** (ex.: `vib 7,2 mm/s`), confiança do modelo (`twin.probFalha[21]`, `twin.rulDias`). KPI "Médios" agrega médio+baixo (documentar).
8. **Ações** — Buscar/Filtrar (livre); Abrir detalhe (`read`); Resolver `resolveAlert` (`full`); Criar manual `addAlert` (`full`); Exportar (corrigir p/ exportar `filtered`). Novas (`full`): Investigar (Assistente), Atribuir responsável (→ `em_analise`), Snooze manual; chip Origem e KPI-como-filtro (livre).
9. **Relação com telas** — Detalhe do Alerta (destino de toda linha); Ativo/Gêmeo (crítico-preditivo); Telemetria (ver no gráfico); Dashboard (espelha contagem); Assistente (contexto `{assetId, tag, modoCritico, severidade}`); Dicionário (origem regra); Cadastro/Manutenção (US-11).
10. **Governança** — Filtrar fila por hierarquia do papel; rastreabilidade alerta `regra`→`Tag` (campo/un/faixa/limite/direção/sensor); RBAC já gateia escrita; ciclo do ativo distingue alerta em comissionamento; **nota de honestidade** obrigatória nos alertas `modelo` (valor+janela+confiança+modo+nota de modelo simulado físico-informado/Weibull, `prediction.ts`) — sem isso a fila mistura fato medido com projeção.

---

### Detalhe do Alerta

> Fonte: `docs/design/telas/09-alerta-detalhe.md` · `docs/design/05-alertas.md` · arquivo real `src/pages/AlertaDetalhe.tsx` · rota `/alertas/:id`.

1. **Nome** — Detalhe do Alerta. Página de "pronto-atendimento" de um evento individual; destino de toda navegação a partir de Lista, Dashboard, Mapa e qualquer `SevBadge`. Cruza o `Alert` com seu `Asset` e seu `AssetTwin`, expondo **contexto + origem rastreada + evidência + ciclo de vida + ações**. É onde o evento bruto vira decisão.
2. **Objetivo** — JÁ EXISTE: layout 2/3 + 1/3 com header tintado por severidade, grade Detalhes, mini-gráfico "Telemetria em Torno do Alerta" (`AreaChart` sobre `twin.history.slice(-40)`), Linha do Tempo, card Ativo Relacionado, Ações Rápidas e comentário (gated `full`); ações `ackAlert/resolveAlert/reopenAlert` no chrome, gated. RAso/REFINAR: origem é só texto (`ORIGEM_METODO`) sem âncora real ao Dicionário nem padrão de IA; gráfico não marca limite nem instante do disparo; timeline é **fabricada com offsets fixos** (`+3000`, `+9min`); "Criar OS" e comentário são placeholders; falta breadcrumb hierárquico e nota de honestidade. Alvo: virar **estação de decisão governada**.
3. **Perfil** — Técnico (primária, `full`); Gestor (`full`); TI/Governança (audita origem→Dicionário e integridade do ciclo); Cliente (`read` — `canWrite` oculta header de ações, comentário e ações `write`); Admin Forzy. Gating real: `const canWrite = useCan("Alertas","full")`.
4. **User stories** — US-9 (núcleo quando `origem:"modelo"`: RUL+prob21+modo); US-12 ("Abrir no Assistente IA" → `/assistente/:assetId`); US-7 (mini-gráfico de evidência); US-13 (gating + rastreabilidade de ciclo); tangencia US-4 (`al.tag`→série) e US-10/11 ("Criar OS").
5. **Blocos** — B1 chrome (Reconhecer/Reabrir/Resolver); B2 header card; B3 Detalhes (raso); B4 Telemetria em torno (sem limite/marcador); B5 Linha do Tempo (sintética); B6 Ativo Relacionado; B7 Ações Rápidas (OS placeholder); B8 Comentário (não persiste). Novos: **B9 Origem & Rastreabilidade (Dicionário)** para regra, **B10 Predição & Honestidade** para modelo, **B11 D-I-C-I do ativo**.
6. **Componentes** — `SH` (slot "ver no Dicionário"), `SevBadge`/`Badge`, `Bar_`, `IBtn`, `AreaChart` (+ `ReferenceLine` limite e `ReferenceDot` disparo), `TT_`, `usePageChrome`, `toChartData`, `useCan`, `ack/resolve/reopen`. Novos: `DiciTraceCard` (lê `Tag` por `al.tag`) e `PredictionPanel` (consome `twin.rulDias/probFalha/modoCritico`).
7. **Dados** — Título/descrição, Severidade, Status, ID, Ativo (→ Hierarquia), Tipo, Data/Hora (`simClock`), Método/Origem (→ B9 ou B10), Tag disparadora, Evidência (`twin.history`), **Limite alerta/crítico** (`asset.limites ?? tag.limiteAlerta/Critico`), faixa/unidade/direção/sensor (→ Dicionário), saúde/sync do twin, **RUL/prob21/modo** (modelo SIMULADO — nota de honestidade), responsável.
8. **Ações** — Reconhecer (`ackAlert` → `em_analise`), Resolver (`resolveAlert` + `resolvidoEm`), Reabrir, Criar OS (placeholder → fluxo US-11), Abrir no Assistente, Ver Histórico (`/ativos/:id/telemetria`), Escalar, Falso Positivo, abrir ativo, Comentar (→ persistir em `eventos[]`). Tudo `Alertas:full`.
9. **Relação com telas** — ← Lista (08), Dashboard (02), Mapa (13); → Ativo Overview (10, bidirecional), Telemetria (11), Assistente (12, transportar `alertId`), OS futura (US-11), ↔ Dicionário (B9 linka à `Tag`).
10. **Governança** — Breadcrumb deve materializar hierarquia real (`asset.planta/area`); B9 expõe proveniência do limite violado; RBAC estendido a "Criar OS"; B11 mostra D-I-C-I do ativo; B10 expõe padrão único de IA + nota de honestidade do modelo físico-informado/Weibull simulado. Refino-chave: gráfico que **prova** o disparo (P0), `DiciTraceCard` (P0), `PredictionPanel` (P0), timeline real persistida em `eventos[]` (P1).

---

### Assistente conversacional

> Fonte: `docs/design/telas/10-assistente-conversacional.md` · `docs/design/06-assistente-ia.md` · arquivos reais `src/pages/Assistente.tsx`, `src/ai/assistant.ts`, `src/ai/tools.ts`.

1. **Nome** — Assistente conversacional (Assistente Técnico Predicta). Chat operacional com *tool use* sobre gêmeo digital, alertas, telemetria e simulação. Rotas `/assistente` (frota) e `/assistente/:assetId` (contextual), ambas resolvidas por `Assistente.tsx`. Cobre US-12.
2. **Objetivo** — JÁ EXISTE (assistente real, não mock): `runTurn()` posta no proxy seguro `/api/assistant` via `streamAssistant()`, faz **streaming** token-a-token e roda **loop de tool use cliente-lado** (`depth<5`) executando `executeTool()` contra store/engine vivos. Cinco ferramentas: `get_twin_state`, `list_alerts`, `run_whatif` (`runScenario`, efêmero), `create_work_order` (cria alerta via `addAlert`), `get_fleet_summary`. `buildSystem()` injeta `simClock`, contexto do ativo/frota e **já declara a nota de honestidade** ("modelo simulado, não treinado em falhas reais"). REFINAR: elevar output de prosa `**bold**` a **cards tipados** (predição/what-if/OS) e fechar a lacuna mais grave — o assistente **lê e age sem nenhum gate de RBAC**.
3. **Perfil** — Primário: Técnico (`full`) e Gestor (`full`). Analista só consulta (`read`, sem `create_work_order`); Operador `none` (não deveria abrir). Secundários: Cliente (US-2, escopo da hierarquia) e Admin Forzy (auditoria). TI/Governança define o RBAC.
4. **User stories** — US-12 (núcleo, `create_work_order`); US-2 (PT-BR); US-7 (`get_twin_state` em vez de inventar); US-8 (baseline indireto); US-9 (`probFalha`/`modoCritico`); US-10/11 (`run_whatif` + OS); US-13 (parcial — RBAC existe mas `executeTool` não chama `can()`).
5. **Blocos** — B1 chrome/topbar (breadcrumb + chip Contexto + Nova conversa); B2 thread (bolhas user/ai/tool); B3 indicador "Analisando…"; B4 chips de sugestão (estáticos → dinâmicos+gated); B5 composer; B6 painel de contexto lateral (só com `:assetId`); B7 (novo) faixa de honestidade persistente.
6. **Componentes** — `streamAssistant()` (SSE), `runTurn()` (→ extrair p/ `useAssistantTurn`), `ASSISTANT_TOOLS`+`executeTool()` (inserir gate RBAC + envelope de confiança), `runScenario()`, `useStore`, `usePageChrome`, `Bubble`/render markdown (→ markdown completo + `<AssistantCard>`), `IBtn`/`Badge`, `AbortController` (botão "Parar"), cards laterais.
7. **Dados** — Saúde, Status, RUL, modo dominante, prob21 (só via tool hoje → expor como confiança/horizonte em card), leituras de sensores (unidades do Dicionário US-4), resumo de frota, alertas, cenário what-if (→ card comparativo base×cenário), OS criada (→ card com link `/alertas/:id`), `simClock`, nota de honestidade (string fixa no system → selo de UI).
8. **Ações** — Enviar/chip (`can("Assistente","read")` p/ abrir tela); `get_twin_state`/`list_alerts`/`run_whatif`/`get_fleet_summary` (leitura — gates a aplicar); **Criar OS** (`addAlert`, muta estado real — exige `can("Alertas","full")`, hoje sem gate); Nova conversa; Cancelar (botão "Parar").
9. **Relação com telas** — Entrada contextual a partir de Detalhe do Ativo, Gêmeo, Alertas (herda ativo no snapshot); saídas deep-linkam à tela canônica (predição→Saúde IA, telemetria→Telemetria, what-if→Gêmeo, OS→`/alertas/:id`); `run_whatif` usa o mesmo `runScenario` do Gêmeo; `create_work_order` escreve no mesmo store de Alertas.
10. **Governança** — Breadcrumb → trilha de hierarquia real; `get_fleet_summary`/`list_alerts` filtrados pela hierarquia do usuário; todo número rastreável ao Dicionário; **RBAC (lacuna crítica P0)**: rota não está em `<Gate>`, `executeTool` não chama `can()` — refino: `<Gate modulo="Assistente">` + gate por ferramenta + recusa honesta; padrão único de confiança/honestidade estruturado em todo output ML. P0: gate RBAC, cards tipados, selo de honestidade persistente.

---

### Assistente com contexto do ativo

> Fonte: `docs/design/telas/11-assistente-contexto-ativo.md` · arquivo real `src/pages/Assistente.tsx` (mesmo componente; modo contextual via `const ctx = !!asset;`).

1. **Nome** — Assistente Técnico — Modo Contextual (Ativo em Foco). Rota `/assistente/:assetId` (ex.: `/assistente/BCP-01`). **Não é tela nova**: mesmo componente, diferenciado em runtime por `ctx`. No chrome surge título `Contexto: BCP-01` + chip cobalto `Cpu Contexto: {id}` só quando `ctx` é verdadeiro.
2. **Objetivo** — JÁ EXISTE: ao abrir com `:assetId`, (1) injeta o **snapshot do twin** no system via `get_twin_state` (em vez do resumo de frota), (2) saudação com ID/nome/RUL/modo dominante, (3) troca as 4 sugestões para causa-raiz/solução ("Qual a causa provável...", "Simular impacto da parada", "Plano de manutenção", "Gerar ordem de serviço"), (4) renderiza **painel lateral de contexto** (`w-56`) com KPIs do twin + alertas abertos. Motor de tool use idêntico ao modo frota. Objetivo: copiloto de **causa-raiz e decisão de manutenção** sobre o equipamento específico (US-12 ∩ US-9).
3. **Perfil** — Técnico (alvo principal, chega via alerta/ativo: causa provável → plano → OS); Gestor (avalia impacto via `run_whatif`); Cliente (US-2, "este equipamento está bem?"); Admin Forzy (valida disclaimer); TI/Governança (audita escopo do snapshot). Lacuna: `Assistente.tsx` não chama `useCan("Assistente")` nem `useCan("Alertas","full")` antes de `create_work_order`.
4. **User stories** — US-12 (núcleo); US-9 (interseção forte — snapshot injeta `modoCritico`/`probFalha21d`/`residual`); US-10/11 (`run_whatif` + `create_work_order`); US-7 (valores no painel/snapshot); US-2 (linguagem natural sem TAG); US-8 (`residual` = desvio do baseline).
5. **Blocos** — Layout 2 colunas; a coluna direita **existe só aqui** (`{ctx && twin && (...)}`). B1 chrome + chip; B2 chat (saudação/placeholder/sugestões mudam); B2.3 chips causa-raiz/solução; B2.4 placeholder `Pergunte sobre BCP-01...`; **B3 painel de contexto** (B3.1 KPIs do twin; B3.2 até 4 alertas abertos do ativo).
6. **Componentes** — `Assistente` (export único), `useParams().assetId`, `buildSystem()` (ramo `if(asset&&twin)` injeta snapshot), `streamAssistant`/`ChatMessage`, `ASSISTANT_TOOLS`/`executeTool`, `runScenario`, `IBtn` (Nova conversa mantém contexto), chip `Cpu`, cards do painel, `FAILURE_MODE_LABEL`.
7. **Dados** — Duas superfícies que **divergem**: painel visível (ID/nome, Saúde, Status, RUL, **só 2 leituras**: Temp+Vibração, alertas) vs. snapshot do LLM (`get_twin_state`: id/tipo/criticidade, saude/status/rul, `modoCritico` e `probFalha21d` só no snapshot, `cargaPct`, **6 leituras** temp/vib/press/corrente/rpm/oleo). Achado-chave: usuário vê menos do que o modelo "sabe"; disclaimer só no system prompt (L53); campos do painel hardcoded `[label,value,color]` sem rastreio ao Dicionário.
8. **Ações** — Perguntar (texto/sugestão); Causa-raiz (lê `modoCritico`+`leituras`+`residual`); Simular parada (`run_whatif`, não muta); Plano de manutenção; **Gerar OS** (`create_work_order` cria alerta — deveria exigir `Alertas:full`); Nova conversa (mantém ativo); Abortar. Nenhuma gated por RBAC hoje.
9. **Relação com telas** — Entrada canônica é a transição contextual: Detalhe do Ativo/Gêmeo ("Assistente" → `/assistente/{id}`), Alertas ("Investigar com Assistente" → `/assistente/{alert.assetId}`), Telemetria, Dashboard/Mapa. Saídas: `create_work_order` reaparece em Alertas e no card B3.2; `run_whatif` espelha o Gêmeo sem persistir. Achado: a **volta** chat→ativo não tem âncora (ID/alertas do painel são texto, não links).
10. **Governança** — Breadcrumb deve herdar a cadeia da hierarquia; KPIs do painel devem rastrear ao Dicionário (tooltip campo/unidade/faixa/limite/direção/sensor); gatear tela + `create_work_order` por RBAC; expor estágio D-I-C-I; `get_twin_state` deve respeitar escopo do papel; tornar o disclaimer de modelo simulado visível na UI. P0: disclaimer visível, painel = output completo de US-9 (`probFalha21d`+`modoCritico` em destaque), gatear OS por RBAC.

---

### Cadastro Manual

> Fonte: `docs/design/telas/12-cadastro-manual.md` · `docs/design/04-onboarding-ativo.md` · arquivos reais `src/pages/CadastroManual.tsx`, `src/store/createAsset.ts`, `src/data/seed.ts`.

1. **Nome** — Cadastro Manual de Ativo ("Novo Ativo", rota `/cadastro`, módulo RBAC `Cadastro`). Stepper de 5 etapas (Identificação → Localização → Dados Técnicos → Sensores → Revisão) que materializa um novo ativo: cria `Asset`, provisiona **gêmeo saudável** (`buildHealthyTwin`), roda **predição inicial** (`predict`) e abre o ciclo D-I-C-I. Porta de entrada manual; irmã da tela OCR via `createAsset` compartilhado.
2. **Objetivo** — JÁ EXISTE (funcional): `react-hook-form`, stepper `useState(step)`, validação de obrigatórios, **TAG única** (`validate: !assetIdExists`, case-insensitive), submit → `createAsset()` que normaliza TAG, deriva limites de corrente via `flaFromKw` (alerta `FLA×1.05`, crítico `FLA×1.18`), monta `Asset`, constrói gêmeo saudável (damage 0.02, ~120 amostras), roda `predict()`, faz `addAsset` e navega a `/ativos/:id/overview`. Rota gated por `Gate modulo="Cadastro"`. Três gaps reais: hierarquia é **texto livre** (`planta`/`area` sem ligação ao `HTREE`); etapa **Sensores é decorativa** (não persiste); **D-I-C-I não é iniciado**.
3. **Perfil** — Eng. de Confiabilidade (primária, `Cadastro:full`); Gestor Industrial (`full`); Admin Forzy/TI (onboarding, padronização); Técnico/Operador (`Cadastro:none` — sem acesso, consomem o ativo pronto); Cliente (read-only). Sidebar oculta + `Gate` na rota.
4. **User stories** — US-3 (semeia ~120 amostras via `buildHealthyTwin`→`readingFromState`); US-13 (rota gated + TAG única + limites derivados, não digitados); US-1 (3 modos compartilham `createAsset`); US-4 parcial (potência/RPM + sensores °C/mm/s/bar — hoje decorativo); US-8/9/10 (predição inicial popula `rulDias`/`probFalha`/`modoCritico`).
5. **Blocos** — A stepper de 5 etapas; B painel do formulário (B1 Identificação; B2 Localização — **dois inputs texto livre**, refino crítico; B3 Dados Técnicos; B4 Sensores — não persiste; B5 Revisão — 8 campos via `watch`); C coluna lateral (Dica de TAG + atalho OCR); D barra de ações (Cancelar/Voltar/Continuar/Cadastrar).
6. **Componentes** — `useForm<FormData>`, stepper (`STEPS`/`step`), `FIELD_STEP` (cobre só passos 1-2), `lbl()`, `SH`, `useCreateAsset()`→`createAsset()`, `assetIdExists`, `flaFromKw`, `buildHealthyTwin`, `predict`, `usePageChrome`, `toast`, `Gate modulo="Cadastro"`.
7. **Dados** — TAG(→upper, único), nome, tipo, criticidade (default Média), fabricante/modelo/série, `instaladoEm`, `planta`/`area` (texto livre — **deveriam ligar ao HTREE**), `potenciaKw`, `rpmNominal`, sensores (3 cards — não persistem). Derivados não exibidos: `limites.corrente` (`flaFromKw`), gêmeo health/status/damage, `rulDias`/`probFalha`/`modoCritico`. Revisão omite RPM/série/data/hierarquia/limites.
8. **Ações** — Avançar/Voltar/Saltar etapa (sem validação por etapa); validar TAG única; **Cadastrar Ativo** (`createAsset`→`addAsset`→`predict`→navega+toast); erro → volta ao 1º erro (`FIELD_STEP`); Cancelar (→`/ativos`, sem confirmação); Usar OCR; sensores on/off (decorativos).
9. **Relação com telas** — OCR (`/cadastro/ocr`, mesmo `createAsset`, handoff de dados inexistente hoje); Detalhe do Ativo (destino pós-cadastro); Lista de Ativos (origem/destino do Cancelar); Saúde-IA (consome `predict`); Governança › Hierarquia (fonte do `HTREE`), Dicionário (sensores/limites), DICI (deve receber nova `DiciRow`); Dashboard/Mapa (passa a contar o ativo).
10. **Governança** — RBAC (`Gate`+sidebar); **Matriz de Hierarquia** (ativo deveria nascer pendurado num nó do `HTREE` — `planta`/`area` strings soltas são a maior dívida); Dicionário (limites de `flaFromKw`, sensores → `SEED_DICTIONARY`); ciclo D-I-C-I (cadastro = "Desenho", mas não cria `DiciRow`); honestidade (predição inicial de modelo simulado — nota na revisão). P0: vínculo à Hierarquia (selects encadeados Empresa→Planta→Área→Sistema) e iniciar D-I-C-I em `createAsset`.

---

### Cadastro por OCR da placa

> Fonte: `docs/design/telas/13-cadastro-ocr.md` · `docs/design/04-onboarding-ativo.md` · arquivos reais `src/pages/CadastroOCR.tsx`, `src/ai/ocr.ts`, `src/store/createAsset.ts`.

1. **Nome** — Cadastro de Ativo por Imagem da Placa (rota `/cadastro/ocr`, módulo RBAC `OCR`). Breadcrumb `Cadastro › Leitura OCR`. Code-split via `lazy()` (puxa `tesseract.js` WASM + idiomas `por+eng`), carregado sob `Suspense`.
2. **Objetivo** — JÁ EXISTE: **OCR real client-side** (não mock). Usuário arrasta/seleciona foto, `runOCR()` executa `Tesseract.recognize(image, "por+eng")` emitindo progresso, `parseNameplate()` extrai 8 campos possíveis (fabricante/modelo/série/potência/rotação/tensão/corrente/IP) com **confiança por campo** (média das words sobrepostas, clamp 60–99). Campos auto-preenchem o form, marcados com borda verde + badge `Bot OCR` (rastreados em `Set auto`); "Cadastrar Ativo" → `createAsset()`. REFINAR: o OCR é **acelerador, não fonte de verdade** — hoje a confiança é exibida mas **não bloqueia** o cadastro (gap principal a endurecer, US-5).
3. **Perfil** — Admin Forzy (primária, onboarding em lote na implantação, `OCR:full`); Técnico (campo, foto pelo celular, `full`); Gestor (`read`/`full`); TI/Governança (audita extração, `read`); Cliente (`none`/`read`). Gated por `<Gate modulo="OCR">`.
4. **User stories** — US-5 (núcleo, tela-âncora); US-3 parcial (imagem + `result.raw` = dado raw); US-1 parcial ("Formulário completo" → `/cadastro`); US-2 parcial (reduz digitação); US-13 (gated por RBAC + Hierarquia/D-I-C-I).
5. **Blocos** — `grid grid-cols-2`: esquerda = captura+extração (B1 dropzone+preview+overlay; B2 barra de progresso; B3 banner de status; B4 Campos Detectados com confiança %), direita = formulário (B5 form de 12 inputs, OCR marcados com borda verde+badge; B6 barra de ações). Refino: fundir B3+B4 num painel "Resultado da Leitura" com aplicação inline por campo.
6. **Componentes** — `runOCR(file,onProgress)`, `parseNameplate(text,words)`→`NameplateResult`, `conf(match)` (fallback 82, clamp 60–99), `BRANDS[]` (20 fabricantes), `useCreateAsset()`/`createAsset()`, `assetIdExists`, `fieldRow(label,key,opts)` (badge `Bot OCR`+borda verde se `auto.has(key)`), `SH`/`Badge`, `toast`, `flaFromKw`/`predict`/`buildHealthyTwin`.
7. **Dados** — preview (`createObjectURL`), progresso (`m.progress`), 8 campos OCR + confiança por campo + confiança média (`overallConfidence`), criticidade (input). **Rastreabilidade crítica:** `potenciaKw`→`flaFromKw`→`limites.corrente.alerta/critico`, logo **um número OCR de baixa confiança propaga direto para os limites de alerta** — reforça a necessidade de validação humana.
8. **Ações** — Selecionar/arrastar imagem (jpg/png/webp ≤10MB); acompanhar OCR; revisar/editar campos; trocar criticidade; **Cadastrar Ativo** (valida só TAG+único); ir ao Formulário completo (não migra dados extraídos hoje).
9. **Relação com telas** — `/cadastro` (irmã, `createAsset` compartilhado, sem transportar campos); `/ativos/:id/overview` (destino pós-cadastro); Telemetria/Saúde-IA/Gêmeo (ativo flui no motor); Governança › Hierarquia/Dicionário/DICI (`planta`/`area` ainda texto livre); Sidebar/RBAC.
10. **Governança** — Rota gated; cadastrar deveria exigir `OCR:full` explícito no botão; Hierarquia (ancorar `planta`/`area`); Dicionário (`tensao`/`corrente`/`rpm`/`potencia` são tags — número OCR de potência vira limite, deve rastrear unidade/faixa antes); D-I-C-I (OCR = evento de Instalação, inicializar `DiciRow` D=aprovado/I=pendente); **nota de honestidade** distinta: confiança é **qualidade de leitura OCR, não de predição** — campos <90% exigem confirmação humana. P0: gate de validação por confiança antes de salvar (campos <90% "a confirmar", botão bloqueado) + ancorar Planta/Área na Hierarquia.

---

### Mapa Digital da Planta

> Fonte: `docs/design/telas/14-mapa-planta.md` · arquivo real `src/pages/MapaPlanta.tsx` · derivados `src/store/derive.ts`.

1. **Nome** — Mapa Digital da Planta ("Planta Norte · Vista Superior"). Breadcrumb `Ativos › Mapa da Planta`. Materialização espacial do gêmeo digital da frota: a planta baixa vira **artefato navegável** onde cada área/ativo carrega o status vivo do twin. É onde a Matriz de Hierarquia ganha representação geográfica. Cobre US-6 e US-13.
2. **Objetivo** — JÁ EXISTE: SVG `viewBox="0 0 660 350"` com grid técnico + vinheta cobalto; **6 áreas hard-coded** (`areas`) e **8 marcadores hard-coded** (`apos`); cor do marcador vem do status real (`statusById` via `useAssetViews()`→`derive.ts`), paleta `sc`; borda da área escala o **pior status interno** (`hasCrit`/`hasAtt`); clique no marcador → `/ativos/{id}/overview`, clique na área só seleciona (`setSel`, não filtra). Painel direito: card Resumo (`statusCounts`) + card Ativos (lista clicável). Chrome: `IBtn` Filtrar (sem handler) + Exportar (CSV funcional). REFINAR: elevar de "ilustração com bolinhas" para **camada espacial canônica do gêmeo**.
3. **Perfil** — Técnico (âncora, "onde no chão está o vermelho", `read`/`full`); Gestor (leitura macro/concentração de risco); Cliente (US-2 simplificada, `read`); Admin Forzy (QA do layout vs. cadastro); TI/Governança (audita mapa↔Hierarquia↔Dicionário). Hoje `useAssetViews()` retorna a frota inteira; refino deve escopar à subárvore do papel.
4. **User stories** — US-6 (planta baixa→navegável, parcial — layout hard-coded); US-13 (REFINAR — sem `useCan('Mapa')`); US-2 (status por cor); US-7 (marcador→overview); US-1 (módulo independente); US-9/10 (cor = anomalia/risco do twin, sem confiança ainda).
5. **Blocos** — `grid grid-cols-4`: canvas `col-span-3`, painel `col-span-1`. B1 chrome (Filtrar inerte + Exportar); B2 canvas SVG (grid, 6 áreas, 8 marcadores, "N ↑"); B3 legenda de status (→ filtros); B4 card Resumo (`statusCounts` → filtros); B5 card Ativos (lista); **B6 painel de detalhe da área/ativo — NÃO EXISTE** (`sel` só realça borda).
6. **Componentes** — `MapaPlanta` (page, precisa `useCan('Mapa')`+escopo), `useAssetViews()` (fonte única de status, aceitar filtro por subárvore), `statusCounts()`, `SH` (legenda vira controle), `IBtn` (Filtrar precisa handler), `downloadCSV` (gate `Mapa:read`), `C`/`theme` (`sc` deve ser single-source com Alertas/Dashboard), `<svg>` inline (extrair `<PlantCanvas>`), `useNavigate` (+ deep-link `?area=`), `SevBadge`/`Badge` (ausentes — usar no B6).
7. **Dados** — status do ativo (cor do marcador, `twin.status`→`sc`), status agregado da área (cor da borda, pior caso), TAG, nome, área (**hoje desacoplada** — `areas` literal, não de `Asset.area`/`HNode`), contadores, saúde % (no CSV, **não no canvas**), "N ↑". Faltam exibir e existem no twin: `rulDias`, `modoCritico`, `probFalha`, `residual` — material do tooltip/B6 e do PADRÃO ÚNICO DE IA.
8. **Ações** — Selecionar área (`setSel` → só realça; deve abrir B6 e filtrar); abrir ativo (mapa/lista → overview); Exportar CSV (**falta gate** → `can('Mapa','read')`); Filtrar (**sem handler** → painel de camadas); toggle status pela legenda (inexistente → filtro); zoom/pan (inexistente).
9. **Relação com telas** — Ativo › Overview (destino primário do marcador/lista); Dashboard (irmão, compartilha `useAssetViews`/`statusCounts`, mapa = drill espacial); Alertas (proposto bidirecional — área crítica → alertas); Hierarquia/Governança (a árvore `HNode` deve **gerar** as camadas/escopo — hoje desacoplado); Cadastro (origem de `Asset.area`); OCR/planta baixa US-6 (fonte ideal do layout hoje literal).
10. **Governança** — Espinha mais fraca (US-13 = REFINAR): layout deve derivar da Hierarquia (cada área = `HNode`, ativos = subárvore autorizada ao papel); Dicionário (cores traduzem limites `Tag.limiteAlerta/Critico`, B6 mostra o rastreio TAG/limite/sensor); **RBAC lacuna crítica** (página não chama `useCan('Mapa')` — gatear render + Exportar); D-I-C-I (ativo em Desenho/Instalação sem twin → marcador "fantasma" tracejado, evita falso "tudo verde"); honestidade (status vem de motor simulado — nota no rodapé). P0: gatear+escopar por RBAC/Hierarquia; derivar layout da Hierarquia (eliminar drift mapa↔cadastro: canvas itera sobre ativos da área, não 8 literais).

---

### Configurações

> Fonte: arquivo real `src/pages/Configuracoes.tsx` (rota administrativa: sessão/papel, simulação, reset). Sem spec dedicada na 1ª rodada.

1. **Nome** — Configurações (breadcrumb `Sistema › Configurações`). Painel administrativo de demonstração que controla o **motor de simulação**, o **ambiente** (temperatura), o **reset de dados** e a **sessão/papel** (switcher de RBAC). Layout `grid grid-cols-2 max-w-4xl` com 4 cards (Motor de Simulação, Ambiente, Dados, Sessão & Papel full-width).
2. **Objetivo** — JÁ EXISTE (funcional): Pausar/Retomar (`togglePause`), velocidade 1×/10×/60× (`setSimSpeed`, mostra `minutesPerTick * simSpeed` min/seg), Avançar 7 dias (`advanceDays(7)`), slider de temperatura ambiente −10..+20 °C (`setAmbiente`, afeta envelhecimento térmico), Resetar demonstração (`resetDemo`, recarrega seed do localStorage), trocar papel (`switchRole`, demonstra RBAC ao vivo) e Sair (`logout`→`/login`). REFINAR: a tela é o painel de "deus" da demo — não está envolta em `<Gate>` nem por `useCan`, qualquer sessão controla simulação e troca papel sem trilha de auditoria.
3. **Perfil** — Admin Forzy/TI-Governança (uso pleno: controla simulação, demonstra RBAC trocando papel); demais perfis tipicamente não deveriam pausar o motor nem resetar dados em produção real (em demo, o switcher de papel é a ferramenta-chave de apresentação do RBAC).
4. **User stories** — US-13 (switcher de papel materializa o RBAC ao vivo — trocar papel altera imediatamente módulos visíveis na sidebar e permissões); apoio transversal a US-8/9/10 (Avançar 7 dias acelera a degradação dos gêmeos para demonstrar predição); US-1 (módulo administrativo independente).
5. **Blocos** — B1 Motor de Simulação (estado pausado/relógio `fmtDateTime(simClock)`, Pausar/Retomar, velocidade, Avançar 7 dias); B2 Ambiente (slider de temperatura); B3 Dados (texto sobre persistência localStorage + Resetar); B4 Sessão & Papel (full-width: conectado como `session.nome`/`session.papel`, select de troca de papel, Sair).
6. **Componentes** — `useStore` (settings, simClock, `setSimSpeed`, `togglePause`, `setAmbiente`, `resetDemo`, roles), `useSession`/`switchRole`/`logout` (`@/auth/useAuth`), `advanceDays` (`@/engine/simulation`), `fmtDateTime`, `usePageChrome(["Sistema","Configurações"])`, `SH`, `toast`, ícones lucide (Play/Pause/FastForward/RotateCcw/Activity/Thermometer/User/LogOut).
7. **Dados** — `settings.paused`, `settings.simSpeed` (1/10/60), `settings.minutesPerTick`, `simClock` (relógio simulado), `settings.ambienteDelta` (°C), `session.nome`, `session.papel`, `roles` (lista de papéis). Persistência via localStorage.
8. **Ações** — Pausar/Retomar simulação; selecionar velocidade; Avançar 7 dias (+toast); ajustar temperatura ambiente; Resetar demonstração (destrutivo, +toast, **sem confirmação**); trocar papel (+toast, recarrega RBAC); Sair (`logout`→`/login`). Hoje **nenhuma ação é gated nem auditada**.
9. **Relação com telas** — Login (destino do Sair); toda a sidebar/rotas (o switcher de papel altera visibilidade e permissões em todas as telas); todas as telas operacionais e Saúde-IA (Avançar 7 dias e a temperatura ambiente afetam os gêmeos/predições exibidas em Dashboard/Telemetria/Saúde/Mapa/Alertas).
10. **Governança** — Tela administrativa que **deveria** ser a mais governada e hoje é a menos: sem `<Gate>`/`useCan`, ações de controle global (pausar motor, reset destrutivo, trocar papel) ficam abertas. Refino: gatear por papel administrativo, adicionar confirmação ao reset, e **registrar trilha de auditoria** das mudanças de papel/estado (alinhado ao achado transversal de auditoria de ações de governança — `setRbac`/`setDici`/etc. hoje ausentes). O switcher de papel é, ironicamente, a melhor demonstração de US-13 e o melhor exemplo do gap de auditoria.


### Parte C — Governança

### Governança — Visão Geral

1. **Nome:** Governança — Visão Geral · rota `/governanca` · `src/pages/governanca/Overview.tsx` · breadcrumb `Governança › Visão Geral`. É a **tela-âncora** e o hub de navegação governado por papel do subsistema de governança (cockpit executivo). Aprofunda `00-governanca-espinha.md` (Tela 16). Ver `docs/design/governanca/01-visao-geral.md`.
2. **Objetivo:** dar ao Gestor industrial e à TI/Governança um **pulso único** (conformidade documental, hierarquia, permissões, rastreabilidade, cobertura de US) e rotear para os 4 subsistemas + Auditoria + Configurações, com KPIs **derivados do store vivo** — não decorativos.
3. **Perfis (RBAC `Governança`, `Gate` em `routes.tsx:79`):** Gestor industrial / Admin Forzy `full` (vê tudo, card RBAC acionável); TI/Governança `full` (foco Dicionário/Auditoria, sem RBAC); Usuário cliente `read`/proxy Analista; Técnico `none` (módulo oculto no Sidebar, `Gate` "Acesso negado"). Card "Permissões RBAC" **deveria** checar `useCan("RBAC","read")` antes de navegar (hoje gateia só no destino).
4. **User stories:** **US-13 (núcleo)** — vitrine executiva de acessos/dados/rastreabilidade. US-1 (grade de cards = mapa de módulos governados; cards de módulo não contratado → upsell, não link quebrado). US-2 (densidade: leitura do risco documental em <5s). US-3 indireta (conformidade reflete Ciclo do Ativo). Propor card **"Cobertura de US-1…13"** → US-13 auto-rastreável.
5. **Estrutura:** 3 faixas (`Overview.tsx`) + 1 proposta. Faixa 1 — 4 KPIs (Documentos Aprovados `C.green`, Em Revisão `C.yellow`, Pendentes `C.red`, Conformidade Geral `C.steel`), componentes `KPI`/`SH` (`ui-shared`). Faixa 2 — grade 3×2 de cards-portal (Hierarquia · D-I-C-I · Dicionário · RBAC · Rastreabilidade/Auditoria · Configurações). Faixa 3 — "Conformidade por Planta" (barras empilhadas). Faixa 4 (propor) — "Saúde da Governança" derivada (Hierarquia `countByType` · Permissões `full/read/none` + alerta "papel morto" · Rastreabilidade `dictionary.length`).
6. **Dados:** `DiciRow` (`s.dici`, seed `DICI`/`seed.ts:77-84` → 24 células = 6 ativos × 4 fases) alimenta os 4 KPIs; `RbacMatrix` (`s.rbac`/`PERM`), `HNode` (`s.hierarchy`/`HTREE`), `Tag` (`s.dictionary`), `User`/`Session` (proposto "Acessos críticos" = `users.filter(u => can(rbac,u.papel,"RBAC","full"))`). Conformidade Geral = `round(aprovados/total×100)` ≈ **79%** (meta string fixa "95%").
7. **Ações:** drill para cada subsistema (`navigate`), leitura viva dos KPIs (reflete `s.dici` em tempo real). Propor: Exportar pulso (reuso `downloadCSV`), reagir a "papel morto"/acesso crítico. **A tela não muta o store** — é leitura+navegação; toda escrita acontece nos drills (`setDici/setRbac/setHierarchy/upsertTag/removeTag`, `useStore.ts:140-175`), por isso é o lugar certo para **espelhar a trilha de auditoria** dessas escritas.
8. **Relação:** nó-pai do grafo de rastreabilidade US↔módulo↔tela↔sensor↔modelo↔alerta↔ação↔perfil. → Hierarquia (fonte do breadcrumb-matriz), → D-I-C-I (dado vivo bidirecional: ciclar status lá muda KPIs aqui), → Dicionário (limites que alimentam `evaluateAlerts` → origem de cada alerta), → RBAC (gateia Sidebar/rotas/botões). Cadastro/OCR: todo ativo novo **deveria nascer** com linha D-I-C-I `pendente`, fechando o laço cadastro→governança.
9. **Refino — JÁ EXISTE:** KPIs de topo reais e vivos, grade navegável, conformidade derivada. **REFINAR (P0):** derivar "Conformidade por Planta" do real (hoje hardcoded `Overview.tsx:56-59` → cruzar `hierarchy × assets × dici`); card "Auditoria" → rota real `/governanca/auditoria` (hoje placeholder apontando ao Dicionário `Overview.tsx:37`); gatear card RBAC por `useCan("RBAC")`. **P1:** faixa "Cobertura de US", bloco "Saúde da Governança" derivado, KPI "Acessos críticos", criar papéis "Admin Forzy"/"TI/Governança". **P2:** empty-state + meta configurável (`s.settings`), KPIs/barras clicáveis → D-I-C-I filtrado.

---

### Governança — Matriz de Hierarquia

1. **Nome:** Matriz de Hierarquia · rota `/governanca/hierarquia` · `src/pages/governanca/Hierarquia.tsx` · breadcrumb `Governança › Hierarquia`. É a **espinha estrutural do produto** — não organograma decorativo. Fonte `HTREE`/`SEED_HIERARCHY` (`seed.ts:105-121`), tipo `HNode`, estado `s.hierarchy` + `setHierarchy`. Ver `docs/design/governanca/02-matriz-hierarquia.md` (Espinha 1 — "o breadcrumb É a Matriz de Hierarquia").
2. **Objetivo:** manter a árvore canônica **Empresa → Planta → Área → Sistema → Ativo** que dá escopo, contexto e caminho de navegação a todo o produto, com drill-down, painel de metadados do nó e vínculos vivos (clicar leva à operação). Tese: hoje a tela **termina onde a operação começa** — esta etapa a transforma em mapa navegável que leva do nó à decisão.
3. **Perfis (`Governança`):** Admin Forzy / Gestor / TI-Governança `full` (add/rename/remove via hover, `canEdit = useCan("Governança","full")`, `Hierarquia.tsx:34`); Técnico `none` (bloqueado, mas é quem mais se beneficiaria de navegar nó→alerta→ação — propor **modo de navegação operacional em `read`** separando "ler estrutura" de "editar estrutura"); Usuário cliente idealmente `read`.
4. **User stories:** **US-13 (núcleo)** rastreabilidade estrutural + fonte do breadcrumb-matriz; **US-6** (planta baixa→artefato navegável: ativo OCR/cômodo aterrissa como nó via `addChildTo`); US-1 (escopo modular por papel); US-4/US-7 (após extensão: nó Sensor vincula tag do `SEED_DICTIONARY`; escopo herdado do nó define gráficos); US-12 (vínculo "perguntar ao Assistente sobre este nó").
5. **Estrutura:** `grid grid-cols-3` — árvore 2/3 (`HiNode` recursivo, ícone+cor por tipo: Empresa=`steel` · Planta=`cobalt` · Área=`slate` · Sistema=`textSub` · Ativo=`green`) + painel lateral 1/3 (Legenda + Totais `countByType`). **A criar:** 3º bloco — Painel de Metadados do nó (Identidade+`pathToNode` · metadados de ativo via `assetView` · estado vivo do twin · ciclo D-I-C-I `<DiciBadge>` · sensores · alertas · selo de honestidade IA) + faixa de Vínculos (Dashboard/Telemetria/Alertas/Saúde IA/Assistente, cada um gated pelo módulo destino).
6. **Dados:** `HNode { id, l, tp, kids }` (hoje magro). `id` é a **chave de junção** com `Asset`/`AssetTwin`/`Alert`/`DiciRow`/`Tag` (§6.2 do doc-fonte). Gramática proposta de **8 níveis** estendendo `CHILD_TYPE`: Empresa→Planta→Área→**Linha**→**Célula**→Ativo→**Sensor**→**Evento/Alerta** (Sensor sai do `SEED_DICTIONARY`, Evento dos `ALERTS` — sem inventar dados; Linha/Célula opcionais). Métricas: `countByType` (base de contagem do Dashboard), saúde/status do nó via `assetView`.
7. **Ações:** expandir/colapsar (existe), navegar ao ativo (existe, 1 destino `/ativos/:id/overview`), add/rename/remove (existe, gated `full`), adicionar planta (existe). **Inerte:** busca (`Hierarquia.tsx:104`). **A criar:** selecionar nó→metadados, vínculos operacionais, exportar árvore, validação de órfãos no remove. **Lacuna P0:** mutações via `setHierarchy` **não geram trilha de auditoria**.
8. **Relação:** hub estrutural — quase todo módulo a consome. **Breadcrumb de TODO o produto** deve derivar via `pathToNode(hierarchy,id)` (hoje `string[]` estático em `usePageChrome`); Dashboard (`countByType`), Alertas (vínculo do nó), Telemetria (escopo herdado), Dicionário (nó Sensor→tag), D-I-C-I (`<DiciBadge>` fora da Governança), RBAC (escopo proposto herda da árvore), OCR/Cadastro (ativo da placa aterrissa aqui). **Honestidade IA:** RUL/probFalha do nó Ativo carrega selo "modelo de degradação SIMULADO".
9. **Refino — JÁ EXISTE:** árvore editável persistida, 5 níveis, drill-down, folha navega à operação, Totais. **REFINAR (P0):** estender `HTREE` a 8 níveis (Linha/Célula/Sensor/Evento); Painel de Metadados (junção `id` viva, novo `NodeMetaPanel.tsx`); `pathToNode` → breadcrumb-matriz navegável (maior ganho transversal); trilha de auditoria em `setHierarchy`. **P1:** vínculos "clicar leva à operação", busca funcional (filtra+expande), validação de órfãos no remove. **P2:** badges de status no nó (twin), mini-DiciBadge inline, exportar CSV/JSON, empty-state de raiz.

---

### Governança — D-I-C-I

1. **Nome:** **D-I-C-I — Da Leitura à Decisão (Pirâmide DIKW do ativo)** · rota `/governanca/dici` · `src/pages/governanca/DICI.tsx`. **Decisão de produto central:** há **colisão de siglas** — o implementado é o *ciclo documental* (Desenho·Instalação·Comissionamento·Inspeção), o pedido é a *pirâmide DIKW* (Dado→Informação→Conhecimento→Inteligência/Ação). Ver `docs/design/governanca/03-dici.md`.
2. **Objetivo:** tornar **visível e auditável o caminho que cada número percorre** — da leitura crua do sensor até a OS — ancorando cada camada num arquivo/função real. Responde à pergunta que nenhuma tela responde hoje: "a recomendação que aciona um técnico veio de onde, passando por quais transformações, e quem responde por cada salto?". O atual `DICI.tsx` implementa o **ciclo documental**, não o DIKW — este doc **não finge equivalência**: projeta o DIKW e reconcilia ambos como duas visões coexistentes.

   | Camada DIKW | Função real | Saída |
   |---|---|---|
   | **D — Dado** | `readingFromState()` (`model.ts:72`) + tags do Dicionário | `TelemetrySample` raw |
   | **I — Informação** | baseline `baseTemp/Vib/...` (`model.ts:47-61`) + faixa/limite/direção | série + desvio vs. baseline |
   | **C — Conhecimento** | `healthFromDamage`/`worstMode`/`computeRUL`/`failureCurve` (`prediction.ts`) | health, status, RUL, probFalha |
   | **In — Inteligência/Ação** | `recommendationsFor()` (`recommendations.ts:35`) → `applyMaintenance` | Recomendação → OS |

3. **Perfis (`Governança`):** Admin Forzy/Gestor `full` (cicla status + lê fluxo DIKW); Eng. Confiabilidade `read` (foco C→In: RUL/anomalia/recomendação, exporta, não cicla); Analista de Dados `full`/`read` (foco D→I, qualidade/baseline/tags); Técnico/Operador `none` (não veem o módulo, mas recebem o **resultado** — a OS — em Alertas/Ativos). Degradação padrão: `full` edita / `read` selo `Lock` (`disabled={!canEdit}`, `DICI.tsx:81`) / `none` Gate.
4. **User stories:** **US-13 (núcleo)** rastreabilidade dado→decisão + procedência do modelo. US-3 (camada D, origem raw). US-8 (baseline I→C). US-9 (anomalia C = desvio vs. baseline em `damage[mode]`/`health`). US-10 (`computeRUL`/`failureCurve` C→In). US-11 (`recommendationsFor`→`prazoDias`→OS). Suporte US-4 (tags da camada D) e US-12 (Assistente percorre a mesma cadeia).
5. **Estrutura:** **módulo com 2 abas** (segmented control). Aba default **Fluxo (DIKW)** — banner de procedência (selo do modelo), pirâmide horizontal D→I→C→In (cards ligados por `ChevronRight`, cores: D `C.steel`, I `steel→slate`, C `C.yellow`, In `C.cobalt`), seletor de ativo (instancia números vivos do twin), painel de evidência por estágio (entrada→transformação→saída→responsável), trilha "número→regra" ligando ao Dicionário. Aba secundária **Ciclo do Ativo** — a tabela atual `ativo × {D,I,C,In}` de conformidade documental, preservada, banner ajustado para "Desenho · Instalação · Comissionamento · Inspeção".
6. **Dados:** Aba Fluxo — `TelemetrySample`, `Tag`, `AssetTwin`, `Prediction`, `PredictionModel` (a procedência), `Recommendation`, `FailureMode`. Aba Ciclo — `DiciRow {id,nome,D,I,C,In}` (seed `DICI`/`seed.ts:77`), `DiciStatus` (`aprovado|em_revisao|pendente`), 6 ativos (BCP-01, CA-03, ME-07, RV-12, VT-05, TG-01).
7. **Ações:** Fluxo — selecionar ativo, inspecionar estágio (drill), rastrear número até a regra, ver procedência do modelo, saltar para OS. Ciclo — ciclar status (`setDici`, gated `full`, `DICI.tsx:24-27`), exportar CSV (`downloadCSV`).
8. **Relação:** índice executável do motor — cada estágio aponta a um módulo real: D/I → Telemetria (`/ativos/:id/telemetria`), C → Saúde IA (mesmo selo de honestidade), I→C → Alertas (`evaluateAlerts` nasce ao cruzar limite do Dicionário), In → Assistente (mesma fonte `recommendationsFor`). **A aba Ciclo do Ativo é a FONTE dos KPIs de conformidade do Overview** (`dici.flatMap(...)`) — renomear não pode quebrar essa derivação.
9. **Refino — DECISÃO (a mais importante):** "duas visões, um módulo" — **renomear** o implementado para "Ciclo do Ativo" (só rótulo de UI), **promover** a pirâmide DIKW como D-I-C-I oficial, apresentar como 2 abas (default Fluxo). **Risco:** **não** renomear a chave `dici` no store/seed (quebraria `Overview.tsx` e `partialize`) — desambiguação só de rótulo. **P0:** construir aba Fluxo (DIKW) com números vivos (maior ganho US-13, esforço alto); selo de procedência do modelo lendo `predictionModel.name/.metodo` (`prediction.ts:62`, componente compartilhado com Saúde IA); auditar saltos/edições. **P1:** rastreabilidade clicável "número→regra" (`<TraceableValue>`), deep-links operacionais, anexo+responsável+data por célula. **P2:** ativo novo nasce com linha (`D=pendente`), empty-states.

---

### Governança — Dicionário de Rastreabilidade

1. **Nome:** Dicionário de Rastreabilidade · rota `/governanca/dicionario` · `src/pages/governanca/Dicionario.tsx`. O nome já vendido na UI é **promessa que o código ainda não cumpre**: hoje é só dicionário de tags de sensor — o doc trata o nome como roadmap (a tela deve RELACIONAR, não só LISTAR). Ver `docs/design/governanca/04-dicionario-rastreabilidade.md`.
2. **Objetivo:** ser a **matriz de rastreabilidade única** que responde "de onde vem este número, qual sensor o mede, qual limite o governa, qual modelo o usa, qual alerta dispara, qual ação gera, e qual perfil vê/edita?" — fechando a cadeia US↔requisito↔módulo↔tela↔componente↔tag↔modelo↔alerta↔ação↔perfil, com o dicionário de tags como **uma** das entidades.
3. **Perfis (`Governança`):** Admin Forzy/Gestor `full` (edita limites, add/remove tag, exporta); **TI/Governança `full` é a persona-alvo** (audita cadeia dado→decisão); Eng. Confiabilidade `read` (selo `Lock`); Técnico `none`. **Lacuna:** Analista de Dados com `Governança:full` pode editar limites que disparam alertas em produção — RBAC é por módulo inteiro, sem sub-escopo; recomenda-se separar "editar limite" (crítico) de "navegar rastreabilidade" (leitura). **Auto-governança:** quem edita aqui edita a alarmística de todo o produto → a edição precisa ser auditada.
4. **User stories:** **US-13 (núcleo)** matriz de rastreabilidade. **US-4** cada grandeza V/A/RPM/°C como tag canônica (`SEED_DICTIONARY`, `TAG_LABEL`/`TAG_UNIT`). **US-3** esquema do dado raw (faixaMin/Max, tipo). Suporte US-7/8/9 (gráfico/baseline/anomalia referenciam as tags) e US-10/11/12 (coluna Modelo de ML liga tag→modo→predição→ação→sugestão).
5. **Estrutura ATUAL:** breadcrumb + [Nova entrada]/[Exportar]; banner de estado de edição; busca (input **sem filtro**); tabela `SEED_DICTIONARY` (ID Tag · Grandeza · Sensor+unidade · Faixa · Lim.Alerta · Lim.Crítico · Direção · Aplicável a · ✕). **PROPOSTA (3 zonas):** A) filtros de rastreabilidade (entidade · busca funcional · ativo · perfil · origem regra|modelo); B) tabela-matriz com abas-lente (Tags default · Tag→Alerta · Cobertura de US · Modelos de ML · Acesso RBAC); C) painel de relação (mini-grafo/breadcrumb de tag ao clicar a linha).
6. **Dados:** `Tag` (`types.ts:107-120`): `id, key, campo, tipo, un, faixaMin/Max, limiteAlerta` (âmbar), `limiteCritico` (vermelho), `direcao` (acima/abaixo), `ativo`, `sensor` (procedência física). 6 tags do seed: TAG-001 Temperatura/PT100 · TAG-002 Vibração/MEMS · TAG-003 Pressão/4-20mA (abaixo) · TAG-004 Corrente/TC · TAG-005 RPM/Encoder · TAG-006 Óleo/Ultrassônico (abaixo). **Cadeia real tag→modo→alerta** já no código (`TAG_OF_MODE`/`degradation.ts:74`, `RULE_TITLE`/`RULE_TIPO`/`simulation.ts:56-64`): temp→Isolamento/Térmico, vib→Rolamento/Mecânico, etc. **Insight:** Corrente prova a necessidade de rastreabilidade visual — o limite-base genérico (50A) é sobrescrito por `asset.limites?.corrente` escalado ao FLA (`seed.ts:164-167`); sem mostrar o **limite efetivo por ativo**, um auditor conclui erradamente que a Turbina vive em sobrecorrente. Entidades da matriz expandida: US/Requisito (propor `SEED_TRACEABILITY`), Módulo (`MODS` existe), Tela/Componente (a indexar), Modelo (rotular), Perfil (`PERM`).
7. **Ações:** editar `limiteAlerta`/`limiteCritico` (existe, `numField`, **muda alarmística no próximo tick** de `evaluateAlerts` — ação mais sensível, deve ser auditada), editar `direcao`, add/remove tag (`upsertTag`/`removeTag`), exportar CSV. **Inerte:** busca (`:52-56`). **A criar:** drill "tag→alerta", navegar a entidade relacionada, selo de procedência do modelo.
8. **Relação:** **hub de rastreabilidade** — nenhuma outra tela mostra a cadeia inteira. → Motor/Alertas (vínculo mais forte e já implementado: `evaluateAlerts` lê cada `Tag` por tick; editar limite faz nascer/resolver alerta em `/alertas`). → Ativos (limite efetivo = base × override por FLA). → Cadastro/OCR (ativo herda tags por classe). → RBAC (coluna "Perfis que veem/editam" × `PERM`). → Assistente (cita tag+limite como evidência). É o **destino** do `<TraceableValue>` transversal — todo número do produto faz hover/click e abre uma linha desta tela.
9. **Refino — JÁ EXISTE:** tabela funcional acoplada ao motor, edição de limites em tempo real, gating por papel, add/remove+CSV. **REFINAR (P0):** visualizar cadeia tag→alerta (novo `TagTraceCard.tsx` derivando de `RULE_TITLE`/`RULE_TIPO`/`TAG_OF_MODE`); auditar edição de limite (`logAudit` em `upsertTag`/`removeTag`); mostrar **limite efetivo por ativo** (join `dictionary × assets.limites`, resolve o falso-positivo da Corrente). **P1:** busca+filtros funcionais, aba "Cobertura de US" (`SEED_TRACEABILITY`), selo de procedência do modelo, avisar órfãos ao remover tag. **P2:** validação de coerência de limites (`faixaMin ≤ alerta/crítico ≤ faixaMax` + `direcao`), breadcrumb de tag clicável + `<TraceableValue>`.

---

### Governança — Dicionário de Rastreabilidade e Navegação

1. **Nome:** Dicionário de Rastreabilidade e Navegação · rota proposta `/governanca/navegacao` · ícone `Route`/`Workflow`. É a **camada de NAVEGAÇÃO da rastreabilidade** — o grafo real de telas (de `routes.tsx` + `Sidebar.tsx`), a tríade AÇÃO↔MÓDULO↔DADO e o mapa tela×requisito×US, filtrado por RBAC. **Distinção da Tela 04:** a 04 = grafo de **dependência de dado** ("de onde vem este número?"); a 05 = grafo de **fluxo de uso** ("como navego do alerta à ação, e meu papel deixa?"). Ver `docs/design/governanca/05-rastreabilidade-navegacao.md`.
2. **Objetivo:** tornar **explícita, visual e auditável** a malha de navegação — cada rota, cada link do Sidebar, cada `navigate()` — e **quem alcança o quê** pela matriz RBAC, convertendo navegação implícita (espalhada por `<NavLink>`/`<Link>`/`navigate`) em artefato de governança de 1ª classe. **Lacuna central:** não existe representação consolidada do grafo — hoje é preciso *ler o código*.
3. **Perfis (`Governança`):** Admin/TI-Governança `full` (edita/valida grafo, audita arestas, simula percurso, exporta atlas); Gestor `full` (lê alcance por equipe); Analista `full` (rastreia tela↔tag↔alerta, ponte com a Tela 04); Eng. Confiabilidade `read`; Técnico/Operador `none`. Esta tela é o **argumento mais forte para criar o papel "TI/Governança"** — é o painel natural do dono da navegação.
4. **User stories:** **US-13 (central)** rastreabilidade de navegação + navegação governada por RBAC; **US-1** módulos como subgrafos (modularidade visível; módulos none/não contratados apagados = upsell); **US-2** trilhas de ida/volta, atalhos contextuais, ausência de becos sem saída.
5. **Estrutura:** KPIs de navegação (Rotas governadas · Telas alcançáveis pelo papel · Arestas · Cobertura de US). **Grafo nó-aresta** (~60% da tela, clusters coloridos por módulo): nó=tela/rota, aresta=transição carregando o **gatilho** (`Sidebar`/`breadcrumb`/`tab`/`row-click`/`redirect`/`deep-link`), nó inacessível 40% opacidade+`Lock`, nó de entrada anel `C.cobalt`. **Simulador de papel** (§5.3) — troca o papel e re-pinta alcance sem login (replica `permLevel`). **Matriz tela×rota×componente×módulo×Gated×entradas×US** (§5.4, exportável CSV).
6. **Dados:** Rota (`routes.tsx`), Item de nav (`NAV`/`Sidebar.tsx:22-49`), **Aresta** (a criar: `navGraph.edges=[{from,to,trigger,modulo}]`), `RbacMatrix`, Sessão/papel, `permLevel` (`rbac.ts:10`), Breadcrumb (`usePageChrome`), US-1…13, Módulo (`MODS`), badge de alertas (`useOpenAlertCount`). Cada aresta rastreia a uma linha real de `routes.tsx`/`Sidebar.tsx` — a tela **lê o produto**, não inventa fluxo.
7. **Ações:** explorar grafo (drawer do nó: rota/componente/US/arestas), simular papel, ir para a tela (só se o papel atual alcança), filtrar por módulo/US/"só gated", editar/auditar aresta (`full`), exportar atlas, detectar becos sem saída/órfãs, saltar para a Tela 04. Degradação `full`/`read`(`Lock`)/`none`(Gate) idêntica ao resto da Governança.
8. **Relação:** índice de navegação do produto inteiro — toca todos os módulos. Espelho declarativo de Sidebar/AppShell/chrome; consumidor de `permLevel` (mudar célula em `/governanca/rbac` re-pinta o grafo em tempo real); par simbiótico da Tela 04. Desenha e **prova navegável** a "rota de ouro" alerta→detalhe→ativo→Assistente (US-9→US-12). Honestidade IA rotulada no ponto de chegada (nós Saúde IA/Gêmeo).
9. **Refino — JÁ EXISTE (tácito):** rotas declarativas (23), Sidebar governado por RBAC, Gate de rota, breadcrumb (estático), drill-in via `navigate`. **REFINAR (P0):** tornar o grafo **dado de 1ª classe** (`src/data/navGraph.ts` + teste de fumaça rota↔nó); **corrigir landing órfão do Operador Campo** (achado real: `routes.tsx:49` redireciona `/`→`/dashboard` mas `PERM["Operador Campo"].Dashboard==="none"` → helper `firstAllowedRoute`); reconciliar "visível no menu × rota protegida" (`Mapa`/`Telemetria` têm `modulo` no Sidebar mas rota **sem `<Gate>`** — furo de acesso por URL). **P1:** breadcrumb navegável (`BreadcrumbNode[]`), simulador de papel como auditoria exportável, trilha de auditoria de arestas. **P2:** criar papel "TI/Governança" dono da tela, clusters = módulos contratados (upsell).

---

### Governança — RBAC / Permissões

1. **Nome:** Permissões RBAC — Matriz de Controle de Acesso por Papel · rota `/governanca/rbac` · `src/pages/governanca/RBAC.tsx`. É o **Pilar 3 — "Toda ação é gated por RBAC"** em sua tela de administração: enquanto Hierarquia governa a *estrutura*, Dicionário o *dado*, D-I-C-I o *artefato documental*, esta governa o **acesso** — o eixo que decide em tempo real o que cada papel renderiza/edita/navega. Ver `docs/design/governanca/06-rbac-permissoes.md`.
2. **Objetivo:** painel de administração da matriz `papel × módulo` (níveis `none < read < full`), inspeção de usuários por papel e — após refino — auditoria de toda mudança e restrição por escopo (planta/linha/cliente).
3. **Perfis (módulo `RBAC`):** Admin Forzy (a criar) `full` (edita matriz, cria usuários/papéis, define escopos, lê auditoria); Gestor `read` após refino (`full` hoje — rebaixar ao criar Admin); TI/Governança (a criar) `read` (separação de função: TI audita, Admin altera); Eng. Confiabilidade/Técnico/Operador/Analista `none`. **Auto-governança:** só `RBAC:full` edita (`canEdit`, `RBAC.tsx:26`) — impede autoconcessão; Admin Forzy é a persona mais sensível e a 1ª a auditar. **Personas obrigatórias não 1:1 com `ROLES`:** faltam Admin Forzy, TI/Governança, Usuário Cliente — o store lê `roles`/`modules` dinamicamente, então a matriz **cresce sozinha** ao adicionar papéis no seed.
4. **User stories:** **US-13 (núcleo)** governança de acessos (RBAC + escopo + auditoria = rastreabilidade perfil→módulo→ação); US-1 (`none` remove o módulo do Sidebar — modularidade por papel; distinguir `none` de "não contratado" = upsell); US-2 (matriz com ícones ✓/👁/✕ e click-cycle); US-12 (decide quem fala com o Assistente e, com escopo, sobre quais ativos); US-3..11 indiretas (gate transversal).
5. **Estrutura:** 2 seções hoje → 5 na visão-alvo. 5.1 **Usuários vinculados** (existe, `RBAC.tsx:42-90`: avatar/papel/status/último acesso/chips de módulos, busca a implementar). 5.2 **Matriz papel × módulo** (existe, `:93-127`: célula cicla `none→read→full`, ícone `CheckCircle2`/`Eye`/`XCircle`). 5.3 **Escopos** (a criar: planta/linha/cliente). 5.4 **Ações críticas** (a criar). 5.5 **Trilha de auditoria de permissões** (a criar: `ts·ator·papel·módulo·de→para`, exportável).
6. **Dados:** `roles` (`ROLES`/`seed.ts:95`), `modules` (`MODS`), `rbac: RbacMatrix` (`PERM`, mutável por `setRbac`), `users` (`SEED_USERS`), `session`. Snapshot `PERM` real: Gerente Industrial `full` em tudo (incl. RBAC); Eng. Confiabilidade tudo `full` exceto Governança `read`/RBAC `none`; Técnico Alertas/Assistente `full`, resto `read`/`none`; Analista Telemetria/Governança `full`; Operador Ativos/Alertas/Mapa `read`. **Escopo proposto** (hoje **global** — `Ativos:full` vale para todas as plantas): `RbacScope {kind, ids}` herdado de `HTREE` via `canScoped(...pathToNode)`. **Auditoria proposta:** `AuditEvent {ts, actor, modulo, entidade, acao, de, para}` via `logAudit` em `setRbac`.
7. **Ações — EXISTEM:** ciclar permissão (`cycle`→`setRbac`, re-render Sidebar+guards na hora), ler matriz/usuários, trocar de papel demo (`switchRole`). **CRÍTICAS (full + auditoria):** ciclar célula, conceder `RBAC:full` (step-up), editar limite no Dicionário, alterar escopo, remover ativo/nó, criar/inativar usuário. **A CRIAR:** "Novo usuário"/"Papéis" (inertes hoje, `RBAC.tsx:36`), exportar matriz CSV.
8. **Relação:** **gate transversal** — toda tela depende. Sidebar (`permLevel !== "none"` oculta módulo), route guards (`Gate`), login/sessão (`session.papel` alimenta `useCan`), Dashboard/Ativos/Telemetria/Mapa (read p/ entrar + escopo filtra ativos), Alertas (`full` libera ack/resolver), Assistente, Cadastro/OCR, os 3 outros pilares de Governança (governados por esta), Auditoria (`setRbac`→`logAudit`). Com escopo, **herda da Hierarquia** (Pilar 1).
9. **Refino — JÁ EXISTE:** matriz editável reativa (re-render instantâneo), Gate de rota/módulo, tabela de usuários, auto-governança, sessão real com expiração. **REFINAR (P0):** trilha de auditoria de permissões (maior lacuna — `setRbac` é `set({rbac})` cru; slice `auditLog` + `logAudit`, bloco §5.5 + `/governanca/auditoria`); **montar `RequireAuth` nas rotas** (existe mas não montado — app não força login, esvazia o RBAC); reconciliar papéis + eliminar mismatch silencioso (papel órfão cai em `none` sem aviso). **P1:** escopo planta/linha/cliente (tenancy B2B, habilita "Usuário Cliente"); ativar CRUD "Novo usuário"/"Papéis"; matriz como heatmap + "diff de papéis"; catálogo de "Ações críticas". **P2:** busca funcional, selo de auto-governança + **proteção do último Admin** (impedir remover o último `RBAC:full`).


---

## BLOCO 4 — Matriz tela × user story

> Cruzamento de **todas as telas do inventário canônico** (linhas) com as **13 user stories da Forzy** (colunas).
> Consolida as duas matrizes parciais já escritas — operacional (`docs/design/telas/README.md §2`, 14 telas)
> e governança (`docs/design/governanca/README.md §2`, 6 telas) — numa única tabela, ancorada no código real
> (`src/routes.tsx`, `src/components/layout/Sidebar.tsx`, `src/data/seed.ts`).

### Legenda de cobertura

| Símbolo | Significado |
|:--:|---|
| **●** | **Atende** — a tela materializa a US como núcleo ou parte central de sua função |
| **◐** | **Parcial** — apoio/indireto, ou previsto só no refino (§11/§9 das specs); a US "passa por" mas não é o foco |
| (vazio) | Não se aplica |

> **Nota de fusão.** As specs operacionais usam o eixo **N/A/R** (núcleo/apoio/refino) e as de governança usam **■/□**.
> Aqui ambas colapsam em **●** (= N ou ■) e **◐** (= A, R ou □), preservando a leitura de "forte vs. tangencial".
> As telas **Login**, **Configurações** e **Gêmeo Digital** não tinham linha nas matrizes parciais — foram
> instanciadas a partir de `routes.tsx` (rotas `/login`, `/configuracoes`, `/ativos/:id/gemeo`) e da matriz
> §5.4 de `governanca/05-rastreabilidade-navegacao.md`.

### Matriz consolidada (inventário canônico completo × US-1…US-13)

US: **1** modular · **2** amigável · **3** dado raw · **4** sensores V/A/RPM/°C · **5** OCR · **6** planta navegável ·
**7** atuais+históricos · **8** ML baseline · **9** ML anomalia · **10** ML parada/manutenção · **11** manut. planejada ·
**12** assistente conversacional · **13** governança.

| Macroárea | Tela (rota) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **ACESSO** | Login (`/login`) | | ◐ | | | | | | | | | | | ● |
| **OPERAÇÃO** | Dashboard inicial (`/dashboard`) | ● | ● | | | | | ● | | ◐ | | ◐ | | ◐ |
| **OPERAÇÃO** | Painel Operacional (`/operacional`) | ◐ | ◐ | ◐ | ◐ | | | ● | | ◐ | ◐ | | ◐ | ◐ |
| **ATIVOS** | Lista de Ativos (`/ativos`) | ◐ | ◐ | ◐ | | | | ● | | ◐ | ◐ | ◐ | ◐ | ● |
| **ATIVOS** | Detalhe — Visão Geral (`/ativos/:id/overview`) | | ◐ | | ◐ | | | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| **ATIVOS** | Detalhe — Telemetria (`/ativos/:id/telemetria`) | | ◐ | ● | ● | | | ● | ◐ | | | | ◐ | ◐ |
| **ATIVOS** | Detalhe — Saúde & IA (`/ativos/:id/saude`) | | ◐ | | ◐ | | | ◐ | ● | ● | ● | ● | ◐ | ◐ |
| **ATIVOS** | Detalhe — Dados Técnicos (`/ativos/:id/tecnico`) | | ◐ | ◐ | ◐ | ● | | | | | | ◐ | | ● |
| **ATIVOS** | Gêmeo Digital (`/ativos/:id/gemeo`) | | ◐ | | ◐ | | ◐ | ◐ | ◐ | ◐ | ● | ● | ◐ | ◐ |
| **ALERTAS** | Lista de Alertas (`/alertas`) | | ◐ | ◐ | ◐ | | | ◐ | | ● | ◐ | ◐ | ◐ | ◐ |
| **ALERTAS** | Detalhe do Alerta (`/alertas/:id`) | | ◐ | | ◐ | | | ◐ | | ● | ◐ | ◐ | ◐ | ● |
| **ASSISTENTE** | Assistente conversacional — frota (`/assistente`) | ◐ | ◐ | | ◐ | | | ◐ | ◐ | ◐ | ◐ | ◐ | ● | ◐ |
| **ASSISTENTE** | Assistente c/ contexto do ativo (`/assistente/:id`) | ◐ | ◐ | | ◐ | | | ◐ | ◐ | ● | ◐ | ◐ | ● | ◐ |
| **CADASTRO** | Cadastro Manual (`/cadastro`) | ● | ◐ | ◐ | ◐ | ◐ | | | ◐ | ◐ | ◐ | | | ● |
| **CADASTRO** | Cadastro por OCR da placa (`/cadastro/ocr`) | ◐ | ◐ | ◐ | ◐ | ● | ◐ | | | | | | | ◐ |
| **CADASTRO** | Mapa Digital da Planta (`/mapa`) | ◐ | ◐ | | | | ● | ◐ | | ◐ | ◐ | | | ◐ |
| **ADMIN.** | Configurações (`/configuracoes`) | ◐ | ◐ | | | | | | | | | | | ◐ |
| **GOVERNANÇA** | Visão Geral (`/governanca`) | ◐ | ◐ | ◐ | ◐ | | | | | | | | | ● |
| **GOVERNANÇA** | Matriz de Hierarquia (`/governanca/hierarquia`) | ◐ | ◐ | | ◐ | ◐ | ● | ◐ | | | | | ◐ | ● |
| **GOVERNANÇA** | D-I-C-I / DIKW (`/governanca/dici`) | | ◐ | ● | ◐ | ◐ | | ◐ | ● | ● | ● | ● | ◐ | ● |
| **GOVERNANÇA** | Dicionário de Rastreabilidade (`/governanca/dicionario`) | | | ● | ● | ◐ | | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ● |
| **GOVERNANÇA** | Rastreabilidade e Navegação (`/governanca/navegacao` *proposta*) | ● | ● | | | | ◐ | | | ◐ | ◐ | | ◐ | ● |
| **GOVERNANÇA** | RBAC / Permissões (`/governanca/rbac`) | ● | ◐ | ◐ | | ◐ | | | ◐ | ◐ | ◐ | ◐ | ● | ● |

### Soma por user story (cobertura — US fortes vs. frágeis)

Contagem de telas com **●** (núcleo) e com **◐** (parcial). "Total" = telas que tocam a US de qualquer forma (23 telas no inventário).

| US | Tema | ● núcleo | ◐ parcial | **Total** | Leitura |
|---|---|:--:|:--:|:--:|---|
| **US-1** | modular | 4 | 8 | **12** | Média. Núcleo em Cadastro, Navegação, RBAC, Dashboard; apoio difuso. Modularidade existe (Sidebar oculta por `none`) mas raramente é *núcleo* de tela. |
| **US-2** | amigável | 3 | 18 | **21** | **Onipresente** como apoio — é qualidade transversal, não tela. Núcleo só onde a navegabilidade é o produto (Navegação, Dashboard). |
| **US-3** | dado raw | 4 | 6 | **10** | Concentrada: Telemetria, DICI, Dicionário (núcleo). A "base histórica" vive mais no motor que na UI. |
| **US-4** | sensores V/A/RPM/°C | 3 | 9 | **12** | Núcleo em Telemetria, Dicionário; espalhada como leitura. **Painel ainda não exibe Corrente/RPM** (backlog D4). |
| **US-5** | OCR da placa | 2 | 6 | **8** | **Frágil em telas, forte onde está.** Núcleo só em OCR e Técnico (leitura auditável); handoff OCR→Técnico/Manual é fraco (backlog C10/C11). |
| **US-6** | planta navegável | 2 | 4 | **6** | **A US mais frágil.** Núcleo só em Mapa e Hierarquia. Mapa hoje hard-coded, não derivado da Hierarquia (backlog B8). Elo Mapa↔Hierarquia em aberto. |
| **US-7** | atuais+históricos | 4 | 9 | **13** | **Tecido conjuntivo do produto** — presente em 13 telas. Justifica o par "valor agora + série temporal" em quase todo lugar. |
| **US-8** | ML baseline | 3 | 8 | **11** | **A US menos materializada como núcleo** — só Saúde & IA, DICI, e mesmo lá "dissolvida na curva" (backlog A10/A11). Maior dívida do padrão único de IA. |
| **US-9** | ML anomalia | 4 | 11 | **15** | **Forte e bem distribuída** — núcleo em Saúde & IA, Lista/Detalhe de Alertas, Assistente-ativo, DICI. É a "rota de ouro" do produto. |
| **US-10** | ML parada/manutenção | 3 | 11 | **14** | Sólida — núcleo em Saúde & IA, Gêmeo, DICI; apoio na cadeia de alertas. |
| **US-11** | manut. planejada | 3 | 8 | **11** | Núcleo em Saúde & IA, Gêmeo, DICI. Falta **tela de plano/calendário** dedicada (gap RASTREABILIDADE §5.1). `applyMaintenance`/`recommendationsFor` existem; UI de planejamento não. |
| **US-12** | assistente | 3 | 12 | **15** | **Forte.** Núcleo em Assistente (frota+ativo) e RBAC; ponte ◐ a partir de Lista/Detalhe de Alertas e Lista de Ativos — mas a aresta "Investigar com Assistente" raramente existe no código (backlog C5). |
| **US-13** | governança | 8 | 11 | **19** | **A US mais coberta** (19 telas). Núcleo em todas as 6 telas de governança + Lista de Ativos, Detalhe do Alerta, Cadastro. **Lacuna crítica:** transversal mas hoje **não gateia** ações de escrita (Assistente, Mapa) — P0 do produto. |

### Conclusões da matriz

- **US fortes** (cobertura ampla + núcleo): **US-13** (19), **US-9** (15), **US-12** (15), **US-7** (13), **US-10** (14).
- **US frágeis** (poucas telas / pouco núcleo): **US-6** (6) ← a mais frágil; **US-5** (8); **US-8** (11 mas dissolvida); **US-11** (11, sem tela de plano).
- **US-2** é apoio quase universal (21 telas) — confirma que "amigável" é atributo de sistema, não de tela isolada.
- **Dívidas estruturais que a matriz expõe:** (1) padrão único de IA — US-8/US-9/US-10/US-11 deveriam compartilhar
  um componente único `AIConfidence` (valor+horizonte+confiança+explicação+nota), hoje espalhado; (2) US-13 é
  núcleo em telas de governança mas **não é gated** nas telas operacionais onde deveria ser transversal
  (`/assistente`, `/mapa` sem `<Gate>` — `routes.tsx:71-72,76`); (3) US-6 precisa do elo Mapa→Hierarquia para sair de 6 telas.

---

## BLOCO 5 — Mapa de navegação do sistema

> Fluxo ponta-a-ponta do Predicta, derivado de `src/routes.tsx` + `src/components/layout/Sidebar.tsx`
> (arestas reais do código) e do grafo de `docs/design/governanca/RASTREABILIDADE.md` / `05-rastreabilidade-navegacao.md`.
> **Convenção:** `──▶` = aresta **existe no código** · `⇢` = aresta **proposta (refino)** · `🔒` = rota com `<Gate modulo>` ·
> `⚠` = furo de governança conhecido (rota **sem** `<Gate>` apesar de ter `modulo` no Sidebar).

### 5.0 — Entrada: Login → Dashboard governado por papel

```
                    ┌─────────────┐
                    │ /login      │  (público; RequireAuth ainda não montado — backlog R1)
                    │  Login      │
                    └──────┬──────┘
                           │ setSession(papel) → "/" (routes.tsx:49)
                           ▼
                    ┌─────────────┐
                    │  "/" index  │ ──redirect FIXO──▶ /dashboard
                    └──────┬──────┘
                           │
        ⚠ BUG DE LANDING (RASTREABILIDADE §5.2): "/" → /dashboard é fixo, mas
          PERM["Operador Campo"].Dashboard === "none" → cai em tela órfã.
          Refino: firstAllowedRoute(rbac, papel) no index redirect e no "*".
```

Landing **deveria** depender do papel (alcance por `permLevel`):

| Papel (seed `ROLES`) | Dashboard | Landing real hoje | Landing correto (proposto) |
|---|:--:|---|---|
| Gerente Industrial | full | `/dashboard` ✓ | `/dashboard` |
| Eng. Confiabilidade | full | `/dashboard` ✓ | `/dashboard` |
| Técnico Manutenção | read | `/dashboard` ✓ | `/dashboard` |
| Analista de Dados | read | `/dashboard` ✓ | `/dashboard` |
| **Operador Campo** | **none** | `/dashboard` ⚠ **órfão** | primeiro módulo ≠ none (`/ativos`) |

### 5.1 — Fluxo operacional principal (frota → triagem)

```
   GOVERNANÇA (espinha: Hierarquia · Dicionário · D-I-C-I · RBAC)
        │ define escopo · limites · ciclo · papéis (re-pinta tudo via useCan)
        ▼
   ┌──────────────┐  KPI "Críticos" / B6     ┌─────────────────┐  triagem    ┌──────────────────┐
   │ /dashboard   │ ───────drill-down──────▶ │ /ativos         │ ◀────────── │ /operacional     │
   │ Dashboard    │ ──B5 alerta recente──┐   │ Lista de Ativos │             │ Painel Op (war)  │
   └──────┬───────┘                      │   └────────┬────────┘             └────────┬─────────┘
          │ card "Ativos em Atenção"     │            │ row-click / Eye             │ card do ativo
          │                              │            ▼                              │
          │ "Ver todos" ──▶ /alertas     │     ┌──────────────────────────────────────▼─────┐
          ▼                              │     │  /ativos/:id  →  Detalhe (shell AtivoDetail)│
   ┌──────────────┐ marcador/lista       │     └──────────────────────────────────────────────┘
   │ /mapa ⚠      │ ──abrir ativo────────┘
   │ MapaPlanta   │ ⇢ área crítica → /alertas (refino, bidirecional)
   └──────────────┘
```

Gatilhos reais (de `telas/README.md §3` e `05 §5.2`): Dashboard→`/alertas/:id` (clique alerta B5, existe),
Dashboard→`/ativos/:id/overview` (card B6, existe), Painel→`/ativos/:id` (card, existe). Dashboard→`/ativos`/`/mapa`
por KPI é **refino** (drill governado). Painel→`/alertas`/`/assistente` por card é **refino gated** (backlog C15).

### 5.2 — Fluxo de ativos (lista → detalhe/abas → gêmeo)

```
   /ativos ──row-click──▶ /ativos/:id ──index redirect──▶ /ativos/:id/overview
                              │ (shell AtivoDetail: cabeçalho + 5 abas + Outlet {asset, twin})
                              │
   ┌──────────────────────────┼───────────────────────────────────────────────┐
   │  ABAS (troca por <NavLink>, routes.tsx:59-64):                             │
   │  ├─ overview     Visão Geral   (US-7 · próximas ações ⇢ acionáveis C1)     │
   │  ├─ telemetria   Telemetria ⚠  (US-3/4/7 · sem <Gate> apesar de módulo)    │
   │  ├─ saude        Saúde & IA    (US-8/9/10/11 · padrão único de IA)         │
   │  ├─ gemeo        Gêmeo Digital (US-10/11 · what-if, Δ-RUL)                 │
   │  └─ tecnico      Dados Técnicos(US-5 placa/OCR · US-13 D-I-C-I)            │
   └────────────────────────────────────────────────────────────────────────────┘
        │ IBtn "Assistente"            │ IBtn "Alertas" / "Ver alerta"
        ▼                              ▼
   /assistente/:id              /alertas/:id 🔒
   (contexto do ativo)          (Detalhe do Alerta)

   Atalhos de entrada para /ativos/:id/overview:
     • /ativos (row-click) ──▶                    [existe; Eye sem handler — refino C6]
     • /governanca/hierarquia (nó Ativo) ──▶       [proposto/espinha]
     • /alertas/:id (card "Ativo Relacionado" B6) ──▶  [existe]
     • /gemeo ──GemeoRedirect──▶ /ativos/:id/gemeo     [existe, routes.tsx:54]
     • /cadastro · /cadastro/ocr (submit createAsset) ──▶  [existe — ativo novo nasce verde]
```

### 5.3 — Fluxo de alertas (lista → detalhe → ativo → assistente) — a "rota de ouro" US-9→US-12

```
   /alertas 🔒 ──row-click / Eye──▶ /alertas/:id 🔒
   (Lista, Gate Alertas)            (Detalhe do Alerta, Gate Alertas)
        ▲                                │
        │ create_work_order              ├─"Ver Histórico"──▶ /ativos/:id/telemetria   [existe]
        │ vira novo alerta               ├─card "Ativo Relacionado" (B6)──▶ /ativos/:id/overview [existe]
        │                                └─"Abrir no Assistente IA"──▶ /assistente/:id  [existe]
   /assistente/:id ◀──────────────────────┘
   (US-12 sugere solução)

   ⇢ "Investigar com Assistente" a partir de /alertas (lista) e /ativos (lista):
        prometida em 03/08/09, hoje só existe a partir de 09 (backlog C5).
        Passar {assetId, tag, modoCritico} → /assistente/:id é a aresta de maior alavancagem p/ fechar US-12.
```

> **Achado de navegação (telas/README §3):** a "volta" do Assistente é beco sem saída — IDs/alertas no painel
> lateral são **texto, não links** (backlog C8). E `create_work_order` escreve **sem gate RBAC** (P0, backlog B1/B2).

### 5.4 — Fluxo do assistente (frota ↔ ativo)

```
   Sidebar "Assistente IA" ──▶ /assistente ⚠      (modo FROTA: ctx = !!asset === false)
                                    │
                                    │ "perguntar sobre ativo" / deep-link
                                    ▼
                               /assistente/:assetId ⚠   (modo ATIVO-EM-FOCO: ctx = true)
                                    │  painel lateral: alertas + métricas do ativo
                                    └─⇢ alertas/ativo do painel viram LINKS (backlog C8)

   ⚠ /assistente e /assistente/:assetId NÃO têm <Gate> (routes.tsx:71-72) — P0 transversal.
     Refino B1/B2: <Gate modulo="Assistente"> na rota + can() dentro de executeTool
     antes de create_work_order / list_alerts.
   Tela única (Assistente.tsx) em dois modos; chips de sugestão devem ser gated (esconder "Gerar OS"
     sem Alertas:full — backlog C9).
```

### 5.5 — Fluxo de governança (hub → subsistemas → camada transversal)

```
   Sidebar "GOVERNANÇA" (oculta inteira se papel = none em Governança)
        │
        ▼
   /governanca 🔒  (Visão Geral — cockpit + hub-roteador, cards-portal gated)
        │ drill via cards-portal (Overview.tsx)
        ├──▶ /governanca/hierarquia 🔒   Matriz de Hierarquia (HTREE · pathToNode → escopo)
        │        └─ nó Ativo ──▶ /ativos/:id/overview (gated pelo destino) ⇢ NodeMetaPanel
        ├──▶ /governanca/dici 🔒         D-I-C-I/DIKW (Ciclo do Ativo + Fluxo DIKW · procedência do modelo SIMULADO)
        │        └─ estágios ⇢ Dado→Telemetria · Conhec.→Saúde IA · Ação→Alertas/OS (deep-links T9)
        ├──▶ /governanca/dicionario 🔒   Dicionário (SEED_DICTIONARY · limite efetivo → evaluateAlerts no próximo tick)
        │        └─ editar limite ──cria/resolve alerta──▶ /alertas (origem do dado → decisão)
        ├──▶ /governanca/rbac 🔒(RBAC)   RBAC/Permissões (ciclar célula PERM → re-pinta Sidebar/Gates/botões NA HORA)
        └──▶ /governanca/navegacao 🔒    Rastreabilidade e Navegação ⇢ PROPOSTA (grafo navGraph + simulador de papel)
                 ⇢ /governanca/auditoria  ⇢ PROPOSTA (trilha logAudit das 5 escritas — P0, hoje ausente)

   Camada transversal (RASTREABILIDADE §1): toda escrita (setRbac/setDici/upsertTag/removeTag/setHierarchy)
   ⇢ AuditEvent ; todo número exibido ⇢ <TraceableValue> → linha do Dicionário ; todo nó/rota ⇢ NavNode/NavEdge.
```

### 5.6 — Telas administrativas e de cadastro/digitalização

```
   CADASTRO (onboarding de ativo):
     /ativos ──"Novo Ativo" (🔒 Cadastro:full)──▶ /cadastro 🔒  CadastroManual
                                                       │ "Ler placa (OCR)"
                                                       ▼
                                                  /cadastro/ocr 🔒(OCR)  CadastroOCR (lazy, tesseract)
                                                       │ ⇢ handoff: placa lida pré-preenche o Manual (C10/C11)
                                                       │   (hoje "Formulário completo" DESCARTA a extração — refino)
                              submit createAsset ──────┴──────▶ /ativos/:id/overview (twin novo nasce verde)
                                                                 + ⇢ nasce linha D-I-C-I "pendente" (B7) + nó em HTREE

   ADMINISTRATIVAS:
     Sidebar avatar / engrenagem ──▶ /configuracoes   (sessão/papel · simulação · reset)
     Topbar "sair()" ──▶ /login                       (logout)
     catch-all "*" ──▶ /dashboard                     (routes.tsx:86; ⇢ deveria respeitar firstAllowedRoute)
```

### 5.7 — Índice de furos de navegação/governança (checklist acionável)

| # | Furo | Âncora código | Refino | Pri |
|---|---|---|---|:--:|
| 1 | `/assistente`, `/assistente/:id` **sem `<Gate>`** + `create_work_order` sem `can()` | `routes.tsx:71-72`, `ai/tools.ts:126` | `<Gate modulo="Assistente">` + gate por ferramenta | **P0** |
| 2 | `/mapa` **sem `<Gate>`** apesar de `modulo:"Mapa"` no Sidebar | `routes.tsx:76`, `Sidebar.tsx:30` | `<Gate modulo="Mapa">` ou remover módulo | **P0** |
| 3 | `/ativos/:id/telemetria` sem `<Gate>` (módulo Telemetria no PERM) | `routes.tsx:61` | gate ou reconciliar matriz §3 | **P0** |
| 4 | Landing órfão do Operador Campo (`/` → `/dashboard` fixo) | `routes.tsx:49`, `seed.ts:102` | `firstAllowedRoute(rbac, papel)` | **P0** |
| 5 | `RequireAuth` existe mas **não montado** — app não força login | `RequireAuth.tsx:11`, `routes.tsx` | envolver `AppShell` | **P0** |
| 6 | Trilha de auditoria das escritas de governança **ausente** | `useStore.ts:140-175` | `logAudit` + rota `/governanca/auditoria` | **P0** |
| 7 | Aresta "Investigar com Assistente" prometida em 03/08, só existe em 09 | `AlertasLista.tsx:160-164` | `navigate('/assistente/:id', {assetId,tag,modoCritico})` | P1 |
| 8 | "Volta" do Assistente é beco — alertas/ativo são texto, não links | `Assistente.tsx:213-217` | tornar painel navegável | P1 |
| 9 | Breadcrumb estático (`bc: string[]`) — não materializa a Matriz de Hierarquia | `chrome.tsx:35` | `BreadcrumbNode[]{label,to}` + `pathToNode` | P1 |
| 10 | Drift Mapa↔cadastro — canvas plota 8 ativos literais; cadastrados não aparecem | `MapaPlanta.tsx:19-32` | derivar layout de `HTREE`/`Asset.area` (B8) | P1 |


---

## BLOCO 6 — Camada de governança do produto

> **Tese central.** No PREDICTA a governança **não é um item de menu** — é a **espinha ambiente** que dá estrutura, procedência, acesso e navegabilidade a *todas* as telas. Cobre a **US-13** (governança de acessos/dados/rastreabilidade) e é o habilitador transversal de US-1…US-12. Este bloco descreve, de forma **aplicada e ancorada no código real** (`src/`), como os quatro pilares — Matriz de Hierarquia, D-I-C-I/DIKW, Dicionário de Rastreabilidade e RBAC — já existem no produto e como se fecham em camada de controle única. Cada afirmação separa **"já existe"** (funcional no repositório) de **"refinar"** (proposta priorizada).

---

### 6.1 A governança como camada central — quatro eixos, seis telas

A governança do Predicta governa **quatro eixos do produto** e os materializa em **seis telas**, mas seu valor é estar presente *fora* delas — em cada breadcrumb, cada número e cada botão do produto operacional.

| Eixo governado | Pilar da espinha | Tela canônica | O que controla na operação | Âncora no código |
|---|---|---|---|---|
| **Estrutura industrial** | P1 — *breadcrumb = Matriz de Hierarquia* | `02` Hierarquia | escopo, contexto e caminho de Dashboard (contagens), Telemetria, Ativos (`/ativos/:id`) e do breadcrumb de toda tela | `HTREE` (`seed.ts:105`), `setHierarchy` (`useStore.ts:175`) |
| **Fluxo do dado → decisão** | P2 — *todo número rastreia ao Dicionário* | `03` D-I-C-I/DIKW + `04` Dicionário | o Dicionário é a fonte canônica de limites que o motor lê a cada tick; o DIKW expõe o caminho sensor→modelo→OS e a procedência do modelo SIMULADO | `evaluateAlerts` (`simulation.ts:122-147`), `SEED_DICTIONARY` |
| **Acesso por perfil** | P3 — *toda ação é gated por RBAC* | `06` RBAC | a matriz `s.rbac` gateia Sidebar, rotas (`Gate`) e botões (`useCan`) — reativamente | `useCan`/`permLevel` (`rbac.ts:20`), `Sidebar.tsx:56` |
| **Navegação governada** | P4 — *navegação é governada por papel* | `05` Navegação + `01` Visão Geral | o grafo de telas provado navegável por papel; a Visão Geral é o hub-roteador | `routes.tsx`, `Sidebar.tsx` |

**Mapa de composição das 6 telas.** A Visão Geral (`01`) é o nó-pai e roteador: **lê** o estado vivo (`s.dici`) e **despacha** para os quatro subsistemas. Esses quatro **escrevem** no store via cinco ações centralizadas (`setHierarchy`/`setDici`/`upsertTag`/`removeTag`/`setRbac`, `useStore.ts:140-175`). A camada transversal (`05` Navegação + Auditoria) fecha o ciclo: prova que cada percurso é alcançável e gated, e registra cada escrita.

```
                    ┌──────────────────────────────────────────────┐
                    │  01 · VISÃO GERAL (/governanca)              │
                    │  cockpit executivo + hub-roteador            │
                    │  KPIs vivos de dici · cards-portal gated     │
                    └──┬───────┬────────┬────────┬─────────────────┘
            drill ─────┘       │        │        └──────── drill
        ┌────────────┐ ┌───────▼─────┐ ┌▼──────────┐ ┌──────────▼──┐
        │02 HIERARQUIA│ │03 DICI/DIKW │ │04 DICIONÁ.│ │06 RBAC      │
        │ HTREE      │ │ DIKW+Ciclo  │ │ tag→alerta│ │ PERM/ROLES  │
        └─────┬──────┘ └──────┬──────┘ └────┬──────┘ └──────┬──────┘
              │pathToNode     │procedência   │limites        │permLevel
              └──────────┬────┴──────────────┴───────────────┘
                         ▼
        ┌────────────────────────────────────────────────────────┐
        │ 05 · NAVEGAÇÃO GOVERNADA + AUDITORIA                   │
        │ grafo de telas (navGraph) · simulador de papel        │
        │ trilha auditLog: toda escrita de governança vira evento│
        └────────────────────────────────────────────────────────┘
```

Os **dois eixos transversais** da espinha costuram tudo: `pathToNode` (escopo herdado da Hierarquia) e `<TraceableValue>` (todo número → linha do Dicionário).

---

### 6.2 Pilar 1 — Matriz de Hierarquia (o breadcrumb É a espinha)

**Job.** Manter a árvore de ativos canônica **empresa → planta → área → sistema → ativo** que dá escopo e contexto a TODA navegação. Não é uma tela de organograma: é a fonte do **breadcrumb-matriz** e a base do **escopo por papel**.

**JÁ EXISTE (funcional).**
- Árvore editável e persistida (`HTREE`/`SEED_HIERARCHY` em `seed.ts:105`), com `addChildTo`/`renameIn`/`removeFrom`/`countByType` como funções puras (`Hierarquia.tsx`).
- `CHILD_TYPE` impõe a **gramática** da hierarquia (Empresa→Planta→Área→Sistema→Ativo).
- Edição gated por `useCan("Governança","full")`; nó tipo `Ativo` navega a `/ativos/:id/overview`.
- O breadcrumb já existe, mas **estático por tela**: cada página publica `usePageChrome(["Governança","Hierarquia"])` (`chrome.tsx:35`), renderizado pelo `BC` (`ui-shared/index.tsx:90`) como `string[]` com `ChevronRight`.

**REFINAR (a maior lacuna transversal).** Materializar o breadcrumb como a **Matriz de Hierarquia completa e navegável**:

| O quê | Como | Esforço |
|---|---|---|
| `pathToNode(hierarchy, assetId): HNode[]` | helper em `derive.ts` que espelha a recursão já em `Hierarquia.tsx` | **P0** · M |
| `bc: string[]` → `bc: BreadcrumbNode[]` (`{id,label,tp,to}`) | `chrome.tsx` aceita nós ricos; `BC` ganha `onClick`/`to` | **P0** · M |
| `NodeMetaPanel` (id × asset/twin/alerts/dici) | painel de metadados que cruza o nó com a operação | **P0** · M |

**Impacto concreto.** Numa tela de ativo (`/ativos/BCP-01/overview`), o breadcrumb deve ler **Forzy Indústria S.A. › Planta Norte › Bombeamento › Sistema de Recalque #1 › Bomba BCP-01 › Visão Geral** — cada segmento clicável, definindo um **escopo herdado** que Dashboard, Alertas e Telemetria respeitam. Assim a Hierarquia deixa de "terminar onde a operação começa": cada nó tem destino operacional gated pelo RBAC do destino. Estende-se ainda `HTREE` para 8 níveis (Linha/Célula/Sensor/Evento), populando Sensor de `SEED_DICTIONARY` e Evento de `SEED_ALERTS` (H2, P0).

---

### 6.3 Pilar 2 — D-I-C-I: a decisão de produto (DIKW oficial × Ciclo do Ativo)

Existe uma **colisão de significados** sobre a sigla "D-I-C-I" que esta camada **resolve em vez de esconder**.

| Sigla | Leitura | Estado | Papel na governança |
|---|---|---|---|
| **D-I-C-I (DIKW)** — *pedido* | **D**ado → **I**nformação → **C**onhecimento → **I**nteligência/Ação | **não existe ainda** | rastreabilidade do **fluxo do dado** sensor→modelo→decisão |
| **D-I-C-I (documental)** — *implementado* | **D**esenho · **I**nstalação · **C**omissionamento · **I**nspeção | `DICI.tsx`, `DICI`/`SEED_DICI` (`seed.ts:77`), `setDici` (`useStore.ts:173`) | ciclo de vida **documental** do ativo (conformidade) |

**Decisão (reconciliação "duas visões, um módulo").**
1. **Promover a pirâmide DIKW** como o **D-I-C-I oficial** da governança — *"Da Leitura à Decisão"* — porque é o que rastreia o fluxo do dado até a OS (US-13).
2. **Renomear** o artefato implementado para **"Ciclo do Ativo"** (mantém tabela, edição, KPIs e CSV intactos).
3. Apresentá-las como **duas abas** do mesmo módulo `/governanca/dici` (segmented control); default = **Fluxo (DIKW)**.

**A pirâmide DIKW mapeada às camadas reais do motor** (cada estágio é um ponteiro para uma função real — é o "índice executável do motor"):

| Estágio | Domínio industrial | Função real | Saída | Procedência |
|---|---|---|---|---|
| **D — Dado** | leitura raw do sensor (V/A/RPM/°C/bar/%óleo) | `readingFromState()` (`model.ts:72`) | `TelemetrySample` | sensor físico (tag no Dicionário) |
| **I — Informação** | telemetria + baseline + limites | `baseTemp/Vib/...` (`model.ts:47-61`) + Dicionário + `evaluateAlerts` | série + desvio vs. baseline | Dicionário (engenharia define) |
| **C — Conhecimento** | saúde, anomalia, modo crítico, **RUL** | `healthFromDamage`/`worstMode`/`computeRUL`/`failureCurve` (`prediction.ts:39,56`) | health, status, modoCritico, RUL, probFalha | **Modelo SIMULADO** (selo) |
| **In — Inteligência/Ação** | recomendação → OS → manutenção planejada | `recommendationsFor()` (`recommendations.ts:35`) → `applyMaintenance` | `Recommendation{acao,motivo,prazoDias,pri}` → OS | Técnico executa + Gestor planeja |

> **Honestidade da IA (obrigatória).** A transição **C → In** depende de um **modelo de degradação SIMULADO** — *"Predicta Digital Twin Engine v1 · físico-informado + Weibull"* (`prediction.ts:62-63`), **não treinado em falhas reais**. A interface `PredictionModel` (`prediction.ts:25`) permite plugar um modelo treinado — quando isso ocorrer, **o selo troca sozinho**. O nó "Conhecimento" carrega o selo `predictionModel.name`/`.metodo`, reutilizado como **componente único** em Saúde&IA, Gêmeo, Dashboard, Alertas-modelo e OCR.

**Impacto no código (DICI.tsx / seed / store) — o que tocar e o que NÃO tocar:**

| Arquivo | Mudança | Esforço |
|---|---|---|
| `DICI.tsx` | extrair tabela atual p/ `<CicloDoAtivo/>`; criar `<FluxoDIKW/>`; wrapper 2 abas; trocar banner (`DICI.tsx:40`) | A |
| `seed.ts` | **NÃO renomear** `DICI`/`SEED_DICI`/`DiciRow` — só o **rótulo de UI** muda | B |
| `useStore.ts` | `setDici` permanece; nova slice opcional p/ auditar saltos | B |
| `lib/types.ts` | `DiciRow` permanece; **adicionar** `DikwStage`/`StageEvidence` | B |

> **Risco a evitar:** renomear a chave `dici` no store/seed quebraria `Overview.tsx` (KPIs derivam de `dici.flatMap(...)`) e a persistência (`partialize`). A desambiguação é **só de rótulo/UI**, preservando identificadores internos.

---

### 6.4 Pilar 2 (cont.) — Dicionário de Rastreabilidade (tag → alerta, `<TraceableValue>`)

**Job.** Ser a **fonte canônica de verdade dos limites** que governam os alertas do motor — e o destino de rastreabilidade de todo número exibido no produto.

**JÁ EXISTE e está acoplado ao motor.** `SEED_DICTIONARY` define por grandeza: `campo, un, faixaMin/Max, limiteAlerta, limiteCritico, direcao, sensor, ativo`. O motor (`evaluateAlerts`, `simulation.ts:122-147`) lê **exatamente** esses campos (com override por ativo via `asset.limites?.[tag.key]`) a cada tick (1s). **Editar um limite aqui faz um alerta nascer/resolver no próximo ciclo** — tempo real é o coração desta tela. `upsertTag`/`removeTag` (`useStore.ts:140,149`) mutam o store; degradação por permissão já aplicada (`full` edita inputs; `read` vê `<span>` + selo `Lock`).

**A cadeia tag → alerta (a "rota de ouro", US-9 → US-12), instanciada com dados reais do seed:**

| Elo | Valor real | Âncora |
|---|---|---|
| Tag | `TAG-002 vib` · Acelerômetro MEMS · alerta 4.5 / crít 7.1 mm/s · `direcao:"acima"` | `SEED_DICTIONARY` (`seed.ts:132`) |
| Modo/Modelo | `rolamento` (TWIN_SEED `ME-07`); twin SIMULADO calcula health/RUL/probFalha | `TAG_OF_MODE`, `prediction.ts` |
| Regra | `breachCrit = v >= 7.1` → `severidade:"critico"`, `RULE_TITLE.vib` | `simulation.ts:127,135` |
| Alerta (seed) | **ALT-2025-0847** · `ME-07` · "Vibração Crítica Detectada" · `tag:"vib"` | `SEED_ALERTS` (`seed.ts:265`) |
| Ação | ack / resolver / `applyMaintenance(ME-07,"rolamento")` → OS | `recommendations.ts` |
| Perfil | `Técnico Manutenção` (`Alertas:full`) executa; `Operador` só vê (`read`) | `PERM` (`seed.ts:100`) |

**REFINAR.**
- **`<TraceableValue tagKey="temp" value={82} />`** (P0/P1) — componente transversal único que renderiza o número e, ao hover/click, abre a **linha do Dicionário** (campo, unidade, faixa, limite alerta/crítico, direção, sensor) + link a `/governanca/dicionario`. Fecha a espinha "todo número rastreia ao Dicionário", reusado em Telemetria, Alertas, Ativos e na aba Fluxo DIKW. Hoje a rastreabilidade do número→Dicionário **não é inspecionável na UI**.
- **`TagTraceCard`** (P0) — visualiza a cadeia tag→limite→regra→alerta→ativo→perfil, derivada de `RULE_TITLE`/`TAG_OF_MODE`.
- **Limite EFETIVO por ativo** (P0) — join `dictionary × asset.limites`; resolve o **falso-positivo da Corrente** (`TAG-004`: o Dicionário mostra 50/53 A genérico, mas o motor usa override escalado ao FLA, `seed.ts:164-167`; sem a coluna, um auditor conclui que a Turbina de 25 MW vive em sobrecorrente).

---

### 6.5 Pilar 4 — Dicionário de Rastreabilidade e Navegação (grafo + navegação governada)

A rastreabilidade só vira governança quando é **navegável dos dois lados** (subir até a US, descer até a ação/perfil) e **governada por papel**.

**Cadeia canônica (forma normal do grafo):**

```
US-n ─cobre─▶ REQUISITO ─realiza─▶ MÓDULO (MODS) ─expõe─▶ TELA/ROTA (routes.tsx)
                                       │                        │ renderiza
                                  Gate modulo=…            COMPONENTE (src/pages/…)
                                       │ gateado-por PERM       │ lê/escreve
                                  PERFIL (ROLES) ◀─executa─ AÇÃO/RECOMENDAÇÃO
                                       ▲                        ▲ deriva-de
                   SENSOR/TAG ─limite─▶ MODELO ML ─prevê─▶ ALERTA ─aciona─┘
                  (SEED_DICTIONARY)  (prediction.ts)  (evaluateAlerts)
```

O grafo **já existe espalhado e tácito** no motor/seed/roteador: o mesmo `tag.key` percorre `twin.state[tag.key]` → `Alert.tag` → `TAG_OF_MODE[modo]`; o mesmo `modulo` percorre rota → `Gate` → `PERM` → Sidebar → perfil; o mesmo `assetId` percorre `HTREE` → twin → alerta → tela. Faltam dois artefatos para torná-lo **dado de 1ª classe**:

| Artefato (a criar) | O quê | Esforço |
|---|---|---|
| `src/data/traceability.ts` | `TRACE_NODES`/`TRACE_EDGES` (`US`/`Req`/`Modulo`/`Tela`/`Tag`/`Modelo`/`Alerta`/`Acao`/`Perfil`) + `US_COVERAGE`; teste de fumaça casa toda rota↔nó, todo `tag.key`↔aresta, todo módulo↔`PERM` | **P0** · M |
| `src/data/navGraph.ts` | `NavNode`+`NavEdge` derivados de `routes.tsx`+`Sidebar.tsx`; teste casa toda rota e todo `NAV.to` | **P0** · M |

**Interações canônicas (subir/descer a cadeia):** clicar numa US acende toda a cadeia descendente; clicar num alerta sobe até a US e desce até ação+perfis; `<TraceableValue>` abre a linha do Dicionário; **simular papel** re-pinta o grafo (`permLevel(rbac,papel,modulo)` sem login) — nós alcançáveis acendem (cobalto `full`/âmbar `read`), gated escurecem com selo `Lock`. Assim "controle de acesso" (conceito) vira "alcance navegável" (mapa pintado).

**Furos de navegação governada a fechar (P0):**

| Gap | Detalhe | Correção |
|---|---|---|
| `RequireAuth` não montado | existe (`RequireAuth.tsx:11`) mas `routes.tsx` usa só `Gate` → app não força login | envolver o `AppShell` com `<RequireAuth>` |
| Landing órfão | `/`→`/dashboard` mas `Operador.Dashboard="none"` (`seed.ts:102`) → cai em tela que não vê | `firstAllowedRoute(rbac,papel)` no index |
| Menu × rota divergente | `/mapa` e `/ativos/:id/telemetria` têm módulo no Sidebar mas **sem `<Gate>`** (`routes.tsx:61,76`) → URL direta fura o RBAC | adicionar `<Gate modulo="Mapa"/"Telemetria">` |

---

### 6.6 Pilar 3 — RBAC / Permissões (matriz, escopo, ações críticas, auditoria)

**Job.** Definir **quem acessa o quê** (papel × módulo, níveis `none < read < full`) — o gate de toda rota, ação e dado.

**JÁ EXISTE e é robusto.** Matriz `papel × módulo` editável (clique cicla `none→read→full`, `setRbac` em `useStore.ts:174`); **aplicação reativa imediata** (`useCan` é seletor Zustand — mudar uma célula re-renderiza Sidebar e guards na hora); `Gate` renderiza "Acesso negado"; auto-governança (`canEdit = useCan("RBAC","full")`); sessão real com expiração (`useAuth.ts`). O store lê `roles`/`modules` **dinamicamente** — a matriz "cresce sozinha" ao adicionar papéis no seed.

**Matriz `PERM` real (snapshot, `seed.ts:97-103`):**

| Papel \ Módulo | Dash | Ativos | Telem | Alertas | Assist | Cadastro | OCR | Mapa | Govern | RBAC |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Gerente Industrial | full | full | full | full | full | full | full | full | full | **full** |
| Eng. Confiabilidade | full | full | full | full | full | full | full | full | read | none |
| Técnico Manutenção | read | read | read | **full** | **full** | none | none | read | none | none |
| Analista de Dados | read | read | **full** | read | read | none | none | none | **full** | none |
| Operador Campo | none | read | none | read | none | none | none | read | none | none |

> **Concentração de privilégio:** `Gerente Industrial` é `full` em 10/10 e **único** com `RBAC:full` — é o "Administrador Forzy" de fato (auto-governança). É o KPI de governança mais sensível.

**Reconciliação de personas (P0).** As 5 personas obrigatórias **não** mapeiam 1:1 a `ROLES` (papel sem linha em `PERM` cai em `none`, fail-safe porém silencioso):

| Persona obrigatória | Papel real hoje | Ação |
|---|---|---|
| **Administrador Forzy** | de fato `Gerente Industrial` | **criar** `Admin Forzy` (`full` em tudo incl. RBAC) |
| **TI/Governança** | recai em `Analista de Dados` | **criar** dedicado (Governança/Auditoria `full`, RBAC `read` — separação de função) |
| **Usuário cliente** | não existe | **criar** `Usuário Cliente` (`read` em Dash/Ativos/Alertas/Mapa, **escopado ao cliente**) |
| **Técnico de manutenção** | `Técnico Manutenção` ✓ | manter |
| **Gestor industrial** | `Gerente Industrial` ✓ | **rebaixar** `RBAC:full`→`read` ao criar `Admin Forzy` |

**Escopo proposto por planta/linha/cliente (P1 — tenancy B2B, hoje inexistente).** `permLevel(rbac,papel,modulo)` (`rbac.ts:10`) é **global**: um `Ativos:full` vale para todas as plantas. Proposta de escopo herdado da Hierarquia:

```ts
type ScopeKind = "global" | "planta" | "linha" | "cliente";
interface RbacScope { kind: ScopeKind; ids: string[] }      // ids de nós da hierarchy / clienteId
type ScopeMatrix = Record<string /*papel*/, RbacScope>;     // default { kind:"global" }
```

| Papel | Escopo | Efeito |
|---|---|---|
| Admin Forzy / Gerente Industrial | `global` | vê todas as plantas |
| Técnico Manutenção | `planta:["PLT-N"]` | só Planta Norte (`HTREE` ids) |
| Usuário Cliente | `cliente:["CLI-…"]` | só ativos do seu cliente (exige `Asset.clienteId?`) |

Impacto: `canScoped(...)` em `rbac.ts` cruza o nível com `pathToNode(hierarchy, assetId)` — se o caminho do ativo não intersecta `scope.ids`, retorna `none`; consumidores de lista de ativos (Ativos/Dashboard/Mapa/Alertas) filtram por escopo.

**Ações críticas (exigem `full` + auditoria) — catálogo proposto `auth/criticalActions.ts`:**

| Ação crítica | Nível mínimo | Por que crítica | Auditoria |
|---|---|---|---|
| Ciclar célula RBAC | `RBAC:full` | concede/retira acesso | obrigatória |
| Conceder `RBAC:full` | `Admin Forzy` | cria novo administrador | obrigatória **+ step-up** |
| Editar limite no Dicionário | `Governança:full` | altera alarmística do motor (`evaluateAlerts`) | obrigatória (segurança operacional) |
| Alterar escopo planta/cliente | `Admin Forzy` | expande/restringe universo visível | obrigatória |
| Remover ativo / nó | `Cadastro/Governança:full` | quebra rastreabilidade | obrigatória |
| Criar/inativar usuário | `RBAC:full` | muda quem entra | obrigatória |

> **GAP P0 transversal mais crítico:** hoje `applyMaintenance`, criar OS, registrar manutenção e ações de alerta **NÃO passam por `can()`/`useCan()`** — ações de **escrita** não são gated. Fechar isso (cruzando o catálogo de ações críticas acima ao motor) é o P0 de governança número um (US-13).

---

### 6.7 Trilha de auditoria (a maior lacuna — P0 global)

Hoje **nenhuma** mutação de governança é registrada: `setRbac`/`setDici`/`upsertTag`/`removeTag`/`setHierarchy` mutam o store sem log de quem/quando/de→para. O card "Auditoria" do Overview (`Overview.tsx:37`) é placeholder que aponta ao Dicionário.

**Proposta mínima e aderente à arquitetura existente** (as 5 ações já estão centralizadas em `useStore.ts:140-175` — ponto de alavancagem):

```ts
interface AuditEvent {
  id: string; ts: number;
  actor: { userId: number|null; nome: string|null };        // de s.session
  modulo: "RBAC"|"Dicionario"|"DICI"|"Hierarquia"|"Escopo"|"Navegacao";
  entidade: string;                                          // ex.: "Técnico Manutenção · Cadastro"
  acao: "permissao_alterada"|"limite_alterado"|"status_ciclado"
      | "no_adicionado"|"no_removido"|"escopo_alterado"|"usuario_criado";
  de: string; para: string;                                  // "none" → "full"
}
```

Um único wrapper `logAudit(evt)` envolve as 5 ações; nova slice `auditLog: AuditEvent[]` + estender `partialize`; tela `/governanca/auditoria` (tabela filtrável + CSV via `downloadCSV`). Eventos mais críticos: **limite no Dicionário** e **célula RBAC** (afetam alarmística e acesso).

---

### 6.8 Modelo de dados de governança (consolidado)

**O que o store JÁ sustenta** (verificado em `useStore.ts`/`seed.ts`):

| Slice | Tipo | Origem (seed) | Ação de escrita |
|---|---|---|---|
| `hierarchy` | `HNode[]` (`{id,l,tp,kids}`) | `HTREE` (`seed.ts:105`) — 5 níveis | `setHierarchy` (`:175`) |
| `dictionary` | `Tag[]` | `SEED_DICTIONARY` — 6 tags | `upsertTag`/`removeTag` (`:140,149`) |
| `dici` | `DiciRow[]` (`{id,nome,D,I,C,In}`) | `DICI`/`SEED_DICI` — 6 ativos × 4 células | `setDici` (`:173`) |
| `rbac` | `RbacMatrix` (`Record<papel,Record<modulo,nivel>>`) | `PERM` (`seed.ts:97`) — 5×10 | `setRbac` (`:174`) |
| `roles`/`modules` | `string[]` | `ROLES`/`MODS` (`seed.ts:95-96`) | lidos dinamicamente |
| `users`/`session` | `User[]`/`Session` | `SEED_USERS` | `setSession` (`:170`) |

**Entidades NOVAS** que rastreabilidade/escopo/auditoria exigem: `AuditEvent` (§6.7), `RbacScope`/`ScopeMatrix` (§6.6), `TraceLink`/`TRACE_NODES`/`TRACE_EDGES` (§6.5), `NavNode`/`NavEdge` (§6.5), `GovSettings { metaConformidade }` (tira o "95%" hardcoded do código).

**Relações (modelo entidade-relação da camada):**

```
   ROLE ──(PERM)── MODULE        ROLE ──(ScopeMatrix)── HNode/cliente
     │                              │
   USER ──tem──► ROLE          HNode(Ativo) ─id─ Asset ─tem─ Tag ──(RULE)──► Alert ──► Action(OS)
                                    │                  │
                                 DiciRow            ML Model (SIMULADO)
   ── toda escrita (setRbac/upsertTag/setDici/setHierarchy/setScope) ──► AuditEvent
   ── todo nó/rota ──► NavNode ──(NavEdge: trigger)──► NavNode  (pintado por permLevel)
   ── todo número exibido ──(TraceableValue)──► Tag (linha do Dicionário)
```

**Impacto consolidado no código:**

| Arquivo | Mudança | Telas |
|---|---|---|
| `src/store/useStore.ts` | slices `auditLog`/`scopes`/`govSettings`; wrapper `logAudit`; estender `partialize` (`:188`)/`version` | todas |
| `src/data/seed.ts` | papéis `Admin Forzy`/`TI-Governança`/`Usuário Cliente`; `HTREE` p/ 8 níveis; `Asset.clienteId?` | 01,02,06 |
| `src/lib/types.ts` | `AuditEvent`, `RbacScope`/`ScopeMatrix`, `TraceLink`, `NavEdge`/`NavNode`, `GovSettings` | todas |
| `src/auth/rbac.ts` | `canScoped(...)`; `firstAllowedRoute(rbac,papel)` | 05,06 |
| `src/store/derive.ts` | `pathToNode(hierarchy,id)`; `nodeMeta(id)` | 01,02 |
| `src/data/traceability.ts` *(novo)* | `SEED_TRACEABILITY`/`US_COVERAGE` | 01,04 |
| `src/data/navGraph.ts` *(novo)* | `nodes`+`edges` + teste de fumaça | 05 |
| `src/components/governanca/*` *(novos)* | `AuditTrail`, `NodeMetaPanel`, `TagTraceCard`, `TraceableValue`, selo de procedência | 02,03,04,06 |
| `src/routes.tsx` | montar `RequireAuth`; rotas `/governanca/auditoria` e `/navegacao`; `Gate` em `/mapa`/telemetria; landing dinâmico | 05,06 |

---

### 6.9 A governança como espinha ambiente de TODAS as telas

Os quatro pilares **não ficam confinados ao módulo Governança** — aparecem em toda tela:

| Pilar | Onde mora | Como aparece em TODA tela |
|---|---|---|
| **Hierarquia** | `Hierarquia.tsx` | o **breadcrumb É a matriz**: empresa→…→ativo, clicável, com escopo herdado (`pathToNode`) |
| **Dicionário** | `Dicionario.tsx` + `SEED_DICTIONARY` | **todo número rastreia ao Dicionário**: hover/click abre campo/unidade/faixa/limite/sensor/direção (`<TraceableValue>`) |
| **RBAC** | `rbac.ts` + `RBAC.tsx` | **toda ação é gated**: `useCan(modulo,nivel)` decide o render de botões; rota protegida por `Gate` |
| **D-I-C-I** | `DICI.tsx` + `SEED_DICI` | **todo artefato carrega seu ciclo**: `<DiciBadge assetId/>` no detalhe do ativo e no cadastro |

**Convenção única de degradação por permissão** (já aplicada caso-a-caso; documentar como padrão):

| Nível | Render | Selo |
|---|---|---|
| `full` | editável (inputs/cliques ativos) | "✎ Edição habilitada" |
| `read` | somente-leitura (spans/badges) | `Lock` "Somente leitura" |
| `none` | oculto no Sidebar; `Gate` "Acesso negado" | `ShieldAlert` |

> **Critério de pronto da camada (cinco invariantes).** Todo número de governança rastreia a uma fonte do store; todo card leva a um destino real e gated; **toda escrita gera um `AuditEvent`**; todo percurso é provado alcançável por papel; e a honestidade do modelo SIMULADO está visível onde a IA decide. Quando esses cinco valerem, a Governança deixa de "parecer" central e **é** central — fechando a US-13 ponta a ponta.

**Ordem de implementação (máximo desbloqueio, mínimo retrabalho):** (1) montar `RequireAuth`; (2) `auditLog`+`logAudit` nas 5 ações; (3) reconciliar papéis no seed; (4) `pathToNode` (breadcrumb-matriz/escopo/NodeMetaPanel); depois conformidade por planta derivada + `TagTraceCard`/limite efetivo; e por fim selo SIMULADO + abas DIKW, `navGraph`, escopo/tenancy e `<TraceableValue>` transversal.


---

## BLOCO 7 — Recomendações finais de melhoria do design

> **Síntese das 3 rodadas de refino** (governança transversal · 14 telas operacionais · auditoria de coerência) destilada
> em recomendações acionáveis. Voz de Lead Product Designer / Systems Designer / Information Architect.
> Princípio condutor confirmado em todas as fontes: **o PREDICTA já é um produto vivo e governado** — o que falta
> não é construir do zero, é **aplicar consistentemente** o que já existe (gating RBAC, honestidade de IA,
> rastreabilidade ao Dicionário) e **expor na UI** o que hoje só vive no engine, no seed e no system prompt.
> Quase todo P0 é "ligar fio existente", não inventar.
>
> Fontes destiladas: `telas/COERENCIA.md` (9 eixos de inconsistência) · `telas/README.md` (backlog de 82 itens) ·
> `governanca/README.md` (52 itens de governança) · `01-design-system.md` (5 estados + `AIConfidence`) ·
> `README.md` (roadmap P0 por tema A–H) · `governanca/RASTREABILIDADE.md` (grafo mestre US↔código).

---

### Índice do bloco

- (a) Melhorias de **CONSISTÊNCIA** — padronizações entre módulos
- (b) Oportunidades de **SIMPLIFICAÇÃO**
- (c) Como **APROFUNDAR a experiência do TÉCNICO de manutenção**
- (d) Melhorias para a **APRESENTAÇÃO VISUAL no Figma**
- (e) **COMPONENTES** que devem virar **PADRÃO do design system**
- (f) **ROADMAP P0 / P1 / P2 consolidado** (tabela única priorizada)

---

### (a) Melhorias de CONSISTÊNCIA — um sistema, não 14 telas que se parecem

A auditoria de coerência identificou **nove dívidas transversais** que se repetem em ≥3 telas e quebram a percepção de
"produto único". A regra-mãe é uma só: **cada padrão vira um componente compartilhado** em `src/components/ui-shared/`
(ou helper em `src/lib`/`src/store`), consumido por todas as telas, em vez de reimplementado por tela.

### a.1 — Breadcrumb = Matriz de Hierarquia (hoje cumprido em zero telas)

| Estado atual | Padrão único proposto |
|---|---|
| As 14 telas usam `usePageChrome` com rótulos fixos/encurtados (`["Ativos","Lista de Ativos", asset.id]`); nenhuma projeta `empresa → planta → área → sistema → ativo`. Detalhe de alerta/assistente nem herda a trilha do ativo de origem. | Helper **`trilhaHierarquia(assetId)`** (lê `HTREE`/`pathToNode`) retorna `[empresa, planta, área, sistema, TAG]` clicável; **`trilhaEscopo(papel)`** para telas de frota reflete a subárvore autorizada. `usePageChrome` passa a **receber sempre trilha derivada da Matriz**, nunca literais. O componente `BC` renderiza igual — só muda a fonte. Telas de detalhe **herdam a trilha do ativo de origem**. |

**Arquivos:** `src/store/derive.ts` (`pathToNode`/`trilhaHierarquia`/`trilhaEscopo`) · `src/components/layout/chrome.tsx`
(aceitar `BreadcrumbNode[]{label,to}` em vez de `string[]`) · `ui-shared` (`BC` navegável) · todas as 14 páginas.

### a.2 — Badges de severidade / status / criticidade (quatro gramáticas → uma)

Hoje convivem: `Badge` com **classes Tailwind interpoladas quebradas** (`bg-[${C.green}]/10` — não renderiza em runtime)
ao lado de `SevBadge` com classes estáticas; cores de status reimplementadas por tela (`statusColor` no Painel, `sc` no Mapa,
`SEV_COLOR` no Alerta). **Eixo semântico → componente único:**

| Eixo semântico | Componente único | Cores (paleta C) |
|---|---|---|
| Status do ativo (normal/atenção/crítico/offline) | `Badge s={status}` **corrigido** (classes estáticas por chave) | green / yellow / red / slate |
| Severidade do alerta (crítico/alto/médio/baixo) | `SevBadge s={sev}` | red / orange / yellow / slate |
| Status do ciclo (aprovado/em_revisão/pendente) | `Badge` (já cobre) | emerald / yellow / slate |
| Criticidade do ativo (Crítica/Alta/Média/Baixa) | **`CritBadge` (novo)** via `corDaCriticidade` | orange / orange / yellow / slate |
| Origem do alerta (regra / modelo / manual) | **`OrigemBadge` (novo)** | ícone+chip distinguindo fato medido × predição |
| Dot de status (mapa/painel/cards) | **`StatusDot` (novo)** via `corDoStatus` | mapa de status |

**Regra dura:** toda cor de status sai de `corDoStatus`/`corDaSaude`/`corDaCriticidade` (`theme.ts`); **proibir maps locais**.

### a.3 — Filtros e busca (gramática única + KPIs clicáveis)

Cada tela inventa sua própria barra; selects decorativos (Lista de Ativos `.slice(0,3)` sem `onChange`), "Filtrar" inerte
(Mapa), KPIs passivos (Dashboard/Alertas). **Padrão único `<FilterBar>`:** busca *debounced* + **filtros hierárquicos
encadeados** (Planta → Área → Sistema, default = escopo do papel) + chips multi-seleção (status/severidade/origem/tipo) +
**chips de filtro ativo removíveis** + ordenação. Invariante: **KPIs e contadores são sempre clicáveis = filtros**
(clicar "Críticos" filtra a tabela/canvas) e **Export sempre respeita o resultado filtrado**, nunca a base crua.

### a.4 — Cabeçalho e sistema de abas do ativo

O shell `AtivoDetail.tsx` (header + 5 abas) é herdado por Overview/Telemetria/Saúde/Gêmeo/Técnico — **bom** — mas cada aba
define seu próprio guard de "sem twin" (três frases, três layouts para o mesmo estado offline) e seu próprio `SH`/grid.
**Padrão:** wrapper **`<AtivoTab>`** centraliza guard de `twin` (empty-state único), `SH` e grid base; **header em stat-strip
de duas linhas** — (1) identidade (ícone, nome, TAG, `Badge` status, `modoCritico`, selo D-I-C-I) + (2) KPIs **rastreáveis**
(Saúde, RUL, e Disponibilidade **só se derivada de uptime real ou rotulada "estimativa"**); empty-state offline único
**`<TwinOffline>`** (último valor conhecido + idade de `syncedAt` + CTA de diagnóstico).

### a.5 — Família única de estados (loading / empty / error / realtime / sem-permissão)

Hoje: empty é tabela fantasma (Lista), frase única (Ativo), neutro (Alertas) ou inexistente (Mapa); error só tratado no
Assistente e no OCR; realtime sem marcação padronizada apesar de `syncedAt`/`residual` existirem. **Padrão:** família em
`ui-shared/states.tsx` — `<EmptyState>`, `<ErrorState>`, `<NoPermission>`, `<LiveTag syncedAt>` (pulso steel, "há Ns",
esmaece quando *stale*, vira "PAUSADO" âmbar em `settings.paused`), `<TwinOffline>` + **usar o `Skeleton` que já existe**.
Regra: **distinguir sempre** "filtro sem resultado" de "vazio positivo" (fila zerada = verde) e "offline" de "janela sem
dados" de "não comissionado" (D-I-C-I).

### a.6 — Padrão único de output de IA (a inconsistência #1 do produto, recorre em 9 telas)

Sete a nove telas pedem o mesmo bloco "valor + horizonte + confiança + explicação + nota de honestidade" e **cada uma propõe
criá-lo do zero**. A nota de honestidade hoje vive só no system prompt (invisível) ou como prosa solta. **Padrão:** envelope
canônico **`AIConfidence`** (ver §e) reutilizado em Saúde & IA, Gêmeo, Dashboard (Projeção IA), Alertas-modelo, Telemetria
(overlay baseline), Mapa (tooltip) e Cadastros. **Nenhuma predição pode aparecer "nua".**

### a.7 — Glossário e tokens canônicos

Identificador do ativo aparece como "Tag/TAG/ID/Identificador"; "RUL" é confundido com "Próx. Manut." (que é a *data
derivada*); unidades hardcoded em labels (`"Temperatura (°C)"` cravado) em vez de virem do Dicionário (`TAG_UNIT`). **Padrão:**
`src/lib/glossario.ts` (constantes `LABELS`, `HONESTY_NOTE`, `TAG_LABEL`/`TAG_UNIT`); **zero hex fora de `theme.ts`**;
**unidade sempre do Dicionário**; helpers `<Num>`/`<Mono>` para aplicar Rajdhani/JetBrains de forma uniforme. Unificar também
os **dois sistemas de paleta divergentes** (`C` em `theme.ts` `#07101E`/`#0C1829` vs tokens CSS `#080C14`/`#0D1829`).

---

### (b) Oportunidades de SIMPLIFICAÇÃO

> Tese: o produto sofre menos de "falta feature" e mais de **superfície redundante e botões mortos**. Simplificar = remover
> o que não funciona, fundir o que se repete, e deixar o estado vivo falar por si.

| # | Oportunidade | O que simplificar | Onde |
|---|---|---|---|
| S1 | **Matar controles decorativos** | Remover/ativar: selects sem `onChange` (Lista), "Filtrar" inerte (Mapa), `RefreshCw`/"Atualizar"/"Ao vivo" sem handler (Dashboard/Telemetria/Painel), paginação fake `[1,2,3,…,12]` (Lista). Botão morto é pior que ausência: promete e não entrega. | `AtivosLista`, `MapaPlanta`, `Dashboard`, `Telemetria`, `Painel` |
| S2 | **Um envelope de IA, não sete** | Em vez de 7 implementações de "card de predição", **um** `AIConfidence`. Reduz superfície de manutenção e elimina divergências (ex.: nota de honestidade que muda de frase por tela). | `ui-shared/ai/*` |
| S3 | **Uma fonte de cor de status** | Eliminar `statusColor`, `sc`, `SEV_COLOR`, `bg-[${...}]` → tudo deriva de `theme.ts`. Menos código, zero drift. | `MapaPlanta`, `Painel`, `AlertaDetalhe`, `ui-shared` |
| S4 | **Fundir banners redundantes no OCR** | Banner de status + "Campos Detectados" → **um painel único de Resultado da Leitura** com aplicar-por-campo. Hoje o usuário lê a mesma informação em dois lugares. | `CadastroOCR.tsx` (B3/B4) |
| S5 | **Recomendação + ficha do modelo deduplicadas** | `RecommendationCard`/`ModelCard` hoje duplicados entre `SaudeIA` e `GemeoDigital` com divergências. Um componente, Δ-RUL pré-calculado (migrar `recEffect`). | `SaudeIA`, `GemeoDigital`, `ui-shared` |
| S6 | **Taxonomia de severidade única** | Dashboard funde "médio+baixo" na barra (3 cat.) mas usa 4 na pizza; Alertas chama "Médios" o que agrega médio+baixo. **Os números não fecham entre blocos** — alinhar em 4 categorias canônicas. | `derive.ts`, `Dashboard.tsx`, `AlertasLista.tsx` |
| S7 | **Selos por permissão, não telas duplicadas** | Em vez de variantes de tela por papel, **degradação por nível** (`full` editável / `read` somente-leitura+`Lock` / `none` oculto+`Gate`). Uma tela, três níveis de render. | convenção transversal |
| S8 | **Login honesto e enxuto** | Remover KPIs hardcoded (247/5/97.4%/2.1h que o seed de 10 ativos contradiz) e credenciais demo pré-preenchidas sem flag de ambiente. | `Login.tsx` |
| S9 | **`SegmentedControl` único** | Unificar os seletores de janela/segmento espalhados (Telemetria, horizontes) num só controle reutilizável. | `ui-shared`, `Telemetria.tsx` |

---

### (c) Aprofundar a experiência do TÉCNICO de manutenção

> O **Técnico de Manutenção** é a persona de chão de fábrica (`Alertas:full`, `Assistente:full`, demais `read`/`none`).
> Seu job é uma **fila de ordens**, não um dashboard executivo. Hoje a UI o atende mal em três frentes: a *default view*
> errada, a fila que não é fila, e as ações de escrita que ou não existem ou não são governadas.

### c.1 — Primeiro minuto: cair na fila certa

- **Default view = `/alertas`**, não `/dashboard`. Login hoje sempre vai a `/dashboard`; para o Técnico (e pior, para o
  Operador Campo com `Dashboard:none`) isso é um beco. Implementar `firstAllowedRoute(rbac, papel)` e a default view por papel.
- **Painel Operacional deve depender do módulo `Ativos`, não `Dashboard`** — hoje o Sidebar esconde a tela de *war room* mais
  útil do chão de fábrica justamente de quem tem `Dashboard:none`.

### c.2 — Converter listas em filas de manutenção

- **Surfacer RUL e modo crítico** como colunas/badges na Lista de Ativos e no Painel (hoje descartados pelo `AssetView`).
- **Ordenar por severidade/RUL** com faixa de prioridade fixa (triagem da frota). A lista deixa de ser inventário e vira
  fila acionável.
- **KPIs e contadores viram filtros** (clicar "Críticos"/"Em atenção" filtra). Implementar o **modo List do Painel** (o toggle
  existe no estado, não renderiza).

### c.3 — Ações de campo reais, governadas e auditáveis (fecha US-11 + US-13)

> **Este é o GAP P0 transversal mais crítico para o Técnico.** `applyMaintenance`, criar OS, registrar manutenção e ações de
> alerta hoje **não passam por `can()`/`useCan()`**. Pior: o Assistente cria OS (`create_work_order`) sem checar `Alertas:full`.

- **"Próximas Ações" acionáveis** na Visão Geral: badge de prioridade + "Registrar manutenção" / "Criar OS"
  (`recommendationsFor`), **gated por `Ativos:full`** — em `read`, botão desabilitado + tooltip de permissão (nunca esconder
  silenciosamente uma ação esperada).
- **OS real** com drawer pré-preenchido + relação OS↔alerta que **resolve ao concluir**, e **evento auditável D-I-C-I**
  (RUL antes/depois). Conecta o motor ao ciclo do ativo.
- **`executeTool` do Assistente consulta `can()` por ferramenta** antes de executar; nega com mensagem honesta e **remove a
  tool da lista** quando o papel só tem `read`.

### c.4 — Telemetria como ferramenta de diagnóstico, não vitrine

- **Cobrir as 6 grandezas** (rpm, press, óleo — não só temp/vib/corrente) e exibir **valor atual** no header de cada card.
- **Plotar limites** de atenção + crítico + faixa operacional respeitando `tag.direcao`, e **colorir leituras por banda do
  Dicionário** — o Técnico vê de relance o que está fora.
- **Frescura do dado**: badge "há Ns" (`syncedAt`), esmaecer card *stale*, "Ao vivo" vira toggle de pausa real.

### c.5 — A ponte para o Assistente (US-12) a partir da triagem

- Ação **"Investigar com Assistente"** a partir do alerta/lista, passando `{assetId, tag, modoCritico}` — hoje a ponte só
  existe a partir do Detalhe do Alerta. É a aresta de maior alavancagem para o Técnico fechar US-12 já na triagem.
- **Tornar o painel do Assistente navegável**: IDs e alertas citados viram links (hoje são texto = beco sem saída). O Técnico
  precisa saltar do alerta citado de volta ao detalhe.

---

### (d) Melhorias para a APRESENTAÇÃO VISUAL no Figma

> Objetivo: o documento final + Figma devem **demonstrar o sistema, não só telas**. As recomendações abaixo tornam a
> apresentação fiel ao produto vivo e legível como blueprint.

| # | Recomendação de apresentação | Por quê |
|---|---|---|
| F1 | **Montar a biblioteca de componentes como *página-índice* no Figma** (`AIConfidence`, `TraceableValue`, `LiveTag`, `AssetHeader+Tabs`, `HierarchyBreadcrumb`, `SevBadge`/`Badge`/`CritBadge`/`OrigemBadge`, `EmptyState`/`ErrorState`) com todas as variantes/estados lado a lado. | Mostra que o produto é um *sistema* — refletir 1:1 o `ui-shared`. |
| F2 | **Documentar os 5 estados de cada bloco de dados** (loading via Skeleton · empty · error · tempo real · sem-permissão) como *variants* navegáveis. | Hoje os estados são ad-hoc; o Figma deve prová-los como contrato. |
| F3 | **Anatomia anotada do `AIConfidence`** (valor · horizonte · confiança · explicação · selo SIMULADO) com *callouts* explicando a honestidade. | É a tese central de credibilidade — merece destaque visual. |
| F4 | **Breadcrumb hierárquico completo** desenhado como componente (empresa→planta→área→sistema→ativo, com escopo por papel destacado). | Materializa a Matriz; hoje é a promessa cumprida em zero telas. |
| F5 | **Drill de rastreabilidade (`TraceableValue`)** prototipado: clicar um número abre o popover com campo/unidade/faixa/limite/sensor/direção. | Torna inspecionável "todo número → Dicionário". |
| F6 | **Tabela de personas × default view × RBAC** como *slide* de abertura da apresentação. | Explica modularidade (US-1) e o "primeiro minuto" por papel. |
| F7 | **Unificar tokens de cor no Figma com a paleta C única** (resolver a divergência `#07101E`↔`#080C14`); aplicar tipografia Rajdhani/JetBrains Mono/Inter como *text styles* nomeados. | Evita drift entre Figma, código e este documento. |
| F8 | **Grids responsivos demonstrados** (4→2→1 col; tabela densa → cards no mobile; sidebar → drawer) e **alturas de gráfico por token**. | Hoje há `grid-cols-N` e alturas fixas divergentes por tela. |
| F9 | **Selo D-I-C-I e selo de procedência do modelo SIMULADO** como *stickers* reutilizáveis anexáveis a qualquer artefato. | Reforça a espinha de governança presente em toda tela. |
| F10 | **Contraste AA validado nos mockups** (`slate #6D8196` sobre `bgCard` fica ~4.0:1 < 4.5:1 — usar `textSub #8FA8BC` para texto <14px). | Acessibilidade como atributo de qualidade visível. |

---

### (e) COMPONENTES que devem virar PADRÃO do design system

> Mapa consolidado dos componentes a extrair. Cada um **substitui** implementações espalhadas e **resolve** eixos da
> auditoria de coerência. Esta é a "Onda 0" de fundações compartilhadas que desbloqueia o resto do backlog.

| Componente | Arquivo proposto | Resolve | Substitui (hoje espalhado em) |
|---|---|---|---|
| **`AIConfidence`** (envelope: valor + horizonte `HORIZONS` + `ConfidenceTag` + `ExplainabilityList` + `HonestyNote`/selo SIMULADO) | `ui-shared/ai/AIConfidence.tsx` | output único de IA; honestidade visível | duplicação Saúde↔Gêmeo + ausência nas 7 demais telas |
| **`TraceableValue`** (número → popover campo/unidade/faixa/limite/sensor/direção, lendo `s.dictionary`) | `components/governanca/TraceableValue.tsx` | "todo número rastreia ao Dicionário" inspecionável na UI | rastreabilidade hoje tácita no seed/engine |
| **`HierarchyBreadcrumb`** (`BC` navegável alimentado por `pathToNode`/`trilhaHierarquia` + escopo por papel) | `ui-shared` + `chrome.tsx` + `derive.ts` | breadcrumb = Matriz de Hierarquia | breadcrumbs literais em 14 telas |
| **`EmptyState` / `ErrorState` / `NoPermission` / `LiveTag` / `TwinOffline`** (família de estados) | `ui-shared/states.tsx` | os 5 estados padronizados; realtime de 1ª classe | empty/error ad-hoc; "Carregando…"/"Nenhum…" soltos |
| **`AssetHeader + Tabs` (`AtivoTab`)** (stat-strip rastreável + guard de twin único) | `ui-shared/AtivoTab.tsx` + `AtivoDetail.tsx` | coerência de header/abas; empty offline único | 3 guards de twin divergentes (Overview/Telemetria/Saúde) |
| **`SevBadge` unificado + `Badge` corrigido + `CritBadge` + `StatusDot` + `OrigemBadge`** | `ui-shared/index.tsx` + `theme.ts` | badges de status/severidade/criticidade/origem coesos | `Badge` quebrado (`bg-[${}]`), `statusColor`, `sc`, `SEV_COLOR` |
| **`FilterBar` + `useHierarchyFilter`** | `ui-shared/FilterBar.tsx` + `store/hooks.ts` | gramática única de filtro hierárquico + KPIs clicáveis | selects decorativos, "Filtrar" inerte, KPIs passivos |
| **`GatedButton`** (encapsula `useCan` + estado desabilitado + tooltip de permissão) | `ui-shared/GatedButton.tsx` | toda ação de escrita gated, com feedback honesto | botões mutadores sem `useCan` em 5+ telas |
| **`AuditTrail`** (últimas N mudanças de governança) + slice `auditLog`/`logAudit` | `components/governanca/AuditTrail.tsx` + `useStore.ts` | trilha de auditoria das ações de governança | **nenhuma** mutação de governança registrada hoje |
| **`DiciBadge`** (selo D-I-C-I: 4 micro-badges de `DiciRow`) + selo procedência do modelo SIMULADO | `ui-shared` + `prediction.ts` | ciclo do ativo + honestidade do modelo anexáveis | selo só no system prompt / header de `prediction.ts` |
| **`UpsellModule`** (módulo não-contratado: cadeado + "Falar com a Forzy") + flag `contratados` | `ui-shared` + `seed.ts`/store | separar "não-contratado" de "sem-permissão" (US-1) | Sidebar trata ambos como "some o item" |
| **`AssetCard` + `PlantCanvas`** (card de ativo / canvas SVG reutilizáveis) | `ui-shared` | dot/card de status reimplementado por tela | card inline (Painel), SVG inline (Mapa) |

---

### (f) ROADMAP P0 / P1 / P2 CONSOLIDADO

> Backlog único deduplicado das 3 rodadas (82 itens operacionais + 52 de governança + recomendações do design system),
> agrupado por **tema** e priorizado. **Esforço:** B(aixo) · M(édio) · A(lto). A ordem dentro de P0 respeita dependências:
> **fundações compartilhadas → tampar vazamentos de RBAC → padrão de IA → rastreabilidade**.
>
> **Os quatro itens de topo (em destaque) são os que esta priorização exige fechar primeiro:** o **GAP de RBAC em ações de
> escrita**, a **rastreabilidade `<TraceableValue>`**, o componente **`AIConfidence`** e a **trilha de auditoria**.

### P0 — Credibilidade de governança e honestidade (fechar primeiro)

| # | Item | Tema | Pri | Esf | Arquivo(s) |
|---|---|---|:--:|:--:|---|
| **P0-1** | **GAP de RBAC em ações de ESCRITA** — gatear por `useCan(modulo,"full")`: `applyMaintenance`, criar OS, registrar manutenção, ações de alerta (Resolver/Ack/Reabrir/Comentar) e `create_work_order` no `executeTool` do Assistente; `<GatedButton>` com estado desabilitado + tooltip | RBAC | **P0** | B–M | `SaudeIA.tsx`, `AtivoDetail.tsx`, `AlertaDetalhe.tsx`, `ai/tools.ts`, `ui-shared/GatedButton.tsx` |
| **P0-2** | **Rastreabilidade `<TraceableValue>`** — número → popover campo/unidade/faixa/limite/sensor/direção, lendo `s.dictionary`; aplicar em KPIs, alertas, detalhe do ativo, leituras | Rastreab. | **P0** | M | `components/governanca/TraceableValue.tsx` |
| **P0-3** | **Componente `AIConfidence`** — adicionar `confianca` ao `PredictionModel` (deriva de `twin.residual`); envelope único valor+horizonte+confiança+explicação+selo SIMULADO; aplicar em Saúde&IA, Gêmeo, Dashboard, Alertas-modelo, Telemetria, Mapa, OCR | IA | **P0** | M–A | `engine/prediction.ts`, `ui-shared/ai/*` |
| **P0-4** | **Trilha de AUDITORIA** — slice `auditLog` + wrapper `logAudit` nas 5 ações (`setRbac`/`setDici`/`upsertTag`/`removeTag`/`setHierarchy`) + tela `/governanca/auditoria` (quem/quando/de→para) | Auditoria | **P0** | M | `useStore.ts:140-175`, `Auditoria.tsx` (novo), `routes.tsx` |
| P0-5 | **Montar `RequireAuth` + `<Gate>` nas rotas faltantes** (`/assistente`, `/assistente/:id`, `/mapa`, `/operacional`); sem login forçado o RBAC é decorativo | RBAC | P0 | B | `routes.tsx`, `auth/RequireAuth.tsx` |
| P0-6 | **Selo de honestidade SIMULADO persistente na UI** (Assistente, Dashboard Projeção IA, trilha do ativo, Alertas-modelo) — deriva de `predictionModel.name/metodo`; troca sozinho com modelo treinado | IA | P0 | B | `Assistente.tsx`, `Dashboard.tsx`, `prediction.ts` |
| P0-7 | **Breadcrumb hierárquico navegável** — `pathToNode`/`trilhaHierarquia` + `BC` clicável com escopo por papel | Hierarquia | P0 | M | `derive.ts`, `chrome.tsx`, `ui-shared` |
| P0-8 | **Corrigir `Badge` (classes estáticas) + centralizar cores de status** em `theme.ts`; eliminar `statusColor`/`sc`/`SEV_COLOR`/`bg-[${}]` | Consistência | P0 | B | `ui-shared/index.tsx`, `MapaPlanta.tsx`, `Painel.tsx`, `AlertaDetalhe.tsx` |
| P0-9 | **`AVAIL`/Disponibilidade rotulada como estimativa** (heurística por status, não fato medido) ou derivada de uptime real | Consistência | P0 | B | `derive.ts`, `AtivoDetail.tsx`, `Dashboard.tsx` |
| P0-10 | **Filtros reais e hierárquicos** na Lista de Ativos (matar selects decorativos `.slice(0,3)`) + contadores do Painel viram filtros + modo List | Navegação | P0 | M–A | `AtivosLista.tsx`, `Painel.tsx` |
| P0-11 | **Surfacer RUL/modo crítico + ordenar por urgência** (Lista e Painel) — converte inventário em fila de manutenção | Técnico | P0 | M | `derive.ts`, `AtivosLista.tsx`, `Painel.tsx` |
| P0-12 | **"Próximas Ações" acionáveis** na Visão Geral (Registrar manutenção / Criar OS, gated) — fecha US-11 | Técnico | P0 | A | `Overview.tsx`, `recommendations.ts` |
| P0-13 | **Card de predição honesto** para alertas `origem:"modelo"` + `ReferenceLine` do limite no mini-gráfico do alerta | IA | P0 | M | `AlertaDetalhe.tsx` |
| P0-14 | **Cobrir 6 grandezas na Telemetria** + valor atual no header + limites/banda do Dicionário (`tag.direcao`) | Realtime | P0 | B–M | `Telemetria.tsx` |
| P0-15 | **Reconciliar papéis** (`Admin Forzy`/`TI-Governança`/`Usuário Cliente`) + **default view por papel** (`firstAllowedRoute`); Painel depende de `Ativos` não `Dashboard` | RBAC/US-1 | P0 | M | `seed.ts`, `routes.tsx`, `Sidebar.tsx`, `Login.tsx` |
| P0-16 | **Cadastro ancorado na Matriz** (selects encadeados Planta/Área) + início do ciclo D-I-C-I na criação + trava de confiança OCR <90% | Governança | P0 | M–A | `CadastroManual.tsx`, `CadastroOCR.tsx`, `createAsset.ts` |

### P1 — Coerência operacional e materialização da espinha

| # | Item | Tema | Pri | Esf | Arquivo(s) |
|---|---|---|:--:|:--:|---|
| P1-1 | **Família de estados** `EmptyState`/`ErrorState`/`NoPermission`/`LiveTag`/`TwinOffline` + usar `Skeleton` | Estados | P1 | M | `ui-shared/states.tsx` |
| P1-2 | **`<AtivoTab>` + header em stat-strip** rastreável (guard de twin único) | Consistência | P1 | A | `AtivoDetail.tsx`, `ui-shared/AtivoTab.tsx` |
| P1-3 | **`<FilterBar>` + `useHierarchyFilter`** compartilhado (Lista/Painel/Alertas/Mapa) + **export respeita filtro** | Navegação | P1 | M | `ui-shared/FilterBar.tsx`, `store/hooks.ts`, `lib/csv.ts` |
| P1-4 | **`OrigemBadge`** (regra×modelo×manual) + coluna/flag na Lista de Alertas + bloco "Origem & Rastreabilidade" no Detalhe | Rastreab. | P1 | B–M | `AlertasLista.tsx`, `AlertaDetalhe.tsx`, `ui-shared` |
| P1-5 | **"Investigar com Assistente"** a partir de alerta/lista `{assetId,tag,modoCritico}` + painel do Assistente navegável (links) | Navegação | P1 | M | `AlertasLista.tsx`, `Assistente.tsx` |
| P1-6 | **OS real** (drawer + relação OS↔alerta, resolve ao concluir) + `Alert.eventos[]` auditável (autor/timestamp) | Técnico | P1 | A | `AlertaDetalhe.tsx`, `types.ts`, `useStore.ts` |
| P1-7 | **Baseline (US-8) e Anomalia (US-9) com bloco próprio** (hoje dissolvidos na curva) + overlay de baseline na Telemetria | IA | P1 | A | `SaudeIA.tsx`, `Telemetria.tsx`, `engine/*` |
| P1-8 | **Frescura do dado** (`syncedAt`, "há Ns", esmaecer stale, "Ao vivo" → toggle) + refletir `settings.paused` no Painel | Realtime | P1 | M | `Painel.tsx`, `Telemetria.tsx`, `AtivosLista.tsx` |
| P1-9 | **`NodeMetaPanel` na Hierarquia** + vínculos do nó à operação (gated) + `HTREE` 8 níveis | Hierarquia | P1 | M–A | `Hierarquia.tsx`, `derive.ts`, `seed.ts` |
| P1-10 | **`TagTraceCard` + limite EFETIVO por ativo** + abas Ciclo do Ativo / Fluxo DIKW no D-I-C-I | Rastreab. | P1 | M–A | `Dicionario.tsx`, `DICI.tsx`, `prediction.ts` |
| P1-11 | **Unidades do Dicionário** (matar `"°C"` hardcoded) + `<Num>`/`<Mono>` + corrigir FLA (`flaFromKw`) | Consistência | P1 | B–M | `Telemetria.tsx`, `Tecnico.tsx`, `lib/glossario.ts` |
| P1-12 | **Mapa derivado da Hierarquia** (elimina drift mapa↔cadastro) + marcador codifica saúde/criticidade + tooltip | US-6 | P1 | M–A | `MapaPlanta.tsx`, `derive.ts` |
| P1-13 | **Δ-RUL pré-calculado** nas recomendações + `RecommendationCard`/`ModelCard` únicos (dedup Saúde↔Gêmeo) | IA | P1 | M | `SaudeIA.tsx`, `GemeoDigital.tsx`, `ui-shared` |
| P1-14 | **Empty/erro/validação** no Cadastro (validação por etapa, Sensores ligados ao Dicionário) + handoff OCR→Manual via route state | Onboarding | P1 | M | `CadastroManual.tsx`, `CadastroOCR.tsx` |
| P1-15 | **`UpsellModule` + flag `contratados`** (separar não-contratado de sem-permissão, US-1) | US-1 | P1 | M | `Sidebar.tsx`, `seed.ts`, `ui-shared` |

### P2 — Polimento, densidade e robustez

| # | Item | Tema | Pri | Esf | Arquivo(s) |
|---|---|---|:--:|:--:|---|
| P2-1 | **`AssetCard` + `PlantCanvas`** reutilizáveis + grids responsivos (`auto-fill/minmax`) + sidebar→drawer mobile | Visual | P2 | M | `Painel.tsx`, `MapaPlanta.tsx`, `theme.ts`, `AppShell` |
| P2-2 | **Sincronização cruzada mapa↔lista** (hover compartilhado) + marcador fantasma D-I-C-I sem twin | Mapa | P2 | M | `MapaPlanta.tsx`, `derive.ts` |
| P2-3 | **Unificar paleta** `C`↔tokens CSS (`#07101E`↔`#080C14`) + tokens de espaçamento nomeados + auditoria de contraste AA | Visual | P2 | B | `theme.ts`, `theme.css` |
| P2-4 | **Persistência leve de conversa** por ativo no Assistente + render markdown completo + tratamento de erro diferenciado (rede/RBAC/limite) | Assistente | P2 | B–M | `Assistente.tsx`, `ai/assistant.ts` |
| P2-5 | **Sparklines inline** (saúde/temp) no card do Painel/Overview (US-7 sem clique) + seletor de tag | Realtime | P2 | M | `Painel.tsx`, `Overview.tsx` |
| P2-6 | **Escopo hierárquico nas agregações** (navegação governada) + gating de atalhos do Dashboard pelo destino | Governança | P2 | A | `derive.ts`, `Dashboard.tsx` |
| P2-7 | **Heatmap RBAC + diff de papéis** + simulador de Navegação Governada exportável + `navGraph.ts` com teste de fumaça | Governança | P2 | M | `RBAC.tsx`, `data/navGraph.ts` |
| P2-8 | **Procedência Manual/OCR persistida** + dado real vs fabricado na aba Técnico (IP55/380V hard-coded) | Onboarding | P2 | M | `Tecnico.tsx`, `createAsset.ts`, `types.ts` |
| P2-9 | **Painel de comparação** na Telemetria (2 grandezas / janela vs janela) + tira-resumo da janela | Realtime | P2 | A | `Telemetria.tsx` |
| P2-10 | **Visão em cards (perfil Cliente, US-2)** toggle tabela↔cards na Lista + confirmação ao cancelar cadastro dirty | Visual | P2 | M | `AtivosLista.tsx`, `CadastroManual.tsx` |

---

### Critério de pronto (invariantes que provam o design consolidado)

Quando estes cinco invariantes valerem, o PREDICTA deixa de "parecer" coeso e governado e **é**:

1. **Toda ação de escrita é gated** por `useCan`, com feedback honesto em `read` (P0-1, P0-5).
2. **Todo número rastreia ao Dicionário** de forma inspecionável (`TraceableValue`, P0-2).
3. **Nenhuma predição aparece "nua"** — sempre com confiança + explicação + selo SIMULADO (`AIConfidence`, P0-3/P0-6).
4. **Toda mutação de governança gera um `AuditEvent`** (trilha de auditoria, P0-4).
5. **Todo breadcrumb materializa a Matriz** e aplica o escopo do papel (P0-7).


---

## Anexos — specs detalhadas

Os documentos abaixo são as fontes de detalhe completo de cada tela e de cada domínio de governança. Este documento final os costura e sintetiza; consulte-os quando precisar do detalhe integral (formato 11 seções nas telas operacionais, 9 seções nas de governança).

### Specs operacionais por tela (`docs/design/telas/`)

- [01 — Dashboard inicial](telas/01-dashboard.md)
- [02 — Painel Operacional](telas/02-painel-operacional.md)
- [03 — Lista de Ativos](telas/03-lista-ativos.md)
- [04 — Detalhe do Ativo: Visão Geral](telas/04-ativo-visao-geral.md)
- [05 — Detalhe do Ativo: Telemetria](telas/05-ativo-telemetria.md)
- [06 — Detalhe do Ativo: Saúde & IA](telas/06-ativo-saude-ia.md)
- [07 — Detalhe do Ativo: Dados Técnicos](telas/07-ativo-tecnico.md)
- [08 — Lista de Alertas](telas/08-alertas-lista.md)
- [09 — Detalhe do Alerta](telas/09-alerta-detalhe.md)
- [10 — Assistente conversacional (frota)](telas/10-assistente-conversacional.md)
- [11 — Assistente com contexto do ativo](telas/11-assistente-contexto-ativo.md)
- [12 — Cadastro Manual](telas/12-cadastro-manual.md)
- [13 — Cadastro por OCR da placa](telas/13-cadastro-ocr.md)
- [14 — Mapa Digital da Planta](telas/14-mapa-planta.md)
- [Índice operacional + matriz tela×US + mapa de navegação + backlog UX](telas/README.md)
- [Auditoria de coerência entre módulos](telas/COERENCIA.md)

### Specs de governança (`docs/design/governanca/`)

- [01 — Visão Geral](governanca/01-visao-geral.md)
- [02 — Matriz de Hierarquia](governanca/02-matriz-hierarquia.md)
- [03 — D-I-C-I / DIKW](governanca/03-dici.md)
- [04 — Dicionário de Rastreabilidade](governanca/04-dicionario-rastreabilidade.md)
- [05 — Dicionário de Rastreabilidade e Navegação](governanca/05-rastreabilidade-navegacao.md)
- [06 — RBAC / Permissões](governanca/06-rbac-permissoes.md)
- [Arquitetura de governança + modelo de dados + backlog](governanca/README.md)
- [Grafo mestre de rastreabilidade US↔módulo↔tela↔componente↔sensor↔modelo↔alerta↔ação↔perfil](governanca/RASTREABILIDADE.md)

### Specs de domínio da 1ª rodada (`docs/design/`)

- [00 — Governança: a espinha](00-governanca-espinha.md)
- [01 — Design System](01-design-system.md)
- [02 — Acesso e Operação](02-acesso-operacao.md)
- [03 — Trilha do Ativo](03-trilha-do-ativo.md)
- [04 — Onboarding do Ativo](04-onboarding-ativo.md)
- [05 — Alertas](05-alertas.md)
- [06 — Assistente IA](06-assistente-ia.md)
- [Índice mestre da 1ª rodada](README.md)
- [Resumo da marca](MARCA-RESUMO.md)
