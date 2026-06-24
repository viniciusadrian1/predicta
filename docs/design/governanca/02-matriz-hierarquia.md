# Governança · Tela 02 — Matriz de Hierarquia (PREDICTA · FORZY)

> Documento de design de produto. Tela `/governanca/hierarquia` · arquivo real `src/pages/governanca/Hierarquia.tsx`.
> Cobre **US-13** (governança de acessos/dados/rastreabilidade) e **US-6** (planta baixa → artefato navegável).
> Alinhado a `docs/design/00-governanca-espinha.md` (Espinha 1 — "o breadcrumb É a Matriz de Hierarquia").
> Voz de arquiteto de produto sênior, ancorada no código real do repositório.

---

## 1. Nome da tela

**Matriz de Hierarquia** — a árvore de ativos canônica do PREDICTA.

- **Rota:** `/governanca/hierarquia`
- **Arquivo:** `src/pages/governanca/Hierarquia.tsx`
- **Breadcrumb publicado hoje:** `usePageChrome(["Governança","Hierarquia"], …)` (`Hierarquia.tsx:95`)
- **Fonte de dados:** `HTREE` / `SEED_HIERARCHY` (`src/data/seed.ts:105-121,282`), tipo `HNode` (`src/lib/types.ts:133-139`)
- **Estado vivo:** `useStore(s => s.hierarchy)` + ação `setHierarchy` (`src/store/useStore.ts:74,175`)

Esta não é uma tela de organograma decorativo. Ela é a **espinha estrutural do produto inteiro**: cada nó tipo `Ativo` já navega para a operação (`navigate('/ativos/'+n.id+'/overview')`, `Hierarquia.tsx:55`), e a árvore aqui é a **mesma gramática** que o breadcrumb do Topbar deve materializar em toda tela. Quando esta matriz muda, muda a base de contagem do Dashboard, o escopo dos gráficos e o caminho de navegação de cada ativo.

---

## 2. Objetivo da tela

Manter a **árvore de ativos canônica** — `Empresa → Planta → Área → Sistema → Ativo` — que dá **escopo, contexto e caminho de navegação** a todo o resto do PREDICTA, com **drill-down**, **painel de metadados** do nó selecionado e **vínculos vivos** (clicar leva à operação: dashboard, alertas, telemetria, assistente).

### Estado atual no produto (o que JÁ EXISTE — honestidade)

| Capacidade | Onde | Estado |
|---|---|---|
| Árvore recursiva editável e persistida | `HiNode` (`Hierarquia.tsx:30-78`), `setHierarchy` (`useStore.ts:175`) | **Funcional.** Add/rename/remove via hover, gated por `useCan("Governança","full")` |
| 5 níveis de gramática | `CHILD_TYPE` (`Hierarquia.tsx:14`): Empresa→Planta→Área→Sistema→Ativo | **Funcional**, mas **só 5 níveis** — faltam Linha, Célula, Sensor, Evento/Alerta |
| Drill-down (expand/collapse) | `open` por nó, `depth<3` aberto por default (`Hierarquia.tsx:35`) | **Funcional** |
| Nó-folha navega à operação | `n.tp==="Ativo" && navigate('/ativos/'+n.id+'/overview')` (`Hierarquia.tsx:55`) | **Funcional, porém só para `Ativo` e só para 1 destino** |
| Legenda + Totais por tipo | `countByType` (`Hierarquia.tsx:25-28,114-129`) | **Funcional** |
| Busca de nó | input presente (`Hierarquia.tsx:104`) | **Inerte — não filtra** |

### Lacunas estruturais que esta etapa precisa fechar

1. **`HTREE` tem só 5 níveis** (Empresa/Planta/Área/Sistema/Ativo). O requisito desta tela é a árvore de **8 níveis**: `Empresa > Planta > Área > Linha > Célula > Máquina/Ativo > Sensor > Evento/Alerta`. Faltam **Linha, Célula, Sensor, Evento/Alerta** (§9 propõe a extensão concreta).
2. **Não há painel de metadados.** A coluna lateral é só Legenda + Totais; o nó selecionado não abre nada. O detalhe do ativo só é alcançável navegando para fora da tela.
3. **Vínculos do nó são pobres.** Só `Ativo` navega, e só para `/ativos/:id/overview`. Não há atalho para Alertas do nó, Telemetria do nó, ou "perguntar ao Assistente sobre este nó".
4. **O breadcrumb ainda não deriva desta matriz.** Hoje cada tela publica um `string[]` estático (`usePageChrome`). A Espinha 1 exige `pathToNode(hierarchy, id)` para tornar o caminho clicável e herdável (ver §8/§9).
5. **`HNode` é magro** (`{ id, l, tp, kids }`) — sem metadados (criticidade, status, sensores, vínculos). O painel de metadados precisa cruzar `HNode` com `assets`/`twins`/`alerts` por `id` (§6).

> Em uma frase: **a tela já é a fonte estrutural da navegação, mas hoje ela termina onde a operação começa.** Esta etapa a transforma em um **mapa navegável** que leva do nó à decisão.

---

## 3. Usuários/perfis que acessam

Módulo governado: **`Governança`** (RBAC em `src/auth/rbac.ts` · `useCan(modulo, nivel)`). Reconciliação com os papéis reais do seed (`ROLES`/`SEED_USERS`):

| Persona (briefing) | Papel real (seed) | Nível `Governança` | Comportamento na Matriz |
|---|---|---|---|
| **Administrador Forzy** | (papel admin / TI) | `full` | Edita estrutura inteira: add/rename/remove nós, criar planta, reestruturar árvore |
| **Gestor industrial** | `Gerente Industrial` | `full` | Edita; usa drill-down para auditar conformidade por planta/área; abre metadados |
| **TI/Governança** | (papel a criar — hoje sem linha dedicada) | `full` | Curadoria estrutural + rastreabilidade; é quem governa a gramática da árvore |
| **Técnico de manutenção** | `Técnico Manutenção` | **`none`** (hoje) | **Bloqueado por `Gate`** — porém é o perfil que MAIS se beneficiaria de navegar do nó → alerta → ação. Ver §9 (proposta `read` operacional) |
| **Usuário cliente** | `Operador Campo` / leitura | `none`/`read` | Idealmente `read`: navega e abre metadados, sem editar |
| **Eng. Confiabilidade / Analista de Dados** | `Eng. Confiabilidade` / `Analista de Dados` | `read`/`full` | Lê e navega; controles de edição ocultos se não-`full` |

**Regra de gating real:** `const canEdit = useCan("Governança","full")` (`Hierarquia.tsx:34,83`) controla os ícones `Pencil`/`Plus`/`Trash2` por nó e o `IBtn` "Adicionar planta". A rota inteira está protegida por `Gate modulo="Governança"` (`src/routes.tsx`). Em `read`, a árvore renderiza navegável e os controles de edição somem; em `none`, a tela cai no painel "Acesso negado".

> **Tensão de produto a resolver (§9):** o **Técnico** está em `none` na Governança, mas a navegação `nó → alerta → ação` é exatamente o fluxo de campo dele. A Matriz deveria ter um **modo de navegação operacional** liberado em `read` para perfis de campo, separando "ler/navegar a estrutura" de "editar a estrutura".

---

## 4. User stories da Forzy cobertas

| US | Como esta tela a cobre | Âncora no código |
|---|---|---|
| **US-13 (núcleo)** | A Matriz é a **rastreabilidade estrutural**: o eixo que liga user stories↔módulos↔telas↔ativos↔sensores↔alertas. É a fonte do breadcrumb-matriz e o esqueleto da navegação governada por papel | `HTREE`, `setHierarchy`, `useCan("Governança",…)` |
| **US-6** | "Planta baixa → artefato navegável": a hierarquia é o **destino estrutural** do que o OCR/planta produz. Um ativo lido da placa (US-5) ou um cômodo da planta baixa **aterrissa como nó** nesta árvore e vira navegável | `CHILD_TYPE`, `addChildTo`; integração com OCR (`src/pages/ocr`/cadastro) |
| **US-1 (suporte)** | Modularidade: a árvore define o **escopo** sobre o qual cada módulo (Dashboard/Alertas/Telemetria) opera; o que um papel vê na árvore é função do RBAC | `useCan`, Sidebar |
| **US-4 (suporte, após extensão)** | Ao adicionar o nível **Sensor**, cada sensor V/A/RPM/°C vira nó folha vinculado a uma tag do Dicionário (`SEED_DICTIONARY`) | proposta §9 + `SEED_DICTIONARY` |
| **US-7 (suporte)** | O nó selecionado define o **escopo herdado** dos gráficos atuais+históricos (Telemetria) | breadcrumb-matriz → escopo |
| **US-12 (suporte)** | Vínculo "perguntar ao Assistente sobre este nó" leva o contexto estrutural ao conversacional | §7/§8 |

---

## 5. Estrutura da tela

Layout atual: `grid grid-cols-3` — árvore em 2/3, painel lateral em 1/3 (`Hierarquia.tsx:98-130`). A estrutura-alvo desta etapa adiciona um **3º bloco** (Painel de Metadados + Vínculos) que reage à seleção.

### 5.1 Árvore (coluna 2/3) — drill-down

| Elemento | Detalhe | Âncora |
|---|---|---|
| Cabeçalho | "Árvore de Hierarquia — Forzy Indústria S.A." + busca | `SH` (`Hierarquia.tsx:100-107`) |
| Nó recursivo | indent por `depth*18+8px`; chevron expand/collapse | `HiNode` (`Hierarquia.tsx:51-77`) |
| Ícone+cor por tipo | Empresa=`steel`/Building2 · Planta=`cobalt`/Map · Área=`slate`/Layers · Sistema=`textSub`/Network · Ativo=`green`/Cpu | `typeI`/`typeC` (`Hierarquia.tsx:37-38`) |
| Controles de edição | Pencil/Plus/Trash2 (hover, só `canEdit`) | `Hierarquia.tsx:65-73` |
| Tag de tipo | rótulo do `tp` em hover | `Hierarquia.tsx:64` |

**Tipos/cores a adicionar na extensão (§9):** Linha=`#FB923C`/`GitBranch` · Célula=`#82C8E5`/`Grid` · Sensor=`#34D399`/`Radio`/`Gauge` · Evento/Alerta=`#F87171`/`AlertTriangle` (paleta C, `src/lib/theme.ts`).

### 5.2 Painel lateral atual (coluna 1/3)

| Bloco | Conteúdo | Âncora |
|---|---|---|
| Legenda | ícone+cor por tipo | `Hierarquia.tsx:111-120` |
| Totais | contagem por tipo (Empresas/Plantas/Áreas/Sistemas/Ativos) | `countByType` (`Hierarquia.tsx:121-129`) |

### 5.3 Painel de Metadados do nó selecionado (A CRIAR — requisito desta tela)

Substitui/expande o painel lateral quando há nó selecionado. Conteúdo varia por tipo do nó:

| Seção | Conteúdo | Fonte de dado |
|---|---|---|
| **Identidade** | `id` (mono), `label`, `tp`, caminho completo (breadcrumb do nó) | `HNode` + `pathToNode` |
| **Metadados de ativo** (se `tp==="Ativo"`) | criticidade, fabricante, modelo, série, potência, RPM nominal, instalado em | `assetView(asset, twin)` (`src/store/derive.ts:18-30`) |
| **Estado vivo** (se `Ativo`) | saúde %, status (normal/atenção/crítico/offline), última leitura | `twin` (`derive.ts`), badge colorido |
| **Ciclo D-I-C-I** | 4 pontos (Desenho/Instalação/Comissionamento/Inspeção) | `dici` por `id` (`SEED_DICI`) → `<DiciBadge assetId/>` |
| **Sensores vinculados** (após extensão) | lista de sensores filhos + tag do Dicionário de cada | nível Sensor + `SEED_DICTIONARY` |
| **Alertas do nó** | contagem aberta + severidade pior | `alerts` filtrados por `ativo===id` |
| **Procedência do modelo** (honestidade) | selo "Predição = modelo de degradação SIMULADO" | nota transversal (§8) |

### 5.4 Vínculos do nó (A CRIAR — "clicar leva à operação")

Faixa de ações contextuais ao pé do painel de metadados:

| Vínculo | Destino | Condição |
|---|---|---|
| **Abrir no Dashboard** | `/` com escopo do nó | qualquer nó (escopo herdado) |
| **Ver Ativo** | `/ativos/:id/overview` | `tp==="Ativo"` (já existe via clique no nó) |
| **Telemetria** | `/ativos/:id/telemetria` | `Ativo`/`Sensor` |
| **Alertas do nó** | `/alertas?ativo=:id` | nó com alertas abertos |
| **Saúde IA** | `/ativos/:id/saude` | `Ativo` |
| **Perguntar ao Assistente** | `/assistente?ctx=:id` | qualquer nó (passa contexto estrutural) |

Todos gated por `useCan` do módulo de destino (Telemetria/Alertas/Assistente), degradando para desabilitado+tooltip se `none`.

---

## 6. Dados e entidades mostradas

### 6.1 Entidade-base: `HNode` (hoje)

```
HNode { id: string; l: string; tp: string; kids: HNode[] }   // src/lib/types.ts:133-139
```

`HTREE` real (`seed.ts:105-121`): `EMP-001 Forzy Indústria S.A.` → `PLT-N Planta Norte` → `ARE-BOM Bombeamento` → `SIS-B1 Sistema de Recalque #1` → `{ BCP-01, BCP-02 }`; `ARE-PRD Produção A` → `ME-07`; `PLT-S Planta Sul` (vazia).

### 6.2 Cruzamentos por `id` (o painel de metadados é uma junção)

O `HNode.id` é a **chave de junção** com o resto do produto. O painel cruza:

| Entidade | Vínculo | Arquivo |
|---|---|---|
| `Asset` (placa/identidade) | `asset.id === node.id` | `seed.ts` (ASSETS/`mk`), `derive.ts:assetView` |
| `AssetTwin` (estado vivo) | `twins[node.id]` | `derive.ts:18-30`, store |
| `Alert` | `alert.ativo === node.id` | `seed.ts` (ALERTS), store |
| `DiciRow` | `dici.find(r => r.id === node.id)` | `SEED_DICI` |
| `Tag` (Dicionário) | sensor → `tag.key`/aplicabilidade | `SEED_DICTIONARY` (`seed.ts:130-137`) |

### 6.3 Gramática proposta de 8 níveis (extensão de `CHILD_TYPE`)

| Nível | `tp` | Exemplo real (mapeado ao seed) | Vínculo a dado |
|---|---|---|---|
| 1 Empresa | `Empresa` | Forzy Indústria S.A. (`EMP-001`) | — |
| 2 Planta | `Planta` | Planta Norte (`PLT-N`) | conformidade por planta (Overview) |
| 3 Área | `Área` | Bombeamento (`ARE-BOM`) | escopo de KPIs |
| 4 **Linha** *(novo)* | `Linha` | Linha de Recalque 2 | agrupamento operacional |
| 5 **Célula** *(novo)* | `Célula` | Célula de Bombas | conjunto co-localizado |
| 6 Máquina/Ativo | `Ativo` | Bomba BCP-01 | `Asset`+`AssetTwin`+`DiciRow` |
| 7 **Sensor** *(novo)* | `Sensor` | PT100 mancal · Acelerômetro MEMS | `Tag` do `SEED_DICTIONARY` (temp/vib/…) |
| 8 **Evento/Alerta** *(novo)* | `Evento` | ALT-2025-0847 Vibração Crítica | `Alert` (`seed.ts:27`) |

> **Mapeamento ao real, sem inventar:** o nível Sensor sai direto do `SEED_DICTIONARY` (cada tag tem `sensor`+`un`+limites); o nível Evento sai dos `ALERTS` existentes. Linha/Célula são camadas de agrupamento entre Área e Ativo — opcionais por planta, para não quebrar a árvore curta atual.

### 6.4 Métricas derivadas exibidas

- **Totais por tipo:** `countByType(hierarchy)` (`Hierarquia.tsx:25-28`) — vira a base de contagem que o Dashboard usa.
- **Saúde/status do nó:** `twin.health`/`twin.status` via `assetView` (`derive.ts`).
- **Conformidade por planta** (gancho): cruzar `hierarchy` (plantas) × `dici` (status por ativo) — hoje hardcoded no Overview, deveria ser derivado aqui.

---

## 7. Ações possíveis

| Ação | Gating | Estado | Âncora |
|---|---|---|---|
| **Expandir/colapsar nó** (drill-down) | livre | existe | `setOpen` (`Hierarquia.tsx:55`) |
| **Selecionar nó → abrir metadados** | livre (`read`+) | **a criar** | novo estado `selected` |
| **Navegar ao ativo** (clique em folha `Ativo`) | depende de `Ativos:read` | existe (1 destino) | `navigate('/ativos/'+n.id+'/overview')` |
| **Adicionar filho** (gramática `CHILD_TYPE`) | `useCan("Governança","full")` | existe | `addChild`/`addChildTo` (`Hierarquia.tsx:41-47`) |
| **Renomear nó** | `full` | existe | `saveRename`/`renameIn` (`Hierarquia.tsx:49`) |
| **Remover nó** | `full` | existe (**sem validação de órfãos**) | `remove`/`removeFrom` (`Hierarquia.tsx:48`) |
| **Adicionar planta** (raiz) | `full` | existe | `addRoot` (`Hierarquia.tsx:87-93`) |
| **Buscar/filtrar nó** | livre | **inerte** | input `Hierarquia.tsx:104` |
| **Vínculo → Alertas/Telemetria/Saúde IA/Assistente** | RBAC do módulo destino | **a criar** | §5.4 |
| **Exportar árvore (CSV/JSON)** | `read`+ | **a criar** | reuso `downloadCSV` (já usado em DICI/Dicionário) |

Toda ação de edição grava via `setHierarchy` no store persistido (`useStore.ts:175`) e confirma com `toast` (sonner). **Lacuna de governança:** nenhuma dessas mutações gera trilha de auditoria hoje (ver §9 e a espinha §"Trilha de auditoria").

---

## 8. Relação com o restante do produto

A Matriz de Hierarquia é o **hub estrutural** — quase todo módulo a consome:

| Módulo / tela | Relação | Âncora |
|---|---|---|
| **Breadcrumb de TODO o produto** | O `BC` no Topbar deve **derivar desta árvore** via `pathToNode(hierarchy, id)`. Hoje cada tela publica `string[]` estático (`usePageChrome`); a meta é breadcrumb clicável Empresa›Planta›Área›Sistema›Ativo›… com **escopo herdado** | `chrome.tsx:35`, `BC` (`ui-shared/index.tsx:90`), Espinha 1 |
| **Ativos / detalhe** | Folha `Ativo` navega ao overview; o painel de metadados é a ponte estrutura→operação | `Hierarquia.tsx:55`, `derive.ts:assetView` |
| **Dashboard** | `countByType` é a base de contagem de ativos; escopo do nó filtra KPIs | `derive.ts:statusCounts/fleetAvailability` |
| **Alertas** | Vínculo "Alertas do nó"; cada nó Evento/Alerta (extensão) É um `Alert` | `ALERTS` (`seed.ts:27`) |
| **Telemetria** | Nó Sensor (extensão) → série da tag; escopo herdado define o gráfico | `SEED_DICTIONARY`, US-7 |
| **Assistente IA** | Vínculo "perguntar sobre este nó" passa contexto estrutural ao conversacional (US-12) | `/assistente` |
| **Dicionário** | Nó Sensor referencia a tag (campo/unidade/limites) — fecha "todo número rastreia ao Dicionário" | `SEED_DICTIONARY` |
| **D-I-C-I** | Painel mostra o ciclo documental do ativo (`<DiciBadge>`) fora da tela de Governança | `SEED_DICI` |
| **RBAC / Sidebar** | O que cada papel vê e edita na árvore é função de `useCan("Governança",…)` | `rbac.ts`, `Sidebar.tsx` |
| **OCR / Cadastro** | Ativo lido da placa (US-5) e cômodos da planta baixa (US-6) aterrissam como nós aqui | `addChildTo`, OCR/cadastro |

**Honestidade da IA (transversal):** quando o painel de metadados exibir RUL/probFalha de um nó `Ativo`, deve carregar o selo **"Predição = modelo de degradação SIMULADO (físico-informado + Weibull), não treinado em falhas reais"** (interface `PredictionModel`, `src/engine/prediction.ts`). A Matriz é onde a procedência estrutural do dado fica visível: o usuário vê *de qual sensor* e *sob qual tag/limite* nasceu cada número.

---

## 9. Melhorias sobre o wireframe base

Críticas concretas, cada uma ancorada em arquivo/componente real, ligando a governança às operações.

### P0 — Estender `HTREE` para 8 níveis (Linha/Célula/Sensor/Evento)
**Problema:** `CHILD_TYPE` (`Hierarquia.tsx:14`) só conhece Empresa→Planta→Área→Sistema→Ativo. O requisito é a árvore completa até Sensor e Evento/Alerta.
**Como:**
- Estender `CHILD_TYPE`: `Área→Linha→Célula→Ativo` e `Ativo→Sensor→Evento`. Adicionar `typeI`/`typeC` (`Hierarquia.tsx:37-38`) para os 4 tipos novos (cores da paleta C: Linha `#FB923C`, Célula `#82C8E5`, Sensor `#34D399`, Evento `#F87171`).
- Popular nós Sensor a partir de `SEED_DICTIONARY` (cada tag = um sensor candidato) e nós Evento a partir de `ALERTS` por ativo — **sem inventar dados**, reusando os seeds.
- Manter Linha/Célula **opcionais** (a Planta Sul pode pular direto a Ativo) para não quebrar a árvore curta atual.
**Impacto:** `seed.ts` (HTREE), `Hierarquia.tsx` (CHILD_TYPE/typeI/typeC), `types.ts` (documentar o vocabulário de `tp`). *Esforço: médio.*

### P0 — Painel de Metadados do nó selecionado (junção viva)
**Problema:** a coluna lateral é só Legenda+Totais; o nó selecionado não revela nada — a governança fica abstrata.
**Como:** novo estado `selected: HNode|null`; ao selecionar, renderizar painel que cruza `id` com `assetView`/`twins`/`alerts`/`dici` (§6.2). Reusar `<DiciBadge>` e o selo de honestidade. Torna a árvore um **mapa de inspeção**, não um organograma.
**Impacto:** `Hierarquia.tsx` (3º bloco do grid), `derive.ts` (já provê `assetView`), novo `src/components/governanca/NodeMetaPanel.tsx`. *Esforço: médio.*

### P0 — `pathToNode(hierarchy, id)` → breadcrumb-matriz navegável (Espinha 1)
**Problema:** o breadcrumb de todo o produto é `string[]` estático; deveria **derivar desta árvore** e ser clicável com escopo herdado.
**Como:** helper puro `pathToNode(hierarchy, id): HNode[]` (espelha os recursivos `addChildTo`/`removeFrom` já em `Hierarquia.tsx`); `chrome.tsx` passa a aceitar `BreadcrumbNode[]` (`{id,label,tp,to}`); `BC` (`ui-shared/index.tsx:90`) ganha `onClick`/`to`. Numa tela de ativo, o breadcrumb lê *Forzy › Planta Norte › Bombeamento › Sistema de Recalque #1 › Bomba BCP-01 › Visão Geral* — cada segmento clicável.
**Impacto:** `src/store/derive.ts` (helper), `chrome.tsx`, `ui-shared/index.tsx`. *Esforço: médio.* (É o maior ganho transversal do produto.)

### P0 — Trilha de auditoria nas mutações da árvore
**Problema:** add/rename/remove via `setHierarchy` mutam o store sem registrar quem/quando/o-quê — reestruturar a árvore é ação sensível (muda contagem e escopo de todo o produto).
**Como:** wrapper `logAudit(evt)` dentro de `setHierarchy` (`useStore.ts:175`), gravando `{ ts, actor, modulo:"Hierarquia", acao:"add|rename|remove", id, de, para }` na slice `auditLog`. Alimenta a tela `/governanca/auditoria` proposta na espinha (§"Trilha de auditoria").
**Impacto:** `useStore.ts`, slice `auditLog`. *Esforço: médio.*

### P1 — Vínculos do nó "clicar leva à operação"
**Problema:** só `Ativo` navega, e só para um destino. O requisito é que clicar leve à operação (dashboard/alertas/assistente).
**Como:** faixa de ações no painel de metadados (§5.4) — Dashboard/Telemetria/Alertas/Saúde IA/Assistente — cada uma gated pelo `useCan` do módulo destino. Resolve a tensão do **Técnico** (§3): libera navegação operacional sem dar edição estrutural.
**Impacto:** `Hierarquia.tsx` + `NodeMetaPanel.tsx`; depende de `useCan` por módulo. *Esforço: médio.*

### P1 — Busca funcional (filtra + expande nós)
**Problema:** o input de busca (`Hierarquia.tsx:104`) é inerte.
**Como:** estado `query`; filtrar a árvore preservando ancestrais dos matches e auto-expandindo o caminho (reuso da recursão existente). Casa com o drill-down.
**Impacto:** `Hierarquia.tsx`. *Esforço: baixo.*

### P1 — Validação de gramática no remove (impedir órfãos)
**Problema:** `removeFrom` (`Hierarquia.tsx:48`) apaga subárvore sem checar se há ativos com twin vivo / alertas abertos abaixo.
**Como:** antes de remover, varrer descendentes; se houver `Ativo` com `twins[id]` ou `Alert` aberto, exigir confirmação explícita. Protege a integridade entre estrutura e operação.
**Impacto:** `Hierarquia.tsx` + cruzamento com store. *Esforço: médio.*

### P2 — Visualização mais visual e menos abstrata
- **Badges de status no próprio nó:** ponto colorido (verde/âmbar/vermelho/cinza) ao lado de cada `Ativo` lido de `twin.status` — a árvore vira um **mapa de saúde da planta** num relance.
- **Mini-DiciBadge inline** (4 pontos) por ativo: ciclo documental visível na árvore.
- **Exportar árvore** (CSV/JSON) reusando `downloadCSV` (já em DICI/Dicionário) para evidência de governança.
- **Empty-state de raiz:** se `hierarchy[0]` ausente, `addRoot` é no-op (`Hierarquia.tsx:88`) — mostrar "Crie a empresa raiz".

*Esforço: baixo cada.*

> **Síntese:** as melhorias convergem para uma só tese — **a Matriz deixa de terminar onde a operação começa.** Com painel de metadados (P0), vínculos vivos (P1) e breadcrumb derivado (P0), a árvore vira o **mapa de comando** do PREDICTA: do nó estrutural à decisão operacional, com auditoria (P0) registrando cada mudança de estrutura, e a honestidade da IA visível em cada predição de ativo.
