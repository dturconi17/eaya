"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/app/context/UserContext"
import { container, card, title, form, input, button } from "@/styles/ui"

export default function CompletarPerfil() {
  const router = useRouter()
  const { user, refreshProfile } = useUser()

  const [nombre, setNombre] = useState("")
  const [sexo, setSexo] = useState("")
  const [fecha, setFecha] = useState("")
  const [loading, setLoading] = useState(false)

  const guardar = async () => {
    if (!nombre || !sexo || !fecha) return

    setLoading(true)

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nombre,
        sexo: sexo,
        fecha_nacimiento: fecha,
      })
      .eq("id", user.id)

    if (error) {
      console.error(error.message)
      setLoading(false)
      return
    }

    await refreshProfile()
    router.replace("/inicio")
  }

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

          <button style={button} onClick={guardar} disabled={loading}>
            {loading ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>
      </div>
    </div>
  )
}