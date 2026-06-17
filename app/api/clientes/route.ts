import { NextResponse } from "next/server";
import {
  createCliente,
  getClienteByDocumento,
} from "@/lib/sql/clientes";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      nombre,
      apellido,
      tipo_documento,
      numero_documento,
      email,
      celular,
      compania_celular,
      domicilio,
      sexo,
      estado_civil,
      cantidad_hijos,
      created_by,
    } = body;

    // 🔍 duplicado
    const { data: existe } = await getClienteByDocumento(
      tipo_documento,
      numero_documento
    );

    if (existe) {
      return NextResponse.json(
        { error: "Cliente ya existe" },
        { status: 409 }
      );
    }

    // 💾 insert
    const { error } = await createCliente({
      nombre,
      apellido,
      tipo_documento,
      numero_documento,
      email,
      celular,
      compania_celular,
      domicilio,
      sexo,
      estado_civil,
      cantidad_hijos,
      created_by,
    });

    if (error) {
      return NextResponse.json(
        { error: "Error al crear cliente" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Cliente creado correctamente" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}