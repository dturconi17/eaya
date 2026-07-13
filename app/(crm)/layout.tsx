"use client"

import { SidebarMenu } from "@/app/components/SidebarMenu"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUser } from "@/app/context/UserContext"
import SessionTimeout from "@/app/components/SessionTimeout"

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const { user, profile, loading } = useUser()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/login")
      return
    }

    if (pathname === "/completar-perfil") {
      return
    }

    const nombreInvalido =
      profile &&
      (
        !profile.full_name ||
        profile.full_name === profile.email
      )

    if (nombreInvalido) {
      router.replace("/completar-perfil")
    }
  }, [loading, pathname, profile, router, user])

  // Mientras se verifica la sesión
  if (loading || (user && !profile)) {
    return (
      <div style={loadingContainer}>
        <p style={{ color: "#64748b" }}>
          Cargando CRM...
        </p>
      </div>
    )
  }

  // Esperando el redirect al login
  if (!user) {
    return null
  }

  // Esperando el redirect a completar perfil
  if (
    pathname !== "/completar-perfil" &&
    profile &&
    (
      !profile.full_name ||
      profile.full_name === profile.email
    )
  ) {
    return null
  }

  console.log({
    loading,
    user: !!user,
    profile,
  })

  return (
    <>
      <SessionTimeout /> 
      <div style={container}>
        {/* SIDEBAR */}
        <aside style={sidebar}>
          {/* HEADER */}
          <div style={logoContainer}>
            <img src="/eaya.png" alt="Logo" style={logo} />
            <h2 style={title}>CRM de EAYA</h2>
            <p style={subtitle}>Panel de control</p>
          </div>

          {/* MENÚ */}
          <div style={menuContainer}>
            <SidebarMenu />
          </div>
        </aside>

        {/* CONTENIDO */}
        <main style={content}>
          {children}
        </main>
      </div>
    </>
  )
}

/* ================== ESTILOS ================== */

const container: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  overflow: "hidden",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
}

/* SIDEBAR */
const sidebar: React.CSSProperties = {
  width: "320px",
  backgroundColor: "#0f172a",
  color: "white",
  display: "flex",
  flexDirection: "column",
  boxShadow: "2px 0 12px rgba(0,0,0,0.2)",
  flexShrink: 0,
}

/* HEADER */
const logoContainer: React.CSSProperties = {
  padding: "18px 16px",
  textAlign: "center",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
}

const logo: React.CSSProperties = {
  maxWidth: "180px",
  maxHeight: "70px",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  marginBottom: "10px",
}

const title: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "0.5px",
}

const subtitle: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: "12px",
  color: "#94a3b8",
}

/* MENÚ */
const menuContainer: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "14px 10px",
}

/* CONTENIDO */
const content: React.CSSProperties = {
  flex: 1,
  padding: "28px",
  overflowY: "auto",
  backgroundColor: "#f1f5f9",
}

/* LOADING */
const loadingContainer: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f8fafc",
}