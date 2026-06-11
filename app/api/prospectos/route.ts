import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {

  try {

    const { data, error } = await supabase
      .from("prospectos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);

  } catch (err) {

    console.log(err);

    return NextResponse.json(
      {
        error: "Error obteniendo prospectos"
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const { data, error } = await supabase
      .from("prospectos")
      .insert([
        {
          nombre: body.nombre,
          apellido: body.apellido,
          documento: body.documento,
          sexo: body.sexo,
          fecha_nacimiento: body.fecha_nacimiento,
          celular: body.celular,
          email: body.email
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);

  } catch (err) {

    console.log(err);

    return NextResponse.json(
      {
        error: "Error creando prospecto"
      },
      { status: 500 }
    );
  }
}