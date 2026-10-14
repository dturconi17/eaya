import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["admin", "supervisor", "vendedor"];
const CAMPOS = "id, verification_id, link_id, link_url, status, step, created_at";

function fallo(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function usuarioAutorizado(req: NextRequest) {
  const cabecera = req.headers.get("authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(cabecera)?.[1];
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuración Supabase incompleta");
  const auth = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, activo")
    .eq("id", data.user.id)
    .single();
  if (perfilError || !perfil || !perfil.activo || !ROLES.includes(perfil.role)) return null;
  return perfil as { id: string; role: string };
}

async function puedeGestionar(perfil: { id: string; role: string }, creador: string | null) {
  if (perfil.role === "admin") return true;
  if (!creador) return false;
  if (creador === perfil.id) return true;
  if (perfil.role !== "supervisor") return false;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("supervisor_id")
    .eq("id", creador)
    .single();
  return !error && data?.supervisor_id === perfil.id;
}

async function generarEnVU(operacionId: string) {
  const base = process.env.VU_API_BASE_URL?.replace(/\/$/, "");
  const id = process.env.VU_CLIENT_ID;
  const secreto = process.env.VU_CLIENT_SECRET;
  if (!base || !id || !secreto) throw new Error("Configuración VU incompleta");
  const basic = Buffer.from(`${id}:${secreto}`, "utf8").toString("base64");
  const oauth = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!oauth.ok) throw new Error(`VU OAuth HTTP ${oauth.status}`);
  const token = await oauth.json();
  if (typeof token.access_token !== "string" || !token.access_token) {
    throw new Error("VU no devolvió access_token");
  }
  const respuesta = await fetch(`${base}/links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "FULL FLOW",
      externalUserId: operacionId,
      adaptiveFlow: true,
      metadata: { origen: "EAYA", tipo: "lead_producto", leadProductoId: operacionId },
    }),
    cache: "no-store",
  });
  if (!respuesta.ok) throw new Error(`VU Links HTTP ${respuesta.status}`);
  const datos = await respuesta.json();
  if (
    typeof datos.linkId !== "string" || !UUID.test(datos.linkId) ||
    typeof datos.verificationId !== "string" || !UUID.test(datos.verificationId) ||
    typeof datos.linkUrl !== "string" || !datos.linkUrl.startsWith("https://")
  ) throw new Error("VU devolvió un enlace incompleto");
  return datos as { linkId: string; verificationId: string; linkUrl: string };
}

export async function POST(req: NextRequest) {
  try {
    const perfil = await usuarioAutorizado(req);
    if (!perfil) return fallo("Sesión inválida o usuario no habilitado", 401);
    let body: { leadProductoId?: unknown };
    try { body = await req.json(); } catch { return fallo("Solicitud JSON inválida", 400); }
    const leadProductoId = body?.leadProductoId;
    if (typeof leadProductoId !== "string" || !UUID.test(leadProductoId)) {
      return fallo("leadProductoId inválido", 400);
    }
    const { data: op, error: errorOp } = await supabaseAdmin
      .from("lead_producto")
      .select("id, cliente_id, producto_id, created_by, estado")
      .eq("id", leadProductoId)
      .single();
    if (errorOp || !op) return fallo("Operación no encontrada", 404);
    if (!(await puedeGestionar(perfil, op.created_by))) return fallo("Sin permiso para esta operación", 403);
    if (op.estado !== "pendiente_datos") return fallo("Operación no habilitada para generar VU", 409);
    const { data: producto, error: errorProducto } = await supabaseAdmin
      .from("productos")
      .select("requiere_validacion")
      .eq("id", op.producto_id)
      .single();
    if (errorProducto || !producto) return fallo("Producto no encontrado", 404);
    if (!producto.requiere_validacion) return fallo("Este producto no requiere VU", 409);

    const buscarExistente = () => supabaseAdmin
      .from("cliente_verificaciones_identidad")
      .select(CAMPOS)
      .eq("lead_producto_id", op.id)
      .eq("cliente_id", op.cliente_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const anterior = await buscarExistente();
    if (anterior.error) return fallo("No se pudo consultar la verificación", 500);
    if (anterior.data) return NextResponse.json({ existente: true, verificacion: anterior.data });

    // INSERT con PK lead_producto_id: solo una petición gana la reserva.
    // Nunca liberar automáticamente la reserva: ante un timeout no sabemos
    // si VU generó el enlace, y reintentar podría consumir otra verificación.
    const reserva = await supabaseAdmin.from("vu_solicitudes_generacion").insert({
      lead_producto_id: op.id,
      estado: "generando",
      created_by: perfil.id,
    });
    if (reserva.error) {
      if (reserva.error.code === "23505") {
        const actual = await buscarExistente();
        if (!actual.error && actual.data) {
          return NextResponse.json({ existente: true, verificacion: actual.data });
        }
        return fallo("Ya existe una solicitud de generación en curso o pendiente de revisión. No se generó otro enlace.", 409);
      }
      console.error("VU reserva:", reserva.error.code);
      return fallo("No se pudo reservar la generación del enlace", 500);
    }

    try {
      const link = await generarEnVU(op.id);
      const guardado = await supabaseAdmin
        .from("cliente_verificaciones_identidad")
        .insert({
          cliente_id: op.cliente_id,
          lead_producto_id: op.id,
          verification_id: link.verificationId,
          link_id: link.linkId,
          link_url: link.linkUrl,
          status: "pending",
          tipo: "FULL FLOW",
          created_by: perfil.id,
        })
        .select(CAMPOS)
        .single();
      if (guardado.error || !guardado.data) {
        console.error("VU: generado, no persistido:", guardado.error?.code, "operación:", op.id);
        await supabaseAdmin.from("vu_solicitudes_generacion")
          .update({ estado: "requiere_revision", updated_at: new Date().toISOString() })
          .eq("lead_producto_id", op.id);
        return fallo("VU pudo generar el enlace, pero EAYA no pudo registrarlo. Requiere revisión; no intentes generarlo otra vez.", 500);
      }
      const marcado = await supabaseAdmin.from("vu_solicitudes_generacion")
        .update({ estado: "generado", updated_at: new Date().toISOString() })
        .eq("lead_producto_id", op.id);
      if (marcado.error) console.error("VU: error marcando reserva:", marcado.error.code);
      return NextResponse.json({ existente: false, verificacion: guardado.data }, { status: 201 });
    } catch (error) {
      console.error("VU: generación incierta para operación:", op.id,
        error instanceof Error ? error.message : "Error desconocido");
      await supabaseAdmin.from("vu_solicitudes_generacion")
        .update({ estado: "requiere_revision", updated_at: new Date().toISOString() })
        .eq("lead_producto_id", op.id);
      return fallo("No se pudo confirmar la generación en VU. La operación quedó bloqueada para evitar duplicados; requiere revisión.", 502);
    }
  } catch (error) {
    console.error("VU POST:", error instanceof Error ? error.message : "Error desconocido");
    return fallo("Error interno al procesar la solicitud", 500);
  }
}