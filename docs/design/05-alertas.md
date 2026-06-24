# Alertas — Lista (12) e Detalhe (13)

> Módulo **Alertas** do Predicta (Forzy). Cobre as telas `src/pages/AlertasLista.tsx` (tela 12) e
> `src/pages/AlertaDetalhe.tsx` (tela 13). User stories no escopo: **US-9** (previsão de anomalias →
> alerta de modelo) e **US-12** (assistente conversacional sugere solução), com forte ancoragem em
> **US-7** (gráfico histórico no momento do evento) e **US-13** (governança/rastreabilidade).

## Estado atual no produto (o que JÁ EXISTE)

O módulo de Alertas **não é mockup**: é um pipeline vivo. O motor (`src/engine/simulation.ts`,
função `evaluateAlerts`) roda num intervalo central de 1s contra o store Zustand
(`startEngine` → `tick` → `stepOnce` → `commitTick`) e **gera, deduplica, auto-resolve e re-arma
(snooze)** alertas de forma autônoma. Hoje existem três origens reais, tipadas em
`Alert.origem: AlertOrigem = "regra" | "modelo" | "manual"` (`src/lib/types.ts`):

| Origem | Quem cria | Gatilho real no código | `managed` |
|---|---|---|---|
| `regra` | Motor | Quebra de limite do **Dicionário** por tag (`tag.direcao` "acima"/"abaixo", `limiteAlerta`/`limiteCritico`, com override por ativo em `asset.limites`) + alerta de **Conectividade** quando `asset.offline` | `true` |
| `modelo` | Motor | **Gêmeo digital**: `prob21 = probFalha[horizonteDias=21] > 0.6` **e** `rulDias < 60` (US-9) | `true` |
| `manual` | Usuário | Botão "Novo alerta" em `AlertasLista` (`addAlert`) | ausente/false |

Já existem, vivos:
- **Ciclo de vida** `aberto → em_analise → resolvido` (`AlertStatus`) com ações `addAlert`,
  `ackAlert`, `resolveAlert`, `reopenAlert` (`src/store/useStore.ts`).
- **Dedup**: `openFor(assetId, pred)` impede um segundo alerta aberto para a mesma `(assetId, tag, origem)`.
- **Auto-resolução**: quando a condição normaliza, o motor marca `status:"resolvido"` + `resolvidoEm`
  (limite volta abaixo do alerta; `prob21 < 0.4`; ativo volta online resolve a Conectividade).
- **Auto-escalonamento**: alerta `alto` gerenciado vira `critico` se a leitura cruza o limite crítico
  (sem criar novo registro — atualiza `severidade` + `descricao`).
- **Snooze de 24 sim-horas**: `snoozed(...)` evita respawn logo após resolução manual; só re-arma se
  normalizar e voltar a romper depois.
- **Lista** (tela 12): 4 KPIs (Total Abertos / Críticos / Altos / Médios), busca, filtros de
  severidade e status, tabela ordenada por `criadoEm` desc, exportação CSV (`downloadCSV`),
  criar manual, resolver inline.
- **Detalhe** (tela 13): header com severidade/status, grid de detalhes (inclui **Método** e **Origem**
  via `ORIGEM_METODO`), **mini-gráfico de telemetria no entorno** (`twin.history.slice(-40)` →
  `toChartData`), **linha do tempo** derivada de `criadoEm`/`resolvidoEm`, card de **ativo relacionado**
  (saúde + status + link), **ações rápidas** (Criar OS, Abrir Assistente — US-12, Ver histórico,
  Escalar, Falso positivo) e **comentário**.

O que **falta** e será o foco do refinamento: a interface **não expõe** que `regra ≠ modelo` de forma
honesta (o badge de origem é texto cru), **não há nível de confiança nem nota de honestidade** do
modelo simulado, o status `em_analise` existe no tipo mas **a Lista não o cria** (só `addAlert` com
"aberto" e `resolveAlert`), as ações **não são gated por RBAC** (a rota `alertas` no `routes.tsx`
**não** está sob `<Gate modulo="Alertas">`, diferente de Cadastro/Governança), "Criar OS" é um
`toast` placeholder, e o comentário **não persiste** (não há campo no `Alert`).

---

## Tese de governança nesta tela

Governança é espinha ambiente, não item de menu:
- **Breadcrumb = Matriz de Hierarquia.** Hoje o chrome da Lista é `["Alertas","Lista de Alertas"]` e do
  Detalhe `["Alertas","Lista de Alertas", al.id]` (`usePageChrome`). Isso **ignora** a hierarquia do
  ativo (empresa → planta → área → sistema → ativo) que existe em `SEED_HIERARCHY`/`asset.planta`/`asset.area`.
  Refinar: o breadcrumb do Detalhe deve carregar a cadeia do ativo do alerta.
- **Todo número rastreia ao Dicionário.** Um alerta `origem:"regra"` carrega `tag: TagKey`; o Detalhe
  deve mostrar a linha do Dicionário que disparou (campo, unidade, faixa, `limiteAlerta`,
  `limiteCritico`, `direcao`, `sensor`) — dado que `evaluateAlerts` já usou para decidir.
- **Toda ação é gated por RBAC.** `ackAlert`/`resolveAlert`/`reopenAlert`/`addAlert` devem checar
  `useCan("Alertas","full")` (`src/auth/rbac.ts`).
- **Todo artefato tem D-I-C-I.** O ativo do alerta tem linha em `SEED_DICI` (D/I/C/In). Um alerta
  preditivo sobre um ativo com Comissionamento `pendente` é menos confiável — isso deve aparecer.

---

# TELA 12 — Lista de Alertas (`AlertasLista.tsx`)

### 1. Job & propósito
Dar ao operador/gestor a **fila priorizada de condições anômalas da frota** para decidir, em segundos,
o que reconhecer, resolver ou escalar primeiro.

### 2. Personas × RBAC

RBAC real do módulo **Alertas** (`PERM` em `src/data/seed.ts`):

| Papel | Nível Alertas | Pode | Default view |
|---|---|---|---|
| Gerente Industrial | `full` | tudo + criar manual + exportar | Filtro **Abertos**, todas as plantas, ordenado por severidade |
| Eng. Confiabilidade | `full` | tudo; foco em `origem:"modelo"` | Filtro **Abertos**, severidade Crítico+Alto |
| Técnico Manutenção | `full` | reconhecer/resolver; criar manual | Abertos atribuídos / da minha área |
| Analista de Dados | `read` | ver + exportar; **sem** ack/resolve/criar | Todos os status (análise histórica) |
| Operador Campo | `read` | só ver | Abertos da sua área |
| (Cliente da Indústria) | `read` (proposto) | ver alertas dos seus ativos | Abertos dos meus ativos |

> **Lacuna real:** a rota não tem `<Gate>` e os botões não checam nível. Hoje um `read` (Analista,
> Operador) **vê e clica** "Resolver" e "Novo alerta". Correção P0.

### 3. Arquitetura de informação
1. **Primário** — faixa de 4 KPIs vivos (Abertos/Críticos/Altos/Médios) com ponto pulsante (tempo real).
2. **Primário** — tabela: ID · Título/Ativo · Tipo · Severidade · Status · Data/Hora · ações.
3. **Secundário** — busca + filtros severidade/status.
4. **Sob-demanda** — formulário "Novo alerta" (colapsado), Exportar CSV.

Ordem de leitura: KPI (quão grave está a frota agora?) → filtro → linha → clique → Detalhe.

### 4. Blocos & componentes (ancorados)

| Bloco | Componentes reais | Tokens |
|---|---|---|
| KPI cards | `div` inline + ponto `animate-pulse` | `C.bgCard`, borda `C.border`, números Rajdhani; cores `C.red`/`C.orange`/`C.yellow` |
| Filtros | `<input>` busca + 2 `<select>` (`SEV_LABEL`, `ST_LABEL`) | `C.bgCard`/`C.border` |
| Tabela | `<table>` + `SevBadge` + `Badge` (`ui-shared`) | zebra `rgba(12,24,41,0.5)`, hover `#112035` |
| ID | mono `JetBrains` em `C.steel` | — |
| Ações linha | `Eye` (ver) + `CheckCircle2` (resolver) | `C.slate`/`C.green` |
| Novo alerta | form inline (`addAlert`) | borda `C.cobalt`+"40" |

### 5. Estados
- **Loading** — store hidrata do `localStorage` (`persist`); não há skeleton hoje (P2: skeleton de tabela).
- **Empty** — já existe: `"Nenhum alerta corresponde ao filtro."` (`colSpan=7`). Distinguir
  *frota saudável* (zero abertos, mensagem positiva verde) de *filtro sem match*.
- **Error** — store corrompido → `migrate` reseeda; sem banner de erro (P2).
- **TEMPO REAL (1ª classe)** — `alerts` muda a cada tick; KPIs e linhas re-renderizam vivos. **Novo
  alerta entrando deve ter destaque visual** (flash/fade-in na linha do topo, já que a ordem é
  `criadoEm` desc). Hoje aparece sem transição.
- **Sem-permissão** — hoje inexistente. `read` deve ver tabela mas com ações desabilitadas + tooltip;
  "Novo alerta"/"Exportar" ocultos.

### 6. User stories cobertas
- **US-9** — alertas `origem:"modelo"` (previsão de anomalia/falha) aparecem na mesma fila, com tipo
  `Preditivo`. **Refinar:** distinguir visualmente regra×modelo na lista (hoje só a coluna Tipo dá pista).
- **US-13** — exportação CSV inclui `Origem`, `Criado`, `Resolvido` (rastreabilidade).
- **US-1 (modularidade)** — se "Alertas" não estiver contratado, a tela deve virar upsell, não erro.

### 7. Governança nativa
- Coluna **Origem** explícita (regra vs modelo vs manual) — hoje só no CSV e no Detalhe.
- Exportação é trilha de auditoria. **Refinar:** registrar **quem** resolveu/reconheceu (não há
  `responsavel`/autor preenchido pela ação hoje — `responsavel?` existe no tipo mas não é setado).

### 8. Confiança da IA
Na lista, alertas preditivos devem trazer um **chip de confiança compacto** (ex.: `IA · 84%`) e ícone
distinto de `Cpu`, separando-os de alertas determinísticos de regra (que são **fatos medidos**, não
predições). Padrão único de output de IA (valor + horizonte + confiança + explicação + nota de honestidade)
começa aqui de forma resumida e se completa no Detalhe.

### 9. Recomendações priorizadas
| # | Recomendação | Prioridade | Esforço |
|---|---|---|---|
| L1 | Gate de RBAC: ocultar/desabilitar Resolver/Novo/Exportar para `read`; rota sob `<Gate modulo="Alertas">` | **P0** | baixo |
| L2 | Coluna/badge de **Origem** com ícone (regra=`AlertTriangle`, modelo=`Cpu`, manual=`PlusCircle`) + chip de confiança no preditivo | **P0** | baixo |
| L3 | Distinguir empty "frota saudável" (verde) de "filtro sem match" | P1 | baixo |
| L4 | Animação de entrada para alerta novo (tempo real de 1ª classe) | P1 | baixo |
| L5 | Ação "Reconhecer" inline (criar estado `em_analise` direto da lista) | P1 | baixo |
| L6 | Agrupar por ativo / colapsar duplicatas históricas (mesmo `tag`) | P2 | médio |

---

# TELA 13 — Detalhe do Alerta (`AlertaDetalhe.tsx`)

### 1. Job & propósito
Reunir **causa, evidência (telemetria no momento) e ação** de um único alerta para que o responsável
**diagnostique e feche o loop** (reconhecer → resolver / escalar / abrir OS / consultar IA).

### 2. Personas × RBAC
Mesma matriz da Lista. Diferença de **default view por papel**:
- **Técnico** entra direto na **linha do tempo + ações rápidas** (o que faço agora).
- **Eng. Confiabilidade** entra no **bloco de origem/Método + telemetria** (por que disparou).
- **Analista (`read`)** vê tudo, mas Reconhecer/Resolver/Reabrir/Comentar **desabilitados**.
- **Gestor/Cliente** veem o card **Ativo Relacionado** + impacto, não o detalhe de sensor.

### 3. Arquitetura de informação (grid 3 colunas — real)
**Coluna principal (2/3):** Header (título+severidade+status+descrição) → Detalhes (ID, Ativo, Tipo,
Detecção, **Método**, **Origem**) → **Telemetria em Torno do Alerta** → **Linha do Tempo**.
**Coluna lateral (1/3):** Ativo Relacionado → Ações Rápidas → Comentário.

### 4. Blocos & componentes (ancorados)

| Bloco | Componente real | Notas de refino |
|---|---|---|
| Header | `AlertTriangle` + `SevBadge` + `Badge`; fundo `${sevColor}0A` | OK |
| Detalhes | grid 2-col com `ORIGEM_METODO[al.origem]` | adicionar **linha do Dicionário** quando `al.tag` |
| Telemetria | `recharts AreaChart`, `spike = toChartData(twin.history.slice(-40))`, `dataKey` por `al.tag` | **marcar a linha de limite** (`ReferenceLine` no `limiteAlerta`/`limiteCritico`) e o **instante do disparo** |
| Linha do tempo | derivada de `criadoEm`/`resolvidoEm` + `ORIGEM_METODO` | hoje é **sintética** (offsets fixos +3s/+9min); substituir por eventos reais persistidos |
| Ativo Relacionado | `Bar_` (saúde do twin) + `Badge` status + link `/ativos/:id/overview` | adicionar D-I-C-I do ativo |
| Ações Rápidas | 5 botões: OS (toast), **Assistente IA** (`/assistente/:id`), Histórico, Escalar, Falso positivo | gate RBAC; OS é placeholder |
| Comentário | `<textarea>` + toast | **não persiste** — adicionar histórico de comentários |

### 5. Estados
- **Loading** — `al = alerts.find(...) ?? alerts[0]` (fallback ao primeiro). **Refinar:** ID inexistente
  deveria mostrar **empty "alerta não encontrado"**, não silenciosamente abrir outro.
- **Empty** — twin sem history → mini-gráfico vazio. Mostrar "sem telemetria no período / ativo offline".
- **Error** — ativo removido (`asset` undefined): hoje cai em `?? ""`. Tratar como degradado explícito.
- **TEMPO REAL** — o alerta pode **auto-resolver pelo motor enquanto a tela está aberta** (limite
  normaliza, `prob21<0.4`, ativo volta online). O status/badge muda sob o usuário. **Refinar:** banner
  "Resolvido automaticamente pelo motor às HH:MM — condição normalizada" para não parecer ação de terceiro.
- **Sem-permissão** — `read`: ações desabilitadas com tooltip "Requer nível full em Alertas".

### 6. User stories cobertas
- **US-9** — alerta `origem:"modelo"`: o Detalhe é onde mora a **explicabilidade** (modo dominante
  `FAILURE_MODE_LABEL[twin.modoCritico]`, `prob21`, `rulDias`, `residual`).
- **US-12** — botão **"Abrir no Assistente IA"** já navega `/assistente/:assetId`, levando contexto do
  ativo para sugestão conversacional de solução de falha.
- **US-7** — mini-gráfico histórico no momento do alerta (`twin.history`).
- **US-13** — Método/Origem + (proposto) linha do Dicionário + D-I-C-I + autor das ações.

### 7. Governança nativa
- **Origem/Método** já visíveis (`ORIGEM_METODO`). Tornar o **Dicionário** clicável: alerta `regra`
  → link para a tag em `governanca/dicionario` mostrando faixa/limite/sensor/direção que disparou.
- **Breadcrumb hierárquico** do ativo (hoje só `["Alertas","Lista de Alertas", id]`).
- **Trilha auditável**: a linha do tempo deve ser construída de **eventos reais** (detecção, ack,
  resolução, reabertura, comentários, escalonamento) com **autor + timestamp**, não offsets fixos.

### 8. Confiança da IA (bloco transversal — padrão único)
Para alertas `origem:"modelo"` (US-9), o Detalhe deve expor o **card de predição honesto**:

| Campo | Fonte real | Exemplo |
|---|---|---|
| Valor | `twin.probFalha[21].prob` | "84% de probabilidade de falha em 21 dias" |
| Janela/horizonte | `horizonteDias` + `twin.rulDias` (RUL) | "horizonte 21 d · RUL ~38 d" |
| **Confiança** | derivar de `residual` + `damage` + D-I-C-I do ativo | "Confiança média (72%)" |
| Explicação | `FAILURE_MODE_LABEL[twin.modoCritico]` + `TAG_OF_MODE` | "Modo dominante: Rolamento (vibração)" |
| **Nota de honestidade** | fixa | "Predição de modelo de degradação **simulado** (físico-informado + Weibull), **não treinado em falhas reais**. Interface `PredictionModel` (`src/engine/prediction.ts`) permite plugar modelo treinado." |

Para alertas `origem:"regra"`, deixar claro que **não é predição**: é **fato medido** que cruzou o
limite do Dicionário — confiança 100% sobre o valor (a incerteza está no sensor, não no modelo).

### 9. Recomendações priorizadas
| # | Recomendação | Prioridade | Esforço |
|---|---|---|---|
| D1 | **Card de predição honesto** para `origem:"modelo"` (valor+horizonte+confiança+explicação+nota de simulado vs treinado) | **P0** | médio |
| D2 | RBAC nas ações (Reconhecer/Resolver/Reabrir/Comentar/Falso positivo gated por `useCan("Alertas","full")`) | **P0** | baixo |
| D3 | `ReferenceLine` de limite (`limiteAlerta`/`limiteCritico` por `al.tag`) + marcação do instante do disparo no mini-gráfico | **P0** | médio |
| D4 | Linha do tempo **real e persistida** (eventos com autor/timestamp) em vez de offsets sintéticos | P1 | médio |
| D5 | Banner de **auto-resolução pelo motor** (estado de tempo real) + tratamento de ID inexistente | P1 | baixo |
| D6 | Linha do **Dicionário** que disparou (campo/faixa/limite/sensor/direção) + link para a tag | P1 | baixo |
| D7 | **Persistir comentários** (novo campo no `Alert` ou slice de eventos) + autor | P1 | médio |
| D8 | Implementar **Criar Ordem de Serviço** real (hoje toast placeholder) | P2 | alto |
| D9 | Breadcrumb hierárquico do ativo + bloco D-I-C-I no card do ativo | P2 | baixo |

---

## Preocupações transversais do domínio

### Origem do alerta: regra (Dicionário) × modelo (Gêmeo)
A separação já é **estrutural** (`AlertOrigem`), mas precisa virar **linguagem visual consistente**:
regra = ícone/cor determinística + "fato medido"; modelo = ícone `Cpu` + chip de confiança + nota de
honestidade; manual = "registro humano". Nunca apresentar predição como certeza.

### Severidade
`Severity = critico|alto|medio|baixo` (`SevBadge`). Regras: `breachCrit → critico`, `breachAlert → alto`;
modelo: `prob21>0.8 → critico, senão alto`. Auto-escala alto→crítico sem novo registro. Manual deixa o
usuário escolher. **Manter coerência:** baixo/médio hoje só vêm de seed/manual — documentar.

### Ciclo de vida + dedup + auto-resolução + snooze
Fluxo real: `aberto → (ack) em_analise → (resolve) resolvido → (reopen) aberto`. Motor faz dedup por
`(assetId, tag, origem)`, auto-resolve na normalização, e **snooze de 24h** pós-resolução. **Risco UX:**
usuário resolve manualmente, condição persiste, motor **não** recria (snooze) — parece "sumiu". Mostrar
no Detalhe "em snooze até HH:MM; re-armará se romper de novo".

### Ações
Reconhecer (`ackAlert`→`em_analise`), Resolver (`resolveAlert`), Reabrir (`reopenAlert`), Criar manual
(`addAlert`), Falso positivo (atalho p/ resolve), Escalar (hoje só `ackAlert`+toast), Criar OS (placeholder),
Abrir Assistente (US-12, real). Todas precisam de **autor + RBAC + entrada na trilha**.

### Mini-gráfico do histórico no momento
`toChartData(twin.history.slice(-40))` — janela de ~últimas 40 amostras (5-min steps ≈ 3h20).
**Limitação honesta:** o twin guarda no máx. `HISTORY_CAP=288` (24h) e o persist corta para 48 — para
alertas antigos o "entorno" pode não existir mais. Documentar e, idealmente, **congelar um recorte de
telemetria no instante do disparo** dentro do próprio `Alert`.

### Ligação com o ativo
Card "Ativo Relacionado" liga ao gêmeo (`twin.health`, `twin.status`, `syncedAt`) e navega para
`/ativos/:id/overview`, `/ativos/:id/telemetria` e `/assistente/:id`. Reforçar com hierarquia + D-I-C-I.
