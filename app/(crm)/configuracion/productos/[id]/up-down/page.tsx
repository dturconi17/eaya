"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Save,
    Trash2,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";

/* =========================================================
   TIPOS
========================================================= */

type Empresa = {
    id: string;
    nombre: string;
};

type Producto = {
    id: string;
    empresa_id: string;
    nombre: string;
    descripcion: string | null;
    precio: number;
    moneda: string;
    activo: boolean;

    empresas?: Empresa | null;
};

type ConfiguracionUpDown = {
    id: string;
    producto_id: string;
    producto_upgrade_id: string | null;
    producto_downgrade_id: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
};

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function formatearImporte(
    valor: number | null | undefined,
    moneda = "ARS"
) {
    if (valor === null || valor === undefined) {
        return "—";
    }

    try {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: moneda,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(valor));
    } catch {
        return `${moneda} ${Number(valor).toLocaleString(
            "es-AR"
        )}`;
    }
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function ProductoUpDownPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const {
        user,
        role,
        loading: userLoading,
    } = useUser();

    const productoId = params.id;

    const [productoActual, setProductoActual] =
        useState<Producto | null>(null);

    const [productos, setProductos] = useState<Producto[]>(
        []
    );

    const [configuracion, setConfiguracion] =
        useState<ConfiguracionUpDown | null>(null);

    const [upgradeId, setUpgradeId] = useState("");
    const [downgradeId, setDowngradeId] = useState("");

    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    /* =======================================================
       CARGAR DATOS
    ======================================================= */

    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [
                {
                    data: productoData,
                    error: productoError,
                },
                {
                    data: productosData,
                    error: productosError,
                },
                {
                    data: configuracionData,
                    error: configuracionError,
                },
            ] = await Promise.all([
                supabase
                    .from("productos")
                    .select(`
                        id,
                        empresa_id,
                        nombre,
                        descripcion,
                        precio,
                        moneda,
                        activo,
                        empresas (
                            id,
                            nombre
                        )
                    `)
                    .eq("id", productoId)
                    .single(),

                supabase
                    .from("productos")
                    .select(`
                        id,
                        empresa_id,
                        nombre,
                        descripcion,
                        precio,
                        moneda,
                        activo,
                        empresas (
                            id,
                            nombre
                        )
                    `)
                    .neq("id", productoId)
                    .order("precio", {
                        ascending: true,
                    }),

                supabase
                    .from("productos_up_down")
                    .select("*")
                    .eq("producto_id", productoId)
                    .maybeSingle(),
            ]);

            if (productoError) {
                throw productoError;
            }

            if (productosError) {
                throw productosError;
            }

            if (configuracionError) {
                throw configuracionError;
            }

            const producto: Producto = {
                ...productoData,
                empresas: Array.isArray(productoData.empresas)
                    ? productoData.empresas[0] ?? null
                    : productoData.empresas ?? null,
            };

            const listaProductos: Producto[] = (productosData ?? []).map(
                (item) => ({
                    ...item,
                    empresas: Array.isArray(item.empresas)
                        ? item.empresas[0] ?? null
                        : item.empresas ?? null,
                })
            );

            const relacion =
                (configuracionData ??
                    null) as ConfiguracionUpDown | null;

            setProductoActual(producto);
            setProductos(listaProductos);
            setConfiguracion(relacion);

            setUpgradeId(
                relacion?.producto_upgrade_id ?? ""
            );

            setDowngradeId(
                relacion?.producto_downgrade_id ?? ""
            );
        } catch (err: any) {
            console.error(
                "Error cargando configuración Up & Down:",
                err
            );

            setError(
                err?.message ||
                "No fue posible cargar la configuración Up & Down."
            );
        } finally {
            setLoading(false);
        }
    }, [productoId]);

    useEffect(() => {
        if (userLoading) {
            return;
        }

        if (!user) {
            setLoading(false);
            return;
        }

        cargarDatos();
    }, [
        user,
        userLoading,
        cargarDatos,
    ]);

    /* =======================================================
       PRODUCTOS DISPONIBLES
    ======================================================= */

    const productosDisponibles = useMemo(() => {
        return productos.filter(
            (producto) =>
                producto.activo &&
                producto.id !== productoActual?.id
        );
    }, [productos, productoActual]);

    const productosUpgrade = useMemo(() => {
        return productosDisponibles.filter(
            (producto) => producto.id !== downgradeId
        );
    }, [productosDisponibles, downgradeId]);

    const productosDowngrade = useMemo(() => {
        return productosDisponibles.filter(
            (producto) => producto.id !== upgradeId
        );
    }, [productosDisponibles, upgradeId]);

    const productoUpgradeSeleccionado =
        useMemo(() => {
            return (
                productos.find(
                    (producto) =>
                        producto.id === upgradeId
                ) ?? null
            );
        }, [productos, upgradeId]);

    const productoDowngradeSeleccionado =
        useMemo(() => {
            return (
                productos.find(
                    (producto) =>
                        producto.id === downgradeId
                ) ?? null
            );
        }, [productos, downgradeId]);

    /* =======================================================
       VALIDACIONES
    ======================================================= */

    function validarConfiguracion() {
        if (!productoActual) {
            return "No se encontró el producto actual.";
        }

        if (
            upgradeId &&
            downgradeId &&
            upgradeId === downgradeId
        ) {
            return "El producto de upgrade y el producto de downgrade deben ser diferentes.";
        }

        if (upgradeId === productoActual.id) {
            return "El producto actual no puede ser su propio upgrade.";
        }

        if (downgradeId === productoActual.id) {
            return "El producto actual no puede ser su propio downgrade.";
        }

        if (
            productoUpgradeSeleccionado &&
            !productoUpgradeSeleccionado.activo
        ) {
            return "El producto de upgrade debe estar activo.";
        }

        if (
            productoDowngradeSeleccionado &&
            !productoDowngradeSeleccionado.activo
        ) {
            return "El producto de downgrade debe estar activo.";
        }

        return null;
    }

    /* =======================================================
       GUARDAR CONFIGURACIÓN
    ======================================================= */

    async function guardarConfiguracion() {
        if (!user?.id) {
            setError(
                "No fue posible identificar al usuario."
            );
            return;
        }

        if (role !== "admin") {
            setError(
                "No tenés permisos para modificar esta configuración."
            );
            return;
        }

        const errorValidacion =
            validarConfiguracion();

        if (errorValidacion) {
            setError(errorValidacion);
            return;
        }

        try {
            setGuardando(true);
            setError("");
            setMensaje("");

            const datosConfiguracion = {
                producto_id: productoId,
                producto_upgrade_id:
                    upgradeId || null,
                producto_downgrade_id:
                    downgradeId || null,
                updated_by: user.id,
            };

            let resultado:
                | ConfiguracionUpDown
                | null = null;

            if (configuracion) {
                const {
                    data,
                    error: actualizarError,
                } = await supabase
                    .from("productos_up_down")
                    .update(datosConfiguracion)
                    .eq("id", configuracion.id)
                    .select("*")
                    .single();

                if (actualizarError) {
                    throw actualizarError;
                }

                resultado =
                    data as ConfiguracionUpDown;
            } else {
                const {
                    data,
                    error: insertarError,
                } = await supabase
                    .from("productos_up_down")
                    .insert({
                        ...datosConfiguracion,
                        created_by: user.id,
                    })
                    .select("*")
                    .single();

                if (insertarError) {
                    throw insertarError;
                }

                resultado =
                    data as ConfiguracionUpDown;
            }

            setConfiguracion(resultado);

            setMensaje(
                "Configuración Up & Down guardada correctamente."
            );
        } catch (err: any) {
            console.error(
                "Error guardando configuración Up & Down:",
                err
            );

            if (err?.code === "23514") {
                setError(
                    "La configuración no cumple las reglas de Up & Down."
                );
            } else if (err?.code === "23503") {
                setError(
                    "Uno de los productos seleccionados ya no existe."
                );
            } else if (err?.code === "42501") {
                setError(
                    "No tenés permisos para guardar esta configuración."
                );
            } else {
                setError(
                    err?.message ||
                    "No fue posible guardar la configuración."
                );
            }
        } finally {
            setGuardando(false);
        }
    }

    /* =======================================================
       ELIMINAR CONFIGURACIÓN
    ======================================================= */

    async function eliminarConfiguracion() {
        if (!configuracion) {
            return;
        }

        if (role !== "admin") {
            setError(
                "No tenés permisos para eliminar esta configuración."
            );
            return;
        }

        const confirmado = window.confirm(
            "¿Querés eliminar la configuración Up & Down de este producto?"
        );

        if (!confirmado) {
            return;
        }

        try {
            setEliminando(true);
            setError("");
            setMensaje("");

            const { error: eliminarError } =
                await supabase
                    .from("productos_up_down")
                    .delete()
                    .eq("id", configuracion.id);

            if (eliminarError) {
                throw eliminarError;
            }

            setConfiguracion(null);
            setUpgradeId("");
            setDowngradeId("");

            setMensaje(
                "Configuración Up & Down eliminada correctamente."
            );
        } catch (err: any) {
            console.error(
                "Error eliminando configuración Up & Down:",
                err
            );

            if (err?.code === "42501") {
                setError(
                    "No tenés permisos para eliminar esta configuración."
                );
            } else {
                setError(
                    err?.message ||
                    "No fue posible eliminar la configuración."
                );
            }
        } finally {
            setEliminando(false);
        }
    }

    /* =======================================================
       CONTROL DE ACCESO
    ======================================================= */

    if (userLoading || loading) {
        return (
            <main style={styles.page}>
                <div style={styles.loadingBox}>
                    Cargando configuración Up & Down...
                </div>
            </main>
        );
    }

    if (!user) {
        return (
            <main style={styles.page}>
                <div style={styles.errorBox}>
                    Debés iniciar sesión para acceder a
                    esta página.
                </div>
            </main>
        );
    }

    if (role !== "admin") {
        return (
            <main style={styles.page}>
                <div style={styles.errorBox}>
                    No tenés permisos para configurar
                    productos.
                </div>
            </main>
        );
    }

    if (!productoActual) {
        return (
            <main style={styles.page}>
                <div style={styles.errorBox}>
                    No se encontró el producto
                    seleccionado.
                </div>
            </main>
        );
    }

    /* =======================================================
       RENDER
    ======================================================= */

    return (
        <main style={styles.page}>
            <div style={styles.container}>
                <button
                    type="button"
                    onClick={() => {
                        router.push(
                            "/configuracion/productos"
                        );
                        router.refresh();
                    }}
                    style={styles.backButton}
                >
                    <ArrowLeft size={17} />
                    Volver a productos
                </button>

                <div style={styles.header}>
                    <div>
                        <div style={styles.breadcrumb}>
                            Configuración / Productos /
                            Up & Down
                        </div>

                        <h1 style={styles.title}>
                            Up & Down
                        </h1>

                        <p style={styles.subtitle}>
                            Definí la alternativa superior
                            e inferior del producto{" "}
                            <strong>
                                {productoActual.nombre}
                            </strong>
                            .
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}

                {mensaje && (
                    <div style={styles.successBox}>
                        {mensaje}
                    </div>
                )}

                {/* PRODUCTO ACTUAL */}

                <section style={styles.currentProductCard}>
                    <div>
                        <span style={styles.cardLabel}>
                            Producto actual
                        </span>

                        <h2 style={styles.currentProductName}>
                            {productoActual.nombre}
                        </h2>

                        <p style={styles.companyText}>
                            {productoActual.empresas
                                ?.nombre ||
                                "Empresa no disponible"}
                        </p>

                        {productoActual.descripcion && (
                            <p
                                style={
                                    styles.productDescription
                                }
                            >
                                {
                                    productoActual.descripcion
                                }
                            </p>
                        )}
                    </div>

                    <div style={styles.currentPrice}>
                        {formatearImporte(
                            productoActual.precio,
                            productoActual.moneda
                        )}
                    </div>
                </section>

                {/* CONFIGURACIÓN */}

                <section style={styles.relationsGrid}>
                    {/* UPGRADE */}

                    <article style={styles.relationCard}>
                        <div style={styles.relationHeader}>
                            <div style={styles.upIcon}>
                                <ArrowUp size={21} />
                            </div>

                            <div>
                                <h2
                                    style={
                                        styles.relationTitle
                                    }
                                >
                                    Upgrade
                                </h2>

                                <p
                                    style={
                                        styles.relationDescription
                                    }
                                >
                                    Producto superior que
                                    puede ofrecerse como una
                                    mejora del producto actual.
                                </p>
                            </div>
                        </div>

                        <label style={styles.label}>
                            Producto de upgrade
                        </label>

                        <select
                            value={upgradeId}
                            onChange={(evento) =>
                                setUpgradeId(
                                    evento.target.value
                                )
                            }
                            style={styles.select}
                            disabled={
                                guardando || eliminando
                            }
                        >
                            <option value="">
                                Sin producto de upgrade
                            </option>

                            {productosUpgrade.map(
                                (producto) => (
                                    <option
                                        key={producto.id}
                                        value={producto.id}
                                    >
                                        {producto.nombre} ·{" "}
                                        {formatearImporte(
                                            producto.precio,
                                            producto.moneda
                                        )}
                                    </option>
                                )
                            )}
                        </select>

                        <span style={styles.fieldHelp}>
                            Podés seleccionar cualquier
                            producto activo, excepto el
                            producto actual y el elegido como
                            downgrade.
                        </span>

                        {productoUpgradeSeleccionado && (
                            <div
                                style={
                                    styles.selectedProductCard
                                }
                            >
                                <span
                                    style={
                                        styles.selectedLabel
                                    }
                                >
                                    Upgrade seleccionado
                                </span>

                                <strong>
                                    {
                                        productoUpgradeSeleccionado.nombre
                                    }
                                </strong>

                                <span
                                    style={
                                        styles.selectedPrice
                                    }
                                >
                                    {formatearImporte(
                                        productoUpgradeSeleccionado.precio,
                                        productoUpgradeSeleccionado.moneda
                                    )}
                                </span>
                            </div>
                        )}
                    </article>

                    {/* DOWNGRADE */}

                    <article style={styles.relationCard}>
                        <div style={styles.relationHeader}>
                            <div style={styles.downIcon}>
                                <ArrowDown size={21} />
                            </div>

                            <div>
                                <h2
                                    style={
                                        styles.relationTitle
                                    }
                                >
                                    Downgrade
                                </h2>

                                <p
                                    style={
                                        styles.relationDescription
                                    }
                                >
                                    Producto inferior que
                                    puede ofrecerse cuando el
                                    producto actual no resulta
                                    adecuado.
                                </p>
                            </div>
                        </div>

                        <label style={styles.label}>
                            Producto de downgrade
                        </label>

                        <select
                            value={downgradeId}
                            onChange={(evento) =>
                                setDowngradeId(
                                    evento.target.value
                                )
                            }
                            style={styles.select}
                            disabled={
                                guardando || eliminando
                            }
                        >
                            <option value="">
                                Sin producto de downgrade
                            </option>

                            {productosDowngrade.map(
                                (producto) => (
                                    <option
                                        key={producto.id}
                                        value={producto.id}
                                    >
                                        {producto.nombre} ·{" "}
                                        {formatearImporte(
                                            producto.precio,
                                            producto.moneda
                                        )}
                                    </option>
                                )
                            )}
                        </select>

                        <span style={styles.fieldHelp}>
                            Podés seleccionar cualquier
                            producto activo, excepto el
                            producto actual y el elegido como
                            upgrade.
                        </span>

                        {productoDowngradeSeleccionado && (
                            <div
                                style={
                                    styles.selectedProductCard
                                }
                            >
                                <span
                                    style={
                                        styles.selectedLabel
                                    }
                                >
                                    Downgrade seleccionado
                                </span>

                                <strong>
                                    {
                                        productoDowngradeSeleccionado.nombre
                                    }
                                </strong>

                                <span
                                    style={
                                        styles.selectedPrice
                                    }
                                >
                                    {formatearImporte(
                                        productoDowngradeSeleccionado.precio,
                                        productoDowngradeSeleccionado.moneda
                                    )}
                                </span>
                            </div>
                        )}
                    </article>
                </section>

                {/* ACCIONES */}

                <div style={styles.actions}>
                    {configuracion && (
                        <button
                            type="button"
                            onClick={
                                eliminarConfiguracion
                            }
                            style={styles.deleteButton}
                            disabled={
                                guardando || eliminando
                            }
                        >
                            <Trash2 size={17} />

                            {eliminando
                                ? "Eliminando..."
                                : "Eliminar configuración"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={
                            guardarConfiguracion
                        }
                        style={styles.saveButton}
                        disabled={
                            guardando || eliminando
                        }
                    >
                        <Save size={17} />

                        {guardando
                            ? "Guardando..."
                            : "Guardar Up & Down"}
                    </button>
                </div>
            </div>
        </main>
    );
}

/* =========================================================
   ESTILOS
========================================================= */

const styles: Record<
    string,
    React.CSSProperties
> = {
    page: {
        minHeight: "100vh",
        padding: "24px",
        background: "#f1f5f9",
    },

    container: {
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
    },

    backButton: {
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        marginBottom: "20px",
        padding: 0,
        border: "none",
        background: "transparent",
        color: "#475569",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 700,
    },

    header: {
        marginBottom: "22px",
    },

    breadcrumb: {
        marginBottom: "8px",
        color: "#64748b",
        fontSize: "13px",
    },

    title: {
        margin: 0,
        color: "#0f172a",
        fontSize: "29px",
        lineHeight: 1.2,
    },

    subtitle: {
        margin: "8px 0 0",
        color: "#64748b",
        fontSize: "15px",
    },

    currentProductCard: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "18px",
        padding: "20px",
        marginBottom: "18px",
        border: "1px solid #cbd5e1",
        borderRadius: "14px",
        background: "#ffffff",
        boxShadow:
            "0 1px 3px rgba(15, 23, 42, 0.05)",
    },

    cardLabel: {
        display: "block",
        marginBottom: "5px",
        color: "#64748b",
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    },

    currentProductName: {
        margin: 0,
        color: "#0f172a",
        fontSize: "21px",
    },

    companyText: {
        margin: "5px 0 0",
        color: "#64748b",
        fontSize: "14px",
    },

    productDescription: {
        maxWidth: "650px",
        margin: "8px 0 0",
        color: "#475569",
        fontSize: "13px",
        lineHeight: 1.5,
    },

    currentPrice: {
        color: "#0f172a",
        fontSize: "21px",
        fontWeight: 800,
        whiteSpace: "nowrap",
    },

    relationsGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
        gap: "18px",
    },

    relationCard: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: 0,
        padding: "22px",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        background: "#ffffff",
        boxShadow:
            "0 1px 3px rgba(15, 23, 42, 0.05)",
    },

    relationHeader: {
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "8px",
    },

    upIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "42px",
        height: "42px",
        flexShrink: 0,
        borderRadius: "11px",
        background: "#dcfce7",
        color: "#15803d",
    },

    downIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "42px",
        height: "42px",
        flexShrink: 0,
        borderRadius: "11px",
        background: "#ffedd5",
        color: "#c2410c",
    },

    relationTitle: {
        margin: 0,
        color: "#0f172a",
        fontSize: "18px",
    },

    relationDescription: {
        margin: "4px 0 0",
        color: "#64748b",
        fontSize: "13px",
        lineHeight: 1.45,
    },

    label: {
        color: "#334155",
        fontSize: "13px",
        fontWeight: 700,
    },

    select: {
        width: "100%",
        minHeight: "44px",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        outline: "none",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: "14px",
    },

    fieldHelp: {
        color: "#64748b",
        fontSize: "12px",
        lineHeight: 1.4,
    },

    selectedProductCard: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "13px",
        marginTop: "4px",
        border: "1px solid #e2e8f0",
        borderRadius: "9px",
        background: "#f8fafc",
        color: "#0f172a",
        fontSize: "13px",
    },

    selectedLabel: {
        color: "#64748b",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
    },

    selectedPrice: {
        color: "#475569",
        fontSize: "12px",
    },

    actions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        marginTop: "20px",
        flexWrap: "wrap",
    },

    saveButton: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        minHeight: "43px",
        padding: "10px 17px",
        border: "none",
        borderRadius: "9px",
        background: "#0f172a",
        color: "#ffffff",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 700,
    },

    deleteButton: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        minHeight: "43px",
        padding: "10px 17px",
        border: "1px solid #fecaca",
        borderRadius: "9px",
        background: "#fff1f2",
        color: "#be123c",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 700,
    },

    errorBox: {
        padding: "13px 15px",
        marginBottom: "16px",
        border: "1px solid #fecaca",
        borderRadius: "10px",
        background: "#fff1f2",
        color: "#be123c",
        fontSize: "14px",
    },

    successBox: {
        padding: "13px 15px",
        marginBottom: "16px",
        border: "1px solid #bbf7d0",
        borderRadius: "10px",
        background: "#f0fdf4",
        color: "#166534",
        fontSize: "14px",
    },

    loadingBox: {
        padding: "40px",
        borderRadius: "14px",
        background: "#ffffff",
        color: "#475569",
        textAlign: "center",
    },
};