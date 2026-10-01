import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req) {
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

    const { id, activo } = body;

    // ==============================
    // VALIDACIONES
    // ==============================

    if (!id) {
      return NextResponse.json(
        { error: "Id de usuario requerido" },
        { status: 400 }
      );
    }

    if (typeof activo !== "boolean") {
      return NextResponse.json(
        {
          error:
            "El estado activo debe ser true o false.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // VERIFICAR USUARIO
    // ==============================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, activo")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            "No se encontró el usuario.",
        },
        { status: 404 }
      );
    }

    // ==============================
    // BLOQUEAR / DESBLOQUEAR AUTH
    // ==============================

    const {
      error: authError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        id,
        {
          ban_duration: activo
            ? "none"
            : "876000h",
        }
      );

    if (authError) {
      console.error(
        "AUTH STATUS ERROR:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo modificar el acceso del usuario.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // ACTUALIZAR PROFILE
    // ==============================

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        activo,
      })
      .eq("id", id);

    if (updateError) {
      console.error(
        "PROFILE STATUS ERROR:",
        updateError
      );

      // Intentamos revertir Auth para evitar
      // estados inconsistentes.
      await supabaseAdmin.auth.admin.updateUserById(
        id,
        {
          ban_duration: activo
            ? "876000h"
            : "none",
        }
      );

      return NextResponse.json(
        {
          error:
            "No se pudo actualizar el estado del usuario.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      activo,
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