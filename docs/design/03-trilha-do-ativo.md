# Trilha do Ativo — Lista (4) · Visão Geral (5) · Telemetria (6) · Saúde & IA (7) · Dados Técnicos (8) + Gêmeo Digital

> Escopo: o fluxo coeso do ativo — da **lista** ao **detalhe com abas** — incluindo o **Gêmeo Digital** e o simulador **"E se…"**. Telemetria viva e histórica (US-4, US-7), baseline/anomalia/predição (US-8/9/10/11) com o padrão de confiança, RUL + curva de degradação e recomendações acionáveis (registrar manutenção). Consistência de cabeçalho/abas entre as telas.

---

## Estado atual no produto (o que JÁ EXISTE)

Esta trilha **já está implementada e funcional** — não é wireframe. O fluxo real:

- **Lista** (`src/pages/AtivosLista.tsx`): tabela derivada de `useAssetViews()` (`src/store/derive.ts`), com busca por tag/nome/área, exportação CSV (`downloadCSV`), gate de RBAC no botão "Novo Ativo" (`useCan("Cadastro","full")`) e navegação por linha para `/ativos/:id/overview`. Saúde renderizada com `<Bar_ />` colorida por faixa; status via `<Badge />`; "Última Leitura" mostra "ao vivo" / "Offline".
- **Layout de detalhe** (`src/pages/AtivoDetail.tsx`): resolve `asset` + `twin` do store, monta o **cabeçalho do ativo** (nome, `<Badge status>`, tag mono, área/planta, conectividade ao vivo) e três KPIs (Saúde, Próx. Manut., Disponibilidade via mapa `AVAIL`), as **5 abas** (`overview · telemetria · saude · gemeo · tecnico`) e injeta `{ asset, twin }` por `<Outlet context>` (`useAtivo()`).
- **Visão Geral** (`ativo/Overview.tsx`): 4 leituras vivas com flag de limite (`limOf` cruza `asset.limites` → `dictionary.limiteAlerta`), sparkline de temperatura (`toChartData(history.slice(-72))`), card de **Score de Saúde** + radar por modo de falha, alerta aberto do ativo e **Próximas Ações** (`recommendationsFor(twin, 0.1)`).
- **Telemetria** (`ativo/Telemetria.tsx`): janelas `1h/6h/24h/7d/30d` (`windowSamples`), 3 gráficos (temp, vib, corrente) com `min/max/avg` (`stats`) e **linha de limite crítico** (`ReferenceLine` em `critOf`), export CSV por janela.
- **Saúde & IA** (`ativo/SaudeIA.tsx`): card "Predição de Falha — `predictionModel.name`", `prob21`, RUL, gráfico saúde real × **Projeção IA** (`runScenario(...,14)`), recomendações com botão **Registrar manutenção** (`applyMaintenance` + toast), barras por modo, **Ficha do Modelo** com a **nota de honestidade** (modelo simulado, não treinado).
- **Gêmeo Digital** (`ativo/GemeoDigital.tsx`): **Digital Thread** físico ↔ digital (medido vs esperado via `readingFromState`), **residual** como sinal de anomalia, RUL + gauge Weibull (`failureProb`) com seletor de horizonte, ranking de modos, **curva de degradação por modo** com linha de falha, **simulador "E se…"** (`runScenario` num clone), Δ-RUL por recomendação pré-calculado e **Ficha do Modelo**.
- **Dados Técnicos** (`ativo/Tecnico.tsx`): identificação, dados de placa, sensores instalados (parcialmente hard-coded).

O motor por trás: `engine/model.ts` (física transparente), `engine/degradation.ts` (constantes `K` por modo), `engine/prediction.ts` (RUL + Weibull + interface `PredictionModel` plugável), `engine/simulation.ts` (loop central de 1s + `runScenario` headless). RBAC real em `src/data/seed.ts` (matriz papel × módulo) e `src/auth/rbac.ts`.

O que segue é o **refinamento** ancorado nesse estado — sempre separando **JÁ EXISTE** de **REFINAR/ADICIONAR** + **impacto no código**.

---

## Preocupações transversais (espinha ambiente de governança)

| Eixo | Como aparece hoje | Refinamento proposto |
|---|---|---|
| **Hierarquia = breadcrumb** | `usePageChrome(["Ativos","Lista de Ativos",asset.id], …)` (`AtivoDetail.tsx:40`) | Tornar o breadcrumb a **Matriz de Hierarquia completa** empresa → planta → área → sistema → ativo (hoje só "Ativos / Lista / TAG"). Os dados existem em `asset.area`/`asset.planta` e na árvore `SEED_HIER` (`seed.ts:106`). |
| **Todo número → Dicionário** | `limOf`/`critOf` cruzam `asset.limites[key]` → `dictionary.find(...).limiteAlerta/Critico` (Overview/Telemetria) | Expor o **rastro do número** em hover/tooltip: campo, unidade, faixa, limite, **sensor (`tag.sensor`)** e **direção (`tag.direcao`)**. Hoje o tooltip (`TT_`) só mostra valor. |
| **Toda ação → RBAC** | `useCan("Cadastro","full")` na lista; demais ações **sem gate** | Gatear **Registrar manutenção**, **Ordem de Serviço** e o **simulador** por nível de módulo (ver tela a tela). |
| **Todo artefato → D-I-C-I** | `asset.instaladoEm` em Dados Técnicos | Adicionar selo de ciclo **Desenho → Instalação → Comissionamento → Inspeção** no header e em Dados Técnicos. |
| **Padrão único de IA** | `prob21`, RUL, modo dominante, curva e **nota de honestidade** já presentes em Saúde & IA e Gêmeo | **Padronizar o bloco**: valor + janela/horizonte + **CONFIANÇA** + **EXPLICAÇÃO** + nota — hoje falta o campo explícito de **CONFIANÇA** (o produto expõe probabilidade, não confiança da estimativa). |

> **Lacuna central a corrigir nesta trilha:** o **PADRÃO ÚNICO DE OUTPUT DE IA** exige `valor + janela + CONFIANÇA + EXPLICAÇÃO + NOTA`. O produto entrega valor + janela + explicação + nota, mas **não há campo de CONFIANÇA**. Há matéria-prima pronta: `twin.residual` (desvio do modelo) e a dispersão entre modos. P0 transversal: derivar um **nível de confiança** e exibi-lo em todo output preditivo.

---

# Tela 4 — Lista de Ativos (`AtivosLista.tsx`)

### 1. Job & propósito
Triagem da frota: encontrar rapidamente **qual ativo exige atenção agora** e entrar nele.

### 2. Personas × RBAC (matriz real — `seed.ts:98-102`)
| Papel | Ativos | Cadastro | Default view |
|---|---|---|---|
| Gerente Industrial | full | full | Lista completa + "Novo Ativo" visível |
| Eng. Confiabilidade | full | full | Idem, foco em críticos |
| Técnico Manutenção | read | none | Lista read-only, **sem** "Novo Ativo" |
| Analista de Dados | read | none | Lista read-only |
| Operador Campo | read | none | Lista read-only, da sua área |

> **JÁ EXISTE:** `const canCadastrar = useCan("Cadastro","full")` esconde "Novo Ativo".
> **REFINAR:** quem tem `Ativos:none` deveria ver tela de sem-permissão (hoje a rota não é gateada; o item some da sidebar, mas o acesso direto por URL não trava).

### 3. Arquitetura de informação
Primário: **Status + Saúde** (decisão). Secundário: Tag/Nome/Tipo, Área/Planta, Criticidade. Sob-demanda: Última Leitura, ações por linha.

### 4. Blocos & componentes
| Bloco | Componente real | Tokens |
|---|---|---|
| Barra de busca + filtros | `<input>` + `<select>` + `<IBtn icon=SlidersHorizontal>` | `C.bgCard`, `C.border`, `C.slate` |
| Tabela | `<table>` zebrada + `<Badge>` + `<Bar_>` | saúde: `C.green/yellow/red`; tag em `JetBrains Mono` `C.steel` |
| Paginação | botões `[1,2,3,…,12]` | `C.cobalt30` ativo |

### 5. Estados
- **loading**: store hidrata sync — sem skeleton hoje (`views` já vem populado).
- **empty**: `data.length===0` mostra só o rodapé "Exibindo 0 de N" — **falta empty state** ("Nenhum ativo encontrado para '{q}'").
- **error**: não há (dados locais).
- **TEMPO REAL**: coluna "Última Leitura" = "ao vivo"/Offline; **saúde muda viva** a cada tick (loop de 1s `startEngine`).
- **sem-permissão**: ver §2.

### 6. User stories
US-1 (lista respeita módulos contratados), US-2 (leitura simples), US-7 (saúde/status atuais), US-13 (gate Cadastro).

### 7. Governança nativa
Breadcrumb `["Ativos","Lista de Ativos"]`; Criticidade é o eixo D-I-C-I de prioridade; export CSV é rastreabilidade (US-13).

### 8. Confiança da IA
A coluna **Saúde** já é saída do gêmeo (`twin.health`). Hoje não há marca de "predito vs medido" na lista.

### 9. Recomendações priorizadas
- **P0** — Filtros funcionais: os 3 `<select>` de status e o botão "Filtros" são **decorativos** (`.slice(0,3)`, sem `onChange`). Ligar ao `views.filter`. **(esforço baixo)**
- **P0** — Empty state da busca. **(baixo)**
- **P1** — Gate de rota por `Ativos:read` (sem-permissão). **(médio)**
- **P1** — Sinalizar saúde "predita" com micro-tooltip → Dicionário. **(baixo)**
- **P2** — Ordenação por coluna + paginação real (hoje estática). **(médio)**

---

# Header + Abas do Detalhe (`AtivoDetail.tsx`) — consistência transversal

### Job & propósito
Dar **identidade, estado e navegação** estáveis ao redor das 5 abas, para que o usuário nunca perca o contexto do ativo.

### Blocos & componentes (JÁ EXISTE)
- **Identidade**: ícone `Cpu`, `asset.nome` (Rajdhani), `<Badge status>`, tag mono, `asset.area — asset.planta`, `asset.tipo`, conectividade (`Wifi`/`WifiOff`).
- **3 KPIs**: Saúde (`twin.health`, cor por faixa), **Próx. Manut.** (`recs[0].prazoDias`), Disponibilidade (`AVAIL[status]`).
- **Ações de chrome**: Assistente (→ `/assistente/:id`), Alertas, Ordem de Serviço.
- **5 abas** via `<NavLink>` com sublinhado `C.steel`.

### Estados
- **TEMPO REAL** (1ª classe): o header recalcula a cada tick — saúde, status e Próx. Manut. são vivos.
- **sem-permissão**: as ações de chrome **não** são gateadas hoje (Assistente aparece mesmo para quem tem `Assistente:none`).

### Governança nativa
Breadcrumb = caminho de hierarquia (incompleto — só 3 níveis).

### Confiança da IA
"Próx. Manut." é um número **derivado de modelo simulado** sem qualquer marca disso no header.

### Recomendações priorizadas
- **P0** — **Consistência de header/abas é o contrato desta trilha**: garantir que TODA aba herde o mesmo `{ asset, twin }` e que estados offline sejam tratados **uniformemente** (hoje cada aba repete seu próprio early-return "Ativo offline — …"). Extrair um `<TwinGate>` único. **(médio)**
- **P0** — Gatear ações de chrome por RBAC (`Assistente`, e "Ordem de Serviço" — que **ainda não tem handler**, `AtivoDetail.tsx:44`). **(baixo)**
- **P1** — Breadcrumb completo empresa→planta→área→sistema→ativo a partir de `SEED_HIER`. **(médio)**
- **P1** — Marcar "Próx. Manut." com ícone de IA + tooltip de honestidade. **(baixo)**
- **P2** — Selo D-I-C-I no header (estágio do ativo). **(médio)**

---

# Tela 5 — Visão Geral (`ativo/Overview.tsx`)

### 1. Job & propósito
Resposta de 5 segundos: **"este ativo está bem agora e o que vem a seguir?"**

### 2. Personas × RBAC
Entram todos com `Ativos:read`. Default view idêntica (read); a aba não tem ação destrutiva, então não muda por papel — exceto o link "Ver alerta" (depende de `Alertas`).

### 3. Arquitetura de informação
Grid 3 colunas: **2/3 esquerda** = leituras vivas + sparkline + alerta; **1/3 direita** = Score de Saúde (radar) + Próximas Ações. Ordem de leitura: número grande de saúde → modos no radar → ação.

### 4. Blocos & componentes
| Bloco | Real | Notas |
|---|---|---|
| Leituras em Tempo Real | grid 4 cards (`temp/vib/press/corrente`) | flag âmbar quando `warn` (cruza limite via `limOf`); ponto pulsante verde/âmbar |
| Sparkline | `AreaChart` temp `history.slice(-72)` | gradiente `C.steel` |
| Score de Saúde | número 52px + `RadarChart` por modo | cor por faixa 75/50 |
| Próximas Ações | `recommendationsFor(twin,0.1).slice(0,3)` | "Em {prazoDias} dias" |
| Alerta do ativo | `alerts.find(assetId && !resolvido)` + `<SevBadge>` | botão → `/alertas/:id` |

### 5. Estados
- **empty**: sem recomendações → "Sem ações pendentes."; sem alerta aberto → card some.
- **TEMPO REAL**: leituras e flags piscam por tick; `warn` é dado-vivo de 1ª classe.
- **offline**: early-return "Ativo offline — sem telemetria ao vivo." (`Overview.tsx:40`).
- **error/loading**: inexistentes (dados locais).

### 6. User stories
US-4 (V/A/RPM/°C — aqui temp/vib/press/corrente), US-7 (atuais + sparkline), US-9 (radar de modos = saúde por modo), US-11 (Próximas Ações = manutenção planejada).

### 7. Governança nativa
As 4 leituras dependem do **Dicionário** (limites por `tag.key`) e de `asset.limites` (override por ativo). O flag âmbar É o limite do dicionário renderizado.

### 8. Confiança da IA
Radar e Próximas Ações vêm do gêmeo simulado — **sem nota de honestidade nesta aba** (só em Saúde & IA / Gêmeo). Inconsistência a corrigir.

### 9. Recomendações priorizadas
- **P0** — Padronizar o card de leitura mostrando **o limite ao lado do valor** ("78 °C / lim 75") e tooltip → Dicionário (`tag.un`, `tag.faixaMin/Max`, `tag.sensor`, `tag.direcao`). **(baixo)**
- **P1** — Adicionar **mini-nota de honestidade** discreta no card de saúde/radar (consistência com as outras abas). **(baixo)**
- **P1** — O 4º card é "Pressão" mas a US-4 cita **RPM**; expor RPM e óleo (já em `twin.state`) — hoje ficam só no Gêmeo. **(baixo)**
- **P2** — Tornar "Próximas Ações" clicável → leva à aba Saúde & IA com a recomendação focada. **(médio)**

---

# Tela 6 — Telemetria (`ativo/Telemetria.tsx`)

### 1. Job & propósito
Investigar **tendências e excursões** de cada grandeza ao longo do tempo (diagnóstico, não monitoramento instantâneo).

### 2. Personas × RBAC
| Papel | Telemetria | Observação |
|---|---|---|
| Gerente / Eng. / Analista | full | exporta CSV (US-3/US-13) |
| Técnico Manutenção | read | vê gráficos, export deveria ser gateado a `full` |
| Operador Campo | none | **deveria** ver sem-permissão |

> **REFINAR:** a aba não consulta `useCan("Telemetria", …)`. Export CSV (`exportCSV`) e a própria aba precisam de gate.

### 3. Arquitetura de informação
Topo: seletor de janela (`1h…30d`) + ações (CSV, refresh). Corpo: 3 gráficos empilhados, cada um com `min/max/avg` e linha de limite crítico.

### 4. Blocos & componentes
| Bloco | Real | Tokens |
|---|---|---|
| Seletor de janela | `WINDOWS.map` botões | ativo `C.cobalt22/44`, `C.steel` |
| Gráfico por grandeza | `AreaChart` + `ReferenceLine y=critOf` | temp `#FBBF24`, vib `C.steel`, corrente `C.green` |
| Stats | `stats(samples,key)` min/max/avg | `JetBrains Mono`, `C.slate/textSub` |

### 5. Estados
- **empty**: janela sem amostras → gráfico vazio (sem placeholder). **A história só guarda 24h** (`HISTORY_CAP=288` em `simulation.ts:16`), então **7d e 30d mostram só o que existe** — honestidade a sinalizar.
- **TEMPO REAL**: `isAnimationActive={false}` e a última amostra entra a cada tick.
- **offline**: early-return "Ativo offline — sem telemetria."
- **error/loading**: inexistentes.

### 6. User stories
US-3 (export do dado raw → CSV), US-4 (grandezas físicas), US-7 (gráficos históricos + atuais).

### 7. Governança nativa
A `ReferenceLine` é o **limite crítico do Dicionário** desenhado. O CSV carimba `asset.id` + janela (rastreabilidade).

### 8. Confiança da IA
Aba puramente factual (medições) — **sem IA**, o que é correto; não precisa de nota.

### 9. Recomendações priorizadas
- **P0** — **Honestidade da janela**: para `7d/30d`, avisar "histórico ao vivo limitado a 24h" ou reconstruir a partir do modelo (como `fleetHealthTrend` faz no dashboard). Hoje o usuário escolhe 30d e vê 24h **silenciosamente**. **(médio)**
- **P0** — Gate RBAC (aba + export `Telemetria:full`). **(baixo)**
- **P1** — Empty state por gráfico ("Sem amostras nesta janela"). **(baixo)**
- **P1** — Botão refresh (`RefreshCw`) **não tem handler** — ligar a `setRange(range)`/re-fetch ou remover. **(baixo)**
- **P2** — Seletor de grandezas (incluir press/rpm/oleo, hoje fixos em 3). **(médio)**

---

# Tela 7 — Saúde & IA (`ativo/SaudeIA.tsx`)

### 1. Job & propósito
Converter degradação em **decisão de manutenção**: quando vai falhar, por quê, e o que fazer — com um clique para **registrar a manutenção**.

### 2. Personas × RBAC
| Papel | Quem decide | Ação "Registrar manutenção" |
|---|---|---|
| Eng. Confiabilidade / Gerente | dono da decisão | deve ter `Ativos:full` |
| Técnico Manutenção | executa | hoje `applyMaintenance` **não é gateado** |
| Analista de Dados | lê predição | não deve registrar |

> **REFINAR:** `registrar()` chama `applyMaintenance` sem checar RBAC — qualquer papel com a aba aberta altera o gêmeo.

### 3. Arquitetura de informação
2/3: card de **predição** (banner sev + RUL + prob21 + gráfico real×projeção) e **Recomendações**. 1/3: **Saúde por Modo** (barras) + **Ficha do Modelo** com a nota de honestidade.

### 4. Blocos & componentes
| Bloco | Real | Padrão de IA |
|---|---|---|
| Predição de Falha | banner `sevColor` por `prob21` + `twin.rulDias` + `FAILURE_MODE_LABEL[twin.modoCritico]` | **valor** (RUL) + **janela** (21d) + **explicação** (modo dominante) |
| Gráfico tendência | `LineChart` Saúde Real (`C.steel`) × **Projeção IA** (`C.yellow` tracejada, `runScenario(...,14)`) | linha de falha em 50% |
| Recomendações | `recommendationsFor(twin,0.1)` + **Registrar manutenção** | prioridade Alta/Média/Baixa por `damage` |
| Ficha do Modelo | `predictionModel.name/metodo`, variáveis, sync | **NOTA DE HONESTIDADE** (simulado) ✓ |

### 5. Estados
- **empty**: `recs.length===0` → "Sem recomendações — ativo saudável."
- **TEMPO REAL**: `prob21`, RUL e `trend` recomputam por tick e por mudança de `ambient` (`settings.ambienteDelta`).
- **pós-ação**: `applyMaintenance` derruba o dano do modo a ~8% → saúde e RUL **recalculam ao vivo** + toast "saúde e RUL recalculados".
- **offline**: early-return "Ativo offline — sem predição ao vivo."

### 6. User stories
US-8 (baseline operacional = saúde real reconstruída), US-9 (anomalia/prob de falha), US-10 (predição de parada — RUL + data), US-11 (manutenção planejada — registrar), US-13 (Ficha do Modelo = governança da IA).

### 7. Governança nativa
A Ficha do Modelo lista variáveis e sync = **rastreabilidade do output**. O modo crítico mapeia a um `tag.key` (`TAG_OF_MODE`) → Dicionário.

### 8. Confiança da IA (núcleo do escopo)
**JÁ EXISTE:** explicação (modo dominante), probabilidade (`prob21`), horizonte (21d) e **nota de honestidade** explícita ("modelo de degradação *simulado*, não treinado em falhas reais"). **FALTA:** o campo **CONFIANÇA** do padrão único. Recomendação P0: derivar confiança de `twin.residual` (`simulation.ts:37` — desvio do modelo) — residual baixo ⇒ alta confiança na projeção; residual alto ⇒ baixa. Exibir como "Confiança: Alta/Média/Baixa" ao lado do `prob21`.

### 9. Recomendações priorizadas
- **P0** — Adicionar **nível de CONFIANÇA** ao banner de predição (derivado de `twin.residual`), completando o padrão único. **(médio)**
- **P0** — Gatear **Registrar manutenção** por `Ativos:full` (consistência com o resto da governança). **(baixo)**
- **P1** — A "Projeção IA" usa `runScenario(...,14)` mas a prob é "21 dias" — **alinhar janelas** (14 vs 21) ou rotular ambas. **(baixo)**
- **P1** — Banda de incerteza no gráfico (sombra ± conforme confiança), em vez de uma linha única. **(médio)**
- **P2** — Confirmação antes de `applyMaintenance` (ação irreversível no gêmeo) + registro em trilha de auditoria. **(médio)**

---

# Tela 8 — Dados Técnicos (`ativo/Tecnico.tsx`)

### 1. Job & propósito
Ficha de placa e instrumentação do ativo — **identidade física e o que está sendo medido** (base para OCR US-5 e Dicionário).

### 2. Personas × RBAC
Todos com `Ativos:read` leem. Edição pertence a Cadastro (`Cadastro:full` — Gerente/Eng.). Hoje a aba é **só leitura** para todos.

### 3. Arquitetura de informação
2 colunas: Identificação · Dados Técnicos; full-width: Sensores Instalados.

### 4. Blocos & componentes
| Bloco | Real | Fonte |
|---|---|---|
| Identificação | tag, nome, tipo, série, fabricante, modelo, criticidade, **instalado em** | `asset.*` + `fmtDate` |
| Dados Técnicos | potência, RPM nominal, classe IP, tensão, **FLA derivada** | `asset.potenciaKw/rpmNominal`; FLA = `limites.corrente.alerta/1.05` |
| Sensores | 4 cards (PT100, MEMS, 4-20mA, TC) | **hard-coded** |

### 5. Estados
- **empty**: campos ausentes → "—" (já tratado).
- **TEMPO REAL**: não aplicável (dados estáticos) — correto.
- **sem-permissão**: aba aberta para todo `Ativos:read`.

### 6. User stories
US-5 (placa: TAG + dados técnicos — origem do OCR), US-4 (sensores por grandeza), US-13 (cadastro técnico rastreável).

### 7. Governança nativa
**Aqui mora o D-I-C-I**: "Data de Instalação" é o único marco hoje. Os sensores deveriam mapear 1:1 ao **Dicionário** (`tag.sensor`, `tag.key`).

### 8. Confiança da IA
N/A (factual).

### 9. Recomendações priorizadas
- **P0** — **Sensores derivados do Dicionário**, não hard-coded: percorrer `dictionary` filtrando por `tag.ativo`/`tag.key` e mostrar `tag.sensor` + protocolo. Hoje os 4 cards mentem se o dicionário mudar. **(médio)**
- **P1** — Selo **D-I-C-I** (Desenho/Instalação/Comissionamento/Inspeção) com datas/estado por estágio. **(médio)**
- **P1** — Valores "IP55 / 380V / 60Hz" são **fixos no JSX** — mover para `asset.*`. **(baixo)**
- **P2** — Botão "Editar no Cadastro" gateado por `Cadastro:full` (atalho de ida-e-volta com OCR). **(baixo)**

---

# Gêmeo Digital (`ativo/GemeoDigital.tsx`) — a peça central da trilha

### 1. Job & propósito
A **réplica viva** do ativo: comparar físico × esperado, projetar a vida útil e responder **"e se eu mudar carga / ambiente / fizer manutenção agora?"** sem tocar a produção.

### 2. Personas × RBAC
| Papel | Default view | Simulador | Registrar |
|---|---|---|---|
| Eng. Confiabilidade | dono — explora cenários | sim | sim (`Ativos:full`) |
| Gerente Industrial | decisão de produção (pico vs parar) | sim | sim |
| Técnico | lê o "parar agora" | leitura | gateado |
| Analista | lê curvas | leitura | não |

> O simulador é **headless e não-persistente** (`runScenario` num `clone`, `simulation.ts:281`) — seguro para qualquer leitor. Apenas **Registrar manutenção** (que muda o gêmeo real) precisa de gate.

### 3. Arquitetura de informação
1) **Digital Thread** (header, full-width, borda cobalto). 2) trio RUL+gauge · Modos · Curva de degradação. 3) **Simulador "E se…"** (controles + overlay base×cenário + 3 KPIs + resumo em linguagem natural). 4) Recomendações com **Δ-RUL pré-calculado** + Ficha do Modelo.

### 4. Blocos & componentes
| Bloco | Real | Detalhe |
|---|---|---|
| Digital Thread | 2 painéis `Motor Real (medido)` vs `Gêmeo (esperado)` (`twin.state` × `readingFromState`) | **residual** colorido (verde/âmbar/vermelho) = anomalia US-9 |
| Vida Útil & Predição | RUL 44px + gauge `PieChart` `failureProb(rul,gaugeH)` | horizontes `7/14/21/30/60` |
| Modos de Falha | ranking por `twin.damage[m]`, % de contribuição | cores `MODE_COLOR` |
| Curva de Degradação | `LineChart` por modo + `ReferenceLine y=100` "Falha" | `baseScenario.dataFalhaMs` |
| Simulador "E se…" | sliders carga/ambiente/horizonte + select manutenção + presets | overlay `base` × `cenario`, Δ-RUL |
| Recomendações | `recEffect(modo)` = Δ-RUL por reparo | botão Registrar |
| Ficha do Modelo | `predictionModel.*` + **nota de honestidade** ✓ | menciona interface `PredictionModel` plugável |

### 5. Estados
- **TEMPO REAL (1ª classe)**: Digital Thread sincroniza por tick ("sincronizado há {fmtAgo}"); residual e leituras vivas.
- **empty**: sem recomendações → "ativo saudável".
- **cenário**: cada slider recomputa `userScenario` (memo) e o **resumo em PT-BR** (`summary`) — feedback imediato.
- **pós-ação**: `applyMaintenance` → toast "saúde e RUL recalculados ao vivo".
- **offline**: early-return "gêmeo digital sem sincronismo ao vivo."

### 6. User stories
US-6 (artefato digital navegável — o gêmeo é o artefato vivo), US-8 (baseline esperado = painel "Gêmeo Digital"), US-9 (residual = anomalia), US-10 (RUL + data de falha + gauge), US-11 (simular manutenção + Δ-RUL + registrar), US-13 (Ficha do Modelo).

### 7. Governança nativa
Curva por modo mapeia a `TAG_OF_MODE` → Dicionário. O residual é a métrica de **qualidade do gêmeo** (auditável). Simulador não-persistente = segurança por design.

### 8. Confiança da IA
Excelente base: nota de honestidade **explícita e completa** ("modelo de degradação simulado físico-informado + Weibull, não treinado em falhas reais; interface `PredictionModel` permite plugar modelo treinado"). O **residual** é o candidato natural a virar **confiança** — já está calculado e exibido, basta promovê-lo a "nível de confiança da projeção".

### 9. Recomendações priorizadas
- **P0** — Promover **residual → CONFIANÇA** explícita também aqui e no gauge ("prob 21d **· confiança média**"), unificando o padrão de IA em toda a trilha. **(médio)**
- **P0** — Gatear **Registrar manutenção** por `Ativos:full`; manter simulador livre para leitores. **(baixo)**
- **P1** — `recEffect(modo)` roda `runScenario` por recomendação a cada render (custo) — memoizar. **(baixo)**
- **P1** — Persistir/exportar um **cenário** ("salvar plano") para virar Ordem de Serviço, fechando o laço com a ação de chrome "Ordem de Serviço". **(médio)**
- **P2** — Banda de incerteza na curva de degradação conforme confiança. **(médio)**

---

## Síntese — o que une a trilha

1. **Consistência de header/abas** (P0): um único `<TwinGate>` para offline + cabeçalho idêntico em todas as abas; ações de chrome gateadas.
2. **Padrão único de IA com CONFIANÇA** (P0): derivar confiança de `twin.residual` e exibir o bloco `valor + janela + confiança + explicação + nota` igual em Visão Geral, Saúde & IA e Gêmeo.
3. **Governança ambiente** (P0/P1): todo número com tooltip → Dicionário; breadcrump = hierarquia completa; D-I-C-I em Dados Técnicos; ações destrutivas (Registrar manutenção) gateadas por `Ativos:full`.
4. **Honestidade de dados** (P0): avisar que telemetria 7d/30d só tem 24h reais; sinalizar saúde "predita".
