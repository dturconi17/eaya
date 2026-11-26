"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";

type FAQ = { pregunta: string; respuesta: string };
type DatosWeb = {
  producto_id: string; slug: string; titulo_hero: string; subtitulo_hero: string;
  descripcion_web: string; beneficios: string[]; incluye: string; no_incluye: string;
  cobertura: string; requisitos: string; preguntas_frecuentes: FAQ[];
  permite_llamada: boolean; permite_contratar: boolean;
  modalidad_adquisicion: "en1clic" | "proveedor"; url_proveedor: string;
  imagen_hero_path: string; seo_titulo: string; seo_descripcion: string; estado: "borrador" | "publicado";
};
const tabs = ["Presentación", "Beneficios", "Condiciones", "Contratación", "SEO y publicación"] as const;
const campo = { display: "grid", gap: 6, marginBottom: 16 } as const;
const input = { width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", background: "#fff", boxSizing: "border-box" } as const;
const btn = { padding: "10px 16px", borderRadius: 8, cursor: "pointer", border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600 } as const;
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function DatosWebProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, role, loading: userLoading } = useUser();
  const [producto, setProducto] = useState<{ nombre: string; activo: boolean } | null>(null);
  const [form, setForm] = useState<DatosWeb | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fotoPrincipal, setFotoPrincipal] = useState<string | null>(null);
  const [galeria, setGaleria] = useState<{ imagen_path: string; orden: number }[]>([]);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [quitarHero, setQuitarHero] = useState(false);
  const [cargandoImagenes, setCargandoImagenes] = useState(true);
  const bucket = "productos";
  const urlFoto = (path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  useEffect(() => {
    if (!heroFile) { setHeroPreview(null); return; }
    const url = URL.createObjectURL(heroFile);
    setHeroPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [heroFile]);

  function elegirHero(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    event.target.value = "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setError("La imagen Hero debe ser JPG, PNG o WebP."); return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setError("La imagen Hero no puede superar los 5 MB."); return;
    }
    setHeroFile(archivo);
    setQuitarHero(false);
    setError("");
    setSuccess("");
  }


  useEffect(() => {
    if (userLoading) return;
    if (!user || role !== "admin" || !id) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [p, w] = await Promise.all([
          supabase.from("productos").select("nombre,activo,foto_path").eq("id", id).single(),
          supabase.from("landing_productos").select("*").eq("producto_id", id).maybeSingle()
        ]);
        if (p.error) throw p.error;
        if (w.error) throw w.error;
        if (!alive) return;
        setProducto(p.data);
        setFotoPrincipal(p.data.foto_path ?? null);
        const d = w.data;
        setForm({
          producto_id: id, slug: d?.slug ?? slugify(p.data.nombre),
          titulo_hero: d?.titulo_hero ?? p.data.nombre,
          subtitulo_hero: d?.subtitulo_hero ?? "", descripcion_web: d?.descripcion_web ?? "",
          beneficios: Array.isArray(d?.beneficios) ? d.beneficios : [],
          incluye: d?.incluye ?? "", no_incluye: d?.no_incluye ?? "",
          cobertura: d?.cobertura ?? "", requisitos: d?.requisitos ?? "",
          preguntas_frecuentes: Array.isArray(d?.preguntas_frecuentes) ? d.preguntas_frecuentes : [],
          permite_llamada: d?.permite_llamada ?? true, permite_contratar: d?.permite_contratar ?? false,
          modalidad_adquisicion: d?.modalidad_adquisicion ?? "en1clic", url_proveedor: d?.url_proveedor ?? "",
          imagen_hero_path: d?.imagen_hero_path ?? "",
          seo_titulo: d?.seo_titulo ?? "", seo_descripcion: d?.seo_descripcion ?? "",
          estado: d?.estado ?? "borrador"
        });
        const imagenes = await supabase.from("producto_imagenes")
          .select("imagen_path,orden").eq("producto_id", id).order("orden", { ascending: true });
        if (imagenes.error) throw imagenes.error;
        if (alive) setGaleria(imagenes.data ?? []);
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : "No se pudieron cargar los datos web."); }
      finally { if (alive) { setLoading(false); setCargandoImagenes(false); } }
    })();
    return () => { alive = false; };
  }, [id, user, role, userLoading]);

  function set<K extends keyof DatosWeb>(key: K, value: DatosWeb[K]) {
    setForm(f => f ? { ...f, [key]: value } : f);
    setSuccess("");
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form || saving || role !== "admin") return;
    setError(""); setSuccess("");
    if (!form.slug.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return setError("El slug debe contener letras minúsculas, números y guiones.");
    if (!form.permite_llamada && !form.permite_contratar) return setError("Habilitá al menos una acción para el cliente.");
    if (form.permite_contratar && form.modalidad_adquisicion === "proveedor") {
      try { const url = new URL(form.url_proveedor); if (url.protocol !== "https:") throw new Error(); }
      catch { return setError("Ingresá una URL HTTPS válida para contratar en el proveedor."); }
    }
    if (form.estado === "publicado" && (!form.titulo_hero.trim() || !form.descripcion_web.trim()))
      return setError("Para publicar, completá título y descripción comercial.");
    let nuevoHeroPath: string | null = null;
    try {
      setSaving(true);
      if (heroFile) {
        const extension = heroFile.type === "image/png" ? "png" : heroFile.type === "image/webp" ? "webp" : "jpg";
        nuevoHeroPath = `${id}/web/hero-${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from(bucket).upload(nuevoHeroPath, heroFile, {
          contentType: heroFile.type, cacheControl: "3600", upsert: false
        });
        if (upload.error) throw upload.error;
      }
      const heroAnterior = form.imagen_hero_path;
      const heroFinal = nuevoHeroPath ?? (quitarHero ? "" : heroAnterior);
      const { error: dbError } = await supabase.from("landing_productos").upsert({
        ...form,
        imagen_hero_path: heroFinal || null,
        slug: form.slug.trim(), titulo_hero: form.titulo_hero.trim(),
        beneficios: form.beneficios.map(v => v.trim()).filter(Boolean),
        preguntas_frecuentes: form.preguntas_frecuentes.filter(f => f.pregunta.trim() && f.respuesta.trim()),
        url_proveedor: form.permite_contratar && form.modalidad_adquisicion === "proveedor" ? form.url_proveedor.trim() : null
      }, { onConflict: "producto_id" });
      if (dbError) throw dbError;
      setForm(actual => actual ? { ...actual, imagen_hero_path: heroFinal } : actual);
      setHeroFile(null);
      setQuitarHero(false);
      setSuccess("Datos Web e imagen Hero guardados correctamente.");
      // La imagen anterior se elimina solo después de guardar la nueva referencia.
      if (heroAnterior && heroAnterior !== heroFinal && heroAnterior.startsWith(`${id}/web/`)) {
        const limpieza = await supabase.storage.from(bucket).remove([heroAnterior]);
        if (limpieza.error) console.warn("No se pudo borrar la imagen Hero anterior:", limpieza.error);
      }
    } catch (e) {
      if (nuevoHeroPath) {
        const limpieza = await supabase.storage.from(bucket).remove([nuevoHeroPath]);
        if (limpieza.error) console.warn("No se pudo limpiar la imagen Hero nueva:", limpieza.error);
      }
      setError(e instanceof Error ? e.message : "Error al guardar.");
    }
    finally { setSaving(false); }
  }
  const text = (key: keyof DatosWeb, label: string, multiline = false) => (
    <label style={campo}><strong>{label}</strong>
      {multiline ? <textarea style={input} rows={4} value={String(form?.[key] ?? "")} onChange={e => set(key as "descripcion_web", e.target.value)} />
      : <input style={input} value={String(form?.[key] ?? "")} onChange={e => set(key as "titulo_hero", e.target.value)} />}
    </label>
  );
  if (userLoading || loading) return <main style={{ padding: 32 }}>Cargando Datos Web...</main>;
  if (!user || role !== "admin") return <main style={{ padding: 32 }}>No tenés permisos para acceder a Datos Web.</main>;
  if (!form || !producto) return <main style={{ padding: 32, color: "#b91c1c" }}>{error || "No se encontró el producto."}</main>;
  return <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: 24, color: "#0f172a" }}>
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <button type="button" onClick={() => router.back()} style={btn}>← Volver a productos</button>
      <div style={{ margin: "24px 0" }}><div style={{ color: "#64748b", fontSize: 13 }}>Configuración / Productos / Datos Web</div>
        <h1 style={{ marginBottom: 5 }}>Datos Web · {producto.nombre}</h1>
        <p style={{ color: "#64748b" }}>Configurá cómo se presenta y comercializa este producto en en1clic.</p>
      </div>
      <form onSubmit={save} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 16, marginBottom: 24 }}>
          {tabs.map((t, i) => <button key={t} type="button" onClick={() => setTab(i)} style={{ ...btn, background: tab === i ? "#f0fdf4" : "#fff", color: tab === i ? "#166534" : "#334155", borderColor: tab === i ? "#86efac" : "#cbd5e1" }}>{t}</button>)}
        </div>
        {tab === 0 && <section>
          {text("titulo_hero", "Título comercial")}{text("subtitulo_hero", "Subtítulo")}{text("descripcion_web", "Descripción comercial", true)}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 18, marginTop: 22 }}>
            <h3 style={{ marginBottom: 6 }}>Imágenes del producto</h3>
            <p style={{ color: "#64748b", fontSize: 13 }}>Las fotos de la galería se administran desde Editar producto → Fotos. Aquí se muestran automáticamente.</p>
            {cargandoImagenes ? <p>Cargando imágenes...</p> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 18 }}>
                {fotoPrincipal && <div style={{ border: "1px solid #86efac", borderRadius: 10, padding: 8 }}>
                  <img src={urlFoto(fotoPrincipal)} alt="Foto principal" style={{ width: "100%", height: 110, objectFit: "contain" }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>Foto principal</div>
                </div>}
                {galeria.map(foto => <div key={foto.orden} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                  <img src={urlFoto(foto.imagen_path)} alt={`Foto adicional ${foto.orden}`} style={{ width: "100%", height: 110, objectFit: "contain" }} />
                  <div style={{ fontSize: 12, color: "#64748b" }}>Adicional {foto.orden}</div>
                </div>)}
                {!fotoPrincipal && galeria.length === 0 && <p style={{ color: "#64748b", fontSize: 13 }}>Todavía no hay fotos cargadas en el producto.</p>}
              </div>
            )}
            <button type="button" style={btn} onClick={() => router.push("/configuracion/productos")}>Administrar fotos del producto</button>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 18, marginTop: 22 }}>
            <h3 style={{ marginBottom: 6 }}>Imagen Hero (opcional)</h3>
            <p style={{ color: "#64748b", fontSize: 13 }}>Banner principal de la ficha web. Recomendado: formato horizontal 1600 × 700 px. JPG, PNG o WebP, máximo 5 MB. Si no hay Hero, se utilizará la foto principal del producto.</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={elegirHero} disabled={saving} style={{ ...input, marginBottom: 12 }} />
            {(heroPreview || (!quitarHero && form.imagen_hero_path) || fotoPrincipal) && <div style={{ maxWidth: 650, border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <img src={heroPreview || (!quitarHero && form.imagen_hero_path ? urlFoto(form.imagen_hero_path) : fotoPrincipal ? urlFoto(fotoPrincipal) : "")}
                alt="Vista previa de imagen Hero" style={{ width: "100%", maxHeight: 260, objectFit: "contain", background: "#f8fafc" }} />
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{heroPreview ? "Nueva imagen (pendiente de guardar)" : !quitarHero && form.imagen_hero_path ? "Hero personalizado" : "Usando foto principal como Hero"}</div>
            </div>}
            {(heroFile || (!quitarHero && form.imagen_hero_path)) && <button type="button" style={btn} disabled={saving} onClick={() => { setHeroFile(null); setQuitarHero(true); setSuccess(""); }}>Quitar imagen Hero personalizada</button>}
          </div>
        </section>}
        {tab === 1 && <section>
          <h3>Beneficios principales</h3>
          {form.beneficios.map((v, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input style={input} value={v} onChange={e => set("beneficios", form.beneficios.map((x, j) => j === i ? e.target.value : x))} placeholder={`Beneficio ${i + 1}`} />
            <button type="button" style={btn} onClick={() => set("beneficios", form.beneficios.filter((_, j) => j !== i))}>Quitar</button>
          </div>)}
          <button type="button" style={btn} onClick={() => set("beneficios", [...form.beneficios, ""])}>+ Agregar beneficio</button>
          <div style={{ marginTop: 20 }}>{text("incluye", "Qué incluye", true)}{text("no_incluye", "Qué no incluye", true)}</div>
        </section>}
        {tab === 2 && <section>
          {text("cobertura", "Cobertura", true)}{text("requisitos", "Requisitos para contratar", true)}
          <h3>Preguntas frecuentes</h3>
          {form.preguntas_frecuentes.map((faq, i) => <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <label style={campo}>Pregunta<input style={input} value={faq.pregunta} onChange={e => set("preguntas_frecuentes", form.preguntas_frecuentes.map((f, j) => j === i ? { ...f, pregunta: e.target.value } : f))} /></label>
            <label style={campo}>Respuesta<textarea style={input} rows={2} value={faq.respuesta} onChange={e => set("preguntas_frecuentes", form.preguntas_frecuentes.map((f, j) => j === i ? { ...f, respuesta: e.target.value } : f))} /></label>
            <button type="button" style={btn} onClick={() => set("preguntas_frecuentes", form.preguntas_frecuentes.filter((_, j) => j !== i))}>Quitar pregunta</button>
          </div>)}
          <button type="button" style={btn} onClick={() => set("preguntas_frecuentes", [...form.preguntas_frecuentes, { pregunta: "", respuesta: "" }])}>+ Agregar pregunta</button>
        </section>}
        {tab === 3 && <section>
          <h3>Acciones disponibles para el cliente</h3>
          <label style={{ ...campo, display: "flex", alignItems: "center" }}><input type="checkbox" checked={form.permite_llamada} onChange={e => set("permite_llamada", e.target.checked)} /> Quiero que me llamen</label>
          <label style={{ ...campo, display: "flex", alignItems: "center" }}><input type="checkbox" checked={form.permite_contratar} onChange={e => set("permite_contratar", e.target.checked)} /> Quiero contratar</label>
          <h3>Modalidad de adquisición</h3>
          <label style={{ ...campo, display: "flex", alignItems: "center" }}><input type="radio" name="adquisicion" checked={form.modalidad_adquisicion === "en1clic"} onChange={() => set("modalidad_adquisicion", "en1clic")} /> Se adquiere en en1clic</label>
          <label style={{ ...campo, display: "flex", alignItems: "center" }}><input type="radio" name="adquisicion" checked={form.modalidad_adquisicion === "proveedor"} onChange={() => set("modalidad_adquisicion", "proveedor")} /> Redirige al proveedor</label>
          {form.permite_contratar && form.modalidad_adquisicion === "proveedor" && <label style={campo}><strong>URL de contratación del proveedor (HTTPS)</strong><input type="url" style={input} value={form.url_proveedor} onChange={e => set("url_proveedor", e.target.value)} placeholder="https://proveedor.com/contratar" /></label>}
          <p style={{ color: "#64748b", fontSize: 13 }}>Estas opciones configuran los botones futuros de en1clic. No activan todavía el flujo de contratación.</p>
        </section>}
        {tab === 4 && <section>
          {text("slug", "Slug (identificador web)")}{text("seo_titulo", "Título SEO")}{text("seo_descripcion", "Descripción SEO", true)}
          <label style={campo}><strong>Estado de la ficha web</strong><select style={input} value={form.estado} onChange={e => set("estado", e.target.value as DatosWeb["estado"])}><option value="borrador">Borrador</option><option value="publicado">Publicado</option></select></label>
          {!producto.activo && <p style={{ color: "#b45309" }}>El producto está inactivo. Publicar su ficha no habilita su comercialización.</p>}
        </section>}
        {error && <p role="alert" style={{ color: "#b91c1c", background: "#fff1f2", padding: 12, borderRadius: 8 }}>{error}</p>}
        {success && <p role="status" style={{ color: "#166534", background: "#f0fdf4", padding: 12, borderRadius: 8 }}>{success}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #e2e8f0", paddingTop: 20, marginTop: 20 }}>
          <button type="button" style={btn} onClick={() => router.back()}>Volver</button>
          <button type="submit" disabled={saving} style={{ ...btn, color: "#fff", background: "#0f172a", opacity: saving ? 0.6 : 1 }}>{saving ? "Guardando..." : "Guardar Datos Web"}</button>
        </div>
      </form>
    </div>
  </main>;
}
