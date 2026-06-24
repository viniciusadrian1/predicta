# 06 — RBAC / Permissões (PREDICTA · FORZY)

> Tela de governança que define **quem acessa o quê** no Predicta. Cobre **US-13** (governança de acessos/dados/rastreabilidade) e é o habilitador transversal de US-1 a US-12. Voz de arquiteto de produto/sistemas sênior, ancorada no código real do repositório.
>
> Arquivos-âncora: `src/pages/governanca/RBAC.tsx` · `src/auth/rbac.ts` · `src/auth/useAuth.ts` · `src/auth/RequireAuth.tsx` · `src/data/seed.ts` (`ROLES`, `MODS`, `PERM`, `SEED_USERS`) · `src/store/useStore.ts` (`setRbac`).
> Continuidade: alinhado a `docs/design/00-governanca-espinha.md` (Tela 20) — este documento aprofunda aquele gabarito.

---

## 1. Nome da tela

**Permissões RBAC** — Matriz de Controle de Acesso por Papel.

- Rota: `/governanca/rbac`.
- Breadcrumb publicado: `usePageChrome(["Governança","Permissões RBAC"])` (`RBAC.tsx:35`).
- Posição na espinha de governança: é o **Pilar 3 — "Toda ação é gated por RBAC"** materializado em sua própria tela de administração. Enquanto Hierarquia governa a *estrutura*, Dicionário governa o *dado* e D-I-C-I governa o *artefato documental*, esta tela governa o **acesso** — o eixo que decide, em tempo real, o que cada papel renderiza, edita e navega no produto inteiro.

---

## 2. Objetivo da tela

Ser o **painel de administração de controle de acesso** do Predicta: configurar a matriz `papel × módulo` (níveis `none < read < full`), inspecionar os usuários vinculados a cada papel e — após os refinamentos da §9 — auditar toda mudança de permissão e restringir acesso por escopo (planta/linha/cliente).

### Estado ATUAL no produto (honestidade de implementação)

O que **JÁ EXISTE e é funcional** (lido em `RBAC.tsx` + `rbac.ts` + `useStore.ts`):

| Capacidade | Onde vive | Comportamento real |
|---|---|---|
| **Matriz papel × módulo editável** | `RBAC.tsx:28-33,107-119`; ação `setRbac` (`useStore.ts:174`) | Clique numa célula cicla `none → read → full → none` (`NEXT`, `RBAC.tsx:14`). Persiste no store (`predicta-state` em localStorage). |
| **Aplicação reativa imediata** | `useCan`/`permLevel` (`rbac.ts:20-26`) | `useCan` é um seletor Zustand — ao mudar uma célula, **o Sidebar e os route guards re-renderizam na hora**, sem reload. Mudar `Dashboard` de um papel some/aparece o item instantaneamente. |
| **Gate de rota e de módulo** | `Gate` (`RequireAuth.tsx:18-33`) | Renderiza painel "Acesso negado" (`ShieldAlert`) quando `useCan(modulo,nivel)` é falso. |
| **Tabela de usuários** | `RBAC.tsx:42-90` | Lista `users` do store (avatar com `initials`, papel, status via `Badge`, último acesso, chips de módulos). |
| **Auto-governança do RBAC** | `canEdit = useCan("RBAC","full")` (`RBAC.tsx:26`) | Só quem tem `RBAC:full` edita a matriz; demais veem "Somente leitura" (`RBAC.tsx:96`) e botões `disabled`. |
| **Sessão real com expiração** | `login/logout/switchRole/sessionValid` (`useAuth.ts`) | Login valida contra `SEED_USERS` (e-mail + senha demo `predicta`), cria sessão persistida com `expiresAt`. |

O que **AINDA NÃO EXISTE** (lacunas a refinar — detalhadas na §9):

1. **Sem trilha de auditoria.** `setRbac` (`useStore.ts:174`) é um `set({ rbac })` cru — nenhuma mudança de permissão é registrada (quem/quando/de→para). É a ação **mais sensível** do produto e hoje é invisível.
2. **Sem escopo.** O modelo é **global**: `permLevel(rbac, papel, modulo)` (`rbac.ts:10-13`) não conhece planta, linha nem cliente. Um `Ativos:full` vale para **todas** as plantas. Não há `RbacScope`.
3. **`RequireAuth` não montado nas rotas.** Existe (`RequireAuth.tsx:11`) mas `routes.tsx` usa só `Gate` — o app **não força login**, o que enfraquece todo o RBAC (qualquer um chega às telas se digitar a URL).
4. **Botões "Novo usuário"/"Papéis" inertes** (`RBAC.tsx:36`): não há CRUD de usuário nem de papel pela UI; papéis e usuários só nascem do seed.
5. **Mismatch de chaves papel↔matriz.** Convive `ROLES`/`SEED_USERS` com `papel:"Eng. Confiabilidade"` (ok) e o **legado** `USERS`/`PERM`-mismatch `"Eng. de Confiabilidade"`/`"Gerente Industrial"`. Papel sem linha na matriz cai em `"none"` (fail-safe, mas silencioso — sem aviso).
6. **Personas RBAC obrigatórias não 1:1 com o seed.** Faltam papéis explícitos **Administrador Forzy** e **TI/Governança**; "Usuário cliente" não existe (ver reconciliação na §3).

---

## 3. Usuários/perfis que acessam

### 3.1 Reconciliação: personas obrigatórias × `ROLES` reais do seed

`ROLES` (`seed.ts:95`) = `["Gerente Industrial","Eng. Confiabilidade","Técnico Manutenção","Analista de Dados","Operador Campo"]`. As cinco personas RBAC obrigatórias **não** mapeiam 1:1 — abaixo a reconciliação proposta (e o que falta criar):

| Persona obrigatória | Papel real no seed (`ROLES`) | Lacuna | Ação de governança |
|---|---|---|---|
| **Administrador Forzy** | *(não existe)* — hoje "Gerente Industrial" acumula `RBAC:full` | Falta papel dedicado | **Criar `Admin Forzy`** com `full` em todos os módulos incl. RBAC; é o único papel que pode editar a matriz e gerir tenancy. |
| **Técnico de manutenção** | `Técnico Manutenção` | ✓ existe | Manter; foco operacional (Alertas/Assistente `full`, Ativos/Telemetria `read`). |
| **Gestor industrial** | `Gerente Industrial` | ✓ existe (nome difere) | Manter como papel de planta; **rebaixar `RBAC` de `full`→`read`** ao criar `Admin Forzy` (gestor lê a matriz, não a edita). |
| **Usuário cliente** | *(não existe)* | Falta papel + escopo | **Criar `Usuário Cliente`** com `read` em Dashboard/Ativos/Alertas/Mapa, **escopado ao seu cliente/planta** (depende do modelo de escopo da §6.3). |
| **TI/Governança** | parcialmente "Analista de Dados" (`Governança:full`) | Falta papel dedicado | **Criar `TI/Governança`** com foco em Governança/Dicionário/Auditoria `full` e RBAC `read` (separação de função: TI audita, Admin altera). |

> **IMPACTO real:** ampliar `ROLES`, `PERM` e `SEED_USERS` em `src/data/seed.ts`; o store já lê `roles`/`modules` dinamicamente (`useStore.ts:38-39`, `RBAC.tsx:22-23`), então **a matriz cresce sozinha** ao adicionar papéis — a UI não precisa mudar. **Esforço: baixo** (seed) **a alto** (CRUD de papéis pela UI).

### 3.2 Quem acessa ESTA tela (módulo `RBAC`)

| Persona | Papel (reconciliado) | Nível em `RBAC` | O que faz aqui |
|---|---|---|---|
| Administrador Forzy | `Admin Forzy` (a criar) | `full` | Edita a matriz, cria usuários/papéis, define escopos, lê auditoria. |
| Gestor industrial | `Gerente Industrial` | `read` (após refino) / `full` (hoje) | Inspeciona quem tem o quê na sua planta; **não** deveria editar globalmente. |
| TI/Governança | `TI/Governança` (a criar) | `read` | Audita mudanças, valida conformidade — **separação de função** vs. Admin. |
| Eng. Confiabilidade | `Eng. Confiabilidade` | `none` (`PERM`, `seed.ts:99`) | **Não vê o módulo**: Sidebar oculta + `Gate` "Acesso negado". |
| Técnico / Operador / Analista | `Técnico Manutenção` / `Operador Campo` / `Analista de Dados` | `none` | Idem — bloqueados. |

> **Regra de auto-governança:** apenas papel com `RBAC:full` altera a matriz (`canEdit`, `RBAC.tsx:26`). Isso impede um papel de **se autoconceder** acesso — exceto o `Admin Forzy`, que por isso é a persona mais sensível e a primeira a ser auditada (§9).

---

## 4. User stories da Forzy cobertas

| US | Cobertura nesta tela |
|---|---|
| **US-13 (núcleo)** | É a tela-coração da governança de **acessos**. RBAC + (proposto) escopo + auditoria = rastreabilidade `perfil → módulo → ação`. |
| **US-1 (modular)** | A matriz É o mecanismo de modularidade por papel: `none` num módulo o remove do Sidebar (`visible(m)` por `permLevel !== "none"`). Distinguir `none` de "não contratado" (tenancy) é o gancho de upsell. |
| **US-2 (interface amigável)** | A própria matriz com ícones (✓/👁/✕) e click-cycle é a UX de governança "menos abstrata". |
| **US-12 (Assistente)** | Decide **quem fala com o Assistente** (`Assistente:full/read/none`) e, com escopo, **sobre quais ativos** ele pode responder. |
| **US-3..US-11 (indiretas)** | Todo módulo de dado bruto, sensor, baseline, anomalia, parada e manutenção planejada só é acessível conforme o nível desta matriz — RBAC é o gate transversal de todas elas. |

---

## 5. Estrutura da tela

Layout atual em duas seções empilhadas (`RBAC.tsx`), evoluído para cinco blocos na visão-alvo:

### 5.1 Bloco "Usuários vinculados" (JÁ EXISTE — `RBAC.tsx:42-90`)

Tabela com cabeçalho `Usuários (N)` + busca (input presente, **filtro a implementar**).

| Coluna | Fonte real | Render |
|---|---|---|
| Usuário | `u.nome` / `u.email` | Avatar `initials(u.nome)` (gradiente cobalto→navy) + nome + e-mail. |
| Papel | `u.papel` | texto (`C.textSub`). |
| Status | `u.status` | `<Badge s={u.status}/>` (ativo/inativo). |
| Último Acesso | `u.acesso` | fonte mono (`C.slate`). |
| Módulos | `u.mods` | chips (primeiros 3 + `+N`). |
| Ações | — | ícones `Settings`/`Lock` (**inertes hoje**). |

### 5.2 Bloco "Matriz de Permissões por Papel" (JÁ EXISTE — `RBAC.tsx:93-127`)

- Cabeçalho: título + dica contextual ("Clique numa célula para alternar none → read → full" vs. "Somente leitura", conforme `canEdit`).
- Linhas = `roles` (store); colunas = `modules` (store): `Dashboard · Ativos · Telemetria · Alertas · Assistente · Cadastro · OCR · Mapa · Governança · RBAC`.
- Célula = botão com `ICON(lvl)`: `full`→`CheckCircle2` verde, `read`→`Eye` steel, `none`→`XCircle` cinza-50%. Hover `scale-125` só quando `canEdit`.
- Rodapé: legenda dos três níveis.

### 5.3 Bloco "Escopos" (A CRIAR — proposta §6.3)

Sub-tabela `papel → escopo` (planta/linha/cliente). Hoje **inexistente** (acesso global). Render proposto: por papel, chips de plantas autorizadas + toggle "Todas as plantas" (Admin) / "Restrito a cliente X" (Usuário Cliente).

### 5.4 Bloco "Ações críticas" (A CRIAR — §7.2)

Lista das ações que exigem `full` + auditoria obrigatória (ex.: editar limite no Dicionário, ciclar célula RBAC, remover ativo). Mostra o nível mínimo e se há *step-up* (reconfirmação) exigido.

### 5.5 Bloco "Trilha de auditoria de permissões" (A CRIAR — §9 P0)

Tabela `ts · ator · papel · módulo · de → para` das últimas mudanças da matriz, filtrável e exportável (CSV via `downloadCSV` já usado em D-I-C-I/Dicionário).

---

## 6. Dados e entidades mostradas

### 6.1 Entidades reais (lidas do store)

| Entidade | Forma (origem real) | Onde aparece |
|---|---|---|
| `roles: string[]` | `ROLES` (`seed.ts:95`) → `useStore` | linhas da matriz, coluna "Papel" da tabela de usuários. |
| `modules: string[]` | `MODS` (`seed.ts:96`) → `useStore` | colunas da matriz, chips de usuário. |
| `rbac: RbacMatrix` | `PERM` (`seed.ts:97-103`) → `useStore`; mutável por `setRbac` | células da matriz. |
| `users: User[]` | `SEED_USERS` (`seed.ts:274-280`) | tabela de usuários. |
| `session` | `useAuth` (`useAuth.ts:42`) | define `canEdit` via papel ativo. |

### 6.2 `PERM` real (snapshot do seed — `seed.ts:97-103`)

| Papel \ Módulo | Dash | Ativos | Telem | Alertas | Assist | Cadastro | OCR | Mapa | Govern | RBAC |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Gerente Industrial | full | full | full | full | full | full | full | full | full | **full** |
| Eng. Confiabilidade | full | full | full | full | full | full | full | full | read | none |
| Técnico Manutenção | read | read | read | full | full | none | none | read | none | none |
| Analista de Dados | read | read | full | read | read | none | none | none | full | none |
| Operador Campo | none | read | none | read | none | none | none | read | none | none |

> Legenda: `full` = editar/agir · `read` = ver · `none` = sem acesso (oculto no Sidebar + `Gate`).

### 6.3 Modelo de ESCOPO proposto (hoje inexistente — impacto)

**Estado atual:** `permLevel(rbac, papel, modulo)` (`rbac.ts:10`) é **global** — não há dimensão de planta/linha/cliente. Um `Ativos:full` enxerga `Planta Norte`, `Planta Sul` e `Planta Geração` (todas em `SEED_ASSETS`) sem distinção.

**Proposta — escopo herdado da Hierarquia (`HTREE`):**

```ts
// nova entidade no store, paralela a rbac
type ScopeKind = "global" | "planta" | "linha" | "cliente";
interface RbacScope { kind: ScopeKind; ids: string[] } // ids de nós da hierarchy / clienteId
type ScopeMatrix = Record<string /*papel*/, RbacScope>;  // default { kind:"global" }
```

| Papel | Escopo proposto | Efeito concreto |
|---|---|---|
| Admin Forzy / Gerente Industrial | `global` | vê todas as plantas. |
| Técnico Manutenção | `planta:["PLT-N"]` | só ativos da Planta Norte (`HTREE` ids). |
| Usuário Cliente | `cliente:["CLI-…"]` | só ativos do seu cliente (exige `clienteId` no `Asset`). |

**Impacto real (arquivos a tocar):**
- `rbac.ts`: nova função `canScoped(rbac, scope, papel, modulo, nivel, assetId)` que cruza o nível com `pathToNode(hierarchy, assetId)` (helper proposto na espinha §17) — se o caminho do ativo não intersecta `scope.ids`, retorna `none`.
- `useStore.ts`: nova slice `scopes: ScopeMatrix` + ação `setScope`.
- Consumidores de lista de ativos (`Ativos`, `Dashboard`, `Mapa`, `Alertas`) filtram por escopo do papel ativo.
- `seed.ts`: `Asset` ganha `clienteId?`; `SEED_USERS`/escopos default.

> **Esforço: alto** — é a evolução estrutural mais cara, mas a que torna o Predicta **multi-planta/multi-cliente** de verdade (pré-requisito de US-1 modular e de tenancy B2B).

### 6.4 Entidade de AUDITORIA proposta (hoje inexistente)

```ts
interface AuditEvent {
  id: string; ts: number;
  actor: { userId: number|null; nome: string|null }; // de session
  modulo: "RBAC"|"Dicionario"|"DICI"|"Hierarquia"|"Escopo";
  entidade: string;     // ex.: "Técnico Manutenção · Cadastro"
  acao: "permissao_alterada"|"escopo_alterado"|"usuario_criado"|...;
  de: string; para: string; // ex.: "none" → "full"
}
```

Alimentada por um wrapper `logAudit(evt)` chamado dentro de `setRbac` (e demais ações de governança). Render no bloco §5.5.

---

## 7. Ações possíveis

### 7.1 Ações que JÁ EXISTEM

| Ação | Gate | Efeito real |
|---|---|---|
| Ciclar permissão (célula) | `canEdit = useCan("RBAC","full")` | `cycle(role,mod)` → `setRbac` → re-render do Sidebar + guards na hora (`RBAC.tsx:28-33`). |
| Ler matriz/usuários | `useCan("RBAC","read")` (entrada) | render somente-leitura, botões `disabled`. |
| Trocar de papel (demo) | — | `switchRole` (`useAuth.ts:33`) muda `session.papel` → reavalia todo o RBAC. |

### 7.2 Ações CRÍTICAS (exigem `full` + auditoria) — proposta

| Ação crítica | Nível mínimo | Por que é crítica | Auditoria |
|---|---|---|---|
| **Ciclar célula RBAC** | `RBAC:full` (Admin) | concede/retira acesso → muda o que outros veem/fazem | **obrigatória** (ator, papel, módulo, de→para). |
| **Conceder `RBAC:full` a um papel** | `Admin Forzy` | cria novo administrador (escalonamento de privilégio) | **obrigatória + step-up** (reconfirmar). |
| **Editar limite no Dicionário** | `Governança/Dicionário:full` | altera a alarmística do motor (`evaluateAlerts`, `simulation.ts`) | **obrigatória** (afeta segurança operacional). |
| **Alterar escopo de planta/cliente** | `Admin Forzy` | expande/restringe universo de ativos visíveis | **obrigatória**. |
| **Remover ativo / nó da hierarquia** | `Cadastro/Governança:full` | quebra rastreabilidade estrutural | **obrigatória**. |
| **Inativar/criar usuário** | `RBAC:full` | muda quem entra no sistema | **obrigatória**. |

### 7.3 Ações a CRIAR (botões hoje inertes — `RBAC.tsx:36`)

- **Novo usuário**: form (nome, e-mail, papel, status, escopo) → grava em `users` + `logAudit`.
- **Papéis**: CRUD de papel (cria linha na matriz com default `none` em tudo); avisa quando papel fica "morto" (sem nenhum `full`).
- **Exportar matriz** (CSV) — reusar `downloadCSV`.

---

## 8. Relação com o restante do produto

RBAC é o **gate transversal** — toda outra tela depende dele:

| Conexão | Mecanismo real | Efeito |
|---|---|---|
| **Sidebar / navegação** | `permLevel(papel,modulo) !== "none"` (`Sidebar.tsx:56`) | módulo com `none` some do menu por papel — modularidade viva (US-1). |
| **Route guards** | `Gate modulo nivel` (`RequireAuth.tsx:18`; montado em `routes.tsx`) | rota sensível cai em "Acesso negado" sem permissão. |
| **Login / sessão** | `login` valida `SEED_USERS`; `session.papel` alimenta `useCan` | o papel logado define toda a renderização. |
| **Dashboard / Ativos / Telemetria / Mapa** | `useCan(modulo,"read")` para entrar; (proposto) escopo filtra ativos | governa visibilidade do dado preditivo. |
| **Alertas** | `useCan("Alertas","full")` libera ack/resolver | só quem tem `full` muda status de alerta. |
| **Assistente (US-12)** | `useCan("Assistente",…)` | decide quem conversa e (com escopo) sobre quais ativos. |
| **Cadastro / OCR (US-5)** | `useCan("Cadastro"/"OCR","full")` | só perfis autorizados criam ativos a partir da placa OCR. |
| **Governança (Hierarquia/Dicionário/D-I-C-I)** | matriz governa os outros 3 pilares | quem edita estrutura, dado e ciclo documental. |
| **Auditoria (proposta)** | `setRbac` → `logAudit` | fecha o ciclo: toda mudança de acesso vira evento rastreável. |

**Posição na espinha:** esta tela é onde o **Pilar 3 (RBAC)** é administrado; os outros três pilares (Hierarquia, Dicionário, D-I-C-I) são *governados por* ela. Com o **escopo**, ela passa a herdar da **Hierarquia** (Pilar 1) — fechando a integração entre os pilares.

---

## 9. Melhorias sobre o wireframe base

Crítica e refino, sempre apontando arquivo/componente real, do mais ao menos prioritário.

### P0 — Trilha de auditoria de permissões (a maior lacuna)
Hoje `setRbac` (`useStore.ts:174`) é `set({ rbac })` sem registro. **Toda** mudança de célula é invisível — inaceitável para a ação mais sensível do produto.
- **Como:** nova slice `auditLog: AuditEvent[]` + wrapper `logAudit(evt)` chamado dentro de `setRbac` (e `setDici`/`upsertTag`/`removeTag`/`setHierarchy` — todos centralizados em `useStore.ts:140-175`). `cycle` (`RBAC.tsx:28`) passa a computar `de→para` e disparar o log.
- **Visual:** bloco §5.5 na própria tela (últimas 10 mudanças) + tela `/governanca/auditoria` filtrável/exportável. Torna a governança **menos abstrata** — mostra o histórico real de quem mexeu no acesso.
- **Arquivos:** `useStore.ts`, `RBAC.tsx`, novo `src/components/governanca/AuditTrail.tsx`, novo `src/lib/types.ts` (`AuditEvent`). **Esforço: médio.**

### P0 — Montar `RequireAuth` nas rotas
`RequireAuth` (`RequireAuth.tsx:11`) existe mas **não está montado** em `routes.tsx` (só `Gate`). O app não força login → qualquer URL renderiza, esvaziando o RBAC.
- **Como:** envolver o shell autenticado com `<RequireAuth>` em `routes.tsx`. **Arquivo:** `src/routes.tsx`. **Esforço: baixo.**

### P0 — Reconciliar papéis e eliminar mismatch silencioso
Papel sem linha na matriz cai em `"none"` sem aviso (`permLevel`, `rbac.ts:12`); o legado `USERS`/`PERM` mistura `"Eng. de Confiabilidade"`/`"Gerente Industrial"`.
- **Como:** criar `Admin Forzy`, `TI/Governança` e `Usuário Cliente` em `ROLES`/`PERM`/`SEED_USERS`; validar no load que **todo `u.papel` ∈ `roles`** e tem linha na matriz; banner de alerta na tela quando um papel for "órfão" (sem linha) ou "morto" (sem nenhum `full`). **Arquivos:** `seed.ts`, `RBAC.tsx`. **Esforço: médio.**

### P1 — Escopo por planta/linha/cliente
Transformar o acesso global em escopado (modelo da §6.3). É o que habilita multi-planta/multi-cliente real (tenancy B2B) e dá sentido à persona "Usuário Cliente".
- **Como:** slice `scopes` + `canScoped` cruzando `pathToNode(hierarchy, assetId)`; bloco §5.3 editável. **Arquivos:** `rbac.ts`, `useStore.ts`, `seed.ts`, consumidores de lista de ativos. **Esforço: alto.**

### P1 — Ativar "Novo usuário" e "Papéis" (CRUD)
Os `IBtn` (`RBAC.tsx:36`) e ícones `Settings`/`Lock` por linha (`RBAC.tsx:82-83`) são inertes.
- **Como:** modais de criação/edição → mutam `users`/`roles` + `logAudit`; step-up ao conceder `RBAC:full`. **Arquivo:** `RBAC.tsx` + novas ações no store. **Esforço: alto.**

### P1 — Visualizar a matriz como mapa de calor + "diff de papéis"
Hoje a matriz é uma grade de ícones. Torná-la **mais visual**:
- **Heatmap** de cobertura por papel (linha com soma de `full`/`read`/`none`) → revela papel super-privilegiado ou "morto" de relance.
- **"Comparar dois papéis"** (diff de células) — útil ao criar um papel novo derivado de outro.
- **Arquivo:** `RBAC.tsx`. **Esforço: médio.**

### P1 — Catálogo de "Ações críticas" visível (bloco §5.4)
Materializar a tabela da §7.2 na tela: para cada módulo, listar as ações que exigem `full` e quais disparam auditoria/step-up. Liga a governança às **operações reais** (ex.: "editar limite de vibração afeta o motor de alertas").
- **Arquivo:** `RBAC.tsx` + fonte declarativa `src/auth/criticalActions.ts`. **Esforço: médio.**

### P2 — Busca funcional de usuários + filtro de papel na matriz
O input de busca (`RBAC.tsx:45-48`) é decorativo. Implementar filtro por nome/e-mail/papel. **Esforço: baixo.**

### P2 — Selo "auto-governança" e proteção do último Admin
Avisar que apenas `RBAC:full` edita a matriz; **impedir remover o último papel/usuário com `RBAC:full`** (evita travar o sistema fora de qualquer administrador). **Arquivo:** `RBAC.tsx` + guarda em `setRbac`. **Esforço: baixo.**
