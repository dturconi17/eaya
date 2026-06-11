"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string | null
  supervisor_id: string | null
  sexo: string | null
  fecha_nacimiento: string | null
  avatar_url: string | null
}

type UserContextType = {
  user: User | null
  profile: Profile | null
  role: string | null
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

export const UserProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (user: User) => {
    if (!user.id) {
      setProfile(null)
      setRole(null)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error("Error cargando profile:", error.message)
      setProfile(null)
      setRole(null)
      return
    }

    setProfile(data as Profile | null)
    setRole(data?.role ?? "vendedor")
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
      const currentUser = data.user

      if (!mounted) return

      setUser(currentUser)

      if (currentUser) {
        await fetchProfile(currentUser)
      }

      setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null

      setUser(currentUser)

      if (currentUser) {
        await fetchProfile(currentUser)
      } else {
        setProfile(null)
        setRole(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)