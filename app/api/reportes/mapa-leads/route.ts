import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store",
};

type ClienteGeo = {
  id: string;
  created_by: string | null;
  localidad: string | null;
  provincia: string | null;
  localidad_latitud: number | null;
  localidad_longitud: number | null;
};

type ResponsableActual = {
  id: string;
  supervisor_id: string | null;
  role: string | null;
  activo: boolean;
};

type GrupoLocalidad = {
  localidad: string;
  provincia: string;
  latitud: number;
  longitud: number;
  cantidad: number;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function normalizarRol(role: string | null) {
  return String(role ?? "").trim().toLowerCase();
}

function fechaValida(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

  const d = new Date(`${fecha}T00:00:00Z`);

  return (
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === fecha
  );
}

function diaSiguiente(fecha: string) {
  const d = new Date(`${fecha}T00:00:00Z`);

  d.setUTCDate(d.getUTCDate() + 1);

  return d.toISOString().slice(0, 10);
}

function responderError(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: HEADERS,
    }
  );
}

// ============================================================
// ESTRUCTURA COMERCIAL ACTUAL
// ============================================================

async function obtenerResponsablesActuales() {
  const responsables: ResponsableActual[] = [];

  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, supervisor_id, role, activo")
      .order("id", { ascending: true })
      .range(offset, offset + 499);

    if (error) throw error;

    responsables.push(...(data ?? []));

    if ((data ?? []).length < 500) break;
  }

  return responsables;
}

// ============================================================
// ENDPOINT
// ============================================================

export async function GET(req: NextRequest) {
  try {
    // ========================================================
    // AUTENTICACIÓN
    // ========================================================

    const token = req.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      return responderError("No autorizado", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return responderError("Sesión inválida", 401);
    }

    // ========================================================
    // PERFIL Y ROL
    // ========================================================

    const { data: perfil, error: perfilError } =
      await supabaseAdmin
        .from("profiles")
        .select("role, activo")
        .eq("id", user.id)
        .single();

    if (
      perfilError ||
      !perfil ||
      perfil.activo !== true
    ) {
      return responderError("No autorizado", 403);
    }

    const rol = normalizarRol(perfil.role);

    const administrador =
      rol === "admin" || rol === "gerente";

    const esSupervisor = rol === "supervisor";
    const esVendedor = rol === "vendedor";

    if (!administrador && !esSupervisor && !esVendedor) {
      return responderError("Rol sin acceso", 403);
    }

    // ========================================================
    // FILTROS
    // ========================================================

    const params = req.nextUrl.searchParams;

    const desde = params.get("desde") ?? "";
    const hasta = params.get("hasta") ?? "";

    const supervisorId =
      params.get("supervisorId") || undefined;

    const vendedorId =
      params.get("vendedorId") || undefined;

    if (
      !fechaValida(desde) ||
      !fechaValida(hasta) ||
      desde > hasta
    ) {
      return responderError(
        "Rango de fechas inválido",
        400
      );
    }

    const dias =
      Math.round(
        (
          Date.parse(`${hasta}T00:00:00Z`) -
          Date.parse(`${desde}T00:00:00Z`)
        ) / 86400000
      ) + 1;

    if (dias > 366) {
      return responderError(
        "El período máximo es de 366 días",
        400
      );
    }

    if (
      supervisorId &&
      supervisorId !== "sin_supervisor" &&
      !UUID.test(supervisorId)
    ) {
      return responderError("Supervisor inválido", 400);
    }

    if (vendedorId && !UUID.test(vendedorId)) {
      return responderError("Vendedor inválido", 400);
    }

    // ========================================================
    // VALIDAR FILTROS SEGÚN ROL
    // ========================================================

    if (
      esVendedor &&
      (
        supervisorId ||
        (vendedorId && vendedorId !== user.id)
      )
    ) {
      return responderError("Filtro no autorizado", 403);
    }

    if (
      esSupervisor &&
      supervisorId &&
      supervisorId !== user.id
    ) {
      return responderError("Filtro no autorizado", 403);
    }

    // ========================================================
    // ESTRUCTURA COMERCIAL ACTUAL
    // ========================================================

    const responsables =
      await obtenerResponsablesActuales();

    const responsablesPorId = new Map(
      responsables.map((p) => [p.id, p])
    );

    const supervisorAplicado = esSupervisor
      ? user.id
      : administrador
        ? supervisorId
        : undefined;

    const vendedorAplicado = esVendedor
      ? user.id
      : vendedorId;

    // ========================================================
    // EQUIPO ACTUAL DEL SUPERVISOR
    // ========================================================

    const vendedoresEquipo = responsables.filter(
      (p) =>
        normalizarRol(p.role) === "vendedor" &&
        p.supervisor_id === user.id
    );

    const idsVendedoresEquipo = new Set(
      vendedoresEquipo.map((p) => p.id)
    );

    if (
      esSupervisor &&
      vendedorAplicado &&
      !idsVendedoresEquipo.has(vendedorAplicado)
    ) {
      return responderError(
        "Vendedor fuera de tu equipo",
        403
      );
    }

    // ========================================================
    // DETERMINAR VENDEDORES AUTORIZADOS
    // ========================================================

    let idsPermitidos: string[] | null = null;

    if (esVendedor) {
      idsPermitidos = [user.id];

    } else if (esSupervisor) {
      idsPermitidos = [...idsVendedoresEquipo];

    } else if (
      administrador &&
      supervisorAplicado &&
      supervisorAplicado !== "sin_supervisor"
    ) {
      idsPermitidos = responsables
        .filter(
          (p) =>
            normalizarRol(p.role) === "vendedor" &&
            p.supervisor_id === supervisorAplicado
        )
        .map((p) => p.id);
    }

    if (vendedorAplicado) {
      idsPermitidos =
        idsPermitidos === null
          ? [vendedorAplicado]
          : idsPermitidos.filter(
              (id) => id === vendedorAplicado
            );
    }

    // ========================================================
    // PREPARAR BLOQUES DE CONSULTA
    // ========================================================

    const bloques: (string[] | null)[] = [];

    if (idsPermitidos === null) {
      bloques.push(null);
    } else {
      for (
        let i = 0;
        i < idsPermitidos.length;
        i += 100
      ) {
        bloques.push(
          idsPermitidos.slice(i, i + 100)
        );
      }
    }

    // ========================================================
    // CONSULTAR CLIENTES AUTORIZADOS
    // ========================================================

    const clientes: ClienteGeo[] = [];

    for (const bloque of bloques) {
      for (let offset = 0; ; offset += 500) {
        let consulta = supabaseAdmin
          .from("clientes")
          .select(`
            id,
            created_by,
            localidad,
            provincia,
            localidad_latitud,
            localidad_longitud
          `)
          .gte(
            "created_at",
            `${desde}T00:00:00`
          )
          .lt(
            "created_at",
            `${diaSiguiente(hasta)}T00:00:00`
          )
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + 499);

        if (bloque !== null) {
          consulta = consulta.in(
            "created_by",
            bloque
          );
        }

        const { data, error } = await consulta;

        if (error) throw error;

        for (const cliente of (data ?? []) as ClienteGeo[]) {
          const responsable = cliente.created_by
            ? responsablesPorId.get(cliente.created_by)
            : undefined;

          const supervisorActual =
            responsable?.supervisor_id ?? null;

          if (
            supervisorAplicado === "sin_supervisor" &&
            supervisorActual !== null
          ) {
            continue;
          }

          clientes.push(cliente);
        }

        if ((data ?? []).length < 500) break;
      }
    }

    // ========================================================
    // AGRUPACIÓN GEOGRÁFICA
    // ========================================================

    const grupos = new Map<string, GrupoLocalidad>();

    let sinUbicacion = 0;

    for (const cliente of clientes) {
      const lat = cliente.localidad_latitud;
      const lng = cliente.localidad_longitud;

      if (
        !cliente.localidad?.trim() ||
        !cliente.provincia?.trim() ||
        lat == null ||
        lng == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -56 ||
        lat > -21 ||
        lng < -74 ||
        lng > -53
      ) {
        sinUbicacion++;
        continue;
      }

      const clave = [
        cliente.provincia.trim().toLowerCase(),
        cliente.localidad.trim().toLowerCase(),
        lat,
        lng,
      ].join("|");

      const grupo = grupos.get(clave);

      if (grupo) {
        grupo.cantidad++;
      } else {
        grupos.set(clave, {
          provincia: cliente.provincia,
          localidad: cliente.localidad,
          latitud: lat,
          longitud: lng,
          cantidad: 1,
        });
      }
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        localidades: [...grupos.values()].sort(
          (a, b) => b.cantidad - a.cantidad
        ),

        totalLeads: clientes.length,

        conUbicacion:
          clientes.length - sinUbicacion,

        sinUbicacion,
      },
      {
        headers: HEADERS,
      }
    );

  } catch (err) {
    console.error("Error reporte mapa:", err);

    return responderError(
      "Error generando el mapa",
      500
    );
  }
}