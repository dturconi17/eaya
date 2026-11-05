
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KPICard from "../components/KPICard";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";


// ============================================================
// TIPOS
// ============================================================

type Usuario = {
    id: string;
    nombre?: string | null;
    full_name?: string | null;
    email?: string | null;
    supervisor_id?: string | null;
};

type FiltrosDisponibles = {
    role: string;
    supervisores: Usuario[];
    vendedores: Usuario[];
};

type Reporte = {
    role: string;
    resumen: {
        clientesPeriodo: number;
        promedioDiario: number;
        diasPeriodo: number;
        vendedoresConAltas: number;
        sinSupervisor: number;
    };
    evolucion: {
        fecha: string;
        cantidad: number;
    }[];
    evolucionSupervisores: {
        fecha: string;
        [supervisorId: string]: string | number;
    }[];

    supervisores: {
        id: string;
        nombre: string;
        cantidad: number;
    }[];
    vendedores: {
        id: string;
        nombre: string;
        cantidad: number;
    }[];
};

type OpcionResponsable = {
    value: string;
    label: string;
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function nombreUsuario(usuario: Usuario) {
    return (
        usuario.nombre?.trim() ||
        usuario.full_name?.trim() ||
        usuario.email?.trim() ||
        `Usuario ${usuario.id.slice(0, 8)}`
    );
}

function fechaArgentina() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const valor = (tipo: string) =>
        partes.find((p) => p.type === tipo)?.value ?? "";

    return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function fechasIniciales() {
    const hasta = fechaArgentina();

    return {
        desde: `${hasta.slice(0, 7)}-01`,
        hasta,
    };
}

async function obtenerToken() {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
        throw new Error("Tu sesión expiró. Volvé a ingresar.");
    }

    return session.access_token;
}

async function solicitar<T>(url: string): Promise<T> {
    const token = await obtenerToken();

    const respuesta = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    const json = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            json.error || "Error consultando el servidor"
        );
    }

    return json as T;
}

function interpretarResponsable(responsable: string) {
    let supervisorId = "";
    let vendedorId = "";

    if (responsable === "sin_supervisor") {
        supervisorId = "sin_supervisor";
    } else if (responsable.startsWith("supervisor:")) {
        supervisorId = responsable.slice("supervisor:".length);
    } else if (responsable.startsWith("vendedor:")) {
        vendedorId = responsable.slice("vendedor:".length);
    }

    return { supervisorId, vendedorId };
}

// ============================================================
// ESTILOS
// ============================================================

const estilos = {
    contenedor: {
        padding: 24,
        maxWidth: 1450,
        margin: "0 auto",
        color: "#111827",
    },

    panel: {
        background: "#ffffff",
        padding: 24,
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,.06)",
        marginTop: 22,
    },

    campo: {
        display: "flex",
        flexDirection: "column" as const,
        gap: 7,
        minWidth: 0,
        fontSize: 14,
    },

    control: {
        width: "100%",
        boxSizing: "border-box" as const,
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid #d1d5db",
        background: "#ffffff",
        color: "#111827",
        fontSize: 14,
    },

    boton: {
        background: "#2563eb",
        color: "#ffffff",
        border: 0,
        borderRadius: 8,
        padding: "12px 22px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
    },

    subtitulo: {
        color: "#6b7280",
        fontSize: 13,
    },
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function AltasClientesPage() {
    const [inicial] = useState(fechasIniciales);
    const [responsableAplicado, setResponsableAplicado] =
        useState("todos");
    // Filtros
    const [desde, setDesde] = useState(inicial.desde);
    const [hasta, setHasta] = useState(inicial.hasta);

    // Un único filtro comercial
    const [responsable, setResponsable] = useState("todos");

    // Información de usuarios
    const [filtros, setFiltros] =
        useState<FiltrosDisponibles | null>(null);

    const [vendedores, setVendedores] = useState<Usuario[]>([]);

    // Información del reporte
    const [reporte, setReporte] = useState<Reporte | null>(null);

    // Estados de pantalla
    const [loading, setLoading] = useState(true);
    const [consultando, setConsultando] = useState(false);
    const [error, setError] = useState("");

    // ==========================================================
    // CARGAR REPORTE
    // ==========================================================

    const cargarReporte = useCallback(
        async (
            fechaDesde: string,
            fechaHasta: string,
            responsableSeleccionado: string
        ) => {
            const { supervisorId, vendedorId } =
                interpretarResponsable(responsableSeleccionado);

            const params = new URLSearchParams({
                desde: fechaDesde,
                hasta: fechaHasta,
            });

            if (supervisorId) {
                params.set("supervisorId", supervisorId);
            }

            if (vendedorId) {
                params.set("vendedorId", vendedorId);
            }

            const datos = await solicitar<Reporte>(
                `/api/reportes/altas-clientes?${params.toString()}`
            );

            setReporte(datos);
        },
        []
    );

    // ==========================================================
    // CARGA INICIAL
    // ==========================================================

    useEffect(() => {
        let cancelado = false;

        async function iniciar() {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    desde: inicial.desde,
                    hasta: inicial.hasta,
                });

                const [opciones, datos] = await Promise.all([
                    solicitar<FiltrosDisponibles>(
                        "/api/reportes/filtros"
                    ),
                    solicitar<Reporte>(
                        `/api/reportes/altas-clientes?${params.toString()}`
                    ),
                ]);

                if (cancelado) return;

                setFiltros(opciones);
                setVendedores(opciones.vendedores);
                setReporte(datos);
            } catch (err) {
                if (!cancelado) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Error cargando el reporte"
                    );
                }
            } finally {
                if (!cancelado) {
                    setLoading(false);
                }
            }
        }

        void iniciar();

        return () => {
            cancelado = true;
        };
    }, [inicial.desde, inicial.hasta]);

    // ==========================================================
    // PERMISOS
    // ==========================================================

    const role = filtros?.role?.toLowerCase() ?? "";

    const esAdmin =
        role === "admin" || role === "gerente";

    const esSupervisor = role === "supervisor";
    const esVendedor = role === "vendedor";

    // ==========================================================
    // OPCIONES DEL FILTRO ÚNICO
    // ==========================================================

    const opcionesResponsable = useMemo<OpcionResponsable[]>(() => {
        if (!filtros) return [];

        const opciones: OpcionResponsable[] = [
            {
                value: "todos",
                label: esVendedor
                    ? "Mis altas"
                    : esSupervisor
                        ? "Todo mi equipo"
                        : "Todos",
            },
        ];

        if (esAdmin) {
            opciones.push({
                value: "sin_supervisor",
                label: "Sin supervisor histórico",
            });
        }

        if (esAdmin || esSupervisor) {
            for (const supervisor of filtros.supervisores) {
                opciones.push({
                    value: `supervisor:${supervisor.id}`,
                    label: `Supervisor · ${nombreUsuario(supervisor)}`,
                });
            }
        }

        if (!esVendedor) {
            for (const vendedor of vendedores) {
                opciones.push({
                    value: `vendedor:${vendedor.id}`,
                    label: `Vendedor · ${nombreUsuario(vendedor)}`,
                });
            }
        }

        return opciones;
    }, [filtros, vendedores, esAdmin, esSupervisor, esVendedor]);

    // ==========================================================
    // APLICAR FILTROS
    // ==========================================================

    async function aplicarFiltros() {
        if (!desde || !hasta || desde > hasta) {
            setError("Seleccioná un rango de fechas válido.");
            return;
        }

        setConsultando(true);
        setError("");

        try {
            await cargarReporte(desde, hasta, responsable);
            setResponsableAplicado(responsable);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error consultando el reporte"
            );
        } finally {
            setConsultando(false);
        }
    }

    // ==========================================================
    // DATOS DEL GRÁFICO
    // ==========================================================

    const evolucion = (reporte?.evolucion ?? []).map(
        (item) => ({
            ...item,
            dia:
                item.fecha.slice(8, 10) +
                "/" +
                item.fecha.slice(5, 7),
        })
    );

    const graficoPorSupervisor =
        responsableAplicado === "todos" && !esVendedor;

    const datosSupervisores = (
        reporte?.evolucionSupervisores ?? []
    ).map((item) => ({
        ...item,
        dia:
            item.fecha.slice(8, 10) +
            "/" +
            item.fecha.slice(5, 7),
    }));

    const datosGrafico = graficoPorSupervisor
        ? datosSupervisores
        : evolucion;
    // ==========================================================
    // ESTADOS DE CARGA
    // ==========================================================

    if (loading) {
        return (
            <div style={estilos.contenedor}>
                Cargando reporte de Altas de Leads...
            </div>
        );
    }

    if (!filtros) {
        return (
            <div style={estilos.contenedor}>
                <h2>No se pudo cargar el reporte.</h2>
                <p style={{ color: "#b91c1c" }}>{error}</p>
            </div>
        );
    }

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
        <div style={estilos.contenedor}>
            {/* ENCABEZADO */}

            <div>
                <h1
                    style={{
                        fontSize: 28,
                        fontWeight: 700,
                        margin: 0,
                    }}
                >
                    Altas de Leads
                </h1>

                <p
                    style={{
                        color: "#6b7280",
                        marginTop: 8,
                    }}
                >
                    Evolución de leads incorporados a EN1CLIC
                </p>
            </div>

            {/* FILTROS */}

            <div style={estilos.panel}>
                <h2
                    style={{
                        fontSize: 18,
                        marginTop: 0,
                        marginBottom: 20,
                    }}
                >
                    Filtros del reporte
                </h2>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                        columnGap: 32,
                        rowGap: 24,
                        alignItems: "end",
                    }}
                >
                    {/* FECHA DESDE */}

                    <label style={estilos.campo}>
                        <span>Fecha desde</span>

                        <input
                            type="date"
                            value={desde}
                            onChange={(e) => setDesde(e.target.value)}
                            style={estilos.control}
                        />
                    </label>

                    {/* FECHA HASTA */}

                    <label style={estilos.campo}>
                        <span>Fecha hasta</span>

                        <input
                            type="date"
                            value={hasta}
                            onChange={(e) => setHasta(e.target.value)}
                            style={estilos.control}
                        />
                    </label>

                    {/* RESPONSABLE COMERCIAL */}

                    <label style={estilos.campo}>
                        <span>Responsable comercial</span>

                        <select
                            value={responsable}
                            onChange={(e) =>
                                setResponsable(e.target.value)
                            }
                            disabled={esVendedor}
                            style={estilos.control}
                        >
                            {opcionesResponsable.map((opcion) => (
                                <option
                                    key={opcion.value}
                                    value={opcion.value}
                                >
                                    {opcion.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* BOTÓN */}

                <div style={{ marginTop: 22 }}>
                    <button
                        type="button"
                        onClick={() => void aplicarFiltros()}
                        disabled={consultando}
                        style={{
                            ...estilos.boton,
                            opacity: consultando ? 0.6 : 1,
                        }}
                    >
                        {consultando
                            ? "Consultando..."
                            : "Aplicar filtros"}
                    </button>
                </div>
            </div>

            {/* ERROR */}

            {error && (
                <div
                    role="alert"
                    style={{
                        marginTop: 18,
                        color: "#991b1b",
                        background: "#fee2e2",
                        padding: 14,
                        borderRadius: 8,
                    }}
                >
                    {error}
                </div>
            )}

            {/* REPORTE */}

            {reporte && (
                <>
                    {/* KPIs */}

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: 18,
                            marginTop: 24,
                        }}
                    >
                        <KPICard
                            titulo="Leads del período"
                            valor={reporte.resumen.clientesPeriodo}
                        />

                        <KPICard
                            titulo="Promedio diario"
                            valor={reporte.resumen.promedioDiario}
                        />

                        <KPICard
                            titulo="Vendedores con Leads"
                            valor={reporte.resumen.vendedoresConAltas}
                        />

                        <KPICard
                            titulo="Sin supervisor histórico"
                            valor={reporte.resumen.sinSupervisor}
                        />
                    </div>


                    {/* GRÁFICO */}

                    <section style={estilos.panel}>
                        <h2 style={{ marginTop: 0, fontSize: 20 }}>
                            Evolución diaria de altas
                        </h2>

                        <p style={estilos.subtitulo}>
                            {reporte.resumen.diasPeriodo} días seleccionados.
                            {graficoPorSupervisor
                                ? " Producción por supervisor histórico."
                                : " Producción del responsable seleccionado."}
                        </p>

                        <div
                            style={{
                                width: "100%",
                                height: 380,
                                marginTop: 20,
                            }}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datosGrafico}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="dia"
                                        tick={{ fontSize: 11 }}
                                        minTickGap={20}
                                    />

                                    <YAxis allowDecimals={false} />

                                    <Tooltip
                                        labelFormatter={(_, payload) =>
                                            payload?.[0]?.payload?.fecha ?? ""
                                        }
                                        formatter={(value, name) => [
                                            Number(value ?? 0),
                                            String(name),
                                        ]}
                                    />

                                    {graficoPorSupervisor ? (
                                        <>
                                            <Legend
                                                verticalAlign="bottom"
                                                wrapperStyle={{ paddingTop: 15 }}
                                            />

                                            {reporte.supervisores.map((supervisor, indice) => (
                                                <Bar
                                                    key={supervisor.id}
                                                    dataKey={supervisor.id}
                                                    name={supervisor.nombre}
                                                    stackId="total"
                                                    fill={colorSupervisor(
                                                        supervisor.id,
                                                        indice
                                                    )}
                                                    maxBarSize={48}
                                                />
                                            ))}
                                        </>
                                    ) : (
                                        <Bar
                                            dataKey="cantidad"
                                            name="Altas"
                                            fill="#2563eb"
                                            radius={[5, 5, 0, 0]}
                                            maxBarSize={42}
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    {/* TABLA POR SUPERVISOR */}

                    {graficoPorSupervisor && (
                        <section style={estilos.panel}>
                            <h2 style={{ marginTop: 0, fontSize: 20 }}>
                                Altas por supervisor
                            </h2>

                            <div style={{ overflowX: "auto" }}>
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        textAlign: "left",
                                    }}
                                >
                                    <thead>
                                        <tr style={{ background: "#f3f4f6" }}>
                                            <th style={{ padding: 12 }}>Supervisor</th>
                                            <th style={{ padding: 12, textAlign: "right" }}>
                                                Leads
                                            </th>
                                            <th style={{ padding: 12, textAlign: "right" }}>
                                                Participación
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {reporte.supervisores.map((s, indice) => (
                                            <tr
                                                key={s.id}
                                                style={{
                                                    borderBottom: "1px solid #e5e7eb",
                                                }}
                                            >
                                                <td style={{ padding: 12 }}>
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            width: 11,
                                                            height: 11,
                                                            borderRadius: 3,
                                                            background: colorSupervisor(s.id, indice),
                                                            marginRight: 10,
                                                        }}
                                                    />
                                                    {s.nombre}
                                                </td>

                                                <td
                                                    style={{
                                                        padding: 12,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    {s.cantidad}
                                                </td>

                                                <td
                                                    style={{
                                                        padding: 12,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    {reporte.resumen.clientesPeriodo
                                                        ? (
                                                            (s.cantidad /
                                                                reporte.resumen.clientesPeriodo) *
                                                            100
                                                        ).toFixed(1)
                                                        : "0.0"}
                                                    %
                                                </td>
                                            </tr>
                                        ))}

                                        <tr
                                            style={{
                                                fontWeight: 700,
                                                background: "#f9fafb",
                                            }}
                                        >
                                            <td style={{ padding: 12 }}>TOTAL</td>
                                            <td style={{ padding: 12, textAlign: "right" }}>
                                                {reporte.resumen.clientesPeriodo}
                                            </td>
                                            <td style={{ padding: 12, textAlign: "right" }}>
                                                {reporte.resumen.clientesPeriodo > 0
                                                    ? "100.0%"
                                                    : "0.0%"}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* TABLA POR VENDEDOR */}

                    <section style={estilos.panel}>
                        <h2
                            style={{
                                marginTop: 0,
                                fontSize: 20,
                            }}
                        >
                            Leads por vendedor
                        </h2>

                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    textAlign: "left",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background: "#f3f4f6",
                                        }}
                                    >
                                        <th style={{ padding: 12 }}>
                                            Vendedor
                                        </th>

                                        <th
                                            style={{
                                                padding: 12,
                                                textAlign: "right",
                                            }}
                                        >
                                            Leads
                                        </th>

                                        <th
                                            style={{
                                                padding: 12,
                                                textAlign: "right",
                                            }}
                                        >
                                            Participación
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {reporte.vendedores.map((v) => (
                                        <tr
                                            key={v.id}
                                            style={{
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            <td style={{ padding: 12 }}>
                                                {v.nombre}
                                            </td>

                                            <td
                                                style={{
                                                    padding: 12,
                                                    textAlign: "right",
                                                }}
                                            >
                                                {v.cantidad}
                                            </td>

                                            <td
                                                style={{
                                                    padding: 12,
                                                    textAlign: "right",
                                                }}
                                            >
                                                {reporte.resumen.clientesPeriodo
                                                    ? (
                                                        (v.cantidad /
                                                            reporte.resumen
                                                                .clientesPeriodo) *
                                                        100
                                                    ).toFixed(1)
                                                    : "0.0"}
                                                %
                                            </td>
                                        </tr>
                                    ))}

                                    {reporte.vendedores.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                style={{
                                                    padding: 20,
                                                    color: "#6b7280",
                                                    textAlign: "center",
                                                }}
                                            >
                                                No hay altas registradas en
                                                este período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

const COLORES_SUPERVISORES = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#9333ea",
    "#dc2626",
    "#0891b2",
    "#db2777",
    "#64748b",
];

function colorSupervisor(id: string, indice: number) {
    if (id === "sin_supervisor") return "#9ca3af";

    return COLORES_SUPERVISORES[
        indice % COLORES_SUPERVISORES.length
    ];
}