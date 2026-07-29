"use client";

import {
    ChangeEvent,
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";
import { useRouter } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";

/* =========================================================
   TIPOS
========================================================= */

type Empresa = {
    id: string;
    nombre: string;
    cuit: string;
    activo: boolean;
};

type TipoComision = "one_shot" | "mensual";
type TipoSuscripcion =
    | "pago_unico"
    | "mensual"
    | "semestral"
    | "anual";
type FormaPago =
    | "billetera_virtual"
    | "tarjeta_debito"
    | "tarjeta_credito"
    | "efectivo"
    | "transferencia";

type Producto = {
    id: string;
    empresa_id: string;
    nombre: string;
    descripcion: string | null;

    precio: number;
    moneda: string;

    tipo_suscripcion: TipoSuscripcion;
    formas_pago: FormaPago[];

    maximo_por_cliente: number;
    maximo_beneficiarios: number;
    usa_pasarela_eaya: boolean;

    tipo_comision: TipoComision;
    monto_comision_one_shot: number | null;
    porcentaje_comision_mensual: number | null;

    fecha_inicio: string;
    fecha_fin: string | null;

    foto_path: string | null;

    activo: boolean;

    created_by: string;
    updated_by: string | null;

    created_at: string;
    updated_at: string;



    empresas?: {
        id: string;
        nombre: string;
        cuit: string;
        activo: boolean;
    } | null;
};

type ProductoHistorial = {
    id: string;
    producto_id: string;
    tipo_evento: "creacion" | "actualizacion";

    empresa_id: string;
    nombre: string;
    descripcion: string | null;

    precio: number;
    moneda: string;

    tipo_suscripcion: TipoSuscripcion;
    formas_pago: FormaPago[];

    tipo_comision: TipoComision;
    monto_comision_one_shot: number | null;
    porcentaje_comision_mensual: number | null;

    fecha_inicio: string;
    fecha_fin: string | null;

    activo: boolean;

    modificado_por: string | null;
    fecha_modificacion: string;

    datos_anteriores: Record<string, any> | null;
    datos_nuevos: Record<string, any> | null;
};

type ProductoFormData = {
    empresa_id: string;
    nombre: string;
    descripcion: string;

    precio: string;
    moneda: string;

    tipo_suscripcion: TipoSuscripcion;
    formas_pago: FormaPago[];

    maximo_por_cliente: string;
    maximo_beneficiarios: string;
    usa_pasarela_eaya: boolean;

    tipo_comision: TipoComision;
    monto_comision_one_shot: string;
    porcentaje_comision_mensual: string;

    fecha_inicio: string;
    fecha_fin: string;

    activo: boolean;
};

type FiltroEstado = "todos" | "activos" | "inactivos";
type FiltroComision = "todas" | TipoComision;

/* =========================================================
   CONSTANTES
========================================================= */

const FORMULARIO_INICIAL: ProductoFormData = {
    empresa_id: "",
    nombre: "",
    descripcion: "",

    precio: "",
    moneda: "ARS",

    tipo_suscripcion: "pago_unico",
    formas_pago: [],

    maximo_por_cliente: "1",
    maximo_beneficiarios: "0",
    usa_pasarela_eaya: false,

    tipo_comision: "one_shot",
    monto_comision_one_shot: "",
    porcentaje_comision_mensual: "",

    fecha_inicio: "",
    fecha_fin: "",

    activo: true,
};

const MONEDAS = [
    { value: "ARS", label: "ARS - Peso argentino" },
    { value: "USD", label: "USD - Dólar estadounidense" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "MXN", label: "MX$ - Peso mexicano" },
];

const TIPOS_SUSCRIPCION: Array<{
    value: TipoSuscripcion;
    label: string;
}> = [
        { value: "pago_unico", label: "Pago único" },
        { value: "mensual", label: "Mensual" },
        { value: "semestral", label: "Semestral" },
        { value: "anual", label: "Anual" },
    ];

const FORMAS_PAGO: Array<{
    value: FormaPago;
    label: string;
}> = [
        { value: "billetera_virtual", label: "Billetera Virtual" },
        { value: "tarjeta_debito", label: "Tarjeta de Débito" },
        { value: "tarjeta_credito", label: "Tarjeta de Crédito" },
        { value: "efectivo", label: "Efectivo" },
        { value: "transferencia", label: "Transferencia" },
    ];

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function limpiarCuit(cuit: string) {
    return cuit.replace(/\D/g, "");
}

function formatearCuit(cuit: string) {
    const limpio = limpiarCuit(cuit);

    if (limpio.length !== 11) {
        return cuit;
    }

    return `${limpio.slice(0, 2)}-${limpio.slice(
        2,
        10
    )}-${limpio.slice(10)}`;
}

function fechaActualISO() {
    const hoy = new Date();

    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fecha: string | null) {
    if (!fecha) {
        return "—";
    }

    const [anio, mes, dia] = fecha.split("-");

    if (!anio || !mes || !dia) {
        return fecha;
    }

    return `${dia}/${mes}/${anio}`;
}

function formatearFechaHora(fecha: string | null) {
    if (!fecha) {
        return "—";
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return fecha;
    }

    return valor.toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

function convertirNumero(valor: string) {
    const normalizado = valor
        .trim()
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    return Number(normalizado);
}

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
        return `${moneda} ${Number(valor).toLocaleString("es-AR")}`;
    }
}

function formatearPorcentaje(
    valor: number | null | undefined
) {
    if (valor === null || valor === undefined) {
        return "—";
    }

    return `${Number(valor).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    })}%`;
}

function obtenerNombreTipoComision(tipo: TipoComision) {
    return tipo === "one_shot"
        ? "One-shot"
        : "Comisión mensual";
}

function obtenerNombreTipoSuscripcion(
    tipo: TipoSuscripcion
) {
    return (
        TIPOS_SUSCRIPCION.find(
            (opcion) => opcion.value === tipo
        )?.label || tipo
    );
}

function obtenerNombreFormaPago(forma: FormaPago) {
    return (
        FORMAS_PAGO.find(
            (opcion) => opcion.value === forma
        )?.label || forma
    );
}

function valorCambio(
    valor: any,
    campo: string,
    moneda?: string
) {
    if (valor === null || valor === undefined || valor === "") {
        return "—";
    }

    if (
        campo === "precio" ||
        campo === "monto_comision_one_shot"
    ) {
        return formatearImporte(Number(valor), moneda || "ARS");
    }

    if (campo === "porcentaje_comision_mensual") {
        return formatearPorcentaje(Number(valor));
    }

    if (campo === "activo") {
        return valor ? "Activo" : "Inactivo";
    }

    if (campo === "fecha_inicio" || campo === "fecha_fin") {
        return formatearFecha(valor);
    }

    if (campo === "tipo_comision") {
        return obtenerNombreTipoComision(valor);
    }

    if (campo === "tipo_suscripcion") {
        return obtenerNombreTipoSuscripcion(valor);
    }

    if (campo === "formas_pago") {
        return Array.isArray(valor) && valor.length > 0
            ? valor
                .map((forma) =>
                    obtenerNombreFormaPago(forma)
                )
                .join(", ")
            : "—";
    }
    if (campo === "maximo_por_cliente") {
        return `${valor} producto${Number(valor) === 1 ? "" : "s"}`;
    }
    if (campo === "maximo_beneficiarios") {
        const cantidad = Number(valor);

        if (cantidad === 0) {
            return "No admite beneficiarios";
        }

        return `${cantidad} beneficiario${cantidad === 1 ? "" : "s"
            }`;
    }
    if (campo === "usa_pasarela_eaya") {
        return valor ? "Sí" : "No";
    }
    return String(valor);
}

function obtenerUrlFoto(fotoPath: string | null) {
    if (!fotoPath) {
        return "";
    }

    const { data } = supabase.storage
        .from("productos")
        .getPublicUrl(fotoPath);

    return data.publicUrl;
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function ProductosPage() {
    const { user, role, loading: userLoading } = useUser();

    const [productos, setProductos] = useState<Producto[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);

    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [procesandoId, setProcesandoId] = useState<string | null>(
        null
    );

    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] =
        useState<FiltroEstado>("todos");
    const [filtroComision, setFiltroComision] =
        useState<FiltroComision>("todas");
    const [filtroEmpresa, setFiltroEmpresa] = useState("");

    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoEditando, setProductoEditando] =
        useState<Producto | null>(null);

    const [formulario, setFormulario] =
        useState<ProductoFormData>(FORMULARIO_INICIAL);

    const [fotoArchivo, setFotoArchivo] =
        useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState("");
    const [eliminarFotoActual, setEliminarFotoActual] =
        useState(false);

    const [historialAbierto, setHistorialAbierto] =
        useState(false);
    const [productoHistorial, setProductoHistorial] =
        useState<Producto | null>(null);
    const [historial, setHistorial] = useState<
        ProductoHistorial[]
    >([]);
    const [nombresUsuarios, setNombresUsuarios] = useState<
        Record<string, string>
    >({});
    const [cargandoHistorial, setCargandoHistorial] =
        useState(false);

    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const router = useRouter();

    /* =======================================================
       CARGAR EMPRESAS
    ======================================================= */

    const cargarEmpresas = useCallback(async () => {
        const { data, error: empresasError } = await supabase
            .from("empresas")
            .select("id, nombre, cuit, activo")
            .order("nombre", { ascending: true });

        if (empresasError) {
            throw empresasError;
        }

        setEmpresas((data ?? []) as Empresa[]);
    }, []);

    /* =======================================================
       CARGAR PRODUCTOS
    ======================================================= */

    const cargarProductos = useCallback(async () => {
        const { data, error: productosError } = await supabase
            .from("productos")
            .select(`
        *,
        empresas (
          id,
          nombre,
          cuit,
          activo
        )
      `)
            .order("nombre", { ascending: true });

        if (productosError) {
            throw productosError;
        }

        setProductos((data ?? []) as Producto[]);
    }, []);

    /* =======================================================
       CARGA INICIAL
    ======================================================= */

    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            await Promise.all([
                cargarEmpresas(),
                cargarProductos(),
            ]);
        } catch (err) {
            console.error("Error cargando configuración:", err);
            setError(
                "No fue posible cargar las empresas y productos."
            );
        } finally {
            setLoading(false);
        }
    }, [cargarEmpresas, cargarProductos]);

    useEffect(() => {
        if (userLoading) {
            return;
        }

        if (!user) {
            setLoading(false);
            return;
        }

        cargarDatos();
    }, [user, userLoading, cargarDatos]);

    /* =======================================================
       EMPRESAS DISPONIBLES PARA EL FORMULARIO
    ======================================================= */

    const empresasDisponibles = useMemo(() => {
        return empresas.filter((empresa) => {
            if (empresa.activo) {
                return true;
            }

            /*
             * Si estamos editando un producto perteneciente a una
             * empresa inactiva, mantenemos esa empresa visible.
             */
            return empresa.id === productoEditando?.empresa_id;
        });
    }, [empresas, productoEditando]);

    /* =======================================================
       PRODUCTOS FILTRADOS
    ======================================================= */

    const productosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return productos.filter((producto) => {
            const coincideBusqueda =
                !texto ||
                producto.nombre.toLowerCase().includes(texto) ||
                producto.descripcion
                    ?.toLowerCase()
                    .includes(texto) ||
                producto.empresas?.nombre
                    .toLowerCase()
                    .includes(texto) ||
                producto.empresas?.cuit.includes(
                    limpiarCuit(busqueda)
                );

            const coincideEstado =
                filtroEstado === "todos" ||
                (filtroEstado === "activos" && producto.activo) ||
                (filtroEstado === "inactivos" &&
                    !producto.activo);

            const coincideComision =
                filtroComision === "todas" ||
                producto.tipo_comision === filtroComision;

            const coincideEmpresa =
                !filtroEmpresa ||
                producto.empresa_id === filtroEmpresa;

            return (
                coincideBusqueda &&
                coincideEstado &&
                coincideComision &&
                coincideEmpresa
            );
        });
    }, [
        productos,
        busqueda,
        filtroEstado,
        filtroComision,
        filtroEmpresa,
    ]);

    /* =======================================================
       ABRIR NUEVO PRODUCTO
    ======================================================= */

    function abrirNuevoProducto() {
        setProductoEditando(null);

        setFormulario({
            ...FORMULARIO_INICIAL,
            empresa_id:
                empresasDisponibles.length === 1
                    ? empresasDisponibles[0].id
                    : "",
            fecha_inicio: fechaActualISO(),
        });

        setFotoArchivo(null);
        setFotoPreview("");
        setEliminarFotoActual(false);

        setError("");
        setMensaje("");
        setModalAbierto(true);
    }

    /* =======================================================
       ABRIR EDICIÓN
    ======================================================= */

    function abrirEdicion(producto: Producto) {
        setProductoEditando(producto);

        setFormulario({
            empresa_id: producto.empresa_id,
            nombre: producto.nombre,
            descripcion: producto.descripcion ?? "",

            maximo_por_cliente: String(
                producto.maximo_por_cliente ?? 1
            ),

            maximo_beneficiarios: String(
                producto.maximo_beneficiarios ?? 0
            ),

            usa_pasarela_eaya:
                producto.usa_pasarela_eaya ?? false,

            precio: String(producto.precio),
            moneda: producto.moneda,

            tipo_suscripcion:
                producto.tipo_suscripcion || "pago_unico",
            formas_pago: producto.formas_pago || [],

            tipo_comision: producto.tipo_comision,
            monto_comision_one_shot:
                producto.monto_comision_one_shot !== null
                    ? String(producto.monto_comision_one_shot)
                    : "",
            porcentaje_comision_mensual:
                producto.porcentaje_comision_mensual !== null
                    ? String(
                        producto.porcentaje_comision_mensual
                    )
                    : "",

            fecha_inicio: producto.fecha_inicio,
            fecha_fin: producto.fecha_fin ?? "",

            activo: producto.activo,
        });

        setFotoArchivo(null);
        setFotoPreview(
            producto.foto_path
                ? obtenerUrlFoto(producto.foto_path)
                : ""
        );
        setEliminarFotoActual(false);

        setError("");
        setMensaje("");
        setModalAbierto(true);
    }

    function cerrarModal() {
        if (guardando) {
            return;
        }

        if (fotoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(fotoPreview);
        }

        setModalAbierto(false);
        setProductoEditando(null);
        setFormulario(FORMULARIO_INICIAL);
        setFotoArchivo(null);
        setFotoPreview("");
        setEliminarFotoActual(false);
        setError("");
    }

    /* =======================================================
       ACTUALIZAR FORMULARIO
    ======================================================= */

    function actualizarCampo<
        K extends keyof ProductoFormData
    >(campo: K, valor: ProductoFormData[K]) {
        setFormulario((actual) => ({
            ...actual,
            [campo]: valor,
        }));
    }

    function cambiarTipoComision(tipo: TipoComision) {
        setFormulario((actual) => ({
            ...actual,
            tipo_comision: tipo,
            monto_comision_one_shot:
                tipo === "one_shot"
                    ? actual.monto_comision_one_shot
                    : "",
            porcentaje_comision_mensual:
                tipo === "mensual"
                    ? actual.porcentaje_comision_mensual
                    : "",
        }));
    }

    function alternarFormaPago(forma: FormaPago) {
        setFormulario((actual) => {
            const seleccionada =
                actual.formas_pago.includes(forma);

            return {
                ...actual,
                formas_pago: seleccionada
                    ? actual.formas_pago.filter(
                        (item) => item !== forma
                    )
                    : [...actual.formas_pago, forma],
            };
        });
    }

    function manejarFechaFin(valor: string) {
        setFormulario((actual) => ({
            ...actual,
            fecha_fin: valor,
            activo: valor ? false : actual.activo,
        }));
    }

    /* =======================================================
       FOTO DEL PRODUCTO
    ======================================================= */

    function seleccionarFoto(
        evento: ChangeEvent<HTMLInputElement>
    ) {
        const archivo = evento.target.files?.[0];

        if (!archivo) {
            return;
        }

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!tiposPermitidos.includes(archivo.type)) {
            setError(
                "La foto debe estar en formato JPG, PNG o WebP."
            );
            evento.target.value = "";
            return;
        }

        const limiteCincoMB = 5 * 1024 * 1024;

        if (archivo.size > limiteCincoMB) {
            setError("La foto no puede superar los 5 MB.");
            evento.target.value = "";
            return;
        }

        if (fotoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(fotoPreview);
        }

        setFotoArchivo(archivo);
        setFotoPreview(URL.createObjectURL(archivo));
        setEliminarFotoActual(false);
        setError("");
    }

    async function subirFotoProducto(
        archivo: File,
        productoId: string
    ) {
        const extension =
            archivo.name.split(".").pop()?.toLowerCase() ||
            "jpg";

        const identificador =
            typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;

        const ruta = `${productoId}/${identificador}.${extension}`;

        const { error: uploadError } =
            await supabase.storage
                .from("productos")
                .upload(ruta, archivo, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: archivo.type,
                });

        if (uploadError) {
            throw uploadError;
        }

        return ruta;
    }

    async function eliminarFotoStorage(
        fotoPath: string | null
    ) {
        if (!fotoPath) {
            return;
        }

        const { error: storageError } =
            await supabase.storage
                .from("productos")
                .remove([fotoPath]);

        if (storageError) {
            console.error(
                "No fue posible eliminar la foto anterior:",
                storageError
            );
        }
    }

    /* =======================================================
       VALIDACIONES
    ======================================================= */

    function validarFormulario() {
        if (!formulario.empresa_id) {
            return "Seleccioná la empresa del producto.";
        }

        const empresaSeleccionada = empresas.find(
            (empresa) => empresa.id === formulario.empresa_id
        );

        if (!empresaSeleccionada) {
            return "La empresa seleccionada no existe.";
        }

        if (
            !empresaSeleccionada.activo &&
            empresaSeleccionada.id !== productoEditando?.empresa_id
        ) {
            return "No podés asignar un producto nuevo a una empresa inactiva.";
        }

        if (!formulario.nombre.trim()) {
            return "El nombre del producto es obligatorio.";
        }

        if (formulario.nombre.trim().length < 2) {
            return "El nombre del producto es demasiado corto.";
        }

        if (!formulario.precio.trim()) {
            return "El precio del producto es obligatorio.";
        }

        const precio = convertirNumero(formulario.precio);

        if (!Number.isFinite(precio) || precio < 0) {
            return "Ingresá un precio válido.";
        }

        if (!formulario.moneda) {
            return "Seleccioná la moneda del producto.";
        }

        if (!formulario.tipo_suscripcion) {
            return "Seleccioná el tipo de suscripción.";
        }

        if (formulario.formas_pago.length === 0) {
            return "Seleccioná al menos una forma de pago.";
        }

        if (!formulario.fecha_inicio) {
            return "La fecha de inicio es obligatoria.";
        }

        if (!formulario.maximo_por_cliente.trim()) {
            return "Ingresá la cantidad máxima permitida por cliente.";
        }



        const maximoPorCliente = Number(
            formulario.maximo_por_cliente
        );

        if (
            !Number.isInteger(maximoPorCliente) ||
            maximoPorCliente < 1
        ) {
            return "La cantidad máxima por cliente debe ser un número entero mayor o igual a 1.";
        }


        if (!formulario.maximo_beneficiarios.trim()) {
            return "Ingresá la cantidad máxima de beneficiarios.";
        }

        const maximoBeneficiarios = Number(
            formulario.maximo_beneficiarios
        );

        if (
            !Number.isInteger(maximoBeneficiarios) ||
            maximoBeneficiarios < 0
        ) {
            return "La cantidad máxima de beneficiarios debe ser un número entero mayor o igual a 0.";
        }


        if (
            formulario.fecha_fin &&
            formulario.fecha_fin < formulario.fecha_inicio
        ) {
            return "La fecha de fin no puede ser anterior a la fecha de inicio.";
        }

        if (formulario.tipo_comision === "one_shot") {
            if (!formulario.monto_comision_one_shot.trim()) {
                return "Ingresá el monto de la comisión one-shot.";
            }

            const monto = convertirNumero(
                formulario.monto_comision_one_shot
            );

            if (!Number.isFinite(monto) || monto < 0) {
                return "Ingresá un monto one-shot válido.";
            }
        }

        if (formulario.tipo_comision === "mensual") {
            if (
                !formulario.porcentaje_comision_mensual.trim()
            ) {
                return "Ingresá el porcentaje de comisión mensual.";
            }

            const porcentaje = convertirNumero(
                formulario.porcentaje_comision_mensual
            );

            if (
                !Number.isFinite(porcentaje) ||
                porcentaje < 0 ||
                porcentaje > 100
            ) {
                return "El porcentaje mensual debe estar entre 0 y 100.";
            }
        }

        return null;
    }

    /* =======================================================
       GUARDAR PRODUCTO
    ======================================================= */

    async function guardarProducto(
        evento: FormEvent<HTMLFormElement>
    ) {
        evento.preventDefault();

        if (!user?.id) {
            setError("No fue posible identificar al usuario.");
            return;
        }

        if (role !== "admin") {
            setError(
                "No tenés permisos para modificar productos."
            );
            return;
        }

        const errorValidacion = validarFormulario();

        if (errorValidacion) {
            setError(errorValidacion);
            return;
        }

        try {
            setGuardando(true);
            setError("");
            setMensaje("");

            const precio = convertirNumero(formulario.precio);

            const montoOneShot =
                formulario.tipo_comision === "one_shot"
                    ? convertirNumero(
                        formulario.monto_comision_one_shot
                    )
                    : null;

            const porcentajeMensual =
                formulario.tipo_comision === "mensual"
                    ? convertirNumero(
                        formulario.porcentaje_comision_mensual
                    )
                    : null;

            const maximoPorCliente = Number(
                formulario.maximo_por_cliente
            );

            const maximoBeneficiarios = Number(
                formulario.maximo_beneficiarios
            );

            const datosProducto = {
                empresa_id: formulario.empresa_id,
                nombre: formulario.nombre.trim(),
                descripcion:
                    formulario.descripcion.trim() || null,

                precio,
                moneda: formulario.moneda,

                tipo_suscripcion:
                    formulario.tipo_suscripcion,
                formas_pago: formulario.formas_pago,

                tipo_comision: formulario.tipo_comision,

                monto_comision_one_shot: montoOneShot,

                maximo_beneficiarios:
                    maximoBeneficiarios,

                porcentaje_comision_mensual:
                    porcentajeMensual,

                fecha_inicio: formulario.fecha_inicio,
                fecha_fin: formulario.fecha_fin || null,

                maximo_por_cliente: maximoPorCliente,
                usa_pasarela_eaya: formulario.usa_pasarela_eaya,

                activo: formulario.fecha_fin
                    ? false
                    : formulario.activo,
            };

            if (productoEditando) {
                let nuevoFotoPath =
                    productoEditando.foto_path || null;
                let fotoNuevaSubida: string | null = null;
                let fotoAnteriorParaEliminar: string | null =
                    null;

                if (fotoArchivo) {
                    fotoNuevaSubida =
                        await subirFotoProducto(
                            fotoArchivo,
                            productoEditando.id
                        );

                    nuevoFotoPath = fotoNuevaSubida;
                    fotoAnteriorParaEliminar =
                        productoEditando.foto_path;
                } else if (
                    eliminarFotoActual &&
                    productoEditando.foto_path
                ) {
                    nuevoFotoPath = null;
                    fotoAnteriorParaEliminar =
                        productoEditando.foto_path;
                }

                const { error: actualizarError } =
                    await supabase
                        .from("productos")
                        .update({
                            ...datosProducto,
                            foto_path: nuevoFotoPath,
                            updated_by: user.id,
                        })
                        .eq("id", productoEditando.id);

                if (actualizarError) {
                    if (fotoNuevaSubida) {
                        await eliminarFotoStorage(
                            fotoNuevaSubida
                        );
                    }

                    throw actualizarError;
                }

                if (
                    fotoAnteriorParaEliminar &&
                    fotoAnteriorParaEliminar !==
                    nuevoFotoPath
                ) {
                    await eliminarFotoStorage(
                        fotoAnteriorParaEliminar
                    );
                }

                setMensaje(
                    "Producto actualizado correctamente."
                );
            } else {
                const {
                    data: productoCreado,
                    error: insertarError,
                } = await supabase
                    .from("productos")
                    .insert({
                        ...datosProducto,
                        foto_path: null,
                        created_by: user.id,
                        updated_by: null,
                    })
                    .select("id")
                    .single();

                if (insertarError) {
                    throw insertarError;
                }

                if (fotoArchivo) {
                    const fotoPath =
                        await subirFotoProducto(
                            fotoArchivo,
                            productoCreado.id
                        );

                    const { error: actualizarFotoError } =
                        await supabase
                            .from("productos")
                            .update({
                                foto_path: fotoPath,
                                updated_by: user.id,
                            })
                            .eq("id", productoCreado.id);

                    if (actualizarFotoError) {
                        await eliminarFotoStorage(fotoPath);
                        throw actualizarFotoError;
                    }
                }

                setMensaje(
                    "Producto creado correctamente."
                );
            }
            await cargarProductos();

            if (fotoPreview.startsWith("blob:")) {
                URL.revokeObjectURL(fotoPreview);
            }

            setModalAbierto(false);
            setProductoEditando(null);
            setFormulario(FORMULARIO_INICIAL);
            setFotoArchivo(null);
            setFotoPreview("");
            setEliminarFotoActual(false);
        } catch (err: any) {
            console.error("Error guardando producto:", err);

            if (err?.code === "42501") {
                setError(
                    "No tenés permisos para realizar esta operación."
                );
            } else if (err?.code === "23514") {
                setError(
                    "Los datos ingresados no cumplen las reglas del producto."
                );
            } else if (err?.code === "23503") {
                setError(
                    "La empresa seleccionada no es válida."
                );
            } else {
                setError(
                    err?.message ||
                    "No fue posible guardar el producto."
                );
            }
        } finally {
            setGuardando(false);
        }
    }

    /* =======================================================
       ACTIVAR / DESACTIVAR
    ======================================================= */

    async function cambiarEstado(producto: Producto) {
        if (!user?.id) {
            setError("No fue posible identificar al usuario.");
            return;
        }

        if (role !== "admin") {
            setError(
                "No tenés permisos para modificar productos."
            );
            return;
        }

        const nuevoEstado = !producto.activo;

        if (nuevoEstado && !producto.empresas?.activo) {
            setError(
                "No se puede reactivar el producto porque su empresa está inactiva."
            );
            return;
        }

        const confirmado = window.confirm(
            nuevoEstado
                ? `¿Querés reactivar el producto "${producto.nombre}"?`
                : `¿Querés desactivar el producto "${producto.nombre}"?\n\nDejará de estar disponible para nuevas operaciones, pero conservará su historial.`
        );

        if (!confirmado) {
            return;
        }

        try {
            setProcesandoId(producto.id);
            setError("");
            setMensaje("");

            const cambios: {
                activo: boolean;
                updated_by: string;
                fecha_fin?: string | null;
            } = {
                activo: nuevoEstado,
                updated_by: user.id,
            };

            if (nuevoEstado) {
                cambios.fecha_fin = null;
            }

            const { error: actualizarError } = await supabase
                .from("productos")
                .update(cambios)
                .eq("id", producto.id);

            if (actualizarError) {
                throw actualizarError;
            }

            setMensaje(
                nuevoEstado
                    ? "Producto reactivado correctamente."
                    : "Producto desactivado correctamente."
            );

            await cargarProductos();
        } catch (err: any) {
            console.error(
                "Error cambiando estado del producto:",
                err
            );

            setError(
                err?.message ||
                "No fue posible modificar el estado del producto."
            );
        } finally {
            setProcesandoId(null);
        }
    }

    /* =======================================================
       HISTORIAL
    ======================================================= */

    async function abrirHistorial(producto: Producto) {
        try {
            setProductoHistorial(producto);
            setHistorialAbierto(true);
            setCargandoHistorial(true);
            setHistorial([]);
            setNombresUsuarios({});
            setError("");

            const { data, error: historialError } = await supabase
                .from("productos_historial")
                .select("*")
                .eq("producto_id", producto.id)
                .order("fecha_modificacion", {
                    ascending: false,
                });

            if (historialError) {
                throw historialError;
            }

            const registros = (data ?? []) as ProductoHistorial[];

            setHistorial(registros);

            const usuariosIds = Array.from(
                new Set(
                    registros
                        .map((registro) => registro.modificado_por)
                        .filter(
                            (id): id is string => Boolean(id)
                        )
                )
            );

            if (usuariosIds.length > 0) {
                const { data: perfiles, error: perfilesError } =
                    await supabase
                        .from("profiles")
                        .select("id, full_name")
                        .in("id", usuariosIds);

                if (!perfilesError && perfiles) {
                    const mapa = perfiles.reduce<
                        Record<string, string>
                    >((acumulador, perfil: any) => {
                        acumulador[perfil.id] =
                            perfil.full_name || perfil.id;

                        return acumulador;
                    }, {});

                    setNombresUsuarios(mapa);
                }
            }
        } catch (err: any) {
            console.error("Error cargando historial:", err);
            setError(
                err?.message ||
                "No fue posible cargar el historial del producto."
            );
        } finally {
            setCargandoHistorial(false);
        }
    }

    function cerrarHistorial() {
        setHistorialAbierto(false);
        setProductoHistorial(null);
        setHistorial([]);
        setNombresUsuarios({});
    }

    function obtenerCambios(
        registro: ProductoHistorial
    ) {
        if (
            registro.tipo_evento === "creacion" ||
            !registro.datos_anteriores ||
            !registro.datos_nuevos
        ) {
            return [];
        }

        const campos = [
            {
                key: "empresa_id",
                label: "Empresa",
            },
            {
                key: "nombre",
                label: "Nombre",
            },
            {
                key: "descripcion",
                label: "Descripción",
            },
            {
                key: "precio",
                label: "Precio",
            },
            {
                key: "moneda",
                label: "Moneda",
            },
            {
                key: "tipo_suscripcion",
                label: "Tipo de suscripción",
            },
            {
                key: "formas_pago",
                label: "Formas de pago",
            },
            {
                key: "maximo_por_cliente",
                label: "Máximo por cliente",
            },
            {
                key: "maximo_beneficiarios",
                label: "Máximo de beneficiarios",
            },
            {
                key: "usa_pasarela_eaya",
                label: "Utiliza pasarela EAYA",
            },
            {
                key: "tipo_comision",
                label: "Tipo de comisión",
            },
            {
                key: "monto_comision_one_shot",
                label: "Comisión one-shot",
            },
            {
                key: "porcentaje_comision_mensual",
                label: "Comisión mensual",
            },
            {
                key: "fecha_inicio",
                label: "Inicio",
            },
            {
                key: "fecha_fin",
                label: "Fin",
            },
            {
                key: "activo",
                label: "Estado",
            },
        ];

        return campos
            .filter(({ key }) => {
                const anterior =
                    registro.datos_anteriores?.[key];
                const nuevo = registro.datos_nuevos?.[key];

                return JSON.stringify(anterior) !== JSON.stringify(nuevo);
            })
            .map(({ key, label }) => {
                const monedaAnterior =
                    registro.datos_anteriores?.moneda || "ARS";
                const monedaNueva =
                    registro.datos_nuevos?.moneda || "ARS";

                const valorAnterior =
                    key === "empresa_id"
                        ? empresas.find(
                            (empresa) =>
                                empresa.id ===
                                registro.datos_anteriores?.[key]
                        )?.nombre ||
                        registro.datos_anteriores?.[key]
                        : valorCambio(
                            registro.datos_anteriores?.[key],
                            key,
                            monedaAnterior
                        );

                const valorNuevo =
                    key === "empresa_id"
                        ? empresas.find(
                            (empresa) =>
                                empresa.id ===
                                registro.datos_nuevos?.[key]
                        )?.nombre ||
                        registro.datos_nuevos?.[key]
                        : valorCambio(
                            registro.datos_nuevos?.[key],
                            key,
                            monedaNueva
                        );

                return {
                    label,
                    anterior: valorAnterior || "—",
                    nuevo: valorNuevo || "—",
                };
            });
    }

    /* =======================================================
       CONTROL DE ACCESO
    ======================================================= */

    if (userLoading) {
        return (
            <main style={styles.page}>
                <div style={styles.loadingBox}>
                    Cargando usuario...
                </div>
            </main>
        );
    }

    if (!user) {
        return (
            <main style={styles.page}>
                <div style={styles.errorBox}>
                    Debés iniciar sesión para acceder a esta página.
                </div>
            </main>
        );
    }

    if (role !== "admin") {
        return (
            <main style={styles.page}>
                <div style={styles.errorBox}>
                    No tenés permisos para acceder a la configuración
                    de productos.
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
                {/* ENCABEZADO */}

                <div style={styles.header}>
                    <div>
                        <div style={styles.breadcrumb}>
                            Configuración / Productos
                        </div>

                        <h1 style={styles.title}>
                            Productos comercializados
                        </h1>

                        <p style={styles.subtitle}>
                            Administrá productos, precios, empresas y
                            condiciones de comisión.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={abrirNuevoProducto}
                        style={styles.primaryButton}
                        disabled={
                            empresas.filter((empresa) => empresa.activo)
                                .length === 0
                        }
                    >
                        + Nuevo producto
                    </button>
                </div>

                {empresas.filter((empresa) => empresa.activo)
                    .length === 0 && (
                        <div style={styles.warningBox}>
                            Para crear productos necesitás al menos una empresa
                            activa.
                        </div>
                    )}

                {/* MENSAJES */}

                {error && (
                    <div style={styles.errorBox}>{error}</div>
                )}

                {mensaje && (
                    <div style={styles.successBox}>{mensaje}</div>
                )}

                {/* FILTROS */}

                <section style={styles.filtersCard}>
                    <div style={styles.filterFieldWide}>
                        <label style={styles.label}>
                            Buscar producto
                        </label>

                        <input
                            type="text"
                            value={busqueda}
                            onChange={(evento) =>
                                setBusqueda(evento.target.value)
                            }
                            placeholder="Producto, empresa, CUIT o descripción"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.filterField}>
                        <label style={styles.label}>Empresa</label>

                        <select
                            value={filtroEmpresa}
                            onChange={(evento) =>
                                setFiltroEmpresa(evento.target.value)
                            }
                            style={styles.select}
                        >
                            <option value="">Todas las empresas</option>

                            {empresas.map((empresa) => (
                                <option
                                    key={empresa.id}
                                    value={empresa.id}
                                >
                                    {empresa.nombre}
                                    {!empresa.activo ? " - Inactiva" : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.filterField}>
                        <label style={styles.label}>
                            Tipo de comisión
                        </label>

                        <select
                            value={filtroComision}
                            onChange={(evento) =>
                                setFiltroComision(
                                    evento.target.value as FiltroComision
                                )
                            }
                            style={styles.select}
                        >
                            <option value="todas">Todas</option>
                            <option value="one_shot">One-shot</option>
                            <option value="mensual">
                                Comisión mensual
                            </option>
                        </select>
                    </div>

                    <div style={styles.filterField}>
                        <label style={styles.label}>Estado</label>

                        <select
                            value={filtroEstado}
                            onChange={(evento) =>
                                setFiltroEstado(
                                    evento.target.value as FiltroEstado
                                )
                            }
                            style={styles.select}
                        >
                            <option value="todos">
                                Todos los productos
                            </option>
                            <option value="activos">
                                Productos activos
                            </option>
                            <option value="inactivos">
                                Productos inactivos
                            </option>
                        </select>
                    </div>
                </section>

                {/* RESUMEN */}

                <div style={styles.summary}>
                    <span>
                        Mostrando{" "}
                        <strong>{productosFiltrados.length}</strong>{" "}
                        producto
                        {productosFiltrados.length === 1 ? "" : "s"}
                    </span>

                    <span>
                        Activos:{" "}
                        <strong>
                            {
                                productos.filter(
                                    (producto) => producto.activo
                                ).length
                            }
                        </strong>
                    </span>

                    <span>
                        One-shot:{" "}
                        <strong>
                            {
                                productos.filter(
                                    (producto) =>
                                        producto.tipo_comision === "one_shot"
                                ).length
                            }
                        </strong>
                    </span>

                    <span>
                        Mensuales:{" "}
                        <strong>
                            {
                                productos.filter(
                                    (producto) =>
                                        producto.tipo_comision === "mensual"
                                ).length
                            }
                        </strong>
                    </span>
                </div>

                {/* TABLA */}

                <section style={styles.tableCard}>
                    {loading ? (
                        <div style={styles.emptyState}>
                            Cargando productos...
                        </div>
                    ) : productosFiltrados.length === 0 ? (
                        <div style={styles.emptyState}>
                            <strong>
                                No se encontraron productos.
                            </strong>

                            <span>
                                Modificá los filtros o registrá un producto
                                nuevo.
                            </span>
                        </div>
                    ) : (
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Producto</th>
                                        <th style={styles.th}>Empresa</th>
                                        <th style={styles.th}>Precio</th>
                                        <th style={styles.th}>Suscripción</th>
                                        <th style={styles.th}>Formas de pago</th>
                                        <th style={styles.th}>Condiciones</th>
                                        <th style={styles.th}>Comisión</th>
                                        <th style={styles.th}>Vigencia</th>
                                        <th style={styles.th}>Estado</th>
                                        <th style={styles.th}>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {productosFiltrados.map((producto) => (
                                        <tr key={producto.id}>
                                            <td style={styles.td}>
                                                <div style={styles.productCell}>
                                                    {producto.foto_path ? (
                                                        <img
                                                            src={obtenerUrlFoto(
                                                                producto.foto_path
                                                            )}
                                                            alt={producto.nombre}
                                                            style={
                                                                styles.productThumbnail
                                                            }
                                                        />
                                                    ) : (
                                                        <div
                                                            style={
                                                                styles.productPlaceholder
                                                            }
                                                        >
                                                            {producto.nombre
                                                                .trim()
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <div
                                                            style={styles.productName}
                                                        >
                                                            {producto.nombre}
                                                        </div>

                                                        {producto.descripcion && (
                                                            <div
                                                                style={
                                                                    styles.secondaryText
                                                                }
                                                            >
                                                                {producto.descripcion}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td style={styles.td}>
                                                <div style={styles.companyName}>
                                                    {producto.empresas?.nombre || "—"}
                                                </div>

                                                {producto.empresas?.cuit && (
                                                    <div style={styles.secondaryText}>
                                                        {formatearCuit(
                                                            producto.empresas.cuit
                                                        )}
                                                    </div>
                                                )}

                                                {producto.empresas &&
                                                    !producto.empresas.activo && (
                                                        <div style={styles.dangerText}>
                                                            Empresa inactiva
                                                        </div>
                                                    )}
                                            </td>

                                            <td style={styles.td}>
                                                <strong>
                                                    {formatearImporte(
                                                        producto.precio,
                                                        producto.moneda
                                                    )}
                                                </strong>
                                            </td>

                                            <td style={styles.td}>
                                                <div style={styles.commissionType}>
                                                    {obtenerNombreTipoSuscripcion(
                                                        producto.tipo_suscripcion
                                                    )}
                                                </div>
                                            </td>

                                            <td style={styles.td}>
                                                <div style={styles.paymentBadges}>
                                                    {(producto.formas_pago || []).map(
                                                        (forma) => (
                                                            <span
                                                                key={forma}
                                                                style={styles.paymentBadge}
                                                            >
                                                                {obtenerNombreFormaPago(forma)}
                                                            </span>
                                                        )
                                                    )}

                                                    {(!producto.formas_pago ||
                                                        producto.formas_pago.length === 0) && (
                                                            <span style={styles.secondaryText}>
                                                                Sin definir
                                                            </span>
                                                        )}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.commissionType}>
                                                    Máximo por cliente:{" "}
                                                    {producto.maximo_por_cliente}
                                                </div>
                                                <div style={styles.secondaryText}>
                                                    {producto.maximo_beneficiarios === 0
                                                        ? "No admite beneficiarios"
                                                        : `Hasta ${producto.maximo_beneficiarios} beneficiario${producto.maximo_beneficiarios === 1 ? "" : "s"
                                                        }`}
                                                </div>
                                                <div style={styles.secondaryText}>
                                                    {producto.usa_pasarela_eaya
                                                        ? "Utiliza pasarela EAYA"
                                                        : "No utiliza pasarela EAYA"}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.commissionType}>
                                                    {obtenerNombreTipoComision(
                                                        producto.tipo_comision
                                                    )}
                                                </div>

                                                <div style={styles.secondaryText}>
                                                    {producto.tipo_comision ===
                                                        "one_shot"
                                                        ? formatearImporte(
                                                            producto.monto_comision_one_shot,
                                                            producto.moneda
                                                        )
                                                        : formatearPorcentaje(
                                                            producto.porcentaje_comision_mensual
                                                        )}
                                                </div>
                                            </td>

                                            <td style={styles.td}>
                                                <div>
                                                    Desde{" "}
                                                    {formatearFecha(
                                                        producto.fecha_inicio
                                                    )}
                                                </div>

                                                <div style={styles.secondaryText}>
                                                    Hasta{" "}
                                                    {formatearFecha(
                                                        producto.fecha_fin
                                                    )}
                                                </div>
                                            </td>

                                            <td style={styles.td}>
                                                <span
                                                    style={
                                                        producto.activo
                                                            ? styles.activeBadge
                                                            : styles.inactiveBadge
                                                    }
                                                >
                                                    {producto.activo
                                                        ? "Activo"
                                                        : "Inactivo"}
                                                </span>
                                            </td>

                                            <td style={styles.td}>
                                                <div style={styles.actionGroup}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            abrirEdicion(producto)
                                                        }
                                                        style={styles.editButton}
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            abrirHistorial(producto)
                                                        }
                                                        style={styles.historyButton}
                                                    >
                                                        Historial
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            cambiarEstado(producto)
                                                        }
                                                        disabled={
                                                            procesandoId === producto.id
                                                        }
                                                        style={
                                                            producto.activo
                                                                ? styles.deactivateButton
                                                                : styles.activateButton
                                                        }
                                                    >
                                                        {procesandoId === producto.id
                                                            ? "Procesando..."
                                                            : producto.activo
                                                                ? "Desactivar"
                                                                : "Reactivar"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(
                                                                `/configuracion/productos/${producto.id}/eventos`
                                                            )
                                                        }
                                                        style={styles.eventsButton}
                                                    >
                                                        Agregar eventos
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(
                                                                `/configuracion/productos/${producto.id}/campos`
                                                            )
                                                        }
                                                        style={styles.fieldsButton}
                                                    >
                                                        Campos de venta
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/configuracion/productos/${producto.id}/preguntas`
                                                            )
                                                        }
                                                        style={styles.triggerButton}
                                                    >
                                                        <MessageCircleQuestion size={12} />
                                                        Preguntas trigger
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* MODAL ALTA / EDICIÓN */}

            {modalAbierto && (
                <div
                    style={styles.modalOverlay}
                    onMouseDown={(evento) => {
                        if (evento.target === evento.currentTarget) {
                            cerrarModal();
                        }
                    }}
                >
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>
                                    {productoEditando
                                        ? "Editar producto"
                                        : "Nuevo producto"}
                                </h2>

                                <p style={styles.modalSubtitle}>
                                    {productoEditando
                                        ? "Los cambios quedarán registrados en el historial."
                                        : "Registrá un producto y sus condiciones comerciales."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModal}
                                style={styles.closeButton}
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={guardarProducto}>
                            <div style={styles.formGrid}>
                                <div style={styles.fullField}>
                                    <label style={styles.label}>
                                        Empresa *
                                    </label>

                                    <select
                                        value={formulario.empresa_id}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "empresa_id",
                                                evento.target.value
                                            )
                                        }
                                        style={styles.select}
                                        disabled={guardando}
                                    >
                                        <option value="">
                                            Seleccionar empresa
                                        </option>

                                        {empresasDisponibles.map((empresa) => (
                                            <option
                                                key={empresa.id}
                                                value={empresa.id}
                                            >
                                                {empresa.nombre} -{" "}
                                                {formatearCuit(empresa.cuit)}
                                                {!empresa.activo
                                                    ? " - Inactiva"
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.fullField}>
                                    <label style={styles.label}>
                                        Nombre del producto *
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
                                        maxLength={150}
                                        placeholder="Ej. Seguro integral"
                                        style={styles.input}
                                        disabled={guardando}
                                        autoFocus
                                    />
                                </div>

                                <div style={styles.fullField}>
                                    <label style={styles.label}>
                                        Descripción
                                    </label>

                                    <textarea
                                        value={formulario.descripcion}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "descripcion",
                                                evento.target.value
                                            )
                                        }
                                        placeholder="Descripción o características del producto"
                                        style={styles.textarea}
                                        disabled={guardando}
                                        rows={3}
                                    />
                                </div>

                                <div style={styles.fullField}>
                                    <label style={styles.label}>
                                        Foto del producto
                                    </label>

                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={seleccionarFoto}
                                        style={styles.fileInput}
                                        disabled={guardando}
                                    />

                                    <span style={styles.fieldHelp}>
                                        Campo opcional. JPG, PNG o WebP. Máximo 5 MB.
                                    </span>

                                    {fotoPreview && (
                                        <div
                                            style={
                                                styles.photoPreviewContainer
                                            }
                                        >
                                            <img
                                                src={fotoPreview}
                                                alt="Vista previa del producto"
                                                style={styles.photoPreview}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        fotoPreview.startsWith(
                                                            "blob:"
                                                        )
                                                    ) {
                                                        URL.revokeObjectURL(
                                                            fotoPreview
                                                        );
                                                    }

                                                    setFotoArchivo(null);
                                                    setFotoPreview("");
                                                    setEliminarFotoActual(true);
                                                }}
                                                style={
                                                    styles.removePhotoButton
                                                }
                                                disabled={guardando}
                                            >
                                                Quitar foto
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Precio *
                                    </label>

                                    <input
                                        type="text"
                                        value={formulario.precio}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "precio",
                                                evento.target.value
                                            )
                                        }
                                        placeholder="Ej. 25000,00"
                                        style={styles.input}
                                        disabled={guardando}
                                        inputMode="decimal"
                                    />
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Moneda *
                                    </label>

                                    <select
                                        value={formulario.moneda}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "moneda",
                                                evento.target.value
                                            )
                                        }
                                        style={styles.select}
                                        disabled={guardando}
                                    >
                                        {MONEDAS.map((moneda) => (
                                            <option
                                                key={moneda.value}
                                                value={moneda.value}
                                            >
                                                {moneda.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Tipo de suscripción *
                                    </label>

                                    <select
                                        value={formulario.tipo_suscripcion}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "tipo_suscripcion",
                                                evento.target.value as TipoSuscripcion
                                            )
                                        }
                                        style={styles.select}
                                        disabled={guardando}
                                    >
                                        {TIPOS_SUSCRIPCION.map((tipo) => (
                                            <option
                                                key={tipo.value}
                                                value={tipo.value}
                                            >
                                                {tipo.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Máximo por cliente *
                                    </label>

                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={formulario.maximo_por_cliente}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "maximo_por_cliente",
                                                evento.target.value
                                            )
                                        }
                                        placeholder="Ej. 1"
                                        style={styles.input}
                                        disabled={guardando}
                                        inputMode="numeric"
                                    />

                                    <span style={styles.fieldHelp}>
                                        Cantidad máxima de veces que un cliente puede
                                        contratar este mismo producto.
                                    </span>
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Máximo de beneficiarios *
                                    </label>

                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={formulario.maximo_beneficiarios}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "maximo_beneficiarios",
                                                evento.target.value
                                            )
                                        }
                                        placeholder="Ej. 0"
                                        style={styles.input}
                                        disabled={guardando}
                                        inputMode="numeric"
                                    />

                                    <span style={styles.fieldHelp}>
                                        Cantidad máxima de beneficiarios adicionales que
                                        el titular puede adherir a su cuenta. Ingresá 0 si
                                        el producto no permite beneficiarios.
                                    </span>
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Procesamiento del pago
                                    </label>

                                    <label
                                        style={
                                            formulario.usa_pasarela_eaya
                                                ? styles.checkboxCardActive
                                                : styles.checkboxCard
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                formulario.usa_pasarela_eaya
                                            }
                                            onChange={(evento) =>
                                                actualizarCampo(
                                                    "usa_pasarela_eaya",
                                                    evento.target.checked
                                                )
                                            }
                                            disabled={guardando}
                                        />

                                        <div>
                                            <strong>Utiliza pasarela de EAYA</strong>

                                            <span style={styles.checkboxDescription}>
                                                El pago del producto será procesado mediante
                                                la pasarela de EAYA.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                                <div style={styles.fullField}>
                                    <div style={styles.sectionDivider}>
                                        Formas de pago permitidas
                                    </div>

                                    <span style={styles.fieldHelp}>
                                        Seleccioná una o varias opciones.
                                    </span>

                                    <div style={styles.paymentOptions}>
                                        {FORMAS_PAGO.map((forma) => {
                                            const seleccionada =
                                                formulario.formas_pago.includes(
                                                    forma.value
                                                );

                                            return (
                                                <label
                                                    key={forma.value}
                                                    style={
                                                        seleccionada
                                                            ? styles.paymentOptionActive
                                                            : styles.paymentOption
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={seleccionada}
                                                        onChange={() =>
                                                            alternarFormaPago(
                                                                forma.value
                                                            )
                                                        }
                                                        disabled={guardando}
                                                    />

                                                    <span>{forma.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={styles.fullField}>
                                    <div style={styles.sectionDivider}>
                                        Comisión de la comercializadora
                                    </div>
                                </div>

                                <div style={styles.fullField}>
                                    <label style={styles.label}>
                                        Tipo de comisión *
                                    </label>

                                    <div style={styles.commissionOptions}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                cambiarTipoComision("one_shot")
                                            }
                                            style={
                                                formulario.tipo_comision ===
                                                    "one_shot"
                                                    ? styles.commissionOptionActive
                                                    : styles.commissionOption
                                            }
                                            disabled={guardando}
                                        >
                                            <strong>One-shot</strong>
                                            <span>
                                                Monto fijo cobrado una única vez
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                cambiarTipoComision("mensual")
                                            }
                                            style={
                                                formulario.tipo_comision ===
                                                    "mensual"
                                                    ? styles.commissionOptionActive
                                                    : styles.commissionOption
                                            }
                                            disabled={guardando}
                                        >
                                            <strong>Mensual</strong>
                                            <span>
                                                Porcentaje cobrado periódicamente
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {formulario.tipo_comision ===
                                    "one_shot" ? (
                                    <div style={styles.fullField}>
                                        <label style={styles.label}>
                                            Monto de comisión one-shot *
                                        </label>

                                        <div style={styles.inputWithSuffix}>
                                            <input
                                                type="text"
                                                value={
                                                    formulario.monto_comision_one_shot
                                                }
                                                onChange={(evento) =>
                                                    actualizarCampo(
                                                        "monto_comision_one_shot",
                                                        evento.target.value
                                                    )
                                                }
                                                placeholder="Ej. 5000,00"
                                                style={styles.input}
                                                disabled={guardando}
                                                inputMode="decimal"
                                            />

                                            <span style={styles.inputSuffix}>
                                                {formulario.moneda}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={styles.fullField}>
                                        <label style={styles.label}>
                                            Porcentaje de comisión mensual *
                                        </label>

                                        <div style={styles.inputWithSuffix}>
                                            <input
                                                type="text"
                                                value={
                                                    formulario.porcentaje_comision_mensual
                                                }
                                                onChange={(evento) =>
                                                    actualizarCampo(
                                                        "porcentaje_comision_mensual",
                                                        evento.target.value
                                                    )
                                                }
                                                placeholder="Ej. 12,5"
                                                style={styles.input}
                                                disabled={guardando}
                                                inputMode="decimal"
                                            />

                                            <span style={styles.inputSuffix}>%</span>
                                        </div>
                                    </div>
                                )}

                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Inicio de comercialización *
                                    </label>

                                    <input
                                        type="date"
                                        value={formulario.fecha_inicio}
                                        onChange={(evento) =>
                                            actualizarCampo(
                                                "fecha_inicio",
                                                evento.target.value
                                            )
                                        }
                                        style={styles.input}
                                        disabled={guardando}
                                    />
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Fin de comercialización
                                    </label>

                                    <input
                                        type="date"
                                        value={formulario.fecha_fin}
                                        min={
                                            formulario.fecha_inicio || undefined
                                        }
                                        onChange={(evento) =>
                                            manejarFechaFin(
                                                evento.target.value
                                            )
                                        }
                                        style={styles.input}
                                        disabled={guardando}
                                    />
                                </div>

                                <div style={styles.fullField}>
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
                                                evento.target.value === "activo"
                                            )
                                        }
                                        style={styles.select}
                                        disabled={
                                            guardando ||
                                            Boolean(formulario.fecha_fin)
                                        }
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">
                                            Inactivo
                                        </option>
                                    </select>

                                    {formulario.fecha_fin && (
                                        <span style={styles.fieldHelp}>
                                            Un producto con fecha de fin queda
                                            inactivo.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div style={styles.modalError}>
                                    {error}
                                </div>
                            )}

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={cerrarModal}
                                    style={styles.cancelButton}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    style={styles.primaryButton}
                                    disabled={guardando}
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : productoEditando
                                            ? "Guardar cambios"
                                            : "Crear producto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL HISTORIAL */}

            {historialAbierto && productoHistorial && (
                <div
                    style={styles.modalOverlay}
                    onMouseDown={(evento) => {
                        if (evento.target === evento.currentTarget) {
                            cerrarHistorial();
                        }
                    }}
                >
                    <div style={styles.historyModal}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>
                                    Historial del producto
                                </h2>

                                <p style={styles.modalSubtitle}>
                                    {productoHistorial.nombre} ·{" "}
                                    {productoHistorial.empresas?.nombre}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarHistorial}
                                style={styles.closeButton}
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>

                        {cargandoHistorial ? (
                            <div style={styles.emptyState}>
                                Cargando historial...
                            </div>
                        ) : historial.length === 0 ? (
                            <div style={styles.emptyState}>
                                No hay registros de historial disponibles.
                            </div>
                        ) : (
                            <div style={styles.timeline}>
                                {historial.map((registro) => {
                                    const cambios = obtenerCambios(registro);

                                    return (
                                        <article
                                            key={registro.id}
                                            style={styles.timelineItem}
                                        >
                                            <div style={styles.timelineDot} />

                                            <div style={styles.timelineCard}>
                                                <div style={styles.timelineHeader}>
                                                    <div>
                                                        <span
                                                            style={
                                                                registro.tipo_evento ===
                                                                    "creacion"
                                                                    ? styles.creationBadge
                                                                    : styles.updateBadge
                                                            }
                                                        >
                                                            {registro.tipo_evento ===
                                                                "creacion"
                                                                ? "Creación"
                                                                : "Actualización"}
                                                        </span>

                                                        <div style={styles.timelineDate}>
                                                            {formatearFechaHora(
                                                                registro.fecha_modificacion
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={styles.timelineUser}>
                                                        Usuario:{" "}
                                                        <strong>
                                                            {registro.modificado_por
                                                                ? nombresUsuarios[
                                                                registro.modificado_por
                                                                ] ||
                                                                registro.modificado_por
                                                                : "No identificado"}
                                                        </strong>
                                                    </div>
                                                </div>

                                                {registro.tipo_evento ===
                                                    "creacion" ? (
                                                    <div style={styles.creationSummary}>
                                                        <div>
                                                            <span style={styles.changeLabel}>
                                                                Precio inicial
                                                            </span>
                                                            <strong>
                                                                {formatearImporte(
                                                                    registro.precio,
                                                                    registro.moneda
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span style={styles.changeLabel}>
                                                                Comisión inicial
                                                            </span>
                                                            <strong>
                                                                {registro.tipo_comision ===
                                                                    "one_shot"
                                                                    ? formatearImporte(
                                                                        registro.monto_comision_one_shot,
                                                                        registro.moneda
                                                                    )
                                                                    : formatearPorcentaje(
                                                                        registro.porcentaje_comision_mensual
                                                                    )}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span style={styles.changeLabel}>
                                                                Estado inicial
                                                            </span>
                                                            <strong>
                                                                {registro.activo
                                                                    ? "Activo"
                                                                    : "Inactivo"}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                ) : cambios.length === 0 ? (
                                                    <div style={styles.noChanges}>
                                                        Se actualizó el registro, pero no
                                                        se detectaron cambios comerciales
                                                        visibles.
                                                    </div>
                                                ) : (
                                                    <div style={styles.changesList}>
                                                        {cambios.map((cambio) => (
                                                            <div
                                                                key={cambio.label}
                                                                style={styles.changeRow}
                                                            >
                                                                <div
                                                                    style={styles.changeField}
                                                                >
                                                                    {cambio.label}
                                                                </div>

                                                                <div
                                                                    style={styles.previousValue}
                                                                >
                                                                    {cambio.anterior}
                                                                </div>

                                                                <div style={styles.arrow}>→</div>

                                                                <div style={styles.newValue}>
                                                                    {cambio.nuevo}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}

/* =========================================================
   ESTILOS
========================================================= */

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        padding: "24px",
        background: "#f1f5f9",
    },

    container: {
        width: "100%",
        maxWidth: "1550px",
        margin: "0 auto",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        marginBottom: "24px",
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
        fontSize: "28px",
        lineHeight: 1.2,
    },

    subtitle: {
        margin: "8px 0 0",
        color: "#64748b",
        fontSize: "15px",
    },

    filtersCard: {
        display: "grid",
        gridTemplateColumns:
            "minmax(260px, 1fr) repeat(3, minmax(180px, 240px))",
        gap: "16px",
        padding: "18px",
        marginBottom: "16px",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
    },

    filterFieldWide: {
        display: "flex",
        flexDirection: "column",
        gap: "7px",
    },

    filterField: {
        display: "flex",
        flexDirection: "column",
        gap: "7px",
    },

    summary: {
        display: "flex",
        gap: "22px",
        flexWrap: "wrap",
        marginBottom: "14px",
        color: "#475569",
        fontSize: "14px",
    },

    tableCard: {
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
    },

    tableWrapper: {
        width: "100%",
        overflowX: "auto",
    },

    table: {
        width: "100%",
        minWidth: "1550px",
        borderCollapse: "collapse",
    },

    th: {
        padding: "13px 16px",
        borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc",
        color: "#475569",
        fontSize: "12px",
        fontWeight: 700,
        textAlign: "left",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    },

    td: {
        padding: "15px 16px",
        borderBottom: "1px solid #f1f5f9",
        color: "#334155",
        fontSize: "14px",
        verticalAlign: "middle",
    },

    productName: {
        color: "#0f172a",
        fontWeight: 700,
    },

    companyName: {
        color: "#0f172a",
        fontWeight: 600,
    },

    commissionType: {
        color: "#334155",
        fontWeight: 700,
    },

    secondaryText: {
        marginTop: "4px",
        color: "#64748b",
        fontSize: "12px",
    },

    dangerText: {
        marginTop: "4px",
        color: "#be123c",
        fontSize: "12px",
        fontWeight: 700,
    },

    label: {
        display: "block",
        color: "#334155",
        fontSize: "13px",
        fontWeight: 700,
    },

    input: {
        width: "100%",
        minHeight: "42px",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        outline: "none",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: "14px",
    },

    textarea: {
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        outline: "none",
        resize: "vertical",
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "inherit",
        fontSize: "14px",
    },

    select: {
        width: "100%",
        minHeight: "42px",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        outline: "none",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: "14px",
    },

    primaryButton: {
        minHeight: "42px",
        padding: "10px 17px",
        border: "none",
        borderRadius: "9px",
        background: "#0f172a",
        color: "#ffffff",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 700,
        whiteSpace: "nowrap",
    },

    editButton: {
        padding: "7px 11px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "#ffffff",
        color: "#334155",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
    },

    historyButton: {
        padding: "7px 11px",
        border: "1px solid #bfdbfe",
        borderRadius: "8px",
        background: "#eff6ff",
        color: "#1d4ed8",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
    },

    deactivateButton: {
        padding: "7px 11px",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        background: "#fff1f2",
        color: "#be123c",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
    },

    activateButton: {
        padding: "7px 11px",
        border: "1px solid #bbf7d0",
        borderRadius: "8px",
        background: "#f0fdf4",
        color: "#15803d",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
    },

    cancelButton: {
        minHeight: "42px",
        padding: "10px 17px",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        background: "#ffffff",
        color: "#334155",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 700,
    },

    activeBadge: {
        display: "inline-flex",
        padding: "5px 9px",
        borderRadius: "999px",
        background: "#dcfce7",
        color: "#166534",
        fontSize: "12px",
        fontWeight: 700,
    },

    inactiveBadge: {
        display: "inline-flex",
        padding: "5px 9px",
        borderRadius: "999px",
        background: "#e2e8f0",
        color: "#475569",
        fontSize: "12px",
        fontWeight: 700,
    },

    actionGroup: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
        flexWrap: "wrap",
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

    warningBox: {
        padding: "13px 15px",
        marginBottom: "16px",
        border: "1px solid #fde68a",
        borderRadius: "10px",
        background: "#fffbeb",
        color: "#92400e",
        fontSize: "14px",
    },

    loadingBox: {
        padding: "30px",
        borderRadius: "12px",
        background: "#ffffff",
        color: "#475569",
        textAlign: "center",
    },

    emptyState: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "60px 24px",
        color: "#64748b",
        textAlign: "center",
    },

    modalOverlay: {
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        background: "rgba(15, 23, 42, 0.55)",
    },

    modal: {
        width: "100%",
        maxWidth: "800px",
        maxHeight: "92vh",
        overflowY: "auto",
        padding: "24px",
        borderRadius: "16px",
        background: "#ffffff",
        boxShadow:
            "0 24px 60px rgba(15, 23, 42, 0.25)",
    },

    historyModal: {
        width: "100%",
        maxWidth: "1000px",
        maxHeight: "92vh",
        overflowY: "auto",
        padding: "24px",
        borderRadius: "16px",
        background: "#ffffff",
        boxShadow:
            "0 24px 60px rgba(15, 23, 42, 0.25)",
    },

    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "16px",
        marginBottom: "22px",
    },

    modalTitle: {
        margin: 0,
        color: "#0f172a",
        fontSize: "22px",
    },

    modalSubtitle: {
        margin: "7px 0 0",
        color: "#64748b",
        fontSize: "14px",
    },

    closeButton: {
        width: "36px",
        height: "36px",
        border: "none",
        borderRadius: "8px",
        background: "#f1f5f9",
        color: "#475569",
        cursor: "pointer",
        fontSize: "24px",
        lineHeight: 1,
    },

    formGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
        gap: "17px",
    },

    field: {
        display: "flex",
        flexDirection: "column",
        gap: "7px",
    },

    fullField: {
        gridColumn: "1 / -1",
        display: "flex",
        flexDirection: "column",
        gap: "7px",
    },

    fieldHelp: {
        color: "#64748b",
        fontSize: "12px",
    },

    sectionDivider: {
        marginTop: "4px",
        paddingBottom: "9px",
        borderBottom: "1px solid #e2e8f0",
        color: "#0f172a",
        fontSize: "15px",
        fontWeight: 800,
    },

    commissionOptions: {
        display: "grid",
        gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
        gap: "12px",
    },

    commissionOption: {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        padding: "15px",
        border: "1px solid #cbd5e1",
        borderRadius: "10px",
        background: "#ffffff",
        color: "#475569",
        cursor: "pointer",
        textAlign: "left",
    },

    commissionOptionActive: {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        padding: "15px",
        border: "2px solid #0f172a",
        borderRadius: "10px",
        background: "#f8fafc",
        color: "#0f172a",
        cursor: "pointer",
        textAlign: "left",
    },

    inputWithSuffix: {
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "stretch",
    },

    inputSuffix: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "55px",
        padding: "0 12px",
        marginLeft: "-1px",
        border: "1px solid #cbd5e1",
        borderRadius: "0 9px 9px 0",
        background: "#f8fafc",
        color: "#475569",
        fontSize: "13px",
        fontWeight: 700,
    },

    modalError: {
        padding: "12px 14px",
        marginTop: "18px",
        border: "1px solid #fecaca",
        borderRadius: "9px",
        background: "#fff1f2",
        color: "#be123c",
        fontSize: "13px",
    },

    modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        marginTop: "24px",
        paddingTop: "18px",
        borderTop: "1px solid #e2e8f0",
    },

    timeline: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        paddingLeft: "20px",
    },

    timelineItem: {
        position: "relative",
        paddingLeft: "20px",
    },

    timelineDot: {
        position: "absolute",
        top: "20px",
        left: "-5px",
        width: "11px",
        height: "11px",
        borderRadius: "50%",
        background: "#0f172a",
        boxShadow: "0 0 0 4px #e2e8f0",
    },

    timelineCard: {
        padding: "18px",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        background: "#f8fafc",
    },

    timelineHeader: {
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "16px",
        flexWrap: "wrap",
    },

    timelineDate: {
        marginTop: "7px",
        color: "#64748b",
        fontSize: "12px",
    },

    timelineUser: {
        color: "#475569",
        fontSize: "13px",
    },

    creationBadge: {
        display: "inline-flex",
        padding: "5px 9px",
        borderRadius: "999px",
        background: "#dcfce7",
        color: "#166534",
        fontSize: "12px",
        fontWeight: 700,
    },

    updateBadge: {
        display: "inline-flex",
        padding: "5px 9px",
        borderRadius: "999px",
        background: "#dbeafe",
        color: "#1d4ed8",
        fontSize: "12px",
        fontWeight: 700,
    },

    creationSummary: {
        display: "grid",
        gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
        gap: "12px",
    },

    changeLabel: {
        display: "block",
        marginBottom: "5px",
        color: "#64748b",
        fontSize: "12px",
    },

    changesList: {
        display: "flex",
        flexDirection: "column",
        gap: "9px",
    },

    changeRow: {
        display: "grid",
        gridTemplateColumns:
            "150px minmax(120px, 1fr) 24px minmax(120px, 1fr)",
        gap: "10px",
        alignItems: "center",
        padding: "10px",
        borderRadius: "8px",
        background: "#ffffff",
    },

    changeField: {
        color: "#334155",
        fontSize: "13px",
        fontWeight: 700,
    },

    previousValue: {
        color: "#be123c",
        fontSize: "13px",
        textDecoration: "line-through",
        overflowWrap: "anywhere",
    },

    arrow: {
        color: "#94a3b8",
        textAlign: "center",
    },

    eventsButton: {
        padding: "7px 11px",
        border: "1px solid #c4b5fd",
        borderRadius: "8px",
        background: "#f5f3ff",
        color: "#6d28d9",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
    },

    fieldsButton: {
        padding: "7px 11px",
        border: "1px solid #99f6e4",
        borderRadius: "8px",
        background: "#f0fdfa",
        color: "#0f766e",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
    },

    newValue: {
        color: "#166534",
        fontSize: "13px",
        fontWeight: 700,
        overflowWrap: "anywhere",
    },

    paymentOptions: {
        display: "grid",
        gridTemplateColumns:
            "repeat(3, minmax(170px, 1fr))",
        gap: "10px",
        marginTop: "5px",
    },

    paymentOption: {
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "12px",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        background: "#ffffff",
        color: "#475569",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 600,
    },

    paymentOptionActive: {
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "12px",
        border: "1px solid #86efac",
        borderRadius: "9px",
        background: "#f0fdf4",
        color: "#166534",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 700,
    },

    paymentBadges: {
        display: "flex",
        gap: "5px",
        flexWrap: "wrap",
        minWidth: "190px",
    },

    paymentBadge: {
        display: "inline-flex",
        padding: "4px 7px",
        borderRadius: "999px",
        background: "#f1f5f9",
        color: "#475569",
        fontSize: "10px",
        fontWeight: 700,
        whiteSpace: "nowrap",
    },

    noChanges: {
        color: "#64748b",
        fontSize: "13px",
    },
    fileInput: {
        width: "100%",
        padding: "10px",
        boxSizing: "border-box",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        background: "#ffffff",
        color: "#334155",
        fontSize: "13px",
    },

    photoPreviewContainer: {
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginTop: "6px",
    },

    photoPreview: {
        width: "150px",
        height: "110px",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        objectFit: "cover",
        background: "#f8fafc",
    },

    removePhotoButton: {
        padding: "8px 11px",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        background: "#fff1f2",
        color: "#be123c",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
    },

    productCell: {
        display: "flex",
        alignItems: "center",
        gap: "11px",
        minWidth: "250px",
    },

    productThumbnail: {
        width: "52px",
        height: "52px",
        flexShrink: 0,
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        objectFit: "cover",
        background: "#f8fafc",
    },

    productPlaceholder: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "52px",
        height: "52px",
        flexShrink: 0,
        borderRadius: "10px",
        background: "#ede9fe",
        color: "#6d28d9",
        fontSize: "19px",
        fontWeight: 800,
    },
    triggerButton: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "9px 14px",
        border: "1px solid #f59e0b",
        borderRadius: "9px",
        background: "#fffbeb",
        color: "#b45309",
        fontSize: "14px",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    checkboxCard: {
        display: "flex",
        alignItems: "flex-start",
        gap: "11px",
        minHeight: "42px",
        padding: "12px 14px",
        border: "1px solid #cbd5e1",
        borderRadius: "9px",
        background: "#ffffff",
        color: "#475569",
        cursor: "pointer",
    },

    checkboxCardActive: {
        display: "flex",
        alignItems: "flex-start",
        gap: "11px",
        minHeight: "42px",
        padding: "12px 14px",
        border: "1px solid #86efac",
        borderRadius: "9px",
        background: "#f0fdf4",
        color: "#166534",
        cursor: "pointer",
    },

    checkboxDescription: {
        display: "block",
        marginTop: "4px",
        color: "#64748b",
        fontSize: "12px",
        fontWeight: 400,
        lineHeight: 1.4,
    },
};