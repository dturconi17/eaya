"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Canal = { id: string; tipo: string; activo: boolean };
type PDV = { id: string; nombre: string; canal_id: string; activo: boolean };
type Asignacion = { canal_id: string; punto_venta_id: string };

type Props = {
  productoId: string;
  productoNombre: string;
  onClose: () => void;
};

const button: React.CSSProperties = { borderRadius: 8, border: "1px solid #cbd5e1", padding: "9px 13px", background: "white", color: "#0f172a", cursor: "pointer", fontWeight: 600 };

export default function AsignarCanalPDV({ productoId, productoNombre, onClose }: Props) {
  const [canales, setCanales] = useState<Canal[]>([]);
  const [pdvs, setPdvs] = useState<PDV[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [original, setOriginal] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [c, p, a] = await Promise.all([
        supabase.from("canales").select("id,tipo,activo").order("tipo"),
        supabase.from("puntos_venta").select("id,nombre,canal_id,activo").order("nombre"),
        supabase.from("producto_puntos_venta").select("canal_id,punto_venta_id").eq("producto_id", productoId),
      ]);
      if (c.error) throw c.error;
      if (p.error) throw p.error;
      if (a.error) throw a.error;
      setCanales((c.data ?? []) as Canal[]);
      setPdvs((p.data ?? []) as PDV[]);
      const ids = ((a.data ?? []) as Asignacion[]).map(x => x.punto_venta_id);
      setSeleccion(ids);
      setOriginal(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las asignaciones.");
    } finally { setCargando(false); }
  }, [productoId]);

  useEffect(() => { void cargar(); }, [cargar]);

  const visibles = useMemo(() => canales.filter(c => c.activo || pdvs.some(p => p.canal_id === c.id && seleccion.includes(p.id)))
    .filter(c => c.tipo.toLowerCase().includes(busqueda.toLowerCase()) || pdvs.some(p => p.canal_id === c.id && p.nombre.toLowerCase().includes(busqueda.toLowerCase()))), [canales, pdvs, seleccion, busqueda]);

  function alternarPDV(id: string) {
    setSeleccion(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function alternarCanal(canal: Canal) {
    const disponibles = pdvs.filter(p => p.canal_id === canal.id && p.activo).map(p => p.id);
    const todos = disponibles.length > 0 && disponibles.every(id => seleccion.includes(id));
    setSeleccion(prev => todos ? prev.filter(id => !disponibles.includes(id)) : [...new Set([...prev, ...disponibles])]);
  }

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("La sesión expiró. Volvé a ingresar.");
      const prev = new Set(original);
      const next = new Set(seleccion);
      const quitar = original.filter(id => !next.has(id));
      const agregar = seleccion.filter(id => !prev.has(id));
      // Las asignaciones existentes no se reescriben: se preservan al editar otras selecciones.
      if (agregar.length) {
        const rows = agregar.map(id => {
          const pdv = pdvs.find(p => p.id === id);
          if (!pdv || !pdv.activo || !canales.find(c => c.id === pdv.canal_id)?.activo) throw new Error("Hay puntos de venta inactivos o inexistentes en la selección.");
          return { producto_id: productoId, canal_id: pdv.canal_id, punto_venta_id: id };
        });
        const { error: insertError } = await supabase.from("producto_puntos_venta").insert(rows);
        if (insertError) throw insertError;
      }
      if (quitar.length) {
        const { error: deleteError } = await supabase.from("producto_puntos_venta")
          .delete().eq("producto_id", productoId).in("punto_venta_id", quitar);
        if (deleteError) throw deleteError;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar las asignaciones.");
      // Recargar desde la base si una de las operaciones se aplicó antes del error.
      await cargar();
    } finally { setGuardando(false); }
  }

  return <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <section role="dialog" aria-modal="true" aria-label="Asignar Canal y PDV" style={{ background: "#fff", color: "#0f172a", width: "min(760px,100%)", maxHeight: "90vh", overflowY: "auto", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, color: "#166534" }}>Asignar Canal y PDV</h2><p style={{ margin: "6px 0 16px", color: "#64748b" }}>Producto: {productoNombre}</p></div>
        <button type="button" onClick={onClose} disabled={guardando} style={button}>Cerrar</button>
      </div>
      {error && <p role="alert" style={{ color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 8 }}>{error}</p>}
      {cargando ? <p>Cargando canales y puntos de venta...</p> : <>
        <input aria-label="Buscar canal o punto de venta" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar canal o punto de venta..." style={{ width: "100%", padding: 11, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 16, boxSizing: "border-box", color: "#0f172a", background: "white" }}/>
        <div style={{ display: "grid", gap: 12 }}>
          {visibles.map(canal => {
            const todosPDV = pdvs.filter(p => p.canal_id === canal.id && (p.activo || seleccion.includes(p.id)));
            const activos = todosPDV.filter(p => p.activo);
            const elegidos = todosPDV.filter(p => seleccion.includes(p.id)).length;
            const todos = activos.length > 0 && activos.every(p => seleccion.includes(p.id));
            return <div key={canal.id} style={{ border: "1px solid #dbe5e0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "#f0fdf4", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, color: "#166534" }}>
                  <input type="checkbox" checked={elegidos > 0} disabled={!canal.activo || activos.length === 0} onChange={() => alternarCanal(canal)} />{canal.tipo}{!canal.activo ? " (inactivo)" : ""}
                </label><span style={{ fontSize: 12, color: "#475569" }}>{elegidos} PDV seleccionados</span>
              </div>
              <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
                {todosPDV.length ? todosPDV.map(p => <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, opacity: p.activo && canal.activo ? 1 : .65 }}>
                  <input type="checkbox" checked={seleccion.includes(p.id)} disabled={!p.activo || !canal.activo} onChange={() => alternarPDV(p.id)} />{p.nombre}{!p.activo ? " (inactivo)" : ""}
                </label>) : <span style={{ color: "#64748b", fontSize: 13 }}>Sin puntos de venta disponibles</span>}
              </div>
            </div>;
          })}
          {!visibles.length && <p>No hay canales que coincidan con la búsqueda.</p>}
        </div>
        <p style={{ fontSize: 13, color: "#64748b" }}>Un canal queda habilitado para este producto cuando tiene al menos un punto de venta seleccionado. Los puntos inactivos no se pueden asignar.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button type="button" style={button} disabled={guardando} onClick={onClose}>Cancelar</button>
          <button type="button" style={{ ...button, color: "white", background: "#15803d", borderColor: "#15803d" }} disabled={guardando} onClick={() => void guardar()}>{guardando ? "Guardando..." : "Guardar asignaciones"}</button>
        </div>
      </>}
    </section>
  </div>;
}