import { supabase } from "@/lib/supabase"

export const uploadAvatar = async (file, userId) => {
  console.log("🚀 Subiendo...")

  const fileExt = file.name.split(".").pop()
  const filePath = `${userId}-${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file)

  console.log("📡 Respuesta:", data, error)

  if (error) {
    throw error
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath)

  return urlData.publicUrl
}