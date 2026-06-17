"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getClienteById } from "@/lib/sql/clientes";
import type { Cliente } from "../types";

export default function ClientePage() {

    const { id } = useParams();

    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [loading, setLoading] = useState(true);

useEffect(() => {
  async function cargarCliente() {
    console.log("ID recibido:", id);

    const { data, error } = await getClienteById(id as string);

    console.log("Resultado:", data);
    console.log("Error:", error);

    if (data) {
      setCliente(data);
    }

    setLoading(false);
  }

  cargarCliente();
}, [id]);

    if (loading) {
        return <p>Cargando cliente...</p>;
    }

    if (!cliente) {
        return <p>Cliente no encontrado.</p>;
    }

    return (

        <div>

            <h1>
                {cliente.nombre} {cliente.apellido}
            </h1>

        </div>

    );

}