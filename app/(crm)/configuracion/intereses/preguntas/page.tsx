"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Edit3,
    Plus,
    Save,
    Search,
    Power,
    X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
        minimo?: number;
        maximo?: number;
    } | null;
    orden: number;
    activo: boolean;
};

type TipoRespuesta =
    | "binaria"
    | "ternaria"
    | "texto"
    | "texto_largo"
    | "numero"
    | "fecha"
    | "seleccion"
    | "seleccion_multiple";

type FormPregunta = {
    pregunta: string;
    codigo: string;
    descripcion: string;
    categoria: string;
    tipo_respuesta: TipoRespuesta;
    opciones: string[];
    nuevaOpcion: string;
    minimo: string;
    maximo: string;
    orden: string;
    activo: boolean;
};

const CATEGORIAS = [
    "Familia",
    "Hogar",
    "Mascotas",
    "Movilidad",
    "Finanzas",
    "Salud",
    "Educación",
    "Trabajo",
    "Viajes",
    "Tecnología",
    "Otros",
];

const inicial: FormPregunta = {
    pregunta: "",
    codigo: "",
    descripcion: "",
    categoria: "",
    tipo_respuesta: "texto",
    opciones: [],
    nuevaOpcion: "",
    minimo: "",
    maximo: "",
    orden: "0",
    activo: true,
};

export default function ConfiguracionPreguntasPage() {
    const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
    const [form, setForm] = useState<FormPregunta>(inicial);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [modal, setModal] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");

    useEffect(() => {
        cargar();
    }, []);

    const filtradas = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        if (!texto) return preguntas;

        return preguntas.filter((pregunta) =>
            [pregunta.pregunta, pregunta.codigo, pregunta.categoria ?? ""].some((valor) =>
                valor.toLowerCase().includes(texto)
            )
        );
    }, [preguntas, busqueda]);

    async function cargar() {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("preguntas_interes")
                .select("*")
                .eq("tipo_pregunta", "perfil")
                .order("orden", { ascending: true })
                .order("created_at", { ascending: true });

            if (error) throw error;
            setPreguntas((data ?? []) as Pregunta[]);
        } catch (error: any) {
            mostrar(error.message || "No se pudieron cargar las preguntas.", "error");
        } finally {
            setLoading(false);
        }
    }

    function mostrar(texto: string, tipo: "success" | "error") {
        setMensaje(texto);
        setTipoMensaje(tipo);
    }

    function codigoDesde(texto: string) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function etiquetaTipoRespuesta(tipo: TipoRespuesta) {
        const etiquetas: Record<TipoRespuesta, string> = {
            binaria: "Sí / No",
            ternaria: "Sí / No / Neutro",
            texto: "Texto corto",
            texto_largo: "Texto largo",
            numero: "Número",
            fecha: "Fecha",
            seleccion: "Selección única",
            seleccion_multiple: "Selección múltiple",
        };

        return etiquetas[tipo];
    }

    function agregarOpcion() {
        const opcion = form.nuevaOpcion.trim();

        if (!opcion) return;

        const repetida = form.opciones.some(
            (item) => item.toLowerCase() === opcion.toLowerCase()
        );

        if (repetida) {
            mostrar("La opción ya existe.", "error");
            return;
        }

        setForm((previo) => ({
            ...previo,
            opciones: [...previo.opciones, opcion],
            nuevaOpcion: "",
        }));
    }

    function eliminarOpcion(indice: number) {
        setForm((previo) => ({
            ...previo,
            opciones: previo.opciones.filter((_, posicion) => posicion !== indice),
        }));
    }

    function nueva() {
        setForm(inicial);
        setEditandoId(null);
        setMensaje("");
        setTipoMensaje("");
        setModal(true);
    }

    function editar(item: Pregunta) {
        setForm({
            pregunta: item.pregunta,
            codigo: item.codigo,
            descripcion: item.descripcion ?? "",
            categoria: item.categoria ?? "",
            tipo_respuesta: item.tipo_respuesta ?? "texto",
            opciones: item.configuracion?.opciones ?? [],
            nuevaOpcion: "",
            minimo:
                item.configuracion?.minimo === undefined ||
                item.configuracion?.minimo === null
                    ? ""
                    : String(item.configuracion.minimo),
            maximo:
                item.configuracion?.maximo === undefined ||
                item.configuracion?.maximo === null
                    ? ""
                    : String(item.configuracion.maximo),
            orden: String(item.orden),
            activo: item.activo,
        });

        setEditandoId(item.id);
        setMensaje("");
        setTipoMensaje("");
        setModal(true);
    }

    async function guardar() {
        if (!form.pregunta.trim()) {
            mostrar("Ingresá la pregunta.", "error");
            return;
        }

        if (!form.categoria) {
            mostrar("Seleccioná una categoría.", "error");
            return;
        }

        const orden = Number(form.orden || 0);

        if (!Number.isInteger(orden) || orden < 0) {
            mostrar("El orden debe ser un número entero mayor o igual a cero.", "error");
            return;
        }

        const usaOpciones =
            form.tipo_respuesta === "seleccion" ||
            form.tipo_respuesta === "seleccion_multiple";

        if (usaOpciones && form.opciones.length === 0) {
            mostrar("Agregá al menos una opción de respuesta.", "error");
            return;
        }

        const minimo =
            form.minimo === "" ? null : Number(form.minimo);
        const maximo =
            form.maximo === "" ? null : Number(form.maximo);

        if (
            form.tipo_respuesta === "numero" &&
            minimo !== null &&
            !Number.isFinite(minimo)
        ) {
            mostrar("El valor mínimo no es válido.", "error");
            return;
        }

        if (
            form.tipo_respuesta === "numero" &&
            maximo !== null &&
            !Number.isFinite(maximo)
        ) {
            mostrar("El valor máximo no es válido.", "error");
            return;
        }

        if (
            form.tipo_respuesta === "numero" &&
            minimo !== null &&
            maximo !== null &&
            minimo > maximo
        ) {
            mostrar("El mínimo no puede ser mayor que el máximo.", "error");
            return;
        }

        const configuracion: {
            opciones?: string[];
            minimo?: number | null;
            maximo?: number | null;
        } = {};

        if (usaOpciones) {
            configuracion.opciones = form.opciones;
        }

        if (form.tipo_respuesta === "numero") {
            configuracion.minimo = minimo;
            configuracion.maximo = maximo;
        }

        try {
            setGuardando(true);

            const payload = {
                pregunta: form.pregunta.trim(),
                codigo:
                    form.codigo.trim() ||
                    codigoDesde(form.pregunta),
                descripcion: form.descripcion.trim() || null,
                categoria: form.categoria,
                tipo_pregunta: "perfil" as const,
                tipo_respuesta: form.tipo_respuesta,
                configuracion,
                orden,
                activo: form.activo,
                updated_at: new Date().toISOString(),
            };

            const consulta = editandoId
                ? supabase
                      .from("preguntas_interes")
                      .update(payload)
                      .eq("id", editandoId)
                : supabase
                      .from("preguntas_interes")
                      .insert(payload);

            const { error } = await consulta;

            if (error) throw error;

            setModal(false);
            mostrar(
                editandoId
                    ? "Pregunta actualizada."
                    : "Pregunta creada.",
                "success"
            );

            await cargar();
        } catch (error: any) {
            mostrar(
                error.message || "No se pudo guardar.",
                "error"
            );
        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(item: Pregunta) {
        const confirmado = confirm(
            `La pregunta "${item.pregunta}" será desactivada, pero se conservarán sus respuestas y todo el historial. ¿Continuar?`
        );

        if (!confirmado) return;

        try {
            const { error } = await supabase
                .from("preguntas_interes")
                .update({
                    activo: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", item.id);

            if (error) throw error;

            mostrar(
                "Pregunta desactivada. La información histórica se conservó.",
                "success"
            );

            await cargar();
        } catch (error: any) {
            mostrar(
                error.message || "No se pudo desactivar la pregunta.",
                "error"
            );
        }
    }

    return (
        <main style={s.page}>
            <div style={s.container}>
                <header style={s.header}>
                    <div>
                        <div style={s.breadcrumb}>Configuración / Intereses</div>
                        <h1 style={s.title}>Preguntas de relevamiento</h1>
                        <p style={s.subtitle}>
                            Administrá preguntas generales para conocer mejor al cliente.
                        </p>
                    </div>

                    <button type="button" style={s.newButton} onClick={nueva}>
                        <Plus size={18} />
                        Nueva pregunta
                    </button>
                </header>

                {mensaje && !modal && (
                    <div style={tipoMensaje === "success" ? s.success : s.error}>
                        {tipoMensaje === "success" ? (
                            <CheckCircle2 size={19} />
                        ) : (
                            <AlertCircle size={19} />
                        )}
                        {mensaje}
                    </div>
                )}

                <section style={s.card}>
                    <div style={s.toolbar}>
                        <div style={s.searchBox}>
                            <Search size={18} style={s.searchIcon} />
                            <input
                                style={s.search}
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar pregunta, código o categoría"
                            />
                        </div>
                        <span style={s.counter}>{filtradas.length} preguntas</span>
                    </div>

                    {loading ? (
                        <div style={s.empty}>Cargando...</div>
                    ) : filtradas.length === 0 ? (
                        <div style={s.empty}>No hay preguntas generales cargadas.</div>
                    ) : (
                        <div style={s.list}>
                            {filtradas.map((item) => (
                                <article key={item.id} style={s.row}>
                                    <div style={{ flex: 1 }}>
                                        <div style={s.rowTop}>
                                            <strong>{item.pregunta}</strong>
                                            <span style={s.profile}>Perfil</span>

                                            <span style={s.responseBadge}>
                                                {etiquetaTipoRespuesta(item.tipo_respuesta)}
                                            </span>


                                            <span style={item.activo ? s.active : s.inactive}>
                                                {item.activo ? "Activa" : "Inactiva"}
                                            </span>
                                        </div>

                                        <div style={s.meta}>
                                            <span>{item.codigo}</span>
                                            <span>{item.categoria || "Sin categoría"}</span>
                                            <span>Orden {item.orden}</span>
                                        </div>
                                    </div>

                                    <div style={s.actions}>
                                        <button
                                            type="button"
                                            style={s.editButton}
                                            onClick={() => editar(item)}
                                            title="Editar pregunta"
                                        >
                                            <Edit3 size={17} />
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            style={s.dangerBtn}
                                            onClick={() => desactivar(item)}
                                            title="Desactivar pregunta"
                                            aria-label="Desactivar pregunta"
                                        >
                                            <Power size={17} />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {modal && (
                <div style={s.overlay}>
                    <div style={s.modal}>
                        <div style={s.modalHeader}>
                            <div>
                                <h2 style={s.modalTitle}>
                                    {editandoId ? "Editar pregunta" : "Nueva pregunta"}
                                </h2>
                                <p style={s.subtitle}>
                                    Esta información se guardará en el perfil del cliente.
                                </p>
                            </div>

                            <button
                                type="button"
                                style={s.closeButton}
                                onClick={() => setModal(false)}
                                aria-label="Cerrar"
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {mensaje && (
                            <div style={tipoMensaje === "success" ? s.success : s.error}>
                                {tipoMensaje === "success" ? (
                                    <CheckCircle2 size={19} />
                                ) : (
                                    <AlertCircle size={19} />
                                )}
                                {mensaje}
                            </div>
                        )}

                        <div style={s.formGrid}>
                            <label style={s.full}>
                                <span style={s.label}>Pregunta *</span>
                                <input
                                    style={s.input}
                                    value={form.pregunta}
                                    onChange={(event) =>
                                        setForm((previo) => ({
                                            ...previo,
                                            pregunta: event.target.value,
                                            codigo: previo.codigo || codigoDesde(event.target.value),
                                        }))
                                    }
                                />
                            </label>

                            <label style={s.field}>
                                <span style={s.label}>Código</span>
                                <input
                                    style={s.input}
                                    value={form.codigo}
                                    onChange={(event) =>
                                        setForm((previo) => ({
                                            ...previo,
                                            codigo: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label style={s.field}>
                                <span style={s.label}>Categoría *</span>
                                <select
                                    style={s.input}
                                    value={form.categoria}
                                    onChange={(event) =>
                                        setForm((previo) => ({
                                            ...previo,
                                            categoria: event.target.value,
                                        }))
                                    }
                                >
                                    <option value="">Seleccioná una categoría</option>
                                    {CATEGORIAS.map((categoria) => (
                                        <option key={categoria} value={categoria}>
                                            {categoria}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label style={s.field}>
                                <span style={s.label}>
                                    Tipo de respuesta *
                                </span>

                                <select
                                    style={s.input}
                                    value={form.tipo_respuesta}
                                    onChange={(event) =>
                                        setForm((previo) => ({
                                            ...previo,
                                            tipo_respuesta:
                                                event.target.value as TipoRespuesta,
                                            opciones: [],
                                            nuevaOpcion: "",
                                            minimo: "",
                                            maximo: "",
                                        }))
                                    }
                                >
                                    <option value="binaria">
                                        Sí / No
                                    </option>

                                    <option value="ternaria">
                                        Sí / No / Neutro
                                    </option>

                                    <option value="texto">
                                        Texto corto
                                    </option>

                                    <option value="texto_largo">
                                        Texto largo
                                    </option>

                                    <option value="numero">
                                        Número
                                    </option>

                                    <option value="fecha">
                                        Fecha
                                    </option>

                                    <option value="seleccion">
                                        Selección única
                                    </option>

                                    <option value="seleccion_multiple">
                                        Selección múltiple
                                    </option>
                                </select>
                            </label>

                            {(form.tipo_respuesta === "seleccion" ||
                                form.tipo_respuesta === "seleccion_multiple") && (
                                <div style={s.full}>
                                    <span style={s.label}>
                                        Opciones de respuesta *
                                    </span>

                                    <div style={s.optionComposer}>
                                        <input
                                            style={s.input}
                                            value={form.nuevaOpcion}
                                            onChange={(event) =>
                                                setForm((previo) => ({
                                                    ...previo,
                                                    nuevaOpcion: event.target.value,
                                                }))
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    agregarOpcion();
                                                }
                                            }}
                                            placeholder="Escribí una opción"
                                        />

                                        <button
                                            type="button"
                                            style={s.addOptionButton}
                                            onClick={agregarOpcion}
                                        >
                                            <Plus size={17} />
                                            Agregar
                                        </button>
                                    </div>

                                    {form.opciones.length > 0 && (
                                        <div style={s.optionList}>
                                            {form.opciones.map((opcion, indice) => (
                                                <div
                                                    key={`${opcion}-${indice}`}
                                                    style={s.optionChip}
                                                >
                                                    <span>{opcion}</span>

                                                    <button
                                                        type="button"
                                                        style={s.removeOptionButton}
                                                        onClick={() => eliminarOpcion(indice)}
                                                        aria-label={`Eliminar ${opcion}`}
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {form.tipo_respuesta === "numero" && (
                                <>
                                    <label style={s.field}>
                                        <span style={s.label}>
                                            Valor mínimo
                                        </span>

                                        <input
                                            type="number"
                                            step="any"
                                            style={s.input}
                                            value={form.minimo}
                                            onChange={(event) =>
                                                setForm((previo) => ({
                                                    ...previo,
                                                    minimo: event.target.value,
                                                }))
                                            }
                                            placeholder="Sin mínimo"
                                        />
                                    </label>

                                    <label style={s.field}>
                                        <span style={s.label}>
                                            Valor máximo
                                        </span>

                                        <input
                                            type="number"
                                            step="any"
                                            style={s.input}
                                            value={form.maximo}
                                            onChange={(event) =>
                                                setForm((previo) => ({
                                                    ...previo,
                                                    maximo: event.target.value,
                                                }))
                                            }
                                            placeholder="Sin máximo"
                                        />
                                    </label>
                                </>
                            )}

                            <label style={s.field}>
                                <span style={s.label}>Orden</span>
                                <input
                                    type="number"
                                    style={s.input}
                                    value={form.orden}
                                    onChange={(event) =>
                                        setForm((previo) => ({
                                            ...previo,
                                            orden: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label style={s.full}>
                                <span style={s.label}>Descripción</span>
                                <textarea
                                    style={s.textarea}
                                    value={form.descripcion}
                                    onChange={(event) =>
                                        setForm((previo) => ({
                                            ...previo,
                                            descripcion: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label style={s.checkbox}>
                                <input
                                    type="checkbox"
                                    checked={form.activo}
                                    onChange={(event) =>
                                        setForm((previo) => ({
                                            ...previo,
                                            activo: event.target.checked,
                                        }))
                                    }
                                />
                                Pregunta activa
                            </label>
                        </div>

                        <div style={s.footer}>
                            <button
                                type="button"
                                style={s.cancelButton}
                                onClick={() => setModal(false)}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                style={s.saveButton}
                                disabled={guardando}
                                onClick={guardar}
                            >
                                <Save size={18} />
                                {guardando ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", padding: 24, background: "#f1f5f9" },
    container: { maxWidth: 1150, margin: "0 auto" },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 24,
    },
    breadcrumb: { fontSize: 13, color: "#64748b", marginBottom: 8 },
    title: { margin: 0, fontSize: 28, color: "#0f172a" },
    subtitle: { margin: "6px 0 0", color: "#64748b" },
    card: {
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 22,
    },
    toolbar: {
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
        marginBottom: 18,
        flexWrap: "wrap",
    },
    searchBox: { position: "relative", flex: "1 1 320px" },
    searchIcon: {
        position: "absolute",
        left: 13,
        top: "50%",
        transform: "translateY(-50%)",
        color: "#94a3b8",
    },
    search: {
        width: "100%",
        boxSizing: "border-box",
        padding: "11px 12px 11px 40px",
        border: "1px solid #cbd5e1",
        borderRadius: 9,
    },
    counter: {
        alignSelf: "center",
        fontSize: 14,
        color: "#64748b",
        whiteSpace: "nowrap",
    },
    list: { display: "flex", flexDirection: "column", gap: 12 },
    row: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: 16,
        border: "1px solid #e2e8f0",
        borderRadius: 11,
    },
    rowTop: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
    },
    meta: {
        display: "flex",
        gap: 14,
        marginTop: 8,
        color: "#64748b",
        fontSize: 13,
        flexWrap: "wrap",
    },
    profile: {
        padding: "4px 8px",
        borderRadius: 999,
        background: "#e0f2fe",
        color: "#0369a1",
        fontSize: 12,
        fontWeight: 700,
    },
    active: {
        padding: "4px 8px",
        borderRadius: 999,
        background: "#dcfce7",
        color: "#166534",
        fontSize: 12,
        fontWeight: 700,
    },
    inactive: {
        padding: "4px 8px",
        borderRadius: 999,
        background: "#e2e8f0",
        color: "#475569",
        fontSize: 12,
        fontWeight: 700,
    },
    actions: { display: "flex", gap: 7, flexWrap: "wrap" },
    newButton: {
        width: "auto",
        minWidth: "auto",
        minHeight: 42,
        height: 42,
        alignSelf: "flex-start",
        flex: "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 15px",
        border: 0,
        borderRadius: 9,
        background: "#2563eb",
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
        cursor: "pointer",
    },
    editButton: {
        width: "auto",
        minHeight: 38,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "0 11px",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        background: "#fff",
        color: "#334155",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
    },
    dangerBtn: {
        width: 38,
        minWidth: 38,
        height: 38,
        display: "grid",
        placeItems: "center",
        padding: 0,
        border: "1px solid #fecaca",
        borderRadius: 8,
        background: "#fff",
        color: "#dc2626",
        cursor: "pointer",
    },
    closeButton: {
        width: 42,
        minWidth: 42,
        height: 42,
        display: "grid",
        placeItems: "center",
        padding: 0,
        border: "1px solid #cbd5e1",
        borderRadius: 9,
        background: "#fff",
        color: "#334155",
        cursor: "pointer",
    },
    saveButton: {
        width: "auto",
        minWidth: 132,
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 16px",
        border: 0,
        borderRadius: 9,
        background: "#2563eb",
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
    },
    cancelButton: {
        width: "auto",
        minWidth: 108,
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        border: "1px solid #cbd5e1",
        borderRadius: 9,
        background: "#fff",
        color: "#334155",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
    },
    success: {
        display: "flex",
        gap: 9,
        alignItems: "center",
        padding: 13,
        marginBottom: 16,
        border: "1px solid #86efac",
        borderRadius: 9,
        background: "#f0fdf4",
        color: "#166534",
    },
    error: {
        display: "flex",
        gap: 9,
        alignItems: "center",
        padding: 13,
        marginBottom: 16,
        border: "1px solid #fecaca",
        borderRadius: 9,
        background: "#fef2f2",
        color: "#b91c1c",
    },
    empty: { padding: 35, textAlign: "center", color: "#64748b" },
    overlay: {
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(15,23,42,.45)",
    },
    modal: {
        width: "min(760px, 100%)",
        maxHeight: "90vh",
        overflow: "auto",
        padding: 22,
        borderRadius: 14,
        background: "#fff",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        marginBottom: 20,
    },
    modalTitle: { margin: 0 },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 15,
    },
    field: { display: "flex", flexDirection: "column", gap: 7 },
    full: {
        display: "flex",
        flexDirection: "column",
        gap: 7,
        gridColumn: "1 / -1",
    },
    label: { fontSize: 14, fontWeight: 600, color: "#334155" },
    input: {
        width: "100%",
        minHeight: 43,
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: 9,
        background: "#fff",
        color: "#0f172a",
    },
    textarea: {
        width: "100%",
        minHeight: 85,
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: 9,
        background: "#fff",
        color: "#0f172a",
        resize: "vertical",
    },
    checkbox: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        gridColumn: "1 / -1",
        color: "#334155",
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 22,
        flexWrap: "wrap",
    },
    optionComposer: {
        display: "flex",
        gap: 8,
        alignItems: "center",
    },
    addOptionButton: {
        minHeight: 43,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "0 14px",
        border: 0,
        borderRadius: 9,
        background: "#0f172a",
        color: "#fff",
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: "pointer",
    },
    optionList: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
    },
    optionChip: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 9px 7px 11px",
        border: "1px solid #cbd5e1",
        borderRadius: 999,
        background: "#f8fafc",
        color: "#334155",
        fontSize: 13,
    },
    removeOptionButton: {
        width: 24,
        minWidth: 24,
        height: 24,
        display: "grid",
        placeItems: "center",
        padding: 0,
        border: 0,
        borderRadius: 999,
        background: "#e2e8f0",
        color: "#475569",
        cursor: "pointer",
    },
    responseBadge: {
        padding: "4px 8px",
        borderRadius: 999,
        background: "#fef3c7",
        color: "#92400e",
        fontSize: 12,
        fontWeight: 700,
    },
};
