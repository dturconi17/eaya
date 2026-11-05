"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TipoCatalogo = "canales" | "zonas" | "banderas" | "retails";

type RegistroCatalogo = {
    id: string;
    tipo: string;
    imagen_path: string | null;
    activo: boolean;
    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
};

type FormularioCatalogo = {
    tipo: string;
    activo: boolean;
};

type FiltroEstado = "todos" | "activos" | "inactivos";

type ConfiguracionCatalogo = {
    tabla: TipoCatalogo;
    bucket: TipoCatalogo;
    titulo: string;
    singular: string;
    singularCapitalizado: string;
    etiquetaCampo: string;
    placeholder: string;
    descripcion: string;
};

const configuracionCatalogos: Record<TipoCatalogo, ConfiguracionCatalogo> = {
    canales: {
        tabla: "canales",
        bucket: "canales",
        titulo: "Canales",
        singular: "canal",
        singularCapitalizado: "Canal",
        etiquetaCampo: "Tipo de canal",
        placeholder: "Ej. Presencial",
        descripcion: "Administrá los tipos de canales disponibles en EAYA.",
    },

    zonas: {
        tabla: "zonas",
        bucket: "zonas",
        titulo: "Zonas",
        singular: "zona",
        singularCapitalizado: "Zona",
        etiquetaCampo: "Nombre de zona",
        placeholder: "Ej. AMBA",
        descripcion: "Administrá las zonas comerciales disponibles en EAYA.",
    },

    banderas: {
        tabla: "banderas",
        bucket: "banderas",
        titulo: "Banderas",
        singular: "bandera",
        singularCapitalizado: "Bandera",
        etiquetaCampo: "Nombre de bandera",
        placeholder: "Ej. Carrefour",
        descripcion: "Administrá las banderas comerciales disponibles en EAYA.",
    },

    retails: {
        tabla: "retails",
        bucket: "retails",
        titulo: "Retails",
        singular: "retail",
        singularCapitalizado: "Retail",
        etiquetaCampo: "Nombre de retail",
        placeholder: "Ej. Retail principal",
        descripcion: "Administrá los retails disponibles en EAYA.",
    },
};

const formularioInicial: FormularioCatalogo = {
    tipo: "",
    activo: true,
};

export default function EstructuraComercialPage() {
    const [catalogoActivo, setCatalogoActivo] =
        useState<TipoCatalogo>("canales");

    const [registros, setRegistros] =
        useState<RegistroCatalogo[]>([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const [busqueda, setBusqueda] = useState("");

    const [filtroEstado, setFiltroEstado] =
        useState<FiltroEstado>("todos");

    const [modalAbierto, setModalAbierto] =
        useState(false);

    const [registroEditando, setRegistroEditando] =
        useState<RegistroCatalogo | null>(null);

    const [formulario, setFormulario] =
        useState<FormularioCatalogo>(formularioInicial);

    const [archivoImagen, setArchivoImagen] =
        useState<File | null>(null);

    const [previewImagen, setPreviewImagen] =
        useState<string | null>(null);

    const config =
        configuracionCatalogos[catalogoActivo];

    useEffect(() => {
        cargarRegistros();
    }, [catalogoActivo]);

    async function cargarRegistros() {
        setCargando(true);
        setError("");

        const { data, error: errorConsulta } =
            await supabase
                .from(config.tabla)
                .select("*")
                .order("tipo", { ascending: true });

        if (errorConsulta) {
            console.error(errorConsulta);

            setError(
                `No se pudieron cargar los ${config.titulo.toLowerCase()}.`
            );

            setRegistros([]);
            setCargando(false);
            return;
        }

        setRegistros(
            (data ?? []) as RegistroCatalogo[]
        );

        setCargando(false);
    }

    function cambiarCatalogo(tipo: TipoCatalogo) {
        if (guardando) return;

        setCatalogoActivo(tipo);
        setBusqueda("");
        setFiltroEstado("todos");
        setError("");
        setMensaje("");

        setModalAbierto(false);
        setRegistroEditando(null);
        setFormulario(formularioInicial);
        setArchivoImagen(null);
        setPreviewImagen(null);
    }

    function abrirNuevoRegistro() {
        setRegistroEditando(null);
        setFormulario(formularioInicial);
        setArchivoImagen(null);
        setPreviewImagen(null);
        setError("");
        setMensaje("");
        setModalAbierto(true);
    }

    function abrirEditarRegistro(
        registro: RegistroCatalogo
    ) {
        setRegistroEditando(registro);

        setFormulario({
            tipo: registro.tipo,
            activo: registro.activo,
        });

        setArchivoImagen(null);

        if (registro.imagen_path) {
            const { data } = supabase.storage
                .from(config.bucket)
                .getPublicUrl(registro.imagen_path);

            setPreviewImagen(data.publicUrl);
        } else {
            setPreviewImagen(null);
        }

        setError("");
        setMensaje("");
        setModalAbierto(true);
    }

    function cerrarModal() {
        if (guardando) return;

        setModalAbierto(false);
        setRegistroEditando(null);
        setFormulario(formularioInicial);
        setArchivoImagen(null);
        setPreviewImagen(null);
    }

    function actualizarCampo(
        campo: keyof FormularioCatalogo,
        valor: string | boolean
    ) {
        setFormulario((actual) => ({
            ...actual,
            [campo]: valor,
        }));
    }

    function seleccionarImagen(
        evento: ChangeEvent<HTMLInputElement>
    ) {
        const archivo =
            evento.target.files?.[0];

        if (!archivo) return;

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (
            !tiposPermitidos.includes(archivo.type)
        ) {
            setError(
                "La imagen debe ser JPG, PNG o WebP."
            );

            evento.target.value = "";
            return;
        }

        const maximo = 5 * 1024 * 1024;

        if (archivo.size > maximo) {
            setError(
                "La imagen no puede superar los 5 MB."
            );

            evento.target.value = "";
            return;
        }

        setError("");
        setArchivoImagen(archivo);

        const urlTemporal =
            URL.createObjectURL(archivo);

        setPreviewImagen(urlTemporal);
    }

    async function subirImagen(
        registroId: string,
        archivo: File
    ) {
        const extension =
            archivo.name
                .split(".")
                .pop()
                ?.toLowerCase() ?? "jpg";

        const nombreArchivo =
            `${crypto.randomUUID()}.${extension}`;

        const path =
            `${registroId}/${nombreArchivo}`;

        const { error: errorUpload } =
            await supabase.storage
                .from(config.bucket)
                .upload(path, archivo, {
                    cacheControl: "3600",
                    upsert: false,
                });

        if (errorUpload) {
            throw errorUpload;
        }

        return path;
    }

    async function guardarRegistro() {
        setError("");
        setMensaje("");

        const tipo = formulario.tipo.trim();

        if (tipo.length < 2) {
            setError(
                `Ingresá un ${config.etiquetaCampo.toLowerCase()} válido.`
            );
            return;
        }

        setGuardando(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error(
                    "No se pudo identificar al usuario."
                );
            }

            if (!registroEditando) {
                const {
                    data: nuevoRegistro,
                    error: errorInsert,
                } = await supabase
                    .from(config.tabla)
                    .insert({
                        tipo,
                        activo: formulario.activo,
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (errorInsert) {
                    throw errorInsert;
                }

                if (archivoImagen) {
                    const imagenPath =
                        await subirImagen(
                            nuevoRegistro.id,
                            archivoImagen
                        );

                    const {
                        error: errorImagen,
                    } = await supabase
                        .from(config.tabla)
                        .update({
                            imagen_path:
                                imagenPath,
                            updated_by: user.id,
                            updated_at:
                                new Date().toISOString(),
                        })
                        .eq(
                            "id",
                            nuevoRegistro.id
                        );

                    if (errorImagen) {
                        throw errorImagen;
                    }
                }

                setMensaje(
                    `${config.singularCapitalizado} creado correctamente.`
                );
            } else {
                let imagenPath =
                    registroEditando.imagen_path;

                if (archivoImagen) {
                    imagenPath =
                        await subirImagen(
                            registroEditando.id,
                            archivoImagen
                        );
                }

                const {
                    error: errorUpdate,
                } = await supabase
                    .from(config.tabla)
                    .update({
                        tipo,
                        activo: formulario.activo,
                        imagen_path: imagenPath,
                        updated_by: user.id,
                        updated_at:
                            new Date().toISOString(),
                    })
                    .eq(
                        "id",
                        registroEditando.id
                    );

                if (errorUpdate) {
                    throw errorUpdate;
                }

                if (
                    archivoImagen &&
                    registroEditando.imagen_path
                ) {
                    await supabase.storage
                        .from(config.bucket)
                        .remove([
                            registroEditando.imagen_path,
                        ]);
                }

                setMensaje(
                    `${config.singularCapitalizado} actualizado correctamente.`
                );
            }

            setModalAbierto(false);
            setRegistroEditando(null);
            setFormulario(formularioInicial);
            setArchivoImagen(null);
            setPreviewImagen(null);

            await cargarRegistros();
        } catch (err) {
            console.error(err);

            const mensajeError =
                err instanceof Error
                    ? err.message
                    : `No se pudo guardar el ${config.singular}.`;

            setError(mensajeError);
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarEstado(
        registro: RegistroCatalogo
    ) {
        setError("");
        setMensaje("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error(
                    "No se pudo identificar al usuario."
                );
            }

            const {
                error: errorUpdate,
            } = await supabase
                .from(config.tabla)
                .update({
                    activo: !registro.activo,
                    updated_by: user.id,
                    updated_at:
                        new Date().toISOString(),
                })
                .eq("id", registro.id);

            if (errorUpdate) {
                throw errorUpdate;
            }

            setMensaje(
                registro.activo
                    ? `${config.singularCapitalizado} desactivado.`
                    : `${config.singularCapitalizado} activado.`
            );

            await cargarRegistros();
        } catch (err) {
            console.error(err);

            setError(
                `No se pudo modificar el estado del ${config.singular}.`
            );
        }
    }

    const registrosFiltrados =
        useMemo(() => {
            const texto =
                busqueda.trim().toLowerCase();

            return registros.filter(
                (registro) => {
                    const coincideBusqueda =
                        !texto ||
                        registro.tipo
                            .toLowerCase()
                            .includes(texto);

                    const coincideEstado =
                        filtroEstado ===
                            "todos" ||
                        (filtroEstado ===
                            "activos" &&
                            registro.activo) ||
                        (filtroEstado ===
                            "inactivos" &&
                            !registro.activo);

                    return (
                        coincideBusqueda &&
                        coincideEstado
                    );
                }
            );
        }, [
            registros,
            busqueda,
            filtroEstado,
        ]);

    function obtenerUrlImagen(
        path: string | null
    ) {
        if (!path) return null;

        const { data } = supabase.storage
            .from(config.bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <div
                        style={
                            styles.breadcrumb
                        }
                    >
                        Configuración / Estructura
                        comercial
                    </div>

                    <h1 style={styles.title}>
                        Estructura comercial
                    </h1>

                    <p style={styles.subtitle}>
                        Administrá los maestros de
                        canales, zonas, banderas y
                        retails.
                    </p>
                </div>
            </div>

            <div style={styles.tabs}>
                {(
                    Object.keys(
                        configuracionCatalogos
                    ) as TipoCatalogo[]
                ).map((tipo) => {
                    const catalogo =
                        configuracionCatalogos[
                            tipo
                        ];

                    const activo =
                        catalogoActivo === tipo;

                    return (
                        <button
                            key={tipo}
                            type="button"
                            onClick={() =>
                                cambiarCatalogo(
                                    tipo
                                )
                            }
                            style={
                                activo
                                    ? styles.tabActive
                                    : styles.tab
                            }
                        >
                            {catalogo.titulo}
                        </button>
                    );
                })}
            </div>

            <div style={styles.sectionHeader}>
                <div>
                    <h2
                        style={
                            styles.sectionTitle
                        }
                    >
                        {config.titulo}
                    </h2>

                    <p
                        style={
                            styles.sectionSubtitle
                        }
                    >
                        {config.descripcion}
                    </p>
                </div>

                <button
                    onClick={
                        abrirNuevoRegistro
                    }
                    style={
                        styles.primaryButton
                    }
                >
                    + Nuevo{" "}
                    {config.singular}
                </button>
            </div>

            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}

            {mensaje && (
                <div style={styles.success}>
                    {mensaje}
                </div>
            )}

            <div style={styles.filters}>
                <input
                    type="text"
                    placeholder={`Buscar ${config.singular}...`}
                    value={busqueda}
                    onChange={(evento) =>
                        setBusqueda(
                            evento.target.value
                        )
                    }
                    style={styles.input}
                />

                <select
                    value={filtroEstado}
                    onChange={(evento) =>
                        setFiltroEstado(
                            evento.target
                                .value as FiltroEstado
                        )
                    }
                    style={styles.select}
                >
                    <option value="todos">
                        Todos los estados
                    </option>

                    <option value="activos">
                        Activos
                    </option>

                    <option value="inactivos">
                        Inactivos
                    </option>
                </select>
            </div>

            <div style={styles.card}>
                {cargando ? (
                    <div style={styles.empty}>
                        Cargando{" "}
                        {config.titulo.toLowerCase()}
                        ...
                    </div>
                ) : registrosFiltrados.length ===
                  0 ? (
                    <div style={styles.empty}>
                        No hay{" "}
                        {config.titulo.toLowerCase()}{" "}
                        para mostrar.
                    </div>
                ) : (
                    <div
                        style={
                            styles.tableWrapper
                        }
                    >
                        <table
                            style={styles.table}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={
                                            styles.th
                                        }
                                    >
                                        Imagen
                                    </th>

                                    <th
                                        style={
                                            styles.th
                                        }
                                    >
                                        {
                                            config.etiquetaCampo
                                        }
                                    </th>

                                    <th
                                        style={
                                            styles.th
                                        }
                                    >
                                        Estado
                                    </th>

                                    <th
                                        style={
                                            styles.th
                                        }
                                    >
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {registrosFiltrados.map(
                                    (
                                        registro
                                    ) => {
                                        const urlImagen =
                                            obtenerUrlImagen(
                                                registro.imagen_path
                                            );

                                        return (
                                            <tr
                                                key={
                                                    registro.id
                                                }
                                            >
                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    {urlImagen ? (
                                                        <img
                                                            src={
                                                                urlImagen
                                                            }
                                                            alt={
                                                                registro.tipo
                                                            }
                                                            style={
                                                                styles.thumbnail
                                                            }
                                                        />
                                                    ) : (
                                                        <div
                                                            style={
                                                                styles.noImage
                                                            }
                                                        >
                                                            Sin
                                                            imagen
                                                        </div>
                                                    )}
                                                </td>

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    <strong>
                                                        {
                                                            registro.tipo
                                                        }
                                                    </strong>
                                                </td>

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    <span
                                                        style={
                                                            registro.activo
                                                                ? styles.activeBadge
                                                                : styles.inactiveBadge
                                                        }
                                                    >
                                                        {registro.activo
                                                            ? "Activo"
                                                            : "Inactivo"}
                                                    </span>
                                                </td>

                                                <td
                                                    style={
                                                        styles.td
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            styles.actions
                                                        }
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                abrirEditarRegistro(
                                                                    registro
                                                                )
                                                            }
                                                            style={
                                                                styles.secondaryButton
                                                            }
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                cambiarEstado(
                                                                    registro
                                                                )
                                                            }
                                                            style={
                                                                styles.linkButton
                                                            }
                                                        >
                                                            {registro.activo
                                                                ? "Desactivar"
                                                                : "Activar"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalAbierto && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div
                            style={
                                styles.modalHeader
                            }
                        >
                            <div>
                                <h2
                                    style={
                                        styles.modalTitle
                                    }
                                >
                                    {registroEditando
                                        ? `Editar ${config.singular}`
                                        : `Nuevo ${config.singular}`}
                                </h2>

                                <p
                                    style={
                                        styles.modalSubtitle
                                    }
                                >
                                    Completá los datos
                                    del{" "}
                                    {config.singular} y
                                    su imagen
                                    representativa.
                                </p>
                            </div>

                            <button
                                onClick={
                                    cerrarModal
                                }
                                style={
                                    styles.closeButton
                                }
                                disabled={
                                    guardando
                                }
                            >
                                ×
                            </button>
                        </div>

                        <div
                            style={styles.field}
                        >
                            <label
                                style={
                                    styles.label
                                }
                            >
                                {
                                    config.etiquetaCampo
                                }{" "}
                                *
                            </label>

                            <input
                                type="text"
                                value={
                                    formulario.tipo
                                }
                                onChange={(
                                    evento
                                ) =>
                                    actualizarCampo(
                                        "tipo",
                                        evento.target
                                            .value
                                    )
                                }
                                placeholder={
                                    config.placeholder
                                }
                                style={
                                    styles.input
                                }
                                disabled={
                                    guardando
                                }
                            />
                        </div>

                        <div
                            style={styles.field}
                        >
                            <label
                                style={
                                    styles.label
                                }
                            >
                                Imagen
                                representativa
                            </label>

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={
                                    seleccionarImagen
                                }
                                disabled={
                                    guardando
                                }
                            />

                            {previewImagen && (
                                <div
                                    style={
                                        styles.previewContainer
                                    }
                                >
                                    <img
                                        src={
                                            previewImagen
                                        }
                                        alt="Vista previa"
                                        style={
                                            styles.preview
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        <div
                            style={styles.field}
                        >
                            <label
                                style={
                                    styles.label
                                }
                            >
                                Estado
                            </label>

                            <select
                                value={
                                    formulario.activo
                                        ? "activo"
                                        : "inactivo"
                                }
                                onChange={(
                                    evento
                                ) =>
                                    actualizarCampo(
                                        "activo",
                                        evento
                                            .target
                                            .value ===
                                            "activo"
                                    )
                                }
                                style={
                                    styles.select
                                }
                                disabled={
                                    guardando
                                }
                            >
                                <option value="activo">
                                    Activo
                                </option>

                                <option value="inactivo">
                                    Inactivo
                                </option>
                            </select>
                        </div>

                        <div
                            style={
                                styles.modalActions
                            }
                        >
                            <button
                                onClick={
                                    cerrarModal
                                }
                                style={
                                    styles.secondaryButton
                                }
                                disabled={
                                    guardando
                                }
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={
                                    guardarRegistro
                                }
                                style={
                                    styles.primaryButton
                                }
                                disabled={
                                    guardando
                                }
                            >
                                {guardando
                                    ? "Guardando..."
                                    : registroEditando
                                        ? "Guardar cambios"
                                        : `Crear ${config.singular}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        padding: "32px",
        maxWidth: "1400px",
        margin: "0 auto",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "24px",
        marginBottom: "24px",
    },

    breadcrumb: {
        fontSize: "13px",
        color: "#6b7280",
        marginBottom: "8px",
    },

    title: {
        margin: 0,
        fontSize: "30px",
        fontWeight: 700,
    },

    subtitle: {
        margin: "8px 0 0",
        color: "#6b7280",
    },

    tabs: {
        display: "grid",
        gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
        gap: "8px",
        padding: "6px",
        marginBottom: "28px",
        background: "#f3f4f6",
        borderRadius: "12px",
    },

    tab: {
        border: "none",
        background: "transparent",
        padding: "11px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        color: "#6b7280",
    },

    tabActive: {
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        padding: "11px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 700,
        color: "#111827",
        boxShadow:
            "0 1px 3px rgba(0, 0, 0, 0.08)",
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        marginBottom: "20px",
    },

    sectionTitle: {
        margin: 0,
        fontSize: "22px",
        fontWeight: 700,
    },

    sectionSubtitle: {
        margin: "5px 0 0",
        color: "#6b7280",
        fontSize: "14px",
    },

    filters: {
        display: "flex",
        gap: "12px",
        marginBottom: "20px",
        flexWrap: "wrap",
    },

    card: {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        overflow: "hidden",
    },

    tableWrapper: {
        overflowX: "auto",
    },

    table: {
        width: "100%",
        borderCollapse: "collapse",
    },

    th: {
        padding: "14px 16px",
        textAlign: "left",
        fontSize: "12px",
        textTransform: "uppercase",
        color: "#6b7280",
        background: "#f9fafb",
        borderBottom:
            "1px solid #e5e7eb",
    },

    td: {
        padding: "14px 16px",
        borderBottom:
            "1px solid #e5e7eb",
        verticalAlign: "middle",
    },

    input: {
        width: "100%",
        minWidth: "240px",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        boxSizing: "border-box",
    },

    select: {
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        background: "#ffffff",
        fontSize: "14px",
    },

    primaryButton: {
        border: "none",
        background: "#111827",
        color: "#ffffff",
        padding: "10px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: 600,
    },

    secondaryButton: {
        border: "1px solid #d1d5db",
        background: "#ffffff",
        color: "#111827",
        padding: "8px 12px",
        borderRadius: "8px",
        cursor: "pointer",
    },

    linkButton: {
        border: "none",
        background: "transparent",
        color: "#4f46e5",
        cursor: "pointer",
        padding: "8px",
    },

    actions: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },

    activeBadge: {
        display: "inline-block",
        padding: "4px 9px",
        borderRadius: "999px",
        background: "#dcfce7",
        color: "#166534",
        fontSize: "12px",
        fontWeight: 600,
    },

    inactiveBadge: {
        display: "inline-block",
        padding: "4px 9px",
        borderRadius: "999px",
        background: "#f3f4f6",
        color: "#6b7280",
        fontSize: "12px",
        fontWeight: 600,
    },

    thumbnail: {
        width: "64px",
        height: "48px",
        objectFit: "cover",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
    },

    noImage: {
        width: "64px",
        height: "48px",
        borderRadius: "8px",
        background: "#f3f4f6",
        color: "#9ca3af",
        fontSize: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
    },

    empty: {
        padding: "48px",
        textAlign: "center",
        color: "#6b7280",
    },

    error: {
        padding: "12px 14px",
        marginBottom: "16px",
        borderRadius: "8px",
        background: "#fef2f2",
        color: "#991b1b",
    },

    success: {
        padding: "12px 14px",
        marginBottom: "16px",
        borderRadius: "8px",
        background: "#f0fdf4",
        color: "#166534",
    },

    overlay: {
        position: "fixed",
        inset: 0,
        background:
            "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
    },

    modal: {
        width: "100%",
        maxWidth: "560px",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.2)",
    },

    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        marginBottom: "24px",
    },

    modalTitle: {
        margin: 0,
        fontSize: "22px",
    },

    modalSubtitle: {
        margin: "6px 0 0",
        color: "#6b7280",
        fontSize: "14px",
    },

    closeButton: {
        border: "none",
        background: "transparent",
        fontSize: "28px",
        cursor: "pointer",
        lineHeight: 1,
    },

    field: {
        marginBottom: "20px",
    },

    label: {
        display: "block",
        fontSize: "13px",
        fontWeight: 600,
        marginBottom: "7px",
    },

    previewContainer: {
        marginTop: "14px",
    },

    preview: {
        width: "180px",
        height: "120px",
        objectFit: "cover",
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
    },

    modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        marginTop: "28px",
        paddingTop: "20px",
        borderTop:
            "1px solid #e5e7eb",
    },
};