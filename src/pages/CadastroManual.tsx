// 9. Cadastro Manual ───────────────────────────────────────────────────────────
// Controlled form (react-hook-form). On submit it creates a real Asset + a fresh
// digital twin and navigates to the new asset.
import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { CheckCircle2, Info, ScanLine, Radio, PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useCreateAsset, assetIdExists } from "@/store/createAsset";
import type { Asset } from "@/lib/types";

interface FormData {
  id: string; nome: string; tipo: string; criticidade: Asset["criticidade"];
  fabricante: string; modelo: string; serie: string; instaladoEm: string;
  planta: string; area: string;
  potenciaKw: string; rpmNominal: string;
}

const STEPS = ["Identificação", "Localização", "Dados Técnicos", "Sensores", "Revisão"];
const FIELD_STEP: Record<string, number> = { id: 1, nome: 1, tipo: 1, criticidade: 1, planta: 2, area: 2 };

const inputStyle = { background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text } as const;
const errStyle = { background: C.bgDeep, border: "1px solid rgba(248,113,113,0.5)", color: C.text } as const;

export default function CadastroManual() {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const [step, setStep] = useState(1);
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { criticidade: "Média", instaladoEm: today, tipo: "" },
  });

  usePageChrome(["Cadastro", "Novo Ativo"]);

  const onValid = (d: FormData) => {
    const asset = createAsset({
      id: d.id.trim().toUpperCase(), nome: d.nome.trim(), tipo: d.tipo.trim() || "Equipamento",
      criticidade: d.criticidade, fabricante: d.fabricante.trim(), modelo: d.modelo.trim(),
      serie: d.serie.trim(), instaladoEm: d.instaladoEm || today,
      area: d.area.trim(), planta: d.planta.trim(),
      potenciaKw: d.potenciaKw ? Number(d.potenciaKw) : null,
      rpmNominal: d.rpmNominal ? Number(d.rpmNominal) : null,
    });
    toast.success("Ativo cadastrado", { description: `${asset.id} — ${asset.nome}` });
    navigate(`/ativos/${asset.id}/overview`);
  };
  const onInvalid = (errs: typeof errors) => {
    const first = Object.keys(errs)[0];
    setStep(FIELD_STEP[first] ?? 1);
    toast.error("Verifique os campos obrigatórios.");
  };

  const lbl = (label: string, name: keyof FormData, opts?: { required?: boolean; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color:C.slate }}>{label}{opts?.required && " *"}</label>
      <input type={opts?.type ?? "text"} placeholder={opts?.placeholder}
        {...register(name, opts?.required ? (name === "id"
          ? { required: true, validate: (v) => !assetIdExists(v) || "Tag já existe" }
          : { required: true }) : {})}
        className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" style={errors[name] ? errStyle : inputStyle} />
      {errors[name]?.type === "validate" && <span className="text-[10px]" style={{ color:C.red }}>{String(errors[name]?.message)}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center mb-2">
        {STEPS.map((s,i)=>(
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button type="button" onClick={()=>setStep(i+1)} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                style={step>i+1?{background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.4)",color:C.green}:step===i+1?{background:C.cobalt,border:`1px solid ${C.cobalt}`,color:"white"}:{border:`1px solid ${C.border}`,color:C.slate}}>
                {step>i+1?<CheckCircle2 size={13}/>:i+1}
              </div>
              <span className="text-[11px] transition-all" style={{ color:step===i+1?C.steel:step>i+1?C.green:C.slate }}>{s}</span>
            </button>
            {i<STEPS.length-1&&<div className="flex-1 h-px mx-3" style={{ background:step>i+1?"rgba(52,211,153,0.3)":C.border }} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg p-5" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          {step===1&&(<>
            <SH title="Identificação do Ativo" />
            <div className="grid grid-cols-2 gap-4">
              {lbl("Tag / Identificador","id",{ required:true, placeholder:"BCP-03" })}
              {lbl("Nome do Ativo","nome",{ required:true, placeholder:"Bomba Centrífuga #3" })}
              {lbl("Tipo de Equipamento","tipo",{ required:true, placeholder:"Bomba" })}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color:C.slate }}>Classe de Criticidade *</label>
                <select {...register("criticidade")} className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                  {["Baixa","Média","Alta","Crítica"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {lbl("Fabricante","fabricante",{ placeholder:"KSB" })}
              {lbl("Modelo","modelo",{ placeholder:"Megablock 100-315" })}
              {lbl("Número de Série","serie")}
              {lbl("Data de Instalação","instaladoEm",{ type:"date" })}
            </div>
          </>)}
          {step===2&&(<>
            <SH title="Localização na Planta" />
            <div className="grid grid-cols-2 gap-4">
              {lbl("Planta / Unidade","planta",{ required:true, placeholder:"Planta Norte" })}
              {lbl("Área","area",{ required:true, placeholder:"Bombeamento" })}
            </div>
          </>)}
          {step===3&&(<>
            <SH title="Dados Técnicos" />
            <div className="grid grid-cols-2 gap-4">
              {lbl("Potência Nominal (kW)","potenciaKw",{ type:"number", placeholder:"75" })}
              {lbl("Rotação Nominal (rpm)","rpmNominal",{ type:"number", placeholder:"1450" })}
            </div>
            <p className="text-[11px] mt-3" style={{ color:C.slate }}>A corrente nominal e os limites de alerta são derivados automaticamente da potência.</p>
          </>)}
          {step===4&&(<>
            <SH title="Sensores e Monitoramento" />
            <div className="space-y-3 mb-4">
              {[
                { t:"PT100", g:"Temperatura do Mancal", p:"4-20mA", on:true },
                { t:"Acelerômetro MEMS", g:"Vibração Triaxial", p:"Modbus RTU", on:true },
                { t:"Transdutor 4-20mA", g:"Pressão de Saída", p:"4-20mA", on:false },
              ].map((s,i)=>(
                <div key={i} className="flex items-center gap-3 p-3 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                  <input type="checkbox" defaultChecked={s.on} className="accent-blue-600" />
                  <Radio size={13} style={{ color:C.steel }} />
                  <div className="grid grid-cols-3 gap-4 flex-1">
                    <div><div className="text-[10px]" style={{ color:C.slate }}>Sensor</div><div className="text-[12px]" style={{ color:C.text }}>{s.t}</div></div>
                    <div><div className="text-[10px]" style={{ color:C.slate }}>Grandeza</div><div className="text-[12px]" style={{ color:C.text }}>{s.g}</div></div>
                    <div><div className="text-[10px]" style={{ color:C.slate }}>Protocolo</div><div className="text-[12px] font-mono" style={{ color:C.text }}>{s.p}</div></div>
                  </div>
                  <button type="button" style={{ color:C.slate }}><X size={12}/></button>
                </div>
              ))}
            </div>
          </>)}
          {step===5&&(<>
            <SH title="Revisão e Confirmação" />
            <div className="flex items-center gap-2 p-3 rounded-md mb-4" style={{ background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)" }}>
              <CheckCircle2 size={13} style={{ color:C.green }} />
              <span className="text-[12px]" style={{ color:C.green }}>Revise os dados e clique em “Cadastrar Ativo”.</span>
            </div>
            {[["Tag",watch("id")],["Nome",watch("nome")],["Tipo",watch("tipo")],["Criticidade",watch("criticidade")],["Planta",watch("planta")],["Área",watch("area")],["Fabricante",watch("fabricante")],["Potência",watch("potenciaKw")?`${watch("potenciaKw")} kW`:"—"]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 text-[12px]" style={{ borderBottom:`1px solid ${C.border}40` }}>
                <span style={{ color:C.slate }}>{k}</span>
                <span className="font-mono" style={{ color:C.text }}>{v || "—"}</span>
              </div>
            ))}
          </>)}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2"><Info size={13} style={{ color:C.steel }}/><span className="text-[12px] font-semibold" style={{ color:C.text }}>Dica</span></div>
            <p className="text-[11px] leading-relaxed" style={{ color:C.slate }}>O Tag deve ser único e seguir o padrão do Dicionário de Rastreabilidade da planta.</p>
          </div>
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2"><ScanLine size={13} style={{ color:C.steel }}/><span className="text-[12px] font-semibold" style={{ color:C.text }}>Digitalização OCR</span></div>
            <p className="text-[11px] leading-relaxed mb-3" style={{ color:C.slate }}>Tem a plaqueta do equipamento? Preencha os dados automaticamente.</p>
            <button type="button" onClick={()=>navigate("/cadastro/ocr")} className="w-full py-2 text-[11px] font-semibold rounded-md transition-all"
              style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35`, color:C.steel }}>Usar OCR</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4" style={{ borderTop:`1px solid ${C.border}` }}>
        <button type="button" onClick={()=>navigate("/ativos")} className="px-4 py-2 text-xs rounded-md transition-all" style={{ border:`1px solid ${C.border}`, color:C.slate }}>Cancelar</button>
        <div className="flex items-center gap-2">
          {step>1&&<button type="button" onClick={()=>setStep(s=>s-1)} className="px-4 py-2 text-xs rounded-md transition-all" style={{ border:`1px solid ${C.border}`, color:C.steel }}>Voltar</button>}
          {step<5
            ?<button type="button" onClick={()=>setStep(s=>s+1)} className="px-5 py-2 text-xs font-bold text-white rounded-md" style={{ background:C.cobalt }}>Continuar →</button>
            :<button type="submit" className="px-5 py-2 text-xs font-bold text-white rounded-md" style={{ background:"#059669" }}>Cadastrar Ativo</button>
          }
        </div>
      </div>
    </form>
  );
}
