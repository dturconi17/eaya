import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HEADERS = {
  "Cache-Control": "private, no-store",
};

type Perfil = {
  id: string;
  full_name: string | null;
  email: string | null;
  supervisor_id: string | null;
  role: string | null;
  activo: boolean;
};

function normalizarRol(role: string | null) {
  return String(role ?? "").trim().toLowerCase();
}

function nombrePerfil(perfil: Perfil) {
  return (
    perfil.full_name?.trim() ||
    perfil.email?.trim() ||
    `Usuario ${perfil.id.slice(0, 8)}`
  );
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
      return responderError("Token inválido", 401);
    }

    // ========================================================
    // PERFIL Y PERMISOS
    // ========================================================

    const { data: perfil, error: perfilError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, email, supervisor_id, role, activo"
        )
        .eq("id", user.id)
        .single();

    if (perfilError || !perfil || perfil.activo !== true) {
      return responderError("No autorizado", 403);
    }

    const role = normalizarRol(perfil.role);

    const administrador =
      role === "admin" || role === "gerente";

    const esSupervisor = role === "supervisor";
    const esVendedor = role === "vendedor";

    if (!administrador && !esSupervisor && !esVendedor) {
      return responderError("No autorizado", 403);
    }

    // ========================================================
    // VALIDAR SUPERVISOR SOLICITADO
    // ========================================================

    const solicitado =
      req.nextUrl.searchParams.get("supervisorId");

    let supervisorId: string | undefined;

    if (esSupervisor) {
      if (solicitado && solicitado !== user.id) {
        return responderError("No autorizado", 403);
      }

      supervisorId = user.id;
    }

    if (administrador && solicitado) {
      if (
        solicitado !== "sin_supervisor" &&
        !UUID.test(solicitado)
      ) {
        return responderError("Supervisor inválido", 400);
      }

      supervisorId = solicitado;
    }

    if (esVendedor && solicitado) {
      return responderError("No autorizado", 403);
    }

    // ========================================================
    // VENDEDOR: SOLO SU PROPIO PERFIL
    // ========================================================

    if (esVendedor) {
      return NextResponse.json(
        {
          role,
          supervisores: [],
          vendedores: [
            {
              id: perfil.id,
              nombre: nombrePerfil(perfil),
              supervisor_id: perfil.supervisor_id,
              activo: perfil.activo,
            },
          ],
        },
        {
          headers: HEADERS,
        }
      );
    }

    // ========================================================
    // OBTENER ESTRUCTURA COMERCIAL ACTUAL
    // ========================================================

    const perfiles: Perfil[] = [];

    for (let offset = 0; ; offset += 500) {
      let query = supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, email, supervisor_id, role, activo"
        )
        .order("id", { ascending: true })
        .range(offset, offset + 499);

      // El supervisor solo consulta su equipo actual.
      if (esSupervisor) {
        query = query.eq("supervisor_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      perfiles.push(...(data ?? []));

      if ((data ?? []).length < 500) break;
    }

    // ========================================================
    // SUPERVISORES DISPONIBLES
    // ========================================================

    let supervisores: {
      id: string;
      nombre: string;
      activo: boolean;
    }[] = [];

    if (administrador) {
      supervisores = perfiles
        .filter(
          (p) => normalizarRol(p.role) === "supervisor"
        )
        .map((p) => ({
          id: p.id,
          nombre: nombrePerfil(p),
          activo: p.activo,
        }))
        .sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es")
        );
    }

    if (esSupervisor) {
      supervisores = [
        {
          id: perfil.id,
          nombre: nombrePerfil(perfil),
          activo: perfil.activo,
        },
      ];
    }

    // ========================================================
    // VENDEDORES DISPONIBLES
    // ========================================================

    let perfilesVendedores = perfiles.filter(
      (p) => normalizarRol(p.role) === "vendedor"
    );

    if (supervisorId === "sin_supervisor") {
      perfilesVendedores = perfilesVendedores.filter(
        (p) => p.supervisor_id === null
      );
    } else if (supervisorId) {
      perfilesVendedores = perfilesVendedores.filter(
        (p) => p.supervisor_id === supervisorId
      );
    }

    const vendedores = perfilesVendedores
      .map((p) => ({
        id: p.id,
        nombre: nombrePerfil(p),
        supervisor_id: p.supervisor_id,
        activo: p.activo,
      }))
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es")
      );

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        role,
        supervisores,
        vendedores,
      },
      {
        headers: HEADERS,
      }
    );

  } catch (error) {
    console.error("Error filtros reportes:", error);

    return responderError(
      "Error obteniendo filtros",
      500
    );
  }
}