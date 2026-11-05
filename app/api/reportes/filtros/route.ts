
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    const { data: perfil, error: perfilError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role, activo")
        .eq("id", user.id)
        .single();

    if (perfilError || !perfil || !perfil.activo) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const role = String(perfil.role).toLowerCase();
    const administrador = role === "admin" || role === "gerente";

    if (!administrador && role !== "supervisor" && role !== "vendedor") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const solicitado = req.nextUrl.searchParams.get("supervisorId");
    let supervisorId: string | undefined;

    if (role === "supervisor") {
      if (solicitado && solicitado !== user.id) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 403 }
        );
      }
      supervisorId = user.id;
    } else if (administrador && solicitado) {
      if (solicitado !== "sin_supervisor" && !UUID.test(solicitado)) {
        return NextResponse.json(
          { error: "Supervisor inválido" },
          { status: 400 }
        );
      }
      supervisorId = solicitado;
    }

    if (role === "vendedor" && solicitado) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    let supervisores: {
      id: string;
      nombre: string;
    }[] = [];

    if (administrador) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .ilike("role", "supervisor")
        .order("full_name");

      if (error) throw error;

      supervisores = (data ?? []).map((p) => ({
        id: p.id,
        nombre: p.full_name || p.email || "Sin nombre",
      }));
    } else if (role === "supervisor") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      supervisores = [{
        id: user.id,
        nombre: data.full_name || data.email || "Mi equipo",
      }];
    }

    // Para un vendedor, mostrar únicamente su usuario.
    if (role === "vendedor") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, supervisor_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      return NextResponse.json({
        role,
        supervisores: [],
        vendedores: [{
          id: data.id,
          nombre: data.full_name || data.email || "Mi usuario",
          supervisor_id: data.supervisor_id,
        }],
      }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    // Con supervisor seleccionado: vendedores que figuran
    // históricamente como creadores de sus clientes.
    let idsHistoricos: string[] = [];

    if (supervisorId) {
      const encontrados = new Set<string>();

      for (let offset = 0; ; offset += 500) {
        let query = supabaseAdmin
          .from("clientes")
          .select("created_by")
          .order("id")
          .range(offset, offset + 499);

        query = supervisorId === "sin_supervisor"
          ? query.is("supervisor_id", null)
          : query.eq("supervisor_id", supervisorId);

        const { data, error } = await query;
        if (error) throw error;

        for (const c of data ?? []) {
          if (c.created_by) encontrados.add(c.created_by);
        }

        if ((data ?? []).length < 500) break;
      }

      idsHistoricos = [...encontrados];
    }

    // También incluir los vendedores del equipo actual.
    let queryActuales = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, supervisor_id")
      .ilike("role", "vendedor")
      .order("id");

    if (supervisorId && supervisorId !== "sin_supervisor") {
      queryActuales = queryActuales.eq(
        "supervisor_id",
        supervisorId
      );
    }

    const actuales: {
      id: string;
      full_name: string | null;
      email: string | null;
      supervisor_id: string | null;
    }[] = [];

    if (supervisorId !== "sin_supervisor") {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await queryActuales.range(
          offset,
          offset + 499
        );

        if (error) throw error;
        actuales.push(...(data ?? []));

        if ((data ?? []).length < 500) break;
      }
    }

    const mapa = new Map(
      actuales.map((p) => [p.id, p])
    );

    for (let i = 0; i < idsHistoricos.length; i += 200) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, supervisor_id")
        .in("id", idsHistoricos.slice(i, i + 200));

      if (error) throw error;

      for (const p of data ?? []) {
        mapa.set(p.id, p);
      }
    }

    const vendedores = [...mapa.values()]
      .map((p) => ({
        id: p.id,
        nombre: p.full_name || p.email || "Sin nombre",
        supervisor_id: p.supervisor_id,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return NextResponse.json({
      role,
      supervisores,
      vendedores,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error filtros reportes:", error);
    return NextResponse.json(
      { error: "Error obteniendo filtros" },
      { status: 500 }
    );
  }
}
