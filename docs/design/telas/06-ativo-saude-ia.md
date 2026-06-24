# Tela 06 — Detalhe do ativo: Saúde / Baseline / Anomalia / Manutenção

> Aba `saude` de `/ativos/:id` (rota filha de `AtivoDetail`). Cobre US-8 (baseline operacional), US-9 (previsão de anomalia), US-10 (previsão de parada/RUL) e US-11 (manutenção planejada). Arquivo real: `src/pages/ativo/SaudeIA.tsx`.

---

## 1. Nome da tela

**Saúde & IA do ativo** — a aba de inteligência preditiva dentro do Detalhe do Ativo. No produto, o rótulo da aba é `Saúde & IA` (`src/pages/AtivoDetail.tsx`, array `TABS`, `to:"saude"`), aninhada sob o cabeçalho do ativo que já expõe TAG, status (`Badge`), saúde %, Próx. Manut. e Disponibilidade. Esta é a tela onde o **gêmeo digital vira prognóstico**: pega o vetor de dano acumulado do twin e o traduz em score de saúde, baseline esperado, probabilidade de falha por horizonte, RUL (Remaining Useful Life), modo de falha dominante e recomendações que escrevem de volta no estado (`applyMaintenance`). É a face "decisória" do par cuja face "exploratória" é a aba Gêmeo Digital (`GemeoDigital.tsx`).

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE):** a tela já implementada em `SaudeIA.tsx` entrega quatro blocos vivos: (1) um *card de Predição de Falha* com banner de severidade (RUL em dias + modo dominante + prob. de falha em 21 dias) e um gráfico saúde-real-vs-projeção-IA construído a partir de `runScenario(...horizonteDias:14)`; (2) uma lista de *Recomendações de Manutenção* derivada de `recommendationsFor(twin, 0.1)`, cada uma com botão **Registrar manutenção** que chama `applyMaintenance(asset.id, modo)`; (3) um painel lateral *Saúde por Modo de Falha* (5 barras `Bar_` por `twin.damage[m]`); e (4) um painel *Modelo de IA* com ficha do engine (`predictionModel.name`/`.metodo`) e a **nota de honestidade** — "modelo de degradação simulado (físico-informado), não treinado em falhas reais". O estado é todo derivado do twin Zustand; não há predição mockada.

**Objetivo a refinar:** elevar a tela de "card de predição + lista de recomendações" para uma **estação de decisão de manutenção preditiva** que materializa o PADRÃO ÚNICO DE OUTPUT DE IA (valor + janela/horizonte + confiança + explicação + nota de honestidade) de forma consistente nos quatro outputs de ML — baseline (US-8), anomalia (US-9), RUL/parada (US-10) e manutenção planejada (US-11). Hoje o card mistura RUL, modo e prob. de 21 dias num único banner sem expor explicitamente a **confiança** nem a **explicação por variável**, e a US-8 (baseline) e US-9 (anomalia) estão implícitas no `residual` e na curva, mas **não têm bloco próprio**. O objetivo é dar a cada output de ML um cartão padronizado, rastreável ao Dicionário e ao ciclo D-I-C-I, e transformar "Registrar manutenção" numa ação de manutenção planejada com efeito Δ-RUL pré-calculado (que já existe na aba Gêmeo e precisa migrar para cá).

## 3. Perfil principal que usa a tela

| Persona | Uso primário | Nível RBAC esperado (`can('Ativos', …)` / `can('Telemetria', …)`) |
|---|---|---|
| **(a) Técnico de Manutenção** | **Persona-âncora.** Lê RUL, modo dominante e recomendações; aciona **Registrar manutenção** após executar a ordem de serviço no chão de fábrica. | `Ativos: full` (precisa de write para `applyMaintenance`) |
| **(b) Gestor Industrial** | Prioriza intervenções pela prob. de falha × criticidade; planeja janela de parada (US-11). | `Ativos: read/full` |
| **(c) Cliente da Indústria** | Transparência: por que o ativo está em risco, com que confiança, e que ação está prevista. Modo leitura, sem botões de registro. | `Ativos: read` |
| **(e) TI/Governança** | Audita a procedência do número: variável-fonte no Dicionário, modelo e nota de honestidade; valida que a predição respeita a hierarquia. | `Governança/Dicionário: read/full` |

O **Admin Forzy (d)** entra para validar a ficha do modelo e o padrão de honestidade em todos os ativos, mas não é o usuário diário desta tela.

## 4. User stories da Forzy atendidas

- **US-8 — ML baseline operacional:** a tela compara saúde **real** (`twin.health`, linha `r`) contra a **projeção/baseline esperado** (linha `p` de `runScenario`); o `twin.residual` (desvio físico↔digital) é o termômetro do baseline. *Refinar:* expor o baseline como banda esperada por variável, não só como linha de saúde.
- **US-9 — ML previsão de anomalias:** o `residual` e o cruzamento da curva projetada já sinalizam desvio; os modos de falha (`twin.damage`) são as anomalias tipadas. *Refinar:* card de anomalia explícito (variável fora da banda baseline → modo provável → confiança).
- **US-10 — ML previsão de parada/manutenção:** `computeRUL` + `failureCurve` (Weibull β=2.2) em `src/engine/prediction.ts` entregam RUL e prob. por horizonte [7,14,21,30,60]. É o coração da tela.
- **US-11 — manutenção planejada:** `recommendationsFor` gera ações priorizadas com `prazoDias`; `applyMaintenance` registra a intervenção e recalcula saúde/RUL. *Refinar:* trazer o Δ-RUL pré-calculado (já em `GemeoDigital.recEffect`) e a janela planejada.
- **US-2 (interface amigável)** e **US-13 (governança)** são transversais: a nota de honestidade e o gating RBAC do botão de registro materializam ambas.

## 5. Blocos e seções da tela

| # | Bloco | Conteúdo | Estado atual | Fonte real |
|---|---|---|---|---|
| B0 | **Cabeçalho do ativo + tabs** (herdado) | TAG, status, saúde %, Próx. Manut., Disponib.; abas overview/telemetria/saude/gemeo/tecnico | Existe | `AtivoDetail.tsx` |
| B1 | **Card Predição de Falha (US-10)** | Banner severidade: RUL em dias, modo dominante, prob. 21d + número grande; gráfico Saúde Real (`steel`) vs Projeção IA (`yellow` tracejado), `ReferenceLine y=50` | Existe | `SaudeIA.tsx` 52–80 |
| B2 | **Score de Saúde & Baseline (US-8)** | *A criar:* score 0–100 + banda baseline esperada + residual como medida de aderência ao modelo | Parcial (residual existe no twin, não exibido aqui) | `model.ts healthFromDamage`, `twin.residual` |
| B3 | **Detecção de Anomalia (US-9)** | *A criar:* variável que mais desvia do baseline → modo provável → confiança | Implícito (curva + damage) | `degradation.TAG_OF_MODE`, `twin.state` |
| B4 | **Recomendações de Manutenção (US-11)** | Lista priorizada (Alta/Média/Baixa), ação, motivo, prazo sugerido, botão Registrar | Existe | `SaudeIA.tsx` 82–104, `recommendations.ts` |
| B5 | **Saúde por Modo de Falha** | 5 barras: rolamento, desalinhamento, lubrificação, isolamento, cavitação; modo crítico destacado | Existe | `SaudeIA.tsx` 108–122 |
| B6 | **Ficha do Modelo de IA + Nota de Honestidade** | Modelo, método, inferência, sync, 6 variáveis + bloco de honestidade | Existe | `SaudeIA.tsx` 123–143 |

## 6. Componentes principais

| Componente | Papel | Origem real |
|---|---|---|
| `SH` | Header de seção dos cards | `ui-shared/index.tsx` |
| `Bar_` | Barra de saúde por modo (B5) | `ui-shared` |
| `TT_` | Tooltip custom dos gráficos Recharts | `ui-shared` |
| `LineChart`/`Line`/`ReferenceLine` | Curva saúde real vs projeção (B1) | Recharts |
| Banner de severidade (`sevColor` por `prob21`) | Alerta visual RUL/prob | inline `SaudeIA.tsx` |
| Cartão de recomendação + botão `Registrar manutenção` | Ação write no twin | inline + `applyMaintenance` |
| `predictionModel` (`name`, `metodo`) | Ficha do engine | `engine/prediction.ts` |
| `recommendationsFor(twin, threshold)` | Gera recs por dano | `lib/recommendations.ts` |
| `runScenario(...)` | Projeção do baseline (linha `p`) | `engine/simulation.ts` |
| **A criar:** `ConfidenceTag`, `ExplainabilityList`, `HonestyNote` (componentes padronizados de output de IA) | Padrão único de confiança/explicação/honestidade reutilizável entre B1–B4 | novo em `ui-shared` |

## 7. Dados exibidos

| Dado | Campo real | Unidade / faixa | Rastreio ao Dicionário |
|---|---|---|---|
| Saúde do ativo | `twin.health` (`healthFromDamage`) | 0–100 % | Derivado do pior dano + 0.12·secundários |
| RUL | `twin.rulDias` (`computeRUL`) | dias (cap `RUL_CAP=3650`) | menor `remaining/rate` entre modos |
| Prob. de falha 21d | `twin.probFalha[h=21].prob` | 0–100 % | `failureProb` Weibull β=2.2 |
| Modo crítico | `twin.modoCritico` (`worstMode`) | enum FailureMode | — |
| Dano por modo | `twin.damage[m]` | 0–1 → % | cada modo mapeia a uma TAG (`TAG_OF_MODE`) |
| Residual (US-8/9) | `twin.residual` | % | desvio físico↔digital |
| Variáveis | temp/vib/press/corrente/rpm/oleo | °C, mm/s, bar, A, RPM, % | **Dicionário** (campo, unidade, faixa, limite, direção) |
| Recomendação | `Recommendation{acao,motivo,pri,prazoDias,damage}` | — | `prazoDias = max(3, round(rul·0.35))` |
| Modelo | `predictionModel.name`/`.metodo` | texto | "Predicta Digital Twin Engine v1" |
| Sincronismo / inferência | `twin.syncedAt`, `simClock` | data/hora | `fmtDate`, `fmtTimeSec` |

**Lacuna de governança:** cada número desta tabela deveria carregar visualmente sua faixa/limite do Dicionário (US-3/13). Hoje o motor já lê `dictionary` (ex.: `pressAlertThreshold` em `degradation.ts`), mas a UI não mostra a procedência — ver §11.

## 8. Ações do usuário

| Ação | Efeito real | Gate RBAC |
|---|---|---|
| **Registrar manutenção** (por recomendação) | `applyMaintenance(asset.id, modo)` → dano do modo cai a 8% (`damage·0.08`), óleo→100 se lubrificação, recalcula `health/status/modoCritico` (`deriveTwinHealth`), `syncedAt=simClock`; toast de confirmação | `can('Ativos','full')` |
| Inspecionar curva (hover) | Tooltip `TT_` com saúde real / projeção por dia | read |
| Ler ficha do modelo + nota de honestidade | Transparência US-2/13 | read |
| *A criar:* alternar horizonte (7/14/21/30/60) no card de predição | reusar `HORIZONS` de `prediction.ts` | read |
| *A criar:* "Planejar parada" / abrir Ordem de Serviço | hoje o botão OS no header é placeholder (`IBtn` sem `onClick` em `AtivoDetail`) | full |
| *A criar:* "Explicar no Assistente" | navegar `/assistente/:id` com contexto do modo crítico (US-12) | `can('Assistente','read')` |

## 9. Relação com outras telas

- **Gêmeo Digital (`gemeo`)** — irmã desta aba: o simulador "E se…", a curva de degradação por modo e o Δ-RUL pré-calculado das recomendações vivem lá (`GemeoDigital.tsx recEffect`). Saúde & IA é a versão **decisória/sumária**; Gêmeo é a **exploratória**. Há sobreposição de recomendações e ficha de modelo — oportunidade de fatorar componentes comuns.
- **Telemetria (`telemetria`)** — fonte das variáveis raw (US-3/4/7); a anomalia (B3) deve linkar para o gráfico histórico da variável-fonte.
- **Visão Geral / Dados Técnicos** — placa, TAG, OCR (US-5), ciclo D-I-C-I.
- **Alertas** — o `IBtn` Alertas no header leva a `/alertas`; recomendações de alta prioridade deveriam aparecer lá como alertas vivos por limite do Dicionário.
- **Assistente (`/assistente/:id`)** — US-12: explicar a falha prevista e sugerir solução.
- **Mapa / Hierarquia** — breadcrumb `["Ativos","Lista de Ativos",asset.id]` (`usePageChrome`) ancora na Matriz de Hierarquia.

## 10. Relação com governança

- **Hierarquia (espinha):** breadcrumb empresa→planta→área→ativo via `usePageChrome` em `AtivoDetail`; a predição só é mostrada para ativos visíveis ao papel/hierarquia do usuário.
- **Dicionário:** todo número rastreia a um campo (unidade, faixa, limite, sensor, direção). O motor já consome `dictionary` (`computeRUL`, `dailyRate`, `pressAlertThreshold`); a UI deve **expor** esse vínculo (tooltip/popover de procedência).
- **RBAC:** `applyMaintenance` é uma escrita no estado do ativo e precisa de `can('Ativos','full')`; em `read`, o botão Registrar vira chip "somente leitura". Hoje a tela não gateia o botão explicitamente — risco de governança.
- **D-I-C-I:** registrar manutenção é um evento de **Inspeção/Comissionamento** do ciclo do ativo; deveria gravar artefato auditável (quem, quando, qual modo, RUL antes/depois), não só mutar o twin.
- **Honestidade (padrão único):** a nota "modelo simulado, não treinado em falhas reais" (B6) é requisito de governança de IA — deve permanecer e ser replicada em cada output de ML, com `metodo` e `name` vindos de `predictionModel` para sobreviver à troca por um modelo real via interface `PredictionModel`.

## 11. Melhorias de UX/UI sobre o wireframe base

1. **[P0] Padronizar o "cartão de output de IA" (valor + horizonte + CONFIANÇA + EXPLICAÇÃO + HONESTIDADE).** Hoje o banner de B1 (`SaudeIA.tsx` 52–68) entrega valor + horizonte fixo (21d), mas **não há confiança nem explicação por variável**. Criar `ConfidenceTag` + `ExplainabilityList` em `ui-shared` e aplicar em B1/B2/B3/B4. A confiança pode derivar honestamente de `twin.residual` (quanto menor o residual, maior a aderência ao modelo) e da dispersão Weibull — sem inventar acurácia que o modelo simulado não tem.

2. **[P0] Promover o horizonte a controle, não constante.** O banner cita "21 dias" hardcoded (`prob21`, `SaudeIA.tsx` 28). Adicionar seletor de horizonte reusando `HORIZONS` de `prediction.ts` (como os botões `GAUGE_HORIZONS` já fazem em `GemeoDigital.tsx` 168–173). Um único horizonte mascara o perfil de risco.

3. **[P0] Gatear o botão Registrar por RBAC.** `applyMaintenance` (`SaudeIA.tsx` 97–100) é escrita sem checagem de papel. Envolver com `can('Ativos','full')`; em `read`, renderizar estado desabilitado com tooltip de permissão. Falha de governança hoje.

4. **[P1] Dar bloco próprio ao Baseline (US-8) e à Anomalia (US-9).** Hoje ambos estão dissolvidos na curva e no `residual` invisível. Criar B2 (score + banda esperada por variável, usando `readingFromState` como esperado vs `twin.state` como medido — o mesmo par já calculado em `GemeoDigital.tsx` 58) e B3 (variável de maior desvio → modo provável via `TAG_OF_MODE` → confiança). Sem isso, duas das quatro US ficam sem âncora visual.

5. **[P1] Trazer o Δ-RUL pré-calculado para as recomendações desta aba.** `GemeoDigital.recEffect` (linhas 80–83) já calcula o ganho de RUL de cada manutenção; a lista de B4 em `SaudeIA.tsx` mostra só "Prazo sugerido". Exibir "+N dias de RUL" por recomendação torna a priorização acionável e unifica as duas abas.

6. **[P1] Reorganizar B1 em grade de horizontes em vez de número único.** O "28px Prob. Falha" isolado desperdiça o `failureCurve` completo. Transformar em mini-tabela/sparkline dos 5 horizontes (`twin.probFalha`), com a `ReferenceLine y=50` da curva reposicionada para a linha de **falha (saúde→0)**, não 50% (hoje `ReferenceLine y={50}` em 75 sugere semântica ambígua).

7. **[P2] Rastreio ao Dicionário em hover.** Cada métrica (RUL, prob, dano por modo) deveria abrir popover de procedência (campo/unidade/faixa/limite/sensor) — o motor já tem `dictionary` em mãos; falta o componente `TT_`-like de governança. Materializa US-3/13 sem poluir a leitura.

8. **[P2] Conectar B4 ao fluxo de Ordem de Serviço e ao ciclo D-I-C-I.** O botão "Ordem de Serviço" no header (`AtivoDetail.tsx` 44) é placeholder; "Registrar manutenção" deveria abrir/anexar OS e gravar evento auditável (RUL antes/depois), não só mutar o twin silenciosamente. Hoje a ação é irreversível na UI sem trilha.

9. **[P2] Botão "Explicar no Assistente" no modo crítico** (US-12) levando a `/assistente/:id` com o `modoCritico` pré-carregado — fecha o laço prognóstico→diagnóstico→ação.

10. **[Consistência] Fatorar componentes compartilhados entre Saúde & IA e Gêmeo Digital.** Recomendações, ficha do modelo e nota de honestidade estão duplicadas em `SaudeIA.tsx` e `GemeoDigital.tsx` com pequenas divergências (ex.: a nota de honestidade de Gêmeo cita a interface `PredictionModel`, a de Saúde não). Extrair `<RecommendationCard>`, `<ModelCard>` e `<HonestyNote>` para `ui-shared` garante o **padrão único de output de IA** entre as telas.
