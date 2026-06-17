// Obtener un cliente por ID

import { supabase } from "@/lib/supabase";
export async function getClienteById(id: number) {
  return supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();
}
