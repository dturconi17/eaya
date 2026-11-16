import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ClienteGeo = {
  id: string;
  localidad: string | null;
  provincia: string | null;
  localidad_latitud: number | null;
  localidad_longitud: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fechaValida(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function diaSiguiente(fecha: string) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("profiles")
      .select("role, activo")
      .eq("id", user.id)
      .single();
    if (perfilError || !perfil || perfil.activo !== true) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const rol = String(perfil.role).toLowerCase();
    if (!["admin", "gerente", "supervisor", "vendedor"].includes(rol)) {
      return NextResponse.json({ error: "Rol sin acceso" }, { status: 403 });
    }

    const url = new URL(req.url);
    const desde = url.searchParams.get("desde") ?? "";
    const hasta = url.searchParams.get("hasta") ?? "";
    const supervisorId = url.searchParams.get("supervisorId") ?? "";
    const vendedorId = url.searchParams.get("vendedorId") ?? "";

    if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) {
      return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
    }
    const dias = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000 + 1;
    if (dias > 366) return NextResponse.json({ error: "Máximo 366 días" }, { status: 400 });
    if (supervisorId && supervisorId !== "sin_supervisor" && !UUID.test(supervisorId)) {
      return NextResponse.json({ error: "Supervisor inválido" }, { status: 400 });
    }
    if (vendedorId && !UUID.test(vendedorId)) {
      return NextResponse.json({ error: "Vendedor inválido" }, { status: 400 });
    }

    if (rol === "vendedor" && (supervisorId || (vendedorId && vendedorId !== user.id))) {
      return NextResponse.json({ error: "Filtro no autorizado" }, { status: 403 });
    }
    if (rol === "supervisor" && supervisorId && supervisorId !== user.id) {
      return NextResponse.json({ error: "Filtro no autorizado" }, { status: 403 });
    }

    let vendedorPermitido = rol === "vendedor" ? user.id : vendedorId;
    let supervisorPermitido = rol === "supervisor" ? user.id : supervisorId;

    // Supervisores solo pueden consultar vendedores que pertenecen a su equipo.
    if (rol === "supervisor" && vendedorPermitido) {
      const { data: vendedor, error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", vendedorPermitido)
        .eq("supervisor_id", user.id)
        .eq("role", "vendedor")
        .maybeSingle();
      if (error || !vendedor) {
        return NextResponse.json({ error: "Vendedor fuera de tu equipo" }, { status: 403 });
      }
    }

    const clientes: ClienteGeo[] = [];
    for (let offset = 0; ; offset += 500) {
      let consulta = supabaseAdmin
        .from("clientes")
        .select("id, localidad, provincia, localidad_latitud, localidad_longitud")
        .gte("created_at", `${desde}T00:00:00`)
        .lt("created_at", `${diaSiguiente(hasta)}T00:00:00`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + 499);

      if (supervisorPermitido === "sin_supervisor") consulta = consulta.is("supervisor_id", null);
      else if (supervisorPermitido) consulta = consulta.eq("supervisor_id", supervisorPermitido);
      if (vendedorPermitido) consulta = consulta.eq("created_by", vendedorPermitido);

      const { data, error } = await consulta;
      if (error) throw error;
      clientes.push(...((data ?? []) as ClienteGeo[]));
      if ((data ?? []).length < 500) break;
    }

    const grupos = new Map<string, {
      localidad: string; provincia: string; latitud: number; longitud: number; cantidad: number;
    }>();
    let sinUbicacion = 0;

    for (const c of clientes) {
      const lat = c.localidad_latitud;
      const lng = c.localidad_longitud;
      if (!c.localidad || !c.provincia || lat == null || lng == null ||
          !Number.isFinite(lat) || !Number.isFinite(lng) ||
          lat < -56 || lat > -21 || lng < -74 || lng > -53) {
        sinUbicacion++;
        continue;
      }
      const clave = `${c.provincia.trim().toLowerCase()}|${c.localidad.trim().toLowerCase()}|${lat}|${lng}`;
      const grupo = grupos.get(clave);
      if (grupo) grupo.cantidad++;
      else grupos.set(clave, {
        provincia: c.provincia, localidad: c.localidad,
        latitud: lat, longitud: lng, cantidad: 1,
      });
    }

    return NextResponse.json({
      localidades: [...grupos.values()].sort((a, b) => b.cantidad - a.cantidad),
      totalLeads: clientes.length,
      conUbicacion: clientes.length - sinUbicacion,
      sinUbicacion,
    });
  } catch (err) {
    console.error("Error reporte mapa:", err);
    return NextResponse.json({ error: "Error generando el mapa" }, { status: 500 });
  }
}
