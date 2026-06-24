// 10. Leitura OCR ──────────────────────────────────────────────────────────────
// Real client-side OCR (Tesseract.js, por+eng) on an uploaded nameplate image →
// parsed fields auto-fill the form → creates a real asset + twin.
import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Camera, CheckCircle2, Bot, X, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { scanNameplate, type NameplateResult } from "@/ai/ocr";
import { useCreateAsset, assetIdExists } from "@/store/createAsset";

const MAX_MB = 10;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
// Grab the FIRST numeric token only (so "2900 min-1" → 2900, not 29001; "18,5 kW" → 18.5).
const num = (v: string) => { const m = String(v).replace(",", ".").match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; };

type Status = "idle" | "processing" | "done" | "error";

export default function CadastroOCR() {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<NameplateResult | null>(null);
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState({ id:"", nome:"", tipo:"", criticidade:"Média" as const, fabricante:"", modelo:"", serie:"", potenciaKw:"", rpmNominal:"", tensao:"", corrente:"", area:"", planta:"" });
  const [auto, setAuto] = useState<Set<string>>(new Set());

  usePageChrome(["Cadastro", "Leitura OCR"]);

  const handleFile = async (file: File) => {
    if (!ACCEPT.includes(file.type)) { toast.error("Formato inválido", { description:"Use JPG, PNG ou WEBP." }); return; }
    if (file.size > MAX_MB * 1024 * 1024) { toast.error("Imagem muito grande", { description:`Máx. ${MAX_MB} MB.` }); return; }
    setPreview(URL.createObjectURL(file));
    setStatus("processing"); setProgress(0); setResult(null);
    try {
      const r = await scanNameplate(file, (p) => setProgress(p));
      setResult(r);
      const a = new Set<string>();
      setForm((f) => {
        const next = { ...f };
        const put = (k: keyof typeof next, v?: string) => { if (v) { (next as any)[k] = v; a.add(k); } };
        put("fabricante", r.fields.fabricante?.value);
        put("modelo", r.fields.modelo?.value);
        put("serie", r.fields.serie?.value);
        if (r.fields.potencia) { next.potenciaKw = String(num(r.fields.potencia.value) ?? ""); a.add("potenciaKw"); }
        if (r.fields.rotacao) { next.rpmNominal = String(num(r.fields.rotacao.value) ?? ""); a.add("rpmNominal"); }
        put("tensao", r.fields.tensao?.value);
        put("corrente", r.fields.corrente?.value);
        if (r.fields.modelo && !next.nome) { next.nome = r.fields.modelo.value; }
        return next;
      });
      setAuto(a);
      setStatus("done");
      toast.success("OCR concluído", { description: `${r.fieldCount} campos extraídos — confiança média ${r.overallConfidence}%.` });
    } catch (e) {
      console.error(e); setStatus("error");
      toast.error("Falha no OCR", { description:"Não foi possível ler a imagem. Tente outra foto." });
    }
  };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };

  const cadastrar = () => {
    if (!form.id.trim()) { toast.error("Informe o Tag do ativo."); return; }
    if (assetIdExists(form.id)) { toast.error("Tag já existe."); return; }
    const asset = createAsset({
      id: form.id.trim().toUpperCase(), nome: form.nome.trim() || form.modelo.trim() || form.id.trim(),
      tipo: form.tipo.trim() || "Equipamento", criticidade: form.criticidade,
      fabricante: form.fabricante.trim(), modelo: form.modelo.trim(), serie: form.serie.trim(),
      instaladoEm: new Date().toISOString().slice(0,10), area: form.area.trim(), planta: form.planta.trim(),
      potenciaKw: num(form.potenciaKw), rpmNominal: num(form.rpmNominal),
    });
    toast.success("Ativo cadastrado via OCR", { description: `${asset.id} — ${asset.nome}` });
    navigate(`/ativos/${asset.id}/overview`);
  };

  const fieldRow = (label: string, key: keyof typeof form, opts?: { req?: boolean }) => {
    const isAuto = auto.has(key);
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] uppercase tracking-[0.15em]" style={{ color:C.slate }}>{label}{opts?.req && " *"}</label>
          {isAuto && <span className="text-[9px] flex items-center gap-0.5" style={{ color:C.green }}><Bot size={8}/> OCR</span>}
        </div>
        <input value={form[key]} onChange={(e)=>setForm({...form, [key]:e.target.value})}
          className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
          style={{ background:C.bgDeep, border:`1px solid ${isAuto?"rgba(52,211,153,0.35)":C.border}`, color:C.text }} />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Imagem da Plaqueta" />
          <input ref={fileRef} type="file" accept={ACCEPT.join(",")} className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); }} />
          <div
            onClick={()=>status!=="processing" && fileRef.current?.click()}
            onDragOver={(e)=>{ e.preventDefault(); setDrag(true); }} onDragLeave={()=>setDrag(false)} onDrop={onDrop}
            className="relative rounded-lg overflow-hidden cursor-pointer"
            style={{ border:`2px dashed ${drag?C.steel:status==="done"?"rgba(52,211,153,0.4)":C.border}`, background:C.bgDeep }}>
            {preview ? (
              <div className="h-56 flex items-center justify-center relative">
                <img src={preview} alt="plaqueta" className="max-h-56 max-w-full object-contain" />
                {status==="processing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background:"rgba(5,12,22,0.7)" }}>
                    <Loader2 size={22} className="animate-spin" style={{ color:C.steel }} />
                    <span className="text-[11px]" style={{ color:C.text }}>Lendo plaqueta… {Math.round(progress*100)}%</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35` }}>
                  <Camera size={22} style={{ color:C.steel }} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium" style={{ color:C.text }}>Arraste a imagem aqui ou clique</div>
                  <div className="text-xs mt-0.5" style={{ color:C.slate }}>JPG, PNG ou WEBP — máx. {MAX_MB} MB</div>
                </div>
              </div>
            )}
          </div>
          {status==="processing" && (
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(130,200,229,0.08)" }}>
              <div className="h-full rounded-full transition-all" style={{ width:`${Math.round(progress*100)}%`, background:C.steel }} />
            </div>
          )}
          {status==="done" && result && (
            <div className="flex items-center gap-2 mt-3 p-2.5 rounded-md" style={{ background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)" }}>
              <CheckCircle2 size={13} style={{ color:C.green }} />
              <span className="text-[12px]" style={{ color:C.green }}>OCR concluído — {result.fieldCount} campos · confiança {result.overallConfidence}%</span>
            </div>
          )}
          {status==="error" && (
            <div className="flex items-center gap-2 mt-3 p-2.5 rounded-md" style={{ background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.25)" }}>
              <X size={13} style={{ color:C.red }} />
              <span className="text-[12px]" style={{ color:C.red }}>Falha ao processar a imagem. Tente outra foto.</span>
            </div>
          )}
        </div>

        {result && (
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Campos Detectados" />
            <div className="space-y-1.5">
              {Object.entries(result.fields).length===0 && <div className="text-[11px]" style={{ color:C.slate }}>Nenhum campo reconhecido — preencha manualmente.</div>}
              {Object.entries(result.fields).map(([k,f])=>(
                <div key={k} className="flex items-center gap-3 p-2 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                  <CheckCircle2 size={11} style={{ color: f.confidence>=90?C.green:C.yellow }} />
                  <span className="text-[11px] w-28 flex-shrink-0 capitalize" style={{ color:C.slate }}>{k}</span>
                  <span className="text-[11px] font-mono flex-1" style={{ color:C.text }}>{f.value}</span>
                  <span className="text-[10px] font-mono" style={{ color:f.confidence>=90?C.green:C.yellow }}>{f.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Formulário de Cadastro" right={status==="done" ? <span className="text-[11px] flex items-center gap-1" style={{ color:C.green }}><CheckCircle2 size={10}/> Auto-preenchido</span> : <span className="text-[11px] flex items-center gap-1" style={{ color:C.slate }}><ScanLine size={10}/> Aguardando OCR</span>} />
        <div className="grid grid-cols-2 gap-3">
          {fieldRow("Tag / Identificador","id",{ req:true })}
          {fieldRow("Nome do Ativo","nome")}
          {fieldRow("Tipo","tipo")}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color:C.slate }}>Criticidade</label>
            <select value={form.criticidade} onChange={(e)=>setForm({...form, criticidade:e.target.value as typeof form.criticidade})} className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
              {["Baixa","Média","Alta","Crítica"].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {fieldRow("Fabricante","fabricante")}
          {fieldRow("Modelo","modelo")}
          {fieldRow("Número de Série","serie")}
          {fieldRow("Potência (kW)","potenciaKw")}
          {fieldRow("Rotação (rpm)","rpmNominal")}
          {fieldRow("Tensão / Freq.","tensao")}
          {fieldRow("Planta","planta")}
          {fieldRow("Área","area")}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={()=>navigate("/cadastro")} className="flex-1 py-2 text-xs rounded-md transition-all" style={{ border:`1px solid ${C.border}`, color:C.slate }}>Formulário completo</button>
          <button onClick={cadastrar} className="flex-1 py-2 text-xs font-bold text-white rounded-md" style={{ background:C.cobalt }}>Cadastrar Ativo</button>
        </div>
      </div>
    </div>
  );
}
