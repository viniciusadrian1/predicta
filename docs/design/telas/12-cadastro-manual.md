# Tela 12 — Cadastro Manual de Ativo

> Refinamento de produto (PREDICTA / FORZY). Documento ancorado no código real:
> `src/pages/CadastroManual.tsx`, `src/store/createAsset.ts`, `src/data/seed.ts`
> (`buildHealthyTwin`, `SEED_ASSETS`, `SEED_HIERARCHY`/`HTREE`, `SEED_DICTIONARY`),
> `src/engine/model.ts` (`flaFromKw`), `src/engine/prediction.ts` (`predict`),
> `src/auth/rbac.ts` (`Gate`/`can`), `src/routes.tsx`.

---

## 1. Nome da tela

**Cadastro Manual de Ativo** — "Novo Ativo" (rota `/cadastro`, módulo RBAC `Cadastro`).

Formulário em stepper de 5 etapas (`Identificação → Localização → Dados Técnicos → Sensores → Revisão`) que materializa um novo ativo na frota: cria o registro de identidade (`Asset`), provisiona um **gêmeo digital saudável** (`buildHealthyTwin`), roda a **predição inicial** (`predict`) e abre o **ciclo D-I-C-I** do ativo. É a porta de entrada manual da plataforma; o caminho assistido por placa é a Tela OCR (`/cadastro/ocr`), que compartilha o mesmo motor de criação (`createAsset`).

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** A tela já é funcional, não é um mock. `CadastroManual.tsx` usa `react-hook-form` com um stepper de 5 passos controlado por `useState(step)`; valida obrigatórios via `register(..., { required: true })`; impede TAG duplicada com `validate: (v) => !assetIdExists(v)` (uniqueness case-insensitive em `assetIdExists`, `createAsset.ts`); ao submeter chama `useCreateAsset()` → `createAsset()`, que (1) normaliza a TAG para maiúsculas, (2) deriva os limites de corrente do nameplate via `flaFromKw(potenciaKw)` com alerta = `FLA×1.05` e crítico = `FLA×1.18`, (3) monta o `Asset`, (4) constrói um gêmeo **saudável** com `buildHealthyTwin` (damage 0.02 em todos os modos, ~120 amostras de histórico sintético), (5) roda `predict()` para preencher `rulDias`/`probFalha`/`modoCritico`, (6) faz `addAsset(asset, twin)` no store Zustand e (7) navega para `/ativos/:id/overview` com `toast.success`. Há um painel lateral com "Dica" (padrão do Dicionário) e um atalho **Usar OCR** (`navigate("/cadastro/ocr")`). A rota é gated por `Gate modulo="Cadastro"`.

**O que esta tela deve ENTREGAR (alvo do refino).** Ser o ponto onde um ativo nasce *governado*: identidade única e rastreável, **vínculo explícito à Matriz de Hierarquia** (empresa → planta → área → sistema), dados de nameplate suficientes para o motor físico operar com fidelidade, sensores declarados e mapeados ao Dicionário, e o **gêmeo digital nascendo verde** com predição inicial honesta (modelo simulado). Cobre US-3 (entrada de dado bruto na base histórica), US-13 (governança de acesso e de dados) e US-1 (cadastro modular — manual completo, OCR ou enxuto). O refino abaixo ataca os três gaps reais: hierarquia hoje é **texto livre** (`planta`/`area` strings, sem ligação ao `HTREE`); a etapa **Sensores é puramente decorativa** (não persiste, não toca o store); e o **D-I-C-I não é iniciado** (o ativo entra sem linha em `SEED_DICI`/`DiciRow`).

---

## 3. Perfil principal que usa a tela

| Persona | Acesso (`PERM` em `seed.ts`) | Relação com a tela |
|---|---|---|
| **Eng. de Confiabilidade** | `Cadastro: full`, `OCR: full` | **Persona primária.** Cadastra o ativo, define criticidade, escolhe modos de falha relevantes e valida os limites derivados. |
| **Gestor / Gerente Industrial** | `Cadastro: full`, `OCR: full` | Cadastra ativos novos da unidade; valida vínculo à hierarquia e criticidade que alimenta KPIs do Dashboard. |
| **Admin Forzy / TI-Governança** | `full` (perfil Gerente) | Onboarding inicial de frota, padronização de TAG e auditoria do que foi criado. |
| **Técnico de Manutenção** | `Cadastro: none` | **Sem acesso.** `Gate modulo="Cadastro"` bloqueia a rota — consome o ativo já cadastrado em Ativos/Alertas. |
| **Operador de Campo** | `Cadastro: none` | Sem acesso. |
| **Cliente da Indústria** | (perfil read-only de leitura) | Não cadastra; vê o ativo resultante nas telas operacionais (US-2). |

O **menu lateral** (`Sidebar.tsx`) já oculta o item quando `!can("Cadastro")`; a rota faz o segundo gate. RBAC é a espinha de governança aqui (US-13).

---

## 4. User stories da Forzy atendidas

| US | Como esta tela atende | Âncora no código |
|---|---|---|
| **US-3** — leitura de dado raw para base histórica | A criação semeia ~120 amostras de telemetria sintética no gêmeo (`buildHealthyTwin` → `readingFromState`), iniciando a base histórica do ativo no instante do cadastro. | `seed.ts: buildHealthyTwin`, `HISTORY_LEN=120` |
| **US-13** — governança de acessos e dados | Rota gated por `Gate modulo="Cadastro"`; TAG única e normalizada; limites derivados do Dicionário/nameplate, não digitados à mão. | `routes.tsx`, `createAsset.ts: assetIdExists`, `flaFromKw` |
| **US-1** — solução modular (parcial/completa) | Três modos de criação compartilhando `createAsset`: manual completo (esta tela), OCR de placa (`/cadastro/ocr`) e cadastro enxuto. | `createAsset.ts` (compartilhado), atalho "Usar OCR" |
| **US-4** (parcial) — sensores em V/A/RPM/°C | Etapa "Dados Técnicos" coleta potência e RPM nominal; etapa "Sensores" declara PT100/acelerômetro/transdutor (grandezas °C, mm/s, bar). *Hoje decorativa — alvo de refino §11.* | `CadastroManual.tsx` step 3/4 |
| **US-8/9/10** (semente) — ML baseline/anomalia/parada | A predição inicial (`predict`) já roda no cadastro e popula `rulDias`/`probFalha`/`modoCritico`, exibidos depois na Saúde-IA. | `createAsset.ts: predict(asset, twin, dictionary)` |

---

## 5. Blocos e seções da tela

| # | Bloco | Conteúdo | Estado atual / refino |
|---|---|---|---|
| **A** | **Stepper de progresso** (topo, full width) | 5 etapas com ícone numerado, check verde ao concluir, clicável para saltar. | EXISTE. Refino: marcar etapas obrigatórias vs. opcionais e mostrar erro por etapa. |
| **B** | **Painel do formulário** (`col-span-2`, card) | Renderiza o passo ativo (`step===1..5`). Grid 2 colunas. | EXISTE. |
| **B1** | Etapa 1 — Identificação | TAG, Nome, Tipo, Criticidade (`select`), Fabricante, Modelo, Série, Data de Instalação. | EXISTE. |
| **B2** | Etapa 2 — Localização | Planta e Área (**dois `input` texto livre**). | EXISTE / **refino crítico**: virar seletor encadeado da Matriz de Hierarquia. |
| **B3** | Etapa 3 — Dados Técnicos | Potência (kW), RPM nominal + nota "corrente nominal e limites derivados da potência". | EXISTE. Refino: prévia dos limites calculados. |
| **B4** | Etapa 4 — Sensores | 3 cards de sensor com checkbox/protocolo. | EXISTE mas **não persiste** (alvo §11). |
| **B5** | Etapa 5 — Revisão | Faixa de confirmação verde + lista chave/valor (8 campos via `watch`). | EXISTE. Refino: incluir limites derivados, hierarquia e selo D-I-C-I. |
| **C** | **Coluna lateral** (`space-y-3`) | Card "Dica" (padrão de TAG do Dicionário) + card "Digitalização OCR" com botão. | EXISTE. |
| **D** | **Barra de ações** (rodapé, `border-top`) | Cancelar (→ `/ativos`), Voltar, Continuar → / Cadastrar Ativo (submit). | EXISTE. |

---

## 6. Componentes principais

| Componente | Papel | Origem real |
|---|---|---|
| `useForm<FormData>` (react-hook-form) | Estado, validação, `handleSubmit(onValid, onInvalid)`. | `CadastroManual.tsx` |
| Stepper (`STEPS`, `step`/`setStep`) | Navegação entre 5 etapas; salto direto por clique. | `CadastroManual.tsx` |
| `FIELD_STEP` map | Em erro, leva ao passo do primeiro campo inválido (`onInvalid`). | `CadastroManual.tsx` — **só cobre passos 1 e 2** |
| `lbl(...)` helper | Fábrica de campo label+input com estilo de erro (`errStyle`). | `CadastroManual.tsx` |
| `SH` (Section Header) | Título de cada etapa. | `ui-shared/index.tsx` |
| `useCreateAsset()` → `createAsset()` | Cria `Asset` + gêmeo + predição + `addAsset`. | `createAsset.ts` |
| `assetIdExists(id)` | Validação de unicidade da TAG (case-insensitive). | `createAsset.ts` |
| `flaFromKw(potenciaKw)` | Deriva FLA → limites de corrente (`alerta 1.05×`, `crítico 1.18×`). | `engine/model.ts` |
| `buildHealthyTwin(asset, now)` | Gêmeo saudável + histórico sintético (~120 amostras). | `seed.ts` |
| `predict(asset, twin, dictionary)` | Predição inicial (RUL, prob. de falha, modo crítico). | `engine/prediction.ts` |
| `usePageChrome(["Cadastro","Novo Ativo"])` | Breadcrumb/título no AppShell. | `layout/chrome` |
| `toast` (sonner) | Sucesso ("Ativo cadastrado") e erro de validação. | `CadastroManual.tsx` |
| `Gate modulo="Cadastro"` | Guarda RBAC da rota. | `routes.tsx`, `rbac.ts` |

---

## 7. Dados exibidos

| Campo (form) | Tipo | Obrigatório | Destino no modelo | Observação |
|---|---|---|---|---|
| `id` (TAG) | texto → upper | Sim + único | `Asset.id` | `validate: !assetIdExists` |
| `nome` | texto | Sim | `Asset.nome` | |
| `tipo` | texto | Sim | `Asset.tipo` | fallback `"Equipamento"` |
| `criticidade` | select | Sim (default `Média`) | `Asset.criticidade` | Baixa/Média/Alta/Crítica |
| `fabricante`/`modelo`/`serie` | texto | Não | `Asset.fabricante/modelo/serie` | nameplate |
| `instaladoEm` | date | Não (default hoje) | `Asset.instaladoEm` | ISO |
| `planta` | texto livre | Sim | `Asset.planta` | **deveria ligar ao `HTREE`** |
| `area` | texto livre | Sim | `Asset.area` | **idem** |
| `potenciaKw` | number | Não | `Asset.potenciaKw` | alimenta `flaFromKw` |
| `rpmNominal` | number | Não | `Asset.rpmNominal` | usado pelo motor |
| Sensores (3 cards) | checkbox | — | **nada** | não persiste |
| **Derivados (não exibidos)** | | | | |
| `limites.corrente` | `{alerta,critico}` | auto | `Asset.limites` | de `flaFromKw` |
| gêmeo `health/status/damage` | auto | auto | `AssetTwin` | nasce verde |
| `rulDias`/`probFalha`/`modoCritico` | auto | auto | `AssetTwin` | de `predict` |

**Revisão (etapa 5):** TAG, Nome, Tipo, Criticidade, Planta, Área, Fabricante, Potência (`watch`). Não mostra limites derivados nem RPM/data/série — gap de transparência (§11).

---

## 8. Ações do usuário

| Ação | Gatilho | Efeito | Âncora |
|---|---|---|---|
| Avançar etapa | "Continuar →" / clique no stepper | `setStep(s+1)` | sem validação por etapa |
| Voltar | "Voltar" | `setStep(s-1)` | |
| Saltar etapa | clique no número | `setStep(i+1)` | livre |
| Validar TAG única | blur/submit | `assetIdExists` → "Tag já existe" | `createAsset.ts` |
| **Cadastrar Ativo** | submit (etapa 5) | `createAsset` → `addAsset` → `predict` → `navigate(/ativos/:id/overview)` + toast | `onValid` |
| Erro de validação | submit inválido | volta ao passo do 1º erro + `toast.error` | `onInvalid`/`FIELD_STEP` |
| Cancelar | "Cancelar" | `navigate("/ativos")` (sem confirmação) | risco de perda |
| Ir para OCR | "Usar OCR" | `navigate("/cadastro/ocr")` | US-1 |
| Sensores on/off / remover | checkbox / X | **nenhum** (decorativo) | §11 |

---

## 9. Relação com outras telas

- **OCR (`/cadastro/ocr`)** — caminho irmão; mesmo `createAsset`; a OCR oferece "Formulário completo" (volta a `/cadastro`). Deveriam fazer **handoff de dados** (placa lida → form pré-preenchido), hoje inexistente.
- **Detalhe do Ativo (`/ativos/:id/overview`)** — destino direto pós-cadastro (`navigate`). É onde o gêmeo recém-criado aparece verde.
- **Lista de Ativos (`/ativos`)** — origem (botão "Novo Ativo") e destino do Cancelar.
- **Saúde-IA (`/ativos/:id/saude`)** — consome `rulDias`/`probFalha`/`modoCritico` gerados aqui por `predict`.
- **Governança › Hierarquia (`/governanca/hierarquia`)** — fonte do `HTREE`; o vínculo planta/área **deveria** ser lido daqui.
- **Governança › Dicionário (`/governanca/dicionario`)** — define sensores/limites referenciados na etapa Sensores.
- **Governança › DICI (`/governanca/dici`)** — deve receber a nova linha `DiciRow` (ciclo iniciado em "Desenho").
- **Dashboard / Mapa** — passam a contar o ativo nos KPIs e no layout assim que ele entra no store.

---

## 10. Relação com governança

- **RBAC (espinha):** `Gate modulo="Cadastro"` na rota + ocultação no `Sidebar`. Só Confiabilidade/Gestor/Admin criam (US-13).
- **Matriz de Hierarquia:** o ativo *deveria* nascer pendurado num nó do `HTREE` (empresa → planta → área → sistema). Hoje `planta`/`area` são strings soltas — **maior dívida de governança da tela**. O breadcrumb (`usePageChrome`) é genérico, não reflete a posição do ativo.
- **Dicionário de Rastreabilidade:** todo número rastreável — limites de corrente derivam de `flaFromKw` (FLA), e os sensores declarados na etapa 4 deveriam mapear a `SEED_DICTIONARY` (campo/unidade/faixa/limite/direção/sensor).
- **Ciclo D-I-C-I:** o cadastro é o instante "Desenho". **Não há criação de `DiciRow`** hoje — refino obrigatório para fechar o ciclo (US-13).
- **Honestidade de IA:** a predição inicial vem de modelo **simulado** (físico-informado + Weibull, não treinado em falhas reais). Ao mostrar RUL/probabilidade no cadastro/revisão, exibir a **nota de honestidade** padrão da plataforma.

---

## 11. Melhorias de UX/UI sobre o wireframe base

**P0 — Vínculo à Matriz de Hierarquia (substituir texto livre).**
Em `CadastroManual.tsx` step 2, os campos `planta`/`area` são dois `<input>` livres. Trocar por **selects encadeados** lidos de `SEED_HIERARCHY`/`HTREE` (`store`): Empresa (fixa) → Planta → Área → Sistema, com o ativo pendurado num `parentId`. Persistir a referência (não só a string). Sem isso, o ativo entra órfão da governança. Estender `NewAssetInput`/`Asset` (`createAsset.ts`, `types.ts`) com `sistemaId`/`parentId`. **Esforço: alto.**

**P0 — Iniciar o ciclo D-I-C-I na criação.**
`createAsset()` não cria `DiciRow`. Adicionar, dentro de `createAsset.ts`, a inserção de uma linha DICI com `D:"em_revisao"` (Desenho aberto) e `I/C/In:"pendente"`, e exibir na etapa Revisão um **selo "Ciclo D-I-C-I iniciado em Desenho"**. Fecha US-13 de verdade. **Esforço: médio.**

**P1 — Tornar a etapa Sensores funcional e ligada ao Dicionário.**
Os 3 cards em `step===4` são `defaultChecked` estáticos, o checkbox e o `<X>` não fazem nada. Reconstruir a partir de `SEED_DICTIONARY` filtrado pela classe do ativo (`tipo`/`ativo`), permitindo (des)marcar grandezas monitoradas e persistir a lista no `Asset` (ex.: `Asset.tagsMonitoradas: TagKey[]`). Isso conecta o cadastro aos alertas vivos por limite. **Esforço: alto.**

**P1 — Prévia dos limites derivados + revisão completa e honesta.**
A nota "limites são derivados da potência" (step 3) é abstrata. Renderizar a **prévia calculada** (`flaFromKw(potenciaKw)` → alerta `1.05×` / crítico `1.18×` A) ao digitar a potência, e incluí-la na etapa 5. A revisão hoje cobre 8 campos via `watch` e **omite** RPM, série, data, hierarquia e os limites — completar a lista e adicionar a **nota de honestidade** do modelo simulado junto da predição inicial. **Esforço: baixo.**

**P1 — Validação por etapa + cobertura total do `FIELD_STEP`.**
"Continuar →" avança sem validar (`setStep(s+1)` puro), e `FIELD_STEP` só mapeia campos dos passos 1–2; um erro em campo de outro passo cairia em `?? 1`. Validar os campos da etapa atual antes de avançar (`trigger()` do react-hook-form) e completar o `FIELD_STEP` para todos os campos. Marcar no stepper a etapa com erro (anel vermelho). **Esforço: baixo.**

**P2 — Confirmação ao cancelar / sair com dados.**
"Cancelar" faz `navigate("/ativos")` direto; perde tudo sem aviso. Adicionar diálogo de confirmação quando o form está dirty (`formState.isDirty`). **Esforço: baixo.**

**P2 — Handoff OCR ↔ Manual.**
O card "Usar OCR" só navega. Fechar o ciclo: quando a OCR lê a placa, voltar ao manual com os campos **pré-preenchidos** (estado compartilhado no store ou query/params), assumindo a etapa Revisão. Reforça US-1 (modularidade). **Esforço: médio.**

**P2 — Hierarquia visual da etapa e acessibilidade.**
O grid 2×N é plano; agrupar visualmente "Identidade" vs. "Nameplate" na etapa 1, e dar foco automático ao primeiro campo de cada etapa. Inputs sem `id`/`label for` — associar para leitores de tela. **Esforço: baixo.**
