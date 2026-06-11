"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/context/UserContext"

export default function CompletarPerfil() {
  const { user, refreshProfile } = useUser()

  const [nombre, setNombre] = useState("")
  const [sexo, setSexo] = useState("")
  const [fecha, setFecha] = useState("")
  const [loading, setLoading] = useState(false)

 const guardar = async () => {
  if (!user) return;

  if (!nombre || !sexo || !fecha) {
    return;
  }

  setLoading(true);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: nombre,
      sexo,
      fecha_nacimiento: fecha,
    })
    .eq("id", user.id);

  if (error) {
    alert(error.message);
    setLoading(false);
    return;
  }

  await refreshProfile();

  window.location.href = "/inicio";
};

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Completar perfil</h2>

        <form style={form} onSubmit={(e) => e.preventDefault()}>
          <input
            style={input}
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <select style={input} value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">Seleccionar sexo</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Prefiero no comentarlo">Prefiero no comentarlo</option>
          </select>

          <input
            style={input}
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />

<button
  type="button"
  style={button}
  onClick={guardar}
  disabled={loading}
>
  {loading ? "Guardando..." : "Guardar y continuar"}
</button>
        </form>
      </div>
    </div>
  )
}


// ================= STYLES =================

const container = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f4f6f8",
}

const card = {
  width: 400,
  padding: 30,
  borderRadius: 12,
  background: "white",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
}

const title = {
  fontSize: 24,
  marginBottom: 20,
}

const form = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 15,
}

const input = {
  padding: "14px 16px",
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid #ccc",
}

const button = {
  padding: "14px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  background: "#4f46e5",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
}