import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Faltan variables de entorno" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceKey
    );

    const body = await req.json();

    const {
      email,
      password,
      full_name,
      role,
      punto_venta_id,
    } = body;

    const roleFinal = role || "vendedor";

    // ==============================
    // Validaciones básicas
    // ==============================

    if (!email || !password || !full_name) {
      return NextResponse.json(
        {
          error:
            "Email, contraseña y nombre son obligatorios.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // Validar PDV para vendedores
    // ==============================

    let puntoVentaId = null;

    if (roleFinal === "vendedor") {
      if (!punto_venta_id) {
        return NextResponse.json(
          {
            error:
              "El vendedor debe tener un punto de venta asignado.",
          },
          { status: 400 }
        );
      }

      const {
        data: puntoVenta,
        error: errorPuntoVenta,
      } = await supabaseAdmin
        .from("puntos_venta")
        .select("id, nombre, activo")
        .eq("id", punto_venta_id)
        .single();

      if (errorPuntoVenta || !puntoVenta) {
        return NextResponse.json(
          {
            error:
              "El punto de venta seleccionado no existe.",
          },
          { status: 400 }
        );
      }

      if (!puntoVenta.activo) {
        return NextResponse.json(
          {
            error:
              "El punto de venta seleccionado está inactivo.",
          },
          { status: 400 }
        );
      }

      puntoVentaId = puntoVenta.id;
    }

    // ==============================
    // Crear usuario en Auth
    // ==============================

    const {
      data,
      error: errorAuth,
    } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,

      user_metadata: {
        full_name: full_name.trim(),
        role: roleFinal,
      },
    });

    if (errorAuth) {
      console.error(
        "AUTH ERROR:",
        errorAuth
      );

      return NextResponse.json(
        { error: errorAuth.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          error:
            "El usuario fue creado pero no se obtuvo su identificador.",
        },
        { status: 500 }
      );
    }

    // ==============================
    // Actualizar profile
    // ==============================

    const {
      error: errorProfile,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        punto_venta_id:
          roleFinal === "vendedor"
            ? puntoVentaId
            : null,
      })
      .eq("id", data.user.id);

    if (errorProfile) {
      console.error(
        "PROFILE ERROR:",
        errorProfile
      );

      // Evitamos dejar un usuario creado
      // en Auth sin su configuración completa.
      await supabaseAdmin.auth.admin.deleteUser(
        data.user.id
      );

      return NextResponse.json(
        {
          error:
            "No se pudo asignar el punto de venta al usuario.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: data.user.id,
    });
  } catch (err) {
    console.error(
      "SERVER ERROR:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}