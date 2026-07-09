import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Faltan variables de entorno" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Id de usuario requerido" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      console.error("DELETE ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}