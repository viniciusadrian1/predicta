# Tela 05 — Dicionário de Rastreabilidade e Navegação (PREDICTA · FORZY)

> Documento de design de produto. Esta é a **camada de NAVEGAÇÃO da rastreabilidade**: o grafo real de telas do Predicta (derivado de `src/routes.tsx` + `src/components/layout/Sidebar.tsx`), a tríade **AÇÃO ↔ MÓDULO ↔ DADO**, as **dependências de navegação** e o **mapeamento tela × requisito × user story**, tudo filtrado pela **navegação governada por RBAC**.
>
> **Distinção explícita da Tela 04:** a Tela 04 (*Dicionário de Rastreabilidade — Inventário*) é o **mapa de ENTIDADES e suas relações** (US ↔ módulo ↔ sensor ↔ modelo ↔ alerta ↔ perfil — *o que existe e como se conecta*). **Esta Tela 05 é o mapa de PERCURSO** (*de qual tela se chega a qual, por qual gatilho, e quem pode chegar lá*). A 04 responde "**de onde vem este número?**"; a 05 responde "**como eu navego do alerta até a ação, e meu papel deixa?**". As duas compartilham as mesmas entidades canônicas, mas projetam dimensões diferentes: 04 = grafo de **dependência de dado**; 05 = grafo de **fluxo de uso**.
>
> Cobre **US-13** (governança de acessos/dados/rastreabilidade — central), **US-1** (produto modular) e **US-2** (interface amigável/navegável).

---

## 1. Nome da tela

**Dicionário de Rastreabilidade e Navegação** — submódulo da Governança, rota proposta `/governanca/navegacao` (irmã de `/governanca/dicionario`, `/governanca/hierarquia`, `/governanca/dici`, `/governanca/rbac`).

Sinônimos internos: "Mapa de Navegação Governada", "Grafo de Fluxo", "Atlas de Percurso". No Sidebar (seção `GOVERNANÇA` em `Sidebar.tsx:42-48`) entraria como **"Navegação"** com ícone `Route`/`Workflow` (lucide), `modulo:"Governança"`.

---

## 2. Objetivo da tela

Tornar **explícita, visual e auditável** a malha de navegação do Predicta: cada rota declarada em `src/routes.tsx`, cada link do `Sidebar`, cada `navigate()` disparado por uma ação de página — e **quem alcança o quê** pela matriz RBAC. É a tela que converte a navegação implícita (espalhada por dezenas de `<NavLink>`, `<Link>` e `navigate(...)`) em um **artefato de governança de 1ª classe**: um grafo navegável + tabela de mapeamento que prova rastreabilidade tela↔requisito↔user story e expõe a "navegação governada".

### Estado atual no produto (o que JÁ EXISTE)

O Predicta **já tem uma topologia de navegação rica e governada — mas hoje ela é tácita**, derivável do código, nunca materializada como tela. Inventário do que existe:

| Capacidade de navegação | Onde vive hoje | Estado |
|---|---|---|
| **Tabela de rotas declarativa** (23 rotas, aninhamento `AppShell` → `AtivoDetail` → abas) | `src/routes.tsx:40-89` (`createBrowserRouter`) | Funcional. URLs reais; `index` redireciona `/` → `/dashboard`; `*` → `/dashboard` |
| **Navegação primária (Sidebar)** com 6 seções e `match(pathname)` exato | `src/components/layout/Sidebar.tsx:22-49` (`NAV`) | Funcional. Cada item carrega `{ to, modulo, match }`; badge de alertas reativo (`useOpenAlertCount`) |
| **Navegação governada por RBAC** (item some se papel não vê o módulo) | `Sidebar.tsx:56,76` (`visible = permLevel(...) !== "none"`) | Funcional. Seção inteira oculta se nenhum item visível |
| **Gating de rota** (rota protegida → "Acesso negado") | `src/auth/RequireAuth.tsx:18` (`Gate`), aplicado em `routes.tsx:68-83` | Funcional. `Alertas`, `Cadastro`, `OCR`, `Governança`, `RBAC` envoltos em `<Gate>` |
| **Breadcrumb por tela** (esqueleto de hierarquia) | `src/components/layout/chrome.tsx:35` (`usePageChrome`) → `Topbar` (`BC`) | Funcional, **porém estático**: `bc: string[]`, sem nós clicáveis |
| **Navegação contextual (drill-in)** via `navigate()`/`<Link>` em ações | ex.: nó `Ativo` da Hierarquia → `/ativos/:id/overview`; `GemeoRedirect`; abas de `AtivoDetail` | Funcional, mas **dispersa**; nenhum índice central a enumera |
| **Redirects de conveniência** | `routes.tsx:54` (`/gemeo` → `GemeoRedirect`), `:id` index → `overview` | Funcional |

**A lacuna central:** **não existe nenhuma representação consolidada do grafo de navegação.** Para saber "de qual tela um Técnico de Manutenção chega ao detalhe de um alerta", hoje é preciso *ler o código*. Esta tela transforma esse conhecimento tácito (espalhado por `routes.tsx`, `Sidebar.tsx`, `chrome.tsx` e cada `navigate()` de página) em um **mapa governado, filtrável por papel, e em uma matriz tela × US × módulo × RBAC** — fechando o ciclo da US-13 no eixo *navegação* (a Tela 04 fecha no eixo *dado*).

**Lacunas estruturais a refinar (ancoradas no código):**
1. **Grafo de navegação não é dado de 1ª classe.** As arestas (gatilhos de transição) vivem implícitas em `navigate(...)` espalhados; não há um `navGraph` declarativo que a tela e os testes possam consumir.
2. **Breadcrumb não é navegável** (`chrome.tsx` usa `string[]`), então a "trilha de retorno" — pilar da navegação amigável (US-2) — está incompleta.
3. **RBAC governa a entrada (Sidebar/Gate) mas não a navegação contextual.** Um botão que faz `navigate("/governanca/...")` dentro de uma página não é, por si, gated pelo destino — só a rota destino é (`Gate`). Não há simulação "o que este papel alcança".
4. **Sem prova de cobertura**: nenhuma tabela liga tela → requisito → user story, então não se demonstra que US-1…US-13 têm telas correspondentes.

---

## 3. Usuários/perfis que acessam

Reconciliação dos perfis-alvo (persona) com os papéis reais do seed (`ROLES`/`SEED_USERS` em `src/data/seed.ts`) e o módulo governante (`Governança`, via `useCan`/`permLevel`):

| Persona (briefing) | Papel real (seed) | Nível em `Governança` (`PERM`) | O que faz nesta tela |
|---|---|---|---|
| **Administrador Forzy / TI-Governança** | `Gerente Industrial` (proxy até criar papel "TI/Governança") | `full` | Edita/valida o grafo, audita arestas, simula percurso por papel, exporta o atlas |
| **Gestor industrial** | `Gerente Industrial` | `full` | Lê o mapa para entender alcance por equipe; revisa cobertura US |
| **Analista de Dados** | `Analista de Dados` | `full` | Usa o mapa para rastrear tela ↔ tag ↔ alerta (ponte com a Tela 04 e o Dicionário) |
| **Eng. Confiabilidade** | `Eng. Confiabilidade` | `read` | Lê o grafo em modo somente-leitura (sem editar arestas), entende dependências |
| **Técnico de manutenção** | `Técnico Manutenção` | `none` | **Não vê o módulo** — Sidebar oculta a seção; rota cai no `Gate` "Acesso negado" |
| **Usuário cliente / Operador** | `Operador Campo` | `none` | **Não vê o módulo** (idem) |

> **Observação de governança (alinhada à espinha §RBAC):** o papel `"TI/Governança"` ainda **não existe** em `ROLES`/`PERM` (`seed.ts:95-103`); hoje é coberto por `Gerente Industrial`. Esta tela é o argumento mais forte para criá-lo — ela é o painel natural do dono da navegação. A entrada é controlada por `useCan("Governança","read")`; a edição do grafo por `useCan("Governança","full")` (mesmo padrão de `Dicionario.tsx:20`).

---

## 4. User stories da Forzy cobertas

| US | Como esta tela atende |
|---|---|
| **US-13 — Governança de acessos/dados/rastreabilidade** *(central)* | Materializa a **rastreabilidade de navegação**: prova qual percurso liga US → módulo → tela → sensor → modelo → alerta → ação → perfil **no eixo do fluxo**; expõe a navegação governada por RBAC (o que cada papel alcança) e a auditoria de arestas |
| **US-1 — Produto modular** | O grafo evidencia os **módulos como subgrafos** (Operação, Ativos, Alertas, Assistente, Cadastro, Governança) e mostra fronteiras/portas entre eles — modularidade *visível*, não declarada. Módulos "não contratados/none" aparecem apagados (gancho de upsell) |
| **US-2 — Interface amigável/navegável** | É a definição executável da boa navegação: trilhas de ida e volta (breadcrumb navegável), atalhos contextuais, ausência de becos sem saída, e a garantia de que toda tela tem rota de entrada e de retorno |

US correlatas que a tela **referencia** (sem cobrir): US-4 (sensores), US-8/9/10 (ML), US-12 (assistente) aparecem como **nós de destino** no grafo, ligando a navegação ao restante da rastreabilidade — mas a definição dessas entidades é da Tela 04.

---

## 5. Estrutura da tela

Layout dentro do `AppShell` (`Sidebar` + `Topbar` + área `p-5 space-y-4` — `AppShell.tsx:23`). Breadcrumb publicado via `usePageChrome(["Governança","Navegação"], <ações>)`.

### 5.1 — Faixa de cabeçalho (KPIs de navegação)
Quatro `KPI` (de `@/components/ui-shared`), todos **derivados** do `navGraph` + `routes.tsx` + `rbac`:

| KPI | Cálculo | Fonte real |
|---|---|---|
| **Rotas governadas** | nº de rotas envoltas em `<Gate>` / total de rotas | `routes.tsx` |
| **Telas alcançáveis (papel atual)** | nós cujo `modulo` tem `permLevel ≠ none` para `session.papel` | `rbac.ts` + `seed.PERM` |
| **Arestas (transições)** | tamanho de `navGraph.edges` | `navGraph` (a criar) |
| **Cobertura de US** | nº de US com ≥1 tela mapeada / 13 | matriz §5.4 |

### 5.2 — Grafo de navegação (peça central, ~60% da tela)
Mapa nó-aresta orientado, agrupado por módulo (cluster colorido por seção do Sidebar). Especificação visual:

| Elemento | Representação | Token (theme.ts paleta C) |
|---|---|---|
| **Nó = tela/rota** | card-pílula com label + path mono | `C.bgCard`, borda `C.border`; label Inter, path JetBrains Mono `C.steel` |
| **Cluster = módulo** | área pontilhada rotulada (OPERAÇÃO, ATIVOS, ALERTAS…) | título Rajdhani `C.slate` |
| **Aresta = transição** | seta orientada origem→destino | `C.slate` (normal) |
| **Aresta gated** | seta com cadeado, tracejada | `C.amber` (read) / `C.red` (none p/ papel simulado) |
| **Nó inacessível (papel atual)** | card 40% opacidade + selo `Lock` | `C.slate` esmaecido |
| **Nó de entrada (Sidebar)** | anel de destaque | `C.cobalt` |
| **Nó de destino externo** (sensor/modelo/alerta) | nó hexagonal menor | `C.steel` (dado) |

Cada **aresta carrega o GATILHO** (rótulo curto): `Sidebar`, `breadcrumb`, `tab`, `row-click`, `botão "Ver ativo"`, `redirect`, `deep-link :id`. Clicar num nó abre um drawer com: rota exata, componente, `modulo` RBAC, US cobertas, arestas de entrada/saída.

**Arestas reais a representar (extraídas do código):**

| Origem | Destino | Gatilho | Âncora no código |
|---|---|---|---|
| Sidebar → qualquer | `/dashboard`, `/operacional`, `/ativos`, `/gemeo`, `/mapa`, `/alertas`, `/assistente`, `/cadastro`, `/cadastro/ocr`, `/governanca*`, `/configuracoes` | clique no `NavLink` | `Sidebar.tsx:22-49` |
| `/` | `/dashboard` | redirect index | `routes.tsx:49` |
| `*` (404) | `/dashboard` | catch-all | `routes.tsx:86` |
| `/ativos` (lista) | `/ativos/:id/overview` | `row-click` | `AtivosLista` → `AtivoDetail` |
| `/ativos/:id` | `overview·telemetria·saude·gemeo·tecnico` | troca de aba | `routes.tsx:58-65` |
| `/gemeo` | `/ativos/:id/gemeo` | `GemeoRedirect` | `routes.tsx:54` |
| Hierarquia (nó `Ativo`) | `/ativos/:id/overview` | clique no nó | espinha §1 / `Hierarquia.tsx` |
| `/alertas` | `/alertas/:id` | `row-click` | `routes.tsx:68-69` |
| `/alertas/:id` | `/ativos/:id/...` | "Ver ativo" | detalhe do alerta → ativo |
| `/assistente` | `/assistente/:assetId` | "perguntar sobre ativo" | `routes.tsx:71-72` |
| `/cadastro` | `/cadastro/ocr` | "Ler placa (OCR)" | `routes.tsx:74-75` |
| Topbar/Sidebar (rodapé) | `/configuracoes` | avatar/engrenagem | `Sidebar.tsx:103`, `Topbar.tsx:30` |
| Governança Overview | `/governanca/{hierarquia,dici,dicionario,rbac,navegacao}` | cards-portal | `Overview.tsx` |
| Topbar → `/login` | logout | `sair()` | `Topbar.tsx:18` |

### 5.3 — Painel "Navegação Governada" (simulador de papel)
Seletor de papel (os 5 de `ROLES`). Ao trocar, o grafo **re-pinta**: nós alcançáveis acendem, gated escurecem. Replica `permLevel(rbac, papel, modulo)` sem fazer login — responde "**para onde o Operador de Campo consegue navegar?**". Tabela-resumo lado a lado:

| Papel | Telas alcançáveis | Telas bloqueadas | Becos sem saída? |
|---|---|---|---|
| Gerente Industrial | (todas) | — | não |
| Eng. Confiabilidade | todas exceto RBAC (`none`) | `/governanca/rbac` | não |
| Técnico Manutenção | Ativos(r), Alertas(f), Assistente(f), Mapa(r) | Governança, Cadastro, OCR, Telemetria† | verificar |
| Analista de Dados | Telemetria(f), Governança(f), Dashboard(r)… | Mapa, Cadastro, OCR, RBAC | verificar |
| Operador Campo | Ativos(r), Alertas(r), Mapa(r) | Dashboard, Telemetria, Assistente, Governança | **Dashboard `none` → `/` redireciona a tela que ele não vê!** |

> † Os valores vêm direto de `PERM` (`seed.ts:97-103`). A linha do **Operador Campo** expõe um **bug de navegação real e acionável**: `routes.tsx:49` redireciona `/` → `/dashboard`, mas Operador tem `Dashboard:"none"`. Sem `<Gate modulo="Dashboard">` no Dashboard, ele cai numa tela órfã; com Gate, cai em "Acesso negado" logo no login. O *landing route* deveria ser o **primeiro módulo permitido**, não fixo. (Ver §9.)

### 5.4 — Matriz de mapeamento tela × módulo × RBAC × US (tabela governada)
Tabela densa, exportável CSV (mesmo `downloadCSV` de `Dicionario.tsx:35`). Uma linha por rota:

| Tela | Rota | Componente | Módulo RBAC | Gated? | Entradas | US |
|---|---|---|---|---|---|---|
| Dashboard | `/dashboard` | `Dashboard` | Dashboard | não | Sidebar, `/`, 404 | US-1,2,7 |
| Painel Operacional | `/operacional` | `Painel` | Dashboard | não | Sidebar | US-7 |
| Lista de Ativos | `/ativos` | `AtivosLista` | Ativos | não | Sidebar, Hierarquia | US-1,3,7 |
| Ativo · Visão Geral | `/ativos/:id/overview` | `AtivoOverview` | Ativos | não | lista, alerta, hierarquia, breadcrumb | US-7 |
| Ativo · Telemetria | `/ativos/:id/telemetria` | `AtivoTelemetria` | Ativos/Telemetria | não | aba | US-4,7 |
| Ativo · Saúde IA | `/ativos/:id/saude` | `AtivoSaudeIA` | Ativos | não | aba | US-8,9,10 |
| Ativo · Gêmeo | `/ativos/:id/gemeo` | `AtivoGemeoDigital` | Ativos | não | aba, `/gemeo` | US-6,10 |
| Ativo · Técnico | `/ativos/:id/tecnico` | `AtivoTecnico` | Ativos | não | aba | US-5,11 |
| Alertas | `/alertas` | `AlertasLista` | Alertas | **Gate** | Sidebar | US-9,10 |
| Alerta · Detalhe | `/alertas/:id` | `AlertaDetalhe` | Alertas | **Gate** | lista, ativo | US-9,12 |
| Assistente | `/assistente[/:assetId]` | `Assistente` | Assistente | não | Sidebar, ativo, alerta | US-12 |
| Cadastro Manual | `/cadastro` | `CadastroManual` | Cadastro | **Gate** | Sidebar | US-1,3 |
| Leitura OCR | `/cadastro/ocr` | `CadastroOCR` (lazy) | OCR | **Gate** | Sidebar, Cadastro | US-5 |
| Mapa da Planta | `/mapa` | `MapaPlanta` | Mapa | não† | Sidebar | US-6 |
| Governança · Visão Geral | `/governanca` | `GovernancaOverview` | Governança | **Gate** | Sidebar | US-13 |
| Governança · Hierarquia | `/governanca/hierarquia` | `Hierarquia` | Governança | **Gate** | Sidebar, Overview | US-13,1 |
| Governança · D-I-C-I | `/governanca/dici` | `DICI` | Governança | **Gate** | Sidebar, Overview | US-13 |
| Governança · Dicionário | `/governanca/dicionario` | `Dicionario` | Governança | **Gate** | Sidebar, Overview | US-3,4,13 |
| **Governança · Navegação** | `/governanca/navegacao` | *(esta tela)* | Governança | **Gate** | Sidebar, Overview | **US-13,1,2** |
| Governança · RBAC | `/governanca/rbac` | `RBAC` | RBAC | **Gate** | Sidebar, Overview | US-13 |
| Configurações | `/configuracoes` | `Configuracoes` | — | não | avatar, engrenagem | US-2 |
| Login | `/login` | `Login` | público | — | logout, sessão inválida | US-13 |

> † `Mapa` e `Telemetria` têm `modulo` no Sidebar (`Mapa`/`Dashboard`) mas a **rota não tem `<Gate>`** (`routes.tsx:76`) — divergência entre "visibilidade no menu" e "proteção de rota" que esta matriz expõe (ver §9).

---

## 6. Dados e entidades mostradas

| Entidade | Forma / origem real | Papel na tela |
|---|---|---|
| **Rota** | `routes.tsx` (path, element, children, Gate) | nó do grafo + linha da matriz |
| **Item de navegação** | `NAV` em `Sidebar.tsx:22-49` (`{l,i,to,modulo,match}`) | nó de entrada (anel cobalto) + gatilho "Sidebar" |
| **Aresta de navegação** | **a criar:** `navGraph.edges = [{from,to,trigger,modulo}]` | seta orientada com rótulo de gatilho |
| **Matriz RBAC** | `useStore(s=>s.rbac)`, `PERM`/`ROLES`/`MODS` (`seed.ts:95-103`) | filtro de alcance; pintura gated |
| **Sessão/papel** | `useSession()` (`session.papel`) | papel ativo (alcance default) |
| **Permissão efetiva** | `permLevel(rbac,papel,modulo)` (`rbac.ts:10`) | none/read/full por nó |
| **Breadcrumb** | `useChrome()` / `usePageChrome` (`chrome.tsx`) | trilha; alvo de refino p/ navegável |
| **User story** | catálogo US-1…US-13 (briefing) | coluna da matriz; cobertura |
| **Módulo** | `MODS` (`seed.ts:96`) | cluster/cor do grafo |
| **Badge de alertas** | `useOpenAlertCount()` (`Sidebar.tsx:13`) | sinaliza aresta "viva" Sidebar→Alertas |

> Coerente com a espinha §2: cada **número** desta tela (KPIs, contagens) rastreia à sua fonte (rotas, edges, PERM). E cada **aresta** rastreia a uma linha real de `routes.tsx`/`Sidebar.tsx` — a tela não inventa fluxo, ela *lê o produto*.

---

## 7. Ações possíveis

| Ação | Gating (RBAC) | Efeito | Âncora |
|---|---|---|---|
| **Explorar o grafo** (zoom/pan/click nó) | `useCan("Governança","read")` | abre drawer do nó (rota, componente, US, arestas) | leitura |
| **Simular papel** (seletor) | `read` | re-pinta alcance sem trocar sessão | replica `permLevel` |
| **Ir para a tela** (clicar "abrir" no drawer) | só se o **papel atual** alcança o destino | `navigate(node.to)` | `routes.tsx` |
| **Filtrar por módulo / US / "só gated"** | `read` | destaca subgrafo | derivado |
| **Editar aresta** (declarar/ajustar gatilho) | `useCan("Governança","full")` | grava em `navGraph` (store) | espelha `upsertTag` |
| **Marcar aresta como auditada** | `full` | registra revisão (gancho de auditoria) | trilha (a criar) |
| **Exportar atlas** (CSV/JSON da matriz §5.4) | `read` | `downloadCSV("navegacao-...")` | `Dicionario.tsx:35`, `lib/csv` |
| **Detectar becos sem saída / órfãs** | `read` | lista nós sem aresta de retorno ou sem entrada p/ papel | análise do grafo |
| **Saltar p/ Tela 04** (entidade do nó) | `read` | `navigate("/governanca/dicionario")` ou inventário | ponte 05↔04 |

Padrão de degradação por permissão idêntico ao resto da Governança (espinha §RBAC): `full` → grafo editável; `read` → grafo explorável + selo `Lock` nas ações de escrita (como `Dicionario.tsx:49`); `none` → `Gate` "Acesso negado".

---

## 8. Relação com o restante do produto

Esta tela é o **índice de navegação do Predicta inteiro** — por definição toca todos os módulos:

- **Sidebar / AppShell / chrome:** consome `NAV` (`Sidebar.tsx`), `routes.tsx` e `usePageChrome` (`chrome.tsx`). É o *espelho declarativo* da navegação que esses arquivos *executam*. Refinar o breadcrumb navegável (espinha §1) acende arestas "breadcrumb" reais aqui.
- **RBAC (`rbac.ts` + `RBAC.tsx`):** consumidor direto de `permLevel`/`can`. Mudar uma célula em `/governanca/rbac` (`setRbac`) re-pinta este grafo em tempo real — **a governança de acesso vira visível como mapa**. É o complemento "navegação" da tela RBAC "matriz".
- **Tela 04 (Inventário de Entidades):** par simbiótico. 04 = grafo de **dependência de dado** (US↔sensor↔modelo↔alerta); 05 = grafo de **fluxo de uso** (tela→tela→ação). Um nó nesta tela linka para a entidade correspondente na 04 e vice-versa.
- **Dicionário (`Dicionario.tsx`) e Hierarquia/D-I-C-I:** o nó `/governanca/dicionario` aqui aponta para a tabela que, por sua vez, alimenta o motor de alertas (`evaluateAlerts`, `simulation.ts`). Assim a navegação fecha o ciclo **rota → dado → alerta → ação**.
- **Alertas → Ativo → Assistente:** a "rota de ouro" do produto (alerta → detalhe → ativo → assistente sugere solução, US-9→US-12) é desenhada e **provada navegável** aqui, com seus gatilhos reais.
- **Honestidade da IA:** nós de Saúde IA / Gêmeo carregam o selo "modelo simulado (Weibull/físico-informado, não treinado em falhas reais)" — coerente com `PredictionModel` em `src/engine/prediction.ts`. A navegação não esconde a procedência; ela a **rotula no ponto de chegada**.

---

## 9. Melhorias sobre o wireframe base

Crítica e refino — sempre apontando arquivo/componente real e separando **clarear / aprofundar / tornar visual / ligar à operação**.

### P0 — tornar o grafo de navegação um DADO de 1ª classe (deixar de ser tácito)
**Problema:** as arestas vivem implícitas em `navigate(...)`/`<Link>` espalhados; nada enumera o fluxo. **Refino:** criar `src/data/navGraph.ts` declarando `nodes` (derivados de `routes.tsx`) e `edges = [{from,to,trigger,modulo}]`; a tela e os testes consomem o mesmo objeto. Um teste de fumaça garante que **toda rota de `routes.tsx` é um nó** e **todo `to` do `NAV` (`Sidebar.tsx`) é uma aresta** — impedindo divergência mapa↔código. *Esforço: médio.* Vira o **mapa/grafo** que substitui o diagrama abstrato.

### P0 — corrigir o landing route órfão do Operador de Campo
**Problema real (achado, não teórico):** `routes.tsx:49` redireciona `/` → `/dashboard`, mas `PERM["Operador Campo"].Dashboard === "none"` (`seed.ts:102`). O Operador loga e cai numa tela que não pode ver. **Refino:** landing dinâmico = primeiro módulo com `permLevel ≠ none` para o papel (helper `firstAllowedRoute(rbac, papel)`), aplicado no `index` redirect e no `*`. Esta tela é quem **detecta e prova** o beco. *Esforço: baixo.*

### P0 — reconciliar "visível no menu" × "rota protegida"
**Problema:** `Mapa` e `Telemetria` aparecem no Sidebar com `modulo`, mas as rotas `/mapa` e abas de telemetria **não têm `<Gate>`** (`routes.tsx:76,61`), enquanto `Alertas/Cadastro/OCR/Governança/RBAC` têm. Acesso direto por URL fura o menu. **Refino:** a matriz §5.4 vira o *checklist canônico* — coluna "Gated?" deve casar com a coluna "modulo". Onde diverge, ou some o `modulo` do Sidebar, ou se adiciona `<Gate>` na rota. *Esforço: baixo.* Liga governança à operação: fecha um furo de acesso direto.

### P1 — breadcrumb navegável acende arestas reais
**Problema:** `chrome.tsx` usa `bc: string[]` estático; a "trilha de retorno" (US-2) é incompleta e o grafo não tem arestas "breadcrumb". **Refino (alinhado à espinha §1):** `bc: BreadcrumbNode[]` com `{label,to}`; cada segmento clicável vira aresta navegável de retorno, representada aqui. *Esforço: médio.*

### P1 — simulador "Navegação Governada" como ferramenta de auditoria
**Aprofundar:** o seletor de papel (§5.3) não é cosmético — é a resposta auditável de "para onde o papel X chega". Saída exportável: relatório por papel (alcançáveis / bloqueadas / órfãs). Liga direto à US-13 e dá ao TI/Governança um artefato de conformidade. *Esforço: médio.*

### P1 — trilha de auditoria de arestas (fecha a lacuna da espinha)
A espinha já aponta que **não há auditoria persistida**. Editar/auditar uma aresta aqui deve gravar quem/quando/o-quê — mesma trilha que cobrirá RBAC/Dicionário/D-I-C-I. Esta tela é candidata natural a inaugurar o log `governanca/auditoria`. *Esforço: médio.*

### P2 — criar o papel "TI/Governança" e usá-lo como dono desta tela
Hoje coberto por `Gerente Industrial`. Adicionar a `ROLES`/`PERM` (`seed.ts:95-103`) com `Governança:"full"`, `RBAC:"full"`, resto `read` — e tornar esta tela o painel default dele. *Esforço: baixo.*

### P2 — clusters do grafo = módulos contratados (gancho US-1)
Módulos com `permLevel === none` para *todos* os papéis (ou "não contratados") aparecem como cluster apagado com CTA — modularidade visível vira **upsell**. *Esforço: baixo.*

### Como tornar MENOS abstrato (resumo visual)
- O **diagrama teórico** de navegação vira **grafo vivo** lido de `routes.tsx`/`navGraph.ts`, pintado por RBAC real.
- A **matriz tela × US × módulo × RBAC** (§5.4) é tabela exportável — não prosa.
- Cada **aresta** carrega seu **gatilho real** e linka à linha de código que a origina.
- O **simulador de papel** transforma "controle de acesso" (conceito) em "alcance navegável" (mapa pintado) — operação concreta, não política em PDF.
