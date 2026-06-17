import { supabase } from "@/lib/supabase";

export type ClienteInput = {
  nombre: string;
  apellido: string;
  tipo_documento: string;
  numero_documento: string;
  email?: string;
  celular?: string;
  compania_celular?: string;
  domicilio?: string;
  sexo: "M" | "F" | "X";
  estado_civil: "soltero" | "casado" | "divorciado" | "viudo" | "otro";
  cantidad_hijos: number;
  created_by: string;
};

// 🔍 check duplicado
export async function getClienteByDocumento(
  tipo_documento: string,
  numero_documento: string
) {
  return supabase
    .from("clientes")
    .select(`
      id,
      nombre,
      apellido,
      tipo_documento,
      numero_documento,
      email,
      celular
    `)
    .eq("tipo_documento", tipo_documento)
    .eq("numero_documento", numero_documento)
    .maybeSingle();
}

// 💾 insert cliente
export async function createCliente(data: ClienteInput) {
  return supabase.from("clientes").insert([data]);
}

export async function getClienteById(id: number | string) {
  return supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();
}