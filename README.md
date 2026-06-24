# Predicta — Manutenção Preditiva Industrial (by Forzy)

Plataforma IIoT de manutenção preditiva: monitoramento de telemetria em tempo real,
detecção de anomalias, predição de falhas e o recurso central — o **Gêmeo Digital**
de cada ativo, com simulador de cenários "e se…".

Aplicação **single-page** (Vite + React 18 + TypeScript + Tailwind v4), estado global
em **Zustand** (persistido), **motor de simulação físico-informado** próprio, e um
**assistente de IA** via proxy seguro para a API da Anthropic.

---

## Como rodar

```bash
npm install
cp .env.example .env       # configure ANTHROPIC_API_KEY (apenas o assistente precisa)
npm run dev                # http://localhost:5173
npm run build              # build de produção em dist/
```

- **Login (demo):** qualquer usuário ativo do seed, senha `predicta`.
  Ex.: `r.teixeira@forzy.com.br` (Gerente Industrial — acesso total).
- O assistente de IA só funciona com `OPENAI_API_KEY` configurada no `.env`
  (a chave fica **somente no servidor** — nunca é exposta ao navegador). Sem chave,
  o assistente mostra um erro claro; o resto do app funciona normalmente.

### Variáveis de ambiente (`.env`)

| Variável | Descrição |
|---|---|
| `OPENAI_API_KEY` | Chave da OpenAI (obrigatória para o assistente). |
| `OPENAI_MODEL` | Modelo (opcional). Padrão `gpt-4o`. |

`.env` está no `.gitignore` — nunca versione segredos.

---

## Arquitetura

```
src/
  main.tsx / App.tsx          # bootstrap + RouterProvider + Toaster
  routes.tsx                  # rotas reais (react-router 7) + guardas (Gate/RequireAuth)
  lib/                        # theme (paleta C), types (modelo de domínio), format, csv, telemetry, recommendations
  store/
    useStore.ts               # Zustand + persist (localStorage "predicta-state") — fonte única de verdade
    hooks.ts / derive.ts      # seletores + views derivadas (Asset + Twin → tela)
    createAsset.ts            # cria ativo + gêmeo digital (cadastro/OCR)
  engine/                     # MOTOR DE SIMULAÇÃO
    model.ts                  # modelo físico (leituras a partir de dano + carga; saúde; status)
    degradation.ts            # acúmulo de dano por modo de falha
    prediction.ts             # RUL + curva Weibull de probabilidade de falha (interface PredictionModel)
    simulation.ts             # loop central (tick), geração de alertas por limite, what-if (runScenario)
    useEngine.ts              # hook que liga/desliga o loop (montado no AppShell)
  ai/
    assistant.ts              # cliente do streaming SSE
    tools.ts                  # ferramentas (tool use) executadas contra o store/engine
    ocr.ts                    # OCR real (Tesseract.js) + parser de plaqueta
  auth/                       # useAuth (login/sessão), rbac (can/useCan), RequireAuth + Gate
  components/
    layout/                   # AppShell, Sidebar, Topbar, RootLayout, chrome (breadcrumb/ações)
    ui-shared/                # Badge, SevBadge, Bar_, KPI, SH, TT_, BC, IBtn
  pages/                      # uma tela por arquivo (Dashboard, Painel, Ativo/*, Alertas, Assistente, Governança/*, …)
  data/seed.ts                # dados de demonstração (ativos, alertas, dicionário, usuários, hierarquia)
server/assistantProxy.ts      # middleware Vite: POST /api/assistant → Anthropic (chave server-side)
```

---

## Como funciona o motor / Gêmeo Digital

Cada ativo tem um **Gêmeo Digital** (`AssetTwin`) com um **estado físico** que evolui
no tempo segundo um modelo de degradação transparente:

1. **Loop central** (`engine/simulation.ts`) — um `setInterval` de 1s (montado no
   `AppShell`) avança cada ativo online. Velocidade/pausa configuráveis; há um botão
   **"Avançar 7 dias"** e *catch-up* ao reabrir a aba.
2. **Leituras** (`engine/model.ts`) — temperatura, vibração, pressão, corrente, rpm e
   óleo derivam de uma curva-base de operação + termos de _drift_ que crescem com o
   **dano acumulado** por modo de falha, mais ruído.
3. **Degradação** (`engine/degradation.ts`) — cada modo (rolamento, desalinhamento,
   lubrificação, isolamento/térmico, cavitação) acumula dano proporcional ao estresse
   no tick (vibração, Arrhenius na temperatura, depleção de óleo, etc.). `damage ∈ [0,1]`.
4. **Saúde & status** — `health = 100·(1 − dano dominante)`; status por faixas
   (≥75 normal / 50–74 atenção / <50 crítico), respeitando ativos offline.
5. **Predição** (`engine/prediction.ts`) — **RUL** (vida útil restante) = tempo até o
   primeiro modo atingir 100% na taxa atual; **curva de probabilidade de falha** via
   Weibull sobre a RUL, em horizontes de 7/14/21/30/60 dias.
6. **Alertas reais** — a cada tick, as leituras são comparadas com os **limites do
   Dicionário** (Governança → Dicionário). Cruzou o limite → alerta (`origem: "regra"`);
   predição alta → alerta (`origem: "modelo"`). Há **deduplicação**, **auto-resolução**
   quando normaliza e **snooze** de 24h após resolução manual.
7. **Simulador "e se…"** — `runScenario()` roda o mesmo modelo de forma _headless_ sobre
   um **clone** do gêmeo (sem efeitos colaterais), variando carga, ambiente e manutenção,
   e devolve a nova curva, RUL e ΔRUL vs. base.

### ⚠️ Honestidade intelectual

A predição é de um **modelo de degradação simulado** (físico-informado + Weibull),
**não** um modelo treinado em falhas reais. Isso está explícito no código e na UI
(aba Gêmeo Digital / Saúde & IA).

### Plugar um modelo treinado de verdade

`engine/prediction.ts` define a interface `PredictionModel`:

```ts
export interface PredictionModel {
  readonly name: string;
  readonly metodo: string;
  predict(asset: Asset, twin: AssetTwin, dictionary: Tag[]): Prediction; // { rulDias, probFalha, modoCritico }
}
```

O modelo ativo é `simulatedModel`. Para usar um modelo real (ex.: ONNX no cliente ou
um endpoint), implemente `PredictionModel` e troque a constante `predictionModel` —
nenhuma tela precisa mudar.

---

## Assistente de IA

`/api/assistant` (middleware Vite em `server/assistantProxy.ts`) injeta a
`OPENAI_API_KEY` e faz proxy/stream da Chat Completions API da OpenAI. O cliente
(`ai/assistant.ts`) faz streaming token-a-token e roda um **loop agêntico**: o modelo pode chamar
ferramentas (`ai/tools.ts`) que executam contra o store/engine — `get_twin_state`,
`list_alerts`, `run_whatif`, `create_work_order`, `get_fleet_summary` — e os
resultados voltam para o modelo. O contexto (snapshot do ativo ou da frota) é injetado
no _system prompt_.

> **Produção:** o proxy é um middleware do Vite (dev). Para deploy estático,
> reimplemente `/api/assistant` como função serverless (ex.: `api/assistant.ts` na
> Vercel) com o mesmo formato de requisição/resposta.

### Base técnica (RAG sobre manuais OEM)

Além do assistente operacional acima, o Assistente tem um modo **"Base técnica"** (toggle no topo)
que responde **somente com base na documentação técnica** (manuais WEG), **citando a fonte**
(documento + seção/página) e **sinalizando a confiança** (alta/média/baixa) — e dizendo
honestamente *"não encontrei nas fontes"* quando não há cobertura.

É um **subsistema Supabase** (Postgres + **pgvector** + Edge Function `assistant-rag`) com ingestão
**Python** offline (parser com tabelas, chunking estrutural, embeddings `text-embedding-3-large`,
recuperação **híbrida** vetorial+full-text PT fundida por **RRF** + rerank Cohere). Convive com o
assistente operacional (não o substitui).

**Setup completo:** [`ingestion/README.md`](ingestion/README.md) (migrar → ingerir → deploy da função
→ avaliar com o golden set). Variáveis em `.env.example` (cliente: `VITE_SUPABASE_*`; servidor:
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `COHERE_API_KEY`). Sem `VITE_SUPABASE_*`, o toggle
mostra um erro claro e o resto do app segue normal.

---

## Autenticação & RBAC

- Login valida e-mail + senha contra os usuários do seed; sessão persistida com
  expiração ("Manter conectado"). Logout no topbar.
- `auth/rbac.ts` expõe `can(modulo, nivel)`. A sidebar oculta módulos sem permissão,
  rotas sensíveis usam `<Gate>` ("Acesso negado"), e ações (ex.: "Novo Ativo") são
  bloqueadas conforme o papel.
- **Demonstração:** troque o papel em **Configurações → Sessão & Papel** para ver o
  RBAC mudar a UI ao vivo. A matriz papel×módulo é **editável** em Governança → RBAC.

---

## Persistência & dados

Todo o estado (ativos, gêmeos, alertas, dicionário, usuários, hierarquia, D-I-C-I,
RBAC, configurações, sessão) é persistido em `localStorage` (`predicta-state`, com
`version` + `migrate`). **Configurações → Resetar dados de demonstração** recarrega o
seed (`data/seed.ts`).

---

## Stack

Vite 6 · React 18 · TypeScript · Tailwind v4 · Zustand · react-router 7 · recharts ·
lucide-react · sonner · react-hook-form · tesseract.js · OpenAI Chat Completions API.
