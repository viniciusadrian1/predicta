# Tela 07 — Detalhe do ativo · Dados Técnicos

> Aba `tecnico` do Detalhe do Ativo · rota `/ativos/:id/tecnico`
> Arquivo: `src/pages/ativo/Tecnico.tsx` · Shell/contexto: `src/pages/AtivoDetail.tsx` · Origem do registro: `src/store/createAsset.ts` (form manual + OCR)
> Cobre **US-5** (OCR da placa → TAG + dados técnicos) e **US-13** (governança de dados/acessos).

---

## 1. Nome da tela

**Detalhe do ativo — Dados Técnicos** (aba "Dados Técnicos" do `AtivoDetail`).

É a quinta e última aba do detalhe de ativo (`TABS` em `src/pages/AtivoDetail.tsx`: Visão Geral · Telemetria · Saúde & IA · Gêmeo Digital · Dados Técnicos). Diferente das outras quatro abas — que consomem o **gêmeo digital vivo** (`twin`) — esta aba é a **ficha de identidade estática** do ativo: a placa/nameplate, a configuração de sensores e a procedência do cadastro. É a "certidão de nascimento" do artefato dentro da Matriz de Hierarquia.

---

## 2. Objetivo da tela

**Estado atual no produto (o que JÁ EXISTE).** Hoje `Tecnico.tsx` renderiza um grid de 2 colunas com três blocos: (a) cartão **Identificação** lendo campos reais do `Asset` (`id`, `nome`, `tipo`, `serie`, `fabricante`, `modelo`, `criticidade`, `instaladoEm` via `fmtDate`); (b) cartão **Dados Técnicos** misturando dados reais (`potenciaKw` → `pot`, `rpmNominal` → `rpm`, FLA derivada de `asset.limites.corrente.alerta`) com **valores hard-coded** (`"IP55"`, `"380V / 60Hz"`, `"Monitorado"`); (c) cartão full-width **Sensores Instalados** com **quatro sensores fixos no JSX** (PT100, Acelerômetro MEMS, Transdutor 4-20mA, TC Split-core) — não vêm do `Asset` nem do dicionário. O `Asset` (`src/lib/types.ts`) carrega de fato: identidade + nameplate + `limites` (overrides do dicionário) + `instaladoEm`/`criadoEm` + `offline`. O cadastro (`createAsset.ts`) já preenche `limites.corrente` a partir de `flaFromKw(potenciaKw)`, e tanto o form manual (`CadastroManual.tsx`) quanto o OCR (`CadastroOCR.tsx`) chamam o mesmo `createAsset` — mas a **procedência (manual × OCR) não é persistida** no `Asset`.

**Objetivo de produto (refinado).** Ser a **fonte de verdade da identidade física** do ativo e o **ponto de auditoria** onde cada dado técnico responde a três perguntas de governança: (1) **de onde veio?** (cadastro manual, OCR da placa com confiança, ou padrão do sistema); (2) **a que regra do Dicionário se ancora?** (a corrente nominal não é um número solto — é a base do limite de alerta/crítico que o motor usa); (3) **em que fase do ciclo D-I-C-I o artefato está?** (Desenho → Instalação → Comissionamento → Inspeção). A tela deixa de ser um "card de specs decorativo" e vira a **placa digital rastreável** do ativo — coerente com a promessa US-5/US-13.

---

## 3. Perfil principal que usa a tela

| Persona | Uso primário | Nível RBAC esperado (módulo `Ativos`) |
|---|---|---|
| **(a) Técnico de Manutenção** | Confere fabricante/modelo/série antes de pedir peça; lê configuração de sensores e protocolos para diagnóstico de campo | `read` |
| **(e) TI/Governança** | **Persona-alvo desta tela**: audita procedência do dado, ancoragem ao Dicionário e estágio D-I-C-I; valida que a placa foi conferida | `read` em `Ativos` + `read/full` em `Governança` |
| **(d) Admin Forzy** | Corrige nameplate, reprocessa OCR, edita limites por ativo (`asset.limites`) | `full` |
| **(b) Gestor Industrial** | Visão de conferência rápida — criticidade, instalação, status de comissionamento | `read` |
| **(c) Cliente da Indústria** | Transparência: "qual é exatamente o meu equipamento e como ele foi cadastrado" | `read` (escopo da própria hierarquia) |

A tela é majoritariamente **leitura para todos**; ações de escrita (editar placa, reprocessar OCR, editar limites por ativo, avançar D-I-C-I) ficam gated por `useCan("Ativos","full")` e `useCan("Governança","full")`.

---

## 4. User stories da Forzy atendidas

- **US-5 — OCR da placa (TAG + dados técnicos).** Esta tela é o **destino de leitura** do que o OCR capturou em `CadastroOCR.tsx`: fabricante, modelo, série, potência, rotação, tensão/corrente. Refinamento: exibir aqui a **procedência** (OCR vs manual) e, por campo, a **confiança** que o `NameplateResult` já produziu (`f.confidence`, `result.overallConfidence`).
- **US-13 — Governança de acessos e dados.** Cada linha da ficha vira um **dado rastreável**: ancora ao Dicionário (`src/store` `dictionary`, tipo `Tag`), respeita RBAC (`can(...)`) para edição, e expõe o ciclo **D-I-C-I** (`DiciRow` em `src/lib/types.ts`, página `governanca/DICI.tsx`).
- **US-4 (suporte).** A seção de sensores declara as **grandezas instrumentadas** (V, A, RPM, °C, vibração, pressão) — hoje fixas no JSX; o refinamento liga essas grandezas às `TagKey` reais (`temp/vib/press/corrente/rpm/oleo`).
- **US-3 (suporte).** A ficha é o cabeçalho de identidade que dá sentido ao dado raw histórico consumido nas abas Telemetria/Saúde.

---

## 5. Blocos e seções da tela

Estrutura atual (`Tecnico.tsx`) + reorganização proposta. O **header do ativo e as abas** já vêm do `AtivoDetail.tsx` (não se repetem aqui).

| # | Bloco | Estado atual | Refinamento proposto |
|---|---|---|---|
| 1 | **Faixa de procedência** (nova) | Inexistente | Barra fina no topo da aba: origem do cadastro (Manual · OCR · Padrão), `criadoEm` (`fmtDate`), responsável, e — se OCR — confiança média e link "ver imagem da placa". Resolve US-5/US-13. |
| 2 | **Identificação** | Card grid 2col, 8 linhas k/v reais | Mantém. Promover `Tag/ID` e `N° de Série` a destaque (mono, copiável). `instaladoEm` ganha selo D-I-C-I ao lado. |
| 3 | **Placa / Nameplate (Dados Técnicos)** | Card com mistura real + hard-coded | **Separar** dado real (potência, RPM, FLA derivada) de dado declarado/placeholder (IP55, 380V/60Hz). Cada linha técnica ganha micro-tag de origem e, quando aplicável, link "→ Dicionário". |
| 4 | **Ancoragem ao Dicionário** (nova/explícita) | Hoje só a FLA aparece, sem rótulo de rastreio | Tabela: grandeza → unidade → faixa → limite alerta/crítico → direção → sensor, lida de `dictionary` + `asset.limites`. Mostra **override por ativo** vs padrão. |
| 5 | **Sensores Instalados** | Card full-width, **4 sensores hard-coded** | Derivar de `dictionary`/`asset` (grandezas monitoradas reais). Cada chip: grandeza (`TAG_LABEL`), unidade (`TAG_UNIT`), sensor (`Tag.sensor`), protocolo, e status de leitura ao vivo (online/stale do `twin`). |
| 6 | **Ciclo de vida D-I-C-I** (nova nesta aba) | Existe só na página global `governanca/DICI.tsx` | Trazer a **linha D-I-C-I deste ativo** (4 selos: Desenho/Instalação/Comissionamento/Inspeção) inline, com `Badge s={status}`. Editável só com `Governança=full` (mesma lógica `cycle` do `DICI.tsx`). |

---

## 6. Componentes principais

| Componente | Origem real | Papel na tela | Refino |
|---|---|---|---|
| `SH` (Section Header) | `src/components/ui-shared/index.tsx` | Título de cada card | Adicionar slot `right` (já suportado em `CadastroOCR`/`Dicionario`) para badges de origem e botão "Editar" gated |
| `Badge` | `ui-shared` | Selos D-I-C-I (`aprovado/em_revisao/pendente`) e status do sensor | Reúso direto — `Badge` já mapeia esses estados |
| Linha k/v (`flex justify-between`, mono) | inline em `Tecnico.tsx` | Pares campo/valor da placa | Extrair p/ `<SpecRow label value origin? dictLink?>` reutilizável |
| Chip de sensor | inline em `Tecnico.tsx` | Grade de instrumentação | Parametrizar por `TagKey`; cor `C.steel` (dado/realtime) |
| `fmtDate` | `src/lib/format.ts` | Datas (`instaladoEm`, `criadoEm`) | Manter |
| `IBtn` | `ui-shared` | Ações no header da aba (Editar placa, Reprocessar OCR, Exportar ficha) | Novo |
| `useCan` / `usePermLevel` | `src/auth/rbac.ts` | Gating de edição (`Ativos`/`Governança`) | Novo — hoje a aba não tem nenhuma ação gated |
| `useAtivo()` (outlet ctx) | `AtivoDetail.tsx` | Fornece `{ asset, twin }` | Já usado; passar a ler `twin` para status de sensor ao vivo |
| `dictionary` / `dici` (store) | `src/store/useStore.ts` | Ancoragem e ciclo de vida | Novo consumo nesta aba |

---

## 7. Dados exibidos

| Campo exibido | Fonte real | Tipo | Observação de rastreabilidade |
|---|---|---|---|
| Tag / ID | `asset.id` | string mono | Chave na Matriz de Hierarquia |
| Nome | `asset.nome` | string | |
| Tipo | `asset.tipo` | string | Classe que casa com `Tag.ativo` ("Aplicável a") |
| N° de Série | `asset.serie` | string mono | Origem OCR/manual |
| Fabricante / Modelo | `asset.fabricante` / `asset.modelo` | string | Campos clássicos da placa (US-5) |
| Criticidade | `asset.criticidade` | `Criticidade` | Influencia priorização de alerta |
| Data de Instalação | `asset.instaladoEm` → `fmtDate` | data | Marco da fase **I** do D-I-C-I |
| Data de Cadastro | `asset.criadoEm` → `fmtDate` | data | Auditoria (hoje não exibido) |
| Potência Nominal | `asset.potenciaKw` (kW) | número \| `—` | Base da FLA |
| Rotação Nominal | `asset.rpmNominal` (rpm) | número \| `—` | |
| Corrente Nominal (FLA) | `flaFromKw(asset.potenciaKw)` / derivada de `asset.limites.corrente.alerta` | número | **Hoje calculada como `alerta/1.05`** — ver §11 |
| Limite Alerta / Crítico (corrente) | `asset.limites.corrente` | `LimitPair` | Override por ativo vs padrão do `dictionary` |
| Classe de Proteção (IP) | **hard-coded `"IP55"`** | string | Não existe no `Asset` — ver §11 |
| Tensão / Frequência | **hard-coded `"380V / 60Hz"`** | string | OCR captura `tensao`, mas **não é persistida** no `Asset` — ver §11 |
| Grandezas monitoradas | `dictionary` (`Tag.campo/key/un/sensor`) | lista | Hoje 4 chips fixos no JSX |
| Status do sensor (ao vivo) | `twin.state` / `twin.syncedAt` | online/stale | Não exibido hoje |
| Linha D-I-C-I do ativo | `dici` (`DiciRow` por `id`) | 4× `DiciStatus` | Página `DICI.tsx` |
| Procedência (Manual/OCR) + confiança | `NameplateResult` (`CadastroOCR`) | enum + % | **Não persistido** — ver §11 |

---

## 8. Ações do usuário

| Ação | Disponível hoje? | Gating proposto | Efeito |
|---|---|---|---|
| Ler a ficha técnica completa | Sim | `can("Ativos","read")` | Leitura |
| Copiar Tag/Série | Não | livre | UX de campo |
| **Editar placa** (fabricante, modelo, série, potência, RPM, tensão, IP) | Não | `can("Ativos","full")` | Atualiza `Asset` no store |
| **Reprocessar OCR** / ver imagem da placa | Não | `can("OCR","full")` | Reabre fluxo `CadastroOCR` para este ativo |
| **Editar limites por ativo** (`asset.limites`) | Não | `can("Ativos","full")` | Muda alertas do motor (paralelo ao `Dicionario.tsx`) |
| **Avançar status D-I-C-I** | Não (só na pág. global) | `can("Governança","full")` | `cycle()` igual `DICI.tsx` |
| **Exportar ficha** (CSV/PDF) | Não | `read` | `downloadCSV` (padrão `DICI`/`Dicionario`) |
| Navegar p/ Dicionário / Hierarquia / Assistente | Parcial (header global) | `read` | Cross-link |

---

## 9. Relação com outras telas

- **Header + abas irmãs** (`AtivoDetail.tsx`): Visão Geral, Telemetria, Saúde & IA, Gêmeo Digital. Esta aba é a **âncora de identidade** das outras quatro — o `id`/`tipo` aqui definem quais `Tag`s do dicionário se aplicam à Telemetria e quais limites o motor usa.
- **Cadastro Manual** (`CadastroManual.tsx`) e **Leitura OCR** (`CadastroOCR.tsx`): telas de **origem** — ambas chamam `createAsset` (`createAsset.ts`). Esta aba é o **destino auditável** do que elas gravaram. Link bidirecional "reprocessar/editar".
- **Dicionário de Rastreabilidade** (`governanca/Dicionario.tsx`): cada grandeza/limite da §4 da ficha **linka** para a entrada `Tag` correspondente.
- **Matriz D-I-C-I** (`governanca/DICI.tsx`): a linha do ativo aqui é uma **projeção** da matriz global filtrada por `asset.id`.
- **Matriz de Hierarquia** (`governanca/Hierarquia.tsx`): o breadcrumb (empresa → planta → área → ativo) posiciona a ficha.
- **Mapa da Planta** (`MapaPlanta.tsx`): seleção de ativo no mapa pode abrir direto nesta aba para conferência de placa.

---

## 10. Relação com governança

A tela materializa as quatro colunas da "espinha de governança" descritas no produto:

- **Hierarquia.** Breadcrumb `["Ativos","Lista de Ativos", asset.id]` (já em `usePageChrome` no `AtivoDetail.tsx`) posiciona o artefato na árvore; `asset.area`/`asset.planta` aparecem na ficha.
- **Dicionário.** Todo número técnico deve rastrear a uma `Tag` (campo, unidade, faixa, limite, direção, sensor). Hoje só a FLA tangencia isso, e indiretamente — o refino torna a ancoragem explícita (seção §4 dos blocos) e mostra **override por ativo** (`asset.limites`) vs padrão (`dictionary`).
- **RBAC.** Leitura para todos os papéis com acesso a `Ativos`; escrita (placa, limites, D-I-C-I, OCR) gated por `can(...)`. Hoje a aba **não tem nenhum gating** porque é 100% leitura — o refino introduz as ações e o gating correspondente.
- **D-I-C-I.** O ciclo Desenho → Instalação → Comissionamento → Inspeção (`DiciRow`/`DICI.tsx`) passa a ser visível **no contexto do ativo**, não só na matriz global — fechando o laço "ficha técnica ↔ ciclo de vida documental".
- **Honestidade de origem.** Tornar explícita a procedência (Manual/OCR/Padrão) e a confiança do OCR é a aplicação, na camada de cadastro, do mesmo princípio de honestidade que o produto exige da camada de ML.

---

## 11. Melhorias de UX/UI sobre o wireframe base

Crítica concreta ancorada em `src/pages/ativo/Tecnico.tsx`:

1. **[P0] Separar dado real de dado fabricado — risco de credibilidade.** O card "Dados Técnicos" mistura campos reais (`pot`, `rpm`) com **literais hard-coded**: `"IP55"`, `"380V / 60Hz"`, `"Status: Monitorado"` (linha 16 de `Tecnico.tsx`). Para a persona TI/Governança isso é veneno — um dado de placa não auditável apresentado como verdade. Ação: estender a interface `Asset` (`src/lib/types.ts`) com `tensao`, `frequencia`, `classeProtecao` (o OCR já captura `tensao`/`corrente` em `CadastroOCR.tsx` mas **descarta** — `form.tensao`/`form.corrente` nunca chegam ao `createAsset`). Onde o campo não existir, exibir `—` com micro-tag "não informado", nunca um placeholder convincente.

2. **[P0] Persistir e exibir a procedência (US-5/US-13).** Form manual e OCR chamam o mesmo `createAsset` (`createAsset.ts`), perdendo a origem. Adicionar `origem: "manual" | "ocr" | "sistema"` e `ocrConfianca?: number` ao `NewAssetInput`/`Asset`, e renderizar uma **faixa de procedência** no topo da aba. Sem isso a US-5 fica "meio implementada": o OCR existe mas a placa digital não conta que foi lida por OCR.

3. **[P0] Corrigir a FLA exibida — número derivado de forma frágil.** Hoje a "Corrente Nominal (FLA)" é reconstruída como `Math.round(asset.limites.corrente.alerta / 1.05)` (linha 16), uma engenharia reversa do limite. Como `createAsset` já chama `flaFromKw` (`src/engine/model.ts`), o correto é **exibir a FLA direta** de `flaFromKw(asset.potenciaKw)` e mostrar o `alerta/critico` como **limites ancorados ao Dicionário**, não derivar a base do limite. Reduz erro de arredondamento e torna a rastreabilidade legível.

4. **[P1] Sensores instalados não são reais.** O card "Sensores Instalados" (linhas 31–43) é um **array literal de 4 sensores** idêntico para todo ativo — não vem de `asset` nem de `dictionary`. Derivar das `Tag` aplicáveis (`Tag.ativo` casando com `asset.tipo`) e cruzar com `twin.state`/`twin.syncedAt` para um selo **online/stale** por grandeza. Assim o card passa a refletir a instrumentação verdadeira e a saúde de coleta (US-4/US-3).

5. **[P1] Trazer a linha D-I-C-I para o contexto do ativo.** O ciclo de vida só vive em `governanca/DICI.tsx`. Embutir os 4 selos (`Badge`) do `DiciRow` deste `asset.id` nesta aba, com edição gated (`useCan("Governança","full")`, reusando a função `cycle`/`NEXT` de `DICI.tsx`). Fecha a promessa "todo ativo tem ciclo D-I-C-I" no lugar onde o usuário já está olhando a ficha.

6. **[P1] Introduzir ações e gating — a aba é 100% leitura e sem RBAC.** Adicionar no header da aba (slot de ações do `usePageChrome` ou `SH right`) os botões **Editar placa**, **Reprocessar OCR**, **Editar limites**, **Exportar ficha**, cada um por trás de `useCan(...)`. Hoje não há nenhuma chamada a `rbac.ts` em `Tecnico.tsx`, o que destoa do resto do produto (Dicionário, DICI e cadastro já gateiam).

7. **[P2] Hierarquia visual e densidade.** O grid 2×col joga Identificação e Dados Técnicos lado a lado com 8 linhas k/v cada, em fonte 11px uniforme — tudo tem o mesmo peso. Promover **Tag/ID, Série e Criticidade** a um "cabeçalho de identidade" destacado (mono maior, Tag copiável, criticidade como `SevBadge`-like), e rebaixar o resto. Agrupar a placa por **blocos semânticos** (Elétrico · Mecânico · Proteção) em vez de uma lista plana.

8. **[P2] Linhas técnicas com link ao Dicionário.** Cada grandeza com limite (corrente hoje; futuramente temp/vib) deve ter um affordance "→ Dicionário" abrindo a `Tag` correspondente em `Dicionario.tsx`, e um selo "override por ativo" quando `asset.limites[key]` existir (diferindo do padrão). Torna visível o princípio "todo número rastreia ao Dicionário".

9. **[P2] Estado vazio honesto.** Para ativos cadastrados manualmente com placa incompleta, hoje vários campos exibem `—` sem contexto. Substituir por estado vazio com CTA gated ("Completar placa" / "Ler placa por OCR"), reforçando o fluxo de melhoria contínua do cadastro.
