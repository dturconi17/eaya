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
  refreshProfile: async () => { },
})

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null) // 👈 nuevo estado
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (user: any) => {
    try {
      if (!user?.id) {
        setProfile(null)
        setRole(null)
        return
      }

      console.log("FETCH PROFILE:", user.email)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
      

      if (error) throw error

      if (!data) {
        setProfile(null)
        setRole(null)
        return
      }

      setProfile(data)
      setRole(data.role)
    } catch (err) {
  console.error("Error cargando perfil:", err)
}
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user)
    }

  }


  
 useEffect(() => {
  let mounted = true

  const init = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!mounted) return

    const currentUser = session?.user ?? null

    setUser(currentUser)

    if (currentUser) {
      await fetchProfile(currentUser)
    }

    if (mounted) {
      setLoading(false)
    }
  }

  init()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    async (event, session) => {

      console.log("AUTH EVENT:", event)

      if (!mounted) return

      const currentUser = session?.user ?? null

      setUser(currentUser)

      if (event === "SIGNED_OUT") {
        setProfile(null)
        setRole(null)
        setLoading(false)
        return
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED"
      ) {
        if (currentUser) {
          await fetchProfile(currentUser)
        }
      }
    }
  )

  return () => {
    mounted = false
    subscription.unsubscribe()
  }

}, [])

  return (
    <UserContext.Provider value={{ user, profile, role, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)