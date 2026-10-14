
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES_PERMITIDOS = ["admin", "supervisor", "vendedor"];

const ESTADOS_VU = ["pending", "started", "success", "rejected"] as const;

type EstadoVU = (typeof ESTADOS_VU)[number];

function responderError(mensaje: string, status: number) {
  return NextResponse.json({ error: mensaje }, { status });
}

function esUUID(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      valor
    )
  );
}

async function autenticar(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) return null;

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Configuración de Supabase incompleta");
  }

  const clienteAuth = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await clienteAuth.auth.getUser(token);

  if (error || !data.user) return null;

  const { data: perfil, error: errorPerfil } = await supabaseAdmin
    .from("profiles")
    .select("id, role, activo, supervisor_id")
    .eq("id", data.user.id)
    .single();

  if (
    errorPerfil ||
    !perfil ||
    perfil.activo !== true ||
    !ROLES_PERMITIDOS.includes(perfil.role)
  ) {
    return null;
  }

  return perfil;
}

async function puedeGestionarOperacion(
  perfil: {
    id: string;
    role: string;
    supervisor_id: string | null;
  },
  createdBy: string | null
) {
  if (perfil.role === "admin") return true;

  if (!createdBy) return false;

  if (createdBy === perfil.id) return true;

  if (perfil.role !== "supervisor") return false;

  const { data: creador, error } = await supabaseAdmin
    .from("profiles")
    .select("id, supervisor_id")
    .eq("id", createdBy)
    .single();

  return !error && creador?.supervisor_id === perfil.id;
}

async function obtenerTokenVU() {
  const baseUrl = process.env.VU_API_BASE_URL;
  const clientId = process.env.VU_CLIENT_ID;
  const clientSecret = process.env.VU_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Configuración VU incompleta");
  }

  const credenciales = Buffer.from(
    `${clientId}:${clientSecret}`,
    "utf8"
  ).toString("base64");

  const respuesta = await fetch(
    `${baseUrl.replace(/\/$/, "")}/oauth/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credenciales}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    }
  );

  if (!respuesta.ok) {
    throw new Error(`VU OAuth respondió HTTP ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  if (!datos.access_token) {
    throw new Error("VU no devolvió un access_token");
  }

  return datos.access_token as string;
}

function esEstadoVU(valor: unknown): valor is EstadoVU {
  return (
    typeof valor === "string" &&
    ESTADOS_VU.includes(valor as EstadoVU)
  );
}

export async function GET(req: NextRequest) {
  try {
    // 1. Autenticar usuario.
    const perfil = await autenticar(req);

    if (!perfil) {
      return responderError(
        "Sesión inválida o usuario no habilitado",
        401
      );
    }

    // 2. Identificar operación comercial.
    const leadProductoId = req.nextUrl.searchParams.get(
      "leadProductoId"
    );

    if (!esUUID(leadProductoId)) {
      return responderError("leadProductoId inválido", 400);
    }

    const { data: operacion, error: errorOperacion } =
      await supabaseAdmin
        .from("lead_producto")
        .select("id, cliente_id, producto_id, created_by, estado")
        .eq("id", leadProductoId)
        .single();

    if (errorOperacion || !operacion) {
      return responderError(
        "Operación comercial no encontrada",
        404
      );
    }

    // 3. Validar permisos sobre esa operación.
    const autorizado = await puedeGestionarOperacion(
      perfil,
      operacion.created_by
    );

    if (!autorizado) {
      return responderError(
        "No tenés permiso para consultar esta operación",
        403
      );
    }

    // 4. Buscar la verificación asociada.
    const { data: verificacion, error: errorVerificacion } =
      await supabaseAdmin
        .from("cliente_verificaciones_identidad")
        .select(
          "id, cliente_id, lead_producto_id, verification_id, link_id, link_url, status, step, created_at"
        )
        .eq("lead_producto_id", operacion.id)
        .eq("cliente_id", operacion.cliente_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (errorVerificacion) {
      return responderError(
        "No se pudo consultar la verificación",
        500
      );
    }

    if (!verificacion) {
      return NextResponse.json({
        existe: false,
        message: "Esta operación todavía no tiene una verificación VU",
        verificacion: null,
      });
    }

    // 5. Consultar VU utilizando el verificationId guardado.
    const baseUrl = process.env.VU_API_BASE_URL;

    if (!baseUrl) {
      throw new Error("Falta VU_API_BASE_URL");
    }

    const tokenVU = await obtenerTokenVU();

    const respuestaVU = await fetch(
      `${baseUrl.replace(/\/$/, "")}/verifications/${encodeURIComponent(
        verificacion.verification_id
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenVU}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!respuestaVU.ok) {
      console.error(
        "VU: error al consultar estado:",
        respuestaVU.status
      );

      return responderError(
        "VU no pudo confirmar el estado de la verificación. Intentá nuevamente.",
        502
      );
    }

    const datosVU = await respuestaVU.json();

    // Nunca devolver ni almacenar el objeto completo de VU:
    // puede contener datos personales y documentos.
    const estadoRecibido: unknown = datosVU.status;

    if (!esEstadoVU(estadoRecibido)) {
      console.error("VU devolvió un estado no contemplado");

      return responderError(
        "VU devolvió un estado que requiere revisión antes de actualizar EAYA.",
        502
      );
    }

    // No degradar una verificación previamente confirmada
    // como exitosa por una respuesta posterior desactualizada.
    const estadoFinal =
      verificacion.status === "success"
        ? "success"
        : estadoRecibido;

    const paso =
      typeof datosVU.step === "string"
        ? datosVU.step.slice(0, 200)
        : verificacion.step;

    // 6. Guardar únicamente información operativa.
    const { data: actualizada, error: errorActualizacion } =
      await supabaseAdmin
        .from("cliente_verificaciones_identidad")
        .update({
          status: estadoFinal,
          step: paso,
          updated_at: new Date().toISOString(),
        })
        .eq("id", verificacion.id)
        .eq("lead_producto_id", operacion.id)
        .eq("cliente_id", operacion.cliente_id)
        .select(
          "id, verification_id, link_id, link_url, status, step, created_at, updated_at"
        )
        .single();

    if (errorActualizacion || !actualizada) {
      return responderError(
        "VU respondió, pero no se pudo actualizar el estado en EAYA",
        500
      );
    }

    return NextResponse.json({
      existe: true,
      puedeContinuarAlta: actualizada.status === "success",
      verificacion: actualizada,
    });
  } catch (error) {
    console.error(
      "Error consultando estado VU:",
      error instanceof Error ? error.message : "Error desconocido"
    );

    return responderError(
      "No fue posible consultar el estado de la verificación",
      502
    );
  }
}
