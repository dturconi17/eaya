
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET() {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      mensaje: "IP publica de salida de EAYA",
      ip: data.ip,
      region: "iad1",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener la IP de salida" },
      { status: 500 }
    );
  }
}