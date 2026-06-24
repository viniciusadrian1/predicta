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
