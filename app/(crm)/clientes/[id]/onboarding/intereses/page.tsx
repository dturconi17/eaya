"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Info,
    PackageCheck,
    Save,
    ShoppingBag,
    User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type TipoRespuesta =
    | "binaria"
    | "ternaria"
    | "texto"
    | "texto_largo"
    | "numero"
    | "fecha"
    | "seleccion"
    | "seleccion_multiple";

type Cliente = {
    id: string;
    nombre: string;
    apellido: string;
    numero_documento: string;
};

type Pregunta = {
    id: string;
    pregunta: string;
    codigo: string;
    descripcion: string | null;
    categoria: string | null;
    tipo_pregunta: "perfil" | "trigger_producto";
    tipo_respuesta: TipoRespuesta;
    configuracion: {
        opciones?: string[];
        minimo?: number | null;
        maximo?: number | null;
    } | null;
    orden: number;
    activo: boolean;
};

type Trigger = {
    id: string;
    pregunta_id: string;
    producto_id: string;
    valor_disparador: number;
    activo: boolean;
};

type RespuestaEstado = {
    valor?: number | null;
    texto?: string;
    numero?: string;
    fecha?: string;
    seleccion?: string;
    seleccion_multiple?: string[];
};

type RespuestaGuardada = {
    pregunta_id: string;
    respuesta: {
        tipo?: TipoRespuesta;
        valor?: number | string | string[] | null;
    } | null;
};

export default function OnboardingInteresesPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const clienteId = params.id;

    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
    const [triggers, setTriggers] = useState<Trigger[]>([]);
    const [respuestas, setRespuestas] = useState<Record<string, RespuestaEstado>>({});
    const [categoriaActiva, setCategoriaActiva] = useState("Todas");
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");

    useEffect(() => {
        if (clienteId) cargarPantalla();
    }, [clienteId]);

    const categorias = useMemo(() => [
        "Todas",
        ...Array.from(
            new Set(
                preguntas
                    .map((pregunta) => pregunta.categoria)
                    .filter((categoria): categoria is string => Boolean(categoria))
            )
        ).sort(),
    ], [preguntas]);

    const preguntasFiltradas = useMemo(() => {
        if (categoriaActiva === "Todas") return preguntas;
        return preguntas.filter((pregunta) => pregunta.categoria === categoriaActiva);
    }, [preguntas, categoriaActiva]);

    const contestadas = useMemo(
        () => preguntas.filter((p) => respuestaCompleta(p, respuestas[p.id])).length,
        [preguntas, respuestas]
    );

    async function cargarPantalla() {
        try {
            setLoading(true);
            const [clienteRes, preguntasRes, triggersRes, respuestasRes] =
                await Promise.all([
                    supabase
                        .from("clientes")
                        .select("id, nombre, apellido, numero_documento")
                        .eq("id", clienteId)
                        .single(),
                    supabase
                        .from("preguntas_interes")
                        .select(`
              id, pregunta, codigo, descripcion, categoria,
              tipo_pregunta, tipo_respuesta, configuracion,
              orden, activo
            `)
                        .eq("activo", true)
                        .in("tipo_pregunta", ["perfil", "trigger_producto"])
                        .order("orden", { ascending: true })
                        .order("created_at", { ascending: true }),
                    supabase
                        .from("preguntas_producto_triggers")
                        .select("id, pregunta_id, producto_id, valor_disparador, activo")
                        .eq("activo", true),
                    supabase
                        .from("clientes_respuestas")
                        .select("pregunta_id, respuesta")
                        .eq("cliente_id", clienteId)
                        .eq("vigente", true),
                ]);

            if (clienteRes.error) throw clienteRes.error;
            if (preguntasRes.error) throw preguntasRes.error;
            if (triggersRes.error) throw triggersRes.error;
            if (respuestasRes.error) throw respuestasRes.error;

            const preguntasCargadas =
                (preguntasRes.data ?? []) as Pregunta[];

            const respuestasMapeadas =
                mapearRespuestasGuardadas(
                    (respuestasRes.data ?? []) as RespuestaGuardada[]
                );

            /*
             * Las preguntas ternarias que todavía no tienen respuesta
             * comienzan en Neutro, cuyo valor es 0.
             */
            for (const pregunta of preguntasCargadas) {
                if (
                    pregunta.tipo_respuesta === "ternaria" &&
                    respuestasMapeadas[pregunta.id]?.valor === undefined
                ) {
                    respuestasMapeadas[pregunta.id] = {
                        valor: 0,
                    };
                }
            }

            setCliente(clienteRes.data as Cliente);
            setPreguntas(preguntasCargadas);
            setTriggers((triggersRes.data ?? []) as Trigger[]);
            setRespuestas(respuestasMapeadas);
        } catch (error: any) {
            mostrarMensaje(error.message || "No se pudo cargar el relevamiento.", "error");
        } finally {
            setLoading(false);
        }
    }

    function mostrarMensaje(texto: string, tipo: "success" | "error") {
        setMensaje(texto);
        setTipoMensaje(tipo);
    }

    function mapearRespuestasGuardadas(datos: RespuestaGuardada[]) {
        const resultado: Record<string, RespuestaEstado> = {};

        for (const fila of datos) {
            const tipo = fila.respuesta?.tipo;
            const valor = fila.respuesta?.valor;
            if (!tipo) continue;

            if (tipo === "binaria" || tipo === "ternaria") {
                resultado[fila.pregunta_id] = {
                    valor: typeof valor === "number" ? valor : valor == null ? null : Number(valor),
                };
            } else if (tipo === "numero") {
                resultado[fila.pregunta_id] = { numero: valor == null ? "" : String(valor) };
            } else if (tipo === "fecha") {
                resultado[fila.pregunta_id] = { fecha: typeof valor === "string" ? valor : "" };
            } else if (tipo === "seleccion") {
                resultado[fila.pregunta_id] = { seleccion: typeof valor === "string" ? valor : "" };
            } else if (tipo === "seleccion_multiple") {
                resultado[fila.pregunta_id] = {
                    seleccion_multiple: Array.isArray(valor) ? valor.map(String) : [],
                };
            } else {
                resultado[fila.pregunta_id] = { texto: typeof valor === "string" ? valor : "" };
            }
        }

        return resultado;
    }

    function respuestaCompleta(pregunta: Pregunta, respuesta?: RespuestaEstado) {
        if (!respuesta) return false;

        switch (pregunta.tipo_respuesta) {
            case "binaria":
            case "ternaria":
                return typeof respuesta.valor === "number";
            case "texto":
            case "texto_largo":
                return Boolean(respuesta.texto?.trim());
            case "numero":
                return respuesta.numero !== undefined &&
                    respuesta.numero !== "" &&
                    Number.isFinite(Number(respuesta.numero));
            case "fecha":
                return Boolean(respuesta.fecha);
            case "seleccion":
                return Boolean(respuesta.seleccion);
            case "seleccion_multiple":
                return Boolean(respuesta.seleccion_multiple?.length);
        }
    }

    function valorRespuesta(pregunta: Pregunta, respuesta: RespuestaEstado) {
        switch (pregunta.tipo_respuesta) {
            case "binaria":
            case "ternaria":
                return respuesta.valor ?? null;
            case "texto":
            case "texto_largo":
                return respuesta.texto?.trim() ?? "";
            case "numero":
                return respuesta.numero === "" ? null : Number(respuesta.numero);
            case "fecha":
                return respuesta.fecha ?? "";
            case "seleccion":
                return respuesta.seleccion ?? "";
            case "seleccion_multiple":
                return respuesta.seleccion_multiple ?? [];
        }
    }

    function actualizarRespuesta(preguntaId: string, cambio: Partial<RespuestaEstado>) {
        setRespuestas((previas) => ({
            ...previas,
            [preguntaId]: { ...previas[preguntaId], ...cambio },
        }));
        setMensaje("");
        setTipoMensaje("");
    }

    function alternarSeleccionMultiple(preguntaId: string, opcion: string) {
        const actuales = respuestas[preguntaId]?.seleccion_multiple ?? [];
        const siguientes = actuales.includes(opcion)
            ? actuales.filter((item) => item !== opcion)
            : [...actuales, opcion];

        actualizarRespuesta(preguntaId, { seleccion_multiple: siguientes });
    }

    function evaluarTriggers() {
        const coincidencias = triggers
            .map((trigger) => {
                const pregunta = preguntas.find(
                    (item) => item.id === trigger.pregunta_id
                );

                if (
                    !pregunta ||
                    (pregunta.tipo_respuesta !== "binaria" &&
                        pregunta.tipo_respuesta !== "ternaria")
                ) {
                    return null;
                }

                const respuesta = respuestas[trigger.pregunta_id]?.valor;

                const respuestaNormalizada =
                    respuesta === null || respuesta === undefined
                        ? ""
                        : String(respuesta).trim().toLowerCase();

                const disparadorNormalizado =
                    trigger.valor_disparador === null ||
                        trigger.valor_disparador === undefined
                        ? ""
                        : String(trigger.valor_disparador)
                            .trim()
                            .toLowerCase();

                if (respuestaNormalizada !== disparadorNormalizado) {
                    return null;
                }

                return {
                    producto_id: trigger.producto_id,
                    trigger_id: trigger.id,
                    pregunta_id: trigger.pregunta_id,
                    valor_respuesta: Number(respuesta),
                };
            })
            .filter(Boolean) as {
                producto_id: string;
                trigger_id: string;
                pregunta_id: string;
                valor_respuesta: number;
            }[];

        const unicas = new Map<string, (typeof coincidencias)[number]>();

        for (const coincidencia of coincidencias) {
            if (!unicas.has(coincidencia.producto_id)) {
                unicas.set(coincidencia.producto_id, coincidencia);
            }
        }

        return Array.from(unicas.values());
    }

    async function guardarYContinuar() {
        const faltantes = preguntas.filter(
            (pregunta) => !respuestaCompleta(pregunta, respuestas[pregunta.id])
        );

        if (faltantes.length > 0) {
            mostrarMensaje(
                `Faltan responder ${faltantes.length} ${faltantes.length === 1 ? "pregunta" : "preguntas"}.`,
                "error"
            );
            return;
        }

        try {
            setGuardando(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No se pudo identificar al usuario autenticado.");

            const ahora = new Date().toISOString();

            const filasRespuestas = preguntas.map((pregunta) => ({
                cliente_id: clienteId,
                pregunta_id: pregunta.id,

                respuesta: {
                    tipo: pregunta.tipo_respuesta,
                    valor: valorRespuesta(
                        pregunta,
                        respuestas[pregunta.id]
                    ),
                },

                observacion: null,
                vigente: true,
                created_by: user.id,
                updated_by: user.id,
                updated_at: ahora,
            }));

            const { error: respuestasError } = await supabase
                .from("clientes_respuestas")
                .upsert(filasRespuestas, { onConflict: "cliente_id,pregunta_id" });

            if (respuestasError) throw respuestasError;

            const sugerencias = evaluarTriggers();

            const { error: limpiarError } = await supabase
                .from("clientes_productos_sugeridos")
                .delete()
                .eq("cliente_id", clienteId)
                .eq("estado", "pendiente");

            if (limpiarError) throw limpiarError;

            if (sugerencias.length > 0) {
                const { data: creadas, error: sugerenciasError } = await supabase
                    .from("clientes_productos_sugeridos")
                    .insert(
                        sugerencias.map((s) => ({
                            cliente_id: clienteId,
                            producto_id: s.producto_id,
                            estado: "pendiente",
                            origen: "trigger",
                            created_by: user.id,
                        }))
                    )
                    .select("id, producto_id");

                if (sugerenciasError) throw sugerenciasError;

                const motivos = (creadas ?? []).flatMap((creada) =>
                    sugerencias
                        .filter((s) => s.producto_id === creada.producto_id)
                        .map((s) => ({
                            sugerencia_id: creada.id,
                            trigger_id: s.trigger_id,
                            pregunta_id: s.pregunta_id,
                            valor_respuesta: s.valor_respuesta,
                        }))
                );

                if (motivos.length > 0) {
                    const { error: motivosError } = await supabase
                        .from("clientes_productos_sugeridos_motivos")
                        .insert(motivos);

                    if (motivosError) throw motivosError;
                }
            }

            const { error: clienteError } = await supabase
                .from("clientes")
                .update({
                    onboarding_etapa: "productos",
                })
                .eq("id", clienteId);

            if (clienteError) throw clienteError;

            mostrarMensaje("Respuestas guardadas. Preparando productos...", "success");

            window.setTimeout(() => {
                router.push(`/clientes/${clienteId}/onboarding/productos`);
            }, 600);
        } catch (error: any) {
            mostrarMensaje(error.message || "No fue posible guardar el relevamiento.", "error");
        } finally {
            setGuardando(false);
        }
    }

    function renderPregunta(pregunta: Pregunta) {
        const respuesta = respuestas[pregunta.id] ?? {};
        const opciones = pregunta.configuracion?.opciones ?? [];

        if (pregunta.tipo_respuesta === "binaria" || pregunta.tipo_respuesta === "ternaria") {
            const valores = pregunta.tipo_respuesta === "binaria"
                ? [{ label: "No", value: -1 }, { label: "Sí", value: 1 }]
                : [{ label: "No", value: -1 }, { label: "Neutro", value: 0 }, { label: "Sí", value: 1 }];

return (
    <div style={styles.answerButtons}>
        {valores.map((item) => {
            const seleccionado =
                respuesta.valor === item.value;

            const estiloOpcion =
                item.value === -1
                    ? seleccionado
                        ? styles.answerNoActive
                        : styles.answerNo
                    : item.value === 0
                      ? seleccionado
                          ? styles.answerNeutralActive
                          : styles.answerNeutral
                      : seleccionado
                        ? styles.answerYesActive
                        : styles.answerYes;

            return (
                <button
                    key={item.value}
                    type="button"
                    style={{
                        ...styles.answerButton,
                        ...estiloOpcion,
                    }}
                    onClick={() =>
                        actualizarRespuesta(pregunta.id, {
                            valor: item.value,
                        })
                    }
                >
                    {item.label}
                </button>
            );
        })}
    </div>
);
        }

        if (pregunta.tipo_respuesta === "texto") {
            return (
                <input
                    style={styles.input}
                    value={respuesta.texto ?? ""}
                    onChange={(e) => actualizarRespuesta(pregunta.id, { texto: e.target.value })}
                    placeholder="Ingresá la respuesta"
                />
            );
        }

        if (pregunta.tipo_respuesta === "texto_largo") {
            return (
                <textarea
                    style={styles.textarea}
                    value={respuesta.texto ?? ""}
                    onChange={(e) => actualizarRespuesta(pregunta.id, { texto: e.target.value })}
                    placeholder="Ingresá la respuesta"
                />
            );
        }

        if (pregunta.tipo_respuesta === "numero") {
            return (
                <input
                    type="number"
                    step="any"
                    min={pregunta.configuracion?.minimo ?? undefined}
                    max={pregunta.configuracion?.maximo ?? undefined}
                    style={styles.input}
                    value={respuesta.numero ?? ""}
                    onChange={(e) => actualizarRespuesta(pregunta.id, { numero: e.target.value })}
                />
            );
        }

        if (pregunta.tipo_respuesta === "fecha") {
            return (
                <input
                    type="date"
                    style={styles.input}
                    value={respuesta.fecha ?? ""}
                    onChange={(e) => actualizarRespuesta(pregunta.id, { fecha: e.target.value })}
                />
            );
        }

        if (pregunta.tipo_respuesta === "seleccion") {
            return (
                <select
                    style={styles.input}
                    value={respuesta.seleccion ?? ""}
                    onChange={(e) => actualizarRespuesta(pregunta.id, { seleccion: e.target.value })}
                >
                    <option value="">Seleccioná una opción</option>
                    {opciones.map((opcion) => (
                        <option key={opcion} value={opcion}>{opcion}</option>
                    ))}
                </select>
            );
        }

        return (
            <div style={styles.checkboxGrid}>
                {opciones.map((opcion) => {
                    const seleccionada = respuesta.seleccion_multiple?.includes(opcion) ?? false;
                    return (
                        <label
                            key={opcion}
                            style={{
                                ...styles.checkboxOption,
                                ...(seleccionada ? styles.checkboxOptionActive : {}),
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={seleccionada}
                                onChange={() => alternarSeleccionMultiple(pregunta.id, opcion)}
                            />
                            <span>{opcion}</span>
                        </label>
                    );
                })}
            </div>
        );
    }

    if (loading) {
        return <main style={styles.page}><div style={styles.loading}>Cargando relevamiento...</div></main>;
    }

    return (
        <main style={styles.page}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <div>
                        <div style={styles.breadcrumb}>Clientes / Onboarding / Intereses</div>
                        <h1 style={styles.title}>Relevamiento de intereses</h1>
                        <p style={styles.subtitle}>
                            Completá el perfil comercial y las preguntas trigger de{" "}
                            <strong>{cliente?.nombre} {cliente?.apellido}</strong>.
                        </p>
                    </div>

                    <button
                        type="button"
                        style={styles.backButton}
                        onClick={() => router.push(`/clientes/${clienteId}`)}
                    >
                        <ArrowLeft size={17} />
                        Ver ficha
                    </button>
                </header>

                <OnboardingSteps etapaActual={2} />

                {mensaje && (
                    <div style={tipoMensaje === "success" ? styles.successBox : styles.errorBox}>
                        {tipoMensaje === "success" ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
                        <span>{mensaje}</span>
                    </div>
                )}

                <section style={styles.summaryCard}>
                    <div>
                        <span style={styles.summaryLabel}>Progreso del relevamiento</span>
                        <strong style={styles.summaryValue}>{contestadas} de {preguntas.length}</strong>
                    </div>

                    <div style={styles.progressTrack}>
                        <div
                            style={{
                                ...styles.progressFill,
                                width: preguntas.length === 0 ? "0%" : `${Math.round((contestadas / preguntas.length) * 100)}%`,
                            }}
                        />
                    </div>
                </section>

                <section style={styles.categoryBar}>
                    {categorias.map((categoria) => (
                        <button
                            key={categoria}
                            type="button"
                            style={{
                                ...styles.categoryButton,
                                ...(categoriaActiva === categoria ? styles.categoryButtonActive : {}),
                            }}
                            onClick={() => setCategoriaActiva(categoria)}
                        >
                            {categoria}
                        </button>
                    ))}
                </section>

                <div style={styles.questionList}>
                    {preguntasFiltradas.map((pregunta, indice) => (
                        <article key={pregunta.id} style={styles.questionCard}>
                            <div style={styles.questionHeader}>
                                <div style={styles.questionNumber}>{indice + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={styles.questionTitleRow}>
                                        <h2 style={styles.questionTitle}>{pregunta.pregunta}</h2>
                                        <span style={styles.categoryBadge}>{pregunta.categoria || "Sin categoría"}</span>
                                        {pregunta.tipo_pregunta === "trigger_producto" && (
                                            <span style={styles.triggerBadge}>Trigger</span>
                                        )}
                                    </div>
                                    {pregunta.descripcion && (
                                        <p style={styles.questionDescription}>{pregunta.descripcion}</p>
                                    )}
                                </div>
                            </div>
                            <div style={styles.answerArea}>{renderPregunta(pregunta)}</div>
                        </article>
                    ))}
                </div>

                <footer style={styles.footer}>
                    <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={guardando}
                        onClick={() => router.push(`/clientes/${clienteId}`)}
                    >
                        Guardar más tarde
                    </button>

                    <button
                        type="button"
                        style={{
                            ...styles.primaryButton,
                            ...(guardando ? styles.disabledButton : {}),
                        }}
                        disabled={guardando}
                        onClick={guardarYContinuar}
                    >
                        <Save size={18} />
                        {guardando ? "Guardando..." : "Guardar y ver productos"}
                        {!guardando && <ArrowRight size={18} />}
                    </button>
                </footer>
            </div>
        </main>
    );
}

function OnboardingSteps({ etapaActual }: { etapaActual: number }) {
    const etapas = [
        { numero: 1, titulo: "Datos del lead", descripcion: "Identificación y contacto", icono: User },
        { numero: 2, titulo: "Intereses", descripcion: "Perfil y preguntas trigger", icono: Info },
        { numero: 3, titulo: "Productos", descripcion: "Recomendados y catálogo", icono: ShoppingBag },
        { numero: 4, titulo: "Alta del producto", descripcion: "Datos requeridos para la venta", icono: PackageCheck },
    ];

    return (
        <section style={styles.stepper}>
            {etapas.map((etapa, indice) => {
                const Icono = etapa.icono;
                const activa = etapa.numero === etapaActual;
                const completada = etapa.numero < etapaActual;

                return (
                    <React.Fragment key={etapa.numero}>
                        <div style={styles.stepItem}>
                            <div
                                style={{
                                    ...styles.stepCircle,
                                    ...(activa ? styles.stepCircleActive : {}),
                                    ...(completada ? styles.stepCircleDone : {}),
                                }}
                            >
                                {completada ? <CheckCircle2 size={18} /> : <Icono size={18} />}
                            </div>
                            <div>
                                <div style={{ ...styles.stepTitle, ...(activa ? styles.stepTitleActive : {}) }}>
                                    Etapa {etapa.numero}: {etapa.titulo}
                                </div>
                                <div style={styles.stepDescription}>{etapa.descripcion}</div>
                            </div>
                        </div>
                        {indice < etapas.length - 1 && (
                            <div style={{ ...styles.stepLine, ...(completada ? styles.stepLineDone : {}) }} />
                        )}
                    </React.Fragment>
                );
            })}
        </section>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", padding: 24, background: "#f1f5f9" },
    container: { width: "100%", maxWidth: 1100, margin: "0 auto" },
    loading: { padding: 48, color: "#64748b", textAlign: "center" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap" },
    breadcrumb: { marginBottom: 8, color: "#64748b", fontSize: 13 },
    title: { margin: 0, color: "#0f172a", fontSize: 28 },
    subtitle: { maxWidth: 780, margin: "8px 0 0", color: "#64748b", fontSize: 15, lineHeight: 1.6 },
    backButton: { display: "inline-flex", minHeight: 40, alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 14px", border: "1px solid #cbd5e1", borderRadius: 9, color: "#334155", background: "#fff", fontWeight: 600, cursor: "pointer" },
    stepper: { display: "grid", gridTemplateColumns: "auto minmax(28px, 1fr) auto minmax(28px, 1fr) auto minmax(28px, 1fr) auto", alignItems: "center", gap: 10, padding: "18px 20px", marginBottom: 18, border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", overflowX: "auto" },
    stepItem: { display: "flex", alignItems: "center", gap: 10, minWidth: 180 },
    stepCircle: { width: 38, minWidth: 38, height: 38, display: "grid", placeItems: "center", border: "1px solid #cbd5e1", borderRadius: 999, color: "#64748b", background: "#f8fafc" },
    stepCircleActive: {
        border: "1px solid #2563eb",
        color: "#fff",
        background: "#2563eb",
    },
    stepCircleDone: {
        border: "1px solid #16a34a",
        color: "#fff",
        background: "#16a34a",
    },
    stepTitle: { color: "#475569", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" },
    stepTitleActive: { color: "#0f172a" },
    stepDescription: { marginTop: 2, color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" },
    stepLine: { height: 2, minWidth: 28, background: "#e2e8f0" },
    stepLineDone: { background: "#16a34a" },
    successBox: { display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", marginBottom: 16, border: "1px solid #86efac", borderRadius: 10, color: "#166534", background: "#f0fdf4" },
    errorBox: { display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", marginBottom: 16, border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", background: "#fef2f2" },
    summaryCard: { display: "grid", gridTemplateColumns: "auto minmax(220px, 1fr)", alignItems: "center", gap: 20, padding: "16px 18px", marginBottom: 16, border: "1px solid #dbeafe", borderRadius: 12, background: "#eff6ff" },
    summaryLabel: { display: "block", color: "#475569", fontSize: 12 },
    summaryValue: { display: "block", marginTop: 3, color: "#1e3a8a", fontSize: 18 },
    progressTrack: { height: 9, overflow: "hidden", borderRadius: 999, background: "#dbeafe" },
    progressFill: { height: "100%", borderRadius: 999, background: "#2563eb" },
    categoryBar: { display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" },
    categoryButton: { minHeight: 36, padding: "7px 12px", border: "1px solid #cbd5e1", borderRadius: 999, color: "#475569", background: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer" },
    categoryButtonActive: {
        border: "1px solid #2563eb",
        color: "#fff",
        background: "#2563eb",
    },
    questionList: {
    display: "grid",
    gridTemplateColumns:
        "repeat(auto-fit, minmax(300px, 1fr))",
    alignItems: "stretch",
    gap: 14,
},
    questionCard: {
    display: "flex",
    minWidth: 0,
    height: "100%",
    boxSizing: "border-box",
    flexDirection: "column",
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
},
    
    questionTitleRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    
    questionDescription: { margin: "6px 0 0", color: "#64748b", fontSize: 13 },
    categoryBadge: { padding: "4px 8px", borderRadius: 999, color: "#0369a1", background: "#e0f2fe", fontSize: 11, fontWeight: 700 },
    triggerBadge: { padding: "4px 8px", borderRadius: 999, color: "#6d28d9", background: "#ede9fe", fontSize: 11, fontWeight: 700 },
    answerArea: {
    marginTop: "auto",
    paddingTop: 16,
},
   
    answerButtonActive: { borderColor: "#2563eb", color: "#fff", background: "#2563eb" },
    input: { width: "100%", minHeight: 44, boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 9, color: "#0f172a", background: "#fff", fontSize: 14 },
    textarea: { width: "100%", minHeight: 95, boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 9, color: "#0f172a", background: "#fff", fontSize: 14, resize: "vertical" },
    checkboxGrid: { display: "flex", gap: 9, flexWrap: "wrap" },
    checkboxOption: { display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 9, color: "#334155", background: "#fff", cursor: "pointer" },
    checkboxOptionActive: {
        border: "1px solid #2563eb",
        color: "#1d4ed8",
        background: "#eff6ff",
    },
    footer: { position: "sticky", bottom: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 0 4px", marginTop: 18, background: "linear-gradient(to top, #f1f5f9 75%, rgba(241,245,249,0))", flexWrap: "wrap" },
    secondaryButton: { minHeight: 44, padding: "10px 16px", border: "1px solid #cbd5e1", borderRadius: 9, color: "#334155", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
    primaryButton: { display: "inline-flex", minHeight: 44, alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 17px", border: "none", borderRadius: 9, color: "#fff", background: "#2563eb", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    disabledButton: { opacity: 0.65, cursor: "not-allowed" },


answerButtons: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
},

answerButton: {
    width: "100%",
    minWidth: 0,
    minHeight: 40,
    padding: "9px 10px",
    borderRadius: 9,
    fontWeight: 700,
    cursor: "pointer",
    transition:
        "background 0.15s ease, border 0.15s ease, color 0.15s ease, transform 0.15s ease",
},

answerNo: {
    border: "1px solid #fecaca",
    color: "#b91c1c",
    background: "#fff1f2",
},

answerNoActive: {
    border: "1px solid #dc2626",
    color: "#ffffff",
    background: "#dc2626",
    boxShadow: "0 2px 7px rgba(220, 38, 38, 0.25)",
},

answerNeutral: {
    border: "1px solid #fde68a",
    color: "#92400e",
    background: "#fffbeb",
},

answerNeutralActive: {
    border: "1px solid #f59e0b",
    color: "#422006",
    background: "#fbbf24",
    boxShadow: "0 2px 7px rgba(245, 158, 11, 0.25)",
},

answerYes: {
    border: "1px solid #bbf7d0",
    color: "#15803d",
    background: "#f0fdf4",
},

answerYesActive: {
    border: "1px solid #16a34a",
    color: "#ffffff",
    background: "#16a34a",
    boxShadow: "0 2px 7px rgba(22, 163, 74, 0.25)",
},

questionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
},

questionNumber: {
    width: 28,
    minWidth: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    color: "#2563eb",
    background: "#eff6ff",
    fontSize: 12,
    fontWeight: 800,
},

questionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 1.35,
},
};
