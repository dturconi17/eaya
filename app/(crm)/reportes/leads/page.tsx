
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KPICard from "../components/KPICard";

import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

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

type ProductoLead = {
    id: string;
    productoId: string;
    nombre: string;
    estado: string;
    precioActual: number | null;
    moneda: string | null;
    activo: boolean | null;
    fechaAlta: string;
    fechaActualizacion: string;
};

type Lead = {
    id: string;
    nombre: string;
    apellido: string;
    nombreCompleto: string;
    tipoDocumento: string;
    numeroDocumento: string;
    email: string | null;
    celular: string | null;
    provincia: string | null;
    localidad: string | null;
    fechaAlta: string | null;
    vendedorId: string | null;
    vendedorNombre: string;
    supervisorId: string | null;
    supervisorNombre: string;
    supervisorHistoricoId: string | null;
    puntoVentaId: string | null;
    onboardingEtapa: string;
    onboardingCompletado: boolean;
    cantidadProductos: number;
    tieneProductos: boolean;
    productos: ProductoLead[];
};

type Reporte = {
    role: string;
    resumen: {
        totalLeads: number;
        onboardingCompletado: number;
        onboardingPendiente: number;
    };
    paginacion: {
        pagina: number;
        limite: number;
        totalRegistros: number;
        totalPaginas: number;
    };
    opciones: {
        vendedores: {
            id: string;
            nombre: string | null;
            activo: boolean;
        }[];
    };
    leads: Lead[];
};

type Filtros = {
    desde: string;
    hasta: string;
    responsable: string;
    busqueda: string;
    onboarding: string;
    limite: number;
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

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

function filtrosIniciales(): Filtros {
    const hasta = fechaArgentina();

    return {
        desde: `${hasta.slice(0, 7)}-01`,
        hasta,
        responsable: "todos",
        busqueda: "",
        onboarding: "todos",
        limite: 50,
    };
}

function nombreUsuario(usuario: Usuario) {
    return (
        usuario.nombre?.trim() ||
        usuario.full_name?.trim() ||
        usuario.email?.trim() ||
        `Usuario ${usuario.id.slice(0, 8)}`
    );
}

function formatearFecha(fecha: string | null) {
    if (!fecha) return "—";

    const dia = fecha.slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
        return "—";
    }

    return dia.split("-").reverse().join("/");
}

function convertirFechaLocal(fecha: string): Date | null {
    if (!fecha) return null;

    const [anio, mes, dia] = fecha.split("-").map(Number);

    return new Date(anio, mes - 1, dia);
}

function convertirFechaISO(fecha: Date | null): string {
    if (!fecha) return "";

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function formatearPrecio(
    precio: number | null,
    moneda: string | null
) {
    if (precio === null) return "—";

    return `${moneda ?? ""} ${new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio)}`.trim();
}

function formatearNumero(numero: number) {
    return new Intl.NumberFormat("es-AR").format(numero);
}

async function obtenerToken() {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
        throw new Error(
            "Tu sesión expiró. Volvé a ingresar."
        );
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

function construirParametros(
    filtros: Filtros,
    pagina: number
) {
    const params = new URLSearchParams({
        desde: filtros.desde,
        hasta: filtros.hasta,
        pagina: String(pagina),
        limite: String(filtros.limite),
    });

    if (filtros.responsable.startsWith("supervisor:")) {
        params.set(
            "supervisorId",
            filtros.responsable.slice("supervisor:".length)
        );
    }

    if (filtros.responsable.startsWith("vendedor:")) {
        params.set(
            "vendedorId",
            filtros.responsable.slice("vendedor:".length)
        );
    }

    if (filtros.busqueda.trim()) {
        params.set("busqueda", filtros.busqueda.trim());
    }

    if (filtros.onboarding !== "todos") {
        params.set(
            "onboardingCompletado",
            filtros.onboarding
        );
    }

    return params;
}

async function consultarLeads(
    filtros: Filtros,
    pagina: number
) {
    const params = construirParametros(filtros, pagina);

    return solicitar<Reporte>(
        `/api/reportes/leads?${params.toString()}`
    );
}

// ============================================================
// ESTILOS
// ============================================================

const estilos = {
    contenedor: {
        padding: 24,
        maxWidth: 1600,
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

    botonSecundario: {
        background: "#ffffff",
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: "10px 16px",
        cursor: "pointer",
        fontWeight: 500,
        fontSize: 13,
    },

    tabla: {
        width: "100%",
        borderCollapse: "collapse" as const,
        textAlign: "left" as const,
        fontSize: 13,
    },

    th: {
        padding: "13px 12px",
        background: "#f3f4f6",
        fontWeight: 600,
        whiteSpace: "nowrap" as const,
    },

    td: {
        padding: "14px 12px",
        borderBottom: "1px solid #e5e7eb",
        verticalAlign: "middle" as const,
    },

    subtitulo: {
        color: "#6b7280",
        fontSize: 13,
    },

    detalle: {
        background: "#f9fafb",
        padding: 20,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
    },

    etiquetaDetalle: {
        color: "#6b7280",
        fontSize: 12,
        marginBottom: 5,
    },
};

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function EstadoOnboarding({
    completado,
}: {
    completado: boolean;
}) {
    return (
        <span
            style={{
                display: "inline-block",
                padding: "5px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                background: completado
                    ? "#dcfce7"
                    : "#fef3c7",
                color: completado
                    ? "#166534"
                    : "#92400e",
            }}
        >
            {completado ? "Completo" : "Pendiente"}
        </span>
    );
}

function DatoDetalle({
    titulo,
    valor,
}: {
    titulo: string;
    valor: string | null;
}) {
    return (
        <div style={{ minWidth: 0 }}>
            <div style={estilos.etiquetaDetalle}>
                {titulo}
            </div>

            <div
                style={{
                    fontSize: 14,
                    fontWeight: 500,
                    overflowWrap: "anywhere",
                }}
            >
                {valor || "—"}
            </div>
        </div>
    );
}

// ============================================================
// DETALLE DEL LEAD
// ============================================================

function DetalleLead({ lead }: { lead: Lead }) {
    return (
        <div style={estilos.detalle}>
            <h3
                style={{
                    marginTop: 0,
                    fontSize: 16,
                    marginBottom: 20,
                }}
            >
                Información del cliente
            </h3>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 20,
                }}
            >
                <DatoDetalle
                    titulo="Nombre completo"
                    valor={lead.nombreCompleto}
                />

                <DatoDetalle
                    titulo="Documento"
                    valor={`${lead.tipoDocumento} ${lead.numeroDocumento}`}
                />

                <DatoDetalle
                    titulo="Email"
                    valor={lead.email}
                />

                <DatoDetalle
                    titulo="Celular"
                    valor={lead.celular}
                />

                <DatoDetalle
                    titulo="Provincia"
                    valor={lead.provincia}
                />

                <DatoDetalle
                    titulo="Localidad"
                    valor={lead.localidad}
                />

                <DatoDetalle
                    titulo="Vendedor"
                    valor={lead.vendedorNombre}
                />

                <DatoDetalle
                    titulo="Supervisor actual"
                    valor={lead.supervisorNombre}
                />

                <DatoDetalle
                    titulo="Fecha de alta"
                    valor={formatearFecha(lead.fechaAlta)}
                />

                <DatoDetalle
                    titulo="Etapa de onboarding"
                    valor={lead.onboardingEtapa}
                />
            </div>

            {/* PRODUCTOS ASOCIADOS */}

            <div
                style={{
                    borderTop: "1px solid #e5e7eb",
                    marginTop: 24,
                    paddingTop: 20,
                }}
            >
                <h3
                    style={{
                        fontSize: 16,
                        marginTop: 0,
                    }}
                >
                    Productos asociados ({lead.cantidadProductos})
                </h3>

                {lead.productos.length === 0 ? (
                    <div
                        style={{
                            padding: 16,
                            background: "#ffffff",
                            border: "1px dashed #d1d5db",
                            borderRadius: 8,
                            color: "#6b7280",
                            fontSize: 14,
                        }}
                    >
                        Este lead todavía no tiene productos
                        asociados.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={estilos.tabla}>
                            <thead>
                                <tr>
                                    <th style={estilos.th}>
                                        Producto
                                    </th>

                                    <th style={estilos.th}>
                                        Estado comercial
                                    </th>

                                    <th style={estilos.th}>
                                        Precio actual
                                    </th>

                                    <th style={estilos.th}>
                                        Fecha de alta
                                    </th>

                                    <th style={estilos.th}>
                                        Última actualización
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {lead.productos.map((producto) => (
                                    <tr key={producto.id}>
                                        <td style={estilos.td}>
                                            <strong>
                                                {producto.nombre}
                                            </strong>

                                            {producto.activo === false && (
                                                <div
                                                    style={{
                                                        color: "#991b1b",
                                                        fontSize: 11,
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    Producto inactivo
                                                </div>
                                            )}
                                        </td>

                                        <td style={estilos.td}>
                                            {producto.estado}
                                        </td>

                                        <td style={estilos.td}>
                                            {formatearPrecio(
                                                producto.precioActual,
                                                producto.moneda
                                            )}
                                        </td>

                                        <td style={estilos.td}>
                                            {formatearFecha(
                                                producto.fechaAlta
                                            )}
                                        </td>

                                        <td style={estilos.td}>
                                            {formatearFecha(
                                                producto.fechaActualizacion
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ListadoLeadsPage() {
    const [inicial] = useState(filtrosIniciales);

    const [filtros, setFiltros] =
        useState<Filtros>(inicial);

    const [filtrosAplicados, setFiltrosAplicados] =
        useState<Filtros>(inicial);

    const [opciones, setOpciones] =
        useState<FiltrosDisponibles | null>(null);

    const [reporte, setReporte] =
        useState<Reporte | null>(null);

    const [leadExpandido, setLeadExpandido] =
        useState<string | null>(null);

    const [loading, setLoading] = useState(true);

    const [consultando, setConsultando] =
        useState(false);

    const [error, setError] = useState("");
    const [exportandoPDF, setExportandoPDF] = useState(false);

    const [progresoPDF, setProgresoPDF] = useState("");

    // ========================================================
    // CARGA INICIAL
    // ========================================================

    useEffect(() => {
        let cancelado = false;

        async function iniciar() {
            setLoading(true);
            setError("");

            try {
                const [datos, filtrosDisponibles] =
                    await Promise.all([
                        consultarLeads(inicial, 1),
                        solicitar<FiltrosDisponibles>(
                            "/api/reportes/filtros"
                        ).catch(() => null),
                    ]);

                if (cancelado) return;

                setReporte(datos);
                setOpciones(filtrosDisponibles);
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
    }, [inicial]);

    // ========================================================
    // PERMISOS
    // ========================================================

    const role = reporte?.role?.toLowerCase() ?? "";

    const esAdmin =
        role === "admin" || role === "gerente";

    const esSupervisor = role === "supervisor";

    const esVendedor = role === "vendedor";

    // ========================================================
    // OPCIONES DEL RESPONSABLE COMERCIAL
    // ========================================================

    const opcionesResponsable = useMemo(() => {
        const resultado = [
            {
                value: "todos",
                label: esVendedor
                    ? "Mis leads"
                    : esSupervisor
                        ? "Todo mi equipo"
                        : "Todos los responsables",
            },
        ];

        if (esAdmin) {
            for (const supervisor of opciones?.supervisores ?? []) {
                resultado.push({
                    value: `supervisor:${supervisor.id}`,
                    label: `Supervisor · ${nombreUsuario(supervisor)}`,
                });
            }

            for (const vendedor of opciones?.vendedores ?? []) {
                resultado.push({
                    value: `vendedor:${vendedor.id}`,
                    label: `Vendedor · ${nombreUsuario(vendedor)}`,
                });
            }
        }

        // Para supervisores usamos exclusivamente el equipo
        // autorizado por el backend del nuevo reporte.

        if (esSupervisor) {
            for (const vendedor of reporte?.opciones.vendedores ?? []) {
                resultado.push({
                    value: `vendedor:${vendedor.id}`,
                    label: `Vendedor · ${vendedor.nombre ?? vendedor.id.slice(0, 8)}${vendedor.activo ? "" : " (Inactivo)"}`,
                });
            }
        }

        return resultado;
    }, [
        opciones,
        reporte,
        esAdmin,
        esSupervisor,
        esVendedor,
    ]);

    // ========================================================
    // ACTUALIZAR FILTROS
    // ========================================================

    function actualizarFiltro<K extends keyof Filtros>(
        campo: K,
        valor: Filtros[K]
    ) {
        setFiltros((anterior) => ({
            ...anterior,
            [campo]: valor,
        }));
    }

    // ========================================================
    // CARGAR REPORTE
    // ========================================================

    async function cargarReporte(
        filtrosConsulta: Filtros,
        pagina: number
    ) {
        if (consultando || exportandoPDF) return;
        if (
            !filtrosConsulta.desde ||
            !filtrosConsulta.hasta ||
            filtrosConsulta.desde > filtrosConsulta.hasta
        ) {
            setError("Seleccioná un rango de fechas válido.");
            return;
        }

        setConsultando(true);
        setError("");
        setLeadExpandido(null);

        try {
            const datos = await consultarLeads(
                filtrosConsulta,
                pagina
            );

            setReporte(datos);
            setFiltrosAplicados(filtrosConsulta);
        } catch (err) {
            setReporte(null);

            setError(
                err instanceof Error
                    ? err.message
                    : "Error consultando el reporte"
            );
        } finally {
            setConsultando(false);
        }
    }

    async function aplicarFiltros() {
        await cargarReporte(filtros, 1);
    }

    async function limpiarFiltros() {
        const nuevosFiltros = filtrosIniciales();

        setFiltros(nuevosFiltros);

        await cargarReporte(nuevosFiltros, 1);
    }

    async function cambiarPagina(pagina: number) {
        if (!reporte || consultando) return;

        if (
            pagina < 1 ||
            pagina > reporte.paginacion.totalPaginas
        ) {
            return;
        }

        await cargarReporte(
            filtrosAplicados,
            pagina
        );
    }

    async function exportarPDF() {
        if (!reporte || exportandoPDF || consultando) return;

        setExportandoPDF(true);
        setError("");
        setProgresoPDF("Preparando exportación...");

        try {
            // Cargar las librerías únicamente al exportar.
            const { jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            // Utilizar los filtros efectivamente aplicados.
            const filtrosExportacion: Filtros = {
                ...filtrosAplicados,
                limite: 100,
            };

            const todosLosLeads: Lead[] = [];

            // Obtener la primera página.
            const primeraPagina = await consultarLeads(
                filtrosExportacion,
                1
            );

            todosLosLeads.push(...primeraPagina.leads);

            const totalPaginas =
                primeraPagina.paginacion.totalPaginas;

            const totalRegistros =
                primeraPagina.paginacion.totalRegistros;

            // Recorrer todas las páginas del reporte.
            for (let pagina = 2; pagina <= totalPaginas; pagina++) {
                setProgresoPDF(
                    `Obteniendo página ${pagina} de ${totalPaginas}...`
                );

                const datos = await consultarLeads(
                    filtrosExportacion,
                    pagina
                );

                todosLosLeads.push(...datos.leads);
            }

            // Verificar que la consulta no haya cambiado
            // durante la exportación.
            const idsUnicos = new Set(
                todosLosLeads.map((lead) => lead.id)
            );

            if (
                todosLosLeads.length !== totalRegistros ||
                idsUnicos.size !== todosLosLeads.length
            ) {
                throw new Error(
                    "El listado cambió durante la exportación. Volvé a intentarlo."
                );
            }

            if (todosLosLeads.length === 0) {
                throw new Error(
                    "No hay leads para exportar."
                );
            }

            setProgresoPDF("Generando documento PDF...");

            // ====================================================
            // CONFIGURACIÓN DEL DOCUMENTO
            // ====================================================

            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
            });

            const anchoPagina = doc.internal.pageSize.getWidth();
            const altoPagina = doc.internal.pageSize.getHeight();

            const margen = 12;

            // ====================================================
            // ENCABEZADO
            // ====================================================

            doc.setFillColor(17, 24, 39);
            doc.rect(0, 0, anchoPagina, 24, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(19);
            doc.text("EAYA | CRM Comercial", margen, 11);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Reporte de prospectos", margen, 18);

            doc.setFontSize(9);
            doc.text(
                `Emisión: ${formatearFecha(fechaArgentina())}`,
                anchoPagina - margen,
                11,
                { align: "right" }
            );

            // ====================================================
            // TÍTULO Y FILTROS
            // ====================================================

            doc.setTextColor(17, 24, 39);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(17);
            doc.text("Listado de Leads", margen, 34);

            const responsable =
                opcionesResponsable.find(
                    (opcion) =>
                        opcion.value === filtrosExportacion.responsable
                )?.label ?? "Responsable seleccionado";

            const estadoOnboarding =
                filtrosExportacion.onboarding === "true"
                    ? "Completo"
                    : filtrosExportacion.onboarding === "false"
                        ? "Pendiente"
                        : "Todos";

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(75, 85, 99);

            doc.text(
                `Período: ${formatearFecha(filtrosExportacion.desde)} al ${formatearFecha(filtrosExportacion.hasta)}`,
                margen,
                42
            );

            const textoFiltros = [
                `Responsable comercial: ${responsable}`,
                `Onboarding: ${estadoOnboarding}`,
                `Búsqueda: ${filtrosExportacion.busqueda.trim() || "Sin búsqueda"}`,
            ];

            let posicionY = 48;

            for (const texto of textoFiltros) {
                const lineas = doc.splitTextToSize(
                    texto,
                    anchoPagina - margen * 2
                );

                doc.text(lineas, margen, posicionY);

                posicionY += lineas.length * 5 + 1;
            }

            // ====================================================
            // INDICADORES
            // ====================================================

            const indicadores = [
                {
                    titulo: "Total de leads",
                    valor: todosLosLeads.length,
                },
                {
                    titulo: "Onboarding completo",
                    valor: todosLosLeads.filter(
                        (lead) => lead.onboardingCompletado
                    ).length,
                },
                {
                    titulo: "Onboarding pendiente",
                    valor: todosLosLeads.filter(
                        (lead) => !lead.onboardingCompletado
                    ).length,
                },
            ];

            const separacion = 5;

            const anchoTarjeta =
                (anchoPagina - margen * 2 - separacion * 2) / 3;

            const yIndicadores = posicionY + 3;

            indicadores.forEach((indicador, index) => {
                const x =
                    margen + index * (anchoTarjeta + separacion);

                doc.setFillColor(243, 246, 250);

                doc.roundedRect(
                    x,
                    yIndicadores,
                    anchoTarjeta,
                    22,
                    2,
                    2,
                    "F"
                );

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(75, 85, 99);

                doc.text(
                    indicador.titulo,
                    x + 5,
                    yIndicadores + 7
                );

                doc.setFont("helvetica", "bold");
                doc.setFontSize(18);
                doc.setTextColor(37, 99, 235);

                doc.text(
                    formatearNumero(indicador.valor),
                    x + 5,
                    yIndicadores + 17
                );
            });

            // ====================================================
            // TABLA DE LEADS
            // ====================================================

            autoTable(doc, {
                startY: yIndicadores + 29,

                head: [[
                    "Fecha de alta",
                    "Cliente",
                    "Documento",
                    "Celular",
                    "Vendedor",
                    "Supervisor",
                    "Onboarding",
                    "Productos",
                ]],

                body: todosLosLeads.map((lead) => [
                    formatearFecha(lead.fechaAlta),
                    lead.nombreCompleto || "-",
                    lead.numeroDocumento || "-",
                    lead.celular || "-",
                    lead.vendedorNombre || "-",
                    lead.supervisorNombre || "-",
                    lead.onboardingCompletado
                        ? "Completo"
                        : "Pendiente",
                    String(lead.cantidadProductos),
                ]),

                theme: "striped",

                showHead: "everyPage",

                margin: {
                    top: 15,
                    left: margen,
                    right: margen,
                    bottom: 18,
                },

                styles: {
                    font: "helvetica",
                    fontSize: 8,
                    cellPadding: 3,
                    overflow: "linebreak",
                    valign: "middle",
                    textColor: [31, 41, 55],
                },

                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 8,
                },

                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },

                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 51 },
                    2: { cellWidth: 28 },
                    3: { cellWidth: 31 },
                    4: { cellWidth: 45 },
                    5: { cellWidth: 45 },
                    6: { cellWidth: 29 },
                    7: {
                        cellWidth: 19,
                        halign: "center",
                    },
                },

                rowPageBreak: "avoid",

                didParseCell: (data) => {
                    if (
                        data.section === "body" &&
                        data.column.index === 6
                    ) {
                        if (data.cell.raw === "Completo") {
                            data.cell.styles.textColor = [22, 101, 52];
                        } else {
                            data.cell.styles.textColor = [146, 64, 14];
                        }
                    }
                },
            });

            // ====================================================
            // PIE DE PÁGINA
            // ====================================================

            const cantidadPaginas = doc.getNumberOfPages();

            for (
                let pagina = 1;
                pagina <= cantidadPaginas;
                pagina++
            ) {
                doc.setPage(pagina);

                doc.setDrawColor(209, 213, 219);

                doc.line(
                    margen,
                    altoPagina - 13,
                    anchoPagina - margen,
                    altoPagina - 13
                );

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128);

                doc.text(
                    "EAYA - Información comercial confidencial",
                    margen,
                    altoPagina - 8
                );

                doc.text(
                    `Página ${pagina} de ${cantidadPaginas}`,
                    anchoPagina - margen,
                    altoPagina - 8,
                    { align: "right" }
                );
            }

            // ====================================================
            // DESCARGAR ARCHIVO
            // ====================================================

            const nombreArchivo =
                `EAYA_Leads_${filtrosExportacion.desde}_${filtrosExportacion.hasta}.pdf`;

            doc.save(nombreArchivo);

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error generando el archivo PDF."
            );
        } finally {
            setExportandoPDF(false);
            setProgresoPDF("");
        }
    }

    function alternarDetalle(leadId: string) {
        setLeadExpandido((anterior) =>
            anterior === leadId ? null : leadId
        );
    }

    // ========================================================
    // PAGINACIÓN
    // ========================================================

    const paginacion = reporte?.paginacion;

    const primerRegistro =
        paginacion && paginacion.totalRegistros > 0
            ? (paginacion.pagina - 1) *
            paginacion.limite +
            1
            : 0;

    const ultimoRegistro = paginacion
        ? Math.min(
            paginacion.pagina * paginacion.limite,
            paginacion.totalRegistros
        )
        : 0;

    // ========================================================
    // ESTADO DE CARGA
    // ========================================================

    if (loading) {
        return (
            <div style={estilos.contenedor}>
                Cargando listado de leads...
            </div>
        );
    }

    // ========================================================
    // RENDER
    // ========================================================

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
                    Listado de Leads
                </h1>

                <p
                    style={{
                        color: "#6b7280",
                        marginTop: 8,
                    }}
                >
                    {esVendedor
                        ? "Consultá y gestioná tus leads."
                        : esSupervisor
                            ? "Consultá los leads de tu equipo comercial."
                            : "Consultá los leads incorporados a EN1CLIC."}
                </p>
            </div>

            {/* FILTROS */}

            <form
                style={estilos.panel}
                onSubmit={(e) => {
                    e.preventDefault();
                    void aplicarFiltros();
                }}
            >
                <h2
                    style={{
                        fontSize: 18,
                        marginTop: 0,
                        marginBottom: 20,
                    }}
                >
                    Filtros del reporte
                </h2>

                <fieldset
                    disabled={consultando || exportandoPDF}
                    style={{
                        border: 0,
                        padding: 0,
                        margin: 0,
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                            gap: 22,
                            alignItems: "end",
                        }}
                    >
                        <label style={estilos.campo}>
                            <span>Fecha de alta desde</span>

                            <DatePicker
                                selected={convertirFechaLocal(filtros.desde)}
                                onChange={(fecha: Date | null) =>
                                    actualizarFiltro(
                                        "desde",
                                        convertirFechaISO(fecha)
                                    )
                                }
                                maxDate={convertirFechaLocal(filtros.hasta) ?? undefined}
                                dateFormat="dd/MM/yyyy"
                                locale="es"
                                placeholderText="DD/MM/AAAA"
                                disabled={consultando || exportandoPDF}
                                required
                                customInput={
                                    <input style={estilos.control} />
                                }
                            />
                        </label>

                        <label style={estilos.campo}>
                            <span>Fecha de alta hasta</span>

                            <DatePicker
                                selected={convertirFechaLocal(filtros.hasta)}
                                onChange={(fecha: Date | null) =>
                                    actualizarFiltro(
                                        "hasta",
                                        convertirFechaISO(fecha)
                                    )
                                }
                                minDate={convertirFechaLocal(filtros.desde) ?? undefined}
                                dateFormat="dd/MM/yyyy"
                                locale="es"
                                placeholderText="DD/MM/AAAA"
                                disabled={consultando || exportandoPDF}
                                required
                                customInput={
                                    <input style={estilos.control} />
                                }
                            />
                        </label>

                        <label style={estilos.campo}>
                            <span>Responsable comercial</span>

                            <select
                                value={filtros.responsable}
                                disabled={esVendedor || !role}
                                onChange={(e) =>
                                    actualizarFiltro(
                                        "responsable",
                                        e.target.value
                                    )
                                }
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

                        <label style={estilos.campo}>
                            <span>Buscar cliente</span>

                            <input
                                type="search"
                                maxLength={100}
                                placeholder="Nombre, DNI, email o celular"
                                value={filtros.busqueda}
                                onChange={(e) =>
                                    actualizarFiltro(
                                        "busqueda",
                                        e.target.value
                                    )
                                }
                                style={estilos.control}
                            />
                        </label>

                        <label style={estilos.campo}>
                            <span>Estado de onboarding</span>

                            <select
                                value={filtros.onboarding}
                                onChange={(e) =>
                                    actualizarFiltro(
                                        "onboarding",
                                        e.target.value
                                    )
                                }
                                style={estilos.control}
                            >
                                <option value="todos">
                                    Todos
                                </option>

                                <option value="true">
                                    Completo
                                </option>

                                <option value="false">
                                    Pendiente
                                </option>
                            </select>
                        </label>

                        <label style={estilos.campo}>
                            <span>Registros por página</span>

                            <select
                                value={filtros.limite}
                                onChange={(e) =>
                                    actualizarFiltro(
                                        "limite",
                                        Number(e.target.value)
                                    )
                                }
                                style={estilos.control}
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </label>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 12,
                            marginTop: 24,
                        }}
                    >
                        <button
                            type="submit"
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

                        <button
                            type="button"
                            onClick={() => void limpiarFiltros()}
                            disabled={consultando}
                            style={estilos.botonSecundario}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </fieldset>
            </form>

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
                    {/* INDICADORES */}

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
                            titulo="Total de leads"
                            valor={reporte.resumen.totalLeads}
                        />

                        <KPICard
                            titulo="Onboarding completo"
                            valor={reporte.resumen.onboardingCompletado}
                        />

                        <KPICard
                            titulo="Onboarding pendiente"
                            valor={reporte.resumen.onboardingPendiente}
                        />
                    </div>

                    {/* LISTADO DE LEADS */}

                    <section
                        style={{
                            ...estilos.panel,
                            opacity: consultando ? 0.65 : 1,
                        }}
                        aria-busy={consultando}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12,
                                marginBottom: 20,
                            }}
                        >
                            <div>
                                <h2
                                    style={{
                                        fontSize: 20,
                                        margin: 0,
                                    }}
                                >
                                    Leads del período
                                </h2>

                                <p style={estilos.subtitulo}>
                                    {formatearFecha(
                                        filtrosAplicados.desde
                                    )}
                                    {" al "}
                                    {formatearFecha(
                                        filtrosAplicados.hasta
                                    )}
                                    {" · "}
                                    {formatearNumero(
                                        reporte.paginacion.totalRegistros
                                    )}
                                    {" registros"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void exportarPDF()}
                                disabled={
                                    exportandoPDF ||
                                    consultando ||
                                    reporte.paginacion.totalRegistros === 0
                                }
                                style={{
                                    ...estilos.boton,
                                    background: "#b91c1c",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    opacity:
                                        exportandoPDF ||
                                            consultando ||
                                            reporte.paginacion.totalRegistros === 0
                                            ? 0.5
                                            : 1,
                                    cursor:
                                        exportandoPDF ||
                                            consultando ||
                                            reporte.paginacion.totalRegistros === 0
                                            ? "not-allowed"
                                            : "pointer",
                                }}
                            >
                                {exportandoPDF
                                    ? progresoPDF || "Exportando..."
                                    : "Exportar PDF"}
                            </button>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    ...estilos.tabla,
                                    minWidth: 1050,
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th style={estilos.th}>
                                            Fecha de alta
                                        </th>

                                        <th style={estilos.th}>
                                            Cliente
                                        </th>

                                        <th style={estilos.th}>
                                            Documento
                                        </th>

                                        <th style={estilos.th}>
                                            Celular
                                        </th>

                                        <th style={estilos.th}>
                                            Vendedor
                                        </th>

                                        <th style={estilos.th}>
                                            Supervisor
                                        </th>

                                        <th style={estilos.th}>
                                            Onboarding
                                        </th>

                                        <th
                                            style={{
                                                ...estilos.th,
                                                textAlign: "center",
                                            }}
                                        >
                                            Productos
                                        </th>

                                        <th style={estilos.th}>
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                {reporte.leads.map((lead) => (
                                    <tbody key={lead.id}>
                                        <tr
                                            style={{
                                                background:
                                                    leadExpandido === lead.id
                                                        ? "#f8fafc"
                                                        : "#ffffff",
                                            }}
                                        >
                                            <td
                                                style={{
                                                    ...estilos.td,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {formatearFecha(
                                                    lead.fechaAlta
                                                )}
                                            </td>

                                            <td style={estilos.td}>
                                                <strong>
                                                    {lead.nombreCompleto}
                                                </strong>
                                            </td>

                                            <td style={estilos.td}>
                                                {lead.numeroDocumento}
                                            </td>

                                            <td style={estilos.td}>
                                                {lead.celular || "—"}
                                            </td>

                                            <td style={estilos.td}>
                                                {lead.vendedorNombre}
                                            </td>

                                            <td style={estilos.td}>
                                                {lead.supervisorNombre}
                                            </td>

                                            <td style={estilos.td}>
                                                <EstadoOnboarding
                                                    completado={
                                                        lead.onboardingCompletado
                                                    }
                                                />
                                            </td>

                                            <td
                                                style={{
                                                    ...estilos.td,
                                                    textAlign: "center",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        minWidth: 28,
                                                        padding: "5px 9px",
                                                        borderRadius: 8,
                                                        fontWeight: 600,
                                                        background:
                                                            lead.tieneProductos
                                                                ? "#dbeafe"
                                                                : "#f3f4f6",
                                                        color:
                                                            lead.tieneProductos
                                                                ? "#1d4ed8"
                                                                : "#6b7280",
                                                    }}
                                                >
                                                    {lead.cantidadProductos}
                                                </span>
                                            </td>

                                            <td style={estilos.td}>
                                                <button
                                                    type="button"
                                                    disabled={consultando}
                                                    aria-expanded={
                                                        leadExpandido === lead.id
                                                    }
                                                    onClick={() =>
                                                        alternarDetalle(
                                                            lead.id
                                                        )
                                                    }
                                                    style={{
                                                        ...estilos.botonSecundario,
                                                        whiteSpace: "nowrap",
                                                        color: "#2563eb",
                                                    }}
                                                >
                                                    {leadExpandido === lead.id
                                                        ? "Ver menos"
                                                        : "Ver más"}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* DETALLE EXPANDIBLE */}

                                        {leadExpandido === lead.id && (
                                            <tr>
                                                <td
                                                    colSpan={9}
                                                    style={{
                                                        padding: 16,
                                                        background: "#ffffff",
                                                    }}
                                                >
                                                    <DetalleLead lead={lead} />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                ))}

                                {/* SIN RESULTADOS */}

                                {reporte.leads.length === 0 && (
                                    <tbody>
                                        <tr>
                                            <td
                                                colSpan={9}
                                                style={{
                                                    padding: 40,
                                                    textAlign: "center",
                                                    color: "#6b7280",
                                                }}
                                            >
                                                No hay leads para los filtros
                                                seleccionados en esta página.
                                            </td>
                                        </tr>
                                    </tbody>
                                )}
                            </table>
                        </div>

                        {/* PAGINACIÓN */}

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 16,
                                marginTop: 24,
                            }}
                        >
                            <span style={estilos.subtitulo}>
                                Mostrando{" "}
                                {formatearNumero(primerRegistro)}
                                {" a "}
                                {formatearNumero(ultimoRegistro)}
                                {" de "}
                                {formatearNumero(
                                    reporte.paginacion.totalRegistros
                                )}
                                {" leads"}
                            </span>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    flexWrap: "wrap",
                                }}
                            >
                                <button
                                    type="button"
                                    disabled={
                                        consultando ||
                                        reporte.paginacion.pagina <= 1
                                    }
                                    onClick={() =>
                                        void cambiarPagina(
                                            reporte.paginacion.pagina - 1
                                        )
                                    }
                                    style={{
                                        ...estilos.botonSecundario,
                                        opacity:
                                            consultando ||
                                                reporte.paginacion.pagina <= 1
                                                ? 0.4
                                                : 1,
                                    }}
                                >
                                    Anterior
                                </button>

                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}
                                >
                                    Página{" "}
                                    {reporte.paginacion.totalPaginas === 0
                                        ? 0
                                        : reporte.paginacion.pagina}
                                    {" de "}
                                    {reporte.paginacion.totalPaginas}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        consultando ||
                                        reporte.paginacion.pagina >=
                                        reporte.paginacion.totalPaginas
                                    }
                                    onClick={() =>
                                        void cambiarPagina(
                                            reporte.paginacion.pagina + 1
                                        )
                                    }
                                    style={{
                                        ...estilos.botonSecundario,
                                        opacity:
                                            consultando ||
                                                reporte.paginacion.pagina >=
                                                reporte.paginacion.totalPaginas
                                                ? 0.4
                                                : 1,
                                    }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
