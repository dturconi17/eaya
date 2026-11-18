"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rubro = { id: string; nombre: string; activo: boolean; created_at: string };
type Subrubro = { id: string; rubro_id: string; nombre: string; activo: boolean; created_at: string };
type Estado = "todos" | "activos" | "inactivos";
type Edicion = { clase: "rubro" | "subrubro"; id?: string; nombre: string; rubro_id: string; activo: boolean };
const nuevo = (clase: "rubro" | "subrubro"): Edicion => ({ clase, nombre: "", rubro_id: "", activo: true });
const field: React.CSSProperties = { width: "100%", minWidth: 0, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box", background: "white", color: "#111827" };
const btn: React.CSSProperties = { padding: "9px 13px", borderRadius: 8, border: "1px solid #d1d5db", background: "#ffffff", color: "#111827", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const primary: React.CSSProperties = { ...btn, background: "#15803d", color: "#ffffff", borderColor: "#15803d", fontWeight: 700, boxShadow: "0 2px 6px rgba(21,128,61,.15)" };
const editButton: React.CSSProperties = { ...btn, color: "#1d4ed8", background: "#eff6ff", borderColor: "#bfdbfe" };
const deactivateButton: React.CSSProperties = { ...btn, color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" };
const activateButton: React.CSSProperties = { ...btn, color: "#15803d", background: "#f0fdf4", borderColor: "#bbf7d0" };
const statusBadge = (activo: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: activo ? "#166534" : "#64748b", background: activo ? "#dcfce7" : "#f1f5f9", border: `1px solid ${activo ? "#bbf7d0" : "#e2e8f0"}` });
const sectionStyle: React.CSSProperties = { background: "#ffffff", border: "1px solid #dbe5e0", borderRadius: 14, overflow: "hidden", boxShadow: "0 3px 12px rgba(15,23,42,.04)" };
const headingStyle: React.CSSProperties = { padding: "17px 18px", margin: 0, background: "#f0fdf4", color: "#166534", borderBottom: "1px solid #dcfce7", fontSize: 17, fontWeight: 750 };
const cell: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid #e5e7eb", textAlign: "left" };

export default function RubrosTab() {
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [subrubros, setSubrubros] = useState<Subrubro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<Estado>("todos");
  const [rubroFiltro, setRubroFiltro] = useState("todos");
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [r, s] = await Promise.all([
        supabase.from("rubros").select("id,nombre,activo,created_at").order("nombre"),
        supabase.from("subrubros").select("id,rubro_id,nombre,activo,created_at").order("nombre"),
      ]);
      if (r.error) throw r.error;
      if (s.error) throw s.error;
      setRubros((r.data ?? []) as Rubro[]);
      setSubrubros((s.data ?? []) as Subrubro[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los rubros y subrubros.");
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const visiblesRubros = useMemo(() => rubros.filter(r =>
    r.nombre.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es")) &&
    (estado === "todos" || r.activo === (estado === "activos"))
  ), [rubros, busqueda, estado]);
  const visiblesSubrubros = useMemo(() => subrubros.filter(s =>
    (rubroFiltro === "todos" || s.rubro_id === rubroFiltro) &&
    (s.nombre.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es")) || (rubros.find(r => r.id === s.rubro_id)?.nombre ?? "").toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es"))) &&
    (estado === "todos" || s.activo === (estado === "activos"))
  ), [subrubros, rubros, rubroFiltro, busqueda, estado]);

  async function guardar() {
    if (!edicion || guardando) return;
    const nombre = edicion.nombre.trim();
    if (nombre.length < 2) { setError("El nombre debe tener al menos dos caracteres."); return; }
    if (edicion.clase === "subrubro" && !edicion.rubro_id) { setError("Seleccioná un rubro."); return; }
    const padre = rubros.find(r => r.id === edicion.rubro_id);
    if (edicion.clase === "subrubro" && !padre?.activo && edicion.activo) { setError("No se puede activar un subrubro de un rubro inactivo."); return; }
    const duplicado = edicion.clase === "rubro"
      ? rubros.some(r => r.id !== edicion.id && r.nombre.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"))
      : subrubros.some(s => s.id !== edicion.id && s.rubro_id === edicion.rubro_id && s.nombre.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"));
    if (duplicado) { setError("Ya existe un registro con ese nombre en el mismo nivel."); return; }
    setGuardando(true); setError(""); setMensaje("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Tu sesión expiró.");
      const tabla = edicion.clase === "rubro" ? "rubros" : "subrubros";
      const payload = { nombre, activo: edicion.activo, ...(edicion.clase === "subrubro" ? { rubro_id: edicion.rubro_id } : {}) };
      if (edicion.id) {
        const { error: err } = await supabase.from(tabla).update({ ...payload, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", edicion.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from(tabla).insert({ ...payload, created_by: user.id });
        if (err) throw err;
      }
      setMensaje(`${edicion.clase === "rubro" ? "Rubro" : "Subrubro"} guardado correctamente.`);
      setEdicion(null);
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setGuardando(false); }
  }

  async function alternar(clase: "rubro" | "subrubro", registro: Rubro | Subrubro) {
    if (guardando) return;
    setError(""); setMensaje("");
    if (clase === "rubro" && registro.activo && subrubros.some(s => s.rubro_id === registro.id && s.activo)) {
      setError("Primero inactivá los subrubros activos de este rubro."); return;
    }
    if (clase === "subrubro" && !registro.activo && !rubros.find(r => r.id === (registro as Subrubro).rubro_id)?.activo) {
      setError("No se puede activar un subrubro si su rubro está inactivo."); return;
    }
    setGuardando(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Tu sesión expiró.");
      const { error: err } = await supabase.from(clase === "rubro" ? "rubros" : "subrubros")
        .update({ activo: !registro.activo, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", registro.id);
      if (err) throw err;
      setMensaje("Estado actualizado correctamente.");
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cambiar el estado."); }
    finally { setGuardando(false); }
  }

  return <div style={{ color: "#111827", width: "100%" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
      <div><h2 style={{ margin: 0, fontSize: 24, color: "#14532d", fontWeight: 750 }}>Rubros y subrubros</h2><p style={{ color: "#6b7280", margin: "6px 0 0" }}>Catálogos para clasificar productos en EAYA.</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={primary} onClick={() => { setEdicion(nuevo("rubro")); setError(""); }}>+ Nuevo rubro</button>
        <button type="button" style={primary} onClick={() => { setEdicion(nuevo("subrubro")); setError(""); }} disabled={!rubros.some(r => r.activo)}>+ Nuevo subrubro</button>
      </div>
    </div>
    {error && <div role="alert" style={{ padding: 12, background: "#fef2f2", color: "#991b1b", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
    {mensaje && <div role="status" style={{ padding: 12, background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0", borderLeft: "4px solid #16a34a", borderRadius: 8, marginBottom: 12 }}>{mensaje}</div>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
      <input aria-label="Buscar rubros o subrubros" placeholder="Buscar rubro o subrubro..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...field, flex: "1 1 220px", borderColor: "#bbd7c5" }}/>
      <select aria-label="Filtrar por estado" value={estado} onChange={e => setEstado(e.target.value as Estado)} style={{ ...field, flex: "0 1 200px", borderColor: "#bbd7c5" }}><option value="todos">Todos los estados</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select>
      <select aria-label="Filtrar por rubro" value={rubroFiltro} onChange={e => setRubroFiltro(e.target.value)} style={{ ...field, flex: "0 1 230px", borderColor: "#bbd7c5" }}><option value="todos">Todos los rubros</option>{rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select>
    </div>
    {cargando ? <p>Cargando catálogos...</p> : <div style={{ display: "grid", gap: 24 }}>
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Rubros ({visiblesRubros.length})</h3>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#f8fafc" }}><th style={cell}>Rubro</th><th style={cell}>Subrubros</th><th style={cell}>Estado</th><th style={cell}>Acciones</th></tr></thead><tbody>
          {visiblesRubros.map(r => <tr key={r.id}><td style={cell}><strong>{r.nombre}</strong></td><td style={cell}>{subrubros.filter(s => s.rubro_id === r.id).length}</td><td style={cell}><span style={statusBadge(r.activo)}>{r.activo ? "● Activo" : "● Inactivo"}</span></td><td style={cell}><div style={{ display: "flex", gap: 8 }}><button type="button" style={editButton} onClick={() => setEdicion({ clase: "rubro", id: r.id, nombre: r.nombre, rubro_id: "", activo: r.activo })}>Editar</button><button type="button" style={r.activo ? deactivateButton : activateButton} disabled={guardando} onClick={() => void alternar("rubro", r)}>{r.activo ? "Inactivar" : "Activar"}</button></div></td></tr>)}
          {!visiblesRubros.length && <tr><td style={cell} colSpan={4}>No hay rubros para mostrar.</td></tr>}
        </tbody></table></div>
      </section>
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Subrubros ({visiblesSubrubros.length})</h3>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#f8fafc" }}><th style={cell}>Subrubro</th><th style={cell}>Rubro padre</th><th style={cell}>Estado</th><th style={cell}>Acciones</th></tr></thead><tbody>
          {visiblesSubrubros.map(s => <tr key={s.id}><td style={cell}><strong>{s.nombre}</strong></td><td style={cell}>{rubros.find(r => r.id === s.rubro_id)?.nombre ?? "Sin rubro"}</td><td style={cell}><span style={statusBadge(s.activo)}>{s.activo ? "● Activo" : "● Inactivo"}</span></td><td style={cell}><div style={{ display: "flex", gap: 8 }}><button type="button" style={editButton} onClick={() => setEdicion({ clase: "subrubro", id: s.id, nombre: s.nombre, rubro_id: s.rubro_id, activo: s.activo })}>Editar</button><button type="button" style={s.activo ? deactivateButton : activateButton} disabled={guardando} onClick={() => void alternar("subrubro", s)}>{s.activo ? "Inactivar" : "Activar"}</button></div></td></tr>)}
          {!visiblesSubrubros.length && <tr><td style={cell} colSpan={4}>No hay subrubros para mostrar.</td></tr>}
        </tbody></table></div>
      </section>
    </div>}
    {edicion && <div role="presentation" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={edicion.clase === "rubro" ? "Editar rubro" : "Editar subrubro"} style={{ width: "100%", maxWidth: 520, background: "white", borderRadius: 14, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ marginTop: 0 }}>{edicion.id ? "Editar" : "Nuevo"} {edicion.clase}</h3>
        <label style={{ display: "block", marginBottom: 14 }}>Nombre *<input autoFocus value={edicion.nombre} onChange={e => setEdicion({ ...edicion, nombre: e.target.value })} style={{ ...field, marginTop: 6 }} maxLength={120}/></label>
        {edicion.clase === "subrubro" && <label style={{ display: "block", marginBottom: 14 }}>Rubro *<select value={edicion.rubro_id} onChange={e => setEdicion({ ...edicion, rubro_id: e.target.value })} style={{ ...field, marginTop: 6 }}><option value="">Seleccioná un rubro</option>{rubros.filter(r => r.activo || r.id === edicion.rubro_id).map(r => <option key={r.id} value={r.id}>{r.nombre}{!r.activo ? " (inactivo)" : ""}</option>)}</select></label>}
        <label style={{ display: "block", marginBottom: 14 }}>Estado<select value={edicion.activo ? "activo" : "inactivo"} onChange={e => setEdicion({ ...edicion, activo: e.target.value === "activo" })} style={{ ...field, marginTop: 6 }}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button type="button" style={btn} disabled={guardando} onClick={() => setEdicion(null)}>Cancelar</button><button type="button" style={primary} disabled={guardando} onClick={() => void guardar()}>{guardando ? "Guardando..." : "Guardar"}</button></div>
      </div>
    </div>}
  </div>;
}