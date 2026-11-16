import { NextRequest, NextResponse } from "next/server";

// Guardar este archivo como: app/api/geografia/[recurso]/route.ts
const BASE = "https://apis.datos.gob.ar/georef/api";
const RECURSOS = new Set(["provincias", "localidades"]);

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ recurso: string }> }
) {
    const { recurso } = await context.params;
    if (!RECURSOS.has(recurso)) {
        return NextResponse.json({ error: "Recurso inválido" }, { status: 404 });
    }

    const provincia = request.nextUrl.searchParams.get("provincia");
    if (recurso === "localidades" && (!provincia || !/^\d{2}$/.test(provincia))) {
        return NextResponse.json({ error: "Provincia inválida" }, { status: 400 });
    }

    try {
        const resultados: unknown[] = [];
        const porPagina = 5000;
        let total = 0;
        let inicio = 0;

        do {
            const params = new URLSearchParams({
                max: String(porPagina),
                inicio: String(inicio),
                campos: recurso === "provincias" ? "id,nombre" : "id,nombre,centroide",
            });
            if (recurso === "localidades" && provincia) {
                params.set("provincia", provincia);
            }

            const respuesta = await fetch(`${BASE}/${recurso}?${params}`, {
                next: { revalidate: 86400 },
                signal: AbortSignal.timeout(15000),
            });
            if (!respuesta.ok) throw new Error(`Georef respondió ${respuesta.status}`);

            const json = (await respuesta.json()) as {
                total?: number;
                provincias?: unknown[];
                localidades?: unknown[];
            };

            const pagina =
                recurso === "provincias"
                    ? (json.provincias ?? [])
                    : (json.localidades ?? []);
           

            resultados.push(...pagina);
            total = json.total ?? resultados.length;
            inicio += pagina.length;
            if (pagina.length === 0) break;
        } while (inicio < total);

        return NextResponse.json({ resultados, total: resultados.length });
    } catch (error) {
        console.error("Error consultando Georef:", error);
        return NextResponse.json(
            { error: "No se pudo consultar el catálogo geográfico" },
            { status: 502 }
        );
    }
}