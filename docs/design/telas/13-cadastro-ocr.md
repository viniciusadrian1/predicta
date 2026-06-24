# Tela 13 — Cadastro de Ativo por Imagem da Placa

## 1. Nome da tela

**Cadastro de Ativo por Imagem da Placa** (rota `/cadastro/ocr`, módulo RBAC `OCR`).
Breadcrumb vivo: `Cadastro › Leitura OCR` (definido em `usePageChrome(["Cadastro", "Leitura OCR"])`, `src/pages/CadastroOCR.tsx`).
Internamente é o componente `CadastroOCR` — *code-split* via `lazy()` em `src/routes.tsx` (puxa `tesseract.js`, WASM + idiomas `por+eng`, ativos grandes; por isso carrega sob `Suspense`).

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE):** a tela já roda **OCR real client-side** — não é mock. O usuário arrasta/seleciona a foto da plaqueta, `runOCR()` (`src/ai/ocr.ts`) executa `Tesseract.recognize(image, "por+eng")` no navegador emitindo progresso (`m.progress` durante `"recognizing text"`), e `parseNameplate()` aplica regex rotulado + dicionário de marcas para extrair **8 campos possíveis** (`fabricante`, `modelo`, `serie`, `potencia`, `rotacao`, `tensao`, `corrente`, `ip`) com **confiança por campo** (média de confiança das *words* sobrepostas, clamp 60–99). Os campos extraídos **auto-preenchem** um formulário de duas colunas; campos vindos de OCR são marcados visualmente (borda verde + badge `Bot OCR`) e rastreados no `Set auto`. Ao clicar "Cadastrar Ativo", `createAsset()` (`src/store/createAsset.ts`) valida unicidade do Tag (`assetIdExists`), constrói o `Asset` + um **gêmeo digital saudável** com predição inicial e navega para `/ativos/:id/overview`.

**Objetivo a refinar:** reduzir o atrito de onboarding de ativos (US-5) transformando uma foto da plaqueta em um cadastro confiável, **mas sob revisão/validação humana explícita** — o OCR é um *acelerador*, não a fonte de verdade. O objetivo da tela é equilibrar velocidade (auto-preenchimento) com governança (cada campo crítico precisa ser confirmado, conectado à Hierarquia, e o ativo entra no ciclo D-I-C-I). Hoje a confiança por campo é exibida em um card lateral, mas **não bloqueia** o cadastro nem força revisão de campos de baixa confiança — esse é o principal gap a endurecer.

## 3. Perfil principal que usa a tela

| Persona | Uso | Nível RBAC (`OCR`) |
|---|---|---|
| **(d) Admin Forzy** | Onboarding em lote durante implantação numa planta cliente; valida e corrige extrações. | `full` |
| **(a) Técnico de Manutenção** | Cadastra ativo em campo fotografando a plaqueta pelo celular/tablet. | `full` (se concedido) |
| **(b) Gestor Industrial** | Eventual; mais frequente no formulário manual (`/cadastro`). | `read`/`full` |
| **(e) TI/Governança** | Audita qualidade de extração e governança de dados, não opera. | `read` |
| **(c) Cliente da Indústria** | Tipicamente sem acesso de escrita ao cadastro. | `none`/`read` |

O acesso é *gated* em `src/routes.tsx` por `<Gate modulo="OCR">`. Persona primária de operação: **Admin Forzy** (implantação) e **Técnico** (campo).

## 4. User stories da Forzy atendidas

- **US-5 (núcleo):** OCR da placa → extração de TAG + dados técnicos (fabricante, modelo, série, potência, rotação, tensão, corrente, IP). É a tela-âncora desta US.
- **US-3 (parcial):** leitura de dado raw para base histórica — a imagem e o texto OCR cru (`result.raw`) são a primeira camada de dado raw do ativo.
- **US-1 (parcial):** modularidade — caminho alternativo ao cadastro completo (botão "Formulário completo" → `/cadastro`).
- **US-2 (parcial):** interface amigável para clientes industriais — reduz digitação manual.
- **US-13 (transversal):** o cadastro é *gated* por RBAC (`OCR`) e o ativo nasce dentro da Hierarquia/D-I-C-I.

## 5. Blocos e seções da tela

Layout atual: `grid grid-cols-2 gap-5` — **coluna esquerda = captura + extração**, **coluna direita = formulário**.

| # | Bloco | Conteúdo atual | Componente/arquivo |
|---|---|---|---|
| B1 | **Dropzone / Imagem da Plaqueta** (esq, card) | `<input type=file>` oculto + área `border-dashed` clicável e drag-drop; preview da imagem (`max-h-56`); overlay de processamento com `Loader2` girando + `Lendo plaqueta… {progress}%`. | `CadastroOCR.tsx` L101–148, `SH title="Imagem da Plaqueta"` |
| B2 | **Barra de progresso do OCR** | barra `h-1.5` steel preenchendo `progress*100%` durante `status==="processing"`. | L131–135 |
| B3 | **Banner de status** | `done`: faixa verde "OCR concluído — N campos · confiança X%"; `error`: faixa vermelha "Falha ao processar…". | L136–147 |
| B4 | **Campos Detectados** (esq, card, condicional a `result`) | lista de campos extraídos: ícone (verde ≥90% / âmbar <90%), nome do campo, valor mono, **confiança %**. | L150–165, `SH title="Campos Detectados"` |
| B5 | **Formulário de Cadastro** (dir, card) | header com selo "Auto-preenchido" / "Aguardando OCR"; grid 2-col de 12 inputs; campos OCR com borda verde + badge `Bot OCR`. | L168–188, `SH title="Formulário de Cadastro"` |
| B6 | **Barra de ações** | "Formulário completo" (→`/cadastro`) + "Cadastrar Ativo" (cobalto). | L189–192 |

**Campos do formulário (B5):** Tag/Identificador `*`, Nome, Tipo, Criticidade (select Baixa/Média/Alta/Crítica), Fabricante, Modelo, Número de Série, Potência (kW), Rotação (rpm), Tensão/Freq., Planta, Área.

## 6. Componentes principais

| Componente | Papel | Fonte |
|---|---|---|
| `runOCR(file, onProgress)` | Tesseract.js `por+eng`; retorna `{ text, words[], confidence }` com progresso. | `src/ai/ocr.ts` L9 |
| `parseNameplate(text, words)` | Parser regex+marcas → `NameplateResult` (`fields`, `overallConfidence`, `fieldCount`). | `src/ai/ocr.ts` L41 |
| `conf(match)` | Confiança por campo = média das *words* sobrepostas (fallback 82, clamp 60–99). | `src/ai/ocr.ts` L47 |
| `BRANDS[]` | Dicionário de 20 fabricantes (WEG, KSB, ABB, SIEMENS, Atlas Copco…). | `src/ai/ocr.ts` L33 |
| `useCreateAsset()` / `createAsset()` | Cria `Asset` + gêmeo saudável + predição inicial; commit no store. | `src/store/createAsset.ts` L28 |
| `assetIdExists(id)` | Checagem de unicidade do Tag. | `src/store/createAsset.ts` L56 |
| `fieldRow(label, key, opts)` | Input governado: badge `Bot OCR` + borda verde se `auto.has(key)`. | `CadastroOCR.tsx` L83 |
| `SH`, `Badge` (ui-shared) | Cabeçalho de seção, badges. | `src/components/ui-shared/index.tsx` |
| `toast` (sonner) | Feedback de validação/erro/sucesso. | `CadastroOCR.tsx` |
| `flaFromKw`, `predict`, `buildHealthyTwin` | Derivam limites de corrente + gêmeo + predição do novo ativo. | `src/engine/*`, `src/data/seed.ts` |

## 7. Dados exibidos

| Dado | Origem | Unidade/forma | Rastreio ao Dicionário |
|---|---|---|---|
| Preview da imagem | `URL.createObjectURL(file)` | imagem | — (artefato raw, US-3) |
| Progresso OCR | `m.progress` (Tesseract) | 0–100% | — |
| `fabricante` | `BRANDS.find()` em `parseNameplate` | texto (TitleCase) | atributo de cadastro |
| `modelo` | regex `MODELO/MODEL/TYPE/TIPO` | texto | atributo de cadastro |
| `serie` | regex `S/N · SERIAL · Nº Série` | texto upper | atributo de cadastro |
| `potencia` → `potenciaKw` | regex `(\d) (KW\|CV\|HP)` | kW (normalizado via `num()`) | base de `flaFromKw` → limite de corrente |
| `rotacao` → `rpmNominal` | regex `(\d) (RPM\|MIN-1\|R/MIN)` | rpm | Dicionário tag `rpm` |
| `tensao` | regex `V` + `HZ` | `380V / 60Hz` | Dicionário tag `tensao` |
| `corrente` | regex `(\d) A` | A | Dicionário tag `corrente` (faixa/limite) |
| `ip` | regex `IP(\d{2})` | `IP55` | atributo técnico (não vai ao form hoje) |
| **Confiança por campo** | `conf()` | % (60–99) | meta-dado de qualidade |
| **Confiança média** | `overallConfidence` | % | meta-dado de qualidade |
| Criticidade | input usuário | enum | governa limites e prioridade de alerta |

**Observação de rastreabilidade:** `potenciaKw` alimenta `flaFromKw()` em `createAsset`, que define `limites.corrente.alerta/critico` — ou seja, **um número OCR de baixa confiança propaga direto para os limites de alerta do ativo**. Isso reforça a necessidade de validação humana antes de salvar (ver §11).

## 8. Ações do usuário

| Ação | Gatilho | Efeito | Validação |
|---|---|---|---|
| Selecionar/arrastar imagem | clique na dropzone / drop | `handleFile()` → preview + OCR | tipo ∈ {jpg,png,webp}, ≤10 MB (toast de erro senão) |
| Acompanhar OCR | automático | barra + overlay de progresso | — |
| Revisar campos detectados | leitura B4 | vê valor + confiança | visual (verde/âmbar) |
| Editar qualquer campo | digitar no input | atualiza `form` | livre (perde marca OCR? não — ver §11) |
| Trocar criticidade | select | atualiza `form.criticidade` | enum |
| Cadastrar Ativo | botão cobalto | `createAsset()` + navega p/ overview | Tag obrigatório + único (`assetIdExists`) |
| Ir ao formulário completo | botão | `navigate("/cadastro")` | — (não migra dados extraídos hoje) |

## 9. Relação com outras telas

- **→ `/cadastro` (CadastroManual):** caminho irmão. `createAsset()` é **compartilhado** pelas duas telas — mesma criação de Asset+gêmeo. Botão "Formulário completo" leva ao manual (hoje **sem transportar** os campos já extraídos).
- **→ `/ativos/:id/overview`:** destino pós-cadastro (`navigate`), onde o ativo recém-criado aparece com gêmeo saudável e predição inicial.
- **→ Telemetria / Saúde-IA / Gêmeo Digital do ativo:** o ativo passa a fluir no motor de simulação e a gerar alertas por limite do Dicionário.
- **→ Governança › Hierarquia / Dicionário / DICI:** o ativo precisa ser ancorado na Matriz de Hierarquia (planta/área) e entra no ciclo D-I-C-I — hoje a tela coleta `planta`/`area` como **texto livre**, não como seleção na hierarquia (gap, §11).
- **Sidebar/RBAC:** entrada visível conforme `can(OCR)`.

## 10. Relação com governança

- **RBAC:** rota *gated* por `<Gate modulo="OCR">` (`src/routes.tsx` L75). A ação de cadastrar deveria exigir `OCR:full` explicitamente no botão (hoje o gate é só de rota).
- **Hierarquia:** o ativo precisa pertencer a empresa→planta→área→sistema. Hoje `planta`/`area` são strings livres; o refinamento liga isso à Matriz de Hierarquia.
- **Dicionário:** `tensao`, `corrente`, `rpm`, `potencia` são tags do Dicionário (campo, unidade, faixa, limite, direção). O número OCR de potência define limites de corrente do ativo (`flaFromKw`), logo precisa rastrear unidade/faixa do Dicionário antes de virar limite.
- **D-I-C-I:** o ativo nasce na fase **Desenho/Instalação**; o cadastro por OCR é o evento de *Instalação*. O `DiciRow` (`src/lib/types.ts` L141) deveria ser inicializado aqui (D=aprovado, I=pendente).
- **Nota de honestidade / qualidade de dado:** a confiança é de **OCR**, não de modelo de falha — é qualidade de leitura. A interface deve deixar claro que campos abaixo de um limiar exigem confirmação humana antes de entrar como dado de governança.

## 11. Melhorias de UX/UI sobre o wireframe base

**1. (P0) Gate de validação por confiança antes de salvar — `CadastroOCR.tsx` `cadastrar()` + `fieldRow`.**
Hoje qualquer extração, mesmo a 60%, auto-preenche e o botão "Cadastrar Ativo" só valida Tag. Como `potenciaKw` propaga para `limites.corrente` em `createAsset`, um OCR ruim corrompe os limites de alerta silenciosamente. **Refinar:** campos com `confidence < 90` recebem estado "**a confirmar**" (borda âmbar, ícone alerta); o botão Cadastrar fica desabilitado — ou exige um toggle "Revisei os campos destacados" — enquanto houver campo âmbar não confirmado. Marcar cada campo como "confirmado pelo humano" muda a borda de âmbar→verde-confirmado e libera o salvar.

**2. (P0) Ancorar Planta/Área na Matriz de Hierarquia — `fieldRow("planta")`/`fieldRow("area")`.**
São inputs de texto livre, o que quebra a governança (ativo órfão da hierarquia). **Refinar:** trocar por *selects* encadeados (Empresa→Planta→Área→Sistema) lidos da hierarquia do store, respeitando o escopo do papel do usuário. Sem hierarquia válida, não cadastra.

**3. (P1) Reorganizar a coluna esquerda — fundir B3 "banner de status" e B4 "campos detectados".**
Hoje o resultado aparece em dois lugares (faixa verde + card "Campos Detectados") e ainda repete no badge do formulário. **Refinar:** consolidar num único painel "Resultado da Leitura" com: confiança média em destaque (KPI), contagem de campos, e a lista por campo com **ação inline "aplicar ao formulário"** por campo (em vez de aplicar tudo de uma vez). Isso dá controle granular sobre o auto-preenchimento.

**4. (P1) Preservar/realçar o vínculo OCR ao editar — `fieldRow` + `Set auto`.**
Hoje, ao editar um campo OCR, a borda verde e o badge `Bot OCR` permanecem mesmo que o humano sobrescreva — perde-se a procedência. **Refinar:** ao editar um campo auto-preenchido, mudar o badge de `Bot OCR` (verde) para `Editado` (steel), preservando rastreabilidade "origem: OCR, ajustado por humano". Útil para auditoria de qualidade de dado (US-13).

**5. (P1) Transportar dados para o formulário completo — botão "Formulário completo".**
`navigate("/cadastro")` descarta tudo que foi extraído. **Refinar:** passar os campos via state da rota (ou store temporário) para que o manual continue de onde o OCR parou. Caso contrário o caminho "completo" pune quem já fotografou a placa.

**6. (P2) Expor IP e texto cru — `parseNameplate` já extrai `ip`, mas o form não tem campo.**
`ip` (grau de proteção) é extraído e exibido em "Campos Detectados", mas não tem linha no formulário, então se perde no cadastro. **Refinar:** adicionar campo IP/Grau de Proteção ao form; e oferecer um *disclosure* "Ver texto OCR cru" (`result.raw`) para conferência manual e como dado raw histórico (US-3).

**7. (P2) Captura por câmera no campo — dropzone.**
O ícone é `Camera` mas a dropzone só aceita arquivo. **Refinar:** em dispositivos móveis/tablets, habilitar `capture="environment"` no input para abrir a câmera traseira direto — o cenário real do técnico em campo (US-5).

**8. (P2) Nota de honestidade sobre confiança — banner de status.**
Adicionar microcopy padronizado: "Confiança = qualidade de leitura OCR, não de predição. Campos abaixo de 90% exigem confirmação." Mantém o padrão único de honestidade da plataforma e alinha expectativa do usuário.

**9. (P2) Pré-tratamento de imagem para elevar acerto — `runOCR`.**
Plaquetas metálicas têm reflexo/baixo contraste; `Tesseract.recognize` recebe a imagem crua. **Refinar:** opção de aumentar contraste / converter para escala de cinza / endireitar antes do OCR (canvas), e permitir reprocessar a mesma imagem sem novo upload.
