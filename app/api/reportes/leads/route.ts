
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import { getLeads } from "@/lib/sql/reportes/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================================
// GET /api/reportes/leads
// ==========================================================

export async function GET(req: NextRequest) {
  try {
    // ======================================================
    // 1. VALIDAR TOKEN
    // ======================================================

    const token = req.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        {
          error: "No autorizado",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        {
          error: "Token inválido",
        },
        {
          status: 401,
        }
      );
    }

    // ======================================================
    // 2. OBTENER PARÁMETROS
    // ======================================================

    const params = req.nextUrl.searchParams;

    const desde = params.get("desde");
    const hasta = params.get("hasta");

    if (!desde || !hasta) {
      return NextResponse.json(
        {
          error:
            "Debe indicar fecha desde y hasta",
        },
        {
          status: 400,
        }
      );
    }

    const supervisorId =
      params.get("supervisorId") || undefined;

    const vendedorId =
      params.get("vendedorId") || undefined;

    const busqueda =
      params.get("busqueda") || undefined;

    const pagina = Number(
      params.get("pagina") ?? "1"
    );

    const limite = Number(
      params.get("limite") ?? "50"
    );

    // ======================================================
    // 3. FILTRO DE ONBOARDING
    // ======================================================

    const onboardingParam =
      params.get("onboardingCompletado");

    let onboardingCompletado:
      | boolean
      | undefined;

    if (onboardingParam === "true") {
      onboardingCompletado = true;
    } else if (onboardingParam === "false") {
      onboardingCompletado = false;
    } else if (onboardingParam !== null) {
      return NextResponse.json(
        {
          error:
            "Filtro de onboarding inválido",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // 4. EJECUTAR REPORTE
    // ======================================================

    const reporte = await getLeads(user.id, {
      desde,
      hasta,
      supervisorId,
      vendedorId,
      onboardingCompletado,
      busqueda,
      pagina,
      limite,
    });

    // ======================================================
    // 5. DEVOLVER RESPUESTA
    // ======================================================

    return NextResponse.json(reporte, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      "Error reporte listado de leads:",
      error
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : "";

    const esValidacion =
      /fecha|inválid|supera|período máximo/i.test(
        mensaje
      );

    const esAutorizacion =
      /no autorizado/i.test(mensaje);

    return NextResponse.json(
      {
        error: esValidacion
          ? mensaje
          : esAutorizacion
            ? "No autorizado"
            : "Error obteniendo el reporte de leads",
      },
      {
        status: esValidacion
          ? 400
          : esAutorizacion
            ? 403
            : 500,
      }
    );
  }
}
