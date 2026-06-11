"use client"

import { useState, CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/context/UserContext"
import { uploadAvatar } from "@/lib/uploadAvatar"
import { UserAvatar } from "@/app/components/UserAvatar"

export default function PerfilPage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useUser()

  const [nombre, setNombre] = useState(profile?.full_name || "")
  const [sexo, setSexo] = useState(profile?.sexo || "")
  const [fecha, setFecha] = useState(profile?.fecha_nacimiento || "")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!user) return;

  if (!e.target.files?.[0]) return;

  try {
    setUploading(true);

    const file = e.target.files[0];

    console.log("📦 Archivo:", file);

    const publicUrl = await uploadAvatar(file, user.id);

    console.log("✅ URL:", publicUrl);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (error) {
      console.error("❌ DB error:", error.message);
    }

    await refreshProfile();
  } catch (err) {
    console.error("❌ Upload error:", err);
  } finally {
    setUploading(false);
  }
};

const guardar = async () => {
  if (!user) return;

  if (!nombre || !sexo) return;

  setLoading(true);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: nombre,
      sexo,
      fecha_nacimiento: fecha,
    })
    .eq("id", user.id);

  if (error) {
    console.error(error.message);
    setLoading(false);
    return;
  }

  await refreshProfile();

  router.replace("/inicio");
  router.refresh();

  setLoading(false);
};

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Mi Perfil</h2>

        {/* 👤 Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <UserAvatar
            name={profile?.full_name ?? undefined}
            avatarUrl={profile?.avatar_url ?? undefined}
            size={60}
          />

          <label style={uploadBtn}>
            {uploading ? "Subiendo..." : "Cambiar foto"}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div style={form}>
          <input
            style={input}
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <select
            style={input}
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
          >
            <option value="">Seleccionar sexo</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Prefiero no comentarlo">
              Prefiero no comentarlo
            </option>
          </select>

          <input
            style={input}
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />

          <button style={button} onClick={guardar} disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* 🎨 estilos reutilizados */
const container: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f4f6f8",
}

const card: CSSProperties = {
  width: 420,
  padding: 30,
  borderRadius: 12,
  background: "white",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
}

const title: CSSProperties   = {
  fontSize: 24,
  marginBottom: 20,
}

const form: CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 15,
  marginTop: 20,
}

const input: CSSProperties   = {
  padding: "14px 16px",
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid #ccc",
}

const button: CSSProperties = {
  padding: "14px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  background: "#4f46e5",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
}

const uploadBtn: CSSProperties = {
  background: "#e5e7eb",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
}