# Tela 03 — Lista de Ativos Monitorados

## 1. Nome da tela

**Lista de Ativos Monitorados** (`Ativos › Lista de Ativos`).
Rota real: `/ativos` → `src/pages/AtivosLista.tsx` (rota registrada em `src/routes.tsx`, linha 53). Breadcrumb de chrome definido em `usePageChrome(["Ativos","Lista de Ativos"])`.

É a **tela-índice da frota**: o ponto de entrada operacional para enxergar todos os ativos da hierarquia visível ao usuário, triá-los por saúde/criticidade e abrir o gêmeo digital de qualquer um deles.

---

## 2. Objetivo da tela

**Estado atual no produto.** Hoje `AtivosLista.tsx` já renderiza uma tabela densa, alimentada por dados **vivos** via `useAssetViews()` (`src/store/derive.ts`), que cruza o registro estático `Asset` com o `AssetTwin` do motor de simulação. Cada linha já mostra **Tag, Nome/Tipo, Área/Planta, Status (badge derivado do twin), Saúde (barra + %), Criticidade e Última Leitura** ("ao vivo" ou `Offline` com ícone `WifiOff`). Já existe **busca client-side** (`q`, filtrando por `nome` ou `id`), **exportação CSV** real (`downloadCSV` com nameplate completo), **ação de criar ativo gated por RBAC** (`useCan("Cadastro","full")`) e **navegação por clique na linha** para `/ativos/:id/overview`. O contador de rodapé "Exibindo N de M ativos" já é real.

**Porém, três peças do wireframe ainda são decorativas e não refletem o produto:** (a) os três `<select>` de status (`["Todos os Status","Normal","Atenção","Crítico","Offline"]` cortados por `.slice(0,3)`) **não têm estado nem `onChange`** — não filtram nada; (b) o botão **"Filtros"** (`SlidersHorizontal`) **não abre painel algum**; (c) a **paginação** (`[1,2,3,"...",12]`) é **estática e sem handler** — a tabela já mostra todos os ativos numa página só, então o "12" é fictício. Os botões de linha `Eye`/`MoreHorizontal` também não têm `onClick`.

**Objetivo-alvo do refinamento.** Tornar a Lista de Ativos a **central de triagem da frota**: encontrar rapidamente o ativo certo dentro da hierarquia (planta → área → sistema), priorizar por **saúde / criticidade / RUL** (Remaining Useful Life — hoje existe em `twin.rulDias` mas **não é exibido**), ler o estado operacional de cada ativo sem abrir o detalhe, e descer ao gêmeo digital em um clique. Tudo respeitando RBAC e a hierarquia do usuário (US-7, US-13). A tela deve ser **navegação governada**: o que aparece, o que se ordena e o que se pode fazer é função do papel e da hierarquia.

---

## 3. Perfil principal que usa a tela

| Persona | Uso primário | Nível esperado (RBAC, módulo `Ativos`/`Cadastro`) |
|---|---|---|
| **(a) Técnico de Manutenção** | Persona-âncora. Localiza o ativo da ordem de serviço, lê saúde/criticidade, abre o gêmeo. Ordena por saúde para atacar o pior primeiro. | `Ativos: read/full`; `Cadastro: none/read` (não vê "Novo Ativo") |
| **(b) Gestor Industrial** | Visão de frota: quantos críticos, distribuição de saúde por área, exporta CSV para reunião. Ordena por criticidade × RUL. | `Ativos: full`; `Cadastro: full` (vê "Novo Ativo") |
| **(c) Cliente da Indústria** | Vê **apenas** os ativos da sua planta/área (hierarquia filtrada). Leitura amigável (US-2), sem ações de escrita. | `Ativos: read`; `Cadastro: none` |
| **(d) Admin Forzy** | Visão completa, multi-planta. Cria/edita ativos, valida cadastro pós-OCR. | tudo `full` |
| **(e) TI/Governança** | Audita a coerência ativo↔hierarquia↔dicionário; confere se cada ativo rastreia à Matriz e tem ciclo D-I-C-I. | `Governança: full`; `Ativos: read` |

---

## 4. User stories da Forzy atendidas

- **US-7 (valores atuais + histórico)** — núcleo da tela: cada linha expõe o **valor de saúde atual** (derivado do twin) e o **status ao vivo**; é o trampolim para os gráficos históricos do detalhe (`/ativos/:id/telemetria`).
- **US-13 (governança de acessos/dados)** — a lista é **gated e filtrada por RBAC + hierarquia**: "Novo Ativo" só aparece com `Cadastro:full`; o conjunto de linhas deve respeitar a hierarquia do papel (cliente vê só sua planta).
- **US-2 (interface amigável p/ cliente industrial)** — densidade controlada, badges legíveis e busca direta tornam a frota navegável sem treinamento.
- **US-3 (leitura de dado raw → base histórica)** — a "Última Leitura"/"ao vivo" ancora visualmente que cada ativo é uma fonte de telemetria contínua.
- **Suporte a US-10/US-11 (parada/manutenção planejada)** — ao surfacer **RUL** na ordenação, a lista vira a fila de priorização de manutenção (refinamento proposto em §11).

---

## 5. Blocos e seções da tela

| # | Bloco | Conteúdo atual | Refinamento proposto (resumo) |
|---|---|---|---|
| **B0** | **Chrome / breadcrumb + ações de página** | `usePageChrome(["Ativos","Lista de Ativos"])` + `Exportar` (CSV) + `Novo Ativo` (gated) | Breadcrumb passa a refletir o **filtro hierárquico ativo** (Empresa › Planta › Área), não rótulo fixo |
| **B1** | **Barra de filtros + busca** | `input` de busca (flex-1) + 3 `<select>` decorativos + botão "Filtros" | Vira **barra de controle real**: busca + filtros hierárquicos encadeados (planta→área→sistema) + chips de filtro ativo + seletor de ordenação + alternância tabela/cards |
| **B2** | **Tabela de ativos (densidade alta)** | `<table>` 8 colunas, zebra, hover, clique-na-linha → overview | Adicionar coluna **RUL** + **modo crítico**; cabeçalho com **ordenação clicável**; densidade configurável |
| **B2'** | **(novo) Visão em cards** | inexistente | Grid de cards para leitura "amigável" (US-2), default do perfil **Cliente** |
| **B3** | **Rodapé: contador + paginação** | "Exibindo N de M" + paginação estática `[1,2,3,...,12]` | Paginação **funcional** ou virtualização; contador reflete filtro; ação "Exportar visão filtrada" |
| **B4** | **(novo) Estado vazio / sem-permissão** | inexistente (renderiza tabela vazia) | Empty-state quando busca/filtro não retorna nada; mensagem de hierarquia restrita |

---

## 6. Componentes principais

| Componente | Origem real | Papel na tela | Refinamento |
|---|---|---|---|
| `usePageChrome(items, actions)` | `src/components/layout/chrome` | Injeta breadcrumb + ações no topbar | Breadcrumb dinâmico por filtro hierárquico |
| `IBtn` | `ui-shared/index.tsx` | "Exportar" e "Filtros" | "Filtros" passa a togglar painel/drawer com contador de filtros ativos |
| Botão "Novo Ativo" | inline em `AtivosLista.tsx` | CTA primário cobalto, gated por `useCan("Cadastro","full")` | Mantido; ganha atalho para OCR (`/cadastro/ocr`) |
| `<input>` busca | inline | Busca por `nome`/`id` (case-insensitive) | Estender para **área** (placeholder já promete "tag, nome ou área"!) e tag do dicionário |
| `<select>` status × N | inline (decorativo, `.slice(0,3)`) | — (não funcional) | Substituir por filtros reais com estado e `onChange`; transformar em **chips multi-seleção** |
| `<table>` + `<thead>`/`<tbody>` | inline | Grade densa de ativos | Cabeçalho **ordenável** (clique → `sort`); colunas RUL/modo |
| `Badge` (`s={a.status}`) | `ui-shared` | Status normal/atenção/crítico/offline | Mantido — já mapeia a paleta C |
| `Bar_` (`v={a.saude}`) | `ui-shared` | Barra de saúde com cor por faixa (≥75 verde, ≥50 âmbar, <50 vermelho) | Mantido; adicionar `aria`/tooltip do dicionário |
| `downloadCSV` | `src/lib/csv` | Exportação real do nameplate | Exportar **respeitando filtro/ordenação**, não `views` cru |
| `useAssetViews()` | `src/store/derive.ts` | Fonte de dados viva (Asset × Twin) | Expor `rulDias`, `modoCritico`, `cargaPct` no `AssetView` (hoje truncados) |
| `useNavigate` | `react-router` | Clique-na-linha → `/ativos/:id/overview` | Mantido; `Eye` reaproveita rota, `MoreHorizontal` abre menu de ações |
| `useCan` | `src/auth/rbac.ts` | Gating de "Novo Ativo" | Estender ao gating de filtro hierárquico |

---

## 7. Dados exibidos

Por linha (origem real em `assetView()` / `AssetView` de `src/store/derive.ts`):

| Coluna (atual) | Campo | Origem | Rastreabilidade / governança |
|---|---|---|---|
| **Tag** | `a.id` | `Asset.id` | Identidade na Matriz de Hierarquia; mono JetBrains, cor `steel` |
| **Nome / Tipo** | `a.nome` + `a.asset.tipo` | `Asset` | Classe do ativo → define quais tags do dicionário se aplicam |
| **Área / Planta** | `a.area` + `a.planta` | `Asset` | Nós da hierarquia (planta › área) |
| **Status** | `a.status` | **`twin.status`** (band derivado) ou `offline` | Derivado dos limites do **dicionário** pelo motor |
| **Saúde** | `a.saude` | **`twin.health`** (0–100) | Função do dano acumulado por modo de falha |
| **Criticidade** | `a.crit` | `Asset.criticidade` (`Baixa…Crítica`) | Atributo de governança do ativo |
| **Última Leitura** | `a.leitura` | "ao vivo" / `Offline` | Liveness da telemetria (US-3) |

**Dados já calculados pelo motor mas NÃO exibidos hoje (refinamento §11):**

| Dado desejado | Campo real | Onde mora | Por que surfacer |
|---|---|---|---|
| **RUL (dias)** | `twin.rulDias` | `AssetTwin` (`src/lib/types.ts` l.97) | Ordenação por urgência de manutenção (US-10/11) |
| **Modo crítico** | `twin.modoCritico` / `worstMode(twin.damage)` | `AssetTwin` / `engine/model` | Diz *o que* vai falhar (rolamento, cavitação…) |
| **Carga operacional** | `twin.cargaPct` | `AssetTwin` | Contextualiza por que a saúde cai |
| **Residual (anomalia)** | `twin.residual` | `AssetTwin` | Sinaliza desvio modelo↔medição (US-9) |
| **Nameplate (kW/RPM/série)** | `a.pot/a.rpm/a.serie/a.fab/a.modelo` | já no `AssetView`, só vai no CSV | Tooltip/expand sem abrir detalhe |

---

## 8. Ações do usuário

| Ação | Estado atual | Gating | Refinamento |
|---|---|---|---|
| **Buscar** (tag/nome/área) | Funcional (`q`), mas só `nome`/`id` | — | Incluir área (placeholder já promete) e ser debounced |
| **Abrir ativo** (clique na linha) | Funcional → `/ativos/:id/overview` | `Ativos:read` | Mantido; `Eye` espelha; foco/teclado |
| **Exportar CSV** | Funcional (`downloadCSV`) | `Ativos:read` | Exportar **visão filtrada/ordenada** |
| **Novo Ativo** | Funcional → `/cadastro` | `useCan("Cadastro","full")` | Mantido; menu split → `/cadastro/ocr` (US-5) |
| **Filtrar por status** | **Não funcional** (selects decorativos) | — | Tornar real, multi-seleção em chips |
| **Filtrar por hierarquia** (planta/área/sistema) | **Inexistente** | hierarquia do papel | Selects encadeados; default = hierarquia do usuário |
| **Ordenar** (saúde/criticidade/RUL) | **Inexistente** | — | Cabeçalho clicável + seletor; default = saúde asc (pior primeiro) |
| **Paginação** | **Estática/fake** | — | Funcional ou virtualização |
| **Menu de linha** (`MoreHorizontal`) | **Sem handler** | por ação | Ações rápidas: abrir gêmeo, ver alertas do ativo, abrir no assistente, exportar 1 |
| **Alternar densidade / tabela↔cards** | Inexistente | — | Toggle; cards = default do Cliente (US-2) |

---

## 9. Relação com outras telas

- **→ Detalhe do ativo** (`/ativos/:id/overview`, `src/pages/ativo/Overview.tsx`): destino primário do clique. Daí ramifica para **Telemetria** (US-7), **Saúde IA** (US-8/9/10), **Gêmeo Digital** e **Técnico** (nameplate/US-5).
- **← Dashboard** (`/dashboard`): KPIs de frota (críticos, disponibilidade via `fleetAvailability`) **levam** à Lista pré-filtrada (drill-down "ver críticos").
- **→ Cadastro** (`/cadastro`) e **OCR** (`/cadastro/ocr`): origem de novos ativos; "Novo Ativo" é a ponte (gated).
- **↔ Alertas** (`/alertas`): a Lista é por-ativo; os alertas são o feed cross-ativo. Refinamento: menu de linha → alertas filtrados por `assetId`.
- **↔ Assistente** (`/assistente/:assetId`): ação de linha "perguntar à IA sobre este ativo" (US-12).
- **↔ Mapa da Planta** (`/mapa`): a Lista é a visão tabular; o Mapa é a espacial (US-6) — mesmo conjunto de ativos, hierarquia compartilhada.
- **↔ Governança › Hierarquia** (`/governanca/hierarquia`): os filtros planta/área/sistema **são** a Matriz de Hierarquia projetada nesta tela.

---

## 10. Relação com governança

- **Hierarquia (Matriz):** Tag, Área e Planta de cada linha são nós da árvore empresa→planta→área→sistema→ativo. O **breadcrumb** e os **filtros hierárquicos** projetam essa matriz; a lista visível deve ser **recortada pela hierarquia do papel** (cliente ≠ admin).
- **Dicionário:** **Status** e **Saúde** não são atributos crus — derivam dos limites do dicionário aplicados pelo motor (`twin.status`/`twin.health`). Cada número rastreia a campo/unidade/faixa/limite/sensor/direção (`Tag` em `types.ts`). Refinamento: tooltip da barra de saúde citando o modo/limite que puxa o valor.
- **RBAC:** "Novo Ativo" já é gated por `useCan("Cadastro","full")`. Exportação e ações de linha devem respeitar `Ativos`/`Cadastro`. Navegação é governada: papel sem `Ativos:read` não chega aqui.
- **Ciclo D-I-C-I:** cada ativo tem ciclo Desenho→Instalação→Comissionamento→Inspeção (governança via `/governanca/dici`). Refinamento: indicador de estágio D-I-C-I por linha (ex.: ativo recém-cadastrado por OCR ainda "em Comissionamento"), distinguindo ativo **operando** de ativo **em implantação**.
- **Honestidade de IA:** RUL e modo crítico vêm de modelo de degradação **simulado** (físico-informado + Weibull, não treinado em falhas reais). Ao surfacer RUL na lista, marcar visualmente que é **estimativa de modelo** (badge/tooltip), coerente com o padrão único de output de IA.

---

## 11. Melhorias de UX/UI sobre o wireframe base

**1. Transformar os filtros decorativos em filtros reais e hierárquicos (P0).**
Em `AtivosLista.tsx` (l.45–48), os três `<select>` de status são gerados a partir de um array, **cortados por `.slice(0,3)`** e **sem `value`/`onChange`** — não filtram nada. Substituir por: (a) **filtros hierárquicos encadeados** Planta → Área → Sistema (derivados dos campos `area`/`planta` de `AssetView`, idealmente da Matriz em `/governanca/hierarquia`), default = hierarquia do papel; (b) **chips multi-seleção de status** (normal/atenção/crítico/offline) com estado real; (c) **chips de criticidade**. Exibir **chips de filtro ativo removíveis** acima da tabela. O botão "Filtros" (`SlidersHorizontal`) hoje é inerte — deve abrir um **drawer** com os filtros avançados e mostrar um contador "(3)".

**2. Surfacer RUL e modo crítico — a coluna que falta para virar fila de manutenção (P0).**
`twin.rulDias` e `twin.modoCritico` existem no `AssetTwin` mas o `AssetView` (derive.ts l.11–16) **os descarta**. Estender `AssetView` para carregá-los e adicionar colunas **"RUL"** (dias, mono) e **"Modo Crítico"** (label via `FAILURE_MODE_LABEL`). Isso é o que conecta a Lista a US-10/US-11: ordenar por RUL ascendente = "o que vai falhar primeiro no topo". Marcar RUL como **estimativa de modelo simulado** (tooltip de honestidade).

**3. Ordenação real por saúde / criticidade / RUL (P0).**
Hoje não há ordenação — a lista sai na ordem de `assets`. Tornar o `<thead>` (l.55) **clicável** com indicador ↑/↓ e adicionar um seletor "Ordenar por". **Default proposto: saúde ascendente** (pior ativo primeiro) para o Técnico; **criticidade×RUL** para o Gestor. Estado local de `sortKey`/`sortDir`.

**4. Paginação funcional ou virtualização (P1).**
A paginação `[1,2,3,"...",12]` (l.97) é **estática e sem handler**, e o `data.map` já renderiza **todos** os ativos numa página só — o "12" é ficção. Para a escala de demo, **remover a paginação fake** e adicionar **virtualização**/scroll com header sticky; o contador "Exibindo N de M" já é honesto e deve refletir o filtro.

**5. Ligar os botões de linha (`Eye`/`MoreHorizontal`) (P1).**
Ambos (l.86–87) estão sem `onClick`. `Eye` deve navegar ao overview (espelhando o clique-na-linha) e `MoreHorizontal` abrir um **menu de ações rápidas**: abrir Gêmeo, ver Alertas do ativo (`/alertas?asset=`), perguntar ao Assistente (`/assistente/:assetId`, US-12), exportar single. Hoje o clique nesses botões **propaga para a linha** e navega — adicionar `stopPropagation`.

**6. Visão em cards para o perfil Cliente (P1, US-2).**
A tabela densa é ideal para Técnico/Gestor, mas agressiva para o **Cliente da Indústria**. Adicionar toggle **tabela ↔ cards** (grid de `KPI`-like cards com Tag, saúde grande, status, RUL), default = cards quando papel = Cliente. Reaproveita `Bar_`, `Badge`, paleta C — sem mudar identidade.

**7. Estado vazio e recorte de hierarquia (P1).**
Quando busca/filtro não retorna nada, hoje renderiza `<tbody>` vazio (tabela "fantasma"). Adicionar **empty-state** ("Nenhum ativo corresponde a estes filtros — limpar"). E, para US-13, mensagem honesta quando a hierarquia do papel restringe o conjunto ("Exibindo apenas ativos da sua planta").

**8. Indicador de estágio D-I-C-I + liveness por linha (P2).**
"Última Leitura" hoje só diz "ao vivo"/"Offline". Acrescentar **idade da última sincronização** (`twin.syncedAt` via `format`) e um micro-indicador de **estágio D-I-C-I**, distinguindo ativo **operando** de ativo **em implantação** (recém-OCR). Reforça a coluna de governança sem poluir.

**9. Coerência da exportação com a visão (P2).**
`exportar()` (l.19–24) hoje exporta **`views` inteiro**, ignorando busca/ordenação ativas. Trocar para exportar `data` (a visão filtrada) — o usuário espera exportar **o que vê**, e isso fecha o loop com a barra de filtros do item 1.
