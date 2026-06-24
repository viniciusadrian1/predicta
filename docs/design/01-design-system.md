# 01 — Design System, Fundações, Modularidade, Personas × RBAC e Padrão de Confiança da IA

> Documento-base do PREDICTA (FORZY). Os demais documentos de design (`02..n`) **referenciam** as
> fundações, componentes, estados, matriz RBAC e o componente de confiança da IA definidos aqui.
> Voz de arquiteto de produto sênior, ancorado no código real do repositório.

---

## Estado atual no produto (o que JÁ EXISTE)

O PREDICTA **não é wireframe** — é um produto React/TS funcional. As fundações de design já vivem no código:

- **Paleta canônica** em `src/lib/theme.ts` (objeto `C`), declarada como *single source of truth* ("não
  hardcode hex em outro lugar"). Helpers de status já existem: `corDaSaude(v)`, `corDoStatus(status)`,
  `corDaCriticidade(crit)`.
- **Tokens semânticos CSS** (shadcn/Tailwind v4) em `src/styles/theme.css` — `--background`, `--card`,
  `--primary`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--radius`,
  além do bloco `--sidebar-*`. Há um `@theme inline` que mapeia cada token para `--color-*` do Tailwind.
- **Fontes** carregadas em `src/styles/fonts.css`: Rajdhani (400–700), Inter (300–600 + itálico),
  JetBrains Mono (400–500). Body herda Inter via `@layer base` em `theme.css`.
- **Biblioteca compartilhada** em `src/components/ui-shared/index.tsx`: `Badge`, `SevBadge`, `Bar_`,
  `KPI`, `SH` (section header), `TT_` (tooltip de gráfico), `BC` (breadcrumb) e `IBtn` (icon button,
  variantes ghost/primary/danger). Há também a biblioteca shadcn em `src/app/components/ui/*`
  (inclui `skeleton.tsx`, ainda **não** usado nas telas de domínio).
- **Layout persistente** em `src/components/layout/`: `AppShell` (Sidebar + Topbar + `<Outlet/>`),
  `Sidebar` (nav real com `NavLink` e **gating RBAC já implementado** via `permLevel`), `Topbar`
  (breadcrumb + ações por página) e `chrome.tsx` (store externo `usePageChrome` que publica
  breadcrumb/ações para a Topbar sem re-render do conteúdo).
- **RBAC vivo**: matriz editável em `src/data/seed.ts` (`PERM`), helpers em `src/auth/rbac.ts`
  (`permLevel`, `can`, `useCan`, `usePermLevel`) e o componente `Gate` em `src/auth/RequireAuth.tsx`
  que renderiza um painel "Acesso negado" por módulo. A sidebar **esconde** itens sem permissão.
- **Modelo de predição plugável**: `src/engine/prediction.ts` define a interface `PredictionModel`
  (`name`, `metodo`, `predict`) e o `simulatedModel` ("Predicta Digital Twin Engine v1",
  "Degradação físico-informada + Weibull"). O arquivo carrega **nota de honestidade explícita** no topo:
  modelo *simulado*, não treinado em falhas reais.

**Lacunas que este documento formaliza (o que REFINAR/ADICIONAR):** (1) não há padrão único de
*loading/empty/error/realtime/sem-permissão* — hoje é texto ad-hoc ("Carregando…" em `routes.tsx`,
"Nenhum…" espalhado); (2) o `skeleton.tsx` existe mas não é usado; (3) a modularidade (US-1) **não**
tem componente de upsell — módulo ausente apenas some da nav; (4) o padrão de output de IA
(valor+horizonte+confiança+explicação+honestidade) **não** está encapsulado em componente reutilizável;
(5) a paleta tem **dois sistemas paralelos** (`C` em JS e tokens CSS) com hex divergentes
(`bg #07101E` vs `--background #080C14`; `card #0C1829` vs `--card #0D1829`) — risco de drift.

---

## 1. Job & propósito

> **Estabelecer a linguagem visual, comportamental e de governança única do PREDICTA** — para que toda
> tela seja construída com os mesmos tokens, os mesmos cinco estados, a mesma matriz de permissão e o
> mesmo padrão de honestidade de IA, sem reinventar primitivos por página.

Este doc é "infraestrutura de produto": não resolve uma decisão operacional do cliente, mas garante que
todas as telas que resolvem (dashboard, ativos, alertas, gêmeo, governança) falem a **mesma língua**.

---

## 2. Personas × RBAC e a DEFAULT VIEW por papel

A matriz real vive em `src/data/seed.ts` (`PERM`) e é copiada para o store (`useStore`, `rbac:
clone(PERM)`), portanto **editável em runtime** pela tela `/governanca/rbac`. Módulos do produto
(10): `Dashboard, Ativos, Telemetria, Alertas, Assistente, Cadastro, OCR, Mapa, Governança, RBAC`.

### 2.1 Matriz canônica (verbatim do código)

| Papel (seed) → Persona | Dashboard | Ativos | Telemetria | Alertas | Assistente | Cadastro | OCR | Mapa | Governança | RBAC |
|---|---|---|---|---|---|---|---|---|---|---|
| **Gerente Industrial** → (b) Gestor / (d) Admin Forzy | full | full | full | full | full | full | full | full | **full** | **full** |
| **Eng. Confiabilidade** → (b) Gestor técnico | full | full | full | full | full | full | full | full | read | none |
| **Técnico Manutenção** → (a) Técnico | read | read | read | **full** | full | none | none | read | none | none |
| **Analista de Dados** → (e) TI/Governança | read | read | **full** | read | read | none | none | none | **full** | none |
| **Operador Campo** → (c) Cliente/campo | none | read | none | read | none | none | none | read | none | none |

> Nota de honestidade do modelo de dados: o seed traz **5 papéis**; as **5 personas** do briefing
> mapeiam de forma não-1:1 (ex.: "Cliente da Indústria" hoje é melhor servido por *Operador Campo* +
> uma futura visão *read-only* de Dashboard). A regra de leitura é sempre `none < read < full`
> (`RANK` em `src/auth/rbac.ts`).

### 2.2 DEFAULT VIEW por papel (rota inicial pós-login)

A default view deve ser a **primeira rota com permissão ≥ read**, na ordem da sidebar. Hoje o login
sempre cai em `/dashboard` — o que **quebra** para *Operador Campo* (`Dashboard: none`) e *Técnico*
(que prefere a fila de alertas). Padrão recomendado:

| Papel | Default view recomendada | Por quê |
|---|---|---|
| Gerente Industrial | `/dashboard` | visão de saúde da planta + KPIs |
| Eng. Confiabilidade | `/dashboard` → foco em `/ativos` | confiabilidade por ativo/modo de falha |
| Técnico Manutenção | **`/alertas`** | seu job é a fila de ordens; tem `Alertas: full` |
| Analista de Dados | **`/governanca/dicionario`** ou `/operacional` | dono do Dicionário + Telemetria full |
| Operador Campo | **`/ativos`** | único módulo read sem ser alerta; Dashboard=none |

**Regra de fallback (US-1 + RBAC):** se a default view configurada cair em módulo `none`, redirecionar
para a primeira rota permitida; se **nenhuma** existir, mostrar tela de "Implantação parcial" (ver §7).

---

## 3. Arquitetura de informação (fundações transversais)

Ordem de leitura padrão de **qualquer** tela do PREDICTA:

1. **Espinha de governança (topo, sempre presente):** breadcrumb `BC` = Matriz de Hierarquia
   (`empresa → planta → área → sistema → ativo`). Publicado via `usePageChrome(bc, right)`.
2. **Primário:** o dado que resolve a decisão da tela (KPIs `KPI`, gráfico, fila). Tipografia Rajdhani
   para números grandes (`KPI` usa `text-[28px]` Rajdhani).
3. **Secundário:** contexto, filtros, badges de status (`Badge`/`SevBadge`).
4. **Sob-demanda:** detalhes, explicação da IA, ações destrutivas (gated por RBAC).

Hierarquia visual ancorada nos tokens: fundo `C.bg` → cards `C.bgCard` → hover `C.bgHover` →
borda `C.border`/`C.borderMd`. Dado vivo/realtime sempre em **steel `#82C8E5`**; texto secundário em
**slate `#6D8196`**.

---

## 4. Blocos & componentes — tokens do design system

### 4.1 Cor (tokens) — `src/lib/theme.ts` (`C`) é a fonte para telas de domínio

| Token (`C.*`) | Hex | Papel semântico | Uso |
|---|---|---|---|
| `bg` | `#07101E` | fundo app | shell |
| `bgCard` | `#0C1829` | superfície card | `KPI`, painéis |
| `bgDeep` | `#050C16` | fundo profundo | sidebar |
| `bgHover` | `#112035` | hover | itens nav, botões ghost |
| `bgInput` | `#091422` | campo de input | forms |
| `navy` | `#000080` | gradiente de marca | logo, avatar |
| `cobalt` | `#0047AB` | **ação primária** | botões primary, links ativos |
| `steel` | `#82C8E5` | **dado / realtime** | valores vivos, breadcrumb ativo |
| `slate` | `#6D8196` | texto secundário | labels, captions |
| `text` | `#DDE6F0` | texto primário | títulos/corpo |
| `textSub` | `#8FA8BC` | texto terciário | sublabels |
| `border` / `borderMd` | `rgba(130,200,229,.1)` / `.2` | bordas | cards, divisores |
| `green` | `#34D399` | OK / saúde ≥75 | status normal |
| `yellow` | `#FBBF24` | atenção / 50–74 | status atenção |
| `red` | `#F87171` | crítico / <50 | status crítico, badge alertas |
| `orange` | `#FB923C` | criticidade alta | criticidade de ativo |

**Mapas de status já no código** (não reinventar): `corDaSaude` (75/50), `corDoStatus`
(`normal/atencao/critico/offline`), `corDaCriticidade` (`Crítica|Alta → orange`).

### 4.2 Tipografia

| Família | Uso | Pesos disponíveis | Onde |
|---|---|---|---|
| **Rajdhani** | títulos, números, KPIs, section headers | 400/500/600/700 | `KPI`, `SH`, logo |
| **JetBrains Mono** | dados, tags, badges, breadcrumb, tooltips | 400/500 | `Badge`, `SevBadge`, `BC`, `TT_` |
| **Inter** | corpo, descrições | 300/400/500/600 + itálico | body default |

Escala observada nas telas (tamanhos tailwind reais): `text-[9px]` (eyebrow/seção), `text-[10px]`
(badges, labels uppercase), `text-[11px]` (breadcrumb, captions), `text-xs` (corpo denso), `text-[28px]`
(KPI). Tracking alto em uppercase: `tracking-[0.15em]`–`tracking-[0.25em]`.

### 4.3 Espaçamento, raio, sombra

- **Espaçamento:** grid base 4px. Padding de conteúdo `p-5` (AppShell), `space-y-4` entre blocos,
  `p-4` em `KPI`, `gap-3`/`gap-2.5` internos. **Recomendado documentar tokens nomeados** (`space-1=4px
  … space-5=20px`) para acabar com números mágicos.
- **Raio:** `--radius: 0.375rem` (6px) com escala `sm/md/lg/xl` em `theme.css`. Telas usam
  `rounded`/`rounded-md`/`rounded-lg`. Avatar/logo `rounded-full`/`rounded-lg`.
- **Sombra:** mínima (dark industrial). Tooltips usam `shadow-2xl` (`TT_`). Profundidade vem de
  **borda + tom de superfície**, não de sombra — manter.

### 4.4 Biblioteca de componentes compartilhados (real)

| Componente | Arquivo | Variantes / props | Token-chave |
|---|---|---|---|
| `Badge` | `ui-shared/index.tsx` | status: normal/atencao/critico/offline/aberto/em_analise/resolvido/ativo/inativo/aprovado/em_revisao/pendente | mono, `text-[10px]` uppercase |
| `SevBadge` | idem | critico/alto/medio/baixo | red/orange/yellow/slate |
| `Bar_` | idem | barra de saúde 0–100 (cor por faixa) | `corDaSaude` inline |
| `KPI` | idem | label/val/sub/icon/color | card `C.bgCard`, número Rajdhani |
| `SH` | idem | título + slot `right` | header de seção `text-[11px]` |
| `TT_` | idem | tooltip Recharts | superfície `#0F1E35` |
| `BC` | idem | breadcrumb (array de strings) | = **Matriz de Hierarquia** |
| `IBtn` | idem | ghost / primary / danger | `cobalt` primary, `red` danger |
| `Gate` | `auth/RequireAuth.tsx` | painel "Acesso negado" por módulo | estado **sem-permissão** |
| `Skeleton` | `app/components/ui/skeleton.tsx` | shimmer genérico (**hoje não usado**) | estado **loading** |

**Componentes a ADICIONAR (faltam e são transversais):** `EmptyState`, `ErrorState`, `LiveTag`
(realtime), `UpsellModule` (US-1) e `AIConfidence` (§8). Detalhados abaixo.

---

## 5. Estados — padrão único (dado vivo é estado de 1ª classe)

Cada componente de dados deve declarar os **cinco** estados. Hoje só `sem-permissão` (`Gate`) e um
`Loading` textual existem. Padrão proposto, ancorado nos tokens:

| Estado | Gatilho | Tratamento visual | Componente | Status hoje |
|---|---|---|---|---|
| **loading** | dado em busca/primeiro tick do engine | `Skeleton` com shimmer na forma final (KPI/linha/gráfico), **não** spinner solto | `Skeleton` (existe, plugar) | parcial (texto "Carregando…") |
| **empty** | filtro sem resultado / ativo sem histórico | ícone slate + frase + CTA ("Ajustar filtro" / "Cadastrar ativo") | **criar `EmptyState`** | ad-hoc ("Nenhum…") |
| **error** | falha de cálculo / proxy IA / OCR | card borda `red`, mensagem honesta + ação "Tentar de novo" | **criar `ErrorState`** | ausente |
| **TEMPO REAL** | engine tick (`syncedAt`), dado vivo | tag `LiveTag` pulsante em **steel**, timestamp `syncedAt`, transições suaves (`transition-all`) | **criar `LiveTag`** | implícito (sem marcação) |
| **sem-permissão** | módulo `none` para o papel | painel "Acesso negado" (`Gate`) ou item oculto na sidebar | `Gate` (existe) | OK |

### 5.1 Tempo real como cidadão de primeira classe

O `AssetTwin` carrega `syncedAt` (último sync físico↔digital), `state` (leitura corrente),
`residual` (sinal de anomalia) e `status`. **Todo número vivo** deve:
1. ser pintado em **steel** quando "fresco" (< N ticks) e esmaecer para slate quando "stale";
2. exibir um `LiveTag` ("● AO VIVO" mono, pulsante) preso ao bloco;
3. carregar o `syncedAt` como tooltip/caption ("sincronizado há 12s");
4. animar a troca de valor (sem "pulo" brusco — `transition-all` já é padrão nos cards).

`Settings.paused` (store) deve trocar o `LiveTag` para "PAUSADO" (âmbar) — coerência entre o simulador
e a UI.

### 5.2 Especificação dos componentes novos de estado

- **`EmptyState({ icon, titulo, descricao, cta? })`** — centralizado, `py-24`, ícone em caixa
  `rgba(...,0.1)`, título Rajdhani, descrição slate, CTA `IBtn` opcional. Reaproveita a estrutura
  visual do `Gate`.
- **`ErrorState({ titulo, detalhe, onRetry })`** — mesma estrutura, cor `red`, botão "Tentar de novo".
- **`LiveTag({ syncedAt, paused })`** — pílula mono steel/âmbar com ponto pulsante.

---

## 6. User stories cobertas (este doc é a base de todas)

| US | Como o design system a sustenta |
|---|---|
| **US-1** (modular) | §7 — nav/dashboard adaptam aos módulos contratados; `UpsellModule` substitui tela quebrada |
| **US-2** (interface amigável) | tokens, tipografia legível, estados claros, default view por papel (§2.2) |
| **US-7** (valores + históricos) | `KPI`, `Bar_`, `TT_`, padrão realtime (§5.1) |
| **US-8/9/10/11** (ML) | §8 — `AIConfidence` é o invólucro único de todo output de modelo |
| **US-13** (governança) | §2 (RBAC), breadcrumb = Hierarquia (§3), `Gate`, D-I-C-I como espinha (§7) |

US-3/4/5/6/12 são cobertas por telas específicas (docs subsequentes), mas **consomem** os primitivos
deste doc (badges de severidade, estados de error/empty no OCR, realtime no assistente).

---

## 7. Governança nativa + Modularidade (US-1)

### 7.1 Governança como espinha ambiente

- **Hierarquia = breadcrumb.** Todo `BC` carrega o caminho `empresa → planta → área → sistema → ativo`.
  O design system trata o breadcrumb como componente de **governança**, não decoração.
- **Dicionário = rastreabilidade de todo número.** Cada valor exibido deve poder abrir
  "campo · unidade · faixa · limite · sensor · direção" (modelo `Tag` em `types.ts`). Padrão: número
  vivo com *affordance* de "ver no Dicionário".
- **RBAC = gating universal.** Toda ação destrutiva/edição usa `useCan(modulo, "full")`; toda leitura,
  `read`. A sidebar já filtra por `permLevel`.
- **D-I-C-I = ciclo de todo artefato.** `DiciRow` (`D/I/C/In` com status
  `aprovado/em_revisao/pendente`) — o design system padroniza um **selo D-I-C-I** (4 micro-badges
  reusando `Badge`) anexável a ativos e telas.

### 7.2 Modularidade (US-1) — nav/dashboard se adaptam

**Hoje:** módulo sem permissão **some** da sidebar (`items.filter(visible)`), e seção vazia é
ocultada. Isso cobre *implantação parcial*, mas trata "não-contratado" e "sem-permissão-do-papel"
como a **mesma coisa** — e **não há upsell**.

**Refinar:** separar dois conceitos —
1. **Módulo não-contratado** (implantação parcial): item aparece **bloqueado com cadeado + selo
   "Não contratado"** e abre `UpsellModule` (CTA "Falar com a Forzy"). Nunca tela quebrada.
2. **Módulo contratado mas sem permissão do papel:** oculto na nav; acesso direto cai no `Gate`.

**Dashboard adaptativo:** os blocos do dashboard devem ser **declarados por módulo**; renderizar só os
blocos cujos módulos estão contratados **e** visíveis ao papel. Slot vazio de módulo contratado-porém-
sem-permissão = nada; módulo não-contratado = card de upsell discreto (apenas para papéis com poder de
compra: Gerente/Admin).

- **`UpsellModule({ modulo })`** — card `C.bgCard`, cadeado, "Módulo {X} não está na sua implantação",
  CTA primário cobalt. Fonte de verdade: uma flag `contratados: string[]` a adicionar ao store/seed.

---

## 8. Confiança da IA — PADRÃO ÚNICO de output de ML (componente `AIConfidence`)

**Tese:** todo output de modelo (baseline US-8, anomalia US-9, parada/manutenção US-10/11) é renderizado
pelo **mesmo** componente, que expõe sempre **cinco campos**:

1. **valor** — a predição (ex.: RUL `rulDias`, prob. de falha, modo crítico).
2. **janela / horizonte** — `HORIZONS = [7,14,21,30,60]` dias (de `prediction.ts`), ou a janela do baseline.
3. **CONFIANÇA** — nível qualitativo (Alta/Média/Baixa) + barra; derivada da maturidade do dado
   (tamanho de `history`, `residual`, dispersão). *Hoje não existe campo de confiança no engine —
   é P0 adicionar `confianca` ao retorno do `PredictionModel`.*
4. **EXPLICAÇÃO** — variáveis/causa: `modoCritico` (`worstMode`) + tags que mais contribuem +
   `residual`. Ancorar no Dicionário (qual sensor/limite).
5. **NOTA DE HONESTIDADE** — texto fixo derivado de `predictionModel.name` / `.metodo`:
   *"Predição do Predicta Digital Twin Engine v1 — modelo de degradação SIMULADO (físico-informado +
   Weibull), não treinado em falhas reais."* Quando um modelo treinado for plugado via `PredictionModel`,
   a nota troca automaticamente.

### 8.1 Anatomia do componente `AIConfidence`

```
AIConfidence({
  valor:        ReactNode,          // ex.: "RUL 23 dias"
  horizonte:    string,             // ex.: "janela 7–60 dias"
  confianca:    "alta"|"media"|"baixa",
  explicacao:   { variavel: string; contribuicao: number; tag?: TagKey }[],
  modelo:       PredictionModel,    // dá nome + método p/ a nota de honestidade
  treinado:     boolean,            // false hoje → exibe selo "SIMULADO"
})
```

| Bloco | Token / componente |
|---|---|
| valor | número Rajdhani, cor por severidade (`corDaSaude`/`SevBadge`) |
| horizonte | caption mono slate |
| confiança | barra (reusa `Bar_` visual) + label; alta=green, média=yellow, baixa=red |
| explicação | lista "variável → contribuição" com link ao Dicionário |
| honestidade | faixa âmbar discreta com selo **`SIMULADO`** (mono) enquanto `treinado=false` |

### 8.2 Por que isto importa (US-2 + US-13)

Cliente industrial precisa **confiar** sem ser enganado. O selo `SIMULADO` é requisito de governança:
diferencia explicitamente "modelo simulado × treinado", como a própria docstring de `prediction.ts`
exige. O componente único garante que **nenhuma** tela mostre uma predição "nua" (sem confiança/causa/
honestidade).

---

## 9. Acessibilidade & Responsividade (transversais)

### 9.1 Acessibilidade

- **Contraste:** validar todos os pares texto/fundo contra WCAG AA. **Risco conhecido:** `slate
  #6D8196` sobre `bgCard #0C1829` fica ~4.0:1 — abaixo de 4.5:1 para texto pequeno. Recomendado usar
  `textSub #8FA8BC` para texto secundário < 14px, reservando `slate` para ≥14px/ícones.
- **Foco:** já há `--ring: #0047AB` e `outline-ring/50` em `@layer base`. Garantir foco **visível** em
  `IBtn`, `NavLink` e inputs (hoje o foco custom não é evidente nos botões `IBtn`).
- **Teclado:** nav por `Tab` na sidebar (NavLink ok); diálogos/menus shadcn já trazem trap de foco.
  Padronizar `Esc` para fechar painéis e `Enter` para CTA primário.
- **Semântica:** badges de status **não** podem depender só de cor — já trazem **label textual**
  (`Badge`/`SevBadge` imprimem "Crítico", "Atenção"). Manter como regra.

### 9.2 Responsividade — degradação dos grids

- **Shell:** `AppShell` é `flex h-full overflow-hidden`; sidebar fixa `w-[220px]`. Em viewport estreito
  a sidebar deve **colapsar para drawer** (hoje não colapsa) — P1.
- **Grids de KPI/cards:** padrão de degradação `4 col → 2 col → 1 col` por breakpoint
  (`lg → md → base`). Tabelas densas (alertas, dicionário) viram **lista de cards** no mobile.
- **Gráficos Recharts:** sempre em container responsivo; em telas pequenas, reduzir horizontes
  exibidos (mostrar 7/30/60 em vez de todos os 5).

---

## 10. Recomendações priorizadas

### P0 (esforço)
- **Unificar a paleta (baixo).** `C` (`theme.ts`) e tokens CSS (`theme.css`) divergem em hex
  (`#07101E`↔`#080C14`, `#0C1829`↔`#0D1829`). Definir uma fonte e derivar a outra — evita drift.
- **Adicionar `confianca` ao `PredictionModel` + criar `AIConfidence` (médio).** Sem isso, US-8/9/10/11
  expõem predição "nua"; é o coração do padrão de honestidade.
- **Componentizar os 5 estados — `EmptyState`/`ErrorState`/`LiveTag` + usar `Skeleton` (médio).**
  Hoje cada tela improvisa; realtime não tem marcação visual.
- **Separar "não-contratado" de "sem-permissão" + `UpsellModule` (médio).** US-1 hoje mostra módulo
  ausente como simplesmente inexistente; falta upsell e flag `contratados`.

### P1
- **Default view por papel + fallback RBAC (baixo).** Login sempre vai a `/dashboard`, que quebra para
  Operador (Dashboard=none).
- **Selo D-I-C-I reutilizável (baixo).** 4 micro-badges anexáveis a partir de `DiciRow`.
- **Sidebar colapsável / drawer mobile (médio).** Shell não é responsivo hoje.
- **Tokens de espaçamento nomeados (baixo).** Eliminar números mágicos de padding/gap.

### P2
- **Affordance "ver no Dicionário" em todo número vivo (médio).** Rastreabilidade US-13 por valor.
- **Auditoria de contraste AA completa (baixo).** Corrigir pares slate/bgCard.
- **Modo "stale data" (médio).** Esmaecer valores quando `syncedAt` envelhece além do limite.

---

### Apêndice — arquivos de referência

`src/lib/theme.ts` · `src/lib/types.ts` · `src/styles/theme.css` · `src/styles/fonts.css` ·
`src/components/ui-shared/index.tsx` · `src/components/layout/{AppShell,Sidebar,Topbar}.tsx` ·
`src/components/layout/chrome.tsx` · `src/auth/{rbac.ts,RequireAuth.tsx,useAuth.ts}` ·
`src/data/seed.ts` (`PERM`, `USERS`) · `src/engine/prediction.ts` (`PredictionModel`) ·
`src/app/components/ui/skeleton.tsx`.
