"use client"

import { useUser } from "@/context/UserContext"

export default function Dashboard() {
  const { user, profile, loading } = useUser()

  if (loading) return <p>Cargando...</p>

  return (
    <div>
      <h1>Bienvenido {profile?.full_name || user?.email}</h1>
      <p>Rol: {profile?.role}</p>
    </div>
  )
}