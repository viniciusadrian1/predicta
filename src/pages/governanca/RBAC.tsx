// 20. RBAC ────────────────────────────────────────────────────────────────────
// Editable permission matrix (role × module) + a real users table. Editing a cell
// updates the store's RBAC matrix (which re-gates the sidebar and route guards);
// the per-user gear/lock buttons edit and block/unblock users. All mutations are
// gated by can("RBAC","full") and emit a toast.
import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Eye, XCircle, Search, Lock, Unlock, Settings, PlusCircle, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { Badge, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { useCan } from "@/auth/rbac";
import { initials } from "@/auth/useAuth";
import type { PermLevel, User } from "@/lib/types";

const NEXT: Record<PermLevel, PermLevel> = { none: "read", read: "full", full: "none" };
const ICON = (lvl: PermLevel) =>
  lvl === "full" ? <CheckCircle2 size={13} className="mx-auto" style={{ color: C.green }} />
  : lvl === "read" ? <Eye size={13} className="mx-auto" style={{ color: C.steel }} />
  : <XCircle size={13} className="mx-auto" style={{ color: `${C.slate}50` }} />;

const blankUser = (id: number, papel: string): User =>
  ({ id, nome: "", email: "", papel, status: "ativo", acesso: "—", mods: [] });

export default function RBAC() {
  const users = useStore((s) => s.users);
  const roles = useStore((s) => s.roles);
  const modules = useStore((s) => s.modules);
  const rbac = useStore((s) => s.rbac);
  const setRbac = useStore((s) => s.setRbac);
  const addUser = useStore((s) => s.addUser);
  const updateUser = useStore((s) => s.updateUser);
  const removeUser = useStore((s) => s.removeUser);
  const canEdit = useCan("RBAC", "full");

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<User | null>(null);   // user being edited/created
  const [isNew, setIsNew] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.nome} ${u.email} ${u.papel}`.toLowerCase().includes(q));
  }, [users, query]);

  const denied = () => toast.error("Sem permissão", { description: "Requer acesso total ao módulo RBAC." });

  const cycle = (role: string, mod: string) => {
    if (!canEdit) return;
    const cur = (rbac[role]?.[mod] ?? "none") as PermLevel;
    setRbac({ ...rbac, [role]: { ...rbac[role], [mod]: NEXT[cur] } });
  };

  const toggleAccess = (u: User) => {
    if (!canEdit) return denied();
    const status = u.status === "ativo" ? "inativo" : "ativo";
    updateUser(u.id, { status });
    toast.success(status === "ativo" ? "Acesso liberado" : "Acesso bloqueado", { description: u.nome });
  };

  const openEdit = (u: User) => { if (!canEdit) return denied(); setIsNew(false); setDraft({ ...u }); };
  const openNew = () => {
    if (!canEdit) return denied();
    const id = Math.max(0, ...users.map((u) => u.id)) + 1;
    setIsNew(true); setDraft(blankUser(id, roles[0] ?? ""));
  };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.nome.trim() || !draft.email.trim()) { toast.error("Preencha nome e e-mail."); return; }
    if (isNew) { addUser(draft); toast.success("Usuário criado", { description: draft.nome }); }
    else { updateUser(draft.id, draft); toast.success("Usuário atualizado", { description: draft.nome }); }
    setDraft(null);
  };

  const deleteDraft = () => {
    if (!draft) return;
    removeUser(draft.id);
    toast.success("Usuário removido", { description: draft.nome });
    setDraft(null);
  };

  const toggleMod = (m: string) =>
    setDraft((d) => d ? ({ ...d, mods: d.mods.includes(m) ? d.mods.filter((x) => x !== m) : [...d.mods, m] }) : d);

  usePageChrome(["Administração","Acessos"],
    <div className="flex gap-2">
      <IBtn icon={PlusCircle} label="Novo usuário" onClick={openNew} variant="primary" />
      <IBtn icon={Settings} label="Papéis" onClick={() => matrixRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    </div>
  );

  return (
    <>
      {/* Users */}
      <div className="rounded-lg overflow-hidden mb-4" style={{ border:`1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:`1px solid ${C.border}`, background:C.bgCard }}>
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>
            Usuários ({filtered.length}{query ? `/${users.length}` : ""})
          </span>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:C.slate }}/>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none w-40" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}/>
          </div>
        </div>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["Usuário","Papel","Status","Último Acesso","Módulos",""].map(h=>(
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u,i)=>(
              <tr key={u.id} className="transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined, opacity:u.status==="inativo"?0.6:1 }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>{initials(u.nome)}</div>
                    <div>
                      <div className="text-[12px] font-medium" style={{ color:C.text }}>{u.nome}</div>
                      <div className="text-[10px]" style={{ color:C.slate }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px]" style={{ color:C.textSub }}>{u.papel}</td>
                <td className="px-4 py-3"><Badge s={u.status}/></td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>{u.acesso}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.mods.slice(0,3).map((m)=><span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${C.cobalt}18`,color:C.steel,border:`1px solid ${C.cobalt}30`}}>{m}</span>)}
                    {u.mods.length>3&&<span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${C.slate}18`,color:C.slate,border:`1px solid ${C.border}`}}>+{u.mods.length-3}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={()=>openEdit(u)} disabled={!canEdit} title={canEdit?"Editar usuário":"Somente leitura"}
                      className="p-1 rounded hover:bg-[#0A1525] disabled:opacity-40 disabled:cursor-not-allowed" style={{ color:C.slate }}>
                      <Settings size={12}/>
                    </button>
                    <button onClick={()=>toggleAccess(u)} disabled={!canEdit}
                      title={canEdit?(u.status==="ativo"?"Bloquear acesso":"Liberar acesso"):"Somente leitura"}
                      className="p-1 rounded hover:bg-[#0A1525] disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color:u.status==="ativo"?C.slate:C.red }}>
                      {u.status==="ativo" ? <Unlock size={12}/> : <Lock size={12}/>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px]" style={{ color:C.slate }}>Nenhum usuário encontrado para “{query}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Permissions matrix */}
      <div ref={matrixRef} className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:`1px solid ${C.border}`, background:C.bgCard }}>
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>Matriz de Permissões por Papel</span>
          <span className="text-[10px]" style={{ color: canEdit?C.steel:C.slate }}>{canEdit ? "Clique numa célula para alternar none → read → full" : "Somente leitura"}</span>
        </div>
        <div className="overflow-x-auto" style={{ background:C.bgCard }}>
          <table className="w-full">
            <thead style={{ borderBottom:`1px solid ${C.border}` }}>
              <tr>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] w-40" style={{ color:C.slate }}>Papel</th>
                {modules.map(m=><th key={m} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-center" style={{ color:C.slate }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {roles.map((r,i)=>(
                <tr key={r} style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                  <td className="px-4 py-2.5 text-[12px] font-medium" style={{ color:C.textSub }}>{r}</td>
                  {modules.map(m=>(
                    <td key={m} className="px-3 py-2.5 text-center">
                      <button disabled={!canEdit} onClick={()=>cycle(r,m)} className={`mx-auto block ${canEdit?"hover:scale-125 transition-transform cursor-pointer":""}`} title={canEdit?"Alternar permissão":undefined}>
                        {ICON((rbac[r]?.[m] ?? "none") as PermLevel)}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-5 px-4 py-3 text-[11px]" style={{ borderTop:`1px solid ${C.border}`, background:C.bgCard, color:C.slate }}>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={11} style={{ color:C.green }}/> Acesso total</span>
          <span className="flex items-center gap-1.5"><Eye size={11} style={{ color:C.steel }}/> Somente leitura</span>
          <span className="flex items-center gap-1.5"><XCircle size={11} style={{ color:`${C.slate}50` }}/> Sem acesso</span>
        </div>
      </div>

      {/* User editor modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(3,8,18,0.7)" }} onClick={()=>setDraft(null)}>
          <div className="w-full max-w-md rounded-lg overflow-hidden" style={{ background:C.bgCard, border:`1px solid ${C.border}` }} onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:`1px solid ${C.border}` }}>
              <span className="text-[13px] font-bold uppercase tracking-widest" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>
                {isNew ? "Novo usuário" : "Editar usuário"}
              </span>
              <button onClick={()=>setDraft(null)} className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.slate }}><X size={15}/></button>
            </div>

            <div className="px-4 py-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color:C.slate }}>Nome</label>
                <input value={draft.nome} onChange={(e)=>setDraft({ ...draft, nome:e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-md focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}/>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color:C.slate }}>E-mail</label>
                <input value={draft.email} onChange={(e)=>setDraft({ ...draft, email:e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-md focus:outline-none font-mono" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color:C.slate }}>Papel</label>
                  <select value={draft.papel} onChange={(e)=>setDraft({ ...draft, papel:e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-md focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
                    {roles.map((r)=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color:C.slate }}>Status</label>
                  <div className="flex rounded-md overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
                    {(["ativo","inativo"] as const).map((st)=>(
                      <button key={st} onClick={()=>setDraft({ ...draft, status:st })}
                        className="flex-1 px-2 py-1.5 text-[11px] capitalize transition-colors"
                        style={{ background: draft.status===st ? (st==="ativo"?`${C.green}20`:`${C.slate}25`) : "transparent",
                          color: draft.status===st ? (st==="ativo"?C.green:C.text) : C.slate }}>{st}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color:C.slate }}>Módulos com acesso</label>
                <div className="flex flex-wrap gap-1.5">
                  {modules.map((m)=>{
                    const on = draft.mods.includes(m);
                    return (
                      <button key={m} onClick={()=>toggleMod(m)}
                        className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
                        style={{ background: on?`${C.cobalt}25`:`${C.slate}12`, color: on?C.steel:C.slate, border:`1px solid ${on?`${C.cobalt}45`:C.border}` }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:`1px solid ${C.border}` }}>
              {!isNew
                ? <button onClick={deleteDraft} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/15 border border-red-500/25"><Trash2 size={12}/> Remover</button>
                : <span/>}
              <div className="flex gap-2">
                <IBtn label="Cancelar" icon={X} onClick={()=>setDraft(null)} />
                <IBtn label="Salvar" icon={CheckCircle2} onClick={saveDraft} variant="primary" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
