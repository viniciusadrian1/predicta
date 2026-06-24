# 14 — Mapa Digital da Planta

> Refinamento de produto · PREDICTA / FORZY
> Arquivo real: `src/pages/MapaPlanta.tsx` · Dados derivados: `src/store/derive.ts`
> Cobertura primária: **US-6** (planta baixa → artefato digital navegável) e **US-13** (governança de acessos/dados).

---

## 1. Nome da tela

**Mapa Digital da Planta** — "Planta Norte · Vista Superior".

Breadcrumb real (via `usePageChrome(["Ativos","Mapa da Planta"])` em `MapaPlanta.tsx:36`): **Ativos › Mapa da Planta**. A tela é a materialização espacial do gêmeo digital da frota: a planta baixa industrial deixa de ser uma imagem estática e vira um **artefato navegável** onde cada área e cada ativo carregam o status vivo do twin. É o ponto onde a Matriz de Hierarquia (empresa → planta → área → sistema → ativo) ganha representação geográfica, e não apenas em árvore.

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** Hoje `MapaPlanta.tsx` renderiza um SVG `viewBox="0 0 660 350"` com fundo de grid técnico (`pattern#fp`) e vinheta radial cobalto (`radialGradient#bg`). Sobre ele há **6 áreas** hard-coded no array `areas` (Bombeamento, Produção A, Produção B, Utilidades, Armazenagem, Subestação), cada uma com retângulo `rx=6` e rótulo. Dentro das áreas, **8 marcadores de ativo** posicionados manualmente em `apos` (BCP-01, BCP-02, ME-07, RV-12, CA-03, VT-05, GR-04, TR-09). A cor de cada marcador vem do status real do twin via `statusById` (derivado de `useAssetViews()` → `derive.ts:32`), mapeado pela paleta `sc = { normal: verde, atencao: âmbar, critico: vermelho, offline: slate }` (`MapaPlanta.tsx:15`). A borda de cada área **escala o pior status interno** (`hasCrit` → vermelho 50%, `hasAtt` → âmbar 35%, senão steel 15% — linhas 67-69). Clicar num marcador navega para `/ativos/{id}/overview` (`navigate`, linha 85); clicar numa área apenas seleciona (`setSel`, linha 71), realçando borda steel — **mas o `sel` não filtra nem dispara nada além do realce**. À direita há dois cards: **Resumo** (contadores por status via `statusCounts`) e **Ativos** (lista clicável de todos os ativos). No chrome há `IBtn` "Filtrar" (sem handler — decorativo) e "Exportar" (funcional, `downloadCSV` → `mapa-ativos-{timestamp}` com Tag/Nome/Área/Status/Saúde).

**Objetivo a consolidar (o que REFINAR).** Elevar o mapa de uma *ilustração com bolinhas coloridas* para a **camada espacial canônica do gêmeo digital**: o lugar onde o operador (a) lê o estado de saúde da planta inteira em um olhar, por geografia e não por lista; (b) navega da visão macro (planta) até o ativo individual respeitando a Hierarquia; (c) liga camadas por área/sistema para isolar o que importa; (d) entende *por que* uma área está vermelha (rastreio ao Dicionário e ao modo crítico do twin) sem perder a NOTA DE HONESTIDADE de que o status vem de motor simulado. Tudo gated por RBAC do módulo **Mapa** (US-13).

---

## 3. Perfil principal que usa a tela

| Persona | Uso principal no mapa | Nível RBAC esperado (`módulo Mapa`) |
|---|---|---|
| **(a) Técnico de Manutenção** | Persona-âncora. Localiza fisicamente o ativo em alarme, "onde no chão de fábrica está o vermelho", e salta para o overview/telemetria. | `read`/`full` |
| **(b) Gestor Industrial** | Leitura macro de saúde da planta por área; identifica concentração de risco (qual sistema puxa o indicador para baixo). | `read`/`full` |
| **(c) Cliente da Indústria** | Visão de confiança simplificada — "minha planta está verde". Versão US-2 (amigável), sem ruído técnico. | `read` |
| **(d) Admin Forzy** | Valida fidelidade do layout vs. cadastro/hierarquia; usa como QA do gêmeo. | `full` |
| **(e) TI/Governança** | Audita coerência mapa ↔ Hierarquia ↔ Dicionário; verifica que a navegação é governada por papel. | `read` |

A tela respeita papel/hierarquia: hoje `useAssetViews()` retorna a frota inteira do seed; o refino (§11) deve **escopá-la à subárvore da Hierarquia visível ao papel** — um Cliente só vê sua planta.

---

## 4. User stories da Forzy atendidas

| US | Como esta tela atende | Estado |
|---|---|---|
| **US-6** | Planta baixa → artefato digital navegável: SVG de áreas + marcadores clicáveis que levam ao ativo. | JÁ EXISTE (parcial — layout hard-coded, não importado da planta) |
| **US-13** | Governança de acessos/dados: a tela deve gatear módulo Mapa por RBAC e escopar pela Hierarquia. | REFINAR (hoje não há `useCan('Mapa')` na página) |
| **US-2** | Interface amigável: leitura macro de status por cor, sem exigir conhecimento técnico. | JÁ EXISTE (apoio) |
| **US-7** | Ponte para "valores atuais + históricos": clique no marcador → `/ativos/{id}/overview`. | JÁ EXISTE (navegação) |
| **US-1** | Solução modular: mapa é um módulo independente, ligado por RBAC e roteamento. | JÁ EXISTE (apoio) |
| **US-9 / US-10** | Cor por status reflete anomalia/risco do twin; o mapa é a *vitrine espacial* dessas predições. | JÁ EXISTE (apoio — consome status, não exibe confiança/explicação ainda) |

---

## 5. Blocos e seções da tela

Layout real: `grid grid-cols-4 gap-4` → canvas ocupa `col-span-3`, painel lateral `col-span-1` (`MapaPlanta.tsx:41`).

| # | Bloco | O que contém hoje | Origem no código | Refino-chave (→ §11) |
|---|---|---|---|---|
| **B1** | **Chrome / breadcrumb + ações** | Breadcrumb "Ativos › Mapa da Planta"; `IBtn` Filtrar (inerte) + Exportar (CSV). | `usePageChrome(...)` L36-38 | Ligar Filtrar a um painel de camadas; gatear Exportar por RBAC. |
| **B2** | **Canvas da planta (SVG)** | Grid técnico, vinheta, 6 áreas, 8 marcadores, indicador Norte "N ↑". | `<svg>` L52-94 | Adicionar zoom/pan, tooltip on-hover, camadas por sistema, fitas de processo. |
| **B3** | **Legenda de status** | 4 chips (Normal/Atenção/Crítico/Offline) no header do `SH`. | `SH right=...` L44-50 | Tornar a legenda **clicável = filtro** (toggle por status). |
| **B4** | **Card Resumo** | Total + contagem por status (verde/âmbar/vermelho/slate). | `statusCounts` L99-107 | Transformar contadores em **filtros** e adicionar % de saúde média da frota. |
| **B5** | **Card Ativos (lista)** | Todos os ativos, ponto de status + nome + TAG, clicável → overview. | L108-119 | Sincronizar com seleção do mapa (hover cruzado), agrupar por área, virar busca. |
| **B6** | **Painel de detalhe da área/ativo** | **NÃO EXISTE** — `sel` só realça a borda. | `setSel` L71 | **Criar**: ao selecionar área, mostrar drill-down dos ativos daquela área + rastreio ao Dicionário. |

---

## 6. Componentes principais

| Componente | Papel na tela | Arquivo real | Observação de refino |
|---|---|---|---|
| `MapaPlanta` (page) | Orquestra canvas + painéis. | `src/pages/MapaPlanta.tsx` | Container; precisa de `useCan('Mapa')` + escopo de hierarquia. |
| `useAssetViews()` | Junta `Asset` estático + `AssetTwin` vivo → `AssetView[]` (id, nome, area, status, saude…). | `src/store/derive.ts:32` | Fonte única de status/cor. Deve aceitar filtro por subárvore da Hierarquia. |
| `statusCounts()` | Agrega frota por status p/ o card Resumo. | `derive.ts:38` | Reusar para os filtros clicáveis do B4. |
| `SH` | Cabeçalho de seção com slot `right` (legenda). | `ui-shared/index.tsx` | Já usado; legenda deve virar controle, não enfeite. |
| `IBtn` | Botões de ação do chrome (Filtrar/Exportar). | `ui-shared/index.tsx` | "Filtrar" precisa de handler real. |
| `downloadCSV` | Export do inventário do mapa. | `src/lib/csv.ts` | Gate por `can('Mapa','read')` no mínimo; ideal `full`. |
| `C` (paleta) / `theme` | Cores de status, fundo, bordas. | `src/lib/theme.ts` | `sc` deve importar o mesmo mapa de cores de status usado em Alertas/Dashboard (single source). |
| `<svg>` inline | Canvas vetorial (áreas + marcadores). | `MapaPlanta.tsx:52-94` | Extrair para `<PlantCanvas>` reutilizável; alimentar por dados, não literais. |
| `useNavigate` (react-router) | Salto marcador/lista → `/ativos/{id}/overview`. | `routes.tsx` | Manter; adicionar deep-link `?area=BOM` para estado compartilhável. |
| **`SevBadge` / `Badge`** | **Ausente aqui** — usar no painel de detalhe (B6) para status/criticidade. | `ui-shared/index.tsx` | Introduzir no drill-down. |

---

## 7. Dados exibidos

Todo número rastreia ao Dicionário (campo, unidade, faixa, limite, sensor, direção). O mapa hoje exibe **status derivado**, não valores brutos; o rastreio entra no painel de detalhe (B6).

| Dado | Origem real | Unidade/forma | Rastreio governança |
|---|---|---|---|
| **Status do ativo** (cor do marcador) | `twin.status` via `AssetView.status` (`derive.ts:22`) | enum `normal/atencao/critico/offline` → cor `sc` | Banda derivada de limites do Dicionário (`Tag.limiteAlerta/limiteCritico`, `types.ts:115-117`). |
| **Status agregado da área** (cor da borda) | `a.assets.some(...statusById...)` (L67-69) | "pior status interno" → vermelho/âmbar/steel | Espelha a regra de severidade; deve declarar a lógica "pior caso". |
| **TAG do ativo** | `AssetView.id` | `JetBrains Mono` (L88) | Identidade da Hierarquia (folha = ativo). |
| **Nome do ativo** | `AssetView.nome` | texto (card Ativos) | — |
| **Área** | array `areas` (literal) + `AssetView.area` | rótulo | **Hoje desacoplado**: `areas` é hard-coded, não vem de `Asset.area`/`HNode`. |
| **Contadores** Total/Normais/Atenção/Críticos/Offline | `statusCounts(views)` | inteiros, cor por status | Soma da frota visível. |
| **Saúde (%)** | `AssetView.saude` = `twin.health` (`derive.ts:21`) | 0–100 | Exportado no CSV; **não exibido no canvas** — oportunidade (§11). |
| **Indicador Norte** | literal "N ↑" (L93) | texto | Orientação espacial. |

**Dados que faltam exibir e existem no twin:** `rulDias` (RUL), `modoCritico` (`FailureMode`), `probFalha` (curva), `residual` (sinal de anomalia). São o material do tooltip/painel de detalhe — e onde o **PADRÃO ÚNICO DE OUTPUT DE IA** (valor + horizonte + confiança + explicação + nota de honestidade) deve aparecer.

---

## 8. Ações do usuário

| Ação | Gesto | Resultado atual | Gate RBAC | Refino |
|---|---|---|---|---|
| **Selecionar área** | clique no retângulo | `setSel(a.id)` → realça borda steel (L71-75) | `read` | Deve abrir painel de detalhe (B6) e filtrar a lista. |
| **Abrir ativo (mapa)** | clique no marcador | `navigate('/ativos/{id}/overview')` (L85) | `read` | Manter; tooltip antes do salto. |
| **Abrir ativo (lista)** | clique no item | `navigate(...overview)` (L111) | `read` | Hover deve realçar o marcador correspondente no canvas. |
| **Exportar CSV** | clique "Exportar" | `downloadCSV(mapa-ativos-…)` (L34) | **falta gate** → exigir `can('Mapa','read')` | Incluir RUL/modo crítico/área-hierárquica no CSV. |
| **Filtrar** | clique "Filtrar" | **nada** (sem handler) | — | Implementar painel de camadas (área/sistema/status). |
| **Toggle status (legenda)** | — (não existe) | — | `read` | Legenda/contadores viram filtros de visibilidade. |
| **Zoom / pan** | — (não existe) | — | `read` | Adicionar para plantas grandes. |

---

## 9. Relação com outras telas

```
                 Hierarquia (Governança)
                  empresa→planta→área→sistema→ativo
                          │ define o layout/escopo
                          ▼
   Dashboard  ──macro──▶  MAPA DA PLANTA  ──clique ativo──▶  Ativo › Overview
   (KPIs)                  (geografia)                         (telemetria US-7,
       ▲                       │                                predição US-9/10)
       │ contadores            ├──cor por status──── Twin (engine)
   Alertas ◀──área crítica─────┘                     (status/saúde/RUL)
```

| Tela | Direção | Vínculo real |
|---|---|---|
| **Ativo › Overview** (`/ativos/{id}/overview`) | mapa → ativo | `navigate` direto do marcador e da lista. Destino primário. |
| **Dashboard** | irmãos | Compartilha `useAssetViews`/`statusCounts`; mapa é o "drill" espacial dos KPIs. |
| **Alertas** | bidirecional (proposto) | Área crítica deveria linkar para os alertas dos ativos daquela área. |
| **Hierarquia (Governança)** | hierarquia → mapa | A árvore (`HNode`, `types.ts:133`) deve **gerar** as camadas/escopo do mapa; hoje desacoplado. |
| **Cadastro de Ativos** | cadastro → mapa | Origem de `Asset.area`, nameplate; novo ativo deveria aparecer no mapa. |
| **OCR / Planta baixa (US-6)** | upload → mapa | O fluxo US-6 (leitura da planta baixa) é a **fonte ideal** do layout que hoje é literal. |

---

## 10. Relação com governança

A governança é a espinha ambiente desta tela — e é justamente onde o estado atual está mais fraco (US-13 marcada como REFINAR).

- **Hierarquia (Matriz):** o breadcrumb "Ativos › Mapa da Planta" posiciona a tela, mas o **layout não deriva da Hierarquia** — `areas`/`apos` são literais em `MapaPlanta.tsx:19-32`. Refino: cada área do canvas deve ser um nó `HNode` (`tp` área/sistema), e o conjunto de ativos visível deve ser a **subárvore autorizada ao papel** do usuário (escopo por planta/área). Um Cliente vê só sua planta; um Admin Forzy vê tudo.
- **Dicionário:** as cores (`sc`) e a borda de área (L67-69) traduzem bandas que nascem dos limites do Dicionário (`Tag.limiteAlerta/limiteCritico`, direção `acima/abaixo`). O painel de detalhe (B6) deve **mostrar o rastreio**: qual TAG/limite/sensor levou aquele ativo a vermelho.
- **RBAC:** **lacuna crítica** — a página não chama `useCan('Mapa', …)`. Hoje qualquer sessão renderiza tudo, inclusive o Exportar. Refino: gatear render por `can('Mapa','read')`, gatear "Exportar" e (futuro) edição de layout por `full`. (`rbac.ts:15`, `useCan` em `rbac.ts:20`.)
- **Ciclo D-I-C-I:** o status do mapa cobre operação (Inspeção), mas um ativo recém-cadastrado em **Desenho/Instalação** ainda não tem twin — deveria aparecer no canvas com marcador "fantasma" (sem cor de saúde, badge de fase D-I-C-I), evitando a falsa leitura "tudo verde" por ausência de dado.
- **Honestidade de IA:** todo status no mapa vem do **motor de degradação simulado** (físico-informado + Weibull), não de falhas reais. O mapa deve carregar essa **NOTA DE HONESTIDADE** (rodapé/tooltip) — o status é predição de modelo simulado, não medição de falha observada.

---

## 11. Melhorias de UX/UI sobre o wireframe base

Crítica concreta, ancorada no arquivo real. Ordem por prioridade.

**1. (P0) Gatear por RBAC e escopar pela Hierarquia — `MapaPlanta.tsx` + `derive.ts`.**
O maior buraco de governança: a página não importa `useCan`. Envolver render com `can('Mapa','read')` (fallback de acesso negado) e o botão Exportar com gate de `read`. Em `useAssetViews()`, aceitar um parâmetro de escopo (subárvore da Hierarquia visível ao papel) para que Cliente/área restrita não veja a frota inteira. Sem isso, US-13 não está cumprida nesta tela.

**2. (P0) Derivar o layout da Hierarquia, não de literais — `MapaPlanta.tsx:19-32`.**
Hoje `areas` e `apos` são coordenadas hard-coded e o conjunto de marcadores (8) **não confere com a frota** retornada por `useAssetViews()` (o card Ativos lista todos; o canvas só plota os 8 de `apos`). Resultado: um ativo cadastrado fora dessa lista some do mapa. Refino: o canvas deve **iterar sobre os ativos da área** (`AssetView.area`) e desenhar todos; áreas vêm de nós `HNode`. Isso fecha a US-6 de verdade (artefato navegável fiel ao cadastro) e elimina o drift mapa↔cadastro.

**3. (P1) Criar o painel de detalhe da área (B6) — hoje `sel` é decorativo (`L71`).**
Selecionar área só muda a borda; o clique não entrega informação. Transformar `col-span-1` (ou um drawer inferior) num painel que, ao selecionar uma área, mostra: lista dos ativos daquela área com `SevBadge`, status, saúde %, **modo crítico** (`twin.modoCritico`), **RUL** (`twin.rulDias`) e o **rastreio ao Dicionário** (TAG/limite que disparou). Aqui entra o PADRÃO ÚNICO DE IA: valor + horizonte + confiança + explicação + nota de honestidade.

**4. (P1) Legenda e contadores viram filtros — `SH right` (L44-50) + card Resumo (L99-107).**
A legenda de status e os contadores são puramente informativos. Torná-los **toggles**: clicar "Críticos" filtra o canvas e a lista para mostrar só vermelho; clicar área agrupa. Reaproveita `statusCounts`. Ganho: o técnico isola o que importa em vez de varrer visualmente.

**5. (P1) Tooltip on-hover no marcador — `apos.map` (L82-91).**
Hoje só há clique (que já navega). Falta o estágio intermediário: hover deve mostrar mini-card (nome, status, saúde %, modo crítico, "ver overview"). Evita navegação cega e dá leitura rápida sem sair do mapa.

**6. (P1) Exibir saúde/criticidade no canvas, não só cor — marcador (L86-88).**
A cor distingue 4 estados, mas perde nuance (um "atenção" 78% vs. um "atenção" 51% são iguais). Codificar **anel de saúde** (arco proporcional a `twin.health`) ou tamanho por `criticidade` do ativo. Mantém a identidade dark premium e adiciona densidade de informação onde já há `saude` disponível em `AssetView`.

**7. (P2) Camadas por sistema + zoom/pan — botão "Filtrar" (L37) hoje inerte.**
Implementar o painel que o botão promete: toggles de camadas (Área / Sistema elétrico / Hidráulico / só alarmes) e zoom/pan no SVG para plantas reais maiores que 6 áreas. Conecta com a navegação governada (camadas respeitam o que o papel pode ver).

**8. (P2) Sincronização cruzada mapa ↔ lista — card Ativos (L110-118).**
Hover na lista deve pulsar o marcador no canvas e vice-versa (estado `hovered` compartilhado). Hoje os dois blocos vivem isolados apesar de consumirem a mesma `views`.

**9. (P2) Marcador "fantasma" para ativos em D-I-C-I sem twin.**
Ativos em Desenho/Instalação não têm `twin` (status cai em `offline`/`normal` por fallback em `derive.ts:22`), produzindo falsa leitura. Desenhar com contorno tracejado + badge de fase, separando "saudável" de "ainda não comissionado".

**10. (P2) Nota de honestidade e fonte do dado — rodapé do canvas (perto do "N ↑", L93).**
Adicionar microcopy fixa: "Status por gêmeo digital — modelo de degradação simulado (físico-informado + Weibull), não treinado em falhas reais." Coerente com o padrão de honestidade de IA do produto e com a interface plugável `PredictionModel`.

**11. (P2) Extrair `<PlantCanvas>` reutilizável.**
O `<svg>` inline (L52-94) mistura dados, geometria e estilo na page. Extrair para `src/components/PlantCanvas.tsx` recebendo `areas`/`assets`/`onSelect`/`onOpen` por props — habilita reuso (ex.: mini-mapa no Dashboard) e testabilidade.
