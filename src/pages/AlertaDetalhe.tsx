// 13. Detalhe do Alerta ────────────────────────────────────────────────────────
import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import {
  RotateCcw, CheckCircle2, AlertTriangle, Cpu, Wrench, MessageSquare, Activity, Users, XCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH, SevBadge, Badge, Bar_, TT_, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { useCan } from "@/auth/rbac";
import { toChartData } from "@/lib/telemetry";
import { fmtDateTime, fmtTimeSec, fmtDate } from "@/lib/format";
import { OriginBadge, GatedButton } from "@/components/gov";

const SEV_COLOR: Record<string, string> = { critico: C.red, alto: C.orange, medio: C.yellow, baixo: C.slate };
const ORIGEM_METODO: Record<string, string> = { regra: "Limite do dicionário (threshold)", modelo: "Gêmeo digital — predição", manual: "Registro manual" };

export default function AlertaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const alerts = useStore((s) => s.alerts);
  const assets = useStore((s) => s.assets);
  const twins = useStore((s) => s.twins);
  const ackAlert = useStore((s) => s.ackAlert);
  const resolveAlert = useStore((s) => s.resolveAlert);
  const reopenAlert = useStore((s) => s.reopenAlert);
  const canWrite = useCan("Alertas", "full");
  const [comment, setComment] = useState("");

  const al = alerts.find((a) => a.id === id) ?? alerts[0];
  const asset = assets.find((a) => a.id === al.assetId);
  const twin = twins[al.assetId];
  const sevColor = SEV_COLOR[al.severidade] ?? C.slate;

  const spike = toChartData((twin?.history ?? []).slice(-40));

  const ack = () => { ackAlert(al.id); toast.success("Alerta reconhecido", { description: al.id }); };
  const resolve = () => { resolveAlert(al.id); toast.success("Alerta resolvido", { description: al.id }); };
  const reopen = () => { reopenAlert(al.id); toast("Alerta reaberto", { description: al.id }); };

  usePageChrome(["Alertas","Lista de Alertas",al.id],
    canWrite ? (
      <div className="flex items-center gap-2">
        {al.status === "resolvido"
          ? <IBtn icon={RotateCcw} label="Reabrir" onClick={reopen} />
          : <IBtn icon={Activity} label="Reconhecer" onClick={ack} />}
        {al.status !== "resolvido" && (
          <GatedButton modulo="Alertas" nivel="full" onClick={resolve} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
            style={{ background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.3)", color:C.green }}>
            <CheckCircle2 size={12}/> Resolver
          </GatedButton>
        )}
      </div>
    ) : undefined
  );

  const timeline = [
    { t: fmtTimeSec(al.criadoEm), tp: "Detecção", d: al.descricao, c: "bg-red-400" },
    { t: fmtTimeSec(al.criadoEm + 3000), tp: "Alerta Criado", d: `Alerta ${al.id} criado (${ORIGEM_METODO[al.origem]}). Notificações disparadas.`, c: "bg-orange-400" },
    ...(al.status !== "aberto" ? [{ t: fmtTimeSec(al.criadoEm + 9 * 60000), tp: "Em Análise", d: `${al.responsavel ?? "Equipe"} assumiu o alerta.`, c: "bg-blue-400" }] : []),
    ...(al.resolvidoEm ? [{ t: fmtTimeSec(al.resolvidoEm), tp: "Resolvido", d: "Condição normalizada / intervenção concluída.", c: "bg-emerald-400" }] : []),
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        {/* Header card */}
        <div className="p-4 rounded-lg" style={{ background:`${sevColor}0A`, border:`1px solid ${sevColor}33` }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color:sevColor }} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-[16px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{al.titulo}</h2>
                <SevBadge s={al.severidade} /><Badge s={al.status} /><OriginBadge origem={al.origem} />
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color:C.textSub }}>{al.descricao}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Detalhes do Alerta" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              ["ID",al.id],["Ativo",`${al.assetId} — ${asset?.nome ?? ""}`],
              ["Tipo",al.tipo],["Data/Hora de Detecção",fmtDateTime(al.criadoEm)],
              ["Método",ORIGEM_METODO[al.origem]],["Origem",al.origem],
            ].map(([k,v])=>(
              <div key={k}>
                <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color:C.slate }}>{k}</div>
                <div className="text-[12px] font-mono" style={{ color:C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Spike chart */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Telemetria em Torno do Alerta" />
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={spike}>
              <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={sevColor} stopOpacity={.15}/><stop offset="95%" stopColor={sevColor} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.04} />
              <XAxis dataKey="h" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <Area type="monotone" dataKey={al.tag === "temp" ? "temp" : al.tag === "corrente" ? "corrente" : al.tag === "press" ? "press" : "vib"} name="Leitura" stroke={sevColor} fill="url(#gv)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Linha do Tempo" />
          <div className="space-y-3">
            {timeline.map((ev,i)=>(
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${ev.c}`} />
                  {i<timeline.length-1 && <div className="w-px h-7 mt-1" style={{ background:`${C.border}` }} />}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold" style={{ color:C.text }}>{ev.tp}</span>
                    <span className="text-[10px] font-mono" style={{ color:C.slate }}>{ev.t}</span>
                  </div>
                  <p className="text-[11px]" style={{ color:C.slate }}>{ev.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Ativo Relacionado" />
          <button onClick={()=>navigate(`/ativos/${al.assetId}/overview`)} className="w-full text-left p-3 rounded-md transition-all hover:border-[rgba(130,200,229,0.25)]"
            style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2"><Cpu size={13} style={{ color:C.steel }}/><span className="text-[12px] font-medium" style={{ color:C.text }}>{asset?.nome ?? al.assetId}</span></div>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:11 }}>{al.assetId}</span>
              <Badge s={twin?.status ?? "offline"} />
            </div>
            <Bar_ v={twin?.health ?? 0} />
            <div className="text-[10px] mt-1.5" style={{ color:C.slate }}>Saúde: {twin?.health ?? 0}% · sincronizado {fmtDate(twin?.syncedAt ?? Date.now())}</div>
          </button>
        </div>

        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Ações Rápidas" />
          <div className="space-y-2">
            {[
              { l:"Criar Ordem de Serviço",     I:Wrench,        on:()=>navigate(`/ordens?novo=${al.assetId}`), write:true },
              { l:"Abrir no Assistente IA",     I:MessageSquare, on:()=>navigate(`/assistente/${al.assetId}`) },
              { l:"Ver Histórico do Ativo",     I:Activity,      on:()=>navigate(`/ativos/${al.assetId}/telemetria`) },
              { l:"Escalar para Engenharia",    I:Users,         on:()=>{ ackAlert(al.id); toast.success("Escalado para engenharia"); }, write:true },
              { l:"Fechar como Falso Positivo", I:XCircle,       on:()=>resolve(), write:true },
            ].filter(act=>canWrite || !act.write).map(act=>(
              act.write ? (
                <GatedButton key={act.l} modulo="Alertas" nivel="full" onClick={act.on} className="w-full flex items-center gap-2.5 p-2 rounded-md text-[11px] transition-all hover:border-[rgba(130,200,229,0.2)]"
                  style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.textSub }}>
                  <act.I size={11} style={{ color:C.steel }}/>{act.l}
                </GatedButton>
              ) : (
                <button key={act.l} onClick={act.on} className="w-full flex items-center gap-2.5 p-2 rounded-md text-[11px] transition-all hover:border-[rgba(130,200,229,0.2)]"
                  style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.textSub }}>
                  <act.I size={11} style={{ color:C.steel }}/>{act.l}
                </button>
              )
            ))}
          </div>
        </div>

        {canWrite && (
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Adicionar Comentário" />
            <textarea value={comment} onChange={(e)=>setComment(e.target.value)} rows={3} placeholder="Registre uma observação..." className="w-full rounded-md p-2.5 text-xs resize-none focus:outline-none mb-2"
              style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }} />
            <button onClick={()=>{ if(comment.trim()){ toast.success("Comentário registrado"); setComment(""); } }} className="w-full py-2 text-xs font-bold rounded-md text-white" style={{ background:C.cobalt }}>Registrar</button>
          </div>
        )}
      </div>
    </div>
  );
}
