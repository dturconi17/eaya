"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Maestro = {
    id: string;
    tipo: string;
    activo: boolean;
};

type PuntoVenta = {
    id: string;
    nombre: string;

    canal_id: string;
    zona_id: string;
    bandera_id: string;
    retail_id: string;

    direccion: string | null;
    localidad: string | null;
    provincia: string | null;
    codigo_postal: string | null;

    hora_apertura: string | null;
    hora_cierre: string | null;

    telefono: string | null;
    email: string | null;
    observaciones: string | null;

    imagen_path: string | null;
    activo: boolean;

    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;

    canal?: Maestro | null;
    zona?: Maestro | null;
    bandera?: Maestro | null;
    retail?: Maestro | null;
};

type FormularioPuntoVenta = {
    nombre: string;

    canal_id: string;
    zona_id: string;
    bandera_id: string;
    retail_id: string;

    direccion: string;
    localidad: string;
    provincia: string;
    codigo_postal: string;

    hora_apertura: string;
    hora_cierre: string;

    telefono: string;
    email: string;
    observaciones: string;

    activo: boolean;
};

type FiltroEstado =
    | "todos"
    | "activos"
    | "inactivos";

const formularioInicial: FormularioPuntoVenta = {
    nombre: "",

    canal_id: "",
    zona_id: "",
    bandera_id: "",
    retail_id: "",

    direccion: "",
    localidad: "",
    provincia: "",
    codigo_postal: "",

    hora_apertura: "",
    hora_cierre: "",

    telefono: "",
    email: "",
    observaciones: "",

    activo: true,
};

export default function PuntosVentaPage() {
    const [puntosVenta, setPuntosVenta] =
        useState<PuntoVenta[]>([]);

    const [canales, setCanales] =
        useState<Maestro[]>([]);

    const [zonas, setZonas] =
        useState<Maestro[]>([]);

    const [banderas, setBanderas] =
        useState<Maestro[]>([]);

    const [retails, setRetails] =
        useState<Maestro[]>([]);

    const [cargando, setCargando] =
        useState(true);

    const [guardando, setGuardando] =
        useState(false);

    const [error, setError] =
        useState("");

    const [mensaje, setMensaje] =
        useState("");

    const [busqueda, setBusqueda] =
        useState("");

    const [filtroCanal, setFiltroCanal] =
        useState("");

    const [filtroZona, setFiltroZona] =
        useState("");

    const [filtroBandera, setFiltroBandera] =
        useState("");

    const [filtroRetail, setFiltroRetail] =
        useState("");

    const [filtroEstado, setFiltroEstado] =
        useState<FiltroEstado>("todos");

    const [modalAbierto, setModalAbierto] =
        useState(false);

    const [puntoEditando, setPuntoEditando] =
        useState<PuntoVenta | null>(null);

    const [formulario, setFormulario] =
        useState<FormularioPuntoVenta>(
            formularioInicial
        );

    const [archivoImagen, setArchivoImagen] =
        useState<File | null>(null);

    const [previewImagen, setPreviewImagen] =
        useState<string | null>(null);

    useEffect(() => {
        cargarPantalla();
    }, []);

    async function cargarPantalla() {
        setCargando(true);
        setError("");

        try {
            await Promise.all([
                cargarMaestros(),
                cargarPuntosVenta(),
            ]);
        } catch (err) {
            console.error(err);

            setError(
                "No se pudo cargar la información de puntos de venta."
            );
        } finally {
            setCargando(false);
        }
    }

    async function cargarMaestros() {
        const [
            resultadoCanales,
            resultadoZonas,
            resultadoBanderas,
            resultadoRetails,
        ] = await Promise.all([
            supabase
                .from("canales")
                .select("id, tipo, activo")
                .order("tipo"),

            supabase
                .from("zonas")
                .select("id, tipo, activo")
                .order("tipo"),

            supabase
                .from("banderas")
                .select("id, tipo, activo")
                .order("tipo"),

            supabase
                .from("retails")
                .select("id, tipo, activo")
                .order("tipo"),
        ]);

        if (resultadoCanales.error) {
            throw resultadoCanales.error;
        }

        if (resultadoZonas.error) {
            throw resultadoZonas.error;
        }

        if (resultadoBanderas.error) {
            throw resultadoBanderas.error;
        }

        if (resultadoRetails.error) {
            throw resultadoRetails.error;
        }

        setCanales(
            (resultadoCanales.data ?? []) as Maestro[]
        );

        setZonas(
            (resultadoZonas.data ?? []) as Maestro[]
        );

        setBanderas(
            (resultadoBanderas.data ?? []) as Maestro[]
        );

        setRetails(
            (resultadoRetails.data ?? []) as Maestro[]
        );
    }

    async function cargarPuntosVenta() {
        const {
            data,
            error: errorConsulta,
        } = await supabase
            .from("puntos_venta")
            .select(`
                *,
                canal:canales!canal_id (
                    id,
                    tipo,
                    activo
                ),
                zona:zonas!zona_id (
                    id,
                    tipo,
                    activo
                ),
                bandera:banderas!bandera_id (
                    id,
                    tipo,
                    activo
                ),
                retail:retails!retail_id (
                    id,
                    tipo,
                    activo
                )
            `)
            .order("nombre", {
                ascending: true,
            });

        if (errorConsulta) {
            throw errorConsulta;
        }

        setPuntosVenta(
            (data ?? []) as unknown as PuntoVenta[]
        );
    }

    function abrirNuevoPuntoVenta() {
        setPuntoEditando(null);
        setFormulario(formularioInicial);
        setArchivoImagen(null);
        setPreviewImagen(null);
        setError("");
        setMensaje("");
        setModalAbierto(true);
    }

    function abrirEditarPuntoVenta(
        punto: PuntoVenta
    ) {
        setPuntoEditando(punto);

        setFormulario({
            nombre: punto.nombre,

            canal_id: punto.canal_id,
            zona_id: punto.zona_id,
            bandera_id: punto.bandera_id,
            retail_id: punto.retail_id,

            direccion:
                punto.direccion ?? "",

            localidad:
                punto.localidad ?? "",

            provincia:
                punto.provincia ?? "",

            codigo_postal:
                punto.codigo_postal ?? "",

            hora_apertura:
                normalizarHora(
                    punto.hora_apertura
                ),

            hora_cierre:
                normalizarHora(
                    punto.hora_cierre
                ),

            telefono:
                punto.telefono ?? "",

            email:
                punto.email ?? "",

            observaciones:
                punto.observaciones ?? "",

            activo: punto.activo,
        });

        setArchivoImagen(null);

        if (punto.imagen_path) {
            const { data } =
                supabase.storage
                    .from("puntos-venta")
                    .getPublicUrl(
                        punto.imagen_path
                    );

            setPreviewImagen(
                data.publicUrl
            );
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
        setPuntoEditando(null);
        setFormulario(formularioInicial);
        setArchivoImagen(null);
        setPreviewImagen(null);
    }

    function actualizarCampo<
        K extends keyof FormularioPuntoVenta
    >(
        campo: K,
        valor: FormularioPuntoVenta[K]
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
            !tiposPermitidos.includes(
                archivo.type
            )
        ) {
            setError(
                "La imagen debe ser JPG, PNG o WebP."
            );

            evento.target.value = "";
            return;
        }

        const maximo =
            5 * 1024 * 1024;

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
        puntoVentaId: string,
        archivo: File
    ) {
        const extension =
            archivo.name
                .split(".")
                .pop()
                ?.toLowerCase() ??
            "jpg";

        const nombreArchivo =
            `${crypto.randomUUID()}.${extension}`;

        const path =
            `${puntoVentaId}/${nombreArchivo}`;

        const {
            error: errorUpload,
        } = await supabase.storage
            .from("puntos-venta")
            .upload(path, archivo, {
                cacheControl: "3600",
                upsert: false,
            });

        if (errorUpload) {
            throw errorUpload;
        }

        return path;
    }

    function validarFormulario() {
        if (
            formulario.nombre.trim().length <
            2
        ) {
            return "Ingresá un nombre válido para el punto de venta.";
        }

        if (!formulario.canal_id) {
            return "Seleccioná un canal.";
        }

        if (!formulario.zona_id) {
            return "Seleccioná una zona.";
        }

        if (!formulario.bandera_id) {
            return "Seleccioná una bandera.";
        }

        if (!formulario.retail_id) {
            return "Seleccioná un retail.";
        }

        if (
            formulario.email.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formulario.email.trim()
            )
        ) {
            return "Ingresá un email válido.";
        }

        return null;
    }

    async function guardarPuntoVenta() {
        setError("");
        setMensaje("");

        const errorValidacion =
            validarFormulario();

        if (errorValidacion) {
            setError(errorValidacion);
            return;
        }

        setGuardando(true);

        try {
            const {
                data: { user },
            } =
                await supabase.auth.getUser();

            if (!user) {
                throw new Error(
                    "No se pudo identificar al usuario."
                );
            }

            const payload = {
                nombre:
                    formulario.nombre.trim(),

                canal_id:
                    formulario.canal_id,

                zona_id:
                    formulario.zona_id,

                bandera_id:
                    formulario.bandera_id,

                retail_id:
                    formulario.retail_id,

                direccion:
                    textoONull(
                        formulario.direccion
                    ),

                localidad:
                    textoONull(
                        formulario.localidad
                    ),

                provincia:
                    textoONull(
                        formulario.provincia
                    ),

                codigo_postal:
                    textoONull(
                        formulario.codigo_postal
                    ),

                hora_apertura:
                    textoONull(
                        formulario.hora_apertura
                    ),

                hora_cierre:
                    textoONull(
                        formulario.hora_cierre
                    ),

                telefono:
                    textoONull(
                        formulario.telefono
                    ),

                email:
                    textoONull(
                        formulario.email
                    ),

                observaciones:
                    textoONull(
                        formulario.observaciones
                    ),

                activo:
                    formulario.activo,
            };

            if (!puntoEditando) {
                const {
                    data: nuevoPunto,
                    error: errorInsert,
                } = await supabase
                    .from("puntos_venta")
                    .insert({
                        ...payload,
                        created_by:
                            user.id,
                    })
                    .select()
                    .single();

                if (errorInsert) {
                    throw errorInsert;
                }

                if (archivoImagen) {
                    const imagenPath =
                        await subirImagen(
                            nuevoPunto.id,
                            archivoImagen
                        );

                    const {
                        error: errorImagen,
                    } = await supabase
                        .from(
                            "puntos_venta"
                        )
                        .update({
                            imagen_path:
                                imagenPath,
                            updated_by:
                                user.id,
                            updated_at:
                                new Date().toISOString(),
                        })
                        .eq(
                            "id",
                            nuevoPunto.id
                        );

                    if (errorImagen) {
                        throw errorImagen;
                    }
                }

                setMensaje(
                    "Punto de venta creado correctamente."
                );
            } else {
                let imagenPath =
                    puntoEditando.imagen_path;

                if (archivoImagen) {
                    imagenPath =
                        await subirImagen(
                            puntoEditando.id,
                            archivoImagen
                        );
                }

                const {
                    error: errorUpdate,
                } = await supabase
                    .from("puntos_venta")
                    .update({
                        ...payload,

                        imagen_path:
                            imagenPath,

                        updated_by:
                            user.id,

                        updated_at:
                            new Date().toISOString(),
                    })
                    .eq(
                        "id",
                        puntoEditando.id
                    );

                if (errorUpdate) {
                    throw errorUpdate;
                }

                if (
                    archivoImagen &&
                    puntoEditando.imagen_path
                ) {
                    await supabase.storage
                        .from(
                            "puntos-venta"
                        )
                        .remove([
                            puntoEditando.imagen_path,
                        ]);
                }

                setMensaje(
                    "Punto de venta actualizado correctamente."
                );
            }

            setModalAbierto(false);
            setPuntoEditando(null);
            setFormulario(
                formularioInicial
            );
            setArchivoImagen(null);
            setPreviewImagen(null);

            await cargarPuntosVenta();
        } catch (err) {
            console.error(err);

            const mensajeError =
                err instanceof Error
                    ? err.message
                    : "No se pudo guardar el punto de venta.";

            setError(mensajeError);
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarEstado(
        punto: PuntoVenta
    ) {
        setError("");
        setMensaje("");

        try {
            const {
                data: { user },
            } =
                await supabase.auth.getUser();

            if (!user) {
                throw new Error(
                    "No se pudo identificar al usuario."
                );
            }

            const {
                error: errorUpdate,
            } = await supabase
                .from("puntos_venta")
                .update({
                    activo:
                        !punto.activo,

                    updated_by:
                        user.id,

                    updated_at:
                        new Date().toISOString(),
                })
                .eq("id", punto.id);

            if (errorUpdate) {
                throw errorUpdate;
            }

            setMensaje(
                punto.activo
                    ? "Punto de venta desactivado."
                    : "Punto de venta activado."
            );

            await cargarPuntosVenta();
        } catch (err) {
            console.error(err);

            setError(
                "No se pudo modificar el estado del punto de venta."
            );
        }
    }

    const puntosFiltrados =
        useMemo(() => {
            const texto =
                busqueda
                    .trim()
                    .toLowerCase();

            return puntosVenta.filter(
                (punto) => {
                    const contenido = [
                        punto.nombre,
                        punto.direccion ?? "",
                        punto.localidad ?? "",
                        punto.provincia ?? "",
                        punto.canal?.tipo ?? "",
                        punto.zona?.tipo ?? "",
                        punto.bandera?.tipo ?? "",
                        punto.retail?.tipo ?? "",
                    ]
                        .join(" ")
                        .toLowerCase();

                    const coincideBusqueda =
                        !texto ||
                        contenido.includes(
                            texto
                        );

                    const coincideCanal =
                        !filtroCanal ||
                        punto.canal_id ===
                            filtroCanal;

                    const coincideZona =
                        !filtroZona ||
                        punto.zona_id ===
                            filtroZona;

                    const coincideBandera =
                        !filtroBandera ||
                        punto.bandera_id ===
                            filtroBandera;

                    const coincideRetail =
                        !filtroRetail ||
                        punto.retail_id ===
                            filtroRetail;

                    const coincideEstado =
                        filtroEstado ===
                            "todos" ||
                        (filtroEstado ===
                            "activos" &&
                            punto.activo) ||
                        (filtroEstado ===
                            "inactivos" &&
                            !punto.activo);

                    return (
                        coincideBusqueda &&
                        coincideCanal &&
                        coincideZona &&
                        coincideBandera &&
                        coincideRetail &&
                        coincideEstado
                    );
                }
            );
        }, [
            puntosVenta,
            busqueda,
            filtroCanal,
            filtroZona,
            filtroBandera,
            filtroRetail,
            filtroEstado,
        ]);

    function obtenerUrlImagen(
        path: string | null
    ) {
        if (!path) return null;

        const { data } =
            supabase.storage
                .from("puntos-venta")
                .getPublicUrl(path);

        return data.publicUrl;
    }

    function textoONull(
        valor: string
    ) {
        const limpio = valor.trim();

        return limpio
            ? limpio
            : null;
    }

    function normalizarHora(
        valor: string | null
    ) {
        if (!valor) return "";

        return valor.slice(0, 5);
    }

    function maestroDisponible(
        maestro: Maestro,
        idSeleccionado: string
    ) {
        return (
            maestro.activo ||
            maestro.id === idSeleccionado
        );
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
                        Configuración / Puntos
                        de venta
                    </div>

                    <h1 style={styles.title}>
                        Puntos de venta
                    </h1>

                    <p style={styles.subtitle}>
                        Administrá los puntos
                        de venta, su estructura
                        comercial, ubicación,
                        horarios y datos de
                        contacto.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        abrirNuevoPuntoVenta
                    }
                    style={
                        styles.primaryButton
                    }
                >
                    + Nuevo punto de venta
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
                    placeholder="Buscar punto de venta..."
                    value={busqueda}
                    onChange={(evento) =>
                        setBusqueda(
                            evento.target.value
                        )
                    }
                    style={styles.searchInput}
                />

                <select
                    value={filtroCanal}
                    onChange={(evento) =>
                        setFiltroCanal(
                            evento.target.value
                        )
                    }
                    style={styles.select}
                >
                    <option value="">
                        Todos los canales
                    </option>

                    {canales.map(
                        (canal) => (
                            <option
                                key={canal.id}
                                value={canal.id}
                            >
                                {canal.tipo}
                            </option>
                        )
                    )}
                </select>

                <select
                    value={filtroZona}
                    onChange={(evento) =>
                        setFiltroZona(
                            evento.target.value
                        )
                    }
                    style={styles.select}
                >
                    <option value="">
                        Todas las zonas
                    </option>

                    {zonas.map((zona) => (
                        <option
                            key={zona.id}
                            value={zona.id}
                        >
                            {zona.tipo}
                        </option>
                    ))}
                </select>

                <select
                    value={filtroBandera}
                    onChange={(evento) =>
                        setFiltroBandera(
                            evento.target.value
                        )
                    }
                    style={styles.select}
                >
                    <option value="">
                        Todas las banderas
                    </option>

                    {banderas.map(
                        (bandera) => (
                            <option
                                key={
                                    bandera.id
                                }
                                value={
                                    bandera.id
                                }
                            >
                                {
                                    bandera.tipo
                                }
                            </option>
                        )
                    )}
                </select>

                <select
                    value={filtroRetail}
                    onChange={(evento) =>
                        setFiltroRetail(
                            evento.target.value
                        )
                    }
                    style={styles.select}
                >
                    <option value="">
                        Todos los retails
                    </option>

                    {retails.map(
                        (retail) => (
                            <option
                                key={retail.id}
                                value={retail.id}
                            >
                                {retail.tipo}
                            </option>
                        )
                    )}
                </select>

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
                        Cargando puntos de
                        venta...
                    </div>
                ) : puntosFiltrados.length ===
                  0 ? (
                    <div style={styles.empty}>
                        No hay puntos de venta
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
                                    <th style={styles.th}>
                                        Imagen
                                    </th>

                                    <th style={styles.th}>
                                        Punto de venta
                                    </th>

                                    <th style={styles.th}>
                                        Canal
                                    </th>

                                    <th style={styles.th}>
                                        Zona
                                    </th>

                                    <th style={styles.th}>
                                        Bandera
                                    </th>

                                    <th style={styles.th}>
                                        Retail
                                    </th>

                                    <th style={styles.th}>
                                        Ubicación
                                    </th>

                                    <th style={styles.th}>
                                        Horario
                                    </th>

                                    <th style={styles.th}>
                                        Estado
                                    </th>

                                    <th style={styles.th}>
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {puntosFiltrados.map(
                                    (punto) => {
                                        const urlImagen =
                                            obtenerUrlImagen(
                                                punto.imagen_path
                                            );

                                        return (
                                            <tr
                                                key={
                                                    punto.id
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
                                                                punto.nombre
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
                                                    <div
                                                        style={
                                                            styles.mainText
                                                        }
                                                    >
                                                        {
                                                            punto.nombre
                                                        }
                                                    </div>

                                                    {punto.telefono && (
                                                        <div
                                                            style={
                                                                styles.secondaryText
                                                            }
                                                        >
                                                            {
                                                                punto.telefono
                                                            }
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={styles.td}>
                                                    {punto.canal?.tipo ?? "—"}
                                                </td>

                                                <td style={styles.td}>
                                                    {punto.zona?.tipo ?? "—"}
                                                </td>

                                                <td style={styles.td}>
                                                    {punto.bandera?.tipo ?? "—"}
                                                </td>

                                                <td style={styles.td}>
                                                    {punto.retail?.tipo ?? "—"}
                                                </td>

                                                <td style={styles.td}>
                                                    <div>
                                                        {punto.direccion ?? "—"}
                                                    </div>

                                                    {(punto.localidad ||
                                                        punto.provincia) && (
                                                        <div
                                                            style={
                                                                styles.secondaryText
                                                            }
                                                        >
                                                            {[
                                                                punto.localidad,
                                                                punto.provincia,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={styles.td}>
                                                    {punto.hora_apertura ||
                                                    punto.hora_cierre ? (
                                                        <>
                                                            {normalizarHora(
                                                                punto.hora_apertura
                                                            ) || "—"}
                                                            {" - "}
                                                            {normalizarHora(
                                                                punto.hora_cierre
                                                            ) || "—"}
                                                        </>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>

                                                <td style={styles.td}>
                                                    <span
                                                        style={
                                                            punto.activo
                                                                ? styles.activeBadge
                                                                : styles.inactiveBadge
                                                        }
                                                    >
                                                        {punto.activo
                                                            ? "Activo"
                                                            : "Inactivo"}
                                                    </span>
                                                </td>

                                                <td style={styles.td}>
                                                    <div
                                                        style={
                                                            styles.actions
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                abrirEditarPuntoVenta(
                                                                    punto
                                                                )
                                                            }
                                                            style={
                                                                styles.secondaryButton
                                                            }
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                cambiarEstado(
                                                                    punto
                                                                )
                                                            }
                                                            style={
                                                                styles.linkButton
                                                            }
                                                        >
                                                            {punto.activo
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
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>
                                    {puntoEditando
                                        ? "Editar punto de venta"
                                        : "Nuevo punto de venta"}
                                </h2>

                                <p style={styles.modalSubtitle}>
                                    Completá la estructura comercial y los datos
                                    del punto de venta.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModal}
                                style={styles.closeButton}
                                disabled={guardando}
                            >
                                ×
                            </button>
                        </div>

                        <SeccionFormulario
                            titulo="Información general"
                        >
                            <div style={styles.fullField}>
                                <label style={styles.label}>
                                    Nombre del punto de venta *
                                </label>

                                <input
                                    type="text"
                                    value={formulario.nombre}
                                    onChange={(evento) =>
                                        actualizarCampo(
                                            "nombre",
                                            evento.target.value
                                        )
                                    }
                                    placeholder="Ej. Sucursal Palermo"
                                    style={styles.input}
                                    disabled={guardando}
                                />
                            </div>

                            <CampoSelect
                                label="Canal *"
                                value={formulario.canal_id}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "canal_id",
                                        valor
                                    )
                                }
                                placeholder="Seleccionar canal"
                                maestros={canales.filter((item) =>
                                    maestroDisponible(
                                        item,
                                        formulario.canal_id
                                    )
                                )}
                                disabled={guardando}
                            />

                            <CampoSelect
                                label="Zona *"
                                value={formulario.zona_id}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "zona_id",
                                        valor
                                    )
                                }
                                placeholder="Seleccionar zona"
                                maestros={zonas.filter((item) =>
                                    maestroDisponible(
                                        item,
                                        formulario.zona_id
                                    )
                                )}
                                disabled={guardando}
                            />

                            <CampoSelect
                                label="Bandera *"
                                value={formulario.bandera_id}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "bandera_id",
                                        valor
                                    )
                                }
                                placeholder="Seleccionar bandera"
                                maestros={banderas.filter((item) =>
                                    maestroDisponible(
                                        item,
                                        formulario.bandera_id
                                    )
                                )}
                                disabled={guardando}
                            />

                            <CampoSelect
                                label="Retail *"
                                value={formulario.retail_id}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "retail_id",
                                        valor
                                    )
                                }
                                placeholder="Seleccionar retail"
                                maestros={retails.filter((item) =>
                                    maestroDisponible(
                                        item,
                                        formulario.retail_id
                                    )
                                )}
                                disabled={guardando}
                            />
                        </SeccionFormulario>

                        <SeccionFormulario titulo="Ubicación">
                            <div style={styles.fullField}>
                                <label style={styles.label}>
                                    Dirección
                                </label>

                                <input
                                    type="text"
                                    value={formulario.direccion}
                                    onChange={(evento) =>
                                        actualizarCampo(
                                            "direccion",
                                            evento.target.value
                                        )
                                    }
                                    placeholder="Ej. Av. Santa Fe 3253"
                                    style={styles.input}
                                    disabled={guardando}
                                />
                            </div>

                            <CampoTexto
                                label="Localidad"
                                value={formulario.localidad}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "localidad",
                                        valor
                                    )
                                }
                                placeholder="Ej. Palermo"
                                disabled={guardando}
                            />

                            <CampoTexto
                                label="Provincia"
                                value={formulario.provincia}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "provincia",
                                        valor
                                    )
                                }
                                placeholder="Ej. Buenos Aires"
                                disabled={guardando}
                            />

                            <CampoTexto
                                label="Código postal"
                                value={formulario.codigo_postal}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "codigo_postal",
                                        valor
                                    )
                                }
                                placeholder="Ej. C1425"
                                disabled={guardando}
                            />
                        </SeccionFormulario>

                        <SeccionFormulario titulo="Horarios">
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Hora de apertura
                                </label>

                                <input
                                    type="time"
                                    value={formulario.hora_apertura}
                                    onChange={(evento) =>
                                        actualizarCampo(
                                            "hora_apertura",
                                            evento.target.value
                                        )
                                    }
                                    style={styles.input}
                                    disabled={guardando}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Hora de cierre
                                </label>

                                <input
                                    type="time"
                                    value={formulario.hora_cierre}
                                    onChange={(evento) =>
                                        actualizarCampo(
                                            "hora_cierre",
                                            evento.target.value
                                        )
                                    }
                                    style={styles.input}
                                    disabled={guardando}
                                />
                            </div>
                        </SeccionFormulario>

                        <SeccionFormulario titulo="Contacto">
                            <CampoTexto
                                label="Teléfono"
                                value={formulario.telefono}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "telefono",
                                        valor
                                    )
                                }
                                placeholder="Ej. 11 4444-5555"
                                disabled={guardando}
                            />

                            <CampoTexto
                                label="Email"
                                value={formulario.email}
                                onChange={(valor) =>
                                    actualizarCampo(
                                        "email",
                                        valor
                                    )
                                }
                                placeholder="Ej. sucursal@eaya.com"
                                type="email"
                                disabled={guardando}
                            />
                        </SeccionFormulario>

                        <SeccionFormulario titulo="Imagen">
                            <div style={styles.fullField}>
                                <label style={styles.label}>
                                    Imagen representativa
                                </label>

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={seleccionarImagen}
                                    disabled={guardando}
                                />

                                <div style={styles.helpText}>
                                    JPG, PNG o WebP. Máximo 5 MB.
                                </div>

                                {previewImagen && (
                                    <div style={styles.previewContainer}>
                                        <img
                                            src={previewImagen}
                                            alt="Vista previa"
                                            style={styles.preview}
                                        />
                                    </div>
                                )}
                            </div>
                        </SeccionFormulario>

                        <SeccionFormulario titulo="Información adicional">
                            <div style={styles.fullField}>
                                <label style={styles.label}>
                                    Observaciones
                                </label>

                                <textarea
                                    value={formulario.observaciones}
                                    onChange={(evento) =>
                                        actualizarCampo(
                                            "observaciones",
                                            evento.target.value
                                        )
                                    }
                                    placeholder="Información adicional del punto de venta..."
                                    style={styles.textarea}
                                    disabled={guardando}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Estado
                                </label>

                                <select
                                    value={
                                        formulario.activo
                                            ? "activo"
                                            : "inactivo"
                                    }
                                    onChange={(evento) =>
                                        actualizarCampo(
                                            "activo",
                                            evento.target.value ===
                                                "activo"
                                        )
                                    }
                                    style={styles.select}
                                    disabled={guardando}
                                >
                                    <option value="activo">
                                        Activo
                                    </option>

                                    <option value="inactivo">
                                        Inactivo
                                    </option>
                                </select>
                            </div>
                        </SeccionFormulario>

                        <div style={styles.modalActions}>
                            <button
                                type="button"
                                onClick={cerrarModal}
                                style={styles.secondaryButton}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={guardarPuntoVenta}
                                style={styles.primaryButton}
                                disabled={guardando}
                            >
                                {guardando
                                    ? "Guardando..."
                                    : puntoEditando
                                      ? "Guardar cambios"
                                      : "Crear punto de venta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SeccionFormulario({
    titulo,
    children,
}: {
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div style={styles.formSection}>
            <h3 style={styles.formSectionTitle}>
                {titulo}
            </h3>

            <div style={styles.formGrid}>
                {children}
            </div>
        </div>
    );
}

function CampoTexto({
    label,
    value,
    onChange,
    placeholder,
    disabled,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (valor: string) => void;
    placeholder?: string;
    disabled?: boolean;
    type?: string;
}) {
    return (
        <div style={styles.field}>
            <label style={styles.label}>
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(evento) =>
                    onChange(evento.target.value)
                }
                placeholder={placeholder}
                style={styles.input}
                disabled={disabled}
            />
        </div>
    );
}

function CampoSelect({
    label,
    value,
    onChange,
    placeholder,
    maestros,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (valor: string) => void;
    placeholder: string;
    maestros: Maestro[];
    disabled?: boolean;
}) {
    return (
        <div style={styles.field}>
            <label style={styles.label}>
                {label}
            </label>

            <select
                value={value}
                onChange={(evento) =>
                    onChange(evento.target.value)
                }
                style={styles.selectFull}
                disabled={disabled}
            >
                <option value="">
                    {placeholder}
                </option>

                {maestros.map((maestro) => (
                    <option
                        key={maestro.id}
                        value={maestro.id}
                    >
                        {maestro.tipo}
                        {!maestro.activo
                            ? " (Inactivo)"
                            : ""}
                    </option>
                ))}
            </select>
        </div>
    );
}

const styles: Record<
    string,
    React.CSSProperties
> = {
    page: {
        padding: "32px",
        maxWidth: "1600px",
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
        maxWidth: "760px",
    },

    filters: {
        display: "flex",
        gap: "10px",
        marginBottom: "20px",
        flexWrap: "wrap",
    },

    searchInput: {
        minWidth: "260px",
        flex: "1 1 300px",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        boxSizing: "border-box",
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
        minWidth: "1250px",
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
        whiteSpace: "nowrap",
    },

    td: {
        padding: "14px 16px",
        borderBottom:
            "1px solid #e5e7eb",
        verticalAlign: "middle",
        fontSize: "14px",
    },

    mainText: {
        fontWeight: 600,
        color: "#111827",
    },

    secondaryText: {
        marginTop: "4px",
        color: "#6b7280",
        fontSize: "12px",
    },

    input: {
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        boxSizing: "border-box",
        background: "#ffffff",
    },

    textarea: {
        width: "100%",
        minHeight: "100px",
        resize: "vertical",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        boxSizing: "border-box",
        fontFamily: "inherit",
    },

    select: {
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        background: "#ffffff",
        fontSize: "14px",
    },

    selectFull: {
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        background: "#ffffff",
        fontSize: "14px",
        boxSizing: "border-box",
    },

    primaryButton: {
        border: "none",
        background: "#111827",
        color: "#ffffff",
        padding: "10px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: 600,
        whiteSpace: "nowrap",
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
        maxWidth: "820px",
        maxHeight: "92vh",
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

    formSection: {
        marginBottom: "26px",
        paddingBottom: "22px",
        borderBottom:
            "1px solid #e5e7eb",
    },

    formSectionTitle: {
        margin: "0 0 16px",
        fontSize: "14px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "#374151",
    },

    formGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
        gap: "16px",
    },

    field: {
        minWidth: 0,
    },

    fullField: {
        gridColumn: "1 / -1",
        minWidth: 0,
    },

    label: {
        display: "block",
        fontSize: "13px",
        fontWeight: 600,
        marginBottom: "7px",
    },

    helpText: {
        marginTop: "6px",
        color: "#6b7280",
        fontSize: "12px",
    },

    previewContainer: {
        marginTop: "14px",
    },

    preview: {
        width: "220px",
        height: "145px",
        objectFit: "cover",
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
    },

    modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        marginTop: "8px",
    },
};