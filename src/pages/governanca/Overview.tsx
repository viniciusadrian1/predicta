// 16. Governança — Visão Geral ────────────────────────────────────────────────
import { useNavigate } from "react-router";
import { FileText, Clock, AlertCircle, Target, GitBranch, Layers, BookOpen, Key, Hash, Settings } from "lucide-react";
import { C } from "@/lib/theme";
import { KPI, SH } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";

export default function GovernancaOverview() {
  const navigate = useNavigate();
  const dici = useStore((s) => s.dici);
  usePageChrome(["Administração","Visão Geral"]);

  // Real indicators derived from the D-I-C-I matrix (4 status cells per asset).
  const cells = dici.flatMap((r) => [r.D, r.I, r.C, r.In]);
  const total = cells.length || 1;
  const aprovados = cells.filter((c) => c === "aprovado").length;
  const emRevisao = cells.filter((c) => c === "em_revisao").length;
  const pendentes = cells.filter((c) => c === "pendente").length;
  const conformidade = Math.round((aprovados / total) * 100);

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Documentos Aprovados" val={String(aprovados)} sub={`${Math.round((aprovados/total)*100)}% do total`} icon={FileText}     color={C.green}  />
        <KPI label="Em Revisão"           val={String(emRevisao)} sub="Ação necessária"  icon={Clock}         color={C.yellow} />
        <KPI label="Pendentes"            val={String(pendentes)} sub="Sem documentação" icon={AlertCircle}   color={C.red}    />
        <KPI label="Conformidade Geral"   val={`${conformidade}%`} sub="Meta: 95%"        icon={Target}        color={C.steel}  />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { l:"Estrutura da Planta",          d:"Hierarquia empresa › planta › área › ativo",      I:GitBranch, to:"/admin/estrutura",  c:C.cobalt  },
          { l:"Ciclo do Ativo",               d:"Ciclo de vida documental (D-I-C-I) de cada ativo", I:Layers,    to:"/admin/ciclo",      c:C.steel   },
          { l:"Catálogo · Dicionário",        d:"Definições, unidades e limites de sensores",      I:BookOpen,  to:"/admin/catalogo",   c:C.slate   },
          { l:"Acessos",                      d:"Usuários, papéis e controle de acesso (RBAC)",    I:Key,       to:"/admin/acessos",    c:C.green   },
          { l:"Auditoria",                    d:"Trilha completa de eventos e alterações",         I:Hash,      to:"/admin/auditoria",  c:C.yellow  },
          { l:"Configurações do Sistema",     d:"Simulação, ambiente e dados de demonstração",     I:Settings,  to:"/configuracoes",    c:C.slate   },
        ].map(item=>(
          <button key={item.l} onClick={()=>navigate(item.to)}
            className="text-left p-4 rounded-lg transition-all group"
            style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background:`${item.c}1A`, border:`1px solid ${item.c}30` }}>
              <item.I size={16} style={{ color:item.c }} />
            </div>
            <div className="text-[13px] font-bold mb-1 transition-colors group-hover:text-[#82C8E5]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{item.l}</div>
            <div className="text-[11px]" style={{ color:C.slate }}>{item.d}</div>
          </button>
        ))}
      </div>

      {/* Compliance bars */}
      <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Conformidade por Planta" />
        <div className="space-y-3">
          {[
            { p:"Planta Norte",   tot:89, ap:79, rv:6,  pnd:4,  pct:89 },
            { p:"Planta Sul",     tot:42, ap:37, rv:3,  pnd:2,  pct:88 },
            { p:"Planta Geração", tot:32, ap:26, rv:4,  pnd:2,  pct:81 },
          ].map(p=>(
            <div key={p.p} className="flex items-center gap-4">
              <div className="w-28 text-[12px]" style={{ color:C.textSub }}>{p.p}</div>
              <div className="flex-1 flex gap-0.5 h-3 rounded overflow-hidden" style={{ background:C.bgDeep }}>
                <div style={{ width:`${(p.ap/p.tot)*100}%`, background:"rgba(52,211,153,0.65)" }} />
                <div style={{ width:`${(p.rv/p.tot)*100}%`, background:"rgba(251,191,36,0.65)" }} />
                <div style={{ width:`${(p.pnd/p.tot)*100}%`, background:"rgba(109,129,150,0.35)" }} />
              </div>
              <span className="text-[14px] font-bold w-12 text-right font-mono" style={{ fontFamily:"'Rajdhani',sans-serif", color:p.pct>=88?C.green:p.pct>=80?C.yellow:C.red }}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
