"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, CheckCircle2, Edit3, Plus, Power, Save, Search, X
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type TipoRespuesta =
  | "binaria" | "ternaria" | "texto" | "texto_largo"
  | "numero" | "fecha" | "seleccion" | "seleccion_multiple";

type Configuracion = {
  opciones?: string[];
  minimo?: number | null;
  maximo?: number | null;
};

type Pregunta = {
  id: string;
  pregunta: string;
  codigo: string;
  descripcion: string | null;
  categoria: string | null;
  tipo_pregunta: "trigger_producto";
  tipo_respuesta: TipoRespuesta;
  configuracion: Configuracion | null;
  orden: number;
  activo: boolean;
};

type Trigger = {
  id: string;
  pregunta_id: string;
  producto_id: string;
  valor_disparador: any;
  activo: boolean;
  preguntas_interes: Pregunta | Pregunta[] | null;
};

type Producto = { id: string; nombre: string };

type FormPregunta = {
  pregunta: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  tipo_respuesta: TipoRespuesta;
  opciones: string[];
  nuevaOpcion: string;
  minimo: string;
  maximo: string;
  orden: string;
  activo: boolean;
  valor_disparador: any;
};

const CATEGORIAS = [
  "Familia","Hogar","Mascotas","Movilidad","Finanzas","Salud",
  "Educación","Trabajo","Viajes","Tecnología","Otros"
];

const FORM_INICIAL: FormPregunta = {
  pregunta: "", codigo: "", descripcion: "", categoria: "",
  tipo_respuesta: "texto", opciones: [], nuevaOpcion: "",
  minimo: "", maximo: "", orden: "0", activo: true,
  valor_disparador: "",
};

function preguntaDe(trigger: Trigger): Pregunta | null {
  return Array.isArray(trigger.preguntas_interes)
    ? trigger.preguntas_interes[0] ?? null
    : trigger.preguntas_interes;
}

function valorInicial(tipo: TipoRespuesta) {
  if (tipo === "binaria" || tipo === "ternaria") return "1";
  if (tipo === "seleccion_multiple") return [];
  return "";
}

export default function PreguntasTriggerProductoPage() {
  const params = useParams();
  const router = useRouter();

  const productoId = useMemo(() => {
    const valor = params?.id ?? params?.productoId ?? params?.productosId;
    return Array.isArray(valor) ? valor[0] : valor;
  }, [params]);

  const [producto, setProducto] = useState<Producto | null>(null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormPregunta>(FORM_INICIAL);
  const [editandoPreguntaId, setEditandoPreguntaId] = useState<string | null>(null);
  const [editandoTriggerId, setEditandoTriggerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");

  useEffect(() => {
    if (productoId) cargar();
  }, [productoId]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return triggers;
    return triggers.filter((t) => {
      const p = preguntaDe(t);
      return [p?.pregunta ?? "", p?.codigo ?? "", p?.categoria ?? ""]
        .some((v) => v.toLowerCase().includes(texto));
    });
  }, [triggers, busqueda]);

  function mostrar(texto: string, tipo: "success" | "error") {
    setMensaje(texto);
    setTipoMensaje(tipo);
  }

  function codigoDesde(texto: string) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function etiquetaTipo(tipo: TipoRespuesta) {
    const mapa: Record<TipoRespuesta, string> = {
      binaria: "Sí / No",
      ternaria: "Sí / No / Neutro",
      texto: "Texto corto",
      texto_largo: "Texto largo",
      numero: "Número",
      fecha: "Fecha",
      seleccion: "Selección única",
      seleccion_multiple: "Selección múltiple",
    };
    return mapa[tipo];
  }

  function etiquetaValor(valor: any, tipo?: TipoRespuesta) {
    if (tipo === "binaria" || tipo === "ternaria") {
      if (String(valor) === "1") return "Sí / Positivo";
      if (String(valor) === "-1") return "No / Negativo";
      return "Neutro";
    }
    if (tipo === "seleccion_multiple" && Array.isArray(valor)) {
      return valor.join(", ");
    }
    return String(valor ?? "");
  }

  async function cargar() {
    try {
      setLoading(true);

      const [productoRes, triggersRes] = await Promise.all([
        supabase.from("productos").select("id,nombre").eq("id", productoId).single(),
        supabase.from("preguntas_producto_triggers")
          .select(`
            id,pregunta_id,producto_id,valor_disparador,activo,
            preguntas_interes!preguntas_producto_triggers_pregunta_id_fkey(
              id,pregunta,codigo,descripcion,categoria,tipo_pregunta,
              tipo_respuesta,configuracion,orden,activo
            )
          `)
          .eq("producto_id", productoId)
          .order("created_at", { ascending: true }),
      ]);

      if (productoRes.error) throw productoRes.error;
      if (triggersRes.error) throw triggersRes.error;

      setProducto(productoRes.data as Producto);
      setTriggers((triggersRes.data ?? []) as Trigger[]);
    } catch (error: any) {
      mostrar(error.message || "No se pudieron cargar las preguntas trigger.", "error");
    } finally {
      setLoading(false);
    }
  }

  function nueva() {
    setForm(FORM_INICIAL);
    setEditandoPreguntaId(null);
    setEditandoTriggerId(null);
    setMensaje("");
    setTipoMensaje("");
    setModal(true);
  }

  function editar(trigger: Trigger) {
    const p = preguntaDe(trigger);
    if (!p) return;

    setForm({
      pregunta: p.pregunta,
      codigo: p.codigo,
      descripcion: p.descripcion ?? "",
      categoria: p.categoria ?? "",
      tipo_respuesta: p.tipo_respuesta,
      opciones: p.configuracion?.opciones ?? [],
      nuevaOpcion: "",
      minimo: p.configuracion?.minimo == null ? "" : String(p.configuracion.minimo),
      maximo: p.configuracion?.maximo == null ? "" : String(p.configuracion.maximo),
      orden: String(p.orden),
      activo: trigger.activo,
      valor_disparador: trigger.valor_disparador,
    });
    setEditandoPreguntaId(p.id);
    setEditandoTriggerId(trigger.id);
    setMensaje("");
    setTipoMensaje("");
    setModal(true);
  }

  function agregarOpcion() {
    const opcion = form.nuevaOpcion.trim();
    if (!opcion) return;
    if (form.opciones.some((x) => x.toLowerCase() === opcion.toLowerCase())) {
      mostrar("La opción ya existe.", "error");
      return;
    }
    setForm((f) => ({ ...f, opciones: [...f.opciones, opcion], nuevaOpcion: "" }));
  }

  function quitarOpcion(indice: number) {
    setForm((f) => ({
      ...f,
      opciones: f.opciones.filter((_, i) => i !== indice),
      valor_disparador:
        f.tipo_respuesta === "seleccion_multiple"
          ? (Array.isArray(f.valor_disparador)
              ? f.valor_disparador.filter((x: string) => x !== f.opciones[indice])
              : [])
          : f.valor_disparador === f.opciones[indice] ? "" : f.valor_disparador,
    }));
  }

  function alternarMultiple(actual: any, opcion: string, onChange: (v: string[]) => void) {
    const lista = Array.isArray(actual) ? actual : [];
    onChange(
      lista.includes(opcion)
        ? lista.filter((x: string) => x !== opcion)
        : [...lista, opcion]
    );
  }

  function editorRespuesta(
    tipo: TipoRespuesta,
    configuracion: Configuracion | null,
    valor: any,
    onChange: (valor: any) => void
  ) {
    if (tipo === "binaria" || tipo === "ternaria") {
      return (
        <select style={s.input} value={String(valor ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seleccioná una respuesta</option>
          <option value="1">Sí / Positivo</option>
          <option value="-1">No / Negativo</option>
          {tipo === "ternaria" && <option value="0">Neutro</option>}
        </select>
      );
    }

    if (tipo === "seleccion") {
      return (
        <select style={s.input} value={valor ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seleccioná una respuesta</option>
          {(configuracion?.opciones ?? []).map((op) => <option key={op}>{op}</option>)}
        </select>
      );
    }

    if (tipo === "seleccion_multiple") {
      const elegidas = Array.isArray(valor) ? valor : [];
      return (
        <div style={s.checkGrid}>
          {(configuracion?.opciones ?? []).map((op) => (
            <label key={op} style={s.checkOption}>
              <input
                type="checkbox"
                checked={elegidas.includes(op)}
                onChange={() => alternarMultiple(elegidas, op, onChange)}
              />
              {op}
            </label>
          ))}
        </div>
      );
    }

    if (tipo === "numero") {
      return (
        <input
          type="number"
          step="any"
          min={configuracion?.minimo ?? undefined}
          max={configuracion?.maximo ?? undefined}
          style={s.input}
          value={valor ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    if (tipo === "fecha") {
      return <input type="date" style={s.input} value={valor ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }

    if (tipo === "texto_largo") {
      return <textarea style={s.textarea} value={valor ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }

    return <input style={s.input} value={valor ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }

  function validar() {
    if (!form.pregunta.trim()) return "Ingresá la pregunta.";
    if (!form.categoria) return "Seleccioná una categoría.";

    const orden = Number(form.orden || 0);
    if (!Number.isInteger(orden) || orden < 0) return "El orden debe ser un entero mayor o igual a cero.";

    const usaOpciones = form.tipo_respuesta === "seleccion" || form.tipo_respuesta === "seleccion_multiple";
    if (usaOpciones && form.opciones.length === 0) return "Agregá al menos una opción.";

    if (
      form.tipo_respuesta === "seleccion_multiple"
        ? !Array.isArray(form.valor_disparador) || form.valor_disparador.length === 0
        : String(form.valor_disparador ?? "").trim() === ""
    ) return "Indicá la respuesta disparadora.";

    return null;
  }

  async function guardar() {
    const errorValidacion = validar();
    if (errorValidacion) {
      mostrar(errorValidacion, "error");
      return;
    }

    const minimo = form.minimo === "" ? null : Number(form.minimo);
    const maximo = form.maximo === "" ? null : Number(form.maximo);
    if (form.tipo_respuesta === "numero" && minimo !== null && maximo !== null && minimo > maximo) {
      mostrar("El mínimo no puede ser mayor que el máximo.", "error");
      return;
    }

    const configuracion: Configuracion = {};
    if (form.tipo_respuesta === "seleccion" || form.tipo_respuesta === "seleccion_multiple") {
      configuracion.opciones = form.opciones;
    }
    if (form.tipo_respuesta === "numero") {
      configuracion.minimo = minimo;
      configuracion.maximo = maximo;
    }

    try {
      setGuardando(true);

      const payloadPregunta = {
        pregunta: form.pregunta.trim(),
        codigo: form.codigo.trim() || codigoDesde(form.pregunta),
        descripcion: form.descripcion.trim() || null,
        categoria: form.categoria,
        tipo_pregunta: "trigger_producto",
        tipo_respuesta: form.tipo_respuesta,
        configuracion,
        orden: Number(form.orden || 0),
        activo: form.activo,
        updated_at: new Date().toISOString(),
      };

      let idPregunta = editandoPreguntaId;

      if (editandoPreguntaId) {
        const { error } = await supabase.from("preguntas_interes")
          .update(payloadPregunta).eq("id", editandoPreguntaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("preguntas_interes")
          .insert(payloadPregunta).select("id").single();
        if (error) throw error;
        idPregunta = data.id;
      }

      if (editandoTriggerId) {
        const { error } = await supabase.from("preguntas_producto_triggers")
          .update({
            valor_disparador: form.valor_disparador,
            activo: form.activo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editandoTriggerId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("preguntas_producto_triggers").insert({
          producto_id: productoId,
          pregunta_id: idPregunta,
          valor_disparador: form.valor_disparador,
          activo: form.activo,
        });
        if (error) throw error;
      }

      setModal(false);
      mostrar(editandoTriggerId ? "Pregunta trigger actualizada." : "Pregunta trigger creada.", "success");
      await cargar();
    } catch (error: any) {
      mostrar(error.message || "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(trigger: Trigger) {
    const confirmar = confirm(
      "La pregunta dejará de utilizarse para este producto, pero se conservará toda la información histórica. ¿Continuar?"
    );

    if (!confirmar) return;

    try {
      const ahora = new Date().toISOString();

      const { error: triggerError } = await supabase
        .from("preguntas_producto_triggers")
        .update({
          activo: false,
          updated_at: ahora,
        })
        .eq("id", trigger.id);

      if (triggerError) throw triggerError;

      const { error: preguntaError } = await supabase
        .from("preguntas_interes")
        .update({
          activo: false,
          updated_at: ahora,
        })
        .eq("id", trigger.pregunta_id);

      if (preguntaError) throw preguntaError;

      mostrar(
        "La pregunta fue desactivada. El historial se conservó.",
        "success"
      );

      await cargar();
    } catch (error: any) {
      mostrar(
        error.message || "No fue posible desactivar la pregunta.",
        "error"
      );
    }
  }

  if (loading) return <main style={s.page}><div style={s.empty}>Cargando...</div></main>;

  return (
    <main style={s.page}>
      <div style={s.container}>
        <button style={s.backButton} onClick={() => router.push("/configuracion/productos")}>
          <ArrowLeft size={17} /> Volver a productos
        </button>

        <header style={s.header}>
          <div>
            <div style={s.breadcrumb}>Configuración / Productos / Preguntas trigger</div>
            <h1 style={s.title}>Preguntas trigger</h1>
            <p style={s.subtitle}>
              Administrá las preguntas y respuestas que sugieren <strong>{producto?.nombre}</strong>.
            </p>
          </div>
          <button style={s.primary} onClick={nueva}><Plus size={18} /> Nueva pregunta</button>
        </header>

        {mensaje && !modal && (
          <div style={tipoMensaje === "success" ? s.success : s.error}>
            {tipoMensaje === "success" ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
            {mensaje}
          </div>
        )}

        <section style={s.card}>
          <div style={s.toolbar}>
            <div style={s.searchBox}>
              <Search size={18} style={s.searchIcon} />
              <input
                style={s.search}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar pregunta, código o categoría"
              />
            </div>
            <span style={s.counter}>{filtrados.length} preguntas</span>
          </div>

          {filtrados.length === 0 ? (
            <div style={s.empty}>No hay preguntas trigger configuradas.</div>
          ) : (
            <div style={s.list}>
              {filtrados.map((trigger) => {
                const p = preguntaDe(trigger);
                return (
                  <article key={trigger.id} style={s.row}>
                    <div style={{ flex: 1 }}>
                      <div style={s.rowTop}>
                        <strong>{p?.pregunta ?? "Pregunta sin nombre"}</strong>
                        {p && <span style={s.responseBadge}>{etiquetaTipo(p.tipo_respuesta)}</span>}
                        <span style={s.triggerBadge}>
                          Dispara con: {etiquetaValor(trigger.valor_disparador, p?.tipo_respuesta)}
                        </span>
                        <span style={trigger.activo ? s.active : s.inactive}>
                          {trigger.activo ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      <div style={s.meta}>
                        <span>{p?.codigo ?? "-"}</span>
                        <span>{p?.categoria ?? "Sin categoría"}</span>
                        <span>Orden {p?.orden ?? 0}</span>
                      </div>
                    </div>
                    <div style={s.actions}>
                      <button style={s.edit} onClick={() => editar(trigger)}>
                        <Edit3 size={17} /> Editar
                      </button>
                      <button
                        style={s.danger}
                        onClick={() => desactivar(trigger)}
                        title="Desactivar pregunta"
                        aria-label="Desactivar pregunta"
                      >
                        <Power size={17} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <h2 style={{ margin: 0 }}>
                  {editandoTriggerId ? "Editar pregunta trigger" : "Nueva pregunta trigger"}
                </h2>
                <p style={s.subtitle}>
                  Se configura igual que una pregunta de relevamiento, agregando la respuesta disparadora.
                </p>
              </div>
              <button style={s.close} onClick={() => setModal(false)}><X size={20} /></button>
            </div>

            {mensaje && (
              <div style={tipoMensaje === "success" ? s.success : s.error}>
                {tipoMensaje === "success" ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
                {mensaje}
              </div>
            )}

            <div style={s.formGrid}>
              <label style={s.full}>
                <span style={s.label}>Pregunta *</span>
                <input
                  style={s.input}
                  value={form.pregunta}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    pregunta: e.target.value,
                    codigo: f.codigo || codigoDesde(e.target.value),
                  }))}
                />
              </label>

              <label style={s.field}>
                <span style={s.label}>Código</span>
                <input style={s.input} value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} />
              </label>

              <label style={s.field}>
                <span style={s.label}>Categoría *</span>
                <select style={s.input} value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                  <option value="">Seleccioná una categoría</option>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <label style={s.field}>
                <span style={s.label}>Tipo de respuesta *</span>
                <select
                  style={s.input}
                  value={form.tipo_respuesta}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoRespuesta;
                    setForm((f) => ({
                      ...f,
                      tipo_respuesta: tipo,
                      opciones: [],
                      nuevaOpcion: "",
                      minimo: "",
                      maximo: "",
                      valor_disparador: valorInicial(tipo),
                    }));
                  }}
                >
                  <option value="binaria">Sí / No</option>
                  <option value="ternaria">Sí / No / Neutro</option>
                  <option value="texto">Texto corto</option>
                  <option value="texto_largo">Texto largo</option>
                  <option value="numero">Número</option>
                  <option value="fecha">Fecha</option>
                  <option value="seleccion">Selección única</option>
                  <option value="seleccion_multiple">Selección múltiple</option>
                </select>
              </label>

              {(form.tipo_respuesta === "seleccion" || form.tipo_respuesta === "seleccion_multiple") && (
                <div style={s.full}>
                  <span style={s.label}>Opciones de respuesta *</span>
                  <div style={s.optionComposer}>
                    <input
                      style={s.input}
                      value={form.nuevaOpcion}
                      onChange={(e) => setForm((f) => ({ ...f, nuevaOpcion: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          agregarOpcion();
                        }
                      }}
                    />
                    <button style={s.dark} type="button" onClick={agregarOpcion}>
                      <Plus size={17} /> Agregar
                    </button>
                  </div>
                  <div style={s.optionList}>
                    {form.opciones.map((op, i) => (
                      <div key={`${op}-${i}`} style={s.chip}>
                        {op}
                        <button style={s.removeChip} type="button" onClick={() => quitarOpcion(i)}>
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.tipo_respuesta === "numero" && (
                <>
                  <label style={s.field}>
                    <span style={s.label}>Valor mínimo</span>
                    <input type="number" step="any" style={s.input} value={form.minimo} onChange={(e) => setForm((f) => ({ ...f, minimo: e.target.value }))} />
                  </label>
                  <label style={s.field}>
                    <span style={s.label}>Valor máximo</span>
                    <input type="number" step="any" style={s.input} value={form.maximo} onChange={(e) => setForm((f) => ({ ...f, maximo: e.target.value }))} />
                  </label>
                </>
              )}

              <label style={s.field}>
                <span style={s.label}>Orden</span>
                <input type="number" style={s.input} value={form.orden} onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))} />
              </label>

              <label style={s.full}>
                <span style={s.label}>Descripción</span>
                <textarea style={s.textarea} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
              </label>

              <div style={s.full}>
                <span style={s.label}>Respuesta que dispara el producto *</span>
                {editorRespuesta(
                  form.tipo_respuesta,
                  {
                    opciones: form.opciones,
                    minimo: form.minimo === "" ? null : Number(form.minimo),
                    maximo: form.maximo === "" ? null : Number(form.maximo),
                  },
                  form.valor_disparador,
                  (v) => setForm((f) => ({ ...f, valor_disparador: v }))
                )}
              </div>

              <label style={s.checkbox}>
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
                Pregunta activa
              </label>
            </div>

            <div style={s.footer}>
              <button style={s.cancel} onClick={() => setModal(false)}>Cancelar</button>
              <button style={s.primary} disabled={guardando} onClick={guardar}>
                <Save size={18} /> {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: 24, background: "#f1f5f9" },
  container: { maxWidth: 1150, margin: "0 auto" },
  backButton: { display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 18, padding: 0, border: 0, background: "transparent", color: "#475569", fontWeight: 600, cursor: "pointer" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 24 },
  breadcrumb: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  title: { margin: 0, fontSize: 28, color: "#0f172a" },
  subtitle: { margin: "6px 0 0", color: "#64748b" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 22, marginBottom: 18 },
  cardTitle: { margin: 0, fontSize: 18, color: "#0f172a" },
  associationGrid: { display: "grid", gridTemplateColumns: "minmax(260px,2fr) minmax(220px,1.3fr) auto", gap: 14, alignItems: "end", marginTop: 18 },
  toolbar: { display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 18, flexWrap: "wrap" },
  searchBox: { position: "relative", flex: "1 1 320px" },
  searchIcon: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" },
  search: { width: "100%", boxSizing: "border-box", padding: "11px 12px 11px 40px", border: "1px solid #cbd5e1", borderRadius: 9 },
  counter: { alignSelf: "center", fontSize: 14, color: "#64748b" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 16, border: "1px solid #e2e8f0", borderRadius: 11 },
  rowTop: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  meta: { display: "flex", gap: 14, marginTop: 8, color: "#64748b", fontSize: 13, flexWrap: "wrap" },
  responseBadge: { padding: "4px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700 },
  triggerBadge: { padding: "4px 8px", borderRadius: 999, background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700 },
  active: { padding: "4px 8px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 700 },
  inactive: { padding: "4px 8px", borderRadius: 999, background: "#e2e8f0", color: "#475569", fontSize: 12, fontWeight: 700 },
  actions: { display: "flex", gap: 7 },
  edit: { minHeight: 38, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 11px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" },
  danger: { width: 38, height: 38, display: "grid", placeItems: "center", border: "1px solid #fecaca", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer" },
  primary: { minHeight: 42, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 15px", border: 0, borderRadius: 9, background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  dark: { minHeight: 43, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px", border: 0, borderRadius: 9, background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer" },
  field: { display: "flex", flexDirection: "column", gap: 7 },
  full: { display: "flex", flexDirection: "column", gap: 7, gridColumn: "1 / -1" },
  label: { fontSize: 14, fontWeight: 600, color: "#334155" },
  input: { width: "100%", minHeight: 43, boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#0f172a" },
  disabled: { minHeight: 43, display: "flex", alignItems: "center", padding: "0 12px", border: "1px solid #e2e8f0", borderRadius: 9, background: "#f8fafc", color: "#94a3b8" },
  textarea: { width: "100%", minHeight: 85, boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 9, resize: "vertical" },
  checkGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  checkOption: { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 9, background: "#f8fafc" },
  checkbox: { display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1", color: "#334155" },
  success: { display: "flex", gap: 9, alignItems: "center", padding: 13, marginBottom: 16, border: "1px solid #86efac", borderRadius: 9, background: "#f0fdf4", color: "#166534" },
  error: { display: "flex", gap: 9, alignItems: "center", padding: 13, marginBottom: 16, border: "1px solid #fecaca", borderRadius: 9, background: "#fef2f2", color: "#b91c1c" },
  empty: { padding: 35, textAlign: "center", color: "#64748b" },
  overlay: { position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 20, background: "rgba(15,23,42,.45)" },
  modal: { width: "min(760px,100%)", maxHeight: "90vh", overflow: "auto", padding: 22, borderRadius: 14, background: "#fff" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 },
  close: { width: 42, height: 42, display: "grid", placeItems: "center", border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", cursor: "pointer" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 },
  optionComposer: { display: "flex", gap: 8, alignItems: "center" },
  optionList: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 9px 7px 11px", border: "1px solid #cbd5e1", borderRadius: 999, background: "#f8fafc" },
  removeChip: { width: 24, height: 24, display: "grid", placeItems: "center", padding: 0, border: 0, borderRadius: 999, background: "#e2e8f0", cursor: "pointer" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 },
  cancel: { minHeight: 42, padding: "0 16px", border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#334155", fontWeight: 600, cursor: "pointer" },
};
