import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ROLES } from "@/lib/constants/roles";

export type DashboardResumen = {
  totalClientes: number;
  clientesHoy: number;
  clientesSemana: number;
  clientesMes: number;
};

export async function getDashboard(userId: string) {
  // Obtener el rol del usuario
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError) {
    throw profileError;
  }

  let query = supabaseAdmin
    .from("clientes")
    .select("created_at, created_by");

  // Si NO es gerente, filtra por usuario
  if (
  profile.role !== ROLES.GERENTE &&
  profile.role !== ROLES.ADMIN
) {
  query = query.eq("created_by", userId);
}

  const { data: clientes, error } = await query;

  if (error) {
    throw error;
  }

  const ahora = new Date();

  const inicioHoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  );

  const inicioSemana = new Date(inicioHoy);

  // Semana de lunes a domingo
  const dia = inicioHoy.getDay();
  const diferencia = dia === 0 ? 6 : dia - 1;
  inicioSemana.setDate(inicioHoy.getDate() - diferencia);

  const inicioMes = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    1
  );

  return {
    role: profile.role,

    resumen: {
      totalClientes: clientes.length,

      clientesHoy: clientes.filter(
        c => new Date(c.created_at) >= inicioHoy
      ).length,

      clientesSemana: clientes.filter(
        c => new Date(c.created_at) >= inicioSemana
      ).length,

      clientesMes: clientes.filter(
        c => new Date(c.created_at) >= inicioMes
      ).length,
    },
  };
}