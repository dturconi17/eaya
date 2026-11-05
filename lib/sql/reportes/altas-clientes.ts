
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Filtros = {
  desde: string;
  hasta: string;
  supervisorId?: string;
  vendedorId?: string;
};

type Cliente = {
  id: string;
  created_at: string;
  created_by: string | null;
  supervisor_id: string | null;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fechaValida(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
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

async function obtenerNombres(ids: string[]) {
  const nombres = new Map<string, string>();

  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids.slice(i, i + 200));

    if (error) throw error;

    for (const p of data ?? []) {
      nombres.set(
        p.id,
        p.full_name?.trim() ||
          p.email?.trim() ||
          `Usuario ${p.id.slice(0, 8)}`
      );
    }
  }

  return nombres;
}

export async function getAltasClientes(
  userId: string,
  filtros: Filtros
) {
  if (!fechaValida(filtros.desde) || !fechaValida(filtros.hasta)) {
    throw new Error("Fecha inválida");
  }

  if (filtros.desde > filtros.hasta) {
    throw new Error("La fecha desde supera la fecha hasta");
  }

  const dias =
    Math.round(
      (Date.parse(`${filtros.hasta}T00:00:00Z`) -
        Date.parse(`${filtros.desde}T00:00:00Z`)) /
        86400000
    ) + 1;

  if (dias > 366) {
    throw new Error("El período máximo es de 366 días");
  }

  if (
    filtros.supervisorId &&
    filtros.supervisorId !== "sin_supervisor" &&
    !UUID.test(filtros.supervisorId)
  ) {
    throw new Error("Supervisor inválido");
  }

  if (filtros.vendedorId && !UUID.test(filtros.vendedorId)) {
    throw new Error("Vendedor inválido");
  }

  const { data: perfil, error: errorPerfil } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role, activo")
      .eq("id", userId)
      .single();

  if (errorPerfil || !perfil || perfil.activo !== true) {
    throw new Error("No autorizado");
  }

  const rol = String(perfil.role).toLowerCase();
  const administrador = rol === "admin" || rol === "gerente";

  if (
    !administrador &&
    rol !== "supervisor" &&
    rol !== "vendedor"
  ) {
    throw new Error("No autorizado");
  }

  if (
    rol === "supervisor" &&
    filtros.supervisorId &&
    filtros.supervisorId !== userId
  ) {
    throw new Error("No autorizado");
  }

  if (rol === "vendedor") {
    if (
      (filtros.vendedorId && filtros.vendedorId !== userId) ||
      filtros.supervisorId
    ) {
      throw new Error("No autorizado");
    }
  }

  const supervisorAplicado =
    rol === "supervisor"
      ? userId
      : administrador
        ? filtros.supervisorId
        : undefined;

  const vendedorAplicado =
    rol === "vendedor" ? userId : filtros.vendedorId;

  const clientes: Cliente[] = [];

  for (let offset = 0; ; offset += 500) {
    let query = supabaseAdmin
      .from("clientes")
      .select("id, created_at, created_by, supervisor_id")
      .gte("created_at", `${filtros.desde}T00:00:00`)
      .lt("created_at", `${siguienteDia(filtros.hasta)}T00:00:00`)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 499);

    if (supervisorAplicado === "sin_supervisor") {
      query = query.is("supervisor_id", null);
    } else if (supervisorAplicado) {
      query = query.eq("supervisor_id", supervisorAplicado);
    }

    if (vendedorAplicado) {
      query = query.eq("created_by", vendedorAplicado);
    }

    const { data, error } = await query;

    if (error) throw error;

    clientes.push(...((data ?? []) as Cliente[]));

    if ((data ?? []).length < 500) break;
  }

  // ==========================================================
  // AGRUPACIÓN POR DÍA, VENDEDOR Y SUPERVISOR HISTÓRICO
  // ==========================================================

  const fechas: string[] = [];

  for (
    let fecha = filtros.desde;
    fecha <= filtros.hasta;
    fecha = siguienteDia(fecha)
  ) {
    fechas.push(fecha);
  }

  const conteoDiario = new Map<string, number>(
    fechas.map((fecha) => [fecha, 0])
  );

  const conteoVendedores = new Map<string, number>();
  const conteoSupervisores = new Map<string, number>();
  const detalleSupervisorDia = new Map<
    string,
    Map<string, number>
  >();

  for (const cliente of clientes) {
    const fecha = cliente.created_at.slice(0, 10);
    const supervisor = cliente.supervisor_id ?? "sin_supervisor";

    conteoDiario.set(
      fecha,
      (conteoDiario.get(fecha) ?? 0) + 1
    );

    conteoSupervisores.set(
      supervisor,
      (conteoSupervisores.get(supervisor) ?? 0) + 1
    );

    if (!detalleSupervisorDia.has(fecha)) {
      detalleSupervisorDia.set(fecha, new Map());
    }

    const porSupervisor = detalleSupervisorDia.get(fecha)!;

    porSupervisor.set(
      supervisor,
      (porSupervisor.get(supervisor) ?? 0) + 1
    );

    if (cliente.created_by) {
      conteoVendedores.set(
        cliente.created_by,
        (conteoVendedores.get(cliente.created_by) ?? 0) + 1
      );
    }
  }

  const idsVendedores = [...conteoVendedores.keys()];
  const idsSupervisores = [...conteoSupervisores.keys()].filter(
    (id) => id !== "sin_supervisor"
  );

  const [nombresVendedores, nombresSupervisores] =
    await Promise.all([
      obtenerNombres(idsVendedores),
      obtenerNombres(idsSupervisores),
    ]);

  const vendedores = [...conteoVendedores].map(
    ([id, cantidad]) => ({
      id,
      nombre:
        nombresVendedores.get(id) ??
        `Usuario ${id.slice(0, 8)}`,
      cantidad,
    })
  );

  vendedores.sort(
    (a, b) =>
      b.cantidad - a.cantidad ||
      a.nombre.localeCompare(b.nombre)
  );

  const supervisores = [...conteoSupervisores].map(
    ([id, cantidad]) => ({
      id,
      nombre:
        id === "sin_supervisor"
          ? "Sin supervisor histórico"
          : nombresSupervisores.get(id) ??
            `Supervisor ${id.slice(0, 8)}`,
      cantidad,
    })
  );

  supervisores.sort(
    (a, b) =>
      b.cantidad - a.cantidad ||
      a.nombre.localeCompare(b.nombre)
  );

  // Cada supervisor se identifica por su UUID.
  // El frontend asignará un color estable a cada serie.
  const evolucionSupervisores = fechas.map((fecha) => {
    const valores: Record<string, string | number> = {
      fecha,
    };

    const conteos = detalleSupervisorDia.get(fecha);

    for (const supervisor of supervisores) {
      valores[supervisor.id] =
        conteos?.get(supervisor.id) ?? 0;
    }

    return valores;
  });

  return {
    role: rol,
    filtros: {
      desde: filtros.desde,
      hasta: filtros.hasta,
      supervisorId: supervisorAplicado ?? null,
      vendedorId: vendedorAplicado ?? null,
    },
    resumen: {
      clientesPeriodo: clientes.length,
      promedioDiario: Number(
        (clientes.length / dias).toFixed(2)
      ),
      diasPeriodo: dias,
      vendedoresConAltas: vendedores.length,
      sinSupervisor:
        conteoSupervisores.get("sin_supervisor") ?? 0,
    },
    evolucion: fechas.map((fecha) => ({
      fecha,
      cantidad: conteoDiario.get(fecha) ?? 0,
    })),
    evolucionSupervisores,
    supervisores,
    vendedores,
  };
}
