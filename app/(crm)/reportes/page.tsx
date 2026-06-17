"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import KPICard from "./components/KPICard";

type Dashboard = {
  role: string;
  resumen: {
    totalClientes: number;
    clientesHoy: number;
    clientesSemana: number;
    clientesMes: number;
  };
};

export default function ReportesPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  async function cargarDashboard() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/reportes", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Error obteniendo dashboard");
      }

      const json = await res.json();

      setDashboard(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <h2>Cargando dashboard...</h2>;
  }

  if (!dashboard) {
    return <h2>No se pudo cargar el dashboard.</h2>;
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Dashboard Comercial</h1>

      <p>
        Perfil: <strong>{dashboard.role}</strong>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginTop: 30,
        }}
      >
        <KPICard
          titulo="Clientes"
          valor={dashboard.resumen.totalClientes}
        />

        <KPICard
          titulo="Hoy"
          valor={dashboard.resumen.clientesHoy}
        />

        <KPICard
          titulo="Semana"
          valor={dashboard.resumen.clientesSemana}
        />

        <KPICard
          titulo="Mes"
          valor={dashboard.resumen.clientesMes}
        />
      </div>
    </div>
  );
}