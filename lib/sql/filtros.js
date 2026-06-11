export async function buildFiltroVendedores({
  supabase,
  supervision,
  vendedor
}) {

  // =========================
  // 🔹 FILTRO DIRECTO VENDEDOR
  // =========================
  if (vendedor && vendedor !== "todo") {
    return `
      AND UPPER(LTRIM(RTRIM(v.nombre_vendedor)))
      COLLATE Latin1_General_CI_AI = '${vendedor
        .replace(/'/g, "''")
        .toUpperCase()}'
    `;
  }

  // =========================
  // 🔹 FILTRO POR SUPERVISION
  // =========================
  if (supervision && supervision !== "todo") {

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("role", "vendedor")
      .eq("supervisor_id", supervision);

    if (error) {
      console.error("Error trayendo vendedores:", error);
      return "AND 1=0";
    }

    if (!data || data.length === 0) {
      return "AND 1=0";
    }

    const nombres = data
      .map(v => v.full_name?.trim())
      .filter(Boolean)
      .map(v => `'${v.replace(/'/g, "''").toUpperCase()}'`)
      .join(",");

    return `
      AND UPPER(LTRIM(RTRIM(v.nombre_vendedor)))
      COLLATE Latin1_General_CI_AI 
      IN (${nombres})
    `;
  }

  // =========================
  // 🔹 SIN FILTRO
  // =========================
  return "";
}