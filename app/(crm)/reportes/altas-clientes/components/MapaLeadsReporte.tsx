"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReporteMapa } from "./types";

const MapaLeads = dynamic(() => import("./MapaLeads"), {
  ssr: false,
  loading: () => <div style={{ height: 480, padding: 24 }}>Preparando mapa...</div>,
});

type Props = {
  desde: string;
  hasta: string;
  responsable: string;
};

export default function MapaLeadsReporte({ desde, hasta, responsable }: Props) {
  const [datos, setDatos] = useState<ReporteMapa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const parametros = useMemo(() => {
    const p = new URLSearchParams({ desde, hasta });
    if (responsable === "sin_supervisor") p.set("supervisorId", "sin_supervisor");
    else if (responsable.startsWith("supervisor:")) p.set("supervisorId", responsable.slice(11));
    else if (responsable.startsWith("vendedor:")) p.set("vendedorId", responsable.slice(9));
    return p.toString();
  }, [desde, hasta, responsable]);

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      setDatos(null);
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session?.access_token) throw new Error("Tu sesión expiró.");
        const res = await fetch(`/api/reportes/mapa-leads?${parametros}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "No se pudo cargar el mapa");
        if (!controller.signal.aborted) setDatos(json as ReporteMapa);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Error cargando el mapa");
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controller.abort();
  }, [parametros]);

  return (
    <section style={{ background: "#fff", padding: 24, borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", marginTop: 22 }}>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>Distribución geográfica de leads</h2>
      <p style={{ color: "#6b7280", fontSize: 13 }}>
        Localidades de Argentina · {desde} al {hasta} · círculos proporcionales a las altas
      </p>
      {cargando && <p>Consultando ubicaciones...</p>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {datos && (
        <>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16, fontSize: 14 }}>
            <span><strong>{datos.totalLeads}</strong> leads del período</span>
            <span><strong>{datos.conUbicacion}</strong> con coordenadas</span>
            <span><strong>{datos.sinUbicacion}</strong> sin coordenadas</span>
            <span><strong>{datos.localidades.length}</strong> localidades</span>
          </div>
          {datos.localidades.length > 0 ? (
            <MapaLeads localidades={datos.localidades} />
          ) : (
            <div style={{ padding: 32, background: "#f8fafc", borderRadius: 10 }}>
              No hay leads con coordenadas para los filtros seleccionados.
            </div>
          )}
          {datos.sinUbicacion > 0 && (
            <p style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>
              Los leads sin coordenadas se cuentan en el total, pero no se representan en el mapa.
            </p>
          )}
        </>
      )}
    </section>
  );
}
