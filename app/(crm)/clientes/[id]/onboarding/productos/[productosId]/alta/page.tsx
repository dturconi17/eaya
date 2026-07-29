"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Info,
  Loader2,
  PackageCheck,
  ShoppingBag,
  User,
} from "lucide-react";
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

type Cliente = {
  id: string;
  nombre: string;
  apellido: string | null;
  numero_documento: string | null;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

type LeadProducto = {
  id: string;
  cliente_id: string;
  producto_id: string;
  sugerencia_id: string | null;
  estado: "pendiente_datos" | "completado" | "cancelado";
  datos_alta: Record<string, any> | null;
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
  configuracion: Record<string, any> | null;
};

type OpcionCampo = {
  id: string;
  campo_id: string;
  valor: string;
  etiqueta: string;
  orden: number;
  activo: boolean;
};

type MensajeTipo = "success" | "error" | "";

const STORAGE_BUCKET = "lead-producto-archivos";

function valorVacio(tipo: TipoCampo) {
  if (tipo === "seleccion_multiple") return [];
  if (tipo === "si_no") return "";
  if (tipo === "archivo") return null;
  if (tipo === "domicilio") {
    return {
      direccion: "",
      piso: "",
      departamento: "",
    };
  }
  return "";
}

function tieneValor(valor: any, tipo: TipoCampo) {
  if (tipo === "seleccion_multiple") {
    return Array.isArray(valor) && valor.length > 0;
  }

  if (tipo === "archivo") {
    return Boolean(valor?.path || valor?.url || valor?.nombre);
  }

  if (tipo === "domicilio") {
    return Boolean(valor?.direccion?.trim());
  }

  if (tipo === "numero") {
    return valor !== "" && valor !== null && valor !== undefined;
  }

  return String(valor ?? "").trim() !== "";
}

export default function AltaProductoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();

  const clienteId = useMemo(() => {
    const valor = params?.id;
    return Array.isArray(valor) ? valor[0] : valor;
  }, [params]);

  const productoId = useMemo(() => {
    const valor = params?.productosId ?? params?.productoId;
    return Array.isArray(valor) ? valor[0] : valor;
  }, [params]);

  const leadProductoIdParametro = searchParams.get("leadProductoId");

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [leadProducto, setLeadProducto] = useState<LeadProducto | null>(null);
  const [campos, setCampos] = useState<CampoProducto[]>([]);
  const [opciones, setOpciones] = useState<OpcionCampo[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoCampoId, setSubiendoCampoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<MensajeTipo>("");
  const altaAutomaticaEjecutada = useRef(false);

  const mostrarMensaje = useCallback(
    (texto: string, tipo: Exclude<MensajeTipo, "">) => {
      setMensaje(texto);
      setTipoMensaje(tipo);
    },
    []
  );

  const opcionesPorCampo = useMemo(() => {
    const agrupadas: Record<string, OpcionCampo[]> = {};

    for (const opcion of opciones) {
      if (!agrupadas[opcion.campo_id]) {
        agrupadas[opcion.campo_id] = [];
      }

      agrupadas[opcion.campo_id].push(opcion);
    }

    return agrupadas;
  }, [opciones]);

  const cargarPantalla = useCallback(async () => {
    if (!clienteId || !productoId) {
      throw new Error("No se pudo identificar el cliente o el producto.");
    }

    const clienteRes = await supabase
      .from("clientes")
      .select("id, nombre, apellido, numero_documento")
      .eq("id", clienteId)
      .single();

    if (clienteRes.error) throw clienteRes.error;

    const productoRes = await supabase
      .from("productos")
      .select("id, nombre, descripcion, activo")
      .eq("id", productoId)
      .single();

    if (productoRes.error) throw productoRes.error;

    let consultaLead = supabase
      .from("lead_producto")
      .select(
        "id, cliente_id, producto_id, sugerencia_id, estado, datos_alta"
      )
      .eq("cliente_id", clienteId)
      .eq("producto_id", productoId)
      .eq("estado", "pendiente_datos");

    if (leadProductoIdParametro) {
      consultaLead = consultaLead.eq("id", leadProductoIdParametro);
    }

    const leadRes = await consultaLead.maybeSingle();

    if (leadRes.error) throw leadRes.error;

    if (!leadRes.data) {
      throw new Error(
        "No se encontró un alta pendiente para este producto."
      );
    }

    const camposRes = await supabase
      .from("productos_campos")
      .select(
        `
        id,
        producto_id,
        nombre,
        codigo,
        descripcion,
        tipo_campo,
        obligatorio,
        orden,
        activo,
        placeholder,
        texto_ayuda,
        configuracion
      `
      )
      .eq("producto_id", productoId)
      .eq("activo", true)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (camposRes.error) throw camposRes.error;

    const camposActivos = (camposRes.data ?? []) as CampoProducto[];
    const idsCamposConOpciones = camposActivos
      .filter((campo) =>
        ["seleccion", "seleccion_multiple"].includes(campo.tipo_campo)
      )
      .map((campo) => campo.id);

    let opcionesCargadas: OpcionCampo[] = [];

    if (idsCamposConOpciones.length > 0) {
      const opcionesRes = await supabase
        .from("productos_campos_opciones")
        .select("id, campo_id, valor, etiqueta, orden, activo")
        .in("campo_id", idsCamposConOpciones)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (opcionesRes.error) throw opcionesRes.error;
      opcionesCargadas = (opcionesRes.data ?? []) as OpcionCampo[];
    }

    const datosGuardados =
      (leadRes.data.datos_alta as Record<string, any> | null) ?? {};

    const respuestasIniciales: Record<string, any> = {};

    for (const campo of camposActivos) {
      respuestasIniciales[campo.codigo] =
        datosGuardados[campo.codigo] ?? valorVacio(campo.tipo_campo);
    }

    setCliente(clienteRes.data as Cliente);
    setProducto(productoRes.data as Producto);
    setLeadProducto(leadRes.data as LeadProducto);
    setCampos(camposActivos);
    setOpciones(opcionesCargadas);
    setRespuestas(respuestasIniciales);
  }, [clienteId, productoId, leadProductoIdParametro]);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    async function iniciar() {
      try {
        setLoading(true);
        setMensaje("");
        setTipoMensaje("");
        await cargarPantalla();
      } catch (error: any) {
        console.error("Error cargando alta del producto:", error);
        mostrarMensaje(
          error?.message ||
          "No fue posible cargar los datos necesarios para el alta.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }

    iniciar();
  }, [userLoading, user, cargarPantalla, mostrarMensaje]);

  const finalizarAlta = useCallback(
    async (datosAlta: Record<string, any>) => {
      if (!user?.id || !clienteId || !productoId || !leadProducto?.id) {
        throw new Error(
          "No fue posible identificar el usuario, cliente, producto o alta."
        );
      }

      const ahora = new Date().toISOString();

      const { error: leadError } = await supabase
        .from("lead_producto")
        .update({
          datos_alta: datosAlta,
          estado: "completado",
          updated_by: user.id,
          updated_at: ahora,
        })
        .eq("id", leadProducto.id)
        .eq("estado", "pendiente_datos");

      if (leadError) throw leadError;

      const { error: ofrecimientoError } = await supabase
        .from("ofrecimientos_productos")
        .update({
          resultado: "venta",
          updated_by: user.id,
          updated_at: ahora,
        })
        .eq("cliente_id", clienteId)
        .eq("producto_id", productoId)
        .eq("vigente", true);

      if (ofrecimientoError) throw ofrecimientoError;

      if (leadProducto.sugerencia_id) {
        const { error: sugerenciaError } = await supabase
          .from("clientes_productos_sugeridos")
          .update({
            estado: "venta",
            updated_at: ahora,
          })
          .eq("id", leadProducto.sugerencia_id);

        if (sugerenciaError) throw sugerenciaError;
      }

      const { error: clienteError } = await supabase
        .from("clientes")
        .update({
          onboarding_etapa: "productos",
          updated_at: ahora,
        })
        .eq("id", clienteId);

      if (clienteError) throw clienteError;

      router.replace(`/clientes/${clienteId}/onboarding/productos`);
    },
    [user?.id, clienteId, productoId, leadProducto, router]
  );

  useEffect(() => {
    if (
      loading ||
      !leadProducto ||
      campos.length > 0 ||
      altaAutomaticaEjecutada.current
    ) {
      return;
    }

    altaAutomaticaEjecutada.current = true;

    async function confirmarSinCampos() {
      try {
        setGuardando(true);
        try {
          if (!leadProducto) {
            throw new Error(
              "No se encontró la información del producto en proceso de alta."
            );
          }

          setGuardando(true);

          await finalizarAlta(
            leadProducto.datos_alta ?? {}
          );
        } catch (error: any) {
          console.error(
            "Error confirmando alta automática:",
            error
          );

          mostrarMensaje(
            error.message ||
            "No fue posible confirmar el alta automática.",
            "error"
          );
        }
      } catch (error: any) {
        console.error("Error confirmando alta automática:", error);
        mostrarMensaje(
          error?.message ||
          "No fue posible confirmar automáticamente la venta.",
          "error"
        );
        altaAutomaticaEjecutada.current = false;
      } finally {
        setGuardando(false);
      }
    }

    confirmarSinCampos();
  }, [
    loading,
    leadProducto,
    campos.length,
    finalizarAlta,
    mostrarMensaje,
  ]);

  function actualizarRespuesta(codigo: string, valor: any) {
    setRespuestas((actuales) => ({
      ...actuales,
      [codigo]: valor,
    }));
  }

  function alternarSeleccionMultiple(codigo: string, valor: string) {
    setRespuestas((actuales) => {
      const actualesCampo = Array.isArray(actuales[codigo])
        ? actuales[codigo]
        : [];

      const siguientes = actualesCampo.includes(valor)
        ? actualesCampo.filter((item: string) => item !== valor)
        : [...actualesCampo, valor];

      return {
        ...actuales,
        [codigo]: siguientes,
      };
    });
  }

  function validarCampos() {
    for (const campo of campos) {
      const valor = respuestas[campo.codigo];

      if (campo.obligatorio && !tieneValor(valor, campo.tipo_campo)) {
        return `Completá el campo obligatorio "${campo.nombre}".`;
      }

      if (
        campo.tipo_campo === "numero" &&
        valor !== "" &&
        valor !== null &&
        valor !== undefined
      ) {
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
          return `El campo "${campo.nombre}" debe contener un número válido.`;
        }

        const minimo = campo.configuracion?.minimo;
        const maximo = campo.configuracion?.maximo;

        if (minimo !== null && minimo !== undefined && numero < minimo) {
          return `El campo "${campo.nombre}" debe ser mayor o igual a ${minimo}.`;
        }

        if (maximo !== null && maximo !== undefined && numero > maximo) {
          return `El campo "${campo.nombre}" debe ser menor o igual a ${maximo}.`;
        }
      }
    }

    return null;
  }

  async function guardarAlta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const errorValidacion = validarCampos();

    if (errorValidacion) {
      mostrarMensaje(errorValidacion, "error");
      return;
    }

    try {
      setGuardando(true);
      setMensaje("");
      setTipoMensaje("");
      await finalizarAlta(respuestas);
    } catch (error: any) {
      console.error("Error guardando alta del producto:", error);
      mostrarMensaje(
        error?.message ||
        "No fue posible completar el alta del producto.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  async function subirArchivo(
    campo: CampoProducto,
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const archivo = evento.target.files?.[0];

    if (!archivo || !user?.id || !clienteId || !productoId || !leadProducto) {
      return;
    }

    const formatosPermitidos = (
      campo.configuracion?.formatos ?? ["pdf", "jpg", "jpeg", "png"]
    ).map((item: string) => item.toLowerCase().replace(/^\./, ""));

    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
    const maximoMb = Number(campo.configuracion?.tamano_maximo_mb ?? 10);

    if (!formatosPermitidos.includes(extension)) {
      mostrarMensaje(
        `Formato no permitido. Se aceptan: ${formatosPermitidos.join(", ")}.`,
        "error"
      );
      evento.target.value = "";
      return;
    }

    if (archivo.size > maximoMb * 1024 * 1024) {
      mostrarMensaje(
        `El archivo supera el máximo permitido de ${maximoMb} MB.`,
        "error"
      );
      evento.target.value = "";
      return;
    }

    try {
      setSubiendoCampoId(campo.id);
      setMensaje("");
      setTipoMensaje("");

      const nombreSeguro = archivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_");

      const path = `${clienteId}/${productoId}/${leadProducto.id}/${campo.codigo}/${Date.now()}_${nombreSeguro}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, archivo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      actualizarRespuesta(campo.codigo, {
        path,
        nombre: archivo.name,
        tipo: archivo.type,
        tamano: archivo.size,
        bucket: STORAGE_BUCKET,
      });

      mostrarMensaje("Archivo cargado correctamente.", "success");
    } catch (error: any) {
      console.error("Error subiendo archivo:", error);
      mostrarMensaje(
        error?.message ||
        "No fue posible subir el archivo. Verificá el bucket de Storage.",
        "error"
      );
    } finally {
      setSubiendoCampoId(null);
      evento.target.value = "";
    }
  }

  function renderCampo(campo: CampoProducto) {
    const valor = respuestas[campo.codigo];
    const opcionesCampo = opcionesPorCampo[campo.id] ?? [];

    if (campo.tipo_campo === "texto") {
      return (
        <input
          type="text"
          value={valor ?? ""}
          onChange={(event) =>
            actualizarRespuesta(campo.codigo, event.target.value)
          }
          placeholder={campo.placeholder ?? ""}
          style={styles.input}
          disabled={guardando}
        />
      );
    }

    if (campo.tipo_campo === "texto_largo") {
      return (
        <textarea
          value={valor ?? ""}
          onChange={(event) =>
            actualizarRespuesta(campo.codigo, event.target.value)
          }
          placeholder={campo.placeholder ?? ""}
          style={styles.textarea}
          rows={4}
          disabled={guardando}
        />
      );
    }

    if (campo.tipo_campo === "numero") {
      return (
        <input
          type="number"
          value={valor ?? ""}
          min={campo.configuracion?.minimo ?? undefined}
          max={campo.configuracion?.maximo ?? undefined}
          onChange={(event) =>
            actualizarRespuesta(campo.codigo, event.target.value)
          }
          placeholder={campo.placeholder ?? ""}
          style={styles.input}
          disabled={guardando}
        />
      );
    }

    if (campo.tipo_campo === "fecha") {
      return (
        <input
          type="date"
          value={valor ?? ""}
          onChange={(event) =>
            actualizarRespuesta(campo.codigo, event.target.value)
          }
          style={styles.input}
          disabled={guardando}
        />
      );
    }

    if (campo.tipo_campo === "seleccion") {
      return (
        <select
          value={valor ?? ""}
          onChange={(event) =>
            actualizarRespuesta(campo.codigo, event.target.value)
          }
          style={styles.input}
          disabled={guardando}
        >
          <option value="">Seleccioná una opción</option>
          {opcionesCampo.map((opcion) => (
            <option key={opcion.id} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      );
    }

    if (campo.tipo_campo === "seleccion_multiple") {
      const seleccionadas = Array.isArray(valor) ? valor : [];

      return (
        <div style={styles.checkboxGrid}>
          {opcionesCampo.map((opcion) => (
            <label key={opcion.id} style={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={seleccionadas.includes(opcion.valor)}
                onChange={() =>
                  alternarSeleccionMultiple(campo.codigo, opcion.valor)
                }
                disabled={guardando}
              />
              <span>{opcion.etiqueta}</span>
            </label>
          ))}
        </div>
      );
    }

    if (campo.tipo_campo === "si_no") {
      return (
        <select
          value={valor ?? ""}
          onChange={(event) =>
            actualizarRespuesta(campo.codigo, event.target.value)
          }
          style={styles.input}
          disabled={guardando}
        >
          <option value="">Seleccioná una opción</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      );
    }

    if (campo.tipo_campo === "archivo") {
      return (
        <div style={styles.fileBox}>
          <label style={styles.fileButton}>
            {subiendoCampoId === campo.id ? (
              <Loader2 size={17} />
            ) : (
              <FileUp size={17} />
            )}
            {subiendoCampoId === campo.id
              ? "Subiendo..."
              : "Seleccionar archivo"}
            <input
              type="file"
              onChange={(event) => subirArchivo(campo, event)}
              style={{ display: "none" }}
              disabled={guardando || subiendoCampoId === campo.id}
            />
          </label>

          {valor?.nombre && (
            <div style={styles.fileName}>{valor.nombre}</div>
          )}
        </div>
      );
    }

    if (campo.tipo_campo === "domicilio") {
      const domicilio =
        valor && typeof valor === "object"
          ? valor
          : { direccion: "", piso: "", departamento: "" };

      return (
        <div style={styles.addressGrid}>
          <input
            type="text"
            value={domicilio.direccion ?? ""}
            onChange={(event) =>
              actualizarRespuesta(campo.codigo, {
                ...domicilio,
                direccion: event.target.value,
              })
            }
            placeholder={campo.placeholder ?? "Dirección completa"}
            style={styles.input}
            disabled={guardando}
          />

          {campo.configuracion?.solicitar_piso && (
            <input
              type="text"
              value={domicilio.piso ?? ""}
              onChange={(event) =>
                actualizarRespuesta(campo.codigo, {
                  ...domicilio,
                  piso: event.target.value,
                })
              }
              placeholder="Piso"
              style={styles.input}
              disabled={guardando}
            />
          )}

          {campo.configuracion?.solicitar_departamento && (
            <input
              type="text"
              value={domicilio.departamento ?? ""}
              onChange={(event) =>
                actualizarRespuesta(campo.codigo, {
                  ...domicilio,
                  departamento: event.target.value,
                })
              }
              placeholder="Departamento"
              style={styles.input}
              disabled={guardando}
            />
          )}
        </div>
      );
    }

    return null;
  }

  if (userLoading || loading) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>
          <Loader2 size={24} />
          <span>Cargando datos del producto...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <div style={styles.errorBox}>Debés iniciar sesión.</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(`/clientes/${clienteId}/onboarding/productos`)
              }
              style={styles.backButton}
              disabled={guardando}
            >
              <ArrowLeft size={17} />
              Volver a productos
            </button>

            <div style={styles.breadcrumb}>
              Clientes / Onboarding / Productos / Alta
            </div>

            <h1 style={styles.title}>Alta del producto</h1>

            <p style={styles.subtitle}>
              Completá la información necesaria para confirmar la venta de{" "}
              <strong>{producto?.nombre}</strong> a{" "}
              <strong>
                {cliente?.nombre} {cliente?.apellido}
              </strong>
              .
            </p>
          </div>

        </header>

        <OnboardingSteps etapaActual={4} />

        {mensaje && (
          <div
            style={
              tipoMensaje === "success"
                ? styles.successBox
                : styles.errorBox
            }
          >
            {tipoMensaje === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertCircle size={19} />
            )}
            <span>{mensaje}</span>
          </div>
        )}

        {campos.length === 0 ? (
          <section style={styles.centerCard}>
            <PackageCheck size={34} />
            <strong>Confirmando el alta del producto...</strong>
            <span>
              Este producto no requiere información adicional. La venta se
              confirmará con los datos existentes.
            </span>
          </section>
        ) : (
          <form onSubmit={guardarAlta}>
            <section style={styles.productCard}>
              <div>
                <div style={styles.productName}>{producto?.nombre}</div>
                {producto?.descripcion && (
                  <div style={styles.productDescription}>
                    {producto.descripcion}
                  </div>
                )}
              </div>

              <div style={styles.clientData}>
                <span>
                  Cliente:{" "}
                  <strong>
                    {cliente?.nombre} {cliente?.apellido}
                  </strong>
                </span>
                {cliente?.numero_documento && (
                  <span>Documento: {cliente.numero_documento}</span>
                )}
              </div>
            </section>

            <section style={styles.formCard}>
              <div style={styles.formHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    Datos requeridos para la venta
                  </h2>
                  <p style={styles.sectionDescription}>
                    Los campos marcados con * son obligatorios.
                  </p>
                </div>
              </div>

              <div style={styles.formGrid}>
                {campos.map((campo) => (
                  <label
                    key={campo.id}
                    style={
                      campo.tipo_campo === "texto_largo" ||
                        campo.tipo_campo === "seleccion_multiple" ||
                        campo.tipo_campo === "archivo" ||
                        campo.tipo_campo === "domicilio"
                        ? styles.fieldFull
                        : styles.field
                    }
                  >
                    <span style={styles.label}>
                      {campo.nombre}
                      {campo.obligatorio ? " *" : ""}
                    </span>

                    {campo.descripcion && (
                      <span style={styles.description}>
                        {campo.descripcion}
                      </span>
                    )}

                    {renderCampo(campo)}

                    {campo.texto_ayuda && (
                      <span style={styles.helpText}>
                        {campo.texto_ayuda}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </section>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/clientes/${clienteId}/onboarding/productos`)
                }
                style={styles.secondaryButton}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                style={styles.primaryButton}
                disabled={guardando || Boolean(subiendoCampoId)}
              >
                {guardando ? (
                  <>
                    <Loader2 size={18} />
                    Confirmando venta...
                  </>
                ) : (
                  <>
                    <PackageCheck size={18} />
                    Confirmar alta y volver a productos
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}


function OnboardingSteps({ etapaActual }: { etapaActual: number }) {
  const etapas = [
    {
      numero: 1,
      titulo: "Datos del lead",
      descripcion: "Identificación y contacto",
      icono: User,
    },
    {
      numero: 2,
      titulo: "Intereses",
      descripcion: "Perfil y preguntas trigger",
      icono: Info,
    },
    {
      numero: 3,
      titulo: "Productos",
      descripcion: "Recomendados y catálogo",
      icono: ShoppingBag,
    },
    {
      numero: 4,
      titulo: "Alta del producto",
      descripcion: "Datos requeridos para la venta",
      icono: PackageCheck,
    },
  ];

  return (
    <section style={styles.stepper}>
      {etapas.map((etapa, indice) => {
        const Icono = etapa.icono;
        const activa = etapa.numero === etapaActual;
        const completada = etapa.numero < etapaActual;

        return (
          <div
            key={etapa.numero}
            style={{ display: "contents" }}
          >
            <div style={styles.stepItem}>
              <div
                style={{
                  ...styles.stepCircle,
                  ...(activa ? styles.stepCircleActive : {}),
                  ...(completada ? styles.stepCircleDone : {}),
                }}
              >
                {completada ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Icono size={18} />
                )}
              </div>

              <div>
                <div
                  style={{
                    ...styles.stepTitle,
                    ...(activa ? styles.stepTitleActive : {}),
                  }}
                >
                  Etapa {etapa.numero}: {etapa.titulo}
                </div>

                <div style={styles.stepDescription}>
                  {etapa.descripcion}
                </div>
              </div>
            </div>

            {indice < etapas.length - 1 && (
              <div
                style={{
                  ...styles.stepLine,
                  ...(completada ? styles.stepLineDone : {}),
                }}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "#f1f5f9",
  },
  container: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    marginBottom: "12px",
    padding: 0,
    border: "none",
    background: "transparent",
    color: "#475569",
    cursor: "pointer",
    fontWeight: 700,
  },
  breadcrumb: {
    marginBottom: "7px",
    color: "#64748b",
    fontSize: "13px",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "29px",
  },
  subtitle: {
    maxWidth: "760px",
    margin: "8px 0 0",
    color: "#64748b",
    lineHeight: 1.55,
  },
  stepper: {
    display: "grid",
    gridTemplateColumns:
      "auto minmax(28px, 1fr) auto minmax(28px, 1fr) auto minmax(28px, 1fr) auto",
    alignItems: "center",
    gap: "10px",
    padding: "18px 20px",
    marginBottom: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    overflowX: "auto",
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "180px",
  },
  stepCircle: {
    width: "38px",
    minWidth: "38px",
    height: "38px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #cbd5e1",
    borderRadius: "999px",
    color: "#64748b",
    background: "#f8fafc",
  },
  stepCircleActive: {
    border: "1px solid #2563eb",
    color: "#ffffff",
    background: "#2563eb",
  },
  stepCircleDone: {
    border: "1px solid #16a34a",
    color: "#ffffff",
    background: "#16a34a",
  },
  stepTitle: {
    color: "#475569",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  stepTitleActive: {
    color: "#0f172a",
  },
  stepDescription: {
    marginTop: "2px",
    color: "#94a3b8",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  stepLine: {
    height: "2px",
    minWidth: "28px",
    background: "#e2e8f0",
  },
  stepLineDone: {
    background: "#16a34a",
  },
  successBox: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "13px 15px",
    marginBottom: "16px",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    background: "#f0fdf4",
    color: "#166534",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "13px 15px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    background: "#fff1f2",
    color: "#be123c",
  },
  centerCard: {
    display: "flex",
    minHeight: "240px",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "32px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#fff",
    color: "#475569",
    textAlign: "center",
  },
  productCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    padding: "18px",
    marginBottom: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#fff",
    flexWrap: "wrap",
  },
  productName: {
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 800,
  },
  productDescription: {
    maxWidth: "680px",
    marginTop: "5px",
    color: "#64748b",
    fontSize: "14px",
  },
  clientData: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    color: "#475569",
    fontSize: "14px",
  },
  formCard: {
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#fff",
  },
  formHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "19px",
  },
  sectionDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    columnGap: "28px",
    rowGap: "24px",
    padding: "28px",
  },
  field: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "8px",
  },
  fieldFull: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "8px",
    gridColumn: "1 / -1",
  },
  label: {
    color: "#334155",
    fontWeight: 700,
    fontSize: "14px",
  },
  description: {
    color: "#64748b",
    fontSize: "12px",
  },
  helpText: {
    color: "#64748b",
    fontSize: "12px",
  },
  input: {
    width: "100%",
    minWidth: 0,
    minHeight: "48px",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#fff",
    color: "#0f172a",
    outline: "none",
    fontSize: "14px",
  },
  textarea: {
    width: "100%",
    minWidth: 0,
    minHeight: "110px",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#fff",
    color: "#0f172a",
    resize: "vertical",
    outline: "none",
    fontSize: "14px",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "9px",
  },
  checkboxOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    background: "#f8fafc",
    color: "#334155",
  },
  fileBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  fileButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 700,
  },
  fileName: {
    color: "#475569",
    fontSize: "13px",
  },
  addressGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(120px, 1fr) minmax(150px, 1fr)",
    gap: "14px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  secondaryButton: {
    minHeight: "44px",
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    minHeight: "44px",
    padding: "10px 18px",
    border: "none",
    borderRadius: "9px",
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },
};

