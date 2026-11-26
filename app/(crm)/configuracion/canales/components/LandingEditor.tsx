"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Clase = "rubro" | "subrubro";
type Landing = {
  id?: string;
  slug: string;
  titulo_hero: string;
  subtitulo_hero: string;
  descripcion: string;
  imagen_desktop_path: string;
  imagen_mobile_path: string;
  texto_boton: string;
  beneficios: string[];
  seo_titulo: string;
  seo_descripcion: string;
  estado: "borrador" | "publicado";
};
const empty = (): Landing => ({ slug: "", titulo_hero: "", subtitulo_hero: "", descripcion: "", imagen_desktop_path: "", imagen_mobile_path: "", texto_boton: "Explorar soluciones", beneficios: [], seo_titulo: "", seo_descripcion: "", estado: "borrador" });
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", color: "#111827", background: "#fff" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 12 };
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const tabs = ["General", "Hero", "Beneficios", "SEO", "Publicación"] as const;
type Tab = typeof tabs[number];

export default function LandingEditor({ clase, registroId, nombre, onClose, onSaved }: { clase: Clase; registroId: string; nombre: string; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<Landing>(empty);
  const [tab, setTab] = useState<Tab>("General");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [beneficiosTexto, setBeneficiosTexto] = useState("");
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const bucket = "landings-web";
  const table = clase === "rubro" ? "landing_rubros" : "landing_subrubros";
  const foreignKey = clase === "rubro" ? "rubro_id" : "subrubro_id";

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      const { data: row, error: err } = await supabase.from(table).select("*").eq(foreignKey, registroId).maybeSingle();
      if (!active) return;
      if (err) setError(err.message);
      else if (row) {
        const next: Landing = {
          id: row.id, slug: row.slug ?? "", titulo_hero: row.titulo_hero ?? "", subtitulo_hero: row.subtitulo_hero ?? "",
          descripcion: row.descripcion ?? "", imagen_desktop_path: row.imagen_desktop_path ?? "", imagen_mobile_path: row.imagen_mobile_path ?? "",
          texto_boton: row.texto_boton ?? "", beneficios: Array.isArray(row.beneficios) ? row.beneficios.filter((v: unknown): v is string => typeof v === "string") : [],
          seo_titulo: row.seo_titulo ?? "", seo_descripcion: row.seo_descripcion ?? "", estado: row.estado === "publicado" ? "publicado" : "borrador"
        };
        setData(next); setBeneficiosTexto(next.beneficios.join("\n"));
      } else setData({ ...empty(), slug: slugify(nombre) });
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [table, foreignKey, registroId, nombre]);

  useEffect(() => {
    if (!desktopFile) { setDesktopPreview(null); return; }
    const url = URL.createObjectURL(desktopFile);
    setDesktopPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [desktopFile]);

  useEffect(() => {
    if (!mobileFile) { setMobilePreview(null); return; }
    const url = URL.createObjectURL(mobileFile);
    setMobilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mobileFile]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>, target: "desktop" | "mobile") {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo se permiten imágenes JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Cada imagen debe pesar como máximo 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    if (target === "desktop") setDesktopFile(file);
    else setMobileFile(file);
  }

  function storedImageUrl(path: string): string | null {
    if (!path) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function uploadImage(file: File, target: "desktop" | "mobile"): Promise<string> {
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const folder = clase === "rubro" ? "rubros" : "subrubros";
    const path = `${folder}/${registroId}/${target}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw uploadError;
    return path;
  }

  function imagePicker(target: "desktop" | "mobile") {
    const isDesktop = target === "desktop";
    const selected = isDesktop ? desktopFile : mobileFile;
    const path = isDesktop ? data.imagen_desktop_path : data.imagen_mobile_path;
    const preview = (isDesktop ? desktopPreview : mobilePreview) || storedImageUrl(path);
    return <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{isDesktop ? "Imagen desktop (recomendado 1920 × 700)" : "Imagen mobile (recomendado 750 × 1000)"}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving}
          onChange={e => chooseImage(e, target)} style={{ ...inputStyle, marginTop: 6 }} />
      </label>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: -5 }}>JPG, PNG o WebP. Máximo 5 MB. {selected ? `Seleccionado: ${selected.name}` : path ? "Imagen guardada actualmente" : "Todavía no hay imagen"}.</p>
      {preview && <img src={preview} alt={`Vista previa ${target}`} style={{ display: "block", width: "100%", maxWidth: isDesktop ? 480 : 230, maxHeight: 260, objectFit: "contain", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10 }} />}
    </div>;
  }

  function update<K extends keyof Landing>(key: K, value: Landing[K]) { setData(prev => ({ ...prev, [key]: value })); }
  function field(label: string, key: keyof Landing, multiline = false) {
    const value = String(data[key] ?? "");
    return <label style={labelStyle}>{label}{multiline
      ? <textarea value={value} onChange={e => update(key, e.target.value as never)} rows={3} style={{ ...inputStyle, marginTop: 6, resize: "vertical" }} />
      : <input value={value} onChange={e => update(key, e.target.value as never)} style={{ ...inputStyle, marginTop: 6 }} />}</label>;
  }
  async function save() {
    if (saving) return;
    setError("");
    const slug = data.slug.trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setError("El slug debe contener letras minúsculas, números y guiones, sin espacios."); setTab("General"); return; }
    if (data.estado === "publicado" && (!data.titulo_hero.trim() || !data.seo_titulo.trim())) {
      setError("Para publicar completá al menos el título del hero y el título SEO."); return;
    }
    setSaving(true);
    const uploadedPaths: string[] = [];
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Tu sesión expiró.");
      let desktopPath = data.imagen_desktop_path;
      let mobilePath = data.imagen_mobile_path;
      if (desktopFile) {
        desktopPath = await uploadImage(desktopFile, "desktop");
        uploadedPaths.push(desktopPath);
      }
      if (mobileFile) {
        mobilePath = await uploadImage(mobileFile, "mobile");
        uploadedPaths.push(mobilePath);
      }
      const payload = {
        slug, titulo_hero: data.titulo_hero.trim() || null, subtitulo_hero: data.subtitulo_hero.trim() || null,
        descripcion: data.descripcion.trim() || null, imagen_desktop_path: desktopPath || null,
        imagen_mobile_path: mobilePath || null, texto_boton: data.texto_boton.trim() || null,
        beneficios: beneficiosTexto.split("\n").map(x => x.trim()).filter(Boolean), seo_titulo: data.seo_titulo.trim() || null,
        seo_descripcion: data.seo_descripcion.trim() || null, estado: data.estado, updated_by: auth.user.id,
        updated_at: new Date().toISOString()
      };
      const result = data.id
        ? await supabase.from(table).update(payload).eq("id", data.id)
        : await supabase.from(table).insert({ ...payload, [foreignKey]: registroId, created_by: auth.user.id });
      if (result.error) throw result.error;
      onSaved();
    } catch (e) {
      // Si falla el guardado, retirar solo los archivos nuevos de esta operación.
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from(bucket).remove(uploadedPaths);
        if (cleanupError) console.error("No se pudieron limpiar archivos nuevos:", cleanupError);
      }
      setError(e instanceof Error ? e.message : "No se pudo guardar la landing.");
    }
    finally { setSaving(false); }
  }

  return <div role="presentation" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={`Editar landing de ${nombre}`} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", color: "#111827" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div><h2 style={{ margin: 0 }}>Editar landing</h2><p style={{ color: "#6b7280", marginTop: 6 }}>{clase === "rubro" ? "Rubro" : "Subrubro"}: {nombre}</p></div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Cerrar" style={{ border: 0, background: "transparent", fontSize: 26, cursor: "pointer" }}>×</button>
      </div>
      {loading ? <p>Cargando landing...</p> : <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {tabs.map(t => <button key={t} type="button" onClick={() => setTab(t)} style={{ border: "1px solid #d1d5db", background: tab === t ? "#15803d" : "#fff", color: tab === t ? "#fff" : "#111827", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>{t}</button>)}
        </div>
        {tab === "General" && <>{field("Slug de URL *", "slug")}{field("Descripción comercial", "descripcion", true)}</>}
        {tab === "Hero" && <>{field("Título principal", "titulo_hero")}{field("Subtítulo", "subtitulo_hero", true)}{field("Texto del botón", "texto_boton")}
          {imagePicker("desktop")}{imagePicker("mobile")}</>}
        {tab === "Beneficios" && <label style={labelStyle}>Un beneficio por línea<textarea rows={7} value={beneficiosTexto} onChange={e => setBeneficiosTexto(e.target.value)} style={{ ...inputStyle, marginTop: 6, resize: "vertical" }} /></label>}
        {tab === "SEO" && <>{field("Título SEO", "seo_titulo")}{field("Descripción SEO", "seo_descripcion", true)}</>}
        {tab === "Publicación" && <label style={labelStyle}>Estado<select value={data.estado} onChange={e => update("estado", e.target.value as Landing["estado"])} style={{ ...inputStyle, marginTop: 6 }}><option value="borrador">Borrador</option><option value="publicado">Publicado</option></select><small style={{ display: "block", color: "#6b7280", marginTop: 8 }}>Publicar aquí no habilita todavía la página en en1clic.app. La integración pública se hará en una etapa posterior.</small></label>}
        {error && <p role="alert" style={{ background: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 8 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 18 }}>
          <button type="button" disabled={saving} onClick={onClose} style={{ padding: "10px 16px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f3f4f6", color: "#111827", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
          <button type="button" disabled={saving} onClick={() => void save()} style={{ padding: "10px 16px", border: 0, borderRadius: 8, background: "#15803d", color: "white", fontWeight: 700, cursor: "pointer" }}>{saving ? "Guardando..." : "Guardar landing"}</button>
        </div>
      </>}
    </div>
  </div>;
}
