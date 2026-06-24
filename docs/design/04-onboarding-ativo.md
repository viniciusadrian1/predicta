# Onboarding do Ativo — Cadastro Manual (9), OCR da Placa (10), Mapa/Planta Digital (11)

> Produto: **PREDICTA / FORZY** · Escopo: nascimento de um ativo no sistema — da identidade (placa/formulário) ao seu lugar na planta digital, com **gêmeo digital criado e já predizendo** no instante do cadastro.
> Cobre **US-5** (OCR da placa), **US-6** (planta baixa → artefato navegável), e dá entrada para **US-3/US-4/US-7/US-8** (a partir do twin recém-nascido).

---

## Estado atual no produto (o que JÁ EXISTE)

Este onboarding **já está implementado e funcional** — não é wireframe. O que existe hoje, ancorado no código real:

- **Cadastro Manual** (`src/pages/CadastroManual.tsx`): stepper de 5 passos (`STEPS = ["Identificação","Localização","Dados Técnicos","Sensores","Revisão"]`), formulário controlado com `react-hook-form`, validação de Tag único via `assetIdExists` (validate inline), navegação livre entre passos clicando no stepper, e `onInvalid` que pula para o passo do primeiro campo com erro (`FIELD_STEP`). No submit chama `createAsset(...)` e navega para `/ativos/{id}/overview`.
- **OCR da Placa** (`src/pages/CadastroOCR.tsx` + `src/ai/ocr.ts`): OCR **real, client-side**, com **Tesseract.js** em `por+eng` (`runOCR`), dropzone com drag-and-drop, validação de formato (`ACCEPT = jpeg/png/webp`) e tamanho (`MAX_MB = 10`), barra de progresso ligada ao `logger` do Tesseract, parser de placa (`parseNameplate`) com **confiança por campo** derivada da confiança média das palavras reconhecidas, auto-preenchimento com badge `OCR` por campo (`auto: Set<string>`) e card "Campos Detectados" com confiança colorida (verde ≥90%, âmbar <90%).
- **Mapa da Planta** (`src/pages/MapaPlanta.tsx`): SVG de vista superior (`viewBox 0 0 660 350`), 6 áreas (`areas[]`), nós de ativo posicionados (`apos`), **cores por status do gêmeo** (`sc: normal/atencao/critico/offline`) vindas de `useAssetViews()` (estado vivo), bordas de área que herdam o pior status dos ativos contidos, painel-resumo com `statusCounts`, lista lateral de ativos e exportação CSV (`downloadCSV`).
- **Nascimento do gêmeo digital** (`src/store/createAsset.ts` + `src/data/seed.ts::buildHealthyTwin`): `createAsset` monta o `Asset`, deriva limites de corrente da potência (`flaFromKw → limites.corrente.{alerta,critico}`), constrói um **twin saudável** (dano ~0.02 por modo, 120 amostras de histórico sintético) e roda `predict(...)` **na hora** — o ativo já nasce com RUL, curva de probabilidade e modo crítico calculados pelo motor simulado.

O que **falta refinar** se concentra em: (a) honestidade da IA/OCR ainda implícita, (b) governança (Dicionário, Hierarquia, D-I-C-I, RBAC) ainda **não aparece dentro das telas** de onboarding, (c) passo "Sensores" é decorativo (3 sensores hardcoded, não persistidos), (d) Mapa **sem Gate de RBAC** na rota, com áreas/posições hardcoded e sem leitura real de planta baixa (US-6 entregue como artefato navegável, mas não como ingestão de planta).

---

## Preocupações transversais do domínio (valem para as 3 telas)

### Padrão único de honestidade da IA
Toda saída algorítmica do onboarding precisa carregar a **nota de honestidade** já presente no motor (`src/engine/prediction.ts`: *"modelo SIMULADO, físico-informado + Weibull, NÃO treinado em falhas reais"*). No onboarding isso se manifesta em dois pontos:

| Saída algorítmica | Onde nasce | O que expor (valor · confiança · explicação · honestidade) |
|---|---|---|
| **OCR de campo** | `parseNameplate` → `f.confidence` | valor extraído · confiança por campo (já existe) · trecho/regex que casou (explicação — **a refinar**) · "OCR óptico, sempre revise" (honestidade — **a adicionar**) |
| **Predição inicial do twin** | `createAsset` → `predict` | RUL/probFalha/modoCritico · — · "twin recém-criado, sem histórico real ainda" · "modelo simulado" (**a adicionar na tela de sucesso**) |

### Governança como espinha ambiente
O onboarding é onde a governança é **mais barata de instalar** e mais cara de ignorar:
- **Dicionário** (`SEED_DICTIONARY`): o Tag do ativo e cada grandeza monitorada devem rastrear a uma definição (campo, unidade, faixa, limite, sensor, direção). Hoje o passo "Sensores" mostra sensores soltos sem vínculo ao Dicionário.
- **Hierarquia** (`SEED_HIERARCHY` / `HTREE`): `planta` + `area` digitados deveriam **selecionar nós existentes** (empresa→planta→área→sistema→ativo), não texto livre — o breadcrumb (`usePageChrome`) É a matriz.
- **D-I-C-I** (`SEED_DICI`): um ativo recém-criado nasce em estado **D=pendente** — o onboarding deveria emitir a primeira linha D-I-C-I.
- **RBAC** (`src/auth/rbac.ts`, `Gate`): Cadastro e OCR já são gated (`routes.tsx`); **Mapa não é** (lacuna real).

---

## TELA 9 — Cadastro Manual (`src/pages/CadastroManual.tsx`)

### 1. Job & propósito
Dar **identidade e lugar** a um ativo físico (placa + localização + dados técnicos) para que o motor passe a monitorá-lo — em uma frase: *"transformar uma máquina física num ativo digital vivo e rastreável".*

### 2. Personas × RBAC
RBAC real em `src/data/seed.ts::PERM` (módulo **Cadastro**). Rota gated por `<Gate modulo="Cadastro">` (nível default `read` — **ver P0 abaixo**, criação deveria exigir `full`).

| Persona | Nível `Cadastro` | Entra? | Default view |
|---|---|---|---|
| Gerente Industrial | `full` | Sim | Stepper completo, todos os passos editáveis |
| Eng. Confiabilidade | `full` | Sim | Idem — persona primária do cadastro |
| Técnico Manutenção | `none` | **Não** | Painel "Acesso negado" (`Gate`) |
| Analista de Dados | `none` | **Não** | Idem |
| Operador Campo | `none` | **Não** | Idem |

### 3. Arquitetura de informação
- **Primário (col-span-2):** o card do passo atual do stepper — ordem de leitura `Identificação → Localização → Dados Técnicos → Sensores → Revisão`.
- **Secundário (col lateral):** card "Dica" (padrão de Tag do Dicionário) + card "Digitalização OCR" (atalho para `/cadastro/ocr`).
- **Sob-demanda:** revisão (passo 5) consolida via `watch(...)` antes de confirmar.

### 4. Blocos & componentes
| Bloco | Componente real | Tokens / detalhe |
|---|---|---|
| Stepper | inline em `CadastroManual` | passo concluído `green` + `CheckCircle2`; atual `cobalt`/branco; futuro `slate`/`border` |
| Campos | helper `lbl(...)` + `register` | `inputStyle` (`bgDeep`/`border`) vs `errStyle` (borda `red` 0.5) |
| Select criticidade | `<select {...register("criticidade")}>` | `["Baixa","Média","Alta","Crítica"]` |
| Sensores (passo 4) | array **hardcoded** de 3 sensores | PT100 / Acelerômetro MEMS / Transdutor — **decorativo** |
| Revisão | tabela `watch()` | linhas Tag/Nome/Tipo/Criticidade/Planta/Área/Fabricante/Potência |
| Rodapé | Cancelar / Voltar / Continuar→ / Cadastrar Ativo | botão submit `#059669` |

### 5. Estados
- **Loading:** N/A no preenchimento; o submit é síncrono (`createAsset`) — twin nasce instantâneo.
- **Empty:** estado inicial do form (`defaultValues`: criticidade "Média", `instaladoEm = today`).
- **Error:** `onInvalid` → `toast.error` + salta ao passo do campo (`FIELD_STEP`); Tag duplicado → `validate: !assetIdExists(v) || "Tag já existe"` com mensagem inline em `red`.
- **TEMPO REAL:** não há dado vivo aqui; é a única tela do escopo sem realtime (o realtime começa **após** o nascimento do twin).
- **Sem-permissão:** `Gate` renderiza "Acesso negado" (não chega a montar o form).

### 6. User stories cobertas
US-4 (campos V/A/RPM/°C via Dados Técnicos + Sensores), US-3 (entrada da base histórica — o twin já materializa 120 amostras), US-7 (após cadastro o ativo aparece com valores/gráficos), US-13 (Tag único = rastreabilidade). Indireto: US-1 (passo "Sensores" é onde a modularidade de telemetria contratada se manifestaria).

### 7. Governança nativa (hoje vs. refinar)
- **Hoje:** breadcrumb `["Cadastro","Novo Ativo"]` (`usePageChrome`); dica textual sobre padrão de Tag do Dicionário; unicidade de Tag (`assetIdExists`).
- **Refinar:** `planta`/`area` como **texto livre** deveriam virar selects ancorados em `SEED_HIERARCHY`; passo "Sensores" deveria vincular cada grandeza a um Tag do `SEED_DICTIONARY` (mostrando unidade/faixa/limite/direção); ativo nascente deveria gerar linha D-I-C-I com **D=pendente**.

### 8. Confiança da IA
Não há IA no preenchimento, mas a **predição inicial** dispara no submit (`predict` em `createAsset`). A tela de sucesso (toast → overview) deveria já trazer a nota: *"RUL estimado por modelo simulado; ativo sem histórico real — confiança aumentará com a operação".*

### 9. Recomendações priorizadas
- **P0** — `Gate modulo="Cadastro" nivel="full"` (criar não é ler). Esforço **baixo**.
- **P0** — Passo "Localização": trocar texto livre por selects ancorados em `SEED_HIERARCHY` (planta→área), e o passo "Sensores" deixar de ser hardcoded → vincular grandezas ao `SEED_DICTIONARY`. Esforço **médio**.
- **P1** — Persistir sensores selecionados no `Asset`/twin (hoje os checkboxes do passo 4 não vão a lugar nenhum). Esforço **médio**.
- **P1** — Emitir linha D-I-C-I (`D=pendente`) ao criar o ativo. Esforço **médio**.
- **P2** — Auto-derivar/mostrar `limites.corrente` (já calculado por `flaFromKw`) na revisão, com a nota "limites derivados da potência". Esforço **baixo**.

---

## TELA 10 — OCR da Placa (`src/pages/CadastroOCR.tsx` + `src/ai/ocr.ts`)

### 1. Job & propósito
Eliminar a digitação manual de placa: *"fotografar a plaqueta e nascer um ativo com fabricante/modelo/série/potência/rpm/tensão já preenchidos e auditáveis por confiança"* (US-5).

### 2. Personas × RBAC
Módulo **OCR** (`PERM`), rota `<Gate modulo="OCR">` (lazy):

| Persona | Nível `OCR` | Entra? |
|---|---|---|
| Gerente Industrial | `full` | Sim |
| Eng. Confiabilidade | `full` | Sim |
| Técnico / Analista / Operador | `none` | **Não** (Gate) |

Default view de quem entra: dropzone vazia à esquerda + formulário "Aguardando OCR" à direita.

### 3. Arquitetura de informação (grid 2 colunas)
- **Coluna esquerda (entrada):** card "Imagem da Plaqueta" (dropzone/preview/progresso) → card "Campos Detectados" (aparece só com `result`).
- **Coluna direita (saída):** "Formulário de Cadastro" com 12 campos; header com selo de status (`Aguardando OCR` / `Auto-preenchido`).
- **Ordem de leitura:** imagem → progresso → confiança agregada → campos detectados → formulário pré-preenchido → confirmar.

### 4. Blocos & componentes
| Bloco | Real | Detalhe |
|---|---|---|
| Dropzone | `div` com `onDrop`/`onDragOver`, `border 2px dashed` | borda muda: `steel` (drag), `green` (done), `border` (idle) |
| Validação arquivo | `handleFile` | `ACCEPT` (jpg/png/webp) + `MAX_MB=10` → `toast.error` |
| Preview | `<img>` h-56 object-contain | overlay com `Loader2` durante processing |
| Progresso | barra `width: progress*100%` (`steel`) + "Lendo plaqueta… {%}" | ligada ao `logger` do Tesseract |
| Confiança agregada | banner verde `result.fieldCount` · `overallConfidence%` | |
| Campos detectados | `Object.entries(result.fields)` | `CheckCircle2` verde se ≥90, âmbar se <90; valor em mono; `%` colorido |
| Formulário | `fieldRow(...)` | campos auto = borda verde `rgba(52,211,153,.35)` + badge `<Bot/> OCR` |
| Ações | "Formulário completo" (→`/cadastro`) · "Cadastrar Ativo" | `cadastrar()` valida Tag obrigatório + único |

### 5. Estados (o `Status` é máquina de 1ª classe)
`type Status = "idle" | "processing" | "done" | "error"`:
- **idle:** dropzone "Arraste a imagem aqui ou clique".
- **processing (TEMPO REAL):** overlay + spinner + barra com `progress` **ao vivo** vindo do Tesseract; clique na dropzone bloqueado (`status!=="processing"`).
- **done:** banner verde + campos auto-preenchidos com badge OCR.
- **error:** banner vermelho "Falha ao processar — tente outra foto" (`catch` no `handleFile`).
- **Empty (sem campos):** `result.fields` vazio → "Nenhum campo reconhecido — preencha manualmente."
- **Sem-permissão:** `Gate` antes de montar.

### 6. User stories cobertas
US-5 (núcleo: placa→TAG+dados técnicos), US-4 (tensão/corrente/potência/rpm extraídos), US-2 (reduz fricção para clientes industriais), US-13 (cada campo carrega confiança = trilha de auditoria). Após confirmar, US-3/US-7 (twin nasce com histórico e valores).

### 7. Governança nativa
- **Hoje:** confiança por campo (auditabilidade), unicidade de Tag (`assetIdExists`), breadcrumb `["Cadastro","Leitura OCR"]`.
- **Refinar:** o OCR **não extrai o Tag** (a placa raramente tem o Tag interno da planta) — o Tag continua manual e deveria ser validado contra o padrão do Dicionário; campos extraídos deveriam mapear explicitamente para grandezas do `SEED_DICTIONARY`; persistir a imagem da placa como **artefato D-I-C-I (Instalação)** com a confiança como metadado.

### 8. Confiança da IA (ponto mais sensível do escopo)
- **Já existe:** confiança por campo (`f.confidence`, 60–99, derivada da confiança média das palavras Tesseract, fallback 82) e confiança média (`overallConfidence`), com codificação de cor verde/âmbar.
- **Explicação — a refinar:** mostrar **de onde** veio cada valor (a marca casou em `BRANDS`, a potência casou em `/(\d+)\s*(KW|CV|HP)/`, etc.) — hoje o parser sabe o `match` mas não o expõe na UI.
- **Nota de honestidade — a adicionar:** *"OCR óptico assistido — sempre confira os campos antes de cadastrar; campos < 90% destacados para revisão."* Hoje a cor âmbar comunica isso implicitamente; falta o texto.

### 9. Recomendações priorizadas
- **P0** — Banner de honestidade fixo no card de resultado: *"OCR óptico — revise os campos antes de confirmar"*. Esforço **baixo**.
- **P0** — Bloquear "Cadastrar Ativo" enquanto houver campo auto < limiar (ex.: <70%) sem confirmação explícita, ou exigir toque/edição nesses campos. Esforço **baixo**.
- **P1** — Expor a **explicação** por campo (trecho/regra que casou) num tooltip, reaproveitando o `match` já calculado em `parseNameplate`. Esforço **médio**.
- **P1** — Persistir a imagem da placa + confiança como artefato D-I-C-I de Instalação ao cadastrar. Esforço **médio**.
- **P2** — Botão "Reprocessar com recorte/rotação" e dica de enquadramento para melhorar confiança. Esforço **médio**.

---

## TELA 11 — Mapa / Planta Digital (`src/pages/MapaPlanta.tsx`)

### 1. Job & propósito
Dar **consciência situacional espacial**: *"onde, na planta, estão meus ativos críticos agora?"* — a planta baixa vira um artefato navegável colorido pelo status vivo do gêmeo (US-6).

### 2. Personas × RBAC
Módulo **Mapa** (`PERM`) — **rota NÃO gated hoje** (`routes.tsx`: `{ path: "mapa", element: <MapaPlanta /> }` sem `Gate`). Lacuna real.

| Persona | Nível `Mapa` (matriz) | Deveria entrar? |
|---|---|---|
| Gerente Industrial | `full` | Sim |
| Eng. Confiabilidade | `full` | Sim |
| Técnico Manutenção | `read` | Sim (leitura) |
| Operador Campo | `read` | Sim (leitura) — **default view ideal** (visão de campo) |
| Analista de Dados | `none` | **Não** — mas hoje entraria (sem Gate) |

### 3. Arquitetura de informação (grid 4 colunas)
- **Primário (col-span-3):** SVG da planta — leitura por cor antes de leitura por texto.
- **Secundário (col lateral):** card "Resumo" (`statusCounts`: Total/Normais/Atenção/Críticos/Offline) + card "Ativos" (lista clicável).
- **Sob-demanda:** clicar na área seleciona (`sel`); clicar no nó navega para `/ativos/{id}/overview`.

### 4. Blocos & componentes
| Bloco | Real | Tokens |
|---|---|---|
| Legenda de status | header `right` em `SH` | `sc = {normal:green, atencao:yellow, critico:red, offline:slate}` |
| Grid/fundo | `<pattern id="fp">` + `radialGradient id="bg">` | linhas `#82C8E5` opacity .08; halo `cobalt` .05 |
| Áreas | `areas.map` → `<rect rx=6>` | borda herda **pior status** dos ativos (`hasCrit`→red .5; `hasAtt`→yellow .35; senão steel .15); selecionada → `cobalt20`/`steel` |
| Nós de ativo | `apos` → `<circle>` duplo + `<text>` Tag | preenchimento/borda = `sc[status]`; label em JetBrains Mono |
| Resumo | `statusCounts(views)` | valores em mono, cor por status |
| Lista | `views.map` → botão | bolinha `sc[status]` + nome + Tag |
| Bússola | `<text>N ↑</text>` | orientação |
| Export | `IBtn` "Exportar" → `downloadCSV` | Tag/Nome/Area/Status/Saude(%) |

### 5. Estados
- **TEMPO REAL (1ª classe):** `views = useAssetViews()` → `statusById` e cores recalculam a cada tick do motor; uma máquina que entra em `critico` **acende vermelho** no mapa sem reload. Este é o estado dominante da tela.
- **Loading:** N/A (store já hidratado); um ativo recém-criado entra na lista assim que o store atualiza.
- **Empty:** se `views` vazio → SVG sem nós + Resumo zerado (degradação graciosa, sem crash).
- **Error:** N/A (sem fetch remoto).
- **Sem-permissão:** **ausente hoje** — precisa de `Gate modulo="Mapa"`.

### 6. User stories cobertas
US-6 (planta baixa → artefato navegável; **entregue como artefato, não como ingestão** — ver P0), US-7 (cor = saúde/status), US-2 (leitura intuitiva por cor), US-1 (mapa só faz sentido com módulo Mapa contratado). Indireto US-13 (rastreabilidade espacial).

### 7. Governança nativa
- **Hoje:** export CSV (rastreabilidade), cores derivadas do status governado pelo motor.
- **Refinar:** áreas (`areas[]`) e posições (`apos`) são **hardcoded** e desacopladas de `SEED_HIERARCHY` — deveriam ler a árvore (planta→área→sistema→ativo); o mapa deveria respeitar a **planta selecionada** no breadcrumb (hoje fixa "Planta Norte — Vista Superior"); ativos sem posição (`apos`) — incluindo os recém-cadastrados — **não aparecem** no SVG (só na lista lateral).

### 8. Confiança da IA
A cor do nó é **status determinístico** (regra de saúde do motor `statusFromHealth`), não predição probabilística — portanto **não precisa** de selo de confiança, mas **deve deixar claro** que é "estado atual", não "previsão". Um nó poderia, opcionalmente, pulsar quando há predição de parada próxima (RUL baixo), aí sim com a nota de modelo simulado.

### 9. Recomendações priorizadas
- **P0** — Envolver a rota `/mapa` em `<Gate modulo="Mapa">` (paridade com Cadastro/OCR; hoje qualquer papel acessa). Esforço **baixo**.
- **P0** — Posicionar **automaticamente** ativos sem coordenada (incl. recém-cadastrados) — placeholder por área a partir de `SEED_HIERARCHY`/`asset.area`, para que US-6 não "perca" ativos novos. Esforço **médio**.
- **P1** — Ler áreas/sistemas de `SEED_HIERARCHY` e respeitar a planta do breadcrumb (multi-planta), em vez de `areas[]` hardcoded. Esforço **alto**.
- **P2** — Tooltip no nó com Tag · saúde% · modo crítico · RUL (reaproveitando `views`), e pulso para RUL baixo com nota "previsão de modelo simulado". Esforço **médio**.

---

## O gêmeo digital ao criar o ativo (transversal — `createAsset` + `buildHealthyTwin`)

O onboarding **não termina no formulário**: ele instancia o gêmeo. Sequência real:

1. `createAsset(input)` lê o `simClock` (`now`), deriva `fla = flaFromKw(potenciaKw)` e grava `limites.corrente = { alerta: fla×1.05, critico: fla×1.18 }` — **limites de alerta nascem da potência**, conforme a dica do passo "Dados Técnicos".
2. `buildHealthyTwin(asset, now)`: dano **~0.02** em cada um dos 5 modos (`rolamento/desalinhamento/lubrificacao/isolamento/cavitacao`), **120 amostras** de histórico sintético (`HISTORY_LEN`, passo de 5 min ≈ 10 h) via `readingFromState`, `cargaPct=0.6`, `health = healthFromDamage(damage)` (≈ **98**, status `normal`).
3. `predict(asset, twin, dictionary)` roda **na hora** → preenche `rulDias`, `probFalha` (curva Weibull, horizontes 7/14/21/30/60) e `modoCritico`. RUL nasce perto do `RUL_CAP` (10 anos) por ser saudável.
4. `st.addAsset(asset, twin)` commita; navega para `/ativos/{id}/overview` — o ativo já é **vivo** (entra no mapa, na lista, no dashboard e no próximo tick da simulação).

**Implicação de design:** a tela de sucesso/overview do recém-criado deve comunicar o estado de nascimento com honestidade — twin saudável **por construção** (não por medição real), histórico **sintético**, e RUL de **modelo simulado**. Sem isso, um RUL de "10 anos" recém-nascido parece um endosso falso de confiabilidade.

| Campo do twin | Valor inicial | Origem |
|---|---|---|
| `damage[*]` | 0.02 (cada modo) | `buildHealthyTwin` |
| `health` | ≈ 98 | `healthFromDamage` |
| `status` | `normal` (ou `offline` se `asset.offline`) | `statusFromHealth` |
| `history` | 120 amostras sintéticas | `readingFromState` |
| `limites.corrente` | `{alerta: fla×1.05, critico: fla×1.18}` | `createAsset` / `flaFromKw` |
| `rulDias` / `probFalha` / `modoCritico` | preenchidos no ato | `predict` (modelo **simulado**) |

> **Nota de honestidade obrigatória nesta etapa:** o `predict` usa `simulatedModel` ("Predicta Digital Twin Engine v1 — Degradação físico-informada + Weibull"), explicitamente **não treinado em falhas reais** (`src/engine/prediction.ts`). A interface `PredictionModel` já permite plugar um modelo real (ONNX/endpoint) sem tocar a UI — a tela de onboarding deve dizer isso, não escondê-lo.
