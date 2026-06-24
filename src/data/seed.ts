// ── Seed / demo data ──────────────────────────────────────────────────────────
// Migrated verbatim from the original App.tsx mock constants so the app opens
// identical to the wireframe. Phase 1 moves this behind the Zustand store with a
// "Reset demo data" action; the values here remain the canonical seed.

import { C } from "@/lib/theme";
import type {
  LegacyAsset, LegacyAlert, HNode,
  Asset, Alert, AssetTwin, Tag, TagKey, User, DiciRow, FailureMode, TelemetrySample, WorkOrder,
} from "@/lib/types";
import { zeroDamage, readingFromState, healthFromDamage, statusFromHealth, worstMode, flaFromKw } from "@/engine/model";
import { predict } from "@/engine/prediction";

export const ASSETS: LegacyAsset[] = [
  { id:"BCP-01", nome:"Bomba Centrífuga #1",  tipo:"Bomba",        area:"Bombeamento",  planta:"Planta Norte",    saude:78, status:"atencao", leitura:"2 min",    crit:"Alta",    fab:"KSB",       modelo:"Megablock 100-315",     serie:"KSB2024001", pot:"75 kW",  rpm:"1.450" },
  { id:"CA-03",  nome:"Compressor de Ar",      tipo:"Compressor",   area:"Utilidades",   planta:"Planta Norte",    saude:92, status:"normal",  leitura:"1 min",    crit:"Média",   fab:"Atlas Copco",modelo:"GA 55",                 serie:"AC20220045", pot:"55 kW",  rpm:"2.950" },
  { id:"ME-07",  nome:"Motor Elétrico #7",     tipo:"Motor",        area:"Produção A",   planta:"Planta Norte",    saude:41, status:"critico", leitura:"30 seg",   crit:"Alta",    fab:"WEG",       modelo:"W22 IE3 75cv",          serie:"WEG202300178",pot:"56 kW",  rpm:"1.800" },
  { id:"RV-12",  nome:"Redutor de Velocidade", tipo:"Transmissão",  area:"Linha 2",      planta:"Planta Sul",      saude:85, status:"normal",  leitura:"5 min",    crit:"Média",   fab:"SEW",       modelo:"FA67 DRE100",           serie:"SEW20190882", pot:"7.5 kW", rpm:"980"   },
  { id:"VT-05",  nome:"Ventilador Industrial", tipo:"Ventilador",   area:"HVAC",         planta:"Planta Norte",    saude:67, status:"atencao", leitura:"3 min",    crit:"Baixa",   fab:"Multivac",  modelo:"HV-250",                serie:"MV2021003",  pot:"18.5 kW",rpm:"1.450" },
  { id:"TG-01",  nome:"Turbina a Gás #1",      tipo:"Turbina",      area:"Geração",      planta:"Planta Geração",  saude:91, status:"normal",  leitura:"1 min",    crit:"Crítica", fab:"GE Power",  modelo:"LM2500",                serie:"GE2018004",  pot:"25 MW",  rpm:"3.600" },
  { id:"VC-08",  nome:"Válvula de Controle",   tipo:"Válvula",      area:"Processo",     planta:"Planta Sul",      saude:88, status:"normal",  leitura:"4 min",    crit:"Média",   fab:"Fisher",    modelo:"Fieldvue DVC6200",      serie:"FSH20230091",pot:"—",      rpm:"—"     },
  { id:"BCP-02", nome:"Bomba Centrífuga #2",   tipo:"Bomba",        area:"Bombeamento",  planta:"Planta Norte",    saude:28, status:"offline", leitura:"Offline",  crit:"Alta",    fab:"KSB",       modelo:"Etanorm 100-200",       serie:"KSB2023009", pot:"45 kW",  rpm:"1.450" },
  { id:"GR-04",  nome:"Guindaste Rolante",     tipo:"Içamento",     area:"Armazenagem",  planta:"Planta Norte",    saude:73, status:"atencao", leitura:"10 min",   crit:"Média",   fab:"Demag",     modelo:"KBK II",                serie:"DEM2020044", pot:"15 kW",  rpm:"—"     },
  { id:"TR-09",  nome:"Transformador #9",      tipo:"Elétrico",     area:"Subestação",   planta:"Planta Norte",    saude:96, status:"normal",  leitura:"1 min",    crit:"Crítica", fab:"ABB",       modelo:"Trafo 1000 kVA",        serie:"ABB20190012",pot:"1 MVA",  rpm:"—"     },
];

export const ALERTS: LegacyAlert[] = [
  { id:"ALT-2025-0847", ativo:"ME-07", nAtivo:"Motor Elétrico #7",      titulo:"Vibração Crítica Detectada",        tipo:"Mecânico",       sev:"critico", data:"23/06/2025 14:32", status:"aberto",     desc:"Vibração de 8.2 mm/s no rolamento traseiro. Limite crítico: 7.1 mm/s. Parada imediata recomendada." },
  { id:"ALT-2025-0848", ativo:"BCP-02",nAtivo:"Bomba Centrífuga #2",     titulo:"Ativo Offline — Perda de Sinal",    tipo:"Conectividade",  sev:"critico", data:"23/06/2025 13:15", status:"aberto",     desc:"Gateway MQTT sem resposta há 47 min. Verificar alimentação do concentrador IoT #3." },
  { id:"ALT-2025-0845", ativo:"BCP-01",nAtivo:"Bomba Centrífuga #1",     titulo:"Temperatura Elevada no Mancal",     tipo:"Térmico",        sev:"alto",    data:"23/06/2025 11:48", status:"em_analise", desc:"Temperatura do mancal atingiu 82°C. Limite de alerta: 75°C. Verificar lubrificação." },
  { id:"ALT-2025-0844", ativo:"VT-05", nAtivo:"Ventilador Industrial",    titulo:"Variação de RPM Fora do Padrão",    tipo:"Mecânico",       sev:"medio",   data:"23/06/2025 09:20", status:"em_analise", desc:"RPM oscilando ±4.5%. Verificar inversor de frequência e correia de transmissão." },
  { id:"ALT-2025-0843", ativo:"GR-04", nAtivo:"Guindaste Rolante",        titulo:"Lubrificação Vencida — 12 dias",    tipo:"Manutenção",     sev:"medio",   data:"22/06/2025 16:05", status:"aberto",     desc:"Ciclo de lubrificação venceu em 11/06/2025. Planejar manutenção nas próximas 48h." },
  { id:"ALT-2025-0841", ativo:"CA-03", nAtivo:"Compressor de Ar",         titulo:"Pressão Abaixo do Setpoint",        tipo:"Processo",       sev:"baixo",   data:"22/06/2025 08:30", status:"resolvido",  desc:"Pressão 6.2 bar vs setpoint 7.0 bar. Resolvido: válvula de alívio reconfigurada." },
];

export const TELEM = Array.from({ length: 24 }, (_, i) => ({
  h:  `${String(i).padStart(2,"0")}:00`,
  t:  +(64 + Math.sin(i * .5) * 6 + (i >= 19 ? 12 : 0) + Math.random() * 1.5).toFixed(1),
  v:  +(2.1 + Math.cos(i * .4) * .3 + (i >= 18 ? (i - 17) * 1.1 : 0) + Math.random() * .12).toFixed(2),
  p:  +(4.8 + Math.sin(i * .3) * .4 + Math.random() * .08).toFixed(2),
  c:  +(42 + Math.sin(i * .6) * 4 + (i >= 19 ? 6 : 0) + Math.random() * 1).toFixed(1),
}));

export const HEALTH30 = Array.from({ length: 30 }, (_, i) => ({
  d: `${String(i+1).padStart(2,"0")}/06`,
  r: Math.max(30, Math.round(96 - i*1.9 - Math.random()*3)),
  p: Math.max(25, Math.round(96 - i*2.2 - 4)),
}));

export const ALERTBAR = [
  { d:"17/06", c:1,a:2,m:3 }, { d:"18/06", c:0,a:1,m:4 },
  { d:"19/06", c:2,a:3,m:2 }, { d:"20/06", c:1,a:2,m:5 },
  { d:"21/06", c:3,a:4,m:3 }, { d:"22/06", c:2,a:3,m:4 },
  { d:"23/06", c:2,a:2,m:3 },
];

export const RADAR = [
  { e:"Temperatura", v:72 }, { e:"Vibração", v:45 },
  { e:"Pressão",     v:88 }, { e:"Corrente", v:68 },
  { e:"RPM",         v:91 }, { e:"Óleo",     v:42 },
];

export const PIE = [
  { n:"Crítico", v:2, c:C.red    },
  { n:"Alto",    v:3, c:C.orange },
  { n:"Médio",   v:5, c:C.yellow },
  { n:"Baixo",   v:4, c:C.slate  },
];

export const USERS = [
  { id:1, nome:"Ricardo Teixeira",    email:"r.teixeira@forzy.com.br", papel:"Gerente Industrial",         status:"ativo",   acesso:"hoje, 14:32", mods:["Dashboard","Ativos","Alertas","Telemetria","Governança","RBAC"] },
  { id:2, nome:"Carlos H. Matos",     email:"c.matos@forzy.com.br",    papel:"Eng. de Confiabilidade",     status:"ativo",   acesso:"hoje, 14:28", mods:["Ativos","Alertas","Telemetria","Assistente","Cadastro"] },
  { id:3, nome:"Ana Paula Souza",     email:"a.souza@forzy.com.br",    papel:"Técnico de Manutenção",      status:"ativo",   acesso:"hoje, 11:05", mods:["Ativos","Alertas","Assistente"] },
  { id:4, nome:"Fernanda Lima",       email:"f.lima@forzy.com.br",     papel:"Analista de Dados",          status:"ativo",   acesso:"ontem, 17:20",mods:["Telemetria","Saúde IA","Governança"] },
  { id:5, nome:"João Victor Nunes",   email:"j.nunes@forzy.com.br",    papel:"Operador de Campo",          status:"inativo", acesso:"15/06/2025",  mods:["Ativos","Alertas"] },
];

export const DICI = [
  { id:"BCP-01", nome:"Bomba Centrífuga #1",   D:"aprovado", I:"aprovado", C:"aprovado",  In:"em_revisao" },
  { id:"CA-03",  nome:"Compressor de Ar",       D:"aprovado", I:"aprovado", C:"aprovado",  In:"aprovado"   },
  { id:"ME-07",  nome:"Motor Elétrico #7",      D:"aprovado", I:"aprovado", C:"pendente",  In:"pendente"   },
  { id:"RV-12",  nome:"Redutor de Velocidade",  D:"aprovado", I:"aprovado", C:"aprovado",  In:"aprovado"   },
  { id:"VT-05",  nome:"Ventilador Industrial",  D:"em_revisao",I:"aprovado",C:"aprovado",  In:"pendente"   },
  { id:"TG-01",  nome:"Turbina a Gás #1",       D:"aprovado", I:"aprovado", C:"aprovado",  In:"aprovado"   },
];

export const DICT = [
  { id:"TAG-001", campo:"Temperatura do Mancal",  tipo:"Float",   un:"°C",   faixa:"0–120",  crit:"> 80",         ativo:"Rotativos",           sensor:"PT100"               },
  { id:"TAG-002", campo:"Vibração RMS",            tipo:"Float",   un:"mm/s", faixa:"0–15",   crit:"> 7.1",        ativo:"Rotativos",           sensor:"Acelerômetro MEMS"   },
  { id:"TAG-003", campo:"Pressão de Saída",        tipo:"Float",   un:"bar",  faixa:"0–16",   crit:"< 3.5 / > 12", ativo:"Bombas / Compressores",sensor:"Transdutor 4-20mA"  },
  { id:"TAG-004", campo:"Corrente Elétrica",       tipo:"Float",   un:"A",    faixa:"0–100",  crit:"> FLA×1.15",   ativo:"Motores",             sensor:"TC Split-core"       },
  { id:"TAG-005", campo:"RPM",                     tipo:"Integer", un:"rpm",  faixa:"0–4000", crit:"Desvio > 5%",  ativo:"Rotativos",           sensor:"Encoder Hall"        },
  { id:"TAG-006", campo:"Nível de Óleo",           tipo:"Float",   un:"%",    faixa:"0–100",  crit:"< 20",         ativo:"Redutores / Turbinas",sensor:"Ultrassônico"        },
];

export const ROLES = ["Gerente Industrial","Eng. Confiabilidade","Técnico Manutenção","Analista de Dados","Operador Campo"];
export const MODS  = ["Dashboard","Ativos","Telemetria","Alertas","Assistente","Cadastro","OCR","Mapa","Governança","RBAC"];
export const PERM: Record<string,Record<string,"full"|"read"|"none">> = {
  "Gerente Industrial":  { Dashboard:"full",Ativos:"full",Telemetria:"full",Alertas:"full",Assistente:"full",Cadastro:"full",OCR:"full",Mapa:"full",Governança:"full",RBAC:"full"  },
  "Eng. Confiabilidade": { Dashboard:"full",Ativos:"full",Telemetria:"full",Alertas:"full",Assistente:"full",Cadastro:"full",OCR:"full",Mapa:"full",Governança:"read",RBAC:"none" },
  "Técnico Manutenção":  { Dashboard:"read",Ativos:"read",Telemetria:"read",Alertas:"full",Assistente:"full",Cadastro:"none",OCR:"none",Mapa:"read",Governança:"none",RBAC:"none" },
  "Analista de Dados":   { Dashboard:"read",Ativos:"read",Telemetria:"full",Alertas:"read",Assistente:"read",Cadastro:"none",OCR:"none",Mapa:"none",Governança:"full",RBAC:"none" },
  "Operador Campo":      { Dashboard:"none",Ativos:"read",Telemetria:"none",Alertas:"read",Assistente:"none",Cadastro:"none",OCR:"none",Mapa:"read",Governança:"none",RBAC:"none" },
};

export const HTREE: HNode[] = [{
  id:"EMP-001", l:"Forzy Indústria S.A.", tp:"Empresa", kids:[{
    id:"PLT-N", l:"Planta Norte", tp:"Planta", kids:[
      { id:"ARE-BOM", l:"Bombeamento", tp:"Área", kids:[
        { id:"SIS-B1", l:"Sistema de Recalque #1", tp:"Sistema", kids:[
          { id:"BCP-01", l:"Bomba BCP-01", tp:"Ativo", kids:[] },
          { id:"BCP-02", l:"Bomba BCP-02", tp:"Ativo", kids:[] },
        ]},
      ]},
      { id:"ARE-PRD", l:"Produção A", tp:"Área", kids:[
        { id:"ME-07", l:"Motor ME-07", tp:"Ativo", kids:[] },
      ]},
    ],
  },{
    id:"PLT-S", l:"Planta Sul", tp:"Planta", kids:[] },
  ]
}];

// ══════════════════════════════════════════════════════════════════════════════
// CANONICAL SEED (strong model) — the store's source of truth. Same demo entities
// as the legacy constants above, in the new shapes. (Legacy exports stay until the
// screens are migrated in Phase 3.)
// ══════════════════════════════════════════════════════════════════════════════

// ── Data dictionary: tag definitions with numeric limits (drives engine alerts) ─
export const SEED_DICTIONARY: Tag[] = [
  { id:"TAG-001", key:"temp",     campo:"Temperatura do Mancal", tipo:"Float",   un:"°C",   faixaMin:0, faixaMax:120,  limiteAlerta:75,   limiteCritico:80,   direcao:"acima",  ativo:"Rotativos",            sensor:"PT100"             },
  { id:"TAG-002", key:"vib",      campo:"Vibração RMS",          tipo:"Float",   un:"mm/s", faixaMin:0, faixaMax:15,   limiteAlerta:4.5,  limiteCritico:7.1,  direcao:"acima",  ativo:"Rotativos",            sensor:"Acelerômetro MEMS" },
  { id:"TAG-003", key:"press",    campo:"Pressão de Saída",      tipo:"Float",   un:"bar",  faixaMin:0, faixaMax:16,   limiteAlerta:3.8,  limiteCritico:3.5,  direcao:"abaixo", ativo:"Bombas / Compressores",sensor:"Transdutor 4-20mA" },
  { id:"TAG-004", key:"corrente", campo:"Corrente Elétrica",     tipo:"Float",   un:"A",    faixaMin:0, faixaMax:100,  limiteAlerta:50,   limiteCritico:53,   direcao:"acima",  ativo:"Motores",              sensor:"TC Split-core"     },
  { id:"TAG-005", key:"rpm",      campo:"RPM",                   tipo:"Integer", un:"rpm",  faixaMin:0, faixaMax:4000, limiteAlerta:3850, limiteCritico:3960, direcao:"acima",  ativo:"Rotativos",            sensor:"Encoder Hall"      },
  { id:"TAG-006", key:"oleo",     campo:"Nível de Óleo",         tipo:"Float",   un:"%",    faixaMin:0, faixaMax:100,  limiteAlerta:30,   limiteCritico:20,   direcao:"abaixo", ativo:"Redutores / Turbinas", sensor:"Ultrassônico"      },
];

// ── Assets (nameplate / identity) ─────────────────────────────────────────────
function mk(
  id:string, nome:string, tipo:string, area:string, planta:string,
  criticidade:Asset["criticidade"], fabricante:string, modelo:string, serie:string,
  potenciaKw:number|null, rpmNominal:number|null, instaladoEm:string, offline=false,
): Asset {
  return { id, nome, tipo, area, planta, criticidade, fabricante, modelo, serie, potenciaKw, rpmNominal, instaladoEm, criadoEm: Date.parse(instaladoEm) || 0, offline };
}

export const SEED_ASSETS: Asset[] = [
  mk("BCP-01","Bomba Centrífuga #1","Bomba","Bombeamento","Planta Norte","Alta","KSB","Megablock 100-315","KSB2024001",75,1450,"2019-03-15"),
  mk("CA-03","Compressor de Ar","Compressor","Utilidades","Planta Norte","Média","Atlas Copco","GA 55","AC20220045",55,2950,"2022-01-10"),
  mk("ME-07","Motor Elétrico #7","Motor","Produção A","Planta Norte","Alta","WEG","W22 IE3 75cv","WEG202300178",56,1800,"2023-02-08"),
  mk("RV-12","Redutor de Velocidade","Transmissão","Linha 2","Planta Sul","Média","SEW","FA67 DRE100","SEW20190882",7.5,980,"2019-06-20"),
  mk("VT-05","Ventilador Industrial","Ventilador","HVAC","Planta Norte","Baixa","Multivac","HV-250","MV2021003",18.5,1450,"2021-04-12"),
  mk("TG-01","Turbina a Gás #1","Turbina","Geração","Planta Geração","Crítica","GE Power","LM2500","GE2018004",25000,3600,"2018-09-01"),
  mk("VC-08","Válvula de Controle","Válvula","Processo","Planta Sul","Média","Fisher","Fieldvue DVC6200","FSH20230091",null,null,"2023-03-15"),
  mk("BCP-02","Bomba Centrífuga #2","Bomba","Bombeamento","Planta Norte","Alta","KSB","Etanorm 100-200","KSB2023009",45,1450,"2023-05-05",true),
  mk("GR-04","Guindaste Rolante","Içamento","Armazenagem","Planta Norte","Média","Demag","KBK II","DEM2020044",15,null,"2020-07-22"),
  mk("TR-09","Transformador #9","Elétrico","Subestação","Planta Norte","Crítica","ABB","Trafo 1000 kVA","ABB20190012",null,null,"2019-11-30"),
  // Motor WEG W22 — gêmeo calibrado com dados reais IO-Link (só temperatura + vibração medidas).
  { ...mk("MWE-22","Motor WEG W22","Motor","Produção A","Planta Norte","Alta","WEG","W22 IR3 Premium 10cv","WEG2025W22001",7.5,1750,"2025-09-10"), sensores:["temp","vib"] as TagKey[] },
];

// Per-asset current limits scaled to each asset's nameplate full-load amps — the
// dictionary's generic current limit is a small-motor value, so big machines need
// their own thresholds (otherwise they'd look permanently over-current).
for (const a of SEED_ASSETS) {
  const fla = flaFromKw(a.potenciaKw);
  a.limites = { ...(a.limites ?? {}), corrente: { alerta: +(fla * 1.05).toFixed(0), critico: +(fla * 1.18).toFixed(0) } };
}

// Per-asset twin seed: dominant failure mode + load → reproduces the wireframe's
// health/status while giving the engine a coherent starting damage vector.
const TWIN_SEED: Record<string, { modo: FailureMode; saude: number; carga: number }> = {
  "BCP-01": { modo:"rolamento",      saude:73, carga:0.82 },
  "CA-03":  { modo:"lubrificacao",   saude:92, carga:0.70 },
  "ME-07":  { modo:"rolamento",      saude:41, carga:0.95 },
  "RV-12":  { modo:"desalinhamento", saude:85, carga:0.55 },
  "VT-05":  { modo:"desalinhamento", saude:67, carga:0.65 },
  "TG-01":  { modo:"isolamento",     saude:91, carga:0.80 },
  "VC-08":  { modo:"lubrificacao",   saude:88, carga:0.45 },
  "BCP-02": { modo:"cavitacao",      saude:28, carga:0.00 },
  "GR-04":  { modo:"lubrificacao",   saude:73, carga:0.50 },
  "TR-09":  { modo:"isolamento",     saude:96, carga:0.70 },
  // W22: calibrado p/ reproduzir a magnitude real (vib ~4–5 mm/s, temp ~44 °C) dos dados IO-Link.
  "MWE-22": { modo:"rolamento",      saude:70, carga:0.50 },
};

const HISTORY_LEN = 120;          // 120 samples × 5 min ≈ 10 h window
const STEP_MS = 5 * 60 * 1000;

function buildTwin(a: Asset, now: number, ambientDelta = 0): AssetTwin {
  const cfg = TWIN_SEED[a.id] ?? { modo:"rolamento" as FailureMode, saude:90, carga:0.6 };
  const damage = zeroDamage();
  // Dominant mode set so health ≈ target; small baseline on the others.
  damage[cfg.modo] = +(1 - cfg.saude / 100).toFixed(3);
  (["rolamento","desalinhamento","lubrificacao","isolamento","cavitacao"] as FailureMode[])
    .forEach((m) => { if (m !== cfg.modo) damage[m] = Math.min(damage[m] + 0.04, damage[cfg.modo] * 0.6); });

  const carga = cfg.carga;
  // History: walk damage back in time (~85% in the past) for a gentle trend.
  const history: TelemetrySample[] = [];
  for (let k = HISTORY_LEN - 1; k >= 0; k--) {
    const past = 0.85 + 0.15 * ((HISTORY_LEN - 1 - k) / (HISTORY_LEN - 1));
    const dmgK = Object.fromEntries(
      (Object.keys(damage) as FailureMode[]).map((m) => [m, damage[m] * past]),
    ) as Record<FailureMode, number>;
    const t = now - k * STEP_MS;
    history.push({ t, ...readingFromState(a, dmgK, carga, ambientDelta, t / STEP_MS) });
  }
  const state = history[history.length - 1];

  return {
    assetId: a.id,
    state,
    history,
    damage,
    health: healthFromDamage(damage),
    status: statusFromHealth(healthFromDamage(damage), a.offline),
    rulDias: 0,            // filled below (predict) so it's never 0 on first paint
    probFalha: [],
    modoCritico: worstMode(damage),
    syncedAt: now,
    cargaPct: carga,
    // Seed a small residual (anomaly signal) proportional to damage so the twin
    // never shows a bare 0.0% before the engine's first tick refines it.
    residual: +((1 - healthFromDamage(damage) / 100) * 22).toFixed(1),
  };
}

export function buildSeedTwins(now: number, ambientDelta = 0): Record<string, AssetTwin> {
  const out: Record<string, AssetTwin> = {};
  for (const a of SEED_ASSETS) {
    const tw = buildTwin(a, now, ambientDelta);
    // Populate RUL + failure curve up front (no zeroed indices before the engine runs).
    const p = predict(a, tw, SEED_DICTIONARY);
    tw.rulDias = p.rulDias; tw.probFalha = p.probFalha; tw.modoCritico = p.modoCritico;
    out[a.id] = tw;
  }
  return out;
}

// A fresh, healthy twin for a newly-registered asset (near-zero damage).
export function buildHealthyTwin(asset: Asset, now: number, cargaPct = 0.6): AssetTwin {
  const damage = zeroDamage();
  (Object.keys(damage) as FailureMode[]).forEach((m) => { damage[m] = 0.02; });
  const history: TelemetrySample[] = [];
  for (let k = HISTORY_LEN - 1; k >= 0; k--) {
    const t = now - k * STEP_MS;
    history.push({ t, ...readingFromState(asset, damage, cargaPct, 0, t / STEP_MS) });
  }
  return {
    assetId: asset.id,
    state: history[history.length - 1],
    history,
    damage,
    health: healthFromDamage(damage),
    status: statusFromHealth(healthFromDamage(damage), asset.offline),
    rulDias: 0,
    probFalha: [],
    modoCritico: worstMode(damage),
    syncedAt: now,
    cargaPct,
    residual: 0,
  };
}

// ── Ordens de Serviço (demo) ──────────────────────────────────────────────────
export const SEED_WORKORDERS: WorkOrder[] = [
  { id:"OS-2026-0042", assetId:"ME-07", titulo:"Substituir rolamento traseiro", descricao:"Vibração crítica (8,2 mm/s) no mancal traseiro — troca do rolamento 6314.", prioridade:"critica", status:"em_andamento", criadoEm: Date.parse("2026-06-22T08:10:00"), responsavel:"Carlos H. Matos", origem:"alerta" },
  { id:"OS-2026-0041", assetId:"GR-04", titulo:"Lubrificação programada", descricao:"Ciclo de lubrificação vencido há 12 dias.", prioridade:"media", status:"aberta", criadoEm: Date.parse("2026-06-21T16:30:00"), origem:"alerta" },
  { id:"OS-2026-0039", assetId:"BCP-01", titulo:"Inspeção térmica do mancal", descricao:"Temperatura do mancal a 82 °C — verificar lubrificação e alinhamento.", prioridade:"alta", status:"concluida", criadoEm: Date.parse("2026-06-18T09:00:00"), concluidoEm: Date.parse("2026-06-19T14:20:00"), responsavel:"Ana Paula Souza", origem:"manual" },
];

// ── Alerts (canonical) ────────────────────────────────────────────────────────
function parseBR(s: string): number {
  // "23/06/2025 14:32" → ms
  const [d, h] = s.split(" ");
  const [dd, mm, yyyy] = d.split("/").map(Number);
  const [hh, mi] = (h ?? "00:00").split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, mi).getTime();
}

export const SEED_ALERTS: Alert[] = [
  { id:"ALT-2025-0847", assetId:"ME-07",  titulo:"Vibração Crítica Detectada",     tipo:"Mecânico",      severidade:"critico", status:"aberto",     criadoEm:parseBR("23/06/2025 14:32"), descricao:"Vibração de 8.2 mm/s no rolamento traseiro. Limite crítico: 7.1 mm/s. Parada imediata recomendada.", origem:"regra", tag:"vib", responsavel:"Carlos H. Matos" },
  { id:"ALT-2025-0848", assetId:"BCP-02", titulo:"Ativo Offline — Perda de Sinal", tipo:"Conectividade", severidade:"critico", status:"aberto",     criadoEm:parseBR("23/06/2025 13:15"), descricao:"Gateway MQTT sem resposta há 47 min. Verificar alimentação do concentrador IoT #3.", origem:"regra" },
  { id:"ALT-2025-0845", assetId:"BCP-01", titulo:"Temperatura Elevada no Mancal",  tipo:"Térmico",       severidade:"alto",    status:"em_analise", criadoEm:parseBR("23/06/2025 11:48"), descricao:"Temperatura do mancal atingiu 82°C. Limite de alerta: 75°C. Verificar lubrificação.", origem:"regra", tag:"temp" },
  { id:"ALT-2025-0844", assetId:"VT-05",  titulo:"Variação de RPM Fora do Padrão", tipo:"Mecânico",      severidade:"medio",   status:"em_analise", criadoEm:parseBR("23/06/2025 09:20"), descricao:"RPM oscilando ±4.5%. Verificar inversor de frequência e correia de transmissão.", origem:"regra", tag:"rpm" },
  { id:"ALT-2025-0843", assetId:"GR-04",  titulo:"Lubrificação Vencida — 12 dias", tipo:"Manutenção",    severidade:"medio",   status:"aberto",     criadoEm:parseBR("22/06/2025 16:05"), descricao:"Ciclo de lubrificação venceu em 11/06/2025. Planejar manutenção nas próximas 48h.", origem:"modelo", tag:"oleo" },
  { id:"ALT-2025-0841", assetId:"CA-03",  titulo:"Pressão Abaixo do Setpoint",     tipo:"Processo",      severidade:"baixo",   status:"resolvido",  criadoEm:parseBR("22/06/2025 08:30"), resolvidoEm:parseBR("22/06/2025 10:10"), descricao:"Pressão 6.2 bar vs setpoint 7.0 bar. Resolvido: válvula de alívio reconfigurada.", origem:"regra", tag:"press" },
];

// ── Users (with demo passwords for Phase 7 auth) ──────────────────────────────
export const SEED_USERS: User[] = [
  { id:1, nome:"Ricardo Teixeira",  email:"r.teixeira@forzy.com.br", senha:"predicta", papel:"Gerente Industrial",     status:"ativo",   acesso:"hoje, 14:32", mods:["Dashboard","Ativos","Alertas","Telemetria","Governança","RBAC"] },
  { id:2, nome:"Carlos H. Matos",   email:"c.matos@forzy.com.br",    senha:"predicta", papel:"Eng. Confiabilidade",   status:"ativo",   acesso:"hoje, 14:28", mods:["Ativos","Alertas","Telemetria","Assistente","Cadastro"] },
  { id:3, nome:"Ana Paula Souza",   email:"a.souza@forzy.com.br",    senha:"predicta", papel:"Técnico Manutenção",    status:"ativo",   acesso:"hoje, 11:05", mods:["Ativos","Alertas","Assistente"] },
  { id:4, nome:"Fernanda Lima",     email:"f.lima@forzy.com.br",     senha:"predicta", papel:"Analista de Dados",     status:"ativo",   acesso:"ontem, 17:20", mods:["Telemetria","Saúde IA","Governança"] },
  { id:5, nome:"João Victor Nunes", email:"j.nunes@forzy.com.br",    senha:"predicta", papel:"Operador Campo",        status:"inativo", acesso:"15/06/2025",  mods:["Ativos","Alertas"] },
];

export const SEED_HIERARCHY: HNode[] = HTREE;
export const SEED_DICI: DiciRow[] = DICI as DiciRow[];

