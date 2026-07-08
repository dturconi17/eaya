"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type UserContextType = {
  user: any
  profile: any
  role: string | null // 👈 agregamos esto
  loading: boolean
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  refreshProfile: async () => {},
})

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null) // 👈 nuevo estado
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (user: any) => {
    if (!user?.id) {
      setProfile(null)
      setRole(null)
      return
    }
    console.log("FETCH PROFILE USER:", user?.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("*") // ya trae role si existe en la tabla
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error("Error cargando profile:", error.message)
      setProfile(null)
      setRole(null)
      return
    }

    setProfile(data)
    setRole(data?.role || "vendedor") // 👈 acá se asigna el role
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user)
    }
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const currentUser = data.user ?? null

      if (!mounted) return

      setUser(currentUser)

      if (currentUser) {
        await fetchProfile(currentUser)
      }

      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null

        setUser(currentUser)

        if (currentUser) {
          await fetchProfile(currentUser)
        } else {
          setProfile(null)
          setRole(null)
        }
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, profile, role, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)