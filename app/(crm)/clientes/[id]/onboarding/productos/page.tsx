"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { registrarEventoCliente } from "@/lib/cliente-eventos";

type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  numero_documento: string;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_path: string | null;
  activo: boolean;
};

type Motivo = {
  id: string;
  sugerencia_id: string;
  trigger_id: string | null;
  pregunta_id: string | null;
  valor_respuesta: number | null;
  pregunta?: {
    pregunta: string;
  } | null;
};

type Sugerencia = {
  id: string;
  cliente_id: string;
  producto_id: string;
  estado: string;
  origen: string;
  producto: Producto | null;
  motivos?: Motivo[];
};

type ResultadoOfrecimiento =
  | "no_ofrecido"
  | "no_interesado"
  | "interesado"
  | "venta";

type ResultadoEstado = {
  resultado: ResultadoOfrecimiento;
  observacion: string;
};

const RESULTADO_INICIAL: ResultadoEstado = {
  resultado: "no_ofrecido",
  observacion: "",
};

const PRODUCTOS_BUCKET = "productos";

export default function OnboardingProductosPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const clienteId = params.id;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [resultadosGuardados, setResultadosGuardados] = useState<
    Record<string, boolean>
  >({});
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [resultados, setResultados] = useState<
    Record<string, ResultadoEstado>
  >({});

  const [cantidadesContratadas, setCantidadesContratadas] =
    useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [guardandoProductoId, setGuardandoProductoId] = useState<
    string | null
  >(null);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<
    "success" | "error" | ""
  >("");

  useEffect(() => {
    if (clienteId) {
      cargarPantalla();
    }
  }, [clienteId]);

  const productosRecomendados = useMemo(() => {
    return sugerencias
      .filter((sugerencia) => sugerencia.producto)
      .map((sugerencia) => ({
        ...sugerencia.producto!,
        sugerencia,
      }));
  }, [sugerencias]);

  const idsRecomendados = useMemo(() => {
    return new Set(
      productosRecomendados.map((producto) => producto.id)
    );
  }, [productosRecomendados]);

  const otrosProductos = useMemo(() => {
    return productos.filter(
      (producto) => !idsRecomendados.has(producto.id)
    );
  }, [productos, idsRecomendados]);

  async function cargarPantalla() {
    try {
      setLoading(true);
      setMensaje("");
      setTipoMensaje("");

      const clienteRes = await supabase
        .from("clientes")
        .select("id, nombre, apellido, numero_documento")
        .eq("id", clienteId)
        .single();

      if (clienteRes.error) {
        console.error("Error cargando cliente:", clienteRes.error);
        throw clienteRes.error;
      }

      const productosRes = await supabase
        .from("productos")
        .select("id, nombre, descripcion, foto_path, activo")
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (productosRes.error) {
        console.error("Error cargando productos:", productosRes.error);
        throw productosRes.error;
      }

      const sugerenciasRes = await supabase
        .from("clientes_productos_sugeridos")
        .select(
          `
          id,
          cliente_id,
          producto_id,
          estado,
          origen,
          motivos:clientes_productos_sugeridos_motivos!clientes_productos_sugeridos_motivos_sugerencia_id_fkey (
            id,
            sugerencia_id,
            trigger_id,
            pregunta_id,
            valor_respuesta,
            pregunta:preguntas_interes!clientes_productos_sugeridos_motivos_pregunta_id_fkey (
              pregunta
            )
          )
        `
        )
        .eq("cliente_id", clienteId)
        .eq("estado", "pendiente");

      if (sugerenciasRes.error) {
        console.error("Error cargando sugerencias:", sugerenciasRes.error);
        throw sugerenciasRes.error;
      }

      const contratacionesRes = await supabase
        .from("lead_producto")
        .select("id, producto_id")
        .eq("cliente_id", clienteId)
        .eq("estado", "completado");

      if (contratacionesRes.error) {
        console.error(
          "Error cargando productos contratados:",
          contratacionesRes.error
        );

        throw contratacionesRes.error;
      }


      const productosCargados = (productosRes.data ?? []) as Producto[];

      const sugerenciasConProducto = (sugerenciasRes.data ?? []).map(
        (sugerencia: any) => ({
          ...sugerencia,
          producto:
            productosCargados.find(
              (producto) => producto.id === sugerencia.producto_id
            ) ?? null,
        })
      );

      setCliente(clienteRes.data as Cliente);
      setProductos(productosCargados);
      setSugerencias(sugerenciasConProducto as Sugerencia[]);

      const cantidades: Record<string, number> = {};

      for (const contratacion of contratacionesRes.data ?? []) {
        const productoId = contratacion.producto_id;

        cantidades[productoId] =
          (cantidades[productoId] ?? 0) + 1;
      }

      setCantidadesContratadas(cantidades);

      setResultados({});
    } catch (error: any) {
      console.error("Error general cargarPantalla:", error);

      mostrarMensaje(
        error.message ||
        "No se pudo cargar la oferta de productos.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function mostrarMensaje(
    texto: string,
    tipo: "success" | "error"
  ) {
    setMensaje(texto);
    setTipoMensaje(tipo);
  }

  function actualizarResultado(
    productoId: string,
    cambio: Partial<ResultadoEstado>
  ) {
    setResultados((previos) => ({
      ...previos,
      [productoId]: {
        ...(previos[productoId] ?? RESULTADO_INICIAL),
        ...cambio,
      },
    }));

    setResultadosGuardados((previos) => ({
      ...previos,
      [productoId]: false,
    }));

    setMensaje("");
    setTipoMensaje("");
  }

  async function guardarResultado(
    producto: Producto,
    sugerencia?: Sugerencia
  ) {
    const estado =
      resultados[producto.id] ?? RESULTADO_INICIAL;

    if (estado.resultado === "no_ofrecido") {
      mostrarMensaje(
        "Seleccioná el resultado del ofrecimiento antes de guardar.",
        "error"
      );
      return;
    }

    try {
      setGuardandoProductoId(producto.id);
      setMensaje("");
      setTipoMensaje("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "No se pudo identificar al usuario autenticado."
        );
      }

      const ahora = new Date().toISOString();

      const { error: ofrecimientoError } = await supabase
        .from("ofrecimientos_productos")
        .upsert(
          {
            cliente_id: clienteId,
            producto_id: producto.id,
            sugerencia_id: sugerencia?.id ?? null,
            resultado: estado.resultado,
            observacion: estado.observacion.trim() || null,
            vigente: true,
            created_by: user.id,
            updated_by: user.id,
            updated_at: ahora,
          },
          {
            onConflict: "cliente_id,producto_id",
          }
        );

      if (ofrecimientoError) throw ofrecimientoError;

      if (estado.resultado === "no_interesado") {
        await registrarEventoCliente({
          clienteId,
          tipoEvento: "producto_rechazado",
          titulo: `Producto rechazado: ${producto.nombre}`,
          descripcion:
            estado.observacion.trim() ||
            "El cliente indicó que no está interesado.",
          productoId: producto.id,
          datos: {
            resultado: estado.resultado,
            origen: sugerencia ? "trigger" : "catalogo",
            sugerencia_id: sugerencia?.id ?? null,
          },
        });
      }

      if (estado.resultado === "interesado") {
        await registrarEventoCliente({
          clienteId,
          tipoEvento: "producto_interesado",
          titulo: `Interés registrado: ${producto.nombre}`,
          descripcion:
            estado.observacion.trim() ||
            "El cliente manifestó interés en el producto.",
          productoId: producto.id,
          datos: {
            resultado: estado.resultado,
            origen: sugerencia ? "trigger" : "catalogo",
            sugerencia_id: sugerencia?.id ?? null,
          },
        });
      }

      if (sugerencia) {
        const { error: sugerenciaError } = await supabase
          .from("clientes_productos_sugeridos")
          .update({
            estado:
              estado.resultado === "venta"
                ? "venta"
                : estado.resultado,
            updated_at: ahora,
          })
          .eq("id", sugerencia.id);

        if (sugerenciaError) throw sugerenciaError;
      }

      if (estado.resultado === "venta") {


        const { data: leadExistente, error: buscarLeadError } =
          await supabase
            .from("lead_producto")
            .select("id")
            .eq("cliente_id", clienteId)
            .eq("producto_id", producto.id)
            .eq("estado", "pendiente_datos")
            .maybeSingle();

        if (buscarLeadError) throw buscarLeadError;

        let leadProductoId = leadExistente?.id;
        let ventaNueva = false;

        if (!leadProductoId) {
          const { data: nuevoLeadProducto, error: crearLeadError } =
            await supabase
              .from("lead_producto")
              .insert({
                cliente_id: clienteId,
                producto_id: producto.id,
                sugerencia_id: sugerencia?.id ?? null,
                estado: "pendiente_datos",
                datos_alta: {},
                created_by: user.id,
                updated_by: user.id,
                updated_at: ahora,
              })
              .select("id")
              .single();

          if (crearLeadError) throw crearLeadError;

          leadProductoId = nuevoLeadProducto.id;
          ventaNueva = true;
        }

        if (ventaNueva) {
          await registrarEventoCliente({
            clienteId,
            tipoEvento: "venta_iniciada",
            titulo: `Venta iniciada: ${producto.nombre}`,
            descripcion:
              estado.observacion.trim() ||
              "Se inició el alta del producto.",
            productoId: producto.id,
            leadProductoId,
            datos: {
              resultado: "venta",
              origen: sugerencia ? "trigger" : "catalogo",
              sugerencia_id: sugerencia?.id ?? null,
            },
          });
        }


        const { error: clienteError } = await supabase
          .from("clientes")
          .update({
            onboarding_etapa: "alta_producto",
            updated_at: ahora,
          })
          .eq("id", clienteId);

        if (clienteError) throw clienteError;



        router.push(
          `/clientes/${clienteId}/onboarding/productos/${producto.id}/alta?leadProductoId=${leadProductoId}`
        );

        return;
      }

      setResultadosGuardados((previos) => ({
        ...previos,
        [producto.id]: true,
      }));

      mostrarMensaje(
        `Resultado guardado para ${producto.nombre}.`,
        "success"
      );

      setResultados((previos) => ({
        ...previos,
        [producto.id]: {
          resultado: "no_ofrecido",
          observacion: "",
        },
      }));
    } catch (error: any) {
      console.error(error);
      mostrarMensaje(
        error.message ||
        "No fue posible guardar el resultado.",
        "error"
      );
    } finally {
      setGuardandoProductoId(null);
    }
  }

  async function finalizarSinVenta() {
    try {
      setGuardandoProductoId("finalizar");

      const { error } = await supabase
        .from("clientes")
        .update({
          onboarding_etapa: "completado",
          onboarding_completado: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) throw error;

      router.push(`/clientes/${clienteId}`);
    } catch (error: any) {
      console.error(error);
      mostrarMensaje(
        error.message ||
        "No fue posible finalizar el onboarding.",
        "error"
      );
    } finally {
      setGuardandoProductoId(null);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>
            Cargando productos...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.breadcrumb}>
              Clientes / Onboarding / Productos
            </div>

            <h1 style={styles.title}>
              Ofrecimiento de productos
            </h1>

            <p style={styles.subtitle}>
              Registrá el resultado comercial de cada producto
              para{" "}
              <strong>
                {cliente?.nombre} {cliente?.apellido}
              </strong>
              .
            </p>
          </div>

          <button
            type="button"
            style={styles.backButton}
            onClick={() =>
              router.push(
                `/clientes/${clienteId}/onboarding/intereses`
              )
            }
          >
            <ArrowLeft size={17} />
            Volver a intereses
          </button>
        </header>

        <OnboardingSteps etapaActual={3} />

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

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIconRecommended}>
              <Sparkles size={20} />
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                Productos recomendados
              </h2>
              <p style={styles.sectionDescription}>
                Recomendaciones generadas por las respuestas
                trigger del relevamiento.
              </p>
            </div>
          </div>

          {productosRecomendados.length === 0 ? (
            <div style={styles.emptyCard}>
              No se generaron productos recomendados.
            </div>
          ) : (
            <div style={styles.productGrid}>
              {productosRecomendados.map((producto) => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  sugerencia={producto.sugerencia}
                  recomendado
                  estado={
                    resultados[producto.id] ??
                    RESULTADO_INICIAL
                  }
                  cantidadContratada={
                    cantidadesContratadas[producto.id] ?? 0
                  }
                  guardando={
                    guardandoProductoId === producto.id
                  }
                  guardado={
                    resultadosGuardados[producto.id] ?? false
                  }
                  onChange={(cambio) =>
                    actualizarResultado(producto.id, cambio)
                  }
                  onSave={() =>
                    guardarResultado(
                      producto,
                      producto.sugerencia
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <ShoppingBag size={20} />
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                Otros productos
              </h2>
              <p style={styles.sectionDescription}>
                Catálogo activo disponible para ofrecer
                adicionalmente.
              </p>
            </div>
          </div>

          {otrosProductos.length === 0 ? (
            <div style={styles.emptyCard}>
              No hay otros productos activos.
            </div>
          ) : (
            <div style={styles.productGrid}>
              {otrosProductos.map((producto) => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  cantidadContratada={
                    cantidadesContratadas[producto.id] ?? 0
                  }
                  estado={
                    resultados[producto.id] ??
                    RESULTADO_INICIAL
                  }
                  guardando={
                    guardandoProductoId === producto.id
                  }
                  guardado={
                    resultadosGuardados[producto.id] ?? false
                  }
                  onChange={(cambio) =>
                    actualizarResultado(producto.id, cambio)
                  }
                  onSave={() =>
                    guardarResultado(producto)
                  }
                />
              ))}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <button
            type="button"
            style={styles.finishButton}
            disabled={guardandoProductoId !== null}
            onClick={() => router.push(`/clientes/${clienteId}`)}
          >
            Ver al cliente
          </button>

          <button
            type="button"
            style={styles.finishButton}
            disabled={guardandoProductoId !== null}
            onClick={() => router.push("/clientes/nuevo")}
          >
            Finalizar gestión sin nuevas ventas
          </button>
        </footer>
      </div>
    </main>
  );
}

function obtenerUrlFoto(fotoPath: string | null) {
  if (!fotoPath) return null;

  // Por si en algún registro ya quedó guardada una URL completa.
  if (
    fotoPath.startsWith("http://") ||
    fotoPath.startsWith("https://")
  ) {
    return fotoPath;
  }

  const pathLimpio = fotoPath.replace(/^\/+/, "");

  const { data } = supabase.storage
    .from(PRODUCTOS_BUCKET)
    .getPublicUrl(pathLimpio);

  return data.publicUrl;
}

function ProductCard({
  producto,
  sugerencia,
  recomendado = false,
  cantidadContratada,
  estado,
  guardando,
  guardado,
  onChange,
  onSave,
}: {
  producto: Producto;
  sugerencia?: Sugerencia;
  recomendado?: boolean;
  cantidadContratada: number;
  estado: ResultadoEstado;
  guardando: boolean;
  guardado: boolean;
  onChange: (
    cambio: Partial<ResultadoEstado>
  ) => void;
  onSave: () => void;
}) {
  const motivos =
    sugerencia?.motivos
      ?.map((motivo) => motivo.pregunta?.pregunta)
      .filter(Boolean) ?? [];

  const fotoUrl = obtenerUrlFoto(producto.foto_path);

  const yaContratado = cantidadContratada > 0;

  return (
    <article
      style={{
        ...styles.productCard,
        ...(yaContratado
          ? styles.productCardContracted
          : {}),
      }}
    >
      <div style={styles.productImageContainer}>
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={`Imagen de ${producto.nombre}`}
            style={styles.productImage}
            onError={(event) => {
              console.error(
                "No se pudo cargar la foto del producto:",
                producto.nombre,
                {
                  fotoPath: producto.foto_path,
                  fotoUrl,
                }
              );

              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div style={styles.productImagePlaceholder}>
            <ShoppingBag size={34} />
            <span>Sin imagen</span>
          </div>
        )}

        {recomendado && (
          <span style={styles.imageRecommendedBadge}>
            <Sparkles size={13} />
            Recomendado
          </span>
        )}
        {yaContratado && (
          <div style={styles.contractedBadge}>
            <CheckCircle2 size={14} />

            <span>
              Ya tiene {cantidadContratada}
            </span>
          </div>
        )}
      </div>

      <div style={styles.productTop}>
        <div>
          <h3 style={styles.productName}>
            {producto.nombre}
          </h3>

          {producto.descripcion && (
            <p style={styles.productDescription}>
              {producto.descripcion}
            </p>
          )}
        </div>
      </div>


      {motivos.length > 0 && (
        <div style={styles.reasonBox}>
          <strong style={styles.reasonTitle}>
            Motivo de recomendación
          </strong>

          {motivos.map((motivo) => (
            <div key={motivo} style={styles.reasonItem}>
              • {motivo}
            </div>
          ))}
        </div>
      )}

      <div style={styles.formArea}>
        <label style={styles.field}>
          <span style={styles.label}>
            Resultado del ofrecimiento
          </span>

          <select
            style={styles.input}
            value={estado.resultado}
            onChange={(event) =>
              onChange({
                resultado: event.target
                  .value as ResultadoOfrecimiento,
              })
            }
            disabled={guardando}
          >
            <option value="no_ofrecido">
              Seleccioná un resultado
            </option>
            <option value="no_interesado">
              No interesado
            </option>
            <option value="interesado">
              Interesado
            </option>
            <option value="venta">Venta</option>
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>
            Observación
          </span>

          <textarea
            style={styles.textarea}
            value={estado.observacion}
            onChange={(event) =>
              onChange({
                observacion: event.target.value,
              })
            }
            placeholder="Detalle opcional de la conversación"
            disabled={guardando}
          />
        </label>

        <button
          type="button"
          style={{
            ...styles.saveButton,
            ...(guardado && !guardando
              ? styles.savedButton
              : {}),
            ...(guardando
              ? styles.disabledButton
              : {}),
          }}
          disabled={guardando}
          onClick={onSave}
        >
          {guardando
            ? "Guardando..."
            : guardado
              ? "✓ Resultado guardado"
              : estado.resultado === "venta"
                ? "Registrar venta y completar datos"
                : "Guardar resultado"}
        </button>
      </div>
    </article>
  );
}

function OnboardingSteps({
  etapaActual,
}: {
  etapaActual: number;
}) {
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
          <React.Fragment key={etapa.numero}>
            <div style={styles.stepItem}>
              <div
                style={{
                  ...styles.stepCircle,
                  ...(activa
                    ? styles.stepCircleActive
                    : {}),
                  ...(completada
                    ? styles.stepCircleDone
                    : {}),
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
                    ...(activa
                      ? styles.stepTitleActive
                      : {}),
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
                  ...(completada
                    ? styles.stepLineDone
                    : {}),
                }}
              />
            )}
          </React.Fragment>
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
    maxWidth: "1180px",
    margin: "0 auto",
  },
  loading: {
    padding: "48px",
    color: "#64748b",
    textAlign: "center",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  breadcrumb: {
    marginBottom: "8px",
    color: "#64748b",
    fontSize: "13px",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "28px",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },
  backButton: {
    display: "inline-flex",
    minHeight: "40px",
    alignItems: "center",
    gap: "8px",
    padding: "9px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    color: "#334155",
    background: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
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
    borderColor: "#2563eb",
    color: "#ffffff",
    background: "#2563eb",
  },
  stepCircleDone: {
    borderColor: "#16a34a",
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
    gap: "10px",
    padding: "13px 15px",
    marginBottom: "16px",
    border: "1px solid #86efac",
    borderRadius: "10px",
    color: "#166534",
    background: "#f0fdf4",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "13px 15px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    color: "#b91c1c",
    background: "#fef2f2",
  },
  section: {
    padding: "20px",
    marginBottom: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
  },
  sectionIcon: {
    display: "grid",
    width: "42px",
    height: "42px",
    placeItems: "center",
    borderRadius: "11px",
    color: "#2563eb",
    background: "#eff6ff",
  },
  sectionIconRecommended: {
    display: "grid",
    width: "42px",
    height: "42px",
    placeItems: "center",
    borderRadius: "11px",
    color: "#7c3aed",
    background: "#ede9fe",
  },
  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "18px",
  },
  sectionDescription: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(310px, 1fr))",
    gap: "16px",
  },
  productCard: {
    display: "flex",
    flexDirection: "column",
    padding: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#ffffff",
  },
  productTop: {
  flex: 1,
},
  badgeRow: {
    display: "flex",
    gap: "7px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  recommendedBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    color: "#6d28d9",
    background: "#ede9fe",
    fontSize: "11px",
    fontWeight: 700,
  },
  categoryBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    color: "#0369a1",
    background: "#e0f2fe",
    fontSize: "11px",
    fontWeight: 700,
  },
  productName: {
    margin: 0,
    color: "#0f172a",
    fontSize: "17px",
  },
  productDescription: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  reasonBox: {
    padding: "12px",
    margin: "12px 0",
    border: "1px solid #ddd6fe",
    borderRadius: "9px",
    color: "#5b21b6",
    background: "#f5f3ff",
    fontSize: "12px",
  },
  reasonTitle: {
    display: "block",
    marginBottom: "6px",
  },
  reasonItem: {
    marginTop: "4px",
  },
formArea: {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "12px",
},
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: "42px",
    boxSizing: "border-box",
    padding: "9px 11px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    color: "#0f172a",
    background: "#ffffff",
  },
  textarea: {
    width: "100%",
    minHeight: "78px",
    boxSizing: "border-box",
    padding: "9px 11px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    color: "#0f172a",
    background: "#ffffff",
    resize: "vertical",
  },
  saveButton: {
    minHeight: "42px",
    padding: "10px 15px",
    border: "none",
    borderRadius: "9px",
    color: "#ffffff",
    background: "#2563eb",
    fontWeight: 700,
    cursor: "pointer",
  },
  savedButton: {
    background: "#16a34a",
    borderColor: "#16a34a",
    color: "#ffffff",
  },
  emptyCard: {
    padding: "28px",
    border: "1px dashed #cbd5e1",
    borderRadius: "10px",
    color: "#64748b",
    background: "#f8fafc",
    textAlign: "center",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    paddingBottom: "8px",
  },
  finishButton: {
    minHeight: "42px",
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    color: "#334155",
    background: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  productImageContainer: {
    position: "relative",
    width: "100%",
    height: "220px",
    marginBottom: "16px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#f8fafc",
  },
  productImage: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
    objectPosition: "center",
  },

  productCardContracted: {
    border: "2px solid #22c55e",
    background: "#f0fdf4",
    boxShadow:
      "0 4px 14px rgba(34, 197, 94, 0.14)",
  },

  contractedBadge: {
    position: "absolute",
    right: "12px",
    bottom: "12px",
    zIndex: 2,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 10px",
    border: "1px solid #86efac",
    borderRadius: "999px",
    color: "#ffffff",
    background: "#16a34a",
    boxShadow:
      "0 3px 10px rgba(22, 163, 74, 0.3)",
    fontSize: "12px",
    fontWeight: 800,
  },

  contractedNotice: {
    padding: "10px 12px",
    marginBottom: "12px",
    border: "1px solid #86efac",
    borderRadius: "9px",
    color: "#166534",
    background: "#dcfce7",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  productImagePlaceholder: {
    display: "flex",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#94a3b8",
    background: "#f8fafc",
    fontSize: "12px",
  },

  imageRecommendedBadge: {
    position: "absolute",
    top: "12px",
    left: "12px",
    zIndex: 2,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 9px",
    borderRadius: "999px",
    color: "#ffffff",
    background: "#7c3aed",
    fontSize: "11px",
    fontWeight: 800,
  },

};