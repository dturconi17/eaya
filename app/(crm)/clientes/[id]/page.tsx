"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  HeartHandshake,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  ShoppingBag,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { getClienteById } from "@/lib/sql/clientes";
import type { Cliente } from "../types";

type ProductoRelacionado = {
  id: string;
  nombre: string;
  foto_path: string | null;
};

type PerfilUsuario = {
  id: string;
  full_name: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

type EventoCliente = {
  id: string;
  cliente_id: string;
  tipo_evento: string;
  titulo: string;
  descripcion: string | null;
  producto_id: string | null;
  lead_producto_id: string | null;
  usuario_id: string | null;
  datos: Record<string, unknown> | null;
  fecha_evento: string;
  created_at: string;
  producto: ProductoRelacionado | null;
  usuario: PerfilUsuario | null;
};

type EventoConfig = {
  icono: React.ElementType;
  color: string;
  background: string;
  border: string;
  etiqueta: string;
};

const CONFIG_EVENTOS: Record<string, EventoConfig> = {
  cliente_creado: {
    icono: UserPlus,
    color: "#0369a1",
    background: "#e0f2fe",
    border: "#7dd3fc",
    etiqueta: "Cliente",
  },
  onboarding_iniciado: {
    icono: User,
    color: "#4338ca",
    background: "#eef2ff",
    border: "#a5b4fc",
    etiqueta: "Onboarding",
  },
  intereses_guardados: {
    icono: Sparkles,
    color: "#7c3aed",
    background: "#f5f3ff",
    border: "#c4b5fd",
    etiqueta: "Intereses",
  },
  producto_sugerido: {
    icono: Sparkles,
    color: "#7c3aed",
    background: "#f5f3ff",
    border: "#c4b5fd",
    etiqueta: "Recomendación",
  },
  producto_ofrecido: {
    icono: ShoppingBag,
    color: "#2563eb",
    background: "#eff6ff",
    border: "#93c5fd",
    etiqueta: "Producto ofrecido",
  },
  producto_interesado: {
    icono: HeartHandshake,
    color: "#b45309",
    background: "#fffbeb",
    border: "#fcd34d",
    etiqueta: "Interesado",
  },
  producto_rechazado: {
    icono: AlertCircle,
    color: "#b91c1c",
    background: "#fef2f2",
    border: "#fca5a5",
    etiqueta: "No interesado",
  },
  venta_iniciada: {
    icono: ShoppingBag,
    color: "#c2410c",
    background: "#fff7ed",
    border: "#fdba74",
    etiqueta: "Venta iniciada",
  },
  venta_completada: {
    icono: PackageCheck,
    color: "#15803d",
    background: "#f0fdf4",
    border: "#86efac",
    etiqueta: "Venta completada",
  },
  beneficiario_agregado: {
    icono: UserPlus,
    color: "#0f766e",
    background: "#f0fdfa",
    border: "#5eead4",
    etiqueta: "Beneficiario",
  },
  nota: {
    icono: FileText,
    color: "#475569",
    background: "#f8fafc",
    border: "#cbd5e1",
    etiqueta: "Nota",
  },
  llamada: {
    icono: Phone,
    color: "#0369a1",
    background: "#f0f9ff",
    border: "#7dd3fc",
    etiqueta: "Llamada",
  },
  email: {
    icono: Mail,
    color: "#1d4ed8",
    background: "#eff6ff",
    border: "#93c5fd",
    etiqueta: "Email",
  },
  whatsapp: {
    icono: MessageCircle,
    color: "#15803d",
    background: "#f0fdf4",
    border: "#86efac",
    etiqueta: "WhatsApp",
  },
};

const CONFIG_EVENTO_DEFAULT: EventoConfig = {
  icono: CalendarClock,
  color: "#475569",
  background: "#f8fafc",
  border: "#cbd5e1",
  etiqueta: "Actividad",
};

export default function ClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const clienteId = params.id;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [eventos, setEventos] = useState<EventoCliente[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clienteId) return;

    cargarPagina();
  }, [clienteId]);

  async function cargarPagina() {
    try {
      setLoading(true);
      setError("");

      const [
        clienteResultado,
        eventosResultado,
      ] = await Promise.all([
        getClienteById(clienteId),

        supabase
          .from("cliente_eventos")
          .select(`
            id,
            cliente_id,
            tipo_evento,
            titulo,
            descripcion,
            producto_id,
            lead_producto_id,
            usuario_id,
            datos,
            fecha_evento,
            created_at,
            producto:productos (
              id,
              nombre,
              foto_path
            )
          `)
          .eq("cliente_id", clienteId)
          .order("fecha_evento", {
            ascending: false,
          }),
      ]);

      if (clienteResultado.error) {
        throw clienteResultado.error;
      }

      if (!clienteResultado.data) {
        throw new Error("No se encontró el cliente.");
      }

      if (eventosResultado.error) {
        throw eventosResultado.error;
      }

      const eventosCargados = (
        eventosResultado.data ?? []
      ) as unknown as Omit<EventoCliente, "usuario">[];

      const idsUsuarios = Array.from(
        new Set(
          eventosCargados
            .map((evento) => evento.usuario_id)
            .filter(
              (usuarioId): usuarioId is string =>
                Boolean(usuarioId)
            )
        )
      );

      let perfiles: PerfilUsuario[] = [];

      if (idsUsuarios.length > 0) {
        const perfilesResultado = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", idsUsuarios);

        if (perfilesResultado.error) {
          console.warn(
            "No fue posible cargar los perfiles de los usuarios:",
            perfilesResultado.error
          );
        } else {
          perfiles =
            (perfilesResultado.data as PerfilUsuario[]) ?? [];
        }
      }

      const eventosConUsuario: EventoCliente[] =
        eventosCargados.map((evento) => ({
          ...evento,
          usuario:
            perfiles.find(
              (perfil) => perfil.id === evento.usuario_id
            ) ?? null,
        }));

      setCliente(clienteResultado.data);
      setEventos(eventosConUsuario);
    } catch (errorCargar: any) {
      console.error("Error cargando cliente:", errorCargar);

      setError(
        errorCargar?.message ||
          "No fue posible cargar la ficha del cliente."
      );
    } finally {
      setLoading(false);
    }
  }

  const ultimaActividad = useMemo(() => {
    if (eventos.length === 0) return null;

    return eventos[0].fecha_evento;
  }, [eventos]);

  const ventasCompletadas = useMemo(() => {
    return eventos.filter(
      (evento) => evento.tipo_evento === "venta_completada"
    ).length;
  }, [eventos]);

  const productosInteresados = useMemo(() => {
    return eventos.filter(
      (evento) =>
        evento.tipo_evento === "producto_interesado"
    ).length;
  }, [eventos]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loadingCard}>
            <Clock3 size={24} />
            <span>Cargando ficha del cliente...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error || !cliente) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <AlertCircle size={22} />

            <div>
              <strong>No se pudo cargar el cliente</strong>

              <div style={styles.errorDescription}>
                {error || "Cliente no encontrado."}
              </div>
            </div>
          </div>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => router.push("/clientes")}
          >
            <ArrowLeft size={17} />
            Volver a clientes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.breadcrumb}>
              Clientes / Ficha del cliente
            </div>

            <h1 style={styles.title}>
              {cliente.nombre} {cliente.apellido}
            </h1>

            <p style={styles.subtitle}>
              Información comercial e historial de actividades.
            </p>
          </div>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => router.push("/clientes")}
            >
              <ArrowLeft size={17} />
              Volver
            </button>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={() =>
                router.push(
                  `/clientes/${clienteId}/onboarding/intereses`
                )
              }
            >
              <Sparkles size={17} />
              Continuar gestión
            </button>
          </div>
        </header>

        <section style={styles.summaryGrid}>
          <SummaryCard
            titulo="Actividades registradas"
            valor={String(eventos.length)}
            descripcion="Eventos del journey comercial"
            icono={CalendarClock}
          />

          <SummaryCard
            titulo="Ventas completadas"
            valor={String(ventasCompletadas)}
            descripcion="Altas finalizadas"
            icono={PackageCheck}
          />

          <SummaryCard
            titulo="Intereses registrados"
            valor={String(productosInteresados)}
            descripcion="Productos con interés"
            icono={HeartHandshake}
          />

          <SummaryCard
            titulo="Última actividad"
            valor={
              ultimaActividad
                ? formatearFechaResumen(ultimaActividad)
                : "Sin actividad"
            }
            descripcion={
              ultimaActividad
                ? formatearHora(ultimaActividad)
                : "Todavía no hay eventos"
            }
            icono={Clock3}
          />
        </section>

        <section style={styles.journeySection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <CalendarClock size={22} />
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                Journey comercial
              </h2>

              <p style={styles.sectionDescription}>
                Historial cronológico de interacciones, intereses,
                ofrecimientos y ventas.
              </p>
            </div>
          </div>

          {eventos.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <CalendarClock size={30} />
              </div>

              <h3 style={styles.emptyTitle}>
                Todavía no hay actividades
              </h3>

              <p style={styles.emptyDescription}>
                Las acciones realizadas durante el onboarding y
                las futuras gestiones comerciales aparecerán en
                esta línea de tiempo.
              </p>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() =>
                  router.push(
                    `/clientes/${clienteId}/onboarding/intereses`
                  )
                }
              >
                <Sparkles size={17} />
                Iniciar gestión
              </button>
            </div>
          ) : (
            <div style={styles.timeline}>
              {eventos.map((evento, indice) => (
                <JourneyItem
                  key={evento.id}
                  evento={evento}
                  esUltimo={indice === eventos.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  titulo,
  valor,
  descripcion,
  icono: Icono,
}: {
  titulo: string;
  valor: string;
  descripcion: string;
  icono: React.ElementType;
}) {
  return (
    <article style={styles.summaryCard}>
      <div style={styles.summaryIcon}>
        <Icono size={20} />
      </div>

      <div style={styles.summaryContent}>
        <span style={styles.summaryTitle}>{titulo}</span>
        <strong style={styles.summaryValue}>{valor}</strong>
        <span style={styles.summaryDescription}>
          {descripcion}
        </span>
      </div>
    </article>
  );
}

function JourneyItem({
  evento,
  esUltimo,
}: {
  evento: EventoCliente;
  esUltimo: boolean;
}) {
  const config =
    CONFIG_EVENTOS[evento.tipo_evento] ??
    CONFIG_EVENTO_DEFAULT;

  const Icono = config.icono;

  const nombreUsuario = obtenerNombreUsuario(evento.usuario);

  return (
    <article style={styles.timelineItem}>
      <div style={styles.timelineMarkerColumn}>
        <div
          style={{
            ...styles.timelineIcon,
            color: config.color,
            background: config.background,
            borderColor: config.border,
          }}
        >
          <Icono size={18} />
        </div>

        {!esUltimo && <div style={styles.timelineLine} />}
      </div>

      <div style={styles.timelineContent}>
        <div style={styles.eventCard}>
          <div style={styles.eventHeader}>
            <div style={styles.eventTitleArea}>
              <span
                style={{
                  ...styles.eventBadge,
                  color: config.color,
                  background: config.background,
                  borderColor: config.border,
                }}
              >
                {config.etiqueta}
              </span>

              <h3 style={styles.eventTitle}>
                {evento.titulo}
              </h3>
            </div>

            <div style={styles.eventDate}>
              <span>
                {formatearFechaCompleta(
                  evento.fecha_evento
                )}
              </span>

              <span style={styles.eventTime}>
                {formatearHora(evento.fecha_evento)}
              </span>
            </div>
          </div>

          {evento.descripcion && (
            <p style={styles.eventDescription}>
              {evento.descripcion}
            </p>
          )}

          {evento.producto && (
            <div style={styles.productReference}>
              <ShoppingBag size={16} />

              <span>Producto:</span>

              <strong>{evento.producto.nombre}</strong>
            </div>
          )}

          <div style={styles.eventFooter}>
            <div style={styles.eventUser}>
              <User size={14} />

              <span>
                {nombreUsuario
                  ? `Registrado por ${nombreUsuario}`
                  : "Usuario no identificado"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function obtenerNombreUsuario(
  usuario: PerfilUsuario | null
) {
  if (!usuario) return null;

  if (usuario.full_name?.trim()) {
    return usuario.full_name.trim();
  }

  const nombreCompleto = [
    usuario.nombre,
    usuario.apellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return nombreCompleto || null;
}

function formatearFechaCompleta(fecha: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(fecha));
}

function formatearFechaResumen(fecha: string) {
  const fechaEvento = new Date(fecha);
  const hoy = new Date();

  const esHoy =
    fechaEvento.getDate() === hoy.getDate() &&
    fechaEvento.getMonth() === hoy.getMonth() &&
    fechaEvento.getFullYear() === hoy.getFullYear();

  if (esHoy) {
    return "Hoy";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fechaEvento);
}

function formatearHora(fecha: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "#f1f5f9",
  },

  container: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  breadcrumb: {
    marginBottom: "8px",
    color: "#64748b",
    fontSize: "13px",
  },

  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "30px",
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    display: "inline-flex",
    minHeight: "42px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "none",
    borderRadius: "9px",
    color: "#ffffff",
    background: "#2563eb",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    display: "inline-flex",
    minHeight: "42px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    color: "#334155",
    background: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "20px",
  },

  summaryCard: {
    display: "flex",
    minHeight: "118px",
    gap: "13px",
    padding: "17px",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    background: "#ffffff",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
  },

  summaryIcon: {
    display: "grid",
    width: "42px",
    minWidth: "42px",
    height: "42px",
    placeItems: "center",
    borderRadius: "10px",
    color: "#2563eb",
    background: "#eff6ff",
  },

  summaryContent: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
  },

  summaryTitle: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
  },

  summaryValue: {
    marginTop: "5px",
    overflow: "hidden",
    color: "#0f172a",
    fontSize: "21px",
    lineHeight: 1.2,
    textOverflow: "ellipsis",
  },

  summaryDescription: {
    marginTop: "5px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  journeySection: {
    padding: "22px",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    background: "#ffffff",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.04)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    paddingBottom: "18px",
    marginBottom: "20px",
    borderBottom: "1px solid #e2e8f0",
  },

  sectionIcon: {
    display: "grid",
    width: "45px",
    minWidth: "45px",
    height: "45px",
    placeItems: "center",
    borderRadius: "11px",
    color: "#2563eb",
    background: "#eff6ff",
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "20px",
  },

  sectionDescription: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  timeline: {
    display: "flex",
    flexDirection: "column",
  },

  timelineItem: {
    display: "grid",
    gridTemplateColumns: "48px minmax(0, 1fr)",
    gap: "12px",
  },

  timelineMarkerColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  timelineIcon: {
    zIndex: 1,
    display: "grid",
    width: "42px",
    minWidth: "42px",
    height: "42px",
    placeItems: "center",
    border: "1px solid",
    borderRadius: "999px",
  },

  timelineLine: {
    width: "2px",
    minHeight: "30px",
    flex: 1,
    background: "#e2e8f0",
  },

  timelineContent: {
    paddingBottom: "18px",
  },

  eventCard: {
    padding: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#ffffff",
  },

  eventHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    flexWrap: "wrap",
  },

  eventTitleArea: {
    display: "flex",
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
  },

  eventBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  eventTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "16px",
  },

  eventDate: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    color: "#64748b",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  eventTime: {
    marginTop: "3px",
    color: "#94a3b8",
  },

  eventDescription: {
    margin: "12px 0 0",
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.55,
  },

  productReference: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 12px",
    marginTop: "13px",
    border: "1px solid #dbeafe",
    borderRadius: "9px",
    color: "#1e40af",
    background: "#eff6ff",
    fontSize: "13px",
  },

  eventFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    paddingTop: "11px",
    marginTop: "13px",
    borderTop: "1px solid #f1f5f9",
  },

  eventUser: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  emptyState: {
    display: "flex",
    minHeight: "320px",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "35px",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
    textAlign: "center",
  },

  emptyIcon: {
    display: "grid",
    width: "64px",
    height: "64px",
    placeItems: "center",
    borderRadius: "999px",
    color: "#64748b",
    background: "#e2e8f0",
  },

  emptyTitle: {
    margin: "16px 0 0",
    color: "#0f172a",
    fontSize: "18px",
  },

  emptyDescription: {
    maxWidth: "500px",
    margin: "8px 0 18px",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.55,
  },

  loadingCard: {
    display: "flex",
    minHeight: "180px",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    color: "#64748b",
    background: "#ffffff",
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
    padding: "16px",
    marginBottom: "15px",
    border: "1px solid #fecaca",
    borderRadius: "11px",
    color: "#b91c1c",
    background: "#fef2f2",
  },

  errorDescription: {
    marginTop: "4px",
    fontSize: "13px",
  },
};