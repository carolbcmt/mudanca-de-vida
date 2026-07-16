import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  GraduationCap,
  CheckSquare,
  Layers,
  Plus,
  Trash2,
  Download,
  Calendar,
  X,
  LogOut,
  Check,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { conectarGoogleAgenda, criarEventoAgenda, estaConectado } from "../lib/googleCalendar";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const PALETTE = ["#8B7FC7", "#C98AA8", "#6FA3AE", "#C9A26B", "#7FA98A"];

const TIPOS = {
  livro: { label: "Leitura", Icon: BookOpen },
  curso: { label: "Curso", Icon: GraduationCap },
  tarefa: { label: "Tarefa", Icon: CheckSquare },
  outro: { label: "Outro", Icon: Layers },
};

const T = {
  bg: "#F4F4F4",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA",
  border: "#E6E6E6",
  text: "#2C2C2E",
  textMuted: "#7A7A7E",
  textFaint: "#ABABB0",
  warnBg: "#FBF1F0",
  warnBorder: "#EFD8D6",
  warnText: "#B06B63",
  shadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 18px rgba(0,0,0,0.05)",
  gradiente: "linear-gradient(90deg, #8B7FC7, #C98AA8)",
};

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatICSDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatICSDateTime(d, horaStr) {
  const [h, min] = horaStr.split(":").map(Number);
  const withTime = new Date(d);
  withTime.setHours(h, min, 0, 0);
  const y = withTime.getFullYear();
  const m = String(withTime.getMonth() + 1).padStart(2, "0");
  const day = String(withTime.getDate()).padStart(2, "0");
  const hh = String(withTime.getHours()).padStart(2, "0");
  const mm = String(withTime.getMinutes()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}00`;
}

function dataISOParaDia(monday, diaIdx) {
  const d = new Date(monday);
  d.setDate(monday.getDate() + diaIdx);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Dashboard({ session }) {
  const userId = session.user.id;
  const monday = useMemo(() => getMonday(new Date()), []);

  const [projects, setProjects] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("livro");
  const [etapaDrafts, setEtapaDrafts] = useState({});
  const [novoPendente, setNovoPendente] = useState("");
  const [pendingInboxId, setPendingInboxId] = useState(null);

  const [googleConectado, setGoogleConectado] = useState(false);
  const [enviandoAgenda, setEnviandoAgenda] = useState(false);
  const [avisoAgenda, setAvisoAgenda] = useState("");

  const carregarTudo = async () => {
    setCarregando(true);
    const [{ data: proj }, { data: et }, { data: pend }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at"),
      supabase.from("etapas").select("*").order("created_at"),
      supabase.from("pendencias").select("*").order("created_at"),
    ]);
    setProjects(proj || []);
    setEtapas(et || []);
    setInbox(pend || []);
    setCarregando(false);
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  const projetosComEtapas = useMemo(() => {
    return projects.map((p) => ({
      ...p,
      etapas: etapas.filter((e) => e.project_id === p.id),
    }));
  }, [projects, etapas]);

  const addProject = async () => {
    if (!newName.trim()) return;
    const cor = PALETTE[projects.length % PALETTE.length];
    const { data, error } = await supabase
      .from("projects")
      .insert({ nome: newName.trim(), tipo: newType, cor, user_id: userId })
      .select()
      .single();
    if (!error && data) {
      setProjects((prev) => [...prev, data]);
      if (pendingInboxId) {
        await supabase.from("pendencias").delete().eq("id", pendingInboxId);
        setInbox((prev) => prev.filter((i) => i.id !== pendingInboxId));
        setPendingInboxId(null);
      }
    }
    setNewName("");
    setNewType("livro");
    setNewProjectOpen(false);
  };

  const deleteProject = async (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setEtapas((prev) => prev.filter((e) => e.project_id !== id));
    await supabase.from("projects").delete().eq("id", id);
  };

  const addEtapa = async (projectId) => {
    const texto = (etapaDrafts[projectId] || "").trim();
    if (!texto) return;
    const { data, error } = await supabase
      .from("etapas")
      .insert({ project_id: projectId, titulo: texto, user_id: userId })
      .select()
      .single();
    if (!error && data) setEtapas((prev) => [...prev, data]);
    setEtapaDrafts((prev) => ({ ...prev, [projectId]: "" }));
  };

  const toggleEtapa = async (etapaId) => {
    const atual = etapas.find((e) => e.id === etapaId);
    if (!atual) return;
    const novoValor = !atual.concluida;
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, concluida: novoValor } : e))
    );
    await supabase.from("etapas").update({ concluida: novoValor }).eq("id", etapaId);
  };

  const deleteEtapa = async (etapaId) => {
    setEtapas((prev) => prev.filter((e) => e.id !== etapaId));
    await supabase.from("etapas").delete().eq("id", etapaId);
  };

  const setEtapaDia = async (etapaId, dia) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, dia: dia || null } : e))
    );
    await supabase.from("etapas").update({ dia: dia || null }).eq("id", etapaId);
  };

  const setEtapaHora = async (etapaId, hora) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === etapaId ? { ...e, hora: hora || null } : e))
    );
    await supabase.from("etapas").update({ hora: hora || null }).eq("id", etapaId);
  };

  const addPendente = async () => {
    const texto = novoPendente.trim();
    if (!texto) return;
    const { data, error } = await supabase
      .from("pendencias")
      .insert({ texto, user_id: userId })
      .select()
      .single();
    if (!error && data) setInbox((prev) => [...prev, data]);
    setNovoPendente("");
  };

  const deletePendente = async (id) => {
    setInbox((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("pendencias").delete().eq("id", id);
  };

  const promoverPendente = (item) => {
    setNewName(item.texto);
    setNewType("tarefa");
    setPendingInboxId(item.id);
    setNewProjectOpen(true);
  };

  const semanaItens = useMemo(() => {
    const mapa = {};
    DIAS.forEach((d) => (mapa[d] = []));
    projetosComEtapas.forEach((p) => {
      p.etapas.forEach((e) => {
        if (e.dia && mapa[e.dia]) mapa[e.dia].push({ projeto: p, etapa: e });
      });
    });
    DIAS.forEach((d) => {
      mapa[d].sort((a, b) => {
        if (!a.etapa.hora && !b.etapa.hora) return 0;
        if (!a.etapa.hora) return 1;
        if (!b.etapa.hora) return -1;
        return a.etapa.hora.localeCompare(b.etapa.hora);
      });
    });
    return mapa;
  }, [projetosComEtapas]);

  const exportarICS = () => {
    let ics =
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Mudanca de Vida//PT-BR\r\nCALSCALE:GREGORIAN\r\n";
    DIAS.forEach((dia, idx) => {
      const data = new Date(monday);
      data.setDate(monday.getDate() + idx);
      const dataStr = formatICSDate(data);
      semanaItens[dia].forEach(({ projeto, etapa }) => {
        ics += "BEGIN:VEVENT\r\n";
        ics += `UID:${etapa.id}-${dataStr}@mudancadevida\r\n`;
        if (etapa.hora) {
          const inicio = formatICSDateTime(data, etapa.hora);
          const [h, min] = etapa.hora.split(":").map(Number);
          const fimDate = new Date(data);
          fimDate.setHours(h, min, 0, 0);
          fimDate.setHours(fimDate.getHours() + 1);
          const fim = formatICSDateTime(data, `${fimDate.getHours()}:${fimDate.getMinutes()}`);
          ics += `DTSTART:${inicio}\r\nDTEND:${fim}\r\n`;
        } else {
          ics += `DTSTART;VALUE=DATE:${dataStr}\r\n`;
        }
        ics += `SUMMARY:${TIPOS[projeto.tipo].label}: ${projeto.nome} — ${etapa.titulo}\r\n`;
        ics += `STATUS:${etapa.concluida ? "COMPLETED" : "CONFIRMED"}\r\n`;
        ics += "END:VEVENT\r\n";
      });
    });
    ics += "END:VCALENDAR\r\n";
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cronograma-semana.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConectarGoogle = async () => {
    setAvisoAgenda("");
    try {
      await conectarGoogleAgenda();
      setGoogleConectado(true);
    } catch (e) {
      setAvisoAgenda("Não foi possível conectar à Google Agenda. Tente de novo.");
    }
  };

  const enviarSemanaParaAgenda = async () => {
    if (!estaConectado()) {
      await handleConectarGoogle();
    }
    setEnviandoAgenda(true);
    setAvisoAgenda("");
    try {
      let count = 0;
      for (let idx = 0; idx < DIAS.length; idx++) {
        const dia = DIAS[idx];
        const dataISO = dataISOParaDia(monday, idx);
        for (const { projeto, etapa } of semanaItens[dia]) {
          await criarEventoAgenda({
            titulo: `${TIPOS[projeto.tipo].label}: ${projeto.nome} — ${etapa.titulo}`,
            dataISO,
            hora: etapa.hora,
          });
          count++;
        }
      }
      setAvisoAgenda(`${count} evento(s) criado(s) na Google Agenda.`);
    } catch (e) {
      setAvisoAgenda(e.message || "Erro ao enviar eventos para a Agenda.");
    }
    setEnviandoAgenda(false);
  };

  const totalEtapas = etapas.length;
  const totalConcluidas = etapas.filter((e) => e.concluida).length;

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
        <p style={{ color: T.textMuted }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: T.bg, color: T.text, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: "#6FA3AE" }}>
              Semana de {monday.toLocaleDateString("pt-BR")}
            </p>
            <h1 className="font-display text-4xl font-bold">
              <span
                style={{
                  backgroundImage: T.gradiente,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Mudança
              </span>{" "}
              de Vida
            </h1>
            <p className="mt-2 text-sm" style={{ color: T.textMuted }}>
              {totalConcluidas} de {totalEtapas} etapas concluídas nesta semana
            </p>
          </div>
          <div className="flex gap-2 items-start">
            <button
              onClick={exportarICS}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.text }}
            >
              <Download size={16} /> .ics
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, border: `1px solid ${T.border}`, backgroundColor: T.surface }}
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Google Agenda */}
        <div
          className="px-4 py-3 rounded-xl mb-10"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} style={{ color: "#6FA3AE" }} />
              <span style={{ color: T.textMuted }}>
                {googleConectado
                  ? "Conectado à Google Agenda para esta sessão."
                  : "Conecte para enviar as etapas da semana direto pra Google Agenda."}
              </span>
            </div>
            <button
              onClick={enviarSemanaParaAgenda}
              disabled={enviandoAgenda}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-semibold text-white"
              style={{ backgroundImage: T.gradiente }}
            >
              {googleConectado ? <Check size={14} /> : <Calendar size={14} />}
              {enviandoAgenda
                ? "Enviando..."
                : googleConectado
                ? "Enviar semana pra Agenda"
                : "Conectar e enviar semana"}
            </button>
          </div>
          {avisoAgenda && (
            <p className="text-xs mt-2" style={{ color: T.textMuted }}>{avisoAgenda}</p>
          )}
        </div>

        {/* Pendências */}
        <div className="mb-10 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.warnBorder}`, backgroundColor: T.warnBg, boxShadow: T.shadow }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: T.warnBorder }}>
            <div>
              <h2 className="font-display text-lg font-bold">Pendências</h2>
              <p className="text-xs" style={{ color: T.warnText }}>
                Tudo que está atrasado ou solto, antes de virar projeto
              </p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            {inbox.length === 0 && (
              <p className="text-xs italic" style={{ color: T.textFaint }}>nada pendente</p>
            )}
            {inbox.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: T.surface, border: `1px solid ${T.warnBorder}` }}>
                <span className="flex-1">{item.texto}</span>
                <button onClick={() => promoverPendente(item)} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ backgroundImage: T.gradiente }}>
                  Transformar em projeto
                </button>
                <button onClick={() => deletePendente(item.id)} style={{ color: T.warnText }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input
                value={novoPendente}
                onChange={(e) => setNovoPendente(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPendente()}
                placeholder="O que está atrasado? Ex: revisar processo X"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ border: `1px solid ${T.warnBorder}`, backgroundColor: T.surface }}
              />
              <button onClick={addPendente} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: T.warnBorder }}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Projetos */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Projetos</h2>
            <button onClick={() => setNewProjectOpen((v) => !v)} className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundImage: T.gradiente }}>
              <Plus size={15} /> Novo projeto
            </button>
          </div>

          {newProjectOpen && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-4 rounded-xl" style={{ border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do projeto"
                className="flex-1 min-w-48 px-3 py-2 rounded-lg text-sm"
                style={{ border: `1px solid ${T.border}`, backgroundColor: T.surface }}
              />
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${T.border}`, backgroundColor: T.surface }}>
                {Object.entries(TIPOS).map(([key, ti]) => (
                  <option key={key} value={key}>{ti.label}</option>
                ))}
              </select>
              <button onClick={addProject} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundImage: T.gradiente }}>
                Criar
              </button>
            </div>
          )}

          <div className="grid gap-3">
            {projetosComEtapas.map((p) => {
              const Icon = TIPOS[p.tipo].Icon;
              const total = p.etapas.length;
              const done = p.etapas.filter((e) => e.concluida).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              const isOpen = expandedId === p.id;

              return (
                <div key={p.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}`, backgroundColor: T.surface, boxShadow: T.shadow }}>
                  <button onClick={() => setExpandedId(isOpen ? null : p.id)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center rounded-lg" style={{ width: 34, height: 34, backgroundColor: p.cor + "22", color: p.cor }}>
                        <Icon size={16} />
                      </span>
                      <div>
                        <p className="font-semibold text-sm">{p.nome}</p>
                        <p className="font-mono text-xs" style={{ color: T.textMuted }}>
                          {TIPOS[p.tipo].label} · {done}/{total} etapas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block rounded-full overflow-hidden" style={{ width: 90, height: 6, backgroundColor: T.border }}>
                        <div style={{ width: `${pct}%`, height: "100%", backgroundImage: `linear-gradient(90deg, ${p.cor}, #C98AA8)`, borderRadius: 999 }} />
                      </div>
                      <span className="font-mono text-xs w-10 text-right font-medium" style={{ color: T.textMuted }}>{pct}%</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t" style={{ borderColor: T.border }}>
                      <div className="mt-3 space-y-2">
                        {p.etapas.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={e.concluida} onChange={() => toggleEtapa(e.id)} style={{ accentColor: p.cor }} />
                            <span className={e.concluida ? "line-through flex-1" : "flex-1"} style={{ color: e.concluida ? T.textFaint : T.text }}>
                              {e.titulo}
                            </span>
                            <select value={e.dia || ""} onChange={(ev) => setEtapaDia(e.id, ev.target.value)} className="font-mono text-xs px-2 py-1 rounded-lg" style={{ border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt }}>
                              <option value="">— dia —</option>
                              {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <input type="time" value={e.hora || ""} onChange={(ev) => setEtapaHora(e.id, ev.target.value)} className="font-mono text-xs px-2 py-1 rounded-lg" style={{ border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt }} />
                            <button onClick={() => deleteEtapa(e.id)} style={{ color: T.warnText }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <input
                          value={etapaDrafts[p.id] || ""}
                          onChange={(e) => setEtapaDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addEtapa(p.id)}
                          placeholder="Nova etapa..."
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                          style={{ border: `1px solid ${T.border}`, backgroundColor: T.surfaceAlt }}
                        />
                        <button onClick={() => addEtapa(p.id)} className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                          <Plus size={14} />
                        </button>
                        <button onClick={() => deleteProject(p.id)} className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1" style={{ color: T.warnText }}>
                          <Trash2 size={14} /> Excluir projeto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Semana */}
        <div>
          <h2 className="font-display text-xl font-bold mb-4">Semana</h2>
          <div className="grid grid-cols-7 gap-2">
            {DIAS.map((dia, idx) => {
              const data = new Date(monday);
              data.setDate(monday.getDate() + idx);
              return (
                <div key={dia} className="rounded-xl min-h-40 overflow-hidden" style={{ border: `1px solid ${T.border}`, backgroundColor: T.surface, boxShadow: T.shadow }}>
                  <div className="px-2 py-2 border-b" style={{ borderColor: T.border, backgroundImage: T.gradiente }}>
                    <p className="font-mono text-xs font-semibold" style={{ color: "#fff" }}>{dia}</p>
                    <p className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {data.getDate().toString().padStart(2, "0")}/{(data.getMonth() + 1).toString().padStart(2, "0")}
                    </p>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {semanaItens[dia].length === 0 && (
                      <p className="text-xs italic" style={{ color: T.textFaint }}>vazio</p>
                    )}
                    {semanaItens[dia].map(({ projeto, etapa }) => (
                      <div
                        key={etapa.id}
                        onClick={() => toggleEtapa(etapa.id)}
                        className="text-xs p-1.5 rounded-lg cursor-pointer"
                        style={{
                          borderLeft: `3px solid ${projeto.cor}`,
                          backgroundColor: etapa.concluida ? T.surfaceAlt : projeto.cor + "18",
                          textDecoration: etapa.concluida ? "line-through" : "none",
                          color: etapa.concluida ? T.textFaint : T.text,
                        }}
                      >
                        {etapa.hora && <span className="font-mono" style={{ opacity: 0.7 }}>{etapa.hora} </span>}
                        {etapa.titulo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
