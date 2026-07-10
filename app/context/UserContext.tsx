"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";

type UserContextType = {
  user: any;
  profile: any;
  role: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  refreshProfile: async () => {},
});

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (currentUser: any) => {
    if (!currentUser?.id) {
      setProfile(null);
      setRole(null);
      return;
    }

    console.log("Cargando profile:", currentUser.email);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Error obteniendo profile:", error);
      return;
    }

    setProfile(data);
    setRole(data?.role ?? null);
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  // ==========================
  // Cargar sesión inicial
  // ==========================

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);

      setLoading(false);
    };

    loadSession();
  }, []);

  // ==========================
  // Escuchar cambios de auth
  // ==========================

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH:", event);

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setRole(null);
        return;
      }

      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ==========================
  // Cuando cambia el usuario
  // ==========================

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRole(null);
      return;
    }

    fetchProfile(user);
  }, [user, fetchProfile]);

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
  );
}

export const useUser = () => useContext(UserContext);