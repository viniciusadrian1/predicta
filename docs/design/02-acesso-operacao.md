# Acesso & Operação — Login (1), Dashboard (2), Painel Operacional (3)

> Produto: **PREDICTA / FORZY** — plataforma IIoT de manutenção preditiva.
> Escopo deste documento: a porta de entrada (Login) e as duas telas do "primeiro minuto" de cada papel (Dashboard inicial e Painel Operacional ao vivo).
> User stories foco: **US-2** (interface amigável para clientes industriais), **US-7** (valores atuais + gráficos históricos), com travessias por **US-1** (modularidade), **US-8/9/10** (saída de IA) e **US-13** (governança/RBAC).

---

## Estado atual no produto (o que JÁ EXISTE)

Estas três telas já são **código React/TS funcional**, não wireframe:

- **Login** (`src/pages/Login.tsx`) é uma rota pública renderizada por `RootLayout` (`src/routes.tsx` linha 44). Ele NÃO é mock: chama `login(email, senha, keep)` de `src/auth/useAuth.ts`, que valida e-mail contra os usuários-semente (`SEED_USERS` em `src/data/seed.ts`), confere a senha de demo (`predicta`), bloqueia usuário `inativo`, e cria uma `Session` persistida com expiração — **30 dias se "Manter conectado", 1 dia caso contrário** (`useAuth.ts` linhas 19-25). A faixa "SSO + MFA habilitado" (linha 113) é **copy decorativa**, não há SSO/MFA reais. Os 4 KPIs do painel esquerdo (`247 / 5 / 97.4% / 2.1h`) são **literais hardcoded** (linhas 49-52), descolados do estado real.
- **Dashboard** (`src/pages/Dashboard.tsx`) é totalmente vivo: consome `useAssetViews()`, `alerts`, `twins`, `assets`, `dictionary`, `simClock` do store Zustand (`src/store/useStore.ts`) e deriva tudo via `src/store/derive.ts` (`statusCounts`, `fleetAvailability`, `alertsByDay`, `severityDistribution`, `fleetHealthTrend`) e `recommendationsFor` (`src/lib/recommendations.ts`). Os gráficos são `recharts`. Exporta CSV de alertas (`downloadCSV`). Re-renderiza a cada tick do motor de simulação (`useEngineRunner` em `AppShell`).
- **Painel Operacional** (`src/pages/Painel.tsx`, rota `/operacional`) é a grade "ao vivo" de cartões de ativo, com barra de status agregado (`statusCounts`), busca textual, filtro por tipo, toggle grid/list (o **modo "list" está declarado mas não implementado** — só renderiza grid), e o relógio simulado (`fmtDate/fmtTimeSec(simClock)`). Cada cartão mostra saúde, mini-telemetria viva (`twin.state.temp/vib/press`) e selo Wi-Fi ao vivo/offline.

Gating real existente:
- `AppShell` (`src/components/layout/AppShell.tsx` linha 17) redireciona para `/login` se `useIsAuthed()` for falso — guarda de **autenticação** para todo o app.
- A **Sidebar** (`src/components/layout/Sidebar.tsx` linhas 56, 75-77) esconde itens cujo módulo é `none` para o papel (via `permLevel(rbac, papel, modulo)`).
- O componente `Gate` (`src/auth/RequireAuth.tsx`) bloqueia por módulo com painel "Acesso negado" — **mas hoje só envolve Cadastro, OCR e Governança/RBAC** (`routes.tsx` 74-83). **Dashboard, `/operacional` e `/mapa` NÃO têm `Gate`** (linhas 50-51, 76).

Lacunas estruturais relevantes para este escopo (detalhadas nas recomendações):
1. **Modularidade US-1 não está cabeada**: `modules: string[]` existe no store (`useStore.ts` linha 39, semeado com todos os `MODS`) e é persistido, mas **nenhuma tela lê `modules`** para adaptar navegação ou mostrar upsell. Hoje a adaptação é só por RBAC (papel), não por "módulo contratado".
2. **Default view por papel não existe**: todo login cai em `/dashboard` (`Login.tsx` linha 18 e `routes.tsx` linha 49), inclusive papéis com `Dashboard: none/read`.
3. **Dashboard/Painel sem `Gate`**: `Operador Campo` tem `Dashboard: none` (`seed.ts` linha 102), mas se digitar `/dashboard` a tela carrega — o RBAC só some o link da sidebar.

---

## Preocupações transversais do domínio (válidas para as 3 telas)

### Governança como espinha ambiente
- **Breadcrumb = Matriz de Hierarquia**: o `BC` (`ui-shared/index.tsx`) já é alimentado por `usePageChrome([...])`. Hoje recebe rótulos genéricos (`["Operação","Dashboard"]`, `["Operação","Painel Operacional"]`). A tese de governança pede que ele expresse a cadeia **empresa → planta → área → sistema → ativo** (dados existem em `SEED_HIERARCHY`/`HTREE`). No Dashboard/Painel — que são frota inteira — o breadcrumb deve ancorar ao menos `Forzy Indústria S.A. › [escopo de plantas visíveis]`.
- **Todo número rastreia ao Dicionário**: a mini-telemetria do Painel (`temp/vib/press`) e os limites que pintam status vêm de `SEED_DICTIONARY` (campo, unidade, `limiteAlerta`, `limiteCritico`, `direcao`). Hoje os números aparecem sem unidade nem tooltip de dicionário — oportunidade transversal.
- **Toda ação é gated por RBAC**: ver tabela de personas em cada tela.
- **D-I-C-I**: artefatos (ativos) têm ciclo Desenho→Instalação→Comissionamento→Inspeção em `SEED_DICI`. No Painel, um ativo "ao vivo" cujo D-I-C-I está `pendente`/`em_revisao` (ex.: `ME-07` com C e In pendentes) deveria sinalizar baixa confiança de governança.

### Padrão único de saída de IA (US-8/9/10)
A única superfície de IA nestas telas é a **"Projeção IA"** do gráfico "Tendência de Saúde da Frota — 30 Dias" (`Dashboard.tsx` linhas 122-123; lógica em `fleetHealthTrend`, `derive.ts`). O comentário no código já é honesto: *"a projeção é a extrapolação do motor simulado, não um log medido de 30 dias"*. Hoje a UI **não expõe** confiança nem nota de honestidade. Toda saída de IA deve carregar: **valor + janela/horizonte + CONFIANÇA + EXPLICAÇÃO + NOTA DE HONESTIDADE** ("modelo de degradação SIMULADO físico-informado + Weibull, não treinado em falhas reais" — `src/engine/prediction.ts` permite plugar `PredictionModel` real).

### Tempo real é estado de 1ª classe
O motor roda via `useEngineRunner()` (`AppShell`) e `simClock` avança. Dashboard e Painel re-renderizam a cada tick. Os selos "Transmissão ao vivo" (Painel, ponto pulsante) e o relógio simulado já existem. Falta tratar **stale/atraso** (último tick antigo), **pausa** (`settings.paused` em Configurações) e **offline por ativo** como estados explícitos e consistentes.

---

# Tela 1 — Login (`src/pages/Login.tsx`)

### 1. Job & propósito
Autenticar o usuário corporativo e estabelecer a sessão/papel que define todo o resto da experiência (módulos visíveis, permissões, default view).

### 2. Personas × RBAC
Login é **pré-RBAC**: ninguém tem papel ainda. O que muda por persona é o **destino pós-login** (default view) — que hoje é sempre `/dashboard`, e deveria variar.

| Persona | Papel-semente (`seed.ts`) | Módulos com `full`/`read` | Default view RECOMENDADA pós-login |
|---|---|---|---|
| Gestor Industrial | Gerente Industrial | tudo `full` | `/dashboard` (visão de frota) |
| Téc. Manutenção | Técnico Manutenção | Alertas/Assistente `full`; Dashboard/Ativos/Telemetria `read` | `/alertas` (fila de trabalho) |
| Eng. Confiabilidade | Eng. Confiabilidade | quase tudo `full`; Governança `read` | `/operacional` ou `/dashboard` |
| Analista de Dados | Analista de Dados | Telemetria/Governança `full` | `/operacional` ou Telemetria |
| Operador de Campo | Operador Campo | Ativos/Alertas/Mapa `read`; **Dashboard `none`** | `/operacional` ou `/mapa` (NUNCA `/dashboard`) |
| Admin Forzy / TI-Governança | (representado por Gerente + RBAC `full`) | RBAC `full` | `/governanca/rbac` |

### 3. Arquitetura de informação
Layout **bipartido** (já implementado): painel-marca à esquerda (oculto em `lg:hidden`), formulário à direita (`w-[400px]`).
- **Primário**: campos e-mail/senha + botão `ENTRAR`.
- **Secundário**: "Manter conectado", "Esqueci a senha" (hoje sem ação), prova social (4 KPIs).
- **Sob-demanda**: rodapé de segurança/versão.
Ordem de leitura à direita: marca → "Bem-vindo de volta" → campos → CTA → dica demo → selo segurança.

### 4. Blocos & componentes (tokens reais)
| Bloco | Implementação atual | Tokens (`src/lib/theme.ts`) |
|---|---|---|
| Marca / logo | `Target` em gradiente `cobalt→navy` | `C.cobalt #0047AB`, `C.navy #000080` |
| Headline | Rajdhani 42px | `C.text #DDE6F0` |
| Cards de prova social | grid 2×2, ícones `steel` | `C.bgCard #0C1829`, `C.steel #82C8E5`, `C.border` |
| Inputs | borda vira `red` em erro (linha 83) | `C.bgInput #091422`, `C.red #F87171` |
| CTA `ENTRAR` | gradiente, Rajdhani, `letterSpacing .08em` | `C.cobalt→navy` |
| Erro | faixa com `AlertCircle` | `rgba(248,113,113,…)` |

### 5. Estados
- **Loading**: **ausente hoje** — `login()` é síncrono. Quando virar auth real (Fase 7+/SSO), o botão precisa de estado `submitting` (spinner + disable). **P1.**
- **Empty**: campos pré-preenchidos com credencial demo (`r.teixeira@…` / `predicta`) — bom para demo, **deve ser removido em produção**. **P0 (segurança de demo→prod).**
- **Error**: real e bem feito — três mensagens distintas de `login()` ("Usuário não encontrado", "Senha incorreta", "Usuário inativo") renderizadas na faixa de erro com borda vermelha nos inputs.
- **Tempo real**: não se aplica.
- **Sem-permissão**: não se aplica (pré-RBAC). Mas **usuário `inativo`** (ex.: `j.nunes`) é barrado aqui — único gate de status no login.

### 6. User stories cobertas
- **US-2** (interface amigável): tela limpa, copy em PT-BR, prova social orientada a operação industrial (Ativos, Disponibilidade, MTTR).
- **US-13** (governança de acessos): a sessão criada aqui carrega `papel`, base de todo o RBAC subsequente.

### 7. Governança nativa
A sessão é o artefato de governança: `Session.papel` determina `permLevel` em todo lugar. A expiração (`expiresAt`) é política de sessão. **Falta**: registro de auditoria de login (US-13 pede rastreabilidade) e exibição do último acesso (existe `user.acesso` na semente, não mostrado).

### 8. Confiança da IA
Não se aplica diretamente. **Recomenda-se** que a prova social use números **reais e honestos** (derivados do store) em vez de `247/5/97.4%/2.1h` fixos, para não abrir o produto com um número que o Dashboard imediatamente contradiz (`Ativos Monitorados = 10` no seed real).

### 9. Recomendações priorizadas
| Pri | Recomendação | Esforço |
|---|---|---|
| **P0** | Trocar os 4 KPIs hardcoded por valores reais do store (ou rótulos neutros), e remover credenciais pré-preenchidas fora de modo demo (flag `import.meta.env`). | baixo |
| **P0** | **Default view por papel**: pós-login, redirecionar para a primeira rota que o papel pode ver (computar a partir do `rbac`/`modules`), nunca fixo em `/dashboard`. | médio |
| **P1** | Estado de `submitting` no CTA + desabilitar inputs durante a chamada (preparando auth assíncrona/SSO real). | baixo |
| **P1** | Tornar "Esqueci a senha" funcional ou ocultar; hoje é botão morto. | baixo |
| **P2** | Mostrar "último acesso" e nota de auditoria; alinhar copy "SSO+MFA" à realidade até existir. | médio |

---

# Tela 2 — Dashboard (`src/pages/Dashboard.tsx`)

### 1. Job & propósito
Dar ao gestor, em um relance, o **estado de saúde e risco da frota inteira** e os pontos que exigem ação hoje (críticos, manutenções pendentes, ativos em atenção).

### 2. Personas × RBAC
| Persona | Módulo `Dashboard` | Experiência esperada |
|---|---|---|
| Gerente Industrial | `full` | Default view; visão completa + exportações. |
| Téc. Manutenção | `read` | Lê KPIs; ações que levam a `/alertas` fazem sentido. |
| Eng. Confiabilidade | `full` | Foco na tendência de saúde + ativos em atenção. |
| Analista de Dados | `read` | Lê; tende a ir para Telemetria. |
| **Operador Campo** | **`none`** | **Não deveria abrir esta tela** — hoje o link some da sidebar, mas a rota não tem `Gate` (risco de acesso direto por URL). |

**DEFAULT VIEW**: Dashboard é a default view ideal **apenas para Gerente/Eng.** — reforça a recomendação P0 de default por papel.

### 3. Arquitetura de informação
Pilha vertical (`AppShell` aplica `p-5 space-y-4`):
1. **Primário** — faixa de 4 KPIs (`grid-cols-4`): Ativos Monitorados, Alertas Críticos, Disponibilidade Média, Manutenções Pendentes.
2. **Secundário** — linha de 3 colunas: Histórico de Alertas 7d (col-span-2) + Distribuição (pie).
3. **Secundário** — linha de 3 colunas: Tendência de Saúde 30d (col-span-2) + Alertas Recentes.
4. **Sob-demanda** — "Ativos que Requerem Atenção" (4 cartões de atalho).

### 4. Blocos & componentes + ORIGEM dos KPIs
| Bloco | Componente | Origem do dado (rastreabilidade) |
|---|---|---|
| KPI "Ativos Monitorados" | `KPI` (`ui-shared`) | `views.length` (`useAssetViews`) · sub = nº de `planta` distintas |
| KPI "Alertas Críticos" | `KPI` | `open.filter(sev==="critico")` · sub = total de abertos |
| KPI "Disponibilidade Média" | `KPI` | `fleetAvailability(views)` — **média de uma tabela nominal por status** (`AVAIL`: normal 99.5, atenção 98, crítico 92, offline 70 em `derive.ts`), **não medição real**. Meta 98% é literal. |
| KPI "Manutenções Pendentes" | `KPI` | `recommendationsFor(twin, 0.2)` somado por ativo · urgentes = `pri==="Alta"` |
| Histórico de Alertas 7d | `BarChart` empilhado | `alertsByDay(alerts, simClock)` — conta alertas/dia por severidade |
| Distribuição | `PieChart` | `severityDistribution(alerts)` (abertos) |
| Tendência de Saúde 30d | `LineChart` (real + IA) | `fleetHealthTrend(...)` — ver Confiança da IA |
| Alertas Recentes | lista de botões → `/alertas/:id` | `open` ordenado por `criadoEm`, top 4 |
| Ativos em Atenção | cartões → `/ativos/:id/overview` | `views.filter(status!=="normal")` top 4 |

Tokens: cores de severidade (`C.red/orange/yellow/slate`), saúde por faixa (`>=75 verde, >=50 amarelo, <50 vermelho`, igual a `Bar_`/`corDaSaude`), tipografia Rajdhani (números KPI 28px) e JetBrains Mono (eixos/IDs).

### 5. Estados
- **Loading**: **ausente** — store hidrata sincronicamente do `localStorage`/seed. Em backend real (telemetria assíncrona) os cards precisam de skeleton. **P1.**
- **Empty**: parcial — "Alertas Recentes" tem empty ("Nenhum alerta aberto"); **KPIs e gráficos não têm empty** (frota vazia → `fleetAvailability` retorna 0, `fleetHealthTrend` retorna `[]` e o gráfico fica em branco sem mensagem). **P1.**
- **Error**: ausente (sem fetch). Necessário ao ligar fonte real.
- **TEMPO REAL**: implícito — re-render por tick. **Falta** indicador "atualizado há Xs" e tratamento de **pausa** (`settings.paused`): hoje o Dashboard não avisa que a simulação está pausada, então números "congelam" sem explicação. **P1.**
- **Sem-permissão**: a rota não usa `Gate` → acesso direto por URL ignora `Dashboard: none`. **P0.**

### 6. User stories cobertas
- **US-7** (valores atuais + históricos): KPIs ao vivo + Histórico 7d + Tendência 30d.
- **US-2** (amigável): leitura em camadas, atalhos clicáveis.
- **US-8/9/10** (IA): linha "Projeção IA" (baseline/risco de queda de saúde).
- **US-13**: números deveriam rastrear ao dicionário/hierarquia (ver governança nativa).
- **US-1** (modularidade): **não coberta** — o Dashboard mostra blocos fixos independentemente dos módulos contratados.

### 7. Governança nativa
- Breadcrumb hoje `["Operação","Dashboard"]` — deveria ancorar à empresa/escopo de plantas (Matriz de Hierarquia).
- KPI "Manutenções Pendentes" e "Disponibilidade" são derivações — cada um deveria abrir um tooltip de **proveniência** (fórmula + fonte) para satisfazer US-13. Hoje "Disponibilidade" é especialmente sensível: é tabela nominal, não medida, e isso não está visível.

### 8. Confiança da IA
O gráfico "Tendência de Saúde — 30 Dias" tem duas séries: **`r` Saúde Real** (steel) e **`p` Projeção IA** (slate tracejada). Pela `fleetHealthTrend`, ambas são **reconstrução/extrapolação do motor simulado** (a "real" reconstrói o passado a partir da taxa de degradação atual, pois cada twin só guarda ~10h de janela). Padrão de IA pendente:
- **Valor + horizonte**: a projeção vai +7 dias (offsets `0..7`); deveria rotular "+7 dias".
- **Confiança**: ausente — adicionar banda/percentual.
- **Explicação**: ausente — citar o `worstMode(damage)` dominante da frota.
- **Nota de honestidade**: **obrigatória e ausente** — "Projeção de modelo de degradação SIMULADO (físico-informado + Weibull), não treinado em falhas reais". A linha "Saúde Real" também é reconstruída, não um log medido — precisa de asterisco honesto.

### 9. Recomendações priorizadas
| Pri | Recomendação | Esforço |
|---|---|---|
| **P0** | Envolver a rota `/dashboard` em `<Gate modulo="Dashboard">` (e idem `/operacional`, `/mapa`) para que `none` não vaze por URL. | baixo |
| **P0** | Nota de honestidade + horizonte na "Projeção IA" (badge "Modelo simulado · +7d"); tooltip de proveniência no KPI Disponibilidade (deixar explícito que é nominal por status). | baixo |
| **P1** | Estados loading/empty/error e indicador "ao vivo / pausado / atualizado há Xs" (ler `settings.paused` + `simClock`). | médio |
| **P1** | Adaptar blocos à modularidade US-1: se um módulo não está em `store.modules`, substituir o bloco por card de upsell, nunca quebrar. | médio |
| **P2** | Breadcrumb como hierarquia real (empresa › plantas no escopo) + confiança/banda na série de IA. | médio |

---

# Tela 3 — Painel Operacional (`src/pages/Painel.tsx`, `/operacional`)

### 1. Job & propósito
Vigilância ao vivo da frota: ver, em grade densa, o status e a telemetria instantânea de cada ativo e mergulhar no ativo que mudou de cor.

### 2. Personas × RBAC
Usa o módulo `Dashboard` para visibilidade na sidebar (`Sidebar.tsx` linha 25 — `modulo:"Dashboard"`). Logo herda as mesmas permissões do Dashboard, **inclusive o `none` do Operador Campo** — embora o Painel seja exatamente a tela mais útil para o operador de campo.

| Persona | Visibilidade hoje | Observação |
|---|---|---|
| Gerente / Eng. / Téc. / Analista | visível (`Dashboard` ≥ read) | ok |
| **Operador Campo** | **oculto** (`Dashboard: none`) | **Inconsistência de design**: o Painel deveria depender de `Ativos` (que o operador tem `read`), não de `Dashboard`. |

**DEFAULT VIEW**: candidata natural a default view do **Operador de Campo** e do **Técnico** (visão de chão de fábrica), uma vez corrigida a dependência de módulo.

### 3. Arquitetura de informação
1. **Primário** — barra de status ao vivo: ponto pulsante "Transmissão ao vivo" + contagens Normais/Atenção/Críticos/Offline + relógio simulado à direita.
2. **Controle** — busca textual + chips de tipo (Todos/Bombas/Motores/Compressores/Turbinas).
3. **Conteúdo** — grade `grid-cols-5` de cartões de ativo.
Ações no chrome (Topbar): toggle grid/list + `IBtn "Ao vivo"`.

### 4. Blocos & componentes (tokens reais)
| Bloco | Implementação | Origem |
|---|---|---|
| Barra de status | contagens coloridas | `statusCounts(views)` |
| Relógio | `fmtDate/fmtTimeSec(simClock)` | `simClock` do store |
| Busca | filtra por `nome`/`id` | estado local `q` |
| Chips de tipo | `TYPE_MATCH` por `asset.tipo` | constante local |
| Cartão de ativo | borda/fundo por status; `Bar_` de saúde; mini-grid temp/vib/press; selo Wi-Fi | `AssetView` + `twin.state` |
| Empty | "Nenhum ativo corresponde ao filtro." | quando `filtered.length===0` |

Cores de status: `statusColor` local replica `corDoStatus` (`normal verde / atencao amarelo / critico vermelho / offline slate`) com `boxShadow` glow no ponto.

### 5. Estados
- **Loading**: ausente (store síncrono). Skeleton de cartões ao ligar fonte real. **P1.**
- **Empty**: **dois tipos** — sem ativos (não tratado distintamente) vs. **filtro sem resultado** (tratado, mensagem clara). Bom.
- **Error**: ausente.
- **TEMPO REAL (1ª classe)**: melhor tela do app nisso — ponto pulsante, relógio simulado, selo Wi-Fi por cartão (`ao vivo`/`Offline`), mini-telemetria que muda a cada tick. **Faltam**: (a) refletir `settings.paused` (o rótulo "Transmissão ao vivo" mente quando pausado); (b) o `IBtn "Ao vivo"` não tem ação; (c) o **toggle list não renderiza lista** (modo declarado, grid sempre). **P1.**
- **Sem-permissão**: idem Dashboard — rota sem `Gate`.

### 6. User stories cobertas
- **US-7** (valores atuais): mini-telemetria viva por cartão é o caso mais direto de "valores atuais".
- **US-2** (amigável): leitura por cor, densidade controlada, busca/filtro simples.
- **US-4** (sensores V/A/RPM/°C): exibe °C, vibração e pressão; **corrente/RPM não aparecem no cartão** embora existam no twin/dicionário — oportunidade.
- **US-1**: grade não se adapta a módulos contratados.

### 7. Governança nativa
- Mini-telemetria sem **unidade** nem vínculo ao Dicionário (TAG-001 °C, TAG-002 mm/s, TAG-003 bar). Um hover deveria mostrar campo/unidade/limite/sensor de `SEED_DICTIONARY`.
- O **status do cartão é decisão de governança**: vem do twin, que cruza leitura × `limiteAlerta/limiteCritico` do dicionário. Tornar essa cadeia visível (por que está amarelo?) é US-13.
- D-I-C-I: um cartão poderia exibir micro-selo se o ativo tem etapa D-I-C-I pendente (dado em `SEED_DICI`).

### 8. Confiança da IA
O Painel é majoritariamente **telemetria medida/simulada**, não predição — logo a nota de honestidade aqui é sobre a **fonte do dado** ("simulação físico-informada" vs. sensor real), não sobre ML. A saúde (`twin.health`) deriva do vetor de dano do modelo; o cartão deveria deixar claro que `saúde` é um índice **modelado**, não uma leitura de sensor.

### 9. Recomendações priorizadas
| Pri | Recomendação | Esforço |
|---|---|---|
| **P0** | Mudar o módulo de visibilidade do Painel de `Dashboard` → `Ativos` (Sidebar linha 25) para que o Operador de Campo (e Técnico) acessem; garantir `Gate` coerente na rota. | baixo |
| **P0** | Honestidade de tempo real: refletir `settings.paused` (trocar "Transmissão ao vivo" por "Pausado") e dar ação real ao `IBtn "Ao vivo"`. | baixo |
| **P1** | Implementar o modo **lista** (toggle já existe) — tabela densa com colunas ordenáveis (US-7) para uso em desktop de sala de controle. | médio |
| **P1** | Unidades + tooltip de Dicionário na mini-telemetria; adicionar Corrente/RPM (US-4) e rótulo "saúde modelada". | médio |
| **P2** | Adaptar grade à modularidade US-1 e adicionar micro-selo D-I-C-I por cartão. | médio |

---

## Apêndice — Síntese transversal das 3 telas

| Preocupação | Login | Dashboard | Painel |
|---|---|---|---|
| Autenticação real | ✅ (`useAuth.login`) | herda guard | herda guard |
| RBAC por papel | n/a | ⚠️ sem `Gate` na rota | ⚠️ sem `Gate` + módulo errado |
| Default view por papel | ❌ fixo `/dashboard` | — | candidata p/ operador |
| Modularidade US-1 | n/a | ❌ | ❌ |
| Tempo real 1ª classe | n/a | ⚠️ sem indicador/pausa | ✅ (falta refletir pausa) |
| Nota de honestidade IA | n/a | ❌ (Projeção IA) | n/a (telemetria) |
| Rastreabilidade ao Dicionário | n/a | ⚠️ | ⚠️ |
| Estados loading/empty/error | parcial | parcial | parcial |

**Fio condutor das três telas**: o produto já é vivo e governado por RBAC, mas a cadeia **Login → default view por papel → módulos contratados (US-1) → tela que respeita permissão por rota** está **incompleta** — e é o maior ganho de "primeiro minuto" por persona com menor esforço.
