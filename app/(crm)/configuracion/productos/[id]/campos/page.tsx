"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";

type TipoCampo =
  | "texto"
  | "texto_largo"
  | "numero"
  | "fecha"
  | "seleccion"
  | "seleccion_multiple"
  | "si_no"
  | "archivo"
  | "domicilio";

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  empresas?: { nombre: string } | null;
};

type CampoProducto = {
  id: string;
  producto_id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipo_campo: TipoCampo;
  obligatorio: boolean;
  orden: number;
  activo: boolean;
  placeholder: string | null;
  texto_ayuda: string | null;
  configuracion: Record<string, any>;
  created_by: string | null;
  updated_by: string | null;
};

type OpcionCampo = {
  id?: string;
  valor: string;
  etiqueta: string;
  orden: number;
  activo: boolean;
};

type FormularioCampo = {
  nombre: string;
  codigo: string;
  descripcion: string;
  tipo_campo: TipoCampo;
  obligatorio: boolean;
  orden: string;
  activo: boolean;
  placeholder: string;
  texto_ayuda: string;
};

const FORMULARIO_INICIAL: FormularioCampo = {
  nombre: "",
  codigo: "",
  descripcion: "",
  tipo_campo: "texto",
  obligatorio: false,
  orden: "1",
  activo: true,
  placeholder: "",
  texto_ayuda: "",
};

const TIPOS_CAMPO: { value: TipoCampo; label: string }[] = [
  { value: "texto", label: "Texto corto" },
  { value: "texto_largo", label: "Texto largo" },
  { value: "numero", label: "Número" },
  { value: "fecha", label: "Fecha" },
  { value: "seleccion", label: "Lista desplegable" },
  { value: "seleccion_multiple", label: "Selección múltiple" },
  { value: "si_no", label: "Sí / No" },
  { value: "archivo", label: "Archivo" },
  { value: "domicilio", label: "Domicilio" },
];

function generarCodigo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function nombreTipo(tipo: TipoCampo) {
  return TIPOS_CAMPO.find((item) => item.value === tipo)?.label || tipo;
}

export default function ProductoCamposPage() {
  const params = useParams();
  const router = useRouter();
  const { user, role, loading: userLoading } = useUser();

  const productoId = useMemo(() => {
    const valor = params?.id;
    return Array.isArray(valor) ? valor[0] : valor;
  }, [params]);

  const [producto, setProducto] = useState<Producto | null>(null);
  const [campos, setCampos] = useState<CampoProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [campoEditando, setCampoEditando] = useState<CampoProducto | null>(null);
  const [formulario, setFormulario] = useState<FormularioCampo>(FORMULARIO_INICIAL);
  const [opciones, setOpciones] = useState<OpcionCampo[]>([]);

  const [usarAutocompleteGoogle, setUsarAutocompleteGoogle] = useState(true);
  const [validarDireccionGoogle, setValidarDireccionGoogle] = useState(false);
  const [permitirIngresoManual, setPermitirIngresoManual] = useState(true);
  const [solicitarPiso, setSolicitarPiso] = useState(false);
  const [solicitarDepartamento, setSolicitarDepartamento] = useState(false);
  const [paisPredeterminado, setPaisPredeterminado] = useState("AR");

  const [formatosArchivo, setFormatosArchivo] = useState("pdf,jpg,jpeg,png");
  const [tamanoMaximoMb, setTamanoMaximoMb] = useState("10");
  const [numeroMinimo, setNumeroMinimo] = useState("");
  const [numeroMaximo, setNumeroMaximo] = useState("");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarProducto = useCallback(async () => {
    if (!productoId) throw new Error("No se pudo identificar el producto.");

    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, descripcion, activo, empresas(nombre)")
      .eq("id", productoId)
      .single();

    if (error) throw error;
    setProducto(data as unknown as Producto);
  }, [productoId]);

  const cargarCampos = useCallback(async () => {
    if (!productoId) throw new Error("No se pudo identificar el producto.");

    const { data, error } = await supabase
      .from("productos_campos")
      .select("*")
      .eq("producto_id", productoId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    setCampos((data ?? []) as CampoProducto[]);
  }, [productoId]);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([cargarProducto(), cargarCampos()]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No fue posible cargar los campos del producto.");
    } finally {
      setLoading(false);
    }
  }, [cargarProducto, cargarCampos]);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    cargarDatos();
  }, [userLoading, user, cargarDatos]);

  function resetearConfiguraciones() {
    setOpciones([]);
    setUsarAutocompleteGoogle(true);
    setValidarDireccionGoogle(false);
    setPermitirIngresoManual(true);
    setSolicitarPiso(false);
    setSolicitarDepartamento(false);
    setPaisPredeterminado("AR");
    setFormatosArchivo("pdf,jpg,jpeg,png");
    setTamanoMaximoMb("10");
    setNumeroMinimo("");
    setNumeroMaximo("");
  }

  function abrirNuevoCampo() {
    setCampoEditando(null);
    setFormulario({ ...FORMULARIO_INICIAL, orden: String(campos.length + 1) });
    resetearConfiguraciones();
    setError("");
    setMensaje("");
    setModalAbierto(true);
  }

  async function abrirEdicion(campo: CampoProducto) {
    try {
      setCampoEditando(campo);
      setFormulario({
        nombre: campo.nombre,
        codigo: campo.codigo,
        descripcion: campo.descripcion ?? "",
        tipo_campo: campo.tipo_campo,
        obligatorio: campo.obligatorio,
        orden: String(campo.orden),
        activo: campo.activo,
        placeholder: campo.placeholder ?? "",
        texto_ayuda: campo.texto_ayuda ?? "",
      });

      const config = campo.configuracion || {};
      setUsarAutocompleteGoogle(config.usar_autocomplete_google ?? true);
      setValidarDireccionGoogle(config.validar_direccion_google ?? false);
      setPermitirIngresoManual(config.permitir_ingreso_manual ?? true);
      setSolicitarPiso(config.solicitar_piso ?? false);
      setSolicitarDepartamento(config.solicitar_departamento ?? false);
      setPaisPredeterminado(config.pais_predeterminado ?? "AR");
      setFormatosArchivo((config.formatos ?? ["pdf", "jpg", "jpeg", "png"]).join(","));
      setTamanoMaximoMb(String(config.tamano_maximo_mb ?? 10));
      setNumeroMinimo(config.minimo === undefined ? "" : String(config.minimo));
      setNumeroMaximo(config.maximo === undefined ? "" : String(config.maximo));

      setOpciones([]);
      if (["seleccion", "seleccion_multiple"].includes(campo.tipo_campo)) {
        const { data, error } = await supabase
          .from("productos_campos_opciones")
          .select("id, valor, etiqueta, orden, activo")
          .eq("campo_id", campo.id)
          .order("orden", { ascending: true });
        if (error) throw error;
        setOpciones((data ?? []) as OpcionCampo[]);
      }

      setError("");
      setMensaje("");
      setModalAbierto(true);
    } catch (err: any) {
      setError(err?.message || "No fue posible cargar el campo.");
    }
  }

  function cerrarModal() {
    if (guardando) return;
    setModalAbierto(false);
    setCampoEditando(null);
    setFormulario(FORMULARIO_INICIAL);
    resetearConfiguraciones();
    setError("");
  }

  function actualizarCampo<K extends keyof FormularioCampo>(
    campo: K,
    valor: FormularioCampo[K]
  ) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function actualizarNombre(nombre: string) {
    setFormulario((actual) => ({
      ...actual,
      nombre,
      codigo: campoEditando || actual.codigo ? actual.codigo : generarCodigo(nombre),
    }));
  }

  function agregarOpcion() {
    setOpciones((actuales) => [
      ...actuales,
      { valor: "", etiqueta: "", orden: actuales.length + 1, activo: true },
    ]);
  }

  function actualizarOpcion(indice: number, cambios: Partial<OpcionCampo>) {
    setOpciones((actuales) =>
      actuales.map((opcion, i) => (i === indice ? { ...opcion, ...cambios } : opcion))
    );
  }

  function eliminarOpcion(indice: number) {
    setOpciones((actuales) =>
      actuales
        .filter((_, i) => i !== indice)
        .map((opcion, i) => ({ ...opcion, orden: i + 1 }))
    );
  }

  function construirConfiguracion() {
    if (formulario.tipo_campo === "domicilio") {
      return {
        usar_autocomplete_google: usarAutocompleteGoogle,
        validar_direccion_google: validarDireccionGoogle,
        permitir_ingreso_manual: permitirIngresoManual,
        solicitar_piso: solicitarPiso,
        solicitar_departamento: solicitarDepartamento,
        pais_predeterminado: paisPredeterminado.trim().toUpperCase() || "AR",
      };
    }

    if (formulario.tipo_campo === "archivo") {
      return {
        formatos: formatosArchivo
          .split(",")
          .map((item) => item.trim().toLowerCase().replace(/^\./, ""))
          .filter(Boolean),
        tamano_maximo_mb: Number(tamanoMaximoMb),
      };
    }

    if (formulario.tipo_campo === "numero") {
      return {
        minimo: numeroMinimo === "" ? null : Number(numeroMinimo),
        maximo: numeroMaximo === "" ? null : Number(numeroMaximo),
      };
    }

    return {};
  }

  function validarFormulario() {
    if (!formulario.nombre.trim()) return "El nombre del campo es obligatorio.";
    if (!formulario.codigo.trim()) return "El código interno es obligatorio.";
    if (!/^[a-z][a-z0-9_]*$/.test(formulario.codigo.trim())) {
      return "El código debe comenzar con una letra y contener solo minúsculas, números y guiones bajos.";
    }

    const orden = Number(formulario.orden);
    if (!Number.isInteger(orden) || orden < 1) return "El orden debe ser un entero mayor o igual a 1.";

    if (["seleccion", "seleccion_multiple"].includes(formulario.tipo_campo)) {
      if (opciones.length === 0) return "Agregá al menos una opción.";
      const incompleta = opciones.some((opcion) => !opcion.valor.trim() || !opcion.etiqueta.trim());
      if (incompleta) return "Completá el valor y la etiqueta de todas las opciones.";
      const valores = opciones.map((opcion) => opcion.valor.trim());
      if (new Set(valores).size !== valores.length) return "Los valores de las opciones no pueden repetirse.";
    }

    if (formulario.tipo_campo === "domicilio" && validarDireccionGoogle && !usarAutocompleteGoogle) {
      return "Para validar con Google activá también las sugerencias de Google Maps.";
    }

    if (formulario.tipo_campo === "archivo") {
      const tamano = Number(tamanoMaximoMb);
      if (!Number.isFinite(tamano) || tamano <= 0) return "Ingresá un tamaño máximo de archivo válido.";
    }

    if (formulario.tipo_campo === "numero") {
      const min = numeroMinimo === "" ? null : Number(numeroMinimo);
      const max = numeroMaximo === "" ? null : Number(numeroMaximo);
      if (min !== null && !Number.isFinite(min)) return "El mínimo no es válido.";
      if (max !== null && !Number.isFinite(max)) return "El máximo no es válido.";
      if (min !== null && max !== null && min > max) return "El mínimo no puede ser mayor que el máximo.";
    }

    return null;
  }

  async function guardarCampo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!user?.id || !productoId) return setError("No fue posible identificar al usuario o producto.");
    if (role !== "admin") return setError("No tenés permisos para modificar campos.");

    const errorValidacion = validarFormulario();
    if (errorValidacion) return setError(errorValidacion);

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const payload = {
        producto_id: productoId,
        nombre: formulario.nombre.trim(),
        codigo: formulario.codigo.trim(),
        descripcion: formulario.descripcion.trim() || null,
        tipo_campo: formulario.tipo_campo,
        obligatorio: formulario.obligatorio,
        orden: Number(formulario.orden),
        activo: formulario.activo,
        placeholder: formulario.placeholder.trim() || null,
        texto_ayuda: formulario.texto_ayuda.trim() || null,
        configuracion: construirConfiguracion(),
      };

      let campoId = campoEditando?.id;

      if (campoEditando) {
        const { error } = await supabase
          .from("productos_campos")
          .update({ ...payload, updated_by: user.id })
          .eq("id", campoEditando.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("productos_campos")
          .insert({ ...payload, created_by: user.id, updated_by: null })
          .select("id")
          .single();
        if (error) throw error;
        campoId = data.id;
      }

      if (!campoId) throw new Error("No se pudo identificar el campo guardado.");

      const { error: eliminarError } = await supabase
        .from("productos_campos_opciones")
        .delete()
        .eq("campo_id", campoId);
      if (eliminarError) throw eliminarError;

      if (["seleccion", "seleccion_multiple"].includes(formulario.tipo_campo)) {
        const registros = opciones.map((opcion, indice) => ({
          campo_id: campoId,
          valor: opcion.valor.trim(),
          etiqueta: opcion.etiqueta.trim(),
          orden: indice + 1,
          activo: opcion.activo,
        }));
        const { error } = await supabase.from("productos_campos_opciones").insert(registros);
        if (error) throw error;
      }

      await cargarCampos();
      setModalAbierto(false);
      setCampoEditando(null);
      setFormulario(FORMULARIO_INICIAL);
      resetearConfiguraciones();
      setMensaje(campoEditando ? "Campo actualizado correctamente." : "Campo creado correctamente.");
    } catch (err: any) {
      console.error(err);
      if (err?.code === "23505") setError("Ya existe un campo con ese código para este producto.");
      else if (err?.code === "42501") setError("No tenés permisos para realizar esta operación.");
      else setError(err?.message || "No fue posible guardar el campo.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(campo: CampoProducto) {
    if (!user?.id || role !== "admin") return;
    try {
      setProcesandoId(campo.id);
      setError("");
      const { error } = await supabase
        .from("productos_campos")
        .update({ activo: !campo.activo, updated_by: user.id })
        .eq("id", campo.id);
      if (error) throw error;
      await cargarCampos();
      setMensaje(!campo.activo ? "Campo activado correctamente." : "Campo desactivado correctamente.");
    } catch (err: any) {
      setError(err?.message || "No fue posible cambiar el estado del campo.");
    } finally {
      setProcesandoId(null);
    }
  }

  async function eliminarCampo(campo: CampoProducto) {
    if (!window.confirm(`¿Querés eliminar el campo "${campo.nombre}"?\n\nTambién se eliminarán sus opciones.`)) return;
    try {
      setProcesandoId(campo.id);
      setError("");
      const { error } = await supabase.from("productos_campos").delete().eq("id", campo.id);
      if (error) throw error;
      await cargarCampos();
      setMensaje("Campo eliminado correctamente.");
    } catch (err: any) {
      if (err?.code === "23503") {
        setError("Este campo ya tiene respuestas asociadas y no puede eliminarse. Desactivalo para conservar el historial.");
      } else {
        setError(err?.message || "No fue posible eliminar el campo.");
      }
    } finally {
      setProcesandoId(null);
    }
  }

  if (userLoading) return <main style={styles.page}><div style={styles.loadingBox}>Cargando usuario...</div></main>;
  if (!user) return <main style={styles.page}><div style={styles.errorBox}>Debés iniciar sesión.</div></main>;
  if (role !== "admin") return <main style={styles.page}><div style={styles.errorBox}>No tenés permisos para configurar campos.</div></main>;

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <button type="button" onClick={() => router.push("/configuracion/productos")} style={styles.backButton}>← Volver a productos</button>
            <div style={styles.breadcrumb}>Configuración / Productos / Campos de venta</div>
            <h1 style={styles.title}>Campos requeridos para la venta</h1>
            <p style={styles.subtitle}>Definí la información que solicitará el Journey después de aceptar este producto.</p>
          </div>
          <button type="button" onClick={abrirNuevoCampo} style={styles.primaryButton} disabled={loading}>+ Agregar campo</button>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}
        {mensaje && <div style={styles.successBox}>{mensaje}</div>}

        {producto && (
          <section style={styles.productCard}>
            <div>
              <div style={styles.productName}>{producto.nombre}</div>
              <div style={styles.secondaryText}>{producto.empresas?.nombre || "Empresa sin identificar"}</div>
            </div>
            <span style={producto.activo ? styles.activeBadge : styles.inactiveBadge}>{producto.activo ? "Producto activo" : "Producto inactivo"}</span>
          </section>
        )}

        <section style={styles.tableCard}>
          {loading ? (
            <div style={styles.emptyState}>Cargando campos...</div>
          ) : campos.length === 0 ? (
            <div style={styles.emptyState}>
              <strong>Este producto todavía no tiene campos configurados.</strong>
              <span>Agregá el primer campo que deberá completarse durante la venta.</span>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Orden</th><th style={styles.th}>Campo</th><th style={styles.th}>Tipo</th><th style={styles.th}>Obligatorio</th><th style={styles.th}>Configuración</th><th style={styles.th}>Estado</th><th style={styles.th}>Acciones</th></tr></thead>
                <tbody>
                  {campos.map((campo) => (
                    <tr key={campo.id}>
                      <td style={styles.td}><strong>{campo.orden}</strong></td>
                      <td style={styles.td}><div style={styles.productName}>{campo.nombre}</div><div style={styles.codeText}>{campo.codigo}</div>{campo.texto_ayuda && <div style={styles.secondaryText}>{campo.texto_ayuda}</div>}</td>
                      <td style={styles.td}><span style={styles.typeBadge}>{nombreTipo(campo.tipo_campo)}</span></td>
                      <td style={styles.td}>{campo.obligatorio ? "Sí" : "No"}</td>
                      <td style={styles.td}>
                        {campo.tipo_campo === "domicilio" ? (
                          <div style={styles.configurationList}>
                            <span>{campo.configuracion?.usar_autocomplete_google ? "Sugerencias Google" : "Ingreso libre"}</span>
                            {campo.configuracion?.validar_direccion_google && <span>Validación Google</span>}
                          </div>
                        ) : ["seleccion", "seleccion_multiple"].includes(campo.tipo_campo) ? "Opciones configurables" : campo.tipo_campo === "archivo" ? `Máx. ${campo.configuracion?.tamano_maximo_mb ?? 10} MB` : "—"}
                      </td>
                      <td style={styles.td}><span style={campo.activo ? styles.activeBadge : styles.inactiveBadge}>{campo.activo ? "Activo" : "Inactivo"}</span></td>
                      <td style={styles.td}><div style={styles.actionGroup}>
                        <button type="button" onClick={() => abrirEdicion(campo)} style={styles.editButton}>Editar</button>
                        <button type="button" onClick={() => cambiarEstado(campo)} disabled={procesandoId === campo.id} style={campo.activo ? styles.deactivateButton : styles.activateButton}>{campo.activo ? "Desactivar" : "Activar"}</button>
                        <button type="button" onClick={() => eliminarCampo(campo)} disabled={procesandoId === campo.id} style={styles.deleteButton}>Eliminar</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalAbierto && (
        <div style={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div><h2 style={styles.modalTitle}>{campoEditando ? "Editar campo" : "Nuevo campo"}</h2><p style={styles.modalSubtitle}>Configurá cómo se mostrará y validará dentro del Journey.</p></div>
              <button type="button" onClick={cerrarModal} style={styles.closeButton}>×</button>
            </div>

            <form onSubmit={guardarCampo}>
              <div style={styles.formGrid}>
                <div style={styles.field}><label style={styles.label}>Nombre *</label><input value={formulario.nombre} onChange={(e) => actualizarNombre(e.target.value)} style={styles.input} placeholder="Ej. Domicilio del asegurado" disabled={guardando} autoFocus /></div>
                <div style={styles.field}><label style={styles.label}>Código interno *</label><input value={formulario.codigo} onChange={(e) => actualizarCampo("codigo", generarCodigo(e.target.value))} style={styles.input} placeholder="domicilio_asegurado" disabled={guardando} /></div>
                <div style={styles.fullField}><label style={styles.label}>Descripción</label><textarea value={formulario.descripcion} onChange={(e) => actualizarCampo("descripcion", e.target.value)} style={styles.textarea} rows={2} disabled={guardando} /></div>
                <div style={styles.field}><label style={styles.label}>Tipo de campo *</label><select value={formulario.tipo_campo} onChange={(e) => actualizarCampo("tipo_campo", e.target.value as TipoCampo)} style={styles.select} disabled={guardando}>{TIPOS_CAMPO.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}</select></div>
                <div style={styles.field}><label style={styles.label}>Orden *</label><input type="number" min={1} value={formulario.orden} onChange={(e) => actualizarCampo("orden", e.target.value)} style={styles.input} disabled={guardando} /></div>
                <div style={styles.field}><label style={styles.label}>Placeholder</label><input value={formulario.placeholder} onChange={(e) => actualizarCampo("placeholder", e.target.value)} style={styles.input} placeholder="Texto dentro del campo" disabled={guardando} /></div>
                <div style={styles.field}><label style={styles.label}>Texto de ayuda</label><input value={formulario.texto_ayuda} onChange={(e) => actualizarCampo("texto_ayuda", e.target.value)} style={styles.input} placeholder="Indicación para el usuario" disabled={guardando} /></div>
                <div style={styles.fullField}><div style={styles.checkboxRow}><label style={styles.checkboxLabel}><input type="checkbox" checked={formulario.obligatorio} onChange={(e) => actualizarCampo("obligatorio", e.target.checked)} /> Campo obligatorio</label><label style={styles.checkboxLabel}><input type="checkbox" checked={formulario.activo} onChange={(e) => actualizarCampo("activo", e.target.checked)} /> Campo activo</label></div></div>

                {["seleccion", "seleccion_multiple"].includes(formulario.tipo_campo) && (
                  <div style={styles.fullField}>
                    <div style={styles.sectionHeader}><div><strong>Opciones disponibles</strong><div style={styles.secondaryText}>El valor se guarda internamente y la etiqueta se muestra al usuario.</div></div><button type="button" onClick={agregarOpcion} style={styles.secondaryButton}>+ Agregar opción</button></div>
                    {opciones.length === 0 ? <div style={styles.innerEmpty}>Todavía no agregaste opciones.</div> : opciones.map((opcion, indice) => (
                      <div key={indice} style={styles.optionRow}>
                        <input value={opcion.etiqueta} onChange={(e) => actualizarOpcion(indice, { etiqueta: e.target.value, valor: opcion.valor || generarCodigo(e.target.value) })} style={styles.input} placeholder="Etiqueta visible" disabled={guardando} />
                        <input value={opcion.valor} onChange={(e) => actualizarOpcion(indice, { valor: generarCodigo(e.target.value) })} style={styles.input} placeholder="valor_interno" disabled={guardando} />
                        <button type="button" onClick={() => eliminarOpcion(indice)} style={styles.deleteButton}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}

                {formulario.tipo_campo === "domicilio" && (
                  <div style={styles.fullField}>
                    <div style={styles.sectionDivider}>Configuración del domicilio</div>
                    <div style={styles.configurationCard}>
                      <label style={styles.checkboxLabel}><input type="checkbox" checked={usarAutocompleteGoogle} onChange={(e) => setUsarAutocompleteGoogle(e.target.checked)} /> Utilizar sugerencias de Google Maps</label>
                      <label style={styles.checkboxLabel}><input type="checkbox" checked={validarDireccionGoogle} onChange={(e) => setValidarDireccionGoogle(e.target.checked)} /> Validar el domicilio con Google</label>
                      <label style={styles.checkboxLabel}><input type="checkbox" checked={permitirIngresoManual} onChange={(e) => setPermitirIngresoManual(e.target.checked)} /> Permitir ingreso manual si no se encuentra</label>
                      <label style={styles.checkboxLabel}><input type="checkbox" checked={solicitarPiso} onChange={(e) => setSolicitarPiso(e.target.checked)} /> Solicitar piso</label>
                      <label style={styles.checkboxLabel}><input type="checkbox" checked={solicitarDepartamento} onChange={(e) => setSolicitarDepartamento(e.target.checked)} /> Solicitar departamento</label>
                      <div style={styles.field}><label style={styles.label}>País predeterminado</label><input value={paisPredeterminado} onChange={(e) => setPaisPredeterminado(e.target.value.toUpperCase().slice(0, 2))} style={styles.smallInput} placeholder="AR" /></div>
                    </div>
                  </div>
                )}

                {formulario.tipo_campo === "archivo" && (
                  <><div style={styles.field}><label style={styles.label}>Formatos permitidos</label><input value={formatosArchivo} onChange={(e) => setFormatosArchivo(e.target.value)} style={styles.input} placeholder="pdf,jpg,png" /></div><div style={styles.field}><label style={styles.label}>Tamaño máximo (MB)</label><input type="number" min={1} value={tamanoMaximoMb} onChange={(e) => setTamanoMaximoMb(e.target.value)} style={styles.input} /></div></>
                )}

                {formulario.tipo_campo === "numero" && (
                  <><div style={styles.field}><label style={styles.label}>Valor mínimo</label><input type="number" value={numeroMinimo} onChange={(e) => setNumeroMinimo(e.target.value)} style={styles.input} /></div><div style={styles.field}><label style={styles.label}>Valor máximo</label><input type="number" value={numeroMaximo} onChange={(e) => setNumeroMaximo(e.target.value)} style={styles.input} /></div></>
                )}
              </div>

              {error && <div style={styles.modalError}>{error}</div>}
              <div style={styles.modalActions}><button type="button" onClick={cerrarModal} style={styles.cancelButton} disabled={guardando}>Cancelar</button><button type="submit" style={styles.primaryButton} disabled={guardando}>{guardando ? "Guardando..." : campoEditando ? "Guardar cambios" : "Crear campo"}</button></div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: "24px", background: "#f1f5f9" },
  container: { width: "100%", maxWidth: "1500px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "22px", flexWrap: "wrap" },
  backButton: { marginBottom: "12px", padding: 0, border: "none", background: "transparent", color: "#475569", cursor: "pointer", fontWeight: 700 },
  breadcrumb: { marginBottom: "7px", color: "#64748b", fontSize: "13px" },
  title: { margin: 0, color: "#0f172a", fontSize: "28px" },
  subtitle: { margin: "8px 0 0", color: "#64748b", fontSize: "15px" },
  productCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 18px", marginBottom: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff" },
  productName: { color: "#0f172a", fontWeight: 700 },
  secondaryText: { marginTop: "4px", color: "#64748b", fontSize: "12px" },
  codeText: { marginTop: "4px", color: "#7c3aed", fontFamily: "monospace", fontSize: "12px" },
  tableCard: { overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: "14px", background: "#fff" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", minWidth: "1150px", borderCollapse: "collapse" },
  th: { padding: "13px 15px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "12px", textAlign: "left", textTransform: "uppercase" },
  td: { padding: "14px 15px", borderBottom: "1px solid #f1f5f9", color: "#334155", fontSize: "14px", verticalAlign: "middle" },
  emptyState: { display: "flex", flexDirection: "column", gap: "8px", padding: "60px 24px", color: "#64748b", textAlign: "center" },
  activeBadge: { display: "inline-flex", padding: "5px 9px", borderRadius: "999px", background: "#dcfce7", color: "#166534", fontSize: "12px", fontWeight: 700 },
  inactiveBadge: { display: "inline-flex", padding: "5px 9px", borderRadius: "999px", background: "#e2e8f0", color: "#475569", fontSize: "12px", fontWeight: 700 },
  typeBadge: { display: "inline-flex", padding: "5px 9px", borderRadius: "999px", background: "#ede9fe", color: "#6d28d9", fontSize: "12px", fontWeight: 700 },
  configurationList: { display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" },
  actionGroup: { display: "flex", gap: "7px", flexWrap: "wrap" },
  primaryButton: { minHeight: "42px", padding: "10px 17px", border: "none", borderRadius: "9px", background: "#0f172a", color: "white", cursor: "pointer", fontWeight: 700 },
  secondaryButton: { padding: "8px 12px", border: "1px solid #c4b5fd", borderRadius: "8px", background: "#f5f3ff", color: "#6d28d9", cursor: "pointer", fontWeight: 700 },
  editButton: { padding: "7px 11px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", color: "#334155", cursor: "pointer", fontWeight: 700 },
  deactivateButton: { padding: "7px 11px", border: "1px solid #fecaca", borderRadius: "8px", background: "#fff1f2", color: "#be123c", cursor: "pointer", fontWeight: 700 },
  activateButton: { padding: "7px 11px", border: "1px solid #bbf7d0", borderRadius: "8px", background: "#f0fdf4", color: "#15803d", cursor: "pointer", fontWeight: 700 },
  deleteButton: { padding: "7px 11px", border: "1px solid #fecaca", borderRadius: "8px", background: "white", color: "#be123c", cursor: "pointer", fontWeight: 700 },
  errorBox: { padding: "13px 15px", marginBottom: "16px", border: "1px solid #fecaca", borderRadius: "10px", background: "#fff1f2", color: "#be123c" },
  successBox: { padding: "13px 15px", marginBottom: "16px", border: "1px solid #bbf7d0", borderRadius: "10px", background: "#f0fdf4", color: "#166534" },
  loadingBox: { padding: "30px", borderRadius: "12px", background: "#fff", color: "#475569", textAlign: "center" },
  modalOverlay: { position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", background: "rgba(15,23,42,.55)" },
  modal: { width: "100%", maxWidth: "900px", maxHeight: "92vh", overflowY: "auto", padding: "24px", borderRadius: "16px", background: "white", boxShadow: "0 24px 60px rgba(15,23,42,.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "22px" },
  modalTitle: { margin: 0, color: "#0f172a", fontSize: "22px" },
  modalSubtitle: { margin: "7px 0 0", color: "#64748b", fontSize: "14px" },
  closeButton: { width: "36px", height: "36px", border: "none", borderRadius: "8px", background: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "24px" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "17px" },
  field: { display: "flex", flexDirection: "column", gap: "7px" },
  fullField: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "7px" },
  label: { color: "#334155", fontSize: "13px", fontWeight: 700 },
  input: { width: "100%", minHeight: "42px", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "9px", outline: "none", fontSize: "14px" },
  smallInput: { width: "90px", minHeight: "38px", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" },
  textarea: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "9px", resize: "vertical", fontFamily: "inherit" },
  select: { width: "100%", minHeight: "42px", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "9px", background: "white" },
  checkboxRow: { display: "flex", gap: "24px", flexWrap: "wrap" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", color: "#334155", fontSize: "14px", cursor: "pointer" },
  sectionDivider: { paddingBottom: "9px", borderBottom: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 800 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px" },
  configurationCard: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "14px", padding: "16px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" },
  optionRow: { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "9px", alignItems: "center" },
  innerEmpty: { padding: "18px", border: "1px dashed #cbd5e1", borderRadius: "9px", color: "#64748b", textAlign: "center" },
  modalError: { padding: "12px 14px", marginTop: "18px", border: "1px solid #fecaca", borderRadius: "9px", background: "#fff1f2", color: "#be123c" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #e2e8f0" },
  cancelButton: { minHeight: "42px", padding: "10px 17px", border: "1px solid #cbd5e1", borderRadius: "9px", background: "white", color: "#334155", cursor: "pointer", fontWeight: 700 },
};
