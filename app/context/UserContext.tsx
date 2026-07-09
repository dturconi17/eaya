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
      console.error(err)
      setProfile(null)
      setRole(null)
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
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        const currentUser = session?.user ?? null

        setUser(currentUser)

        if (currentUser) {
          await fetchProfile(currentUser)
        }
      } catch (e) {
        console.error("Error inicializando usuario:", e)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null

        if (!mounted) return

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