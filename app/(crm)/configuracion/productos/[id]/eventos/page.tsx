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

/* =========================================================
   TIPOS
========================================================= */

type Empresa = {
  id: string;
  nombre: string;
  cuit: string;
  activo: boolean;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  moneda: string;
  activo: boolean;
  empresas: Empresa | null;
};

type ProductoSupabase = Omit<Producto, "empresas"> & {
  empresas: Empresa[] | Empresa | null;
};





type EventoFormulario = {
  localId: string;
  id: string | null;

  atributo: string;
  cantidad_eventos: string;
  tope_cobertura: string;
  carencia_dias: string;

  activo: boolean;
};

type EventoBaseDatos = {
  id: string;
  producto_id: string;

  atributo: string;
  cantidad_eventos: number;
  tope_cobertura: number;
  carencia_dias: number;

  activo: boolean;

  created_by: string;
  updated_by: string | null;

  created_at: string;
  updated_at: string;
};

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function generarIdLocal() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function crearFilaVacia(): EventoFormulario {
  return {
    localId: generarIdLocal(),
    id: null,

    atributo: "",
    cantidad_eventos: "",
    tope_cobertura: "",
    carencia_dias: "0",

    activo: true,
  };
}

function convertirNumero(valor: string) {
  const texto = valor.trim();

  if (!texto) {
    return Number.NaN;
  }

  /*
   * Admite:
   * 150000
   * 150000,50
   * 150.000,50
   * 150000.50
   */
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;

  return Number(normalizado);
}

function formatearPesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function formatearPrecio(
  valor: number,
  moneda: string
) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  } catch {
    return `${moneda} ${Number(valor).toLocaleString(
      "es-AR"
    )}`;
  }
}

function formatearCuit(cuit: string) {
  const limpio = cuit.replace(/\D/g, "");

  if (limpio.length !== 11) {
    return cuit;
  }

  return `${limpio.slice(0, 2)}-${limpio.slice(
    2,
    10
  )}-${limpio.slice(10)}`;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function ProductoEventosPage() {
  const params = useParams();
  const router = useRouter();

  const {
    user,
    role,
    loading: userLoading,
  } = useUser();

  const productoId = useMemo(() => {
    const id = params?.id;

    return Array.isArray(id) ? id[0] : id;
  }, [params]);

  const [producto, setProducto] =
    useState<Producto | null>(null);

  const [eventos, setEventos] = useState<
    EventoFormulario[]
  >([]);

  const [idsEliminados, setIdsEliminados] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [hayCambios, setHayCambios] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  /* =======================================================
     CARGAR PRODUCTO
  ======================================================= */

const cargarProducto = useCallback(async () => {
  if (!productoId) {
    throw new Error(
      "No se pudo identificar el producto."
    );
  }

  const { data, error: productoError } =
    await supabase
      .from("productos")
      .select(`
        id,
        nombre,
        descripcion,
        precio,
        moneda,
        activo,
        empresas (
          id,
          nombre,
          cuit,
          activo
        )
      `)
      .eq("id", productoId)
      .single();

  if (productoError) {
    throw productoError;
  }

  if (!data) {
    throw new Error(
      "No se encontró la información del producto."
    );
  }

  const productoRecibido = data as ProductoSupabase;

  const empresaNormalizada = Array.isArray(
    productoRecibido.empresas
  )
    ? productoRecibido.empresas[0] ?? null
    : productoRecibido.empresas ?? null;

  setProducto({
    ...productoRecibido,
    empresas: empresaNormalizada,
  });
}, [productoId]);

  /* =======================================================
     CARGAR EVENTOS
  ======================================================= */

  const cargarEventos = useCallback(async () => {
    if (!productoId) {
      throw new Error(
        "No se pudo identificar el producto."
      );
    }

    const { data, error: eventosError } =
      await supabase
        .from("productos_eventos")
        .select(`
          id,
          producto_id,
          atributo,
          cantidad_eventos,
          tope_cobertura,
          carencia_dias,
          activo,
          created_by,
          updated_by,
          created_at,
          updated_at
        `)
        .eq("producto_id", productoId)
        .order("created_at", {
          ascending: true,
        });

    if (eventosError) {
      throw eventosError;
    }

    const registros =
      (data ?? []) as EventoBaseDatos[];

    setEventos(
      registros.map((evento) => ({
        localId: evento.id,
        id: evento.id,

        atributo: evento.atributo,
        cantidad_eventos: String(
          evento.cantidad_eventos
        ),
        tope_cobertura: String(
          evento.tope_cobertura
        ),
        carencia_dias: String(
          evento.carencia_dias
        ),

        activo: evento.activo,
      }))
    );

    setIdsEliminados([]);
    setHayCambios(false);
  }, [productoId]);

  /* =======================================================
     CARGA INICIAL
  ======================================================= */

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setMensaje("");

      await Promise.all([
        cargarProducto(),
        cargarEventos(),
      ]);
    } catch (err: any) {
      console.error(
        "Error cargando configuración de eventos:",
        err
      );

      if (err?.code === "PGRST116") {
        setError(
          "No se encontró el producto solicitado."
        );
      } else {
        setError(
          err?.message ||
            "No fue posible cargar los eventos."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [cargarProducto, cargarEventos]);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!user || !productoId) {
      setLoading(false);
      return;
    }

    cargarDatos();
  }, [
    user,
    userLoading,
    productoId,
    cargarDatos,
  ]);

  /* =======================================================
     ACTUALIZAR FILA
  ======================================================= */

  function actualizarEvento<
    K extends keyof Omit<
      EventoFormulario,
      "localId" | "id"
    >
  >(
    localId: string,
    campo: K,
    valor: EventoFormulario[K]
  ) {
    setEventos((actuales) =>
      actuales.map((evento) =>
        evento.localId === localId
          ? {
              ...evento,
              [campo]: valor,
            }
          : evento
      )
    );

    setHayCambios(true);
    setMensaje("");
    setError("");
  }

  /* =======================================================
     AGREGAR FILA
  ======================================================= */

  function agregarFila() {
    setEventos((actuales) => [
      ...actuales,
      crearFilaVacia(),
    ]);

    setHayCambios(true);
    setMensaje("");
    setError("");
  }

  /* =======================================================
     DUPLICAR FILA
  ======================================================= */

  function duplicarFila(evento: EventoFormulario) {
    setEventos((actuales) => [
      ...actuales,
      {
        ...evento,
        localId: generarIdLocal(),
        id: null,
      },
    ]);

    setHayCambios(true);
    setMensaje("");
    setError("");
  }

  /* =======================================================
     ELIMINAR FILA
  ======================================================= */

  function eliminarFila(evento: EventoFormulario) {
    const tieneContenido =
      evento.atributo.trim() ||
      evento.cantidad_eventos.trim() ||
      evento.tope_cobertura.trim();

    if (evento.id || tieneContenido) {
      const confirmado = window.confirm(
        evento.atributo
          ? `¿Querés eliminar el evento "${evento.atributo}"?`
          : "¿Querés eliminar esta fila?"
      );

      if (!confirmado) {
        return;
      }
    }

    if (evento.id) {
      setIdsEliminados((actuales) => [
        ...new Set([...actuales, evento.id as string]),
      ]);
    }

    setEventos((actuales) =>
      actuales.filter(
        (fila) => fila.localId !== evento.localId
      )
    );

    setHayCambios(true);
    setMensaje("");
    setError("");
  }

  /* =======================================================
     VALIDACIONES
  ======================================================= */

  function validarEventos() {
    for (
      let indice = 0;
      indice < eventos.length;
      indice++
    ) {
      const evento = eventos[indice];
      const numeroFila = indice + 1;

      if (!evento.atributo.trim()) {
        return `Ingresá el atributo en la fila ${numeroFila}.`;
      }

      if (evento.atributo.trim().length > 200) {
        return `El atributo de la fila ${numeroFila} no puede superar los 200 caracteres.`;
      }

      if (!evento.cantidad_eventos.trim()) {
        return `Ingresá la cantidad de eventos en la fila ${numeroFila}.`;
      }

      const cantidad = convertirNumero(
        evento.cantidad_eventos
      );

      if (
        !Number.isInteger(cantidad) ||
        cantidad < 0
      ) {
        return `La cantidad de eventos de la fila ${numeroFila} debe ser un número entero igual o mayor que cero.`;
      }

      if (!evento.tope_cobertura.trim()) {
        return `Ingresá el tope de cobertura en la fila ${numeroFila}.`;
      }

      const tope = convertirNumero(
        evento.tope_cobertura
      );

      if (
        !Number.isFinite(tope) ||
        tope < 0
      ) {
        return `El tope de cobertura de la fila ${numeroFila} debe ser igual o mayor que cero.`;
      }

      if (!evento.carencia_dias.trim()) {
        return `Ingresá la carencia en la fila ${numeroFila}.`;
      }

      const carencia = convertirNumero(
        evento.carencia_dias
      );

      if (
        !Number.isInteger(carencia) ||
        carencia < 0
      ) {
        return `La carencia de la fila ${numeroFila} debe ser un número entero de días igual o mayor que cero.`;
      }
    }

    return null;
  }

  /* =======================================================
     GUARDAR
  ======================================================= */

  async function guardarEventos(
    eventoFormulario: FormEvent<HTMLFormElement>
  ) {
    eventoFormulario.preventDefault();

    if (!user?.id) {
      setError(
        "No fue posible identificar al usuario."
      );
      return;
    }

    if (role !== "admin") {
      setError(
        "No tenés permisos para modificar los eventos."
      );
      return;
    }

    if (!productoId) {
      setError(
        "No se pudo identificar el producto."
      );
      return;
    }

    const errorValidacion = validarEventos();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      /*
       * 1. Eliminar filas removidas.
       */
      if (idsEliminados.length > 0) {
        const { error: eliminarError } =
          await supabase
            .from("productos_eventos")
            .delete()
            .eq("producto_id", productoId)
            .in("id", idsEliminados);

        if (eliminarError) {
          throw eliminarError;
        }
      }

      /*
       * 2. Actualizar filas existentes.
       */
      const existentes = eventos.filter(
        (evento) => evento.id
      );

      if (existentes.length > 0) {
        const actualizaciones = existentes.map(
          (evento) =>
            supabase
              .from("productos_eventos")
              .update({
                atributo: evento.atributo.trim(),

                cantidad_eventos: convertirNumero(
                  evento.cantidad_eventos
                ),

                tope_cobertura: convertirNumero(
                  evento.tope_cobertura
                ),

                carencia_dias: convertirNumero(
                  evento.carencia_dias
                ),

                activo: evento.activo,

                updated_by: user.id,
              })
              .eq("id", evento.id as string)
              .eq("producto_id", productoId)
        );

        const resultados =
          await Promise.all(actualizaciones);

        const resultadoConError = resultados.find(
          (resultado) => resultado.error
        );

        if (resultadoConError?.error) {
          throw resultadoConError.error;
        }
      }

      /*
       * 3. Insertar filas nuevas.
       */
      const nuevos = eventos.filter(
        (evento) => !evento.id
      );

      if (nuevos.length > 0) {
        const registros = nuevos.map((evento) => ({
          producto_id: productoId,

          atributo: evento.atributo.trim(),

          cantidad_eventos: convertirNumero(
            evento.cantidad_eventos
          ),

          tope_cobertura: convertirNumero(
            evento.tope_cobertura
          ),

          carencia_dias: convertirNumero(
            evento.carencia_dias
          ),

          activo: evento.activo,

          created_by: user.id,
          updated_by: null,
        }));

        const { error: insertarError } =
          await supabase
            .from("productos_eventos")
            .insert(registros);

        if (insertarError) {
          throw insertarError;
        }
      }

      await cargarEventos();

      setMensaje(
        "Los eventos se guardaron correctamente."
      );
    } catch (err: any) {
      console.error(
        "Error guardando eventos:",
        err
      );

      if (err?.code === "42501") {
        setError(
          "No tenés permisos para guardar los eventos."
        );
      } else if (err?.code === "23514") {
        setError(
          "Uno de los eventos no cumple las reglas de validación."
        );
      } else if (err?.code === "23503") {
        setError(
          "El producto seleccionado ya no existe."
        );
      } else {
        setError(
          err?.message ||
            "No fue posible guardar los eventos."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  /* =======================================================
     VOLVER
  ======================================================= */

  function volverAProductos() {
    if (hayCambios) {
      const confirmado = window.confirm(
        "Hay cambios sin guardar. ¿Querés salir igualmente?"
      );

      if (!confirmado) {
        return;
      }
    }

    router.push("/configuracion/productos");
  }

  /* =======================================================
     TOTALES
  ======================================================= */

  const cantidadTotalEventos = useMemo(() => {
    return eventos.reduce((total, evento) => {
      const cantidad = convertirNumero(
        evento.cantidad_eventos
      );

      return (
        total +
        (Number.isFinite(cantidad) ? cantidad : 0)
      );
    }, 0);
  }, [eventos]);

  const mayorCobertura = useMemo(() => {
    return eventos.reduce((mayor, evento) => {
      const cobertura = convertirNumero(
        evento.tope_cobertura
      );

      if (!Number.isFinite(cobertura)) {
        return mayor;
      }

      return Math.max(mayor, cobertura);
    }, 0);
  }, [eventos]);

  /* =======================================================
     CONTROL DE ACCESO
  ======================================================= */

  if (userLoading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingBox}>
          Cargando usuario...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <div style={styles.errorBox}>
          Debés iniciar sesión para acceder a esta página.
        </div>
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <main style={styles.page}>
        <div style={styles.errorBox}>
          No tenés permisos para configurar eventos de
          productos.
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <button
              type="button"
              onClick={volverAProductos}
              style={styles.backButton}
            >
              ← Volver a productos
            </button>

            <div style={styles.breadcrumb}>
              Configuración / Productos / Eventos
            </div>

            <h1 style={styles.title}>
              Eventos del producto
            </h1>

            <p style={styles.subtitle}>
              Configurá atributos, cantidad de eventos,
              topes de cobertura y días de carencia.
            </p>
          </div>

          <button
            type="button"
            onClick={agregarFila}
            style={styles.eventsButton}
            disabled={loading || guardando}
          >
            + Agregar fila
          </button>
        </header>

        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {mensaje && (
          <div style={styles.successBox}>
            {mensaje}
          </div>
        )}

        {loading ? (
          <div style={styles.loadingBox}>
            Cargando producto y eventos...
          </div>
        ) : !producto ? (
          <div style={styles.errorBox}>
            No fue posible encontrar el producto.
          </div>
        ) : (
          <>
            <section style={styles.productCard}>
              <div style={styles.productMain}>
                <div style={styles.productIcon}>P</div>

                <div>
                  <div style={styles.productLabel}>
                    Producto
                  </div>

                  <h2 style={styles.productName}>
                    {producto.nombre}
                  </h2>

                  {producto.descripcion && (
                    <p style={styles.productDescription}>
                      {producto.descripcion}
                    </p>
                  )}
                </div>
              </div>

              <div style={styles.productDetails}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>
                    Empresa
                  </span>

                  <strong>
                    {producto.empresas?.nombre || "—"}
                  </strong>

                  {producto.empresas?.cuit && (
                    <span style={styles.detailSecondary}>
                      CUIT{" "}
                      {formatearCuit(
                        producto.empresas.cuit
                      )}
                    </span>
                  )}
                </div>

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>
                    Precio
                  </span>

                  <strong>
                    {formatearPrecio(
                      producto.precio,
                      producto.moneda
                    )}
                  </strong>
                </div>

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>
                    Estado
                  </span>

                  <span
                    style={
                      producto.activo
                        ? styles.activeBadge
                        : styles.inactiveBadge
                    }
                  >
                    {producto.activo
                      ? "Activo"
                      : "Inactivo"}
                  </span>
                </div>
              </div>
            </section>

            <form onSubmit={guardarEventos}>
              <section style={styles.tableCard}>
                <div style={styles.tableHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>
                      Coberturas y eventos
                    </h2>

                    <p style={styles.sectionDescription}>
                      Cada fila representa un atributo o una
                      cobertura del producto.
                    </p>
                  </div>

                  <div style={styles.rowsCounter}>
                    {eventos.length}{" "}
                    {eventos.length === 1
                      ? "fila"
                      : "filas"}
                  </div>
                </div>

                {eventos.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>＋</div>

                    <strong>
                      El producto todavía no tiene eventos.
                    </strong>

                    <span>
                      Agregá la primera fila para comenzar.
                    </span>

                    <button
                      type="button"
                      onClick={agregarFila}
                      style={styles.primaryButton}
                    >
                      Agregar primer evento
                    </button>
                  </div>
                ) : (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.thNumber}>#</th>

                          <th style={styles.th}>
                            Atributo
                          </th>

                          <th style={styles.th}>
                            Cantidad de eventos
                          </th>

                          <th style={styles.th}>
                            Tope de cobertura
                          </th>

                          <th style={styles.th}>
                            Carencia
                          </th>

                          <th style={styles.thStatus}>
                            Estado
                          </th>

                          <th style={styles.thActions}>
                            Acciones
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {eventos.map(
                          (evento, indice) => (
                            <tr key={evento.localId}>
                              <td style={styles.tdNumber}>
                                {indice + 1}
                              </td>

                              <td style={styles.td}>
                                <input
                                  type="text"
                                  value={evento.atributo}
                                  onChange={(e) =>
                                    actualizarEvento(
                                      evento.localId,
                                      "atributo",
                                      e.target.value
                                    )
                                  }
                                  maxLength={200}
                                  placeholder="Ej. Robo de celular"
                                  style={styles.input}
                                  disabled={guardando}
                                />
                              </td>

                              <td style={styles.td}>
                                <div
                                  style={
                                    styles.inputWithSuffix
                                  }
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                      evento.cantidad_eventos
                                    }
                                    onChange={(e) =>
                                      actualizarEvento(
                                        evento.localId,
                                        "cantidad_eventos",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Ej. 2"
                                    style={styles.input}
                                    disabled={guardando}
                                  />

                                  <span
                                    style={
                                      styles.inputSuffix
                                    }
                                  >
                                    eventos
                                  </span>
                                </div>
                              </td>

                              <td style={styles.td}>
                                <div
                                  style={
                                    styles.inputWithPrefix
                                  }
                                >
                                  <span
                                    style={
                                      styles.inputPrefix
                                    }
                                  >
                                    $
                                  </span>

                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      evento.tope_cobertura
                                    }
                                    onChange={(e) =>
                                      actualizarEvento(
                                        evento.localId,
                                        "tope_cobertura",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Ej. 150000"
                                    style={styles.input}
                                    disabled={guardando}
                                  />
                                </div>

                                {Number.isFinite(
                                  convertirNumero(
                                    evento.tope_cobertura
                                  )
                                ) &&
                                  convertirNumero(
                                    evento.tope_cobertura
                                  ) >= 0 && (
                                    <div
                                      style={
                                        styles.valuePreview
                                      }
                                    >
                                      {formatearPesos(
                                        convertirNumero(
                                          evento.tope_cobertura
                                        )
                                      )}
                                    </div>
                                  )}
                              </td>

                              <td style={styles.td}>
                                <div
                                  style={
                                    styles.inputWithSuffix
                                  }
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                      evento.carencia_dias
                                    }
                                    onChange={(e) =>
                                      actualizarEvento(
                                        evento.localId,
                                        "carencia_dias",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Ej. 30"
                                    style={styles.input}
                                    disabled={guardando}
                                  />

                                  <span
                                    style={
                                      styles.inputSuffix
                                    }
                                  >
                                    días
                                  </span>
                                </div>
                              </td>

                              <td style={styles.tdStatus}>
                                <select
                                  value={
                                    evento.activo
                                      ? "activo"
                                      : "inactivo"
                                  }
                                  onChange={(e) =>
                                    actualizarEvento(
                                      evento.localId,
                                      "activo",
                                      e.target.value ===
                                        "activo"
                                    )
                                  }
                                  style={styles.select}
                                  disabled={guardando}
                                >
                                  <option value="activo">
                                    Activo
                                  </option>

                                  <option value="inactivo">
                                    Inactivo
                                  </option>
                                </select>
                              </td>

                              <td style={styles.tdActions}>
                                <div
                                  style={
                                    styles.actionsGroup
                                  }
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      duplicarFila(evento)
                                    }
                                    style={
                                      styles.duplicateButton
                                    }
                                    disabled={guardando}
                                  >
                                    Duplicar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      eliminarFila(evento)
                                    }
                                    style={
                                      styles.deleteButton
                                    }
                                    disabled={guardando}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {eventos.length > 0 && (
                <section style={styles.summaryCard}>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>
                      Atributos
                    </span>

                    <strong style={styles.summaryValue}>
                      {eventos.length}
                    </strong>
                  </div>

                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>
                      Eventos totales
                    </span>

                    <strong style={styles.summaryValue}>
                      {cantidadTotalEventos}
                    </strong>
                  </div>

                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>
                      Mayor cobertura
                    </span>

                    <strong style={styles.summaryValue}>
                      {formatearPesos(mayorCobertura)}
                    </strong>
                  </div>

                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>
                      Filas activas
                    </span>

                    <strong style={styles.summaryValue}>
                      {
                        eventos.filter(
                          (evento) => evento.activo
                        ).length
                      }
                    </strong>
                  </div>
                </section>
              )}

              <div style={styles.footerActions}>
                <div style={styles.unsavedArea}>
                  {hayCambios && (
                    <span style={styles.unsavedText}>
                      Hay cambios pendientes de guardar.
                    </span>
                  )}
                </div>

                <div style={styles.footerButtons}>
                  <button
                    type="button"
                    onClick={volverAProductos}
                    style={styles.cancelButton}
                    disabled={guardando}
                  >
                    Volver
                  </button>

                  <button
                    type="submit"
                    style={styles.primaryButton}
                    disabled={guardando || !hayCambios}
                  >
                    {guardando
                      ? "Guardando..."
                      : "Guardar eventos"}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "#f1f5f9",
  },

  container: {
    width: "100%",
    maxWidth: "1600px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  backButton: {
    padding: 0,
    marginBottom: "12px",
    border: "none",
    background: "transparent",
    color: "#475569",
    cursor: "pointer",
    fontSize: "13px",
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
    fontSize: "28px",
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  productCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    padding: "20px",
    marginBottom: "20px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
    flexWrap: "wrap",
  },

  productMain: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
  },

  productIcon: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "44px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "12px",
    background: "#ede9fe",
    color: "#6d28d9",
    fontSize: "18px",
    fontWeight: 800,
  },

  productLabel: {
    marginBottom: "3px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
  },

  productName: {
    margin: 0,
    color: "#0f172a",
    fontSize: "20px",
  },

  productDescription: {
    maxWidth: "650px",
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  productDetails: {
    display: "flex",
    alignItems: "stretch",
    gap: "28px",
    flexWrap: "wrap",
  },

  detailItem: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "4px",
    minWidth: "120px",
  },

  detailLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
  },

  detailSecondary: {
    color: "#64748b",
    fontSize: "11px",
  },

  tableCard: {
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  },

  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "18px 20px",
    borderBottom: "1px solid #e2e8f0",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "17px",
  },

  sectionDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  rowsCounter: {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f1f5f9",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 700,
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "1250px",
    borderCollapse: "collapse",
  },

  th: {
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "left",
    textTransform: "uppercase",
  },

  thNumber: {
    width: "42px",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
  },

  thStatus: {
    width: "130px",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "left",
    textTransform: "uppercase",
  },

  thActions: {
    width: "175px",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "left",
    textTransform: "uppercase",
  },

  td: {
    minWidth: "190px",
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
  },

  tdNumber: {
    width: "42px",
    padding: "22px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
    textAlign: "center",
    verticalAlign: "top",
  },

  tdStatus: {
    width: "130px",
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
  },

  tdActions: {
    width: "175px",
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
  },

  input: {
    width: "100%",
    minHeight: "42px",
    boxSizing: "border-box",
    padding: "10px 11px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "13px",
  },

  select: {
    width: "100%",
    minHeight: "42px",
    boxSizing: "border-box",
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "13px",
  },

  inputWithSuffix: {
    display: "grid",
    gridTemplateColumns: "minmax(90px, 1fr) auto",
    alignItems: "stretch",
  },

  inputSuffix: {
    display: "flex",
    alignItems: "center",
    minWidth: "46px",
    padding: "0 9px",
    marginLeft: "-1px",
    border: "1px solid #cbd5e1",
    borderRadius: "0 8px 8px 0",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 700,
  },

  inputWithPrefix: {
    display: "grid",
    gridTemplateColumns: "auto minmax(130px, 1fr)",
    alignItems: "stretch",
  },

  inputPrefix: {
    display: "flex",
    alignItems: "center",
    padding: "0 11px",
    marginRight: "-1px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px 0 0 8px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 700,
  },

  valuePreview: {
    marginTop: "5px",
    color: "#64748b",
    fontSize: "11px",
  },

  actionsGroup: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  primaryButton: {
    minHeight: "42px",
    padding: "10px 17px",
    border: "none",
    borderRadius: "9px",
    background: "#0f172a",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  eventsButton: {
    minHeight: "42px",
    padding: "10px 17px",
    border: "1px solid #c4b5fd",
    borderRadius: "9px",
    background: "#f5f3ff",
    color: "#6d28d9",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  duplicateButton: {
    padding: "7px 9px",
    border: "1px solid #bfdbfe",
    borderRadius: "7px",
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 700,
  },

  deleteButton: {
    padding: "7px 9px",
    border: "1px solid #fecaca",
    borderRadius: "7px",
    background: "#fff1f2",
    color: "#be123c",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 700,
  },

  cancelButton: {
    minHeight: "42px",
    padding: "10px 17px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
  },

  summaryCard: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(150px, 1fr))",
    gap: "1px",
    marginTop: "18px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#e2e8f0",
  },

  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "15px",
    background: "#ffffff",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
  },

  summaryValue: {
    color: "#0f172a",
    fontSize: "17px",
  },

  footerActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "20px 0",
    flexWrap: "wrap",
  },

  footerButtons: {
    display: "flex",
    gap: "10px",
  },

  unsavedArea: {
    minHeight: "20px",
  },

  unsavedText: {
    color: "#b45309",
    fontSize: "13px",
    fontWeight: 700,
  },

  activeBadge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 700,
  },

  inactiveBadge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#e2e8f0",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 700,
  },

  errorBox: {
    padding: "13px 15px",
    marginBottom: "16px",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    background: "#fff1f2",
    color: "#be123c",
    fontSize: "14px",
  },

  successBox: {
    padding: "13px 15px",
    marginBottom: "16px",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    background: "#f0fdf4",
    color: "#166534",
    fontSize: "14px",
  },

  loadingBox: {
    padding: "45px 24px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#64748b",
    textAlign: "center",
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "9px",
    padding: "60px 24px",
    color: "#64748b",
    textAlign: "center",
  },

  emptyIcon: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "46px",
    height: "46px",
    marginBottom: "4px",
    borderRadius: "50%",
    background: "#f1f5f9",
    color: "#475569",
    fontSize: "25px",
  },
};