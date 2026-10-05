"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./presupuestos.module.css";

type Nivel = "canal" | "bandera" | "punto_venta" | "vendedor";
type TipoObjetivo = "cantidad" | "monto";

type Canal = {
    id: string;
    tipo: string;
};

type Bandera = {
    id: string;
    tipo: string;
};

type PuntoVenta = {
    id: string;
    nombre: string;
    canal_id: string | null;
    bandera_id: string | null;
};

type Producto = {
    id: string;
    nombre: string;
};

type Presupuesto = {
    id: string;
    anio: number;
    mes: number;
    nivel: Nivel;

    canal_id: string | null;
    bandera_id: string | null;
    punto_venta_id: string | null;
    vendedor_id: string | null;

    presupuesto_padre_id: string | null;

    estado: "borrador" | "guardado" | "disponibilizado";

    distribucion_estado:
    | "pendiente"
    | "en_proceso"
    | "finalizada";
};

type Objetivo = {
    id?: string;
    producto_id: string;
    producto_nombre?: string;
    tipo_objetivo: TipoObjetivo;
    valor_objetivo: string;
    ponderacion: string;
};

type Distribucion = {
    id?: string;
    objetivo_origen_id: string;
    bandera_id?: string | null;
    punto_venta_id?: string | null;
    vendedor_id?: string | null;
    valor_asignado: string;
    ponderacion?: string;
};

type CanalResumen = Canal & {
    presupuesto: Presupuesto | null;
    objetivos: number;
    ponderacion: number;
};

type PresupuestoCanalDisponible = {
    presupuesto: Presupuesto;
    canal: Canal;
    objetivos: Objetivo[];
};

type PresupuestoBanderaDisponible = {
    presupuesto: Presupuesto;
    canal: Canal | null;
    bandera: Bandera;
    objetivos: Objetivo[];
    objetivosPadre: Objetivo[];
};

type Vendedor = {
    id: string;
    full_name: string | null;
    email: string | null;
    punto_venta_id: string | null;
};

type PresupuestoSucursalDisponible = {
    presupuesto: Presupuesto;
    canal: Canal | null;
    bandera: Bandera | null;
    puntoVenta: PuntoVenta;
    objetivos: Objetivo[];
    objetivosPadre: Objetivo[];
};

const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

const NIVEL_LABEL: Record<Nivel, string> = {
    canal: "Canales",
    bandera: "Banderas",
    punto_venta: "Sucursales",
    vendedor: "Vendedores",
};

const objetivoVacio = (): Objetivo => ({
    producto_id: "",
    tipo_objetivo: "cantidad",
    valor_objetivo: "",
    ponderacion: "",
});

export default function PresupuestosPage() {
    const hoy = new Date();

    // ============================================================
    // ESTADO GENERAL
    // ============================================================

    const [nivel, setNivel] = useState<Nivel>("canal");

    const [anio, setAnio] = useState(hoy.getFullYear());
    const [mes, setMes] = useState(hoy.getMonth() + 1);

    const [canales, setCanales] = useState<Canal[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);

    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    // ============================================================
    // CANALES
    // ============================================================

    const [resumenCanales, setResumenCanales] =
        useState<CanalResumen[]>([]);

    const [canalSeleccionado, setCanalSeleccionado] =
        useState<Canal | null>(null);

    const [presupuesto, setPresupuesto] =
        useState<Presupuesto | null>(null);

    const [objetivos, setObjetivos] = useState<Objetivo[]>([]);

    // ============================================================
    // BANDERAS
    // ============================================================

    const [
        presupuestosCanalDisponibles,
        setPresupuestosCanalDisponibles,
    ] = useState<PresupuestoCanalDisponible[]>([]);

    const [
        presupuestoCanalSeleccionado,
        setPresupuestoCanalSeleccionado,
    ] = useState<PresupuestoCanalDisponible | null>(null);

    const [banderas, setBanderas] = useState<Bandera[]>([]);

    const [distribuciones, setDistribuciones] =
        useState<Distribucion[]>([]);

    // ============================================================
    // SUCURSALES
    // ============================================================

    const [
        presupuestosBanderaDisponibles,
        setPresupuestosBanderaDisponibles,
    ] = useState<PresupuestoBanderaDisponible[]>([]);

    const [
        presupuestoBanderaSeleccionado,
        setPresupuestoBanderaSeleccionado,
    ] = useState<PresupuestoBanderaDisponible | null>(null);

    const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([]);
    const [distribucionesSucursales, setDistribucionesSucursales] =
        useState<Distribucion[]>([]);

    // ============================================================
    // VENDEDORES
    // ============================================================

    const [presupuestosSucursalDisponibles, setPresupuestosSucursalDisponibles] =
        useState<PresupuestoSucursalDisponible[]>([]);
    const [presupuestoSucursalSeleccionado, setPresupuestoSucursalSeleccionado] =
        useState<PresupuestoSucursalDisponible | null>(null);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [distribucionesVendedores, setDistribucionesVendedores] =
        useState<Distribucion[]>([]);

    // ============================================================
    // MAESTROS
    // ============================================================

    const cargarMaestros = useCallback(async () => {
        try {
            const [canalesResult, productosResult] =
                await Promise.all([
                    supabase
                        .from("canales")
                        .select("id, tipo")
                        .eq("activo", true)
                        .order("tipo"),

                    supabase
                        .from("productos")
                        .select("id, nombre")
                        .eq("activo", true)
                        .order("nombre"),
                ]);

            if (canalesResult.error) {
                throw canalesResult.error;
            }

            if (productosResult.error) {
                throw productosResult.error;
            }

            setCanales(canalesResult.data || []);
            setProductos(productosResult.data || []);
        } catch (err) {
            console.error(err);

            setError(
                "No se pudieron cargar los datos maestros."
            );
        }
    }, []);

    // ============================================================
    // RESUMEN CANALES
    // ============================================================

    const cargarResumenCanales = useCallback(async () => {
        if (canales.length === 0) {
            setResumenCanales([]);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const {
                data: presupuestosData,
                error: presupuestosError,
            } = await supabase
                .from("presupuestos")
                .select(`
          id,
          anio,
          mes,
          nivel,
          canal_id,
          bandera_id,
          punto_venta_id,
          vendedor_id,
          presupuesto_padre_id,
          estado,
          distribucion_estado
        `)
                .eq("anio", anio)
                .eq("mes", mes)
                .eq("nivel", "canal");

            if (presupuestosError) {
                throw presupuestosError;
            }

            const presupuestos =
                (presupuestosData || []) as Presupuesto[];

            const presupuestoIds = presupuestos.map(
                (item) => item.id
            );

            let objetivosMes: any[] = [];

            if (presupuestoIds.length > 0) {
                const {
                    data: objetivosData,
                    error: objetivosError,
                } = await supabase
                    .from("presupuesto_objetivos")
                    .select("presupuesto_id, ponderacion")
                    .in("presupuesto_id", presupuestoIds);

                if (objetivosError) {
                    throw objetivosError;
                }

                objetivosMes = objetivosData || [];
            }

            const resumen = canales.map((canal) => {
                const presupuestoCanal =
                    presupuestos.find(
                        (item) => item.canal_id === canal.id
                    ) || null;

                const objetivosPresupuesto = presupuestoCanal
                    ? objetivosMes.filter(
                        (objetivo) =>
                            objetivo.presupuesto_id ===
                            presupuestoCanal.id
                    )
                    : [];

                const ponderacion =
                    objetivosPresupuesto.reduce(
                        (total, objetivo) =>
                            total +
                            Number(objetivo.ponderacion || 0),
                        0
                    );

                return {
                    ...canal,
                    presupuesto: presupuestoCanal,
                    objetivos: objetivosPresupuesto.length,
                    ponderacion,
                };
            });

            setResumenCanales(resumen);
        } catch (err) {
            console.error(err);

            setError(
                "No se pudieron cargar los presupuestos del período."
            );
        } finally {
            setLoading(false);
        }
    }, [anio, mes, canales]);

    // ============================================================
    // PRESUPUESTOS DISPONIBLES PARA BANDERAS
    // ============================================================

    const cargarPresupuestosParaBanderas =
        useCallback(async () => {
            setLoading(true);
            setError("");

            try {
                const {
                    data: presupuestosData,
                    error: presupuestosError,
                } = await supabase
                    .from("presupuestos")
                    .select(`
            id,
            anio,
            mes,
            nivel,
            canal_id,
            bandera_id,
            punto_venta_id,
            vendedor_id,
            presupuesto_padre_id,
            estado,
            distribucion_estado
          `)
                    .eq("anio", anio)
                    .eq("mes", mes)
                    .eq("nivel", "canal")
                    .eq("estado", "disponibilizado");

                if (presupuestosError) {
                    throw presupuestosError;
                }

                const presupuestos =
                    (presupuestosData || []) as Presupuesto[];

                const resultado: PresupuestoCanalDisponible[] =
                    [];

                for (const p of presupuestos) {
                    if (!p.canal_id) continue;

                    const canal = canales.find(
                        (item) => item.id === p.canal_id
                    );

                    if (!canal) continue;

                    const {
                        data: objetivosData,
                        error: objetivosError,
                    } = await supabase
                        .from("presupuesto_objetivos")
                        .select(`
              id,
              producto_id,
              tipo_objetivo,
              valor_objetivo,
              ponderacion,
              productos (
                nombre
              )
            `)
                        .eq("presupuesto_id", p.id)
                        .order("created_at");

                    if (objetivosError) {
                        throw objetivosError;
                    }

                    const objetivosFormateados: Objetivo[] =
                        (objetivosData || []).map((o: any) => ({
                            id: o.id,
                            producto_id: o.producto_id,
                            producto_nombre:
                                o.productos?.nombre || "",
                            tipo_objetivo: o.tipo_objetivo,
                            valor_objetivo: String(
                                o.valor_objetivo ?? ""
                            ),
                            ponderacion:
                                o.ponderacion === null
                                    ? ""
                                    : String(o.ponderacion),
                        }));

                    resultado.push({
                        presupuesto: p,
                        canal,
                        objetivos: objetivosFormateados,
                    });
                }

                setPresupuestosCanalDisponibles(resultado);
            } catch (err) {
                console.error(err);

                setError(
                    "No se pudieron cargar los presupuestos disponibles para banderas."
                );
            } finally {
                setLoading(false);
            }
        }, [anio, mes, canales]);


    // ============================================================
    // PRESUPUESTOS DISPONIBLES PARA SUCURSALES
    // Cada presupuesto de nivel bandera define su propia ponderación
    // y luego se distribuye entre los puntos de venta de esa bandera.
    // ============================================================

    const cargarPresupuestosParaSucursales =
        useCallback(async () => {
            setLoading(true);
            setError("");

            try {
                const { data: presupuestosData, error: presupuestosError } =
                    await supabase
                        .from("presupuestos")
                        .select(`
                            id,
                            anio,
                            mes,
                            nivel,
                            canal_id,
                            bandera_id,
                            punto_venta_id,
                            vendedor_id,
                            presupuesto_padre_id,
                            estado,
                            distribucion_estado
                        `)
                        .eq("anio", anio)
                        .eq("mes", mes)
                        .eq("nivel", "bandera");

                if (presupuestosError) throw presupuestosError;

                const presupuestos =
                    (presupuestosData || []) as Presupuesto[];

                const resultado: PresupuestoBanderaDisponible[] = [];

                for (const p of presupuestos) {
                    if (!p.bandera_id) continue;

                    const { data: banderaData, error: banderaError } =
                        await supabase
                            .from("banderas")
                            .select("id, tipo")
                            .eq("id", p.bandera_id)
                            .single();

                    if (banderaError) throw banderaError;

                    const canal =
                        canales.find((item) => item.id === p.canal_id) || null;

                    const { data: objetivosData, error: objetivosError } =
                        await supabase
                            .from("presupuesto_objetivos")
                            .select(`
                                id,
                                producto_id,
                                tipo_objetivo,
                                valor_objetivo,
                                ponderacion,
                                productos (nombre)
                            `)
                            .eq("presupuesto_id", p.id)
                            .order("created_at");

                    if (objetivosError) throw objetivosError;

                    const objetivosFormateados: Objetivo[] =
                        (objetivosData || []).map((o: any) => ({
                            id: o.id,
                            producto_id: o.producto_id,
                            producto_nombre: o.productos?.nombre || "",
                            tipo_objetivo: o.tipo_objetivo,
                            valor_objetivo: String(o.valor_objetivo ?? ""),
                            ponderacion:
                                o.ponderacion === null
                                    ? ""
                                    : String(o.ponderacion),
                        }));

                    let objetivosPadre: Objetivo[] = [];

                    if (p.presupuesto_padre_id) {
                        const { data: padreData, error: padreError } =
                            await supabase
                                .from("presupuesto_objetivos")
                                .select(`
                                    id,
                                    producto_id,
                                    tipo_objetivo,
                                    valor_objetivo,
                                    ponderacion,
                                    productos (nombre)
                                `)
                                .eq(
                                    "presupuesto_id",
                                    p.presupuesto_padre_id
                                );

                        if (padreError) throw padreError;

                        objetivosPadre = (padreData || []).map((o: any) => ({
                            id: o.id,
                            producto_id: o.producto_id,
                            producto_nombre: o.productos?.nombre || "",
                            tipo_objetivo: o.tipo_objetivo,
                            valor_objetivo: String(o.valor_objetivo ?? ""),
                            ponderacion:
                                o.ponderacion === null
                                    ? ""
                                    : String(o.ponderacion),
                        }));
                    }

                    resultado.push({
                        presupuesto: p,
                        canal,
                        bandera: banderaData as Bandera,
                        objetivos: objetivosFormateados,
                        objetivosPadre,
                    });
                }

                resultado.sort((a, b) =>
                    a.bandera.tipo.localeCompare(b.bandera.tipo)
                );

                setPresupuestosBanderaDisponibles(resultado);
            } catch (err: any) {
                console.error(err);
                setError(
                    err?.message ||
                    "No se pudieron cargar los presupuestos de las banderas."
                );
            } finally {
                setLoading(false);
            }
        }, [anio, mes, canales]);

    // ============================================================
    // PRESUPUESTOS DISPONIBLES PARA VENDEDORES
    // ============================================================

    const cargarPresupuestosParaVendedores = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data: presupuestosData, error: presupuestosError } = await supabase
                .from("presupuestos")
                .select(`id, anio, mes, nivel, canal_id, bandera_id, punto_venta_id, vendedor_id, presupuesto_padre_id, estado, distribucion_estado`)
                .eq("anio", anio)
                .eq("mes", mes)
                .eq("nivel", "punto_venta");
            if (presupuestosError) throw presupuestosError;

            const resultado: PresupuestoSucursalDisponible[] = [];
            for (const p of (presupuestosData || []) as Presupuesto[]) {
                if (!p.punto_venta_id) continue;

                const [{ data: pv, error: pvError }, { data: objetivosData, error: objError }] = await Promise.all([
                    supabase.from("puntos_venta").select("id, nombre, canal_id, bandera_id").eq("id", p.punto_venta_id).single(),
                    supabase.from("presupuesto_objetivos").select(`id, producto_id, tipo_objetivo, valor_objetivo, ponderacion, productos(nombre)`).eq("presupuesto_id", p.id).order("created_at"),
                ]);
                if (pvError) throw pvError;
                if (objError) throw objError;

                let bandera: Bandera | null = null;
                if (p.bandera_id) {
                    const { data, error } = await supabase.from("banderas").select("id, tipo").eq("id", p.bandera_id).single();
                    if (error) throw error;
                    bandera = data as Bandera;
                }

                let objetivosPadre: Objetivo[] = [];
                if (p.presupuesto_padre_id) {
                    const { data, error } = await supabase.from("presupuesto_objetivos")
                        .select(`id, producto_id, tipo_objetivo, valor_objetivo, ponderacion, productos(nombre)`)
                        .eq("presupuesto_id", p.presupuesto_padre_id).order("created_at");
                    if (error) throw error;
                    objetivosPadre = (data || []).map((o: any) => ({
                        id: o.id, producto_id: o.producto_id, producto_nombre: o.productos?.nombre || "",
                        tipo_objetivo: o.tipo_objetivo, valor_objetivo: String(o.valor_objetivo ?? ""),
                        ponderacion: o.ponderacion == null ? "" : String(o.ponderacion),
                    }));
                }

                const objetivosFormateados: Objetivo[] = (objetivosData || []).map((o: any) => ({
                    id: o.id, producto_id: o.producto_id, producto_nombre: o.productos?.nombre || "",
                    tipo_objetivo: o.tipo_objetivo, valor_objetivo: String(o.valor_objetivo ?? ""),
                    ponderacion: o.ponderacion == null ? "" : String(o.ponderacion),
                }));

                resultado.push({
                    presupuesto: p,
                    canal: canales.find(c => c.id === p.canal_id) || null,
                    bandera,
                    puntoVenta: pv as PuntoVenta,
                    objetivos: objetivosFormateados,
                    objetivosPadre,
                });
            }
            resultado.sort((a, b) => `${a.bandera?.tipo || ""}-${a.puntoVenta.nombre}`.localeCompare(`${b.bandera?.tipo || ""}-${b.puntoVenta.nombre}`));
            setPresupuestosSucursalDisponibles(resultado);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "No se pudieron cargar los presupuestos de las sucursales.");
        } finally { setLoading(false); }
    }, [anio, mes, canales]);

    // ============================================================
    // EFFECTS
    // ============================================================

    useEffect(() => {
        cargarMaestros();
    }, [cargarMaestros]);

    useEffect(() => {
        if (nivel === "canal") {
            cargarResumenCanales();
        }

        if (nivel === "bandera") {
            cargarPresupuestosParaBanderas();
        }

        if (nivel === "punto_venta") {
            cargarPresupuestosParaSucursales();
        }
        if (nivel === "vendedor") {
            cargarPresupuestosParaVendedores();
        }
    }, [
        nivel,
        cargarResumenCanales,
        cargarPresupuestosParaBanderas,
        cargarPresupuestosParaSucursales,
        cargarPresupuestosParaVendedores,
    ]);

    // ============================================================
    // ABRIR CANAL
    // ============================================================

    async function abrirCanal(canal: Canal) {
        setCanalSeleccionado(canal);

        setMensaje("");
        setError("");

        try {
            const {
                data: presupuestoData,
                error: presupuestoError,
            } = await supabase
                .from("presupuestos")
                .select("*")
                .eq("anio", anio)
                .eq("mes", mes)
                .eq("nivel", "canal")
                .eq("canal_id", canal.id)
                .maybeSingle();

            if (presupuestoError) {
                throw presupuestoError;
            }

            if (!presupuestoData) {
                setPresupuesto(null);
                setObjetivos([objetivoVacio()]);
                return;
            }

            const presupuestoActual =
                presupuestoData as Presupuesto;

            setPresupuesto(presupuestoActual);

            const {
                data: objetivosData,
                error: objetivosError,
            } = await supabase
                .from("presupuesto_objetivos")
                .select(`
          id,
          producto_id,
          tipo_objetivo,
          valor_objetivo,
          ponderacion,
          productos (
            nombre
          )
        `)
                .eq(
                    "presupuesto_id",
                    presupuestoActual.id
                )
                .order("created_at");

            if (objetivosError) {
                throw objetivosError;
            }

            const objetivosFormateados: Objetivo[] =
                (objetivosData || []).map((o: any) => ({
                    id: o.id,
                    producto_id: o.producto_id,
                    producto_nombre:
                        o.productos?.nombre || "",
                    tipo_objetivo: o.tipo_objetivo,
                    valor_objetivo: String(
                        o.valor_objetivo ?? ""
                    ),
                    ponderacion:
                        o.ponderacion === null
                            ? ""
                            : String(o.ponderacion),
                }));

            setObjetivos(objetivosFormateados);
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "No se pudo abrir el presupuesto."
            );
        }
    }

    // ============================================================
    // CÁLCULO PONDERACIÓN
    // ============================================================

    const ponderacionTotal = useMemo(() => {
        return objetivos.reduce(
            (total, objetivo) =>
                total +
                Number(objetivo.ponderacion || 0),
            0
        );
    }, [objetivos]);

    const ponderacionValida =
        objetivos.length > 0 &&
        objetivos.every(
            (objetivo) =>
                objetivo.producto_id &&
                Number(objetivo.valor_objetivo) > 0 &&
                Number(objetivo.ponderacion) > 0
        ) &&
        Math.abs(ponderacionTotal - 100) < 0.001;

    // ============================================================
    // EDICIÓN OBJETIVOS
    // ============================================================

    function actualizarObjetivo(
        index: number,
        campo: keyof Objetivo,
        valor: string
    ) {
        setObjetivos((prev) =>
            prev.map((objetivo, i) =>
                i === index
                    ? {
                        ...objetivo,
                        [campo]: valor,
                    }
                    : objetivo
            )
        );
    }

    function agregarObjetivo() {
        setObjetivos((prev) => [
            ...prev,
            objetivoVacio(),
        ]);
    }

    function eliminarObjetivo(index: number) {
        setObjetivos((prev) =>
            prev.filter((_, i) => i !== index)
        );
    }

    // ============================================================
    // GUARDAR BORRADOR CANAL
    // ============================================================

    async function guardarBorrador() {
        if (!canalSeleccionado) return;

        setGuardando(true);
        setMensaje("");
        setError("");

        try {
            if (
                objetivos.some(
                    (objetivo) =>
                        !objetivo.producto_id ||
                        Number(objetivo.valor_objetivo) <= 0
                )
            ) {
                throw new Error(
                    "Todos los objetivos deben tener producto y un valor mayor a cero."
                );
            }

            const productosSeleccionados =
                objetivos.map(
                    (objetivo) =>
                        objetivo.producto_id
                );

            if (
                new Set(productosSeleccionados).size !==
                productosSeleccionados.length
            ) {
                throw new Error(
                    "Un mismo producto no puede repetirse."
                );
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error(
                    "No existe una sesión activa."
                );
            }

            let presupuestoId = presupuesto?.id;

            if (!presupuestoId) {
                const {
                    data,
                    error: insertError,
                } = await supabase
                    .from("presupuestos")
                    .insert({
                        anio,
                        mes,
                        nivel: "canal",
                        canal_id: canalSeleccionado.id,
                        estado: "borrador",
                        distribucion_estado: "pendiente",
                        created_by: user.id,
                        updated_by: user.id,
                    })
                    .select()
                    .single();

                if (insertError) {
                    throw insertError;
                }

                presupuestoId = data.id;
            } else {
                const { error: deleteError } =
                    await supabase
                        .from("presupuesto_objetivos")
                        .delete()
                        .eq(
                            "presupuesto_id",
                            presupuestoId
                        );

                if (deleteError) {
                    throw deleteError;
                }
            }

            const { error: objetivosError } =
                await supabase
                    .from("presupuesto_objetivos")
                    .insert(
                        objetivos.map((objetivo) => ({
                            presupuesto_id: presupuestoId,
                            producto_id:
                                objetivo.producto_id,
                            tipo_objetivo:
                                objetivo.tipo_objetivo,
                            valor_objetivo: Number(
                                objetivo.valor_objetivo
                            ),
                            ponderacion:
                                objetivo.ponderacion
                                    ? Number(
                                        objetivo.ponderacion
                                    )
                                    : null,
                            created_by: user.id,
                            updated_by: user.id,
                        }))
                    );

            if (objetivosError) {
                throw objetivosError;
            }

            setMensaje(
                "Borrador guardado correctamente."
            );

            await cargarResumenCanales();
            await abrirCanal(canalSeleccionado);
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "No se pudo guardar el borrador."
            );
        } finally {
            setGuardando(false);
        }
    }

    // ============================================================
    // GUARDAR OBJETIVO MENSUAL
    // ============================================================

    async function cerrarPresupuesto() {
        if (!presupuesto) return;

        setGuardando(true);
        setMensaje("");
        setError("");

        try {
            if (!ponderacionValida) {
                throw new Error(
                    "La ponderación debe sumar exactamente 100%."
                );
            }

            const { error } = await supabase.rpc(
                "cerrar_presupuesto",
                {
                    p_presupuesto_id: presupuesto.id,
                }
            );

            if (error) {
                throw error;
            }

            setMensaje(
                "Objetivo mensual guardado correctamente."
            );

            await cargarResumenCanales();

            if (canalSeleccionado) {
                await abrirCanal(
                    canalSeleccionado
                );
            }
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "No se pudo guardar el objetivo mensual."
            );
        } finally {
            setGuardando(false);
        }
    }

    // ============================================================
    // DISPONIBILIZAR CANAL
    // ============================================================

    async function disponibilizar() {
        if (!presupuesto) return;

        const confirmar = window.confirm(
            "¿Disponibilizar este objetivo mensual? Luego estará disponible para distribuir entre las banderas."
        );

        if (!confirmar) return;

        setGuardando(true);
        setMensaje("");
        setError("");

        try {
            const { error } = await supabase.rpc(
                "disponibilizar_presupuesto",
                {
                    p_presupuesto_id: presupuesto.id,
                }
            );

            if (error) {
                throw error;
            }

            setMensaje(
                "Objetivo disponibilizado correctamente."
            );

            await cargarResumenCanales();

            if (canalSeleccionado) {
                await abrirCanal(
                    canalSeleccionado
                );
            }
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "No se pudo disponibilizar el presupuesto."
            );
        } finally {
            setGuardando(false);
        }
    }

    // ============================================================
    // ABRIR PRESUPUESTO EN BANDERAS
    // ============================================================

    async function abrirDistribucionBanderas(
        item: PresupuestoCanalDisponible
    ) {
        setPresupuestoCanalSeleccionado(item);

        setMensaje("");
        setError("");
        setBanderas([]);
        setDistribuciones([]);

        try {
            /*
             * Por ahora obtenemos las banderas relacionadas al canal
             * mediante puntos de venta.
             *
             * Usamos un Map para evitar duplicados cuando una bandera
             * tiene varias sucursales.
             */

            const {
                data: puntosVenta,
                error: puntosVentaError,
            } = await supabase
                .from("puntos_venta")
                .select(`
          bandera_id,
          banderas (
            id,
            tipo,
            activo
          )
        `)
                .eq(
                    "canal_id",
                    item.presupuesto.canal_id
                )
                .eq("activo", true);

            if (puntosVentaError) {
                throw puntosVentaError;
            }

            const mapaBanderas =
                new Map<string, Bandera>();

            (puntosVenta || []).forEach(
                (pv: any) => {
                    const bandera = pv.banderas;

                    if (
                        bandera?.id &&
                        bandera?.activo !== false
                    ) {
                        mapaBanderas.set(
                            bandera.id,
                            {
                                id: bandera.id,
                                tipo: bandera.tipo,
                            }
                        );
                    }
                }
            );

            const banderasDisponibles =
                Array.from(
                    mapaBanderas.values()
                ).sort((a, b) =>
                    a.tipo.localeCompare(b.tipo)
                );

            setBanderas(banderasDisponibles);

            const objetivoIds =
                item.objetivos
                    .map((objetivo) => objetivo.id)
                    .filter(Boolean) as string[];

            if (
                objetivoIds.length === 0 ||
                banderasDisponibles.length === 0
            ) {
                setDistribuciones([]);
                return;
            }

            const {
                data: distribucionesData,
                error: distribucionesError,
            } = await supabase
                .from("presupuesto_distribuciones")
                .select(`
          id,
          objetivo_origen_id,
          bandera_id,
          valor_asignado,
          ponderacion
        `)
                .in(
                    "objetivo_origen_id",
                    objetivoIds
                )
                .eq(
                    "nivel_destino",
                    "bandera"
                );

            if (distribucionesError) {
                throw distribucionesError;
            }

            const existentes =
                distribucionesData || [];

            const matriz: Distribucion[] =
                [];

            item.objetivos.forEach(
                (objetivo) => {
                    if (!objetivo.id) return;

                    banderasDisponibles.forEach(
                        (bandera) => {
                            const existente =
                                existentes.find(
                                    (distribucion: any) =>
                                        distribucion.objetivo_origen_id ===
                                        objetivo.id &&
                                        distribucion.bandera_id ===
                                        bandera.id
                                );

                            matriz.push({
                                id: existente?.id,
                                objetivo_origen_id:
                                    objetivo.id!,
                                bandera_id: bandera.id,
                                valor_asignado: existente
                                    ? String(existente.valor_asignado)
                                    : "",
                                ponderacion: existente?.ponderacion === null || existente?.ponderacion === undefined
                                    ? ""
                                    : String(existente.ponderacion),
                            });
                        }
                    );
                }
            );

            setDistribuciones(matriz);
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "No se pudo cargar la distribución entre banderas."
            );
        }
    }

    // ============================================================
    // DISTRIBUCIÓN
    // ============================================================

    function actualizarDistribucion(
        objetivoId: string,
        banderaId: string,
        campo: "valor_asignado" | "ponderacion",
        valor: string
    ) {
        setDistribuciones((prev) =>
            prev.map((distribucion) =>
                distribucion.objetivo_origen_id === objetivoId &&
                    distribucion.bandera_id === banderaId
                    ? { ...distribucion, [campo]: valor }
                    : distribucion
            )
        );
    }

    function ponderacionTotalBandera(banderaId: string) {
        return distribuciones
            .filter((d) => d.bandera_id === banderaId)
            .reduce((total, d) => total + Number(d.ponderacion || 0), 0);
    }

    const ponderacionesBanderasCompletas =
        banderas.length > 0 &&
        banderas.every(
            (bandera) =>
                Math.abs(ponderacionTotalBandera(bandera.id) - 100) < 0.001
        );

    function totalDistribuido(
        objetivoId: string
    ) {
        return distribuciones
            .filter(
                (distribucion) =>
                    distribucion.objetivo_origen_id ===
                    objetivoId
            )
            .reduce(
                (total, distribucion) =>
                    total +
                    Number(
                        distribucion.valor_asignado || 0
                    ),
                0
            );
    }

    function porcentajeDistribuido(
        objetivo: Objetivo
    ) {
        if (!objetivo.id) return 0;

        const totalObjetivo = Number(
            objetivo.valor_objetivo
        );

        if (totalObjetivo === 0) {
            return Math.abs(totalDistribuido(objetivo.id)) < 0.001 ? 100 : 0;
        }

        return (
            (totalDistribuido(objetivo.id) /
                totalObjetivo) *
            100
        );
    }

    const distribucionCompleta =
        presupuestoCanalSeleccionado !== null &&
        presupuestoCanalSeleccionado.objetivos.length >
        0 &&
        banderas.length > 0 &&
        presupuestoCanalSeleccionado.objetivos.every(
            (objetivo) =>
                Math.abs(
                    porcentajeDistribuido(objetivo) -
                    100
                ) < 0.001
        );

    // ============================================================
    // GUARDAR DISTRIBUCIÓN
    // ============================================================

    async function persistirDistribucion() {
        if (!presupuestoCanalSeleccionado) {
            throw new Error(
                "No hay presupuesto seleccionado."
            );
        }

        const presupuestoOrigen =
            presupuestoCanalSeleccionado.presupuesto;

        const objetivosOrigen =
            presupuestoCanalSeleccionado.objetivos;

        for (const objetivo of objetivosOrigen) {
            if (!objetivo.id) continue;

            const distribuido =
                totalDistribuido(objetivo.id);

            const disponible = Number(
                objetivo.valor_objetivo
            );

            if (
                distribuido >
                disponible + 0.001
            ) {
                throw new Error(
                    `${objetivo.producto_nombre}: estás distribuyendo ${distribuido} sobre un objetivo de ${disponible}.`
                );
            }
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error(
                "No existe una sesión activa."
            );
        }

        const objetivoIds =
            objetivosOrigen
                .map((objetivo) => objetivo.id)
                .filter(Boolean) as string[];

        if (objetivoIds.length > 0) {
            const { error: deleteError } =
                await supabase
                    .from(
                        "presupuesto_distribuciones"
                    )
                    .delete()
                    .in(
                        "objetivo_origen_id",
                        objetivoIds
                    )
                    .eq(
                        "nivel_destino",
                        "bandera"
                    );

            if (deleteError) {
                throw deleteError;
            }
        }

        const filas = distribuciones.map(
            (distribucion) => ({
                objetivo_origen_id:
                    distribucion.objetivo_origen_id,

                nivel_destino: "bandera",

                bandera_id:
                    distribucion.bandera_id,

                valor_asignado: Number(
                    distribucion.valor_asignado || 0
                ),

                ponderacion: Number(
                    distribucion.ponderacion || 0
                ),

                created_by: user.id,
                updated_by: user.id,
            })
        );

        if (filas.length > 0) {
            const { error: insertError } =
                await supabase
                    .from(
                        "presupuesto_distribuciones"
                    )
                    .insert(filas);

            if (insertError) {
                throw insertError;
            }
        }
    }

    async function guardarDistribucion() {
        setGuardando(true);
        setMensaje("");
        setError("");

        try {
            await persistirDistribucion();

            setMensaje(
                "Distribución guardada correctamente."
            );
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "No se pudo guardar la distribución."
            );
        } finally {
            setGuardando(false);
        }
    }

    // ============================================================
    // FINALIZAR DISTRIBUCIÓN
    // ============================================================

    async function finalizarDistribucion() {
        if (!presupuestoCanalSeleccionado) {
            return;
        }

        if (!distribucionCompleta) {
            setError(
                "Cada producto debe estar distribuido exactamente al 100%."
            );
            return;
        }

        if (!ponderacionesBanderasCompletas) {
            setError(
                "La ponderación de cada bandera debe sumar exactamente 100%."
            );
            return;
        }

        const confirmar = window.confirm(
            "¿Finalizar la distribución? Se generarán los presupuestos correspondientes a cada bandera."
        );

        if (!confirmar) return;

        setGuardando(true);
        setMensaje("");
        setError("");

        try {
            await persistirDistribucion();

            const { error } = await supabase.rpc(
                "finalizar_distribucion_presupuesto",
                {
                    p_presupuesto_id:
                        presupuestoCanalSeleccionado
                            .presupuesto.id,
                }
            );

            if (error) {
                throw error;
            }

            setMensaje(
                "Distribución finalizada correctamente."
            );

            setPresupuestoCanalSeleccionado(
                null
            );

            setBanderas([]);
            setDistribuciones([]);

            await cargarPresupuestosParaBanderas();
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                "No se pudo finalizar la distribución."
            );
        } finally {
            setGuardando(false);
        }
    }


    // ============================================================
    // SUCURSALES - GESTIÓN DEL PRESUPUESTO DE UNA BANDERA
    // ============================================================

    async function abrirPresupuestoBandera(
        item: PresupuestoBanderaDisponible
    ) {
        setPresupuestoBanderaSeleccionado(item);
        setMensaje("");
        setError("");
        setPuntosVenta([]);
        setDistribucionesSucursales([]);

        try {
            const { data: pvData, error: pvError } = await supabase
                .from("puntos_venta")
                .select("id, nombre, canal_id, bandera_id")
                .eq("bandera_id", item.bandera.id)
                .eq("activo", true)
                .order("nombre");

            if (pvError) throw pvError;

            const sucursales = (pvData || []) as PuntoVenta[];
            setPuntosVenta(sucursales);

            const objetivoIds = item.objetivos
                .map((objetivo) => objetivo.id)
                .filter(Boolean) as string[];

            if (objetivoIds.length === 0 || sucursales.length === 0) {
                setDistribucionesSucursales([]);
                return;
            }

            const { data: distribucionesData, error: distribucionesError } =
                await supabase
                    .from("presupuesto_distribuciones")
                    .select(`
                        id,
                        objetivo_origen_id,
                        punto_venta_id,
                        valor_asignado,
                        ponderacion
                    `)
                    .in("objetivo_origen_id", objetivoIds)
                    .eq("nivel_destino", "punto_venta");

            if (distribucionesError) throw distribucionesError;

            const existentes = distribucionesData || [];
            const matriz: Distribucion[] = [];

            item.objetivos.forEach((objetivo) => {
                if (!objetivo.id) return;

                sucursales.forEach((pv) => {
                    const existente = existentes.find(
                        (d: any) =>
                            d.objetivo_origen_id === objetivo.id &&
                            d.punto_venta_id === pv.id
                    );

                    matriz.push({
                        id: existente?.id,
                        objetivo_origen_id: objetivo.id!,
                        punto_venta_id: pv.id,
                        valor_asignado: existente
                            ? String(existente.valor_asignado)
                            : Number(objetivo.valor_objetivo) === 0
                                ? "0"
                                : "",
                        ponderacion: existente
                            ? String(existente.ponderacion ?? 0)
                            : Number(objetivo.valor_objetivo) === 0
                                ? "0"
                                : "",
                    });
                });
            });

            setDistribucionesSucursales(matriz);
        } catch (err: any) {
            console.error(err);
            setError(
                err?.message ||
                "No se pudo abrir el presupuesto de la bandera."
            );
        }
    }

    function actualizarDistribucionSucursal(
        objetivoId: string,
        puntoVentaId: string,
        campo: "valor_asignado" | "ponderacion",
        valor: string
    ) {
        setDistribucionesSucursales((prev) =>
            prev.map((d) =>
                d.objetivo_origen_id === objetivoId &&
                    d.punto_venta_id === puntoVentaId
                    ? { ...d, [campo]: valor }
                    : d
            )
        );
    }

    function ponderacionSucursalTotal(puntoVentaId: string) {
        return distribucionesSucursales
            .filter((d) => d.punto_venta_id === puntoVentaId)
            .reduce(
                (total, d) => total + Number(d.ponderacion || 0),
                0
            );
    }

    function ponderacionSucursalValida(puntoVentaId: string) {
        const filas = distribucionesSucursales.filter(
            (d) => d.punto_venta_id === puntoVentaId
        );

        if (filas.length === 0) return false;

        const valoresValidos = filas.every((d) => {
            const valor = Number(d.valor_asignado || 0);
            const ponderacion = Number(d.ponderacion || 0);

            if (ponderacion < 0 || ponderacion > 100) return false;
            if (Math.abs(valor) < 0.001 && Math.abs(ponderacion) >= 0.001) {
                return false;
            }

            return true;
        });

        return (
            valoresValidos &&
            Math.abs(ponderacionSucursalTotal(puntoVentaId) - 100) < 0.001
        );
    }

    function totalDistribuidoSucursales(objetivoId: string) {
        return distribucionesSucursales
            .filter((d) => d.objetivo_origen_id === objetivoId)
            .reduce(
                (total, d) =>
                    total + Number(d.valor_asignado || 0),
                0
            );
    }

    function porcentajeDistribuidoSucursales(objetivo: Objetivo) {
        if (!objetivo.id) return 0;

        const totalObjetivo = Number(objetivo.valor_objetivo);

        // Un objetivo recibido en cero ya está completamente distribuido
        // cuando todas las asignaciones son cero.
        if (Math.abs(totalObjetivo) < 0.001) {
            return Math.abs(totalDistribuidoSucursales(objetivo.id)) <
                0.001
                ? 100
                : 0;
        }

        return (
            (totalDistribuidoSucursales(objetivo.id) / totalObjetivo) *
            100
        );
    }

    const distribucionSucursalesCompleta =
        presupuestoBanderaSeleccionado !== null &&
        presupuestoBanderaSeleccionado.objetivos.length > 0 &&
        puntosVenta.length > 0 &&
        presupuestoBanderaSeleccionado.objetivos.every(
            (objetivo) =>
                Math.abs(
                    porcentajeDistribuidoSucursales(objetivo) - 100
                ) < 0.001
        ) &&
        puntosVenta.every((pv) => ponderacionSucursalValida(pv.id));

    async function persistirDistribucionSucursales() {
        if (!presupuestoBanderaSeleccionado) {
            throw new Error("No hay presupuesto de bandera seleccionado.");
        }

        for (const objetivo of presupuestoBanderaSeleccionado.objetivos) {
            if (!objetivo.id) continue;

            const distribuido = totalDistribuidoSucursales(objetivo.id);
            const disponible = Number(objetivo.valor_objetivo);

            if (distribuido > disponible + 0.001) {
                throw new Error(
                    `${objetivo.producto_nombre}: estás distribuyendo ${distribuido} sobre un objetivo de ${disponible}.`
                );
            }

            if (distribuido < -0.001) {
                throw new Error(
                    `${objetivo.producto_nombre}: la distribución no puede ser negativa.`
                );
            }
        }

        for (const d of distribucionesSucursales) {
            const valor = Number(d.valor_asignado || 0);
            const ponderacion = Number(d.ponderacion || 0);

            if (ponderacion < 0 || ponderacion > 100) {
                throw new Error(
                    "Las ponderaciones deben estar entre 0% y 100%."
                );
            }

            if (Math.abs(valor) < 0.001 && Math.abs(ponderacion) >= 0.001) {
                throw new Error(
                    "Un producto asignado con objetivo 0 debe tener ponderación 0%."
                );
            }
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("No existe una sesión activa.");
        }

        const objetivoIds = presupuestoBanderaSeleccionado.objetivos
            .map((objetivo) => objetivo.id)
            .filter(Boolean) as string[];

        if (objetivoIds.length > 0) {
            const { error: deleteError } = await supabase
                .from("presupuesto_distribuciones")
                .delete()
                .in("objetivo_origen_id", objetivoIds)
                .eq("nivel_destino", "punto_venta");

            if (deleteError) throw deleteError;
        }

        const filas = distribucionesSucursales.map((d) => ({
            objetivo_origen_id: d.objetivo_origen_id,
            nivel_destino: "punto_venta",
            punto_venta_id: d.punto_venta_id,
            valor_asignado: Number(d.valor_asignado || 0),
            ponderacion: Number(d.ponderacion || 0),
            created_by: user.id,
            updated_by: user.id,
        }));

        if (filas.length > 0) {
            const { error: insertError } = await supabase
                .from("presupuesto_distribuciones")
                .insert(filas);

            if (insertError) throw insertError;
        }
    }

    async function guardarDistribucionSucursales() {
        setGuardando(true);
        setMensaje("");
        setError("");

        try {
            await persistirDistribucionSucursales();
            setMensaje(
                "Distribución entre sucursales guardada correctamente."
            );
        } catch (err: any) {
            console.error(err);
            setError(
                err?.message ||
                "No se pudo guardar la distribución entre sucursales."
            );
        } finally {
            setGuardando(false);
        }
    }

    async function finalizarDistribucionSucursales() {
        if (!presupuestoBanderaSeleccionado) return;

        if (!distribucionSucursalesCompleta) {
            setError(
                "Cada producto debe estar distribuido exactamente al 100% entre las sucursales."
            );
            return;
        }

        const confirmar = window.confirm(
            "¿Finalizar la distribución? Se crearán los presupuestos de cada sucursal."
        );

        if (!confirmar) return;

        setGuardando(true);
        setMensaje("");
        setError("");

        try {
            await persistirDistribucionSucursales();

            let estadoActual =
                presupuestoBanderaSeleccionado.presupuesto.estado;

            if (estadoActual === "borrador") {
                const { error: cerrarError } = await supabase.rpc(
                    "cerrar_presupuesto",
                    {
                        p_presupuesto_id:
                            presupuestoBanderaSeleccionado.presupuesto.id,
                    }
                );

                if (cerrarError) throw cerrarError;
                estadoActual = "guardado";
            }

            if (estadoActual === "guardado") {
                const { error: disponibilizarError } = await supabase.rpc(
                    "disponibilizar_presupuesto",
                    {
                        p_presupuesto_id:
                            presupuestoBanderaSeleccionado.presupuesto.id,
                    }
                );

                if (disponibilizarError) throw disponibilizarError;
            }

            const { error: rpcError } = await supabase.rpc(
                "finalizar_distribucion_presupuesto",
                {
                    p_presupuesto_id:
                        presupuestoBanderaSeleccionado.presupuesto.id,
                }
            );

            if (rpcError) throw rpcError;

            setMensaje(
                "Distribución entre sucursales finalizada correctamente."
            );

            setPresupuestoBanderaSeleccionado(null);
            setPuntosVenta([]);
            setDistribucionesSucursales([]);

            await cargarPresupuestosParaSucursales();
        } catch (err: any) {
            console.error(err);
            setError(
                err?.message ||
                "No se pudo finalizar la distribución entre sucursales."
            );
        } finally {
            setGuardando(false);
        }
    }

    function volverListadoSucursales() {
        setPresupuestoBanderaSeleccionado(null);
        setPuntosVenta([]);
        setDistribucionesSucursales([]);
        setMensaje("");
        setError("");
    }

    // ============================================================
    // VENDEDORES - GESTIÓN
    // ============================================================

    async function abrirPresupuestoSucursal(item: PresupuestoSucursalDisponible) {
        setPresupuestoSucursalSeleccionado(item);
        setMensaje(""); setError("");
        try {
            const { data: vendedoresData, error: vendedoresError } = await supabase
                .from("profiles")
                .select("id, full_name, email, punto_venta_id")
                .eq("role", "vendedor").eq("activo", true)
                .eq("punto_venta_id", item.puntoVenta.id)
                .order("full_name");
            if (vendedoresError) throw vendedoresError;
            const lista = (vendedoresData || []) as Vendedor[];
            setVendedores(lista);

            const objetivoIds = item.objetivos.map(o => o.id).filter(Boolean) as string[];
            if (!objetivoIds.length || !lista.length) { setDistribucionesVendedores([]); return; }

            const { data: existentes, error: distError } = await supabase
                .from("presupuesto_distribuciones")
                .select("id, objetivo_origen_id, vendedor_id, valor_asignado, ponderacion")
                .in("objetivo_origen_id", objetivoIds).eq("nivel_destino", "vendedor");
            if (distError) throw distError;

            const matriz: Distribucion[] = [];
            item.objetivos.forEach(obj => {
                if (!obj.id) return;
                lista.forEach(v => {
                    const ex = (existentes || []).find((d: any) => d.objetivo_origen_id === obj.id && d.vendedor_id === v.id);
                    matriz.push({
                        id: ex?.id, objetivo_origen_id: obj.id!, vendedor_id: v.id,
                        valor_asignado: ex ? String(ex.valor_asignado) : Number(obj.valor_objetivo) === 0 ? "0" : "",
                        ponderacion: ex ? String(ex.ponderacion ?? 0) : Number(obj.valor_objetivo) === 0 ? "0" : "",
                    });
                });
            });
            setDistribucionesVendedores(matriz);
        } catch (err: any) { console.error(err); setError(err?.message || "No se pudo abrir la sucursal."); }
    }

    async function disponibilizarSucursalParaVendedores() {
        if (!presupuestoSucursalSeleccionado) return;
        setGuardando(true); setError(""); setMensaje("");
        try {
            let estado = presupuestoSucursalSeleccionado.presupuesto.estado;
            if (estado === "borrador") {
                const { error } = await supabase.rpc("cerrar_presupuesto", { p_presupuesto_id: presupuestoSucursalSeleccionado.presupuesto.id });
                if (error) throw error;
                estado = "guardado";
            }
            if (estado === "guardado") {
                const { error } = await supabase.rpc("disponibilizar_presupuesto", { p_presupuesto_id: presupuestoSucursalSeleccionado.presupuesto.id });
                if (error) throw error;
            }
            setPresupuestoSucursalSeleccionado(prev => prev ? ({ ...prev, presupuesto: { ...prev.presupuesto, estado: "disponibilizado" } }) : prev);
            setMensaje("Objetivo de la sucursal disponibilizado correctamente.");
            await cargarPresupuestosParaVendedores();
        } catch (err: any) { console.error(err); setError(err?.message || "No se pudo disponibilizar el objetivo."); }
        finally { setGuardando(false); }
    }

    function actualizarDistribucionVendedor(objetivoId: string, vendedorId: string, campo: "valor_asignado" | "ponderacion", valor: string) {
        setDistribucionesVendedores(prev => prev.map(d => d.objetivo_origen_id === objetivoId && d.vendedor_id === vendedorId ? { ...d, [campo]: valor } : d));
    }
    function totalDistribuidoVendedores(objetivoId: string) { return distribucionesVendedores.filter(d => d.objetivo_origen_id === objetivoId).reduce((a, d) => a + Number(d.valor_asignado || 0), 0); }
    function porcentajeDistribuidoVendedores(obj: Objetivo) {
        if (!obj.id) return 0; const total = Number(obj.valor_objetivo); const dist = totalDistribuidoVendedores(obj.id);
        if (Math.abs(total) < 0.001) return Math.abs(dist) < 0.001 ? 100 : 0;
        return dist / total * 100;
    }
    function ponderacionVendedorTotal(id: string) { return distribucionesVendedores.filter(d => d.vendedor_id === id).reduce((a, d) => a + Number(d.ponderacion || 0), 0); }
    function ponderacionVendedorValida(id: string) {
        const filas = distribucionesVendedores.filter(d => d.vendedor_id === id); if (!filas.length) return false;
        return filas.every(d => { const v = Number(d.valor_asignado || 0), p = Number(d.ponderacion || 0); return p >= 0 && p <= 100 && !(Math.abs(v) < 0.001 && Math.abs(p) >= 0.001); }) && Math.abs(ponderacionVendedorTotal(id) - 100) < 0.001;
    }
    const distribucionVendedoresCompleta = presupuestoSucursalSeleccionado !== null && presupuestoSucursalSeleccionado.objetivos.length > 0 && vendedores.length > 0 &&
        presupuestoSucursalSeleccionado.objetivos.every(o => Math.abs(porcentajeDistribuidoVendedores(o) - 100) < 0.001) && vendedores.every(v => ponderacionVendedorValida(v.id));

    async function persistirDistribucionVendedores() {
        if (!presupuestoSucursalSeleccionado) {
            throw new Error("No hay sucursal seleccionada.");
        }

        // =====================================================
        // 1. VALIDAR PONDERACIONES INDIVIDUALES
        // =====================================================

        for (const d of distribucionesVendedores) {
            const ponderacion = Number(d.ponderacion || 0);

            if (!Number.isFinite(ponderacion)) {
                throw new Error(
                    "Existe una ponderación con un valor inválido."
                );
            }

            if (ponderacion < 0) {
                throw new Error(
                    "La ponderación no puede ser menor a 0%."
                );
            }

            if (ponderacion > 100) {
                throw new Error(
                    "La ponderación no puede ser mayor a 100%."
                );
            }

            const valorAsignado = Number(d.valor_asignado || 0);

            if (!Number.isFinite(valorAsignado)) {
                throw new Error(
                    "Existe un objetivo con un valor inválido."
                );
            }

            if (valorAsignado < 0) {
                throw new Error(
                    "El objetivo asignado no puede ser negativo."
                );
            }
        }

        // =====================================================
        // 2. VALIDAR QUE NO SE DISTRIBUYA MÁS DEL OBJETIVO
        // =====================================================

        for (const o of presupuestoSucursalSeleccionado.objetivos) {
            if (!o.id) continue;

            const distribuido = totalDistribuidoVendedores(o.id);
            const objetivo = Number(o.valor_objetivo);

            if (distribuido > objetivo + 0.001) {
                throw new Error(
                    `${o.producto_nombre}: estás distribuyendo ${distribuido} sobre ${objetivo}.`
                );
            }
        }

        // =====================================================
        // 3. OBTENER USUARIO
        // =====================================================

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("No existe una sesión activa.");
        }

        // =====================================================
        // 4. OBTENER OBJETIVOS DE LA SUCURSAL
        // =====================================================

        const ids = presupuestoSucursalSeleccionado.objetivos
            .map((o) => o.id)
            .filter(Boolean) as string[];

        // =====================================================
        // 5. BORRAR DISTRIBUCIÓN ANTERIOR
        // =====================================================

        if (ids.length) {
            const { error } = await supabase
                .from("presupuesto_distribuciones")
                .delete()
                .in("objetivo_origen_id", ids)
                .eq("nivel_destino", "vendedor");

            if (error) throw error;
        }

        // =====================================================
        // 6. PREPARAR NUEVA DISTRIBUCIÓN
        // =====================================================

        const filas = distribucionesVendedores.map((d) => ({
            objetivo_origen_id: d.objetivo_origen_id,
            nivel_destino: "vendedor",
            vendedor_id: d.vendedor_id,
            valor_asignado: Number(d.valor_asignado || 0),
            ponderacion: Number(d.ponderacion || 0),
            created_by: user.id,
            updated_by: user.id,
        }));

        // =====================================================
        // 7. INSERTAR
        // =====================================================

        if (filas.length) {
            const { error } = await supabase
                .from("presupuesto_distribuciones")
                .insert(filas);

            if (error) throw error;
        }
    }
    async function guardarDistribucionVendedores() { setGuardando(true); setError(""); setMensaje(""); try { await persistirDistribucionVendedores(); setMensaje("Distribución entre vendedores guardada correctamente."); } catch (err: any) { console.error(err); setError(err?.message || "No se pudo guardar la distribución."); } finally { setGuardando(false); } }
    async function finalizarDistribucionVendedores() {
        if (!presupuestoSucursalSeleccionado || !distribucionVendedoresCompleta) { setError("Cada producto debe distribuirse al 100% y cada vendedor debe tener ponderación total 100%."); return; }
        if (!window.confirm("¿Finalizar la distribución? Se crearán los objetivos finales de cada vendedor.")) return;
        setGuardando(true); setError(""); setMensaje("");
        try { await persistirDistribucionVendedores(); const { error } = await supabase.rpc("finalizar_distribucion_presupuesto", { p_presupuesto_id: presupuestoSucursalSeleccionado.presupuesto.id }); if (error) throw error; setMensaje("Distribución entre vendedores finalizada correctamente."); setPresupuestoSucursalSeleccionado(null); setVendedores([]); setDistribucionesVendedores([]); await cargarPresupuestosParaVendedores(); }
        catch (err: any) { console.error(err); setError(err?.message || "No se pudo finalizar la distribución."); } finally { setGuardando(false); }
    }
    function volverListadoVendedores() { setPresupuestoSucursalSeleccionado(null); setVendedores([]); setDistribucionesVendedores([]); setMensaje(""); setError(""); }

    // ============================================================
    // VOLVER
    // ============================================================

    function volverListadoCanales() {
        setCanalSeleccionado(null);
        setPresupuesto(null);
        setObjetivos([]);
        setMensaje("");
        setError("");
    }

    function volverListadoBanderas() {
        setPresupuestoCanalSeleccionado(
            null
        );

        setBanderas([]);
        setDistribuciones([]);
        setMensaje("");
        setError("");
    }

    function cambiarNivel(
        nuevoNivel: Nivel
    ) {
        setNivel(nuevoNivel);

        setCanalSeleccionado(null);
        setPresupuesto(null);
        setObjetivos([]);

        setPresupuestoCanalSeleccionado(
            null
        );

        setBanderas([]);
        setDistribuciones([]);

        setPresupuestoBanderaSeleccionado(null);
        setPuntosVenta([]);
        setDistribucionesSucursales([]);

        setMensaje("");
        setError("");
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className={styles.page}>
            {/* HEADER */}

            <div className={styles.header}>
                <div>
                    <div
                        className={styles.breadcrumb}
                    >
                        Configuración / Presupuestos
                    </div>

                    <h1>Presupuesto mensual</h1>

                    <p>
                        Definí y distribuí los
                        objetivos comerciales de la
                        organización.
                    </p>
                </div>
            </div>

            {/* MENSAJES */}

            {mensaje && (
                <div
                    className={
                        styles.successMessage
                    }
                >
                    {mensaje}
                </div>
            )}

            {error && (
                <div
                    className={styles.errorMessage}
                >
                    {error}
                </div>
            )}

            {/* TABS */}

            <div className={styles.tabs}>
                {(
                    Object.keys(
                        NIVEL_LABEL
                    ) as Nivel[]
                ).map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={`${styles.tab} ${nivel === item
                            ? styles.tabActive
                            : ""
                            }`}
                        onClick={() =>
                            cambiarNivel(item)
                        }
                    >
                        {NIVEL_LABEL[item]}
                    </button>
                ))}
            </div>

            {/* PERÍODO */}

            {!canalSeleccionado &&
                !presupuestoCanalSeleccionado &&
                !presupuestoBanderaSeleccionado &&
                !presupuestoSucursalSeleccionado && (
                    <section
                        className={styles.card}
                    >
                        <div
                            className={
                                styles.cardHeader
                            }
                        >
                            <div>
                                <h2>Período</h2>

                                <p>
                                    Seleccioná el mes que
                                    querés administrar.
                                </p>
                            </div>
                        </div>

                        <div
                            className={
                                styles.periodGrid
                            }
                        >
                            <div
                                className={styles.field}
                            >
                                <label>Año</label>

                                <select
                                    value={anio}
                                    onChange={(e) =>
                                        setAnio(
                                            Number(
                                                e.target.value
                                            )
                                        )
                                    }
                                >
                                    {Array.from(
                                        { length: 7 },
                                        (_, index) =>
                                            hoy.getFullYear() -
                                            2 +
                                            index
                                    ).map((year) => (
                                        <option
                                            key={year}
                                            value={year}
                                        >
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div
                                className={styles.field}
                            >
                                <label>Mes</label>

                                <select
                                    value={mes}
                                    onChange={(e) =>
                                        setMes(
                                            Number(
                                                e.target.value
                                            )
                                        )
                                    }
                                >
                                    {MESES.map(
                                        (nombre, index) => (
                                            <option
                                                key={nombre}
                                                value={index + 1}
                                            >
                                                {nombre}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>
                    </section>
                )}

            {/* ====================================================== */}
            {/* CANALES - LISTADO */}
            {/* ====================================================== */}

            {nivel === "canal" &&
                !canalSeleccionado && (
                    <section
                        className={styles.card}
                    >
                        <div
                            className={
                                styles.cardHeader
                            }
                        >
                            <div>
                                <h2>
                                    Presupuestos de canales ·{" "}
                                    {MESES[mes - 1]}{" "}
                                    {anio}
                                </h2>

                                <p>
                                    Creá el presupuesto
                                    comercial original de
                                    cada canal.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div
                                className={
                                    styles.loading
                                }
                            >
                                Cargando
                                presupuestos...
                            </div>
                        ) : (
                            <div
                                className={
                                    styles.budgetList
                                }
                            >
                                {resumenCanales.map(
                                    (canal) => (
                                        <div
                                            key={canal.id}
                                            className={
                                                styles.budgetCard
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.budgetMain
                                                }
                                            >
                                                <div>
                                                    <h3>
                                                        {canal.tipo}
                                                    </h3>

                                                    {canal.presupuesto ? (
                                                        <div
                                                            className={
                                                                styles.budgetMeta
                                                            }
                                                        >
                                                            <span>
                                                                {
                                                                    canal.objetivos
                                                                }{" "}
                                                                objetivos
                                                            </span>

                                                            <span>
                                                                Ponderación{" "}
                                                                {canal.ponderacion.toFixed(
                                                                    2
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <p
                                                            className={
                                                                styles.noBudget
                                                            }
                                                        >
                                                            Sin
                                                            presupuesto
                                                            para este
                                                            período
                                                        </p>
                                                    )}
                                                </div>

                                                <div
                                                    className={
                                                        styles.budgetActions
                                                    }
                                                >
                                                    {canal.presupuesto && (
                                                        <span
                                                            className={`${styles.statusBadge} ${canal
                                                                .presupuesto
                                                                .estado ===
                                                                "disponibilizado"
                                                                ? styles.statusAvailable
                                                                : canal
                                                                    .presupuesto
                                                                    .estado ===
                                                                    "guardado"
                                                                    ? styles.statusSaved
                                                                    : styles.statusDraft
                                                                }`}
                                                        >
                                                            {
                                                                canal
                                                                    .presupuesto
                                                                    .estado
                                                            }
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className={
                                                            canal.presupuesto
                                                                ? styles.secondaryButton
                                                                : styles.primaryButton
                                                        }
                                                        onClick={() =>
                                                            abrirCanal(
                                                                canal
                                                            )
                                                        }
                                                    >
                                                        {canal.presupuesto
                                                            ? "Ver presupuesto"
                                                            : "Crear presupuesto"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </section>
                )}

            {/* ====================================================== */}
            {/* CANALES - DETALLE */}
            {/* ====================================================== */}

            {nivel === "canal" &&
                canalSeleccionado && (
                    <>
                        <div
                            className={
                                styles.detailTopBar
                            }
                        >
                            <button
                                type="button"
                                className={
                                    styles.backButton
                                }
                                onClick={
                                    volverListadoCanales
                                }
                            >
                                ← Volver a canales
                            </button>

                            <div>
                                <strong>
                                    {
                                        canalSeleccionado.tipo
                                    }
                                </strong>

                                <span>
                                    {MESES[mes - 1]}{" "}
                                    {anio}
                                </span>
                            </div>
                        </div>

                        <section
                            className={styles.card}
                        >
                            <div
                                className={
                                    styles.cardHeader
                                }
                            >
                                <div>
                                    <h2>
                                        Objetivos comerciales
                                    </h2>

                                    <p>
                                        Definí producto,
                                        tipo de objetivo,
                                        valor y ponderación.
                                    </p>
                                </div>

                                {(!presupuesto ||
                                    presupuesto.estado ===
                                    "borrador") && (
                                        <button
                                            className={
                                                styles.secondaryButton
                                            }
                                            onClick={
                                                agregarObjetivo
                                            }
                                        >
                                            + Agregar objetivo
                                        </button>
                                    )}
                            </div>

                            <div
                                className={
                                    styles.objectivesTable
                                }
                            >
                                <div
                                    className={
                                        styles.tableHeader
                                    }
                                >
                                    <div>Producto</div>
                                    <div>Tipo</div>
                                    <div>Objetivo</div>
                                    <div>
                                        Ponderación
                                    </div>
                                    <div></div>
                                </div>

                                {objetivos.map(
                                    (
                                        objetivo,
                                        index
                                    ) => {
                                        const editable =
                                            !presupuesto ||
                                            presupuesto.estado ===
                                            "borrador";

                                        return (
                                            <div
                                                className={
                                                    styles.tableRow
                                                }
                                                key={
                                                    objetivo.id ||
                                                    index
                                                }
                                            >
                                                <select
                                                    value={
                                                        objetivo.producto_id
                                                    }
                                                    disabled={
                                                        !editable
                                                    }
                                                    onChange={(e) =>
                                                        actualizarObjetivo(
                                                            index,
                                                            "producto_id",
                                                            e.target
                                                                .value
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Seleccionar
                                                        producto
                                                    </option>

                                                    {productos.map(
                                                        (
                                                            producto
                                                        ) => (
                                                            <option
                                                                key={
                                                                    producto.id
                                                                }
                                                                value={
                                                                    producto.id
                                                                }
                                                            >
                                                                {
                                                                    producto.nombre
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>

                                                <select
                                                    value={
                                                        objetivo.tipo_objetivo
                                                    }
                                                    disabled={
                                                        !editable
                                                    }
                                                    onChange={(e) =>
                                                        actualizarObjetivo(
                                                            index,
                                                            "tipo_objetivo",
                                                            e.target
                                                                .value
                                                        )
                                                    }
                                                >
                                                    <option value="cantidad">
                                                        Cantidad
                                                    </option>

                                                    <option value="monto">
                                                        Monto ($)
                                                    </option>
                                                </select>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={
                                                        objetivo.valor_objetivo
                                                    }
                                                    disabled={
                                                        !editable
                                                    }
                                                    onChange={(e) =>
                                                        actualizarObjetivo(
                                                            index,
                                                            "valor_objetivo",
                                                            e.target
                                                                .value
                                                        )
                                                    }
                                                />

                                                <div
                                                    className={
                                                        styles.percentageInput
                                                    }
                                                >
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={
                                                            objetivo.ponderacion
                                                        }
                                                        disabled={
                                                            !editable
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            actualizarObjetivo(
                                                                index,
                                                                "ponderacion",
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                    />

                                                    <span>%</span>
                                                </div>

                                                <div
                                                    className={
                                                        styles.actionCell
                                                    }
                                                >
                                                    {editable &&
                                                        objetivos.length >
                                                        1 && (
                                                            <button
                                                                className={
                                                                    styles.deleteButton
                                                                }
                                                                onClick={() =>
                                                                    eliminarObjetivo(
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                Eliminar
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>

                            <div
                                className={`${styles.weightSummary} ${ponderacionValida
                                    ? styles.weightOk
                                    : styles.weightPending
                                    }`}
                            >
                                <div>
                                    <span>
                                        Ponderación total
                                    </span>

                                    <strong>
                                        {ponderacionTotal.toFixed(
                                            2
                                        )}
                                        %
                                    </strong>
                                </div>

                                <div
                                    className={
                                        styles.progress
                                    }
                                >
                                    <div
                                        className={
                                            styles.progressBar
                                        }
                                        style={{
                                            width: `${Math.min(
                                                ponderacionTotal,
                                                100
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div
                                className={
                                    styles.footerActions
                                }
                            >
                                {(!presupuesto ||
                                    presupuesto.estado ===
                                    "borrador") && (
                                        <button
                                            className={
                                                styles.secondaryButton
                                            }
                                            disabled={
                                                guardando
                                            }
                                            onClick={
                                                guardarBorrador
                                            }
                                        >
                                            Guardar borrador
                                        </button>
                                    )}

                                {presupuesto?.estado ===
                                    "borrador" && (
                                        <button
                                            className={
                                                styles.primaryButton
                                            }
                                            disabled={
                                                guardando ||
                                                !ponderacionValida
                                            }
                                            onClick={
                                                cerrarPresupuesto
                                            }
                                        >
                                            Guardar objetivo
                                            mensual
                                        </button>
                                    )}

                                {presupuesto?.estado ===
                                    "guardado" && (
                                        <button
                                            className={
                                                styles.primaryButton
                                            }
                                            disabled={
                                                guardando
                                            }
                                            onClick={
                                                disponibilizar
                                            }
                                        >
                                            Disponibilizar
                                            objetivo mensual
                                        </button>
                                    )}

                                {presupuesto?.estado ===
                                    "disponibilizado" && (
                                        <div
                                            className={
                                                styles.availableNotice
                                            }
                                        >
                                            ✓ Objetivo
                                            disponibilizado
                                        </div>
                                    )}
                            </div>
                        </section>
                    </>
                )}

            {/* ====================================================== */}
            {/* BANDERAS - LISTADO DE PRESUPUESTOS RECIBIDOS */}
            {/* ====================================================== */}

            {nivel === "bandera" &&
                !presupuestoCanalSeleccionado && (
                    <section
                        className={styles.card}
                    >
                        <div
                            className={
                                styles.cardHeader
                            }
                        >
                            <div>
                                <h2>
                                    Presupuestos recibidos ·{" "}
                                    {MESES[mes - 1]}{" "}
                                    {anio}
                                </h2>

                                <p>
                                    Distribuí los
                                    presupuestos
                                    disponibilizados por
                                    los canales entre sus
                                    banderas.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div
                                className={
                                    styles.loading
                                }
                            >
                                Cargando
                                presupuestos...
                            </div>
                        ) : presupuestosCanalDisponibles.length ===
                            0 ? (
                            <div
                                className={
                                    styles.emptyState
                                }
                            >
                                <h2>
                                    No hay presupuestos
                                    disponibles
                                </h2>

                                <p>
                                    Todavía no existen
                                    presupuestos de canal
                                    disponibilizados para
                                    este período.
                                </p>
                            </div>
                        ) : (
                            <div
                                className={
                                    styles.budgetList
                                }
                            >
                                {presupuestosCanalDisponibles.map(
                                    (item) => (
                                        <div
                                            key={
                                                item
                                                    .presupuesto
                                                    .id
                                            }
                                            className={
                                                styles.budgetCard
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.budgetMain
                                                }
                                            >
                                                <div>
                                                    <h3>
                                                        Canal{" "}
                                                        {
                                                            item
                                                                .canal
                                                                .tipo
                                                        }
                                                    </h3>

                                                    <div
                                                        className={
                                                            styles.budgetMeta
                                                        }
                                                    >
                                                        <span>
                                                            {
                                                                item
                                                                    .objetivos
                                                                    .length
                                                            }{" "}
                                                            productos
                                                        </span>

                                                        <span>
                                                            Distribución:{" "}
                                                            {
                                                                item
                                                                    .presupuesto
                                                                    .distribucion_estado
                                                            }
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    className={
                                                        styles.budgetActions
                                                    }
                                                >
                                                    <span
                                                        className={`${styles.statusBadge} ${styles.statusAvailable}`}
                                                    >
                                                        RECIBIDO
                                                    </span>

                                                    <button
                                                        className={
                                                            styles.primaryButton
                                                        }
                                                        onClick={() =>
                                                            abrirDistribucionBanderas(
                                                                item
                                                            )
                                                        }
                                                    >
                                                        {item
                                                            .presupuesto
                                                            .distribucion_estado ===
                                                            "finalizada"
                                                            ? "Ver distribución"
                                                            : "Distribuir"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </section>
                )}

            {/* ====================================================== */}
            {/* BANDERAS - DISTRIBUCIÓN */}
            {/* ====================================================== */}

            {nivel === "bandera" &&
                presupuestoCanalSeleccionado && (
                    <>
                        <div
                            className={
                                styles.detailTopBar
                            }
                        >
                            <button
                                type="button"
                                className={
                                    styles.backButton
                                }
                                onClick={
                                    volverListadoBanderas
                                }
                            >
                                ← Volver a banderas
                            </button>

                            <div>
                                <strong>
                                    Canal{" "}
                                    {
                                        presupuestoCanalSeleccionado
                                            .canal.tipo
                                    }
                                </strong>

                                <span>
                                    {MESES[mes - 1]}{" "}
                                    {anio}
                                </span>
                            </div>
                        </div>

                        <section
                            className={styles.card}
                        >
                            <div
                                className={
                                    styles.cardHeader
                                }
                            >
                                <div>
                                    <h2>
                                        Distribución entre
                                        banderas
                                    </h2>

                                    <p>
                                        Distribuí el 100% de
                                        cada producto
                                        recibido del canal{" "}
                                        {
                                            presupuestoCanalSeleccionado
                                                .canal.tipo
                                        }
                                        .
                                    </p>
                                </div>
                            </div>

                            {banderas.length === 0 ? (
                                <div
                                    className={
                                        styles.emptyState
                                    }
                                >
                                    <h2>
                                        No hay banderas
                                        disponibles
                                    </h2>

                                    <p>
                                        No encontramos
                                        banderas asociadas
                                        a puntos de venta
                                        activos de este
                                        canal.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className={
                                            styles.distributionWrapper
                                        }
                                    >
                                        <table
                                            className={
                                                styles.distributionTable
                                            }
                                        >
                                            <thead>
                                                <tr>
                                                    <th>
                                                        Producto
                                                    </th>

                                                    <th>
                                                        Objetivo
                                                        recibido
                                                    </th>

                                                    <th>
                                                        Ponderación
                                                        canal
                                                    </th>

                                                    {banderas.map(
                                                        (
                                                            bandera
                                                        ) => (
                                                            <th
                                                                key={
                                                                    bandera.id
                                                                }
                                                            >
                                                                <div>{bandera.tipo}</div>
                                                                <div style={{ fontSize: "11px", marginTop: "4px", fontWeight: 600 }}>
                                                                    Pond. {ponderacionTotalBandera(bandera.id).toFixed(2)}%
                                                                </div>
                                                            </th>
                                                        )
                                                    )}

                                                    <th>
                                                        Distribuido
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {presupuestoCanalSeleccionado.objetivos.map(
                                                    (
                                                        objetivo
                                                    ) => {
                                                        const porcentaje =
                                                            porcentajeDistribuido(
                                                                objetivo
                                                            );

                                                        return (
                                                            <tr
                                                                key={
                                                                    objetivo.id
                                                                }
                                                            >
                                                                <td>
                                                                    <strong>
                                                                        {
                                                                            objetivo.producto_nombre
                                                                        }
                                                                    </strong>
                                                                </td>

                                                                <td>
                                                                    {objetivo.tipo_objetivo ===
                                                                        "monto" &&
                                                                        "$ "}

                                                                    {Number(
                                                                        objetivo.valor_objetivo
                                                                    ).toLocaleString(
                                                                        "es-AR"
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    {Number(
                                                                        objetivo.ponderacion || 0
                                                                    ).toFixed(2)}
                                                                    %
                                                                </td>

                                                                {banderas.map(
                                                                    (
                                                                        bandera
                                                                    ) => {
                                                                        const distribucion =
                                                                            distribuciones.find(
                                                                                (
                                                                                    item
                                                                                ) =>
                                                                                    item.objetivo_origen_id ===
                                                                                    objetivo.id &&
                                                                                    item.bandera_id ===
                                                                                    bandera.id
                                                                            );

                                                                        return (
                                                                            <td
                                                                                key={
                                                                                    bandera.id
                                                                                }
                                                                            >
                                                                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                                                    <div>
                                                                                        <div style={{ fontSize: "11px", marginBottom: "4px" }}>Objetivo</div>
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            disabled={
                                                                                                presupuestoCanalSeleccionado.presupuesto.distribucion_estado === "finalizada"
                                                                                            }
                                                                                            value={distribucion?.valor_asignado || ""}
                                                                                            onChange={(e) =>
                                                                                                actualizarDistribucion(
                                                                                                    objetivo.id!,
                                                                                                    bandera.id,
                                                                                                    "valor_asignado",
                                                                                                    e.target.value
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <div style={{ fontSize: "11px", marginBottom: "4px" }}>Ponderación</div>
                                                                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                                                            <input
                                                                                                type="number"
                                                                                                min="0"
                                                                                                max="100"
                                                                                                step="0.01"
                                                                                                disabled={
                                                                                                    presupuestoCanalSeleccionado.presupuesto.distribucion_estado === "finalizada"
                                                                                                }
                                                                                                value={distribucion?.ponderacion || ""}
                                                                                                onChange={(e) =>
                                                                                                    actualizarDistribucion(
                                                                                                        objetivo.id!,
                                                                                                        bandera.id,
                                                                                                        "ponderacion",
                                                                                                        e.target.value
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                            <span>%</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    }
                                                                )}

                                                                <td>
                                                                    <span
                                                                        className={
                                                                            Math.abs(
                                                                                porcentaje -
                                                                                100
                                                                            ) <
                                                                                0.001
                                                                                ? styles.distributionOk
                                                                                : styles.distributionPending
                                                                        }
                                                                    >
                                                                        {porcentaje.toFixed(
                                                                            2
                                                                        )}
                                                                        %
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {presupuestoCanalSeleccionado
                                        .presupuesto
                                        .distribucion_estado !==
                                        "finalizada" && (
                                            <div
                                                className={
                                                    styles.footerActions
                                                }
                                            >
                                                <button
                                                    className={
                                                        styles.secondaryButton
                                                    }
                                                    disabled={
                                                        guardando
                                                    }
                                                    onClick={
                                                        guardarDistribucion
                                                    }
                                                >
                                                    Guardar
                                                    distribución
                                                </button>

                                                <button
                                                    className={
                                                        styles.primaryButton
                                                    }
                                                    disabled={
                                                        guardando ||
                                                        !distribucionCompleta ||
                                                        !ponderacionesBanderasCompletas
                                                    }
                                                    onClick={
                                                        finalizarDistribucion
                                                    }
                                                >
                                                    Finalizar
                                                    distribución
                                                </button>
                                            </div>
                                        )}

                                    {presupuestoCanalSeleccionado
                                        .presupuesto
                                        .distribucion_estado ===
                                        "finalizada" && (
                                            <div
                                                className={
                                                    styles.finishedDistribution
                                                }
                                            >
                                                ✓ Distribución
                                                finalizada
                                            </div>
                                        )}
                                </>
                            )}
                        </section>
                    </>
                )}

            {/* ====================================================== */}
            {/* SUCURSALES - LISTADO DE BANDERAS */}
            {/* ====================================================== */}

            {nivel === "punto_venta" &&
                !presupuestoBanderaSeleccionado && (
                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2>
                                    Presupuestos por bandera ·{" "}
                                    {MESES[mes - 1]} {anio}
                                </h2>
                                <p>
                                    Cada bandera define su propia ponderación
                                    y distribuye el presupuesto recibido entre
                                    sus sucursales.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.loading}>
                                Cargando presupuestos...
                            </div>
                        ) : presupuestosBanderaDisponibles.length === 0 ? (
                            <div className={styles.emptyState}>
                                <h2>
                                    No hay presupuestos de banderas
                                </h2>
                                <p>
                                    Primero debe finalizarse una distribución
                                    desde Canales hacia Banderas.
                                </p>
                            </div>
                        ) : (
                            <div className={styles.budgetList}>
                                {presupuestosBanderaDisponibles.map(
                                    (item) => {
                                        const total =
                                            item.objetivos.reduce(
                                                (acc, objetivo) =>
                                                    acc +
                                                    Number(
                                                        objetivo.ponderacion ||
                                                        0
                                                    ),
                                                0
                                            );

                                        return (
                                            <div
                                                key={item.presupuesto.id}
                                                className={
                                                    styles.budgetCard
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.budgetMain
                                                    }
                                                >
                                                    <div>
                                                        <h3>
                                                            {
                                                                item.bandera
                                                                    .tipo
                                                            }
                                                        </h3>

                                                        <div
                                                            className={
                                                                styles.budgetMeta
                                                            }
                                                        >
                                                            <span>
                                                                Canal{" "}
                                                                {item.canal
                                                                    ?.tipo ||
                                                                    "-"}
                                                            </span>
                                                            <span>
                                                                {
                                                                    item
                                                                        .objetivos
                                                                        .length
                                                                }{" "}
                                                                objetivos
                                                            </span>
                                                            <span>
                                                                Ponderación
                                                                propia:{" "}
                                                                {total.toFixed(
                                                                    2
                                                                )}
                                                                %
                                                            </span>
                                                            <span>
                                                                Distribución:{" "}
                                                                {
                                                                    item
                                                                        .presupuesto
                                                                        .distribucion_estado
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.budgetActions
                                                        }
                                                    >
                                                        <span
                                                            className={`${styles.statusBadge} ${item
                                                                .presupuesto
                                                                .estado ===
                                                                "disponibilizado"
                                                                ? styles.statusAvailable
                                                                : item
                                                                    .presupuesto
                                                                    .estado ===
                                                                    "guardado"
                                                                    ? styles.statusSaved
                                                                    : styles.statusDraft
                                                                }`}
                                                        >
                                                            {
                                                                item
                                                                    .presupuesto
                                                                    .estado
                                                            }
                                                        </span>

                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.primaryButton
                                                            }
                                                            onClick={() =>
                                                                abrirPresupuestoBandera(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            Gestionar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </section>
                )}

            {/* ====================================================== */}
            {/* SUCURSALES - DETALLE DE UNA BANDERA */}
            {/* ====================================================== */}

            {nivel === "punto_venta" &&
                presupuestoBanderaSeleccionado && (
                    <>
                        <div className={styles.detailTopBar}>
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={volverListadoSucursales}
                            >
                                ← Volver a sucursales
                            </button>

                            <div>
                                <strong>
                                    Canal {presupuestoBanderaSeleccionado.canal?.tipo || "-"} → {presupuestoBanderaSeleccionado.bandera.tipo}
                                </strong>
                                <span>
                                    {MESES[mes - 1]} {anio}
                                </span>
                            </div>
                        </div>

                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h2>Presupuesto recibido</h2>
                                    <p>
                                        Esta es la asignación que recibió {presupuestoBanderaSeleccionado.bandera.tipo}. La cantidad y la ponderación son solo de referencia y no se modifican desde Sucursales.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.distributionWrapper}>
                                <table className={styles.distributionTable}>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Objetivo recibido</th>
                                            <th>Pond. canal</th>
                                            <th>Pond. recibida</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {presupuestoBanderaSeleccionado.objetivos.map((objetivo) => {
                                            const padre = presupuestoBanderaSeleccionado.objetivosPadre.find(
                                                (item) => item.producto_id === objetivo.producto_id
                                            );

                                            return (
                                                <tr key={objetivo.id}>
                                                    <td><strong>{objetivo.producto_nombre}</strong></td>
                                                    <td>
                                                        {objetivo.tipo_objetivo === "monto" && "$ "}
                                                        {Number(objetivo.valor_objetivo).toLocaleString("es-AR")}
                                                    </td>
                                                    <td>{Number(padre?.ponderacion || 0).toFixed(2)}%</td>
                                                    <td><strong>{Number(objetivo.ponderacion || 0).toFixed(2)}%</strong></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h2>Distribución entre sucursales</h2>
                                    <p>
                                        Distribuí el 100% de cada objetivo recibido y definí una ponderación propia para cada sucursal. Cada sucursal debe sumar 100% de ponderación.
                                    </p>
                                </div>
                            </div>

                            {puntosVenta.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <h3>No hay sucursales disponibles</h3>
                                    <p>
                                        No encontramos puntos de venta activos asociados a {presupuestoBanderaSeleccionado.bandera.tipo}.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.distributionWrapper}>
                                        <table className={styles.distributionTable}>
                                            <thead>
                                                <tr>
                                                    <th>Producto</th>
                                                    <th>Objetivo recibido</th>
                                                    <th>Pond. bandera</th>
                                                    {puntosVenta.map((pv) => (
                                                        <th key={pv.id}>
                                                            <div>{pv.nombre}</div>
                                                            <small>
                                                                Pond. {ponderacionSucursalTotal(pv.id).toFixed(2)}%
                                                            </small>
                                                        </th>
                                                    ))}
                                                    <th>Distribuido</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {presupuestoBanderaSeleccionado.objetivos.map((objetivo) => {
                                                    const porcentaje = porcentajeDistribuidoSucursales(objetivo);

                                                    return (
                                                        <tr key={objetivo.id}>
                                                            <td><strong>{objetivo.producto_nombre}</strong></td>
                                                            <td>
                                                                {objetivo.tipo_objetivo === "monto" && "$ "}
                                                                {Number(objetivo.valor_objetivo).toLocaleString("es-AR")}
                                                            </td>
                                                            <td>{Number(objetivo.ponderacion || 0).toFixed(2)}%</td>

                                                            {puntosVenta.map((pv) => {
                                                                const distribucion = distribucionesSucursales.find(
                                                                    (d) =>
                                                                        d.objetivo_origen_id === objetivo.id &&
                                                                        d.punto_venta_id === pv.id
                                                                );
                                                                const objetivoCero = Math.abs(Number(objetivo.valor_objetivo)) < 0.001;
                                                                const finalizada = presupuestoBanderaSeleccionado.presupuesto.distribucion_estado === "finalizada";

                                                                return (
                                                                    <td key={pv.id}>
                                                                        <div style={{ display: "grid", gap: 8, minWidth: 130 }}>
                                                                            <label style={{ display: "grid", gap: 4 }}>
                                                                                <small>Objetivo</small>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    disabled={objetivoCero || finalizada}
                                                                                    value={distribucion?.valor_asignado ?? ""}
                                                                                    onChange={(e) =>
                                                                                        actualizarDistribucionSucursal(
                                                                                            objetivo.id!,
                                                                                            pv.id,
                                                                                            "valor_asignado",
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </label>
                                                                            <label style={{ display: "grid", gap: 4 }}>
                                                                                <small>Ponderación</small>
                                                                                <div className={styles.percentageInput}>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        max="100"
                                                                                        step="0.01"
                                                                                        disabled={objetivoCero || finalizada}
                                                                                        value={distribucion?.ponderacion ?? ""}
                                                                                        onChange={(e) =>
                                                                                            actualizarDistribucionSucursal(
                                                                                                objetivo.id!,
                                                                                                pv.id,
                                                                                                "ponderacion",
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <span>%</span>
                                                                                </div>
                                                                            </label>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}

                                                            <td>
                                                                <span
                                                                    className={
                                                                        Math.abs(porcentaje - 100) < 0.001
                                                                            ? styles.distributionOk
                                                                            : styles.distributionPending
                                                                    }
                                                                >
                                                                    {porcentaje.toFixed(2)}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={3}><strong>Ponderación por sucursal</strong></td>
                                                    {puntosVenta.map((pv) => {
                                                        const total = ponderacionSucursalTotal(pv.id);
                                                        const valida = ponderacionSucursalValida(pv.id);
                                                        return (
                                                            <td key={pv.id}>
                                                                <span className={valida ? styles.distributionOk : styles.distributionPending}>
                                                                    {total.toFixed(2)}%
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {presupuestoBanderaSeleccionado.presupuesto.distribucion_estado !== "finalizada" ? (
                                        <div className={styles.footerActions}>
                                            <button
                                                type="button"
                                                className={styles.secondaryButton}
                                                disabled={guardando}
                                                onClick={guardarDistribucionSucursales}
                                            >
                                                Guardar distribución
                                            </button>

                                            <button
                                                type="button"
                                                className={styles.primaryButton}
                                                disabled={guardando || !distribucionSucursalesCompleta}
                                                onClick={finalizarDistribucionSucursales}
                                            >
                                                Finalizar distribución
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.finishedDistribution}>
                                            ✓ Distribución finalizada
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    </>
                )}

            {/* VENDEDORES */}
            {/* ====================================================== */}

            {nivel === "vendedor" && !presupuestoSucursalSeleccionado && (
                <section className={styles.card}>
                    <div className={styles.cardHeader}><div><h2>Presupuestos por sucursal</h2><p>Seleccioná una sucursal para disponibilizar y distribuir sus objetivos entre vendedores.</p></div></div>
                    {loading ? <div className={styles.loading}>Cargando presupuestos...</div> : presupuestosSucursalDisponibles.length === 0 ? (
                        <div className={styles.emptyState}><h2>No hay presupuestos de sucursales</h2><p>Primero debe finalizarse la distribución desde Banderas hacia Sucursales.</p></div>
                    ) : <div className={styles.budgetList}>{presupuestosSucursalDisponibles.map(item => (
                        <div key={item.presupuesto.id} className={styles.budgetCard}><div className={styles.budgetMain}>
                            <div><h3>{item.puntoVenta.nombre}</h3><div className={styles.budgetMeta}><span>{item.canal?.tipo || "-"} → {item.bandera?.tipo || "-"}</span><span>{item.objetivos.length} objetivos</span><span>Distribución: {item.presupuesto.distribucion_estado}</span></div></div>
                            <div className={styles.budgetActions}><span className={`${styles.statusBadge} ${item.presupuesto.estado === "disponibilizado" ? styles.statusAvailable : item.presupuesto.estado === "guardado" ? styles.statusSaved : styles.statusDraft}`}>{item.presupuesto.estado}</span><button type="button" className={styles.primaryButton} onClick={() => abrirPresupuestoSucursal(item)}>Gestionar</button></div>
                        </div></div>
                    ))}</div>}
                </section>
            )}

            {nivel === "vendedor" && presupuestoSucursalSeleccionado && (
                <>
                    <div className={styles.detailTopBar}><button type="button" className={styles.backButton} onClick={volverListadoVendedores}>← Volver a vendedores</button><div><strong>{presupuestoSucursalSeleccionado.canal?.tipo || "-"} → {presupuestoSucursalSeleccionado.bandera?.tipo || "-"} → {presupuestoSucursalSeleccionado.puntoVenta.nombre}</strong><span>{MESES[mes - 1]} {anio}</span></div></div>
                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2>
                                    Presupuesto a distribuir por{" "}
                                    {presupuestoSucursalSeleccionado.puntoVenta.nombre}
                                </h2>

                                <p>
                                    Estos son los objetivos y ponderaciones definidos por la sucursal
                                    que deberán distribuirse entre sus vendedores.
                                </p>
                            </div>
                        </div>

                        <div className={styles.vendorTableWrapper}>
                            <table className={styles.receivedTable}>
                                <thead>
                                    <tr>
                                        <th className={styles.receivedProductColumn}>
                                            Producto
                                        </th>

                                        <th className={styles.receivedValueColumn}>
                                            Objetivo a distribuir
                                        </th>

                                        <th className={styles.receivedValueColumn}>
                                            Ponderación
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {presupuestoSucursalSeleccionado.objetivos.map((o) => (
                                        <tr key={o.id}>
                                            <td className={styles.receivedProductName}>
                                                {o.producto_nombre}
                                            </td>

                                            <td className={styles.receivedValue}>
                                                {o.valor_objetivo}
                                            </td>

                                            <td className={styles.receivedValue}>
                                                {Number(o.ponderacion || 0).toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {presupuestoSucursalSeleccionado.presupuesto.estado !== "disponibilizado" && <div className={styles.footerActions}><button type="button" className={styles.primaryButton} disabled={guardando} onClick={disponibilizarSucursalParaVendedores}>Disponibilizar objetivo</button></div>}
                        {presupuestoSucursalSeleccionado.presupuesto.estado === "disponibilizado" && <div className={styles.finishedDistribution}>✓ Objetivo disponibilizado</div>}
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div><h2>Distribución entre vendedores</h2><p>Distribuí el 100% de cada objetivo recibido. Cada vendedor debe tener una ponderación total de 100%.</p></div></div>
                        {presupuestoSucursalSeleccionado.presupuesto.estado !== "disponibilizado" ? <div className={styles.emptyState}><h2>Presupuesto todavía no disponibilizado</h2><p>Disponibilizá primero el objetivo de la sucursal.</p></div> : vendedores.length === 0 ? <div className={styles.emptyState}><h2>No hay vendedores activos</h2><p>No encontramos vendedores activos asociados a esta sucursal.</p></div> : <>
                            <div style={{ width: "100%", overflowX: "auto", border: "1px solid #dbe4ef", borderRadius: 12, background: "#fff" }}>
                                <table style={{ width: "100%", minWidth: 1050, borderCollapse: "collapse", tableLayout: "fixed" }}>
                                    <thead>
                                        <tr style={{ background: "#f7f9fc" }}>
                                            <th style={{ width: 180, padding: "13px 12px", textAlign: "left", color: "#4d6484", fontSize: 12 }}>PRODUCTO</th>
                                            <th style={{ width: 125, padding: "13px 12px", textAlign: "center", color: "#4d6484", fontSize: 12 }}>OBJETIVO RECIBIDO</th>
                                            <th style={{ width: 125, padding: "13px 12px", textAlign: "center", color: "#4d6484", fontSize: 12 }}>POND. SUCURSAL</th>
                                            {vendedores.map(v => <th key={v.id} style={{ minWidth: 235, padding: "13px 12px", textAlign: "center", color: "#0f172a", fontSize: 12 }}>{v.full_name || v.email || "Vendedor"}</th>)}
                                            <th style={{ width: 120, padding: "13px 12px", textAlign: "center", color: "#4d6484", fontSize: 12 }}>DISTRIBUIDO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {presupuestoSucursalSeleccionado.objetivos.map(o => {
                                            const pct = porcentajeDistribuidoVendedores(o); const objetivoCero = Number(o.valor_objetivo) === 0; return <tr key={o.id} style={{ borderTop: "1px solid #e7edf5" }}>
                                                <td style={{ padding: "16px 12px", fontWeight: 700, color: "#0f172a" }}>{o.producto_nombre}</td>
                                                <td style={{ padding: "16px 12px", textAlign: "center" }}>{o.valor_objetivo}</td>
                                                <td style={{ padding: "16px 12px", textAlign: "center" }}>{Number(o.ponderacion || 0).toFixed(2)}%</td>
                                                {vendedores.map(v => {
                                                    const d = distribucionesVendedores.find(x => x.objetivo_origen_id === o.id && x.vendedor_id === v.id); const finalizada = presupuestoSucursalSeleccionado.presupuesto.distribucion_estado === "finalizada"; const bloqueado = finalizada || objetivoCero; return <td key={v.id} style={{ padding: "12px" }}>
                                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                                            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>OBJETIVO</span><input style={{ width: "100%", height: 42, padding: "0 10px", border: "1px solid #cbd7e6", borderRadius: 8, boxSizing: "border-box", background: bloqueado ? "#f4f7fa" : "#fff" }} type="number" min="0" step="any" disabled={bloqueado} value={objetivoCero ? "0" : (d?.valor_asignado ?? "")} onChange={e => actualizarDistribucionVendedor(o.id!, v.id, "valor_asignado", e.target.value)} /></label>
                                                            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>PONDERACIÓN</span><div style={{ position: "relative" }}><input style={{ width: "100%", height: 42, padding: "0 28px 0 10px", border: "1px solid #cbd7e6", borderRadius: 8, boxSizing: "border-box", background: bloqueado ? "#f4f7fa" : "#fff" }} type="number" min="0" max="100" step="0.01" disabled={bloqueado} value={objetivoCero ? "0" : (d?.ponderacion ?? "")} onChange={e => actualizarDistribucionVendedor(o.id!, v.id, "ponderacion", e.target.value)} /><span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12 }}>%</span></div></label>
                                                        </div>
                                                    </td>
                                                })}
                                                <td style={{ padding: "16px 12px", textAlign: "center" }}><span className={Math.abs(pct - 100) < 0.001 ? styles.distributionOk : styles.distributionPending}>{pct.toFixed(2)}%</span></td>
                                            </tr>
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: "1px solid #dbe4ef", background: "#fafcff" }}>
                                            <td colSpan={3} style={{ padding: "14px 12px", fontWeight: 700, color: "#334155" }}>Ponderación por vendedor</td>
                                            {vendedores.map(v => { const total = ponderacionVendedorTotal(v.id); return <td key={v.id} style={{ padding: "14px 12px", textAlign: "center" }}><span className={ponderacionVendedorValida(v.id) ? styles.distributionOk : styles.distributionPending}>{total.toFixed(2)}%</span></td> })}
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            {presupuestoSucursalSeleccionado.presupuesto.distribucion_estado !== "finalizada" ? <div className={styles.footerActions}><button type="button" className={styles.secondaryButton} disabled={guardando} onClick={guardarDistribucionVendedores}>Guardar distribución</button><button type="button" className={styles.primaryButton} disabled={guardando || !distribucionVendedoresCompleta} onClick={finalizarDistribucionVendedores}>Finalizar distribución</button></div> : <div className={styles.finishedDistribution}>✓ Distribución finalizada</div>}
                        </>}
                    </section>
                </>
            )}
        </div>
    );
}