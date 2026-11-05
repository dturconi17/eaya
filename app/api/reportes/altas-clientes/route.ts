
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAltasClientes } from "@/lib/sql/reportes/altas-clientes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    const params = req.nextUrl.searchParams;

    const desde = params.get("desde");
    const hasta = params.get("hasta");

    if (!desde || !hasta) {
      return NextResponse.json(
        { error: "Debe indicar fecha desde y hasta" },
        { status: 400 }
      );
    }

    const supervisorId =
      params.get("supervisorId") || undefined;

    const vendedorId =
      params.get("vendedorId") || undefined;

    const dashboard = await getAltasClientes(user.id, {
      desde,
      hasta,
      supervisorId,
      vendedorId,
    });

    return NextResponse.json(dashboard, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error reporte altas clientes:", error);

    const mensaje =
      error instanceof Error ? error.message : "";

    const esValidacion =
      /fecha|inválid|supera/i.test(mensaje);

    const esAutorizacion =
      /no autorizado/i.test(mensaje);

    return NextResponse.json(
      {
        error: esValidacion
          ? mensaje
          : esAutorizacion
            ? "No autorizado"
            : "Error obteniendo el reporte",
      },
      {
        status: esValidacion ? 400 : esAutorizacion ? 403 : 500,
      }
    );
  }
}
