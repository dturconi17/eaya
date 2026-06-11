"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleUpdatePassword = async () => {
  setError("")
  setMessage("")

  if (!password || !confirm) {
    setError("Completá ambos campos")
    return
  }

  if (password !== confirm) {
    setError("Las contraseñas no coinciden")
    return
  }

  setLoading(true)

  try {
    // 🔥 clave: dejar que Supabase termine de setear sesión
    await new Promise((res) => setTimeout(res, 300))

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      throw error
    }

    setMessage("Contraseña actualizada ✅")

    setTimeout(() => {
      window.location.href = "/login" // 🔥 más robusto que router
    }, 1000)

} catch (err: unknown) {
  console.error(err)

  setError(
    err instanceof Error
      ? err.message
      : "Error actualizando contraseña"
  )
} finally {
  setLoading(false)
}
  }

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Nueva contraseña</h2>

        <div style={form}>
          <input
            style={input}
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            style={input}
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            style={button}
            onClick={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </button>

          {error && <p style={errorStyle}>{error}</p>}
          {message && <p style={successStyle}>{message}</p>}
        </div>
      </div>
    </div>
  )
}

/* ===== estilos reutilizados ===== */

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

const errorStyle = {
  color: "red",
  fontSize: 14,
}

const successStyle = {
  color: "green",
  fontSize: 14,
}