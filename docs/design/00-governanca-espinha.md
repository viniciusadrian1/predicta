# Governança como espinha transversal + telas 16–20 (PREDICTA · FORZY)

> Documento de design de produto. Cobre **US-13** (governança de acessos/dados/rastreabilidade) e dá suporte estrutural a **todas as outras** user stories. Voz de arquiteto de produto sênior, ancorada no código real do repositório.

---

## Estado atual no produto (o que JÁ EXISTE)

A governança do PREDICTA **não é maquete** — é um subsistema funcional já implementado, com estado vivo em Zustand e efeitos colaterais reais no motor de simulação. Inventário do que existe hoje:

| Capacidade | Arquivo real | Estado |
|---|---|---|
| **Hierarquia editável e persistida** (empresa → planta → área → sistema → ativo) | `src/pages/governanca/Hierarquia.tsx`, seed `HTREE`/`SEED_HIERARCHY` em `src/data/seed.ts`, ações `setHierarchy` em `src/store/useStore.ts:175` | Funcional: adicionar/renomear/remover nós, gated por `useCan("Governança","full")`; nó tipo `Ativo` navega para `/ativos/:id/overview` |
| **Matriz D-I-C-I editável** (Desenho · Instalação · Comissionamento · Inspeção) | `src/pages/governanca/DICI.tsx`, seed `DICI`/`SEED_DICI`, ação `setDici` (`useStore.ts:173`) | Funcional: clique cicla `aprovado → em_revisao → pendente`; exporta CSV (`downloadCSV`) |
| **Dicionário de rastreabilidade que alimenta os alertas** | `src/pages/governanca/Dicionario.tsx`, seed `SEED_DICTIONARY`, ações `upsertTag`/`removeTag` (`useStore.ts:140,149`) | Funcional e **acoplado ao motor**: editar `limiteAlerta`/`limiteCritico`/`direcao` muda os alertas do próximo tick (ver `evaluateAlerts` em `src/engine/simulation.ts:77`) |
| **RBAC editável (papel × módulo)** | `src/pages/governanca/RBAC.tsx`, `src/auth/rbac.ts`, seed `ROLES`/`MODS`/`PERM`, ação `setRbac` (`useStore.ts:174`) | Funcional: clique cicla `none → read → full`; reflete imediatamente no Sidebar e nos guards de rota |
| **Gating de rota e de sidebar** | `src/auth/RequireAuth.tsx` (`Gate`), `src/components/layout/Sidebar.tsx:56`, `src/routes.tsx:74-83` | `Gate` envolve rotas de Cadastro/OCR/Governança/RBAC; Sidebar oculta seção sem permissão (`permLevel !== "none"`) |
| **Sessão real com expiração** | `src/auth/useAuth.ts` (`login`/`logout`/`switchRole`/`sessionValid`) | Login valida contra `SEED_USERS`, cria sessão persistida com `expiresAt` |
| **Visão geral com indicadores derivados** | `src/pages/governanca/Overview.tsx` | KPIs de conformidade calculados das células reais do D-I-C-I |

**O breadcrumb já é o esqueleto da hierarquia, mas hoje é estático por tela.** Cada página publica seu breadcrumb via `usePageChrome([...])` (`src/components/layout/chrome.tsx:35`), renderizado pelo `BC` (`src/components/ui-shared/index.tsx:90`) no `Topbar`. Ex.: `usePageChrome(["Governança","Hierarquia"])`. Ele **ainda não materializa o caminho empresa→planta→área→sistema→ativo de forma navegável e clicável** — essa é a maior lacuna transversal a refinar.

**Lacunas estruturais identificadas no código (a refinar):**
1. **Não há trilha de auditoria persistida.** Edições de RBAC/Dicionário/D-I-C-I/Hierarquia mutam o store direto, sem log de quem/quando/o-quê. O card "Rastreabilidade / Auditoria" no Overview (`Overview.tsx:37`) **aponta para o Dicionário** — é um placeholder, não existe tela de auditoria.
2. **`RequireAuth` existe mas não está montado nas rotas** (`routes.tsx` usa apenas `Gate`, nunca `RequireAuth`). App não força login.
3. **Conformidade por planta é hardcoded** (`Overview.tsx:56-59`: "Planta Norte 89%…"), não derivada do D-I-C-I + hierarquia reais.
4. **Mismatch de chaves papel↔RBAC parcial.** `SEED_USERS` usa `papel:"Eng. Confiabilidade"` e `ROLES` tem `"Eng. Confiabilidade"` — ok; porém o legado `USERS`/`PERM` mistura `"Eng. de Confiabilidade"`. Risco de papel sem linha na matriz → `permLevel` cai em `"none"` (fail-safe, mas silencioso).
5. **RBAC só edita células da matriz**: os botões "Novo usuário"/"Papéis" (`RBAC.tsx:36`) são inertes; usuários e papéis não são criáveis pela UI.

---

## TESE: governança é uma ESPINHA AMBIENTE, não um item de menu

Os quatro pilares de governança devem estar **presentes em toda tela**, não confinados ao módulo Governança:

| Pilar | Onde mora hoje | Como deve aparecer em TODA tela |
|---|---|---|
| **Hierarquia (Matriz)** | `Hierarquia.tsx` | O **breadcrumb É a matriz**: empresa → planta → área → sistema → ativo, clicável, com escopo herdado |
| **Dicionário** | `Dicionario.tsx` + `SEED_DICTIONARY` | **Todo número rastreia ao Dicionário**: hover/click num valor abre o popover com campo, unidade, faixa, limite, sensor, direção |
| **RBAC** | `rbac.ts` + `RBAC.tsx` | **Toda ação é gated**: `useCan(modulo, nivel)` decide render de botões; rota protegida por `Gate` |
| **D-I-C-I** | `DICI.tsx` + `SEED_DICI` | **Todo artefato carrega seu ciclo**: badge D-I-C-I visível no detalhe do ativo e no cadastro |

### Espinha 1 — O breadcrumb É a Matriz de Hierarquia

**JÁ EXISTE:** `usePageChrome(bc, right)` → `BC` renderiza `string[]` com `ChevronRight` (mesmo separador da árvore em `Hierarquia.tsx`). O último item fica em `C.steel`, os demais em `C.slate`.

**REFINAR:** transformar `bc: string[]` em `bc: BreadcrumbNode[]` onde cada nó conhece `{ id, label, tp, to }`, resolvido a partir da `hierarchy` do store. Numa tela de ativo (`/ativos/BCP-01/overview`), o breadcrumb deveria ler **Forzy Indústria S.A. › Planta Norte › Bombeamento › Sistema de Recalque #1 › Bomba BCP-01 › Visão Geral** — cada segmento clicável, definindo um **escopo herdado** que o Dashboard, Alertas e Telemetria respeitam.

> **IMPACTO no produto real:** novo helper `pathToNode(hierarchy, assetId): HNode[]` (espelha `addChildTo`/`removeFrom` recursivos já em `Hierarquia.tsx`); `chrome.tsx` passa a aceitar nós ricos; `BC` (`ui-shared/index.tsx:90`) ganha `onClick`/`to`. **Esforço: médio.**

### Espinha 2 — Todo número rastreia ao Dicionário

**JÁ EXISTE:** `SEED_DICTIONARY` define para cada grandeza: `campo`, `un`, `faixaMin/Max`, `limiteAlerta`, `limiteCritico`, `direcao`, `sensor`, `ativo` (aplicabilidade). O motor (`evaluateAlerts`, `simulation.ts:122-147`) lê **exatamente** esses campos (com override por ativo via `asset.limites?.[tag.key]`) para gerar alertas — logo o Dicionário **já é a fonte canônica de verdade dos limites**.

**REFINAR:** um componente transversal `<TraceableValue tagKey="temp" value={82} />` que renderiza o número e, ao hover/click, abre um popover com a **linha do Dicionário** (definição, unidade, faixa, limite alerta/crítico, direção, sensor) + link para `/governanca/dicionario`. Isso fecha o ciclo de confiança: o operador vê *82 °C* e entende *de onde vem o limite que disparou o alerta*.

> **IMPACTO:** novo `src/components/governanca/TraceableValue.tsx` lendo `useStore(s=>s.dictionary)`; aplicar em KPIs de telemetria, cards de alerta e detalhe do ativo. **Esforço: médio.**

### Espinha 3 — Toda ação é gated por RBAC

**JÁ EXISTE e é robusto.** `useCan(modulo, nivel)` (`rbac.ts:20`) é reativo (re-renderiza quando papel ou matriz mudam). Padrão consolidado nas telas: `Hierarquia` esconde botões de edição se `!canEdit`; `Dicionario` troca `<input>` por `<span>` + badge `Lock`; `DICI`/`RBAC` desabilitam o clique de ciclo. Rotas sensíveis usam `<Gate modulo=... nivel=...>`.

**REFINAR:** padronizar três níveis de degradação por permissão como **estado de 1ª classe** (ver seção Estados): `full` → editável; `read` → visível somente-leitura com selo de cadeado; `none` → painel "Acesso negado" (`Gate`) ou item oculto no Sidebar. Hoje isso é aplicado caso-a-caso; deve virar convenção documentada.

### Espinha 4 — Todo artefato tem ciclo D-I-C-I

**JÁ EXISTE:** `SEED_DICI` mantém 4 status por ativo. **REFINAR:** expor um `<DiciBadge assetId="ME-07" />` (4 pontos coloridos: verde/âmbar/cinza) no cabeçalho do detalhe do ativo e no card de cadastro, para que o ciclo documental acompanhe o ativo **fora** da tela de Governança.

---

# Telas do escopo (16–20) — GABARITO completo

---

## Tela 16 — Governança · Visão Geral (`/governanca`)
**Arquivo:** `src/pages/governanca/Overview.tsx`

### 1. Job & propósito
Dar ao gestor/governança um **pulso único de conformidade documental e de acessos** e servir de hub de navegação para os quatro subsistemas de governança.

### 2. Personas × RBAC (módulo `Governança`)
| Persona | Papel (seed) | Nível | Default view |
|---|---|---|---|
| Gestor Industrial | Gerente Industrial | `full` | Overview completo + acesso a RBAC |
| TI/Governança | (papel a criar) | `full` | Overview + foco em RBAC/Auditoria |
| Eng. Confiabilidade | Eng. Confiabilidade | `read` | Overview leitura, sem RBAC (`RBAC:none`) |
| Analista de Dados | Analista de Dados | `full` | Overview + Dicionário (foco em tags) |
| Técnico / Operador | Técnico Manutenção / Operador Campo | `none` | **Não vê o módulo** (Sidebar oculta; rota cai em `Gate` "Acesso negado") |

Default view derivada do papel: `useCan("Governança","read")` controla entrada; o card "Permissões RBAC" só deve ser acionável com `useCan("RBAC","read")`.

### 3. Arquitetura de informação
1. **Primário:** faixa de 4 KPIs (Aprovados / Em Revisão / Pendentes / Conformidade %) — leitura imediata do risco documental.
2. **Secundário:** grade 3×2 de cards-portal (Hierarquia, D-I-C-I, Dicionário, RBAC, Auditoria, Configurações).
3. **Sob-demanda:** barras de "Conformidade por Planta" (drill mental para onde está o débito documental).

### 4. Blocos & componentes (ancorados no real)
- `KPI` e `SH` de `@/components/ui-shared`. KPIs já derivam de `dici.flatMap(r=>[r.D,r.I,r.C,r.In])` — **dado real**.
- Tokens: `C.green/yellow/red/steel`, `C.bgCard`, `C.border`; tipografia Rajdhani nos números/títulos.
- Cards-portal: `navigate(to)` para cada subsistema.

### 5. Estados
- **Loading:** store hidratado do `localStorage` (`persist`) → render síncrono; sem skeleton hoje (aceitável).
- **Empty:** se `dici` vazio, `total=1` evita divisão por zero (`Overview.tsx:16`) → mostra 0/0/0/0%. **Refinar:** empty-state explícito "Nenhum ativo no ciclo D-I-C-I".
- **Error:** N/A (dados locais).
- **Tempo real:** os KPIs reagem a qualquer `setDici` em D-I-C-I — **dado vivo é estado de 1ª classe** aqui.
- **Sem-permissão:** `Gate modulo="Governança"` (`routes.tsx:79`) → painel "Acesso negado".

### 6. User stories cobertas
US-13 (visão de governança), US-1 (hub modular — cards de módulos não contratados deveriam virar upsell).

### 7. Governança nativa
A própria tela É a vitrine da governança. **Refinar:** "Conformidade por Planta" deve ser derivada cruzando `hierarchy` (plantas) × `dici` (status por ativo), não hardcoded.

### 8. Confiança da IA
N/A direto; porém o card deve sinalizar que **predições são de modelo simulado** quando linkar para Saúde IA (nota de honestidade transversal).

### 9. Recomendações priorizadas
- **P0** — Derivar "Conformidade por Planta" do estado real (`hierarchy`+`dici`). *Esforço: médio.*
- **P0** — Substituir o card "Auditoria" placeholder (que aponta ao Dicionário) por rota real `/governanca/auditoria`. *Esforço: médio.*
- **P1** — Cards de módulos não contratados viram **upsell** (US-1), nunca link quebrado. *Esforço: baixo.*
- **P2** — Skeleton/empty-state nos KPIs. *Esforço: baixo.*

---

## Tela 17 — Matriz de Hierarquia (`/governanca/hierarquia`)
**Arquivo:** `src/pages/governanca/Hierarquia.tsx`

### 1. Job & propósito
Manter a **árvore de ativos canônica** (empresa→planta→área→sistema→ativo) que dá escopo e contexto a TODA navegação do produto.

### 2. Personas × RBAC
| Papel | Nível Governança | Comportamento |
|---|---|---|
| Gerente Industrial / TI | `full` | Edita (add/rename/remove via hover), botão "Adicionar planta" visível (`canEdit ? <IBtn/>`) |
| Eng. Confiabilidade / Analista | `read`/`full` | Lê e navega; controles de edição ocultos se não-full |
| Técnico / Operador | `none` | Bloqueado por `Gate` |

`const canEdit = useCan("Governança","full")` (`Hierarquia.tsx:34,83`) controla os ícones Pencil/Plus/Trash2 e o `IBtn` "Adicionar planta".

### 3. Arquitetura de informação
- **Primário (2/3):** árvore recursiva (`HiNode`), profundidade `<3` aberta por padrão.
- **Secundário (1/3):** Legenda (ícone+cor por tipo) + Totais por tipo (`countByType`).
- Busca de nó (input presente, **ainda sem filtro funcional** — refinar).

### 4. Blocos & componentes
- `HiNode` recursivo; ícone+cor por tipo: Empresa=`steel`/Building2, Planta=`cobalt`/Map, Área=`slate`/Layers, Sistema=`textSub`/Network, Ativo=`green`/Cpu.
- `addChildTo`/`renameIn`/`removeFrom`/`countByType` — funções puras já implementadas.
- `CHILD_TYPE` impõe a gramática da hierarquia (Empresa→Planta→…→Ativo).
- Persistência: `setHierarchy` grava no store persistido; `toast` confirma.

### 5. Estados
- **Loading:** render direto do store.
- **Empty:** se `hierarchy[0]` ausente, `addRoot` no-op (`Hierarquia.tsx:88`). **Refinar:** empty-state "Crie a empresa raiz".
- **Error:** N/A.
- **Tempo real:** edição reflete instantânea; **o número de ativos aqui é a base de contagem do Dashboard** — mudanças propagam.
- **Sem-permissão:** árvore visível em `read`; ações ocultas; rota inteira em `none` cai no `Gate`.

### 6. User stories
US-13 (rastreabilidade estrutural), **US-6** (planta baixa → artefato navegável: a hierarquia é o destino estrutural do que o OCR/planta produz), suporte a US-7 (escopo de gráficos).

### 7. Governança nativa
**Esta tela É a fonte do breadcrumb-matriz.** A árvore aqui e o `BC` no Topbar devem compartilhar o mesmo modelo `HNode`. Nó `Ativo` já navega ao detalhe (`navigate('/ativos/'+n.id+'/overview')`).

### 8. Confiança da IA
N/A.

### 9. Recomendações
- **P0** — Helper `pathToNode(hierarchy, assetId)` para alimentar o **breadcrumb navegável transversal**. *Esforço: médio.*
- **P1** — Tornar a busca funcional (filtra/expande nós). *Esforço: baixo.*
- **P1** — Validar gramática no remove (impedir orfanar ativos com twins ativos). *Esforço: médio.*
- **P2** — Empty-state de raiz. *Esforço: baixo.*

---

## Tela 18 — Matriz D-I-C-I (`/governanca/dici`)
**Arquivo:** `src/pages/governanca/DICI.tsx`

### 1. Job & propósito
Rastrear o **ciclo de vida documental de cada ativo** — Desenho, Instalação, Comissionamento, Inspeção — e expor débito de conformidade.

### 2. Personas × RBAC
| Papel | Nível | Comportamento |
|---|---|---|
| Gerente / TI | `full` | Clica célula para ciclar status (`cycle`, gated por `canEdit`) |
| Eng./Analista | `read` | Lê + exporta CSV (`exportar` sempre disponível) |
| Técnico/Operador | `none` | `Gate` |

`canEdit = useCan("Governança","full")`; banner muda texto "Clique num status" vs "(somente leitura)" (`DICI.tsx:41`).

### 3. Arquitetura de informação
1. **Primário:** banner explicativo do que é D-I-C-I.
2. **Secundário:** 4 cards-resumo (contagem aprovado/em_revisão/pendente por coluna).
3. **Detalhe:** tabela ativo × {D,I,C,In} com `Badge` + ícone por status.

### 4. Blocos & componentes
- `COL` define rótulos (D—Desenho, I—Instalação, C—Comissionamento, I—Inspeção `In`).
- `NEXT` define o ciclo `aprovado→em_revisao→pendente→aprovado`.
- `sc` mapeia cores (`#34D399`/`#FBBF24`/`#6D8196`); `Badge`, `IBtn` (Exportar) de `ui-shared`.
- `downloadCSV` para o export.

### 5. Estados
- **Loading/Error:** N/A (store local).
- **Empty:** tabela vazia se `dici=[]`. **Refinar:** empty-state.
- **Tempo real:** ciclar uma célula re-renderiza os 4 cards-resumo **e os KPIs da Visão Geral** (mesma fonte). Dado vivo.
- **Sem-permissão:** células `disabled`, sem cursor/scale; banner "(somente leitura)".

### 6. User stories
US-13. Suporte a US-5/US-6 (artefato cadastrado deve nascer com linha D-I-C-I).

### 7. Governança nativa
É o D-I-C-I literal. **Refinar:** cada artefato (desenho, ART, laudo) deveria ter **anexo + responsável + data** por célula, não só um status — hoje o status é abstrato.

### 8. Confiança da IA
N/A.

### 9. Recomendações
- **P0** — Registrar **auditoria** ao ciclar status (quem/quando/de→para) → alimenta a trilha. *Esforço: médio.*
- **P1** — `<DiciBadge assetId/>` reutilizável no detalhe do ativo e cadastro. *Esforço: baixo.*
- **P1** — Anexar artefato + responsável por célula. *Esforço: alto.*
- **P2** — Ativo recém-cadastrado entra com D-I-C-I = pendente automaticamente. *Esforço: baixo.*

---

## Tela 19 — Dicionário de Rastreabilidade E NAVEGAÇÃO (`/governanca/dicionario`)
**Arquivo:** `src/pages/governanca/Dicionario.tsx`

### 1. Job & propósito
Ser a **fonte canônica de verdade dos limites** que governam os alertas do motor — e o destino de rastreabilidade de todo número exibido no produto.

### 2. Personas × RBAC
| Papel | Nível | Comportamento |
|---|---|---|
| Gerente / TI / Analista | `full` | Edita limites/direção, adiciona/remove tags (campos viram `<input>`/`<select>`) |
| Eng. Confiabilidade | `read` | Vê limites como `<span>`, selo `Lock` "Somente leitura" (`Dicionario.tsx:49`) |
| Técnico/Operador | `none` | `Gate` |

### 3. Arquitetura de informação
- **Aviso de estado de edição no topo** (acoplamento ao motor explicitado: "alterar um limite muda os alertas do motor em tempo real").
- Busca (input presente, **filtro a implementar**).
- Tabela: ID Tag · Grandeza · Sensor(rótulo+unidade) · Faixa · **Limite Alerta** · **Limite Crítico** · Direção · Aplicável a · (excluir).

### 4. Blocos & componentes
- `numField(t, "limiteAlerta"|"limiteCritico")` → input numérico (full) ou span (read), cor âmbar(alerta)/vermelho(crítico).
- `TAG_LABEL`/`TAG_UNIT` mapeiam a `key` para rótulo/unidade.
- `upsertTag`/`removeTag` no store; `novaEntrada` cria `TAG-90x`; `exportar` → CSV.

### 5. Estados — **TEMPO REAL é o coração desta tela**
- **Acoplamento vivo:** `evaluateAlerts` (`simulation.ts:122-128`) lê `tag.limiteAlerta/limiteCritico/direcao` (com override `asset.limites?.[tag.key]`) a cada tick (1s). **Editar um limite aqui faz um alerta nascer/resolver no próximo ciclo** — comprovado em `simulation.ts:131-146`.
- **Empty:** tabela vazia se `dictionary=[]`.
- **Sem-permissão:** `read` = leitura com cadeado; coluna de exclusão some.
- **Loading/Error:** N/A.

### 6. User stories
US-13; **direta para US-4** (define V/A/RPM/°C como tags com unidade/faixa); suporte a US-7/US-8/US-9 (todo gráfico e baseline referenciam estas definições).

### 7. Governança nativa
**Esta é a "ponte navegação":** todo `<TraceableValue>` transversal aponta para uma linha daqui. O **breadcrumb de tag** ("Dicionário › Vibração RMS › limite 7.1 mm/s") materializa a rastreabilidade do número até a regra.

### 8. Confiança da IA
Embora o Dicionário seja determinístico, ele é o **denominador de confiança da IA**: a explicação de um alerta-modelo cita o limite daqui. A nota de honestidade — "limites definidos por engenharia, não aprendidos" — pertence a esta tela.

### 9. Recomendações
- **P0** — `<TraceableValue>` transversal lendo `dictionary` → fecha o ciclo "todo número rastreia ao Dicionário". *Esforço: médio.*
- **P0** — Auditar edições de limite (mudança de limite = evento crítico de governança, pois altera alarmística). *Esforço: médio.*
- **P1** — Busca funcional + filtro por ativo aplicável. *Esforço: baixo.*
- **P2** — Validação faixa (alerta dentro de faixaMin/Max; crítico coerente com direção). *Esforço: baixo.*

---

## Tela 20 — Permissões RBAC (`/governanca/rbac`)
**Arquivo:** `src/pages/governanca/RBAC.tsx`

### 1. Job & propósito
Definir **quem acessa o quê** (papel × módulo, níveis none/read/full) — o gate de toda rota, ação e dado do produto.

### 2. Personas × RBAC (módulo `RBAC`)
| Papel | Nível RBAC | Comportamento |
|---|---|---|
| Gerente Industrial / TI | `full` | Edita matriz (clique cicla `none→read→full`) |
| Demais papéis | `none` | Não veem o módulo (Sidebar oculta; `Gate modulo="RBAC"`) |

`canEdit = useCan("RBAC","full")` (`RBAC.tsx:26`). Apenas papéis com `RBAC:full` editam — auto-governança do próprio sistema de permissões.

### 3. Arquitetura de informação
1. **Primário:** tabela de Usuários (avatar, papel, status, último acesso, módulos-chips).
2. **Secundário:** Matriz papel × módulo com ícones (CheckCircle2/Eye/XCircle) + legenda.

### 4. Blocos & componentes
- `ICON(lvl)`: full=verde, read=steel, none=cinza-50%.
- `NEXT` cicla `none→read→full→none`; `cycle(role,mod)` → `setRbac`.
- `initials(u.nome)` para avatar; `Badge` para status.
- `users`/`roles`/`modules`/`rbac` lidos do store.

### 5. Estados
- **Tempo real:** mudar uma célula **re-renderiza o Sidebar e re-avalia os guards** imediatamente (`useCan` é reativo, `rbac.ts:20`). Dado vivo de 1ª classe — alterar `Dashboard` de um papel some/aparece o item na hora.
- **Empty/Loading/Error:** N/A.
- **Sem-permissão:** matriz read-only ("Somente leitura", `RBAC.tsx:96`); botões disabled.

### 6. User stories
**US-13 (núcleo)**; habilitador transversal de US-1 (modularidade por papel) a US-12 (quem fala com o Assistente).

### 7. Governança nativa
É o RBAC literal. **Refinar:** botões "Novo usuário"/"Papéis" (`RBAC.tsx:36`) são inertes — criar/editar usuário e papel deveria existir, e toda mudança de permissão deveria gerar **evento de auditoria** (é a ação mais sensível do produto).

### 8. Confiança da IA
N/A.

### 9. Recomendações
- **P0** — Auditar **toda** mudança de célula RBAC (ator, papel, módulo, de→para, timestamp). *Esforço: médio.*
- **P0** — Montar `RequireAuth` nas rotas (`routes.tsx`) — hoje o app não força login, enfraquecendo todo o RBAC. *Esforço: baixo.*
- **P1** — CRUD de usuários/papéis (ativar os `IBtn` inertes); garantir todo `papel` ter linha na matriz. *Esforço: alto.*
- **P2** — Avisar quando um papel ficar sem nenhum módulo `full` (papel "morto"). *Esforço: baixo.*

---

# Preocupações transversais de domínio

## Trilha de auditoria (a maior lacuna — P0 global)
Hoje **nenhuma** mutação de governança é registrada. Proposta concreta, mínima e aderente à arquitetura existente:

- Nova slice no store: `auditLog: AuditEvent[]` com `{ id, ts, actor (session.nome/userId), modulo, entidade, acao, de, para }`.
- Um único wrapper `logAudit(evt)` chamado dentro de `setRbac`, `setDici`, `upsertTag`/`removeTag`, `setHierarchy` (todos já centralizados em `useStore.ts:140-175`).
- Tela `/governanca/auditoria` (substitui o card placeholder que hoje aponta ao Dicionário) — tabela filtrável + export CSV (reusa `downloadCSV`).
- **Prioridade dos eventos:** mudança de **limite no Dicionário** e de **célula RBAC** são os mais críticos (afetam alarmística e acesso).

> **IMPACTO:** `src/store/useStore.ts` (5 ações), novo `src/pages/governanca/Auditoria.tsx`, rota em `routes.tsx`, item no Sidebar e card no Overview. **Esforço: médio.**

## Modularidade (US-1) na espinha
O Sidebar já oculta seções sem permissão (`visible(m)`, `Sidebar.tsx:56`). Falta o **upsell**: módulo não contratado deve render um item esmaecido com selo "Não contratado → falar com Forzy", nunca rota quebrada. Distinguir `none` (sem permissão) de "não contratado" exige um flag de tenancy além do RBAC.

## Nota de honestidade da IA (transversal)
Qualquer tela que exiba predição (RUL, probFalha, modoCritico vindos de `predict`/`computeRUL`, `engine/prediction.ts`) deve carregar o selo: **"Modelo de degradação SIMULADO (físico-informado + Weibull), não treinado em falhas reais"**. A interface `PredictionModel` já permite plugar um modelo treinado — o selo deve trocar automaticamente quando isso acontecer. A Governança é a guardiã desse selo.

## Convenção de estados por permissão (padrão único)
| Nível | Render | Selo |
|---|---|---|
| `full` | Editável (inputs/cliques ativos) | "✎ Edição habilitada" |
| `read` | Somente-leitura (spans/badges) | `Lock` "Somente leitura" |
| `none` | Oculto no Sidebar; `Gate` "Acesso negado" na rota | ShieldAlert |

Já aplicado em Dicionário/D-I-C-I/RBAC/Hierarquia; **documentar como convenção** e reusar via componentes.
