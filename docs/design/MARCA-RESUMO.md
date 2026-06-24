# Predicta · Resumo de Marca (brief para geração do Guia de Marca)

> **Como usar este documento:** este é um *brand brief* condensado. Entregue-o ao Claude (ou ao Figma AI)
> com a instrução do **Bloco 11 — Prompt de expansão** ao final, e ele produzirá o Guia de Marca completo
> (logo, sistema de cores, tipografia, voz, aplicações, do's & don'ts, mockups). Tudo aqui é fiel à
> identidade que **já existe no produto** (`src/lib/theme.ts`), para que o guia *documente* a marca real
> em vez de inventar uma nova.

---

## 1. Identidade essencial

| Campo | Valor |
|---|---|
| **Produto** | **Predicta** |
| **Endossante / empresa** | **by Forzy** (assinatura "Predicta by Forzy") |
| **Categoria** | Plataforma IIoT de **manutenção preditiva industrial** (B2B / SaaS enterprise) |
| **Ideia central** | *Antecipar a falha antes que ela pare a planta.* |
| **Frase-essência** | Predicta transforma sinais brutos de máquinas em **decisões de manutenção confiáveis** — cada ativo ganha um **Gêmeo Digital** que prevê quando, onde e por quê a falha vai acontecer. |
| **Recurso-herói** | O **Gêmeo Digital** do ativo (estado físico vivo + simulador "e se…"). É o símbolo da marca: o invisível tornado visível. |

---

## 2. Propósito e problema que resolve

- **Problema:** na indústria, a manutenção é reativa (conserta depois que quebrou) ou cega por calendário
  (troca peça boa, ou tarde demais). Paradas não planejadas custam caro e os dados dos sensores existem,
  mas ficam crus, dispersos e ilegíveis para quem decide.
- **Propósito da marca:** dar à operação **previsibilidade e confiança** — ler o dado bruto, traduzir em
  saúde do ativo, prever a falha com horizonte e probabilidade, e recomendar a ação certa, tudo rastreável
  e governado.
- **Promessa:** *você vê a falha chegando — e decide com tempo.*

---

## 3. Posicionamento

> Para **equipes industriais** (manutenção e gestão) que perdem dinheiro com paradas não planejadas,
> o **Predicta** é a plataforma de manutenção preditiva que **mostra a saúde real de cada ativo e prevê
> a falha com antecedência acionável** — diferente de dashboards de telemetria que só mostram números
> ou de planilhas de manutenção por calendário, porque o Predicta cria um **Gêmeo Digital** de cada
> máquina e é **honesto sobre a confiança de cada previsão**.

**Proposta de valor (3 pilares):**
1. **Ver** — telemetria viva + saúde do ativo em linguagem de quem opera.
2. **Prever** — RUL (vida útil restante), probabilidade de falha por horizonte, anomalia e modo crítico.
3. **Decidir** — recomendações acionáveis, simulação de cenários "e se…", e ordens de serviço — tudo
   rastreável e controlado por perfil.

---

## 4. Público-alvo / personas

| Persona | O que valoriza na marca |
|---|---|
| **Técnico de manutenção** | Clareza, ação imediata, "o que faço agora e por quê". |
| **Gestor industrial** | Visão de frota, risco, priorização, ROI de evitar parada. |
| **Cliente da indústria** | Transparência e confiança no serviço da Forzy. |
| **Admin Forzy** | Controle, configuração, governança do parque de clientes. |
| **TI / Governança** | Rastreabilidade do dado, segurança, acesso por perfil, conformidade. |

---

## 5. Personalidade da marca

- **Arquétipo:** **O Sábio** (clareza, previsão, verdade) com um traço de **Guardião/Engenheiro**
  (protege a operação, confiável, preciso).
- **Atributos (5):** **Preciso · Previsível · Transparente · Industrial · Confiável.**
- **A marca é:** técnica sem ser fria, confiante sem ser arrogante, honesta sobre incerteza.
- **A marca não é:** hype de IA, "caixa-preta mágica", consumer/lúdica, alarmista.

---

## 6. Tom de voz e princípios de linguagem

1. **Direto e acionável** — fala em decisão, não em jargão. "RUL de 9 dias. Programe a troca do rolamento."
2. **Honestidade intelectual** — sempre expõe **confiança** e **origem** da previsão; nunca finge certeza.
   *(A predição atual vem de um modelo de degradação **simulado** físico-informado — a marca assume isso.)*
3. **Quantitativo** — números com unidade, faixa e limite; dado é protagonista.
4. **Calmo sob risco** — em alerta crítico, a linguagem orienta, não apavora.
5. **Português técnico de chão de fábrica** — termos da manutenção (RUL, baseline, modo de falha, OS),
   sem anglicismos desnecessários.

**Exemplos de microcopy:**
- Vazio: *"Nenhum alerta aberto. A frota está dentro dos limites do dicionário."*
- Confiança: *"Previsão de falha em 21 dias — confiança média. Baseado em vibração e temperatura."*
- Ação: *"Manutenção do rolamento agora → +62 dias de RUL."*

---

## 7. Fundamentos visuais (já vivos no produto)

**Base estética:** *dark mode industrial B2B premium* — sala de controle, instrumentação, telemetria.
Superfícies profundas, dado em destaque luminoso, zero ruído decorativo.

### Cores — paleta `C` (`src/lib/theme.ts`)
| Papel | Token | Hex |
|---|---|---|
| Fundo base | bg | `#07101E` |
| Card / superfície | bgCard | `#0C1829` |
| Fundo profundo | bgDeep | `#050C16` |
| **Ação primária** | cobalt | `#0047AB` |
| Profundidade / marca | navy | `#000080` |
| **Dado / tempo real** | steel | `#82C8E5` |
| Texto secundário | slate | `#6D8196` |
| Status — saudável | green | `#34D399` |
| Status — atenção | yellow | `#FBBF24` |
| Status — crítico | red | `#F87171` |
| Status — alerta/quente | orange | `#FB923C` |

> **Regra de cor:** cobalto = ação; steel = dado vivo; verde/âmbar/vermelho = **semântica de saúde**
> (nunca decoração). O dark mode não é tema — é a identidade.

### Tipografia
| Uso | Fonte |
|---|---|
| Títulos, KPIs, números | **Rajdhani** (técnica, condensada, "instrumento") |
| Dados, tags, IDs, código, telemetria | **JetBrains Mono** |
| Corpo, descrições, UI | **Inter** |

### Outros elementos
- **Iconografia:** lucide-react — traço fino, geométrico, consistente.
- **Tratamento de dado:** gráficos de linha (recharts) com baseline e linhas de limite; badges de
  severidade; barras de saúde; medidores de probabilidade.
- **Motivo/símbolo:** o **gêmeo** (físico ↔ digital espelhados) e a **curva de degradação** projetada.
- **Movimento:** sóbrio, funcional — pulso de "ao vivo", transições curtas; nada festivo.

---

## 8. Diferenciais de marca (provas)

- **Gêmeo Digital com simulador "e se…"** — não só monitora: deixa testar cenários sem tocar no ativo real.
- **Honestidade do modelo** — exibe explicitamente que a previsão é de um modelo simulado e plugável
  (interface `PredictionModel`); confiança sempre visível.
- **Governança como espinha** — hierarquia, dicionário de rastreabilidade, D-I-C-I e RBAC permeiam o
  produto; todo número rastreia à sua origem e toda ação é controlada por perfil.

---

## 9. Do's & Don'ts

**Do**
- Manter o dark mode profundo e o dado luminoso.
- Usar cor só com significado (ação vs. saúde).
- Mostrar unidade, faixa e confiança junto de cada número.
- Misturar Rajdhani (número) + Inter (texto) + Mono (tag).

**Don't**
- Tema claro como identidade principal; gradientes decorativos; ilustrações lúdicas.
- "IA mágica" sem confiança/explicação.
- Vermelho/verde fora da semântica de saúde.
- Densidade sem hierarquia (tudo gritando ao mesmo tempo).

---

## 10. Assinatura e naming

- **Lockup:** "**Predicta**" como marca-produto + endosso "**by Forzy**" em peso menor.
- **Tagline (direções a explorar no guia):**
  - *"Veja a falha antes dela parar você."*
  - *"Manutenção preditiva com confiança rastreável."*
  - *"O gêmeo digital da sua planta."*
- **Símbolo (direção):** monograma/ícone derivado do conceito de **gêmeo** (espelho) ou da **curva de
  predição** ascendente; geométrico, monolinha, legível em monocromático sobre fundo escuro.

---

## 11. Prompt de expansão (entregue isto ao Claude para gerar o Guia de Marca completo)

> *"Use o resumo de marca acima do Predicta (by Forzy) como fonte de verdade e gere um **Guia de Marca
> completo e profissional**, em português, com as seções: (1) Essência e propósito; (2) Posicionamento e
> proposta de valor; (3) Personalidade e arquétipo; (4) Tom de voz com 6+ exemplos de microcopy
> certo/errado; (5) Sistema de logo (lockup Predicta + 'by Forzy', versões mono, espaçamento mínimo,
> usos proibidos); (6) Sistema de cor completo (papéis, contraste/acessibilidade AA em dark mode,
> combinações permitidas, semântica de status); (7) Tipografia (Rajdhani/JetBrains Mono/Inter — escala,
> pesos, hierarquia, uso de números monoespaçados); (8) Iconografia e ilustração de dado (lucide, gráficos,
> badges); (9) Movimento e estados (loading/empty/error/ao vivo); (10) Aplicações (telas do produto,
> apresentação, social, documento); (11) Do's & Don'ts visuais com exemplos. Mantenha o dark mode
> industrial B2B premium como identidade central — não proponha uma marca nova, **documente e sistematize
> a existente**. Use as cores e fontes exatas listadas. Inclua, onde fizer sentido, mockups/descrições
> visuais que eu possa reproduzir no Figma."*
