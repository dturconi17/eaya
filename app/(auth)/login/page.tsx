"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<"login" | "signup" | "reset">("login")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")

  // ================= LOGIN =================
const handleLogin = async () => {
  console.log("CLICK LOGIN");
  if (!email || !password) {
    setError("Ingresá email y contraseña");
    return;
  }

  setLoading(true);
  setError(null);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("LOGIN DATA:", data);
  console.log("LOGIN ERROR:", error);

  if (error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("invalid")) {
      setError("Email o contraseña incorrectos");
    } else {
      setError("Error al iniciar sesión");
    }

    setLoading(false);
    return;
  }

  if (!data?.user) {
    setError("No se pudo iniciar sesión");
    setLoading(false);
    return;
  }

  // ✅ navegación correcta
  console.log("REDIRECT A /inicio");
  router.replace("/inicio");
  router.refresh();
};

  

// ================= SIGN UP =================
const handleSignUp = async () => {
  setLoading(true)
  setError(null)
  setMessage(null)

  if (!email || !password || !nombre) {
    setError("Completá todos los campos")
    setLoading(false)
    return
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: nombre,
      },
    },
  })

  if (error) {
    setError(error.message)
    setLoading(false)
    return
  }

  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      email: data.user.email,
      full_name: nombre,
    })
  }

  setMessage("Usuario creado. Revisá tu email 📩")
  setLoading(false)
}
  // ================= RESET =================
  const handleResetPassword = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!email) {
      setError("Ingresá tu email")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage("Te enviamos un email para recuperar contraseña 🔑")
    }

    setLoading(false)
  }

  // ================= UI =================
  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>
          {mode === "login"
            ? "Ingresar"
            : mode === "signup"
            ? "Crear cuenta"
            : "Recuperar contraseña"}
        </h2>

        {/* 🔁 selector */}
        <div style={tabs}>
          <button onClick={() => setMode("login")} style={tab(mode === "login")}>
            Login
          </button>
          <button onClick={() => setMode("signup")} style={tab(mode === "signup")}>
            Registro
          </button>
          <button onClick={() => setMode("reset")} style={tab(mode === "reset")}>
            Reset
          </button>
        </div>

        <form
  style={form}
  onSubmit={(e) => e.preventDefault()}
>
  <input
    style={input}
    type="email"
    placeholder="Email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />

  {mode === "signup" && (
    <input
      style={input}
      type="text"
      placeholder="Nombre completo"
      value={nombre}
      onChange={(e) => setNombre(e.target.value)}
    />
  )}

  {mode !== "reset" && (
    <input
      style={input}
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
  )}

  <button
    type="button"
    style={button}
    disabled={loading}
    onClick={
      mode === "login"
        ? handleLogin
        : mode === "signup"
        ? handleSignUp
        : handleResetPassword
    }
  >
    {loading
      ? "Procesando..."
      : mode === "login"
      ? "Ingresar"
      : mode === "signup"
      ? "Crear cuenta"
      : "Enviar email"}
  </button>

  {error && <p style={errorStyle}>{error}</p>}
  {message && <p style={successStyle}>{message}</p>}
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

const tabs = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
}

const tab = (active: boolean) => ({
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: active ? "#4f46e5" : "#e5e7eb",
  color: active ? "white" : "black",
})

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