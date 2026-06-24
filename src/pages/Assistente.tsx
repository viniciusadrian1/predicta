// 14–15. Assistente IA ────────────────────────────────────────────────────────
// Real streaming assistant via the secure /api/assistant proxy, with client-side
// tool execution (get_twin_state, list_alerts, run_whatif, create_work_order,
// get_fleet_summary) against the live store/engine.
// Conversations are saved as sessions in the store (persisted to localStorage):
// a history panel lists past chats; each turn auto-saves to the active session.
import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { Cpu, Plus, Bot, User, Send, Loader2, Wrench, MessageSquare, Trash2, BookText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { streamAssistant, type ChatMessage } from "@/ai/assistant";
import { ASSISTANT_TOOLS, executeTool } from "@/ai/tools";
import { queryRag } from "@/ai/rag";
import { fmtDateTime } from "@/lib/format";
import { FAILURE_MODE_LABEL, type ChatBubble } from "@/lib/types";

const CONF_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  alta:  { bg: "rgba(52,211,153,0.12)", fg: C.green,  label: "Confiança alta" },
  media: { bg: "rgba(251,191,36,0.12)", fg: C.yellow, label: "Confiança média" },
  baixa: { bg: "rgba(248,113,113,0.12)", fg: C.red,   label: "Confiança baixa" },
};

const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "chat-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function Assistente() {
  const { assetId } = useParams();
  const assets = useStore((s) => s.assets);
  const twins = useStore((s) => s.twins);
  const alerts = useStore((s) => s.alerts);
  const chats = useStore((s) => s.chats);
  const activeChatId = useStore((s) => s.activeChatId);
  const createChat = useStore((s) => s.createChat);
  const updateChat = useStore((s) => s.updateChat);
  const deleteChat = useStore((s) => s.deleteChat);
  const setActiveChat = useStore((s) => s.setActiveChat);
  const session = useStore((s) => s.session);
  const [ragMode, setRagMode] = useState(false);

  const asset = assets.find((a) => a.id === assetId);
  const twin = assetId ? twins[assetId] : undefined;
  const ctx = !!asset;
  const navigate = useNavigate();

  // Regex of real asset tags → auto-link any asset the assistant mentions.
  const assetRe = useMemo(() => {
    const ids = assets.map((a) => a.id).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!ids.length) return null;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b(${ids.map(esc).join("|")})\\b`, "g");
  }, [assets]);

  // Split a text run on asset tags → clickable links; non-link parts keep bold if asked.
  const linkify = (text: string, key: string, bold: boolean) => {
    const wrap = (seg: string, k: string) => bold ? <strong key={k} style={{ color: C.steel }}>{seg}</strong> : <span key={k}>{seg}</span>;
    if (!assetRe || !text) return wrap(text, key);
    const nodes: JSX.Element[] = [];
    let last = 0; assetRe.lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = assetRe.exec(text)) !== null) {
      if (m.index > last) nodes.push(wrap(text.slice(last, m.index), `${key}-s${last}`));
      const id = m[0];
      nodes.push(
        <button key={`${key}-a${m.index}`} onClick={() => navigate(`/ativos/${id}/overview`)}
          title={`Abrir ativo ${id}`}
          className="font-mono underline decoration-dotted underline-offset-2 transition-all hover:brightness-125"
          style={{ color: C.steel, fontWeight: bold ? 700 : undefined }}>{id}</button>,
      );
      last = m.index + id.length;
    }
    if (nodes.length === 0) return wrap(text, key);
    if (last < text.length) nodes.push(wrap(text.slice(last), `${key}-s${last}`));
    return <span key={key}>{nodes}</span>;
  };

  // Render a line: **bold** + clickable asset tags (works inside or outside bold).
  const renderRich = (line: string, key: string) =>
    line.split(/\*\*(.*?)\*\*/).map((pt, pi) => linkify(pt, `${key}-${pi}`, pi % 2 === 1));

  const greeting = ctx
    ? `Olá! Estou com o ativo **${asset!.id} — ${asset!.nome}** em contexto. Posso analisar telemetria, predição de falha (RUL ${twin?.rulDias ?? "—"} dias, modo dominante ${twin ? FAILURE_MODE_LABEL[twin.modoCritico] : "—"}), simular cenários "e se…" e gerar ordens de serviço. O que deseja?`
    : `Olá! Sou o Assistente Técnico Predicta. Posso analisar a frota, alertas, telemetria e rodar simulações do gêmeo digital. Como posso ajudar?`;

  // bubbles live in a ref-backed state so async turns can read the latest synchronously
  const [bubbles, setBubblesState] = useState<ChatBubble[]>([{ role: "ai", text: greeting }]);
  const bubblesRef = useRef<ChatBubble[]>(bubbles);
  const setBubbles = (u: ChatBubble[] | ((p: ChatBubble[]) => ChatBubble[])) => {
    bubblesRef.current = typeof u === "function" ? (u as (p: ChatBubble[]) => ChatBubble[])(bubblesRef.current) : u;
    setBubblesState(bubblesRef.current);
  };

  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const convoRef = useRef<ChatMessage[]>([]);
  const chatIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [bubbles, busy]);

  // On mount / context change: continue the active session if it matches this
  // context, otherwise start a fresh (unsaved) conversation for this context.
  useEffect(() => {
    const cur = useStore.getState().chats.find((c) => c.id === useStore.getState().activeChatId);
    if (cur && (cur.assetId ?? null) === (assetId ?? null)) {
      chatIdRef.current = cur.id;
      convoRef.current = (cur.convo as ChatMessage[]) ?? [];
      setBubbles(cur.bubbles.length ? cur.bubbles : [{ role: "ai", text: greeting }]);
    } else {
      chatIdRef.current = null;
      convoRef.current = [];
      setBubbles([{ role: "ai", text: greeting }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const suggestions = ragMode
    ? ["Intervalo de relubrificação do rolamento 6314 (W22 TEFC, 4 polos, 60 Hz)?", "Plano de pintura WEG para ambiente C4?", "Tensão de ensaio do megôhmetro para enrolamento de 4160 V?", "Fator de correção de potência a 50 °C e 2000 m?"]
    : ctx
    ? ["Qual a causa provável da degradação?", "Simular impacto da parada", "Plano de manutenção recomendado", "Gerar ordem de serviço"]
    : ["Qual ativo tem pior saúde?", "Listar alertas críticos", "Resumo operacional do dia", "Planejar manutenções do mês"];

  function buildSystem(): string {
    const st = useStore.getState();
    let sys = `Você é o Assistente Técnico do Predicta (by Forzy), uma plataforma de manutenção preditiva industrial. ` +
      `Responda SEMPRE em português do Brasil, de forma técnica, objetiva e concisa. Use **negrito** para destacar termos-chave. ` +
      `Você tem ferramentas para consultar o estado dos gêmeos digitais, listar alertas, rodar simulações "e se" e criar ordens de serviço — ` +
      `use-as para obter dados atuais em vez de inventar números. Nunca invente métricas; chame a ferramenta apropriada. ` +
      `Para perguntas sobre especificações de manuais do fabricante (lubrificação, torque, tensão de ensaio, rolamentos, planos de pintura, motores WEG W21/W22 etc.), use SEMPRE a ferramenta consultar_base_tecnica e NÃO responda de memória. ` +
      `A predição de falha vem de um gêmeo digital com modelo de degradação simulado (físico-informado), não de um modelo treinado em falhas reais.\n\n` +
      `Data/hora simulada atual: ${fmtDateTime(st.simClock)}.\n`;
    if (asset && twin) {
      sys += `\nAtivo em foco:\n${JSON.stringify(executeTool("get_twin_state", { assetId: asset.id }))}`;
    } else {
      sys += `\nResumo da frota:\n${JSON.stringify(executeTool("get_fleet_summary", {}))}`;
    }
    return sys;
  }

  // Persist the live conversation into its saved session (lazy-creating on first send).
  const saveActive = (title?: string) => {
    const id = chatIdRef.current;
    if (!id) return;
    updateChat(id, { bubbles: bubblesRef.current, convo: convoRef.current, ...(title ? { title } : {}) });
  };

  async function runTurn(messages: ChatMessage[], depth = 0): Promise<void> {
    setBusy(true);
    abortRef.current = new AbortController();
    let createdIdx = -1;
    let acc = "";
    let result: { text: string; toolCalls: { id: string; name: string; input: Record<string, unknown> }[]; finishReason: string | null } | null = null;

    const writeAi = (text: string) =>
      setBubbles((prev) => {
        if (createdIdx === -1) { createdIdx = prev.length; return [...prev, { role: "ai", text }]; }
        const copy = prev.slice(); copy[createdIdx] = { role: "ai", text }; return copy;
      });

    await streamAssistant(
      { system: buildSystem(), messages, tools: ASSISTANT_TOOLS },
      {
        onText: (d) => { acc += d; writeAi(acc); },
        onDone: (r) => { result = r; },
        onError: (m) => { writeAi("⚠️ " + m); toast.error("Assistente", { description: m }); },
      },
      abortRef.current.signal,
    );

    if (!result) { convoRef.current = messages; setBusy(false); saveActive(); return; }

    const r = result as { text: string; toolCalls: { id: string; name: string; input: Record<string, unknown> }[]; finishReason: string | null };
    const assistantMsg: ChatMessage = r.toolCalls.length
      ? { role: "assistant", content: r.text || null, tool_calls: r.toolCalls.map((tc) => ({ id: tc.id, type: "function", function: { name: tc.name, arguments: JSON.stringify(tc.input) } })) }
      : { role: "assistant", content: r.text };
    const next: ChatMessage[] = [...messages, assistantMsg];

    if (r.finishReason === "tool_calls" && r.toolCalls.length && depth < 5) {
      setBubbles((prev) => [...prev, { role: "tool", text: `Consultou: ${r.toolCalls.map((t) => t.name === "consultar_base_tecnica" ? "base técnica" : t.name).join(", ")}` }]);
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const toolMsgs: ChatMessage[] = [];
      let ragAnswered = false;
      for (const tc of r.toolCalls) {
        if (tc.name === "consultar_base_tecnica") {
          // Resposta fundamentada nos manuais técnicos (cite-or-refuse + confiança).
          try {
            const pergunta = String((tc.input as { pergunta?: string }).pergunta ?? "").trim() || String(lastUser?.content ?? "");
            const res = await queryRag(pergunta, { role: session.papel, signal: abortRef.current?.signal });
            setBubbles((prev) => [...prev, { role: "ai", text: res.answer, citations: res.citations, confidence: res.confidence, noSource: res.citations.length === 0 }]);
            toolMsgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ answer: res.answer, confidence: res.confidence, citations: res.citations.map((c) => ({ doc: c.doc_title, secao: c.section, pagina: c.page })) }) });
            ragAnswered = true;
          } catch (e) {
            if ((e as { name?: string })?.name === "AbortError") { setBusy(false); return; }
            const m = e instanceof Error ? e.message : "Falha ao consultar a base técnica.";
            setBubbles((prev) => [...prev, { role: "ai", text: "⚠️ " + m }]);
            toolMsgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ erro: m }) });
            ragAnswered = true;
          }
        } else {
          toolMsgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(executeTool(tc.name, tc.input)) });
        }
      }
      convoRef.current = [...next, ...toolMsgs];
      saveActive();
      // O RAG já produziu a resposta fundamentada e citada — ela É a resposta final.
      if (ragAnswered) { setBusy(false); saveActive(); return; }
      await runTurn([...next, ...toolMsgs], depth + 1);
      return;
    }
    convoRef.current = next;
    setBusy(false);
    saveActive();
  }

  // RAG turn: grounded answer from the technical manuals (cite-or-refuse + confidence).
  async function ragTurn(query: string): Promise<void> {
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      const res = await queryRag(query, { role: session.papel, signal: abortRef.current.signal });
      setBubbles((prev) => [...prev, { role: "ai", text: res.answer, citations: res.citations, confidence: res.confidence, noSource: res.citations.length === 0 }]);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") { setBusy(false); return; }
      const msg = e instanceof Error ? e.message : "Falha ao consultar a base técnica.";
      setBubbles((prev) => [...prev, { role: "ai", text: "⚠️ " + msg }]);
      toast.error("Base técnica", { description: msg });
    } finally {
      setBusy(false);
      saveActive();
    }
  }

  const send = (text?: string) => {
    const msg = (text ?? inp).trim();
    if (!msg || busy) return;
    setInp("");
    setBubbles((prev) => [...prev, { role: "user", text: msg }]);
    const convoNext: ChatMessage[] = [...convoRef.current, { role: "user", content: msg }];

    if (!chatIdRef.current) {
      const id = newId();
      chatIdRef.current = id;
      const t = Date.now();
      createChat({ id, title: msg.slice(0, 48), assetId: assetId ?? null, bubbles: bubblesRef.current, convo: convoNext, createdAt: t, updatedAt: t });
    } else {
      saveActive();
    }
    if (ragMode) ragTurn(msg); else runTurn(convoNext);
  };

  const novaConversa = () => {
    abortRef.current?.abort();
    chatIdRef.current = null;
    convoRef.current = [];
    setActiveChat(null);
    setBusy(false);
    setBubbles([{ role: "ai", text: greeting }]);
  };

  const openChat = (id: string) => {
    const c = useStore.getState().chats.find((x) => x.id === id);
    if (!c) return;
    abortRef.current?.abort();
    setBusy(false);
    chatIdRef.current = c.id;
    convoRef.current = (c.convo as ChatMessage[]) ?? [];
    setActiveChat(c.id);
    setBubbles(c.bubbles.length ? c.bubbles : [{ role: "ai", text: greeting }]);
  };

  const removeChat = (id: string) => {
    deleteChat(id);
    if (chatIdRef.current === id) novaConversa();
    toast.success("Conversa excluída");
  };

  usePageChrome(["Assistente", ctx ? `Contexto: ${asset!.id}` : "Assistente IA"],
    <div className="flex items-center gap-2">
      {ctx && <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs" style={{ background:`${C.cobalt}18`, border:`1px solid ${C.cobalt}35`, color:C.steel }}><Cpu size={11}/> Contexto: {asset!.id}</div>}
      <button onClick={() => setRagMode((v) => !v)} title="Responder a partir dos manuais técnicos (RAG), com citação de fonte e confiança"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all"
        style={ragMode ? { background: C.cobalt, color: "#fff" } : { border: `1px solid ${C.border}`, color: C.slate }}>
        <BookText size={12} /> Base técnica
      </button>
      <IBtn icon={Plus} label="Nova conversa" onClick={novaConversa} />
    </div>
  );

  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex gap-4" style={{ height:"calc(100vh - 148px)" }}>
      {/* Conversation history */}
      <div className="w-60 flex flex-col rounded-lg overflow-hidden flex-shrink-0" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom:`1px solid ${C.border}` }}>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>Conversas</span>
          <button onClick={novaConversa} title="Nova conversa" className="p-1 rounded hover:bg-[#112035] transition-all" style={{ color:C.steel }}><Plus size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedChats.length === 0 && (
            <div className="text-[10px] text-center px-2 py-6" style={{ color:C.slate }}>Nenhuma conversa salva ainda.<br/>Envie uma mensagem para começar.</div>
          )}
          {sortedChats.map((c) => {
            const active = c.id === activeChatId;
            return (
              <div key={c.id} onClick={()=>openChat(c.id)}
                className="group flex items-start gap-2 p-2 rounded-md cursor-pointer transition-all"
                style={{ background: active ? `${C.cobalt}1F` : "transparent", border:`1px solid ${active ? `${C.cobalt}45` : "transparent"}` }}>
                <MessageSquare size={12} className="mt-0.5 flex-shrink-0" style={{ color: active ? C.steel : C.slate }}/>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate" style={{ color:C.text }}>{c.title || "Conversa"}</div>
                  <div className="text-[9px] font-mono mt-0.5 flex items-center gap-1.5" style={{ color:C.slate }}>
                    {c.assetId && <span className="px-1 rounded" style={{ background:`${C.cobalt}20`, color:C.steel }}>{c.assetId}</span>}
                    {fmtDateTime(c.updatedAt)}
                  </div>
                </div>
                <button onClick={(e)=>{ e.stopPropagation(); removeChat(c.id); }} title="Excluir conversa"
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/15 transition-all flex-shrink-0" style={{ color:C.slate }}>
                  <Trash2 size={11}/>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col rounded-lg overflow-hidden" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {bubbles.map((m, i) => m.role === "tool" ? (
            <div key={i} className="flex justify-center">
              <span className="text-[10px] font-mono flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.slate }}>
                <Wrench size={9} style={{ color:C.steel }}/> {m.text}
              </span>
            </div>
          ) : (
            <div key={i} className={`flex gap-3 ${m.role==="user"?"flex-row-reverse":""}`}>
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background:m.role==="ai"?`linear-gradient(135deg,${C.cobalt},${C.navy})`:"rgba(130,200,229,0.15)" }}>
                {m.role==="ai"?<Bot size={13} className="text-white"/>:<User size={13} style={{ color:C.steel }}/>}
              </div>
              <div className="max-w-[75%] px-3.5 py-2.5 rounded-xl text-[12px] leading-relaxed"
                style={m.role==="ai"
                  ? { background:"#0F1E35", border:`1px solid ${C.border}`, color:C.text }
                  : { background:`${C.cobalt}28`, border:`1px solid ${C.cobalt}40`, color:C.text }}>
                {m.text.split('\n').map((ln,li)=>(
                  <p key={li} className={li>0?"mt-1.5":""}>
                    {renderRich(ln, `${i}-${li}`)}
                  </p>
                ))}
                {(m.confidence || m.noSource || (m.citations && m.citations.length > 0)) && (
                  <div className="mt-2 pt-2 space-y-1.5" style={{ borderTop:`1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.confidence && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: CONF_STYLE[m.confidence].bg, color: CONF_STYLE[m.confidence].fg }}>
                          <ShieldCheck size={9} /> {CONF_STYLE[m.confidence].label}
                        </span>
                      )}
                      {m.noSource && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background:`${C.slate}20`, color:C.slate }}>
                          Sem fonte nos documentos
                        </span>
                      )}
                    </div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase tracking-wider" style={{ color:C.slate }}>Fontes</div>
                        {m.citations.map((c, ci) => (
                          <details key={ci} className="text-[10px]">
                            <summary className="cursor-pointer font-mono" style={{ color:C.steel }}>
                              [{ci + 1}] {c.doc_title}{c.section ? ` — ${c.section}` : ""}{c.page != null ? ` (p.${c.page})` : ""}
                            </summary>
                            <div className="mt-1 p-2 rounded" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.textSub }}>{c.snippet}…</div>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}><Bot size={13} className="text-white"/></div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px]" style={{ background:"#0F1E35", border:`1px solid ${C.border}`, color:C.slate }}>
                <Loader2 size={12} className="animate-spin" style={{ color:C.steel }}/> Analisando…
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestions.map(sg=>(
            <button key={sg} onClick={()=>send(sg)} disabled={busy} className="text-[11px] px-2.5 py-1.5 rounded-full transition-all disabled:opacity-40"
              style={{ border:`1px solid ${C.border}`, color:C.slate }}>{sg}</button>
          ))}
        </div>

        <div className="p-3" style={{ borderTop:`1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
            <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder={ragMode ? "Pergunte sobre os manuais técnicos (WEG)..." : ctx ? `Pergunte sobre ${asset!.id}...` : "Pergunte sobre seus ativos..."}
              className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color:C.text }} />
            <button onClick={()=>send()} disabled={!inp.trim()||busy} className="p-1.5 rounded-md text-white transition-all disabled:opacity-40 hover:brightness-110" style={{ background:C.cobalt }}>
              <Send size={12}/>
            </button>
          </div>
        </div>
      </div>

      {/* Context panel */}
      {ctx && twin && (
        <div className="w-56 space-y-3 overflow-y-auto">
          <div className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.cobalt}35` }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:C.slate }}>Contexto Ativo</div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35` }}><Cpu size={14} style={{ color:C.steel }} /></div>
              <div>
                <div className="text-[11px] font-semibold" style={{ color:C.text }}>{asset!.id}</div>
                <div className="text-[10px]" style={{ color:C.slate }}>{asset!.nome}</div>
              </div>
            </div>
            {[
              ["Saúde", `${twin.health}%`, twin.health>=75?C.green:twin.health>=50?C.yellow:C.red],
              ["Status", twin.status, C.steel],
              ["RUL", `${twin.rulDias} d`, C.steel],
              ["Temp.", `${twin.state.temp.toFixed(1)}°C`, C.orange],
              ["Vibração", `${twin.state.vib.toFixed(2)} mm/s`, C.yellow],
            ].map(([l,v,c])=>(
              <div key={l as string} className="flex justify-between text-[11px] mb-1.5">
                <span style={{ color:C.slate }}>{l}</span>
                <span className="font-mono font-bold" style={{ color:c as string }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:C.slate }}>Alertas do Ativo</div>
            {alerts.filter(a=>a.assetId===asset!.id && a.status!=="resolvido").slice(0,4).map(a=>(
              <div key={a.id} className="p-2 rounded-md mb-2" style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)" }}>
                <div className="text-[11px] font-medium text-yellow-400">{a.titulo}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color:C.slate }}>{a.id}</div>
              </div>
            ))}
            {alerts.filter(a=>a.assetId===asset!.id && a.status!=="resolvido").length===0 && <div className="text-[10px]" style={{ color:C.slate }}>Nenhum alerta aberto.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
