
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ==========================================================
// TIPOS
// ==========================================================

type Filtros = {
  desde: string;
  hasta: string;
  supervisorId?: string;
  vendedorId?: string;
  onboardingCompletado?: boolean;
  busqueda?: string;
  pagina?: number;
  limite?: number;
};

type Perfil = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  supervisor_id: string | null;
  activo: boolean;
};

type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  tipo_documento: string;
  numero_documento: string;
  email: string | null;
  celular: string | null;
  provincia: string | null;
  localidad: string | null;
  created_at: string | null;
  created_by: string | null;
  supervisor_id: string | null;
  punto_venta_id: string | null;
  onboarding_etapa: string;
  onboarding_completado: boolean;
};

type LeadProducto = {
  id: string;
  lead_id: string;
  producto_id: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

type Producto = {
  id: string;
  nombre: string;
  precio: number | null;
  moneda: string;
  activo: boolean;
};

// ==========================================================
// CONSTANTES
// ==========================================================

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TAMANO_LOTE = 200;

const CAMPOS_CLIENTE = `
  id,
  nombre,
  apellido,
  tipo_documento,
  numero_documento,
  email,
  celular,
  provincia,
  localidad,
  created_at,
  created_by,
  supervisor_id,
  punto_venta_id,
  onboarding_etapa,
  onboarding_completado
`;

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

function fechaValida(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const d = new Date(`${fecha}T00:00:00Z`);

  return (
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === fecha
  );
}

function siguienteDia(fecha: string) {
  const d = new Date(`${fecha}T00:00:00Z`);

  d.setUTCDate(d.getUTCDate() + 1);

  return d.toISOString().slice(0, 10);
}

function normalizarRol(rol: string | null) {
  return String(rol ?? "").trim().toLowerCase();
}

function nombrePerfil(perfil?: Perfil) {
  if (!perfil) return null;

  return (
    perfil.full_name?.trim() ||
    perfil.email?.trim() ||
    `Usuario ${perfil.id.slice(0, 8)}`
  );
}

function dividirEnLotes<T>(
  elementos: T[],
  tamano = TAMANO_LOTE
): T[][] {
  const lotes: T[][] = [];

  for (let i = 0; i < elementos.length; i += tamano) {
    lotes.push(elementos.slice(i, i + tamano));
  }

  return lotes;
}

// ==========================================================
// OBTENER PERFILES
// ==========================================================

async function obtenerPerfiles(ids: string[]) {
  const perfiles = new Map<string, Perfil>();

  const idsUnicos = [...new Set(ids)];

  for (const lote of dividirEnLotes(idsUnicos)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        supervisor_id,
        activo
      `)
      .in("id", lote);

    if (error) throw error;

    for (const perfil of data ?? []) {
      perfiles.set(perfil.id, perfil as Perfil);
    }
  }

  return perfiles;
}

// ==========================================================
// OBTENER VENDEDORES DEL SUPERVISOR ACTUAL
// ==========================================================

async function obtenerVendedoresSupervisor(
  supervisorId: string
) {
  const vendedores: Perfil[] = [];

  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        supervisor_id,
        activo
      `)
      .eq("supervisor_id", supervisorId)
      .ilike("role", "vendedor")
      .order("id", { ascending: true })
      .range(offset, offset + 499);

    if (error) throw error;

    vendedores.push(...((data ?? []) as Perfil[]));

    if ((data ?? []).length < 500) break;
  }

  return vendedores;
}

// ==========================================================
// OBTENER OPERACIONES DE LOS CLIENTES
// ==========================================================

async function obtenerLeadProductos(
  clienteIds: string[]
) {
  const operaciones: LeadProducto[] = [];

  for (const lote of dividirEnLotes(clienteIds)) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabaseAdmin
        .from("lead_productos")
        .select(`
          id,
          lead_id,
          producto_id,
          estado,
          created_at,
          updated_at
        `)
        .in("lead_id", lote)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + 499);

      if (error) throw error;

      operaciones.push(
        ...((data ?? []) as LeadProducto[])
      );

      if ((data ?? []).length < 500) break;
    }
  }

  return operaciones;
}

// ==========================================================
// OBTENER INFORMACIÓN DE PRODUCTOS
// ==========================================================

async function obtenerProductos(ids: string[]) {
  const productos = new Map<string, Producto>();

  const idsUnicos = [...new Set(ids)];

  for (const lote of dividirEnLotes(idsUnicos)) {
    const { data, error } = await supabaseAdmin
      .from("productos")
      .select(`
        id,
        nombre,
        precio,
        moneda,
        activo
      `)
      .in("id", lote);

    if (error) throw error;

    for (const producto of data ?? []) {
      productos.set(
        producto.id,
        producto as Producto
      );
    }
  }

  return productos;
}

// ==========================================================
// REPORTE PRINCIPAL
// ==========================================================

export async function getLeads(
  userId: string,
  filtros: Filtros
) {
  // ========================================================
  // 1. VALIDAR FILTROS
  // ========================================================

  if (
    !fechaValida(filtros.desde) ||
    !fechaValida(filtros.hasta)
  ) {
    throw new Error("Fecha inválida");
  }

  if (filtros.desde > filtros.hasta) {
    throw new Error(
      "La fecha desde supera la fecha hasta"
    );
  }

  const dias =
    Math.round(
      (
        Date.parse(`${filtros.hasta}T00:00:00Z`) -
        Date.parse(`${filtros.desde}T00:00:00Z`)
      ) / 86400000
    ) + 1;

  if (dias > 366) {
    throw new Error(
      "El período máximo es de 366 días"
    );
  }

  if (
    filtros.supervisorId &&
    !UUID.test(filtros.supervisorId)
  ) {
    throw new Error("Supervisor inválido");
  }

  if (
    filtros.vendedorId &&
    !UUID.test(filtros.vendedorId)
  ) {
    throw new Error("Vendedor inválido");
  }

  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 50;

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 1000000
  ) {
    throw new Error("Página inválida");
  }

  if (
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > 100
  ) {
    throw new Error("Límite inválido");
  }

  const busqueda = filtros.busqueda?.trim() ?? "";

  // Se restringen caracteres especiales para evitar
  // alterar la expresión de búsqueda de PostgREST.
  if (
    busqueda.length > 100 ||
    (
      busqueda &&
      !/^[\p{L}\p{N}\s@.+\-']+$/u.test(busqueda)
    )
  ) {
    throw new Error("Búsqueda inválida");
  }

  // ========================================================
  // 2. VALIDAR USUARIO AUTENTICADO
  // ========================================================

  const { data: perfil, error: errorPerfil } =
    await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        role,
        activo
      `)
      .eq("id", userId)
      .single();

  if (
    errorPerfil ||
    !perfil ||
    perfil.activo !== true
  ) {
    throw new Error("No autorizado");
  }

  const rol = normalizarRol(perfil.role);

  const administrador =
    rol === "admin" || rol === "gerente";

  if (
    !administrador &&
    rol !== "supervisor" &&
    rol !== "vendedor"
  ) {
    throw new Error("No autorizado");
  }

  // ========================================================
  // 3. DETERMINAR ALCANCE SEGÚN ROL
  // ========================================================

  let vendedoresPermitidos: string[] | null = null;

  let vendedoresDisponibles: Perfil[] = [];

  // null = sin restricción de vendedores
  // []   = ningún vendedor autorizado

  if (rol === "vendedor") {
    if (
      (
        filtros.vendedorId &&
        filtros.vendedorId !== userId
      ) ||
      filtros.supervisorId
    ) {
      throw new Error("No autorizado");
    }

    vendedoresPermitidos = [userId];
  }

  if (rol === "supervisor") {
    if (
      filtros.supervisorId &&
      filtros.supervisorId !== userId
    ) {
      throw new Error("No autorizado");
    }

    vendedoresDisponibles =
      await obtenerVendedoresSupervisor(userId);

    vendedoresPermitidos =
      vendedoresDisponibles.map((v) => v.id);

    if (filtros.vendedorId) {
      if (
        !vendedoresPermitidos.includes(
          filtros.vendedorId
        )
      ) {
        throw new Error("No autorizado");
      }

      vendedoresPermitidos = [
        filtros.vendedorId
      ];
    }
  }

  if (administrador) {
    if (filtros.supervisorId) {
      vendedoresDisponibles =
        await obtenerVendedoresSupervisor(
          filtros.supervisorId
        );

      vendedoresPermitidos =
        vendedoresDisponibles.map((v) => v.id);
    }

    if (filtros.vendedorId) {
      if (
        vendedoresPermitidos !== null &&
        !vendedoresPermitidos.includes(
          filtros.vendedorId
        )
      ) {
        vendedoresPermitidos = [];
      } else {
        vendedoresPermitidos = [
          filtros.vendedorId
        ];
      }
    }
  }

  const supervisorAplicado =
    rol === "supervisor"
      ? userId
      : administrador
        ? filtros.supervisorId ?? null
        : null;

  const vendedorAplicado =
    rol === "vendedor"
      ? userId
      : filtros.vendedorId ?? null;

  const filtrosAplicados = {
    desde: filtros.desde,
    hasta: filtros.hasta,
    supervisorId: supervisorAplicado,
    vendedorId: vendedorAplicado,
    onboardingCompletado:
      filtros.onboardingCompletado ?? null,
    busqueda,
  };

  const opcionesVendedores =
    vendedoresDisponibles
      .map((v) => ({
        id: v.id,
        nombre: nombrePerfil(v),
        activo: v.activo,
      }))
      .sort((a, b) =>
        (a.nombre ?? "").localeCompare(
          b.nombre ?? ""
        )
      );

  // ========================================================
  // 4. RESPUESTA VACÍA SI NO TIENE VENDEDORES
  // ========================================================

  if (
    vendedoresPermitidos !== null &&
    vendedoresPermitidos.length === 0
  ) {
    return {
      role: rol,
      filtros: filtrosAplicados,
      resumen: {
        totalLeads: 0,
        onboardingCompletado: 0,
        onboardingPendiente: 0,
      },
      paginacion: {
        pagina,
        limite,
        totalRegistros: 0,
        totalPaginas: 0,
      },
      opciones: {
        vendedores: opcionesVendedores,
      },
      leads: [],
    };
  }

  // ========================================================
  // 5. CONSULTAR CLIENTES
  // ========================================================

  const desde = `${filtros.desde}T00:00:00`;

  const hasta = `${siguienteDia(
    filtros.hasta
  )}T00:00:00`;

  const offset = (pagina - 1) * limite;

  // Se reutilizan exactamente los mismos filtros
  // para el listado y los indicadores.

  function construirConsulta(
    soloConteo = false
  ) {
    let query = supabaseAdmin
      .from("clientes")
      .select(CAMPOS_CLIENTE, {
        count: "exact",
        head: soloConteo,
      })
      .gte("created_at", desde)
      .lt("created_at", hasta);

    if (vendedoresPermitidos !== null) {
      query = query.in(
        "created_by",
        vendedoresPermitidos
      );
    }

    if (
      typeof filtros.onboardingCompletado ===
      "boolean"
    ) {
      query = query.eq(
        "onboarding_completado",
        filtros.onboardingCompletado
      );
    }

    if (busqueda) {
      const terminos = busqueda
        .split(/\s+/)
        .filter(Boolean);

      for (const termino of terminos) {
        const patron = `%${termino}%`;

        query = query.or(
          [
            `nombre.ilike.${patron}`,
            `apellido.ilike.${patron}`,
            `numero_documento.ilike.${patron}`,
            `email.ilike.${patron}`,
            `celular.ilike.${patron}`,
          ].join(",")
        );
      }
    }

    return query;
  }

  const [
    resultadoClientes,
    resultadoCompletados,
  ] = await Promise.all([
    construirConsulta()
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })
      .range(
        offset,
        offset + limite - 1
      ),

    construirConsulta(true)
      .eq("onboarding_completado", true),
  ]);

  if (resultadoClientes.error) {
    throw resultadoClientes.error;
  }

  if (resultadoCompletados.error) {
    throw resultadoCompletados.error;
  }

  const clientes =
    (resultadoClientes.data ?? []) as Cliente[];

  const totalLeads =
    resultadoClientes.count ?? 0;

  const totalCompletados =
    resultadoCompletados.count ?? 0;

  // ========================================================
  // 6. OBTENER VENDEDORES Y OPERACIONES
  // ========================================================

  const clienteIds = clientes.map(
    (cliente) => cliente.id
  );

  const vendedorIds = clientes
    .map((cliente) => cliente.created_by)
    .filter((id): id is string => Boolean(id));

  const [
    perfilesVendedores,
    operaciones,
  ] = await Promise.all([
    obtenerPerfiles(vendedorIds),
    obtenerLeadProductos(clienteIds),
  ]);

  // ========================================================
  // 7. OBTENER SUPERVISORES ACTUALES
  // ========================================================

  const supervisorIds = [
    ...perfilesVendedores.values(),
  ]
    .map((v) => v.supervisor_id)
    .filter((id): id is string => Boolean(id));

  const productoIds = operaciones.map(
    (op) => op.producto_id
  );

  const [
    perfilesSupervisores,
    productos,
  ] = await Promise.all([
    obtenerPerfiles(supervisorIds),
    obtenerProductos(productoIds),
  ]);

  // ========================================================
  // 8. AGRUPAR PRODUCTOS POR CLIENTE
  // ========================================================

  const operacionesPorCliente =
    new Map<string, LeadProducto[]>();

  for (const operacion of operaciones) {
    if (
      !operacionesPorCliente.has(
        operacion.lead_id
      )
    ) {
      operacionesPorCliente.set(
        operacion.lead_id,
        []
      );
    }

    operacionesPorCliente
      .get(operacion.lead_id)!
      .push(operacion);
  }

  // ========================================================
  // 9. CONSTRUIR LISTADO FINAL
  // ========================================================

  const leads = clientes.map((cliente) => {
    const vendedor = cliente.created_by
      ? perfilesVendedores.get(
          cliente.created_by
        )
      : undefined;

    const supervisorId =
      vendedor?.supervisor_id ?? null;

    const supervisor = supervisorId
      ? perfilesSupervisores.get(supervisorId)
      : undefined;

    const operacionesCliente =
      operacionesPorCliente.get(cliente.id) ?? [];

    const productosCliente =
      operacionesCliente.map((operacion) => {
        const producto = productos.get(
          operacion.producto_id
        );

        return {
          id: operacion.id,
          productoId: operacion.producto_id,
          nombre:
            producto?.nombre ??
            "Producto no disponible",
          estado: operacion.estado,
          precioActual: producto?.precio ?? null,
          moneda: producto?.moneda ?? null,
          activo: producto?.activo ?? null,
          fechaAlta: operacion.created_at,
          fechaActualizacion:
            operacion.updated_at,
        };
      });

    return {
      id: cliente.id,

      nombre: cliente.nombre,
      apellido: cliente.apellido,

      nombreCompleto:
        `${cliente.nombre} ${cliente.apellido}`,

      tipoDocumento: cliente.tipo_documento,
      numeroDocumento: cliente.numero_documento,

      email: cliente.email,
      celular: cliente.celular,

      provincia: cliente.provincia,
      localidad: cliente.localidad,

      fechaAlta: cliente.created_at,

      vendedorId: cliente.created_by,
      vendedorNombre:
        nombrePerfil(vendedor) ??
        "Sin vendedor disponible",

      supervisorId,
      supervisorNombre:
        nombrePerfil(supervisor) ??
        "Sin supervisor actual",

      supervisorHistoricoId:
        cliente.supervisor_id,

      puntoVentaId: cliente.punto_venta_id,

      onboardingEtapa:
        cliente.onboarding_etapa,

      onboardingCompletado:
        cliente.onboarding_completado,

      cantidadProductos:
        productosCliente.length,

      tieneProductos:
        productosCliente.length > 0,

      productos: productosCliente,
    };
  });

  // ========================================================
  // 10. RESPUESTA FINAL
  // ========================================================

  return {
    role: rol,

    filtros: filtrosAplicados,

    resumen: {
      totalLeads,
      onboardingCompletado: totalCompletados,
      onboardingPendiente:
        totalLeads - totalCompletados,
    },

    paginacion: {
      pagina,
      limite,
      totalRegistros: totalLeads,
      totalPaginas: Math.ceil(
        totalLeads / limite
      ),
    },

    opciones: {
      vendedores: opcionesVendedores,
    },

    leads,
  };
}
