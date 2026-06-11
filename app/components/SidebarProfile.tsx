"use client"

import { useUser } from "@/context/UserContext"

export function SidebarProfile() {
  const { profile } = useUser()

  if (!profile) return null

  return (
    <div style={container}>
      {/* Avatar */}
      <div style={avatar}>
        {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
      </div>

      {/* Info */}
      <div style={info}>
        <p style={name}>{profile.full_name}</p>
        <p style={email}>{profile.email}</p>
        <p style={role}>ADMIN</p>
      </div>
    </div>
  )
}

/* 🎨 ESTILOS */

const container: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
}

const avatar: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: "#2563eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  color: "white",
  fontSize: "16px",
}

const info: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
}

const name: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
}

const email: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#94a3b8",
}

const role: React.CSSProperties = {
  margin: 0,
  fontSize: "10px",
  color: "#64748b",
  textTransform: "uppercase",
}