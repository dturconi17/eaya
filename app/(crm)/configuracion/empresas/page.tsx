"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";

/* =========================================================
   TIPOS
========================================================= */

type Empresa = {
  id: string;
  nombre: string;
  cuit: string;
  fecha_inicio_relacion: string;
  fecha_fin_relacion: string | null;
  contacto_comercial: string | null;
  telefono_contacto: string | null;
  email_contacto: string | null;
  activo: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type EmpresaFormData = {
  nombre: string;
  cuit: string;
  fecha_inicio_relacion: string;
  fecha_fin_relacion: string;
  contacto_comercial: string;
  telefono_contacto: string;
  email_contacto: string;
  activo: boolean;
};

type FiltroEstado = "todas" | "activas" | "inactivas";

/* =========================================================
   VALORES INICIALES
========================================================= */

const FORMULARIO_INICIAL: EmpresaFormData = {
  nombre: "",
  cuit: "",
  fecha_inicio_relacion: "",
  fecha_fin_relacion: "",
  contacto_comercial: "",
  telefono_contacto: "",
  email_contacto: "",
  activo: true,
};

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function limpiarCuit(cuit: string) {
  return cuit.replace(/\D/g, "").slice(0, 11);
}

function formatearCuit(cuit: string) {
  const limpio = limpiarCuit(cuit);

  if (limpio.length <= 2) {
    return limpio;
  }

  if (limpio.length <= 10) {
    return `${limpio.slice(0, 2)}-${limpio.slice(2)}`;
  }

  return `${limpio.slice(0, 2)}-${limpio.slice(2, 10)}-${limpio.slice(10)}`;
}

function formatearFecha(fecha: string | null) {
  if (!fecha) {
    return "—";
  }

  const [anio, mes, dia] = fecha.split("-");

  if (!anio || !mes || !dia) {
    return fecha;
  }

  return `${dia}/${mes}/${anio}`;
}

function emailValido(email: string) {
  if (!email.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function fechaActualISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function EmpresasPage() {
  const { user, role, loading: userLoading } = useUser();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todas");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [empresaEditando, setEmpresaEditando] =
    useState<Empresa | null>(null);

  const [formulario, setFormulario] =
    useState<EmpresaFormData>(FORMULARIO_INICIAL);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  /* =======================================================
     CARGAR EMPRESAS
  ======================================================= */

  const cargarEmpresas = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error: consultaError } = await supabase
        .from("empresas")
        .select("*")
        .order("nombre", { ascending: true });

      if (consultaError) {
        throw consultaError;
      }

      setEmpresas((data ?? []) as Empresa[]);
    } catch (err) {
      console.error("Error cargando empresas:", err);
      setError("No fue posible cargar las empresas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    cargarEmpresas();
  }, [user, userLoading, cargarEmpresas]);

  /* =======================================================
     FILTROS
  ======================================================= */

  const empresasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const cuitBuscado = limpiarCuit(busqueda);

    return empresas.filter((empresa) => {
      const coincideEstado =
        filtroEstado === "todas" ||
        (filtroEstado === "activas" && empresa.activo) ||
        (filtroEstado === "inactivas" && !empresa.activo);

      if (!coincideEstado) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const coincideNombre = empresa.nombre
        .toLowerCase()
        .includes(texto);

      const coincideCuit =
        cuitBuscado.length > 0 &&
        empresa.cuit.includes(cuitBuscado);

      const coincideContacto = empresa.contacto_comercial
        ?.toLowerCase()
        .includes(texto);

      return Boolean(
        coincideNombre ||
          coincideCuit ||
          coincideContacto
      );
    });
  }, [empresas, busqueda, filtroEstado]);

  /* =======================================================
     ABRIR ALTA
  ======================================================= */

  function abrirNuevaEmpresa() {
    setEmpresaEditando(null);

    setFormulario({
      ...FORMULARIO_INICIAL,
      fecha_inicio_relacion: fechaActualISO(),
    });

    setError("");
    setMensaje("");
    setModalAbierto(true);
  }

  /* =======================================================
     ABRIR EDICIÓN
  ======================================================= */

  function abrirEdicion(empresa: Empresa) {
    setEmpresaEditando(empresa);

    setFormulario({
      nombre: empresa.nombre,
      cuit: formatearCuit(empresa.cuit),
      fecha_inicio_relacion:
        empresa.fecha_inicio_relacion,
      fecha_fin_relacion:
        empresa.fecha_fin_relacion ?? "",
      contacto_comercial:
        empresa.contacto_comercial ?? "",
      telefono_contacto:
        empresa.telefono_contacto ?? "",
      email_contacto:
        empresa.email_contacto ?? "",
      activo: empresa.activo,
    });

    setError("");
    setMensaje("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) {
      return;
    }

    setModalAbierto(false);
    setEmpresaEditando(null);
    setFormulario(FORMULARIO_INICIAL);
    setError("");
  }

  /* =======================================================
     MODIFICAR FORMULARIO
  ======================================================= */

  function actualizarCampo<K extends keyof EmpresaFormData>(
    campo: K,
    valor: EmpresaFormData[K]
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function manejarCambioCuit(valor: string) {
    actualizarCampo("cuit", formatearCuit(valor));
  }

  function manejarFechaFin(valor: string) {
    setFormulario((actual) => ({
      ...actual,
      fecha_fin_relacion: valor,
      activo: valor ? false : actual.activo,
    }));
  }

  /* =======================================================
     VALIDACIONES
  ======================================================= */

  function validarFormulario() {
    const nombre = formulario.nombre.trim();
    const cuit = limpiarCuit(formulario.cuit);

    if (!nombre) {
      return "El nombre de la empresa es obligatorio.";
    }

    if (nombre.length < 2) {
      return "El nombre de la empresa es demasiado corto.";
    }

    if (cuit.length !== 11) {
      return "El CUIT debe contener exactamente 11 números.";
    }

    if (!formulario.fecha_inicio_relacion) {
      return "La fecha de inicio de relación es obligatoria.";
    }

    if (
      formulario.fecha_fin_relacion &&
      formulario.fecha_fin_relacion <
        formulario.fecha_inicio_relacion
    ) {
      return "La fecha de fin no puede ser anterior a la fecha de inicio.";
    }

    if (!emailValido(formulario.email_contacto)) {
      return "Ingresá un email de contacto válido.";
    }

    return null;
  }

  /* =======================================================
     GUARDAR EMPRESA
  ======================================================= */

  async function guardarEmpresa(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!user?.id) {
      setError("No fue posible identificar al usuario.");
      return;
    }

    if (role !== "admin") {
      setError(
        "No tenés permisos para modificar la configuración."
      );
      return;
    }

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const cuitLimpio = limpiarCuit(formulario.cuit);

      /*
       * Buscamos el CUIT antes de guardar para mostrar
       * un mensaje claro al usuario.
       */
      let consultaDuplicado = supabase
        .from("empresas")
        .select("id, nombre")
        .eq("cuit", cuitLimpio);

      if (empresaEditando) {
        consultaDuplicado = consultaDuplicado.neq(
          "id",
          empresaEditando.id
        );
      }

      const {
        data: empresaDuplicada,
        error: duplicadoError,
      } = await consultaDuplicado.maybeSingle();

      if (duplicadoError) {
        throw duplicadoError;
      }

      if (empresaDuplicada) {
        setError(
          `Ya existe una empresa registrada con el CUIT ${formatearCuit(
            cuitLimpio
          )}.`
        );
        return;
      }

      const datosEmpresa = {
        nombre: formulario.nombre.trim(),
        cuit: cuitLimpio,
        fecha_inicio_relacion:
          formulario.fecha_inicio_relacion,
        fecha_fin_relacion:
          formulario.fecha_fin_relacion || null,
        contacto_comercial:
          formulario.contacto_comercial.trim() || null,
        telefono_contacto:
          formulario.telefono_contacto.trim() || null,
        email_contacto:
          formulario.email_contacto
            .trim()
            .toLowerCase() || null,
        activo: formulario.fecha_fin_relacion
          ? false
          : formulario.activo,
        updated_by: user.id,
      };

      if (empresaEditando) {
        const { error: actualizarError } = await supabase
          .from("empresas")
          .update(datosEmpresa)
          .eq("id", empresaEditando.id);

        if (actualizarError) {
          throw actualizarError;
        }

        setMensaje("Empresa actualizada correctamente.");
      } else {
        const { error: insertarError } = await supabase
          .from("empresas")
          .insert({
            ...datosEmpresa,
            created_by: user.id,
          });

        if (insertarError) {
          throw insertarError;
        }

        setMensaje("Empresa creada correctamente.");
      }

      await cargarEmpresas();

      setModalAbierto(false);
      setEmpresaEditando(null);
      setFormulario(FORMULARIO_INICIAL);
    } catch (err: any) {
      console.error("Error guardando empresa:", err);

      if (err?.code === "23505") {
        setError(
          "Ya existe una empresa registrada con ese CUIT."
        );
      } else if (err?.code === "42501") {
        setError(
          "No tenés permisos para realizar esta operación."
        );
      } else {
        setError(
          err?.message ||
            "No fue posible guardar la empresa."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  /* =======================================================
     ACTIVAR / DESACTIVAR
  ======================================================= */

  async function cambiarEstado(empresa: Empresa) {
    if (!user?.id) {
      setError("No fue posible identificar al usuario.");
      return;
    }

    if (role !== "admin") {
      setError(
        "No tenés permisos para modificar la configuración."
      );
      return;
    }

    const nuevoEstado = !empresa.activo;

    const accion = nuevoEstado ? "reactivar" : "desactivar";

    const confirmado = window.confirm(
      nuevoEstado
        ? `¿Querés reactivar la empresa "${empresa.nombre}"?`
        : `¿Querés desactivar la empresa "${empresa.nombre}"?\n\nLa empresa dejará de estar disponible para nuevas operaciones, pero conservará su historial.`
    );

    if (!confirmado) {
      return;
    }

    try {
      setProcesandoId(empresa.id);
      setError("");
      setMensaje("");

      const cambios: {
        activo: boolean;
        updated_by: string;
        fecha_fin_relacion?: string | null;
      } = {
        activo: nuevoEstado,
        updated_by: user.id,
      };

      /*
       * Al reactivar, eliminamos la fecha de finalización
       * para evitar una empresa activa con relación finalizada.
       */
      if (nuevoEstado) {
        cambios.fecha_fin_relacion = null;
      }

      const { error: actualizarError } = await supabase
        .from("empresas")
        .update(cambios)
        .eq("id", empresa.id);

      if (actualizarError) {
        throw actualizarError;
      }

      setMensaje(
        nuevoEstado
          ? "Empresa reactivada correctamente."
          : "Empresa desactivada correctamente."
      );

      await cargarEmpresas();
    } catch (err: any) {
      console.error(
        `Error al ${accion} empresa:`,
        err
      );

      setError(
        err?.message ||
          `No fue posible ${accion} la empresa.`
      );
    } finally {
      setProcesandoId(null);
    }
  }

  /* =======================================================
     CONTROLES DE ACCESO
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
          No tenés permisos para acceder a la configuración
          de empresas.
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
        {/* ENCABEZADO */}

        <div style={styles.header}>
          <div>
            <div style={styles.breadcrumb}>
              Configuración / Empresas
            </div>

            <h1 style={styles.title}>
              Empresas comercializadas
            </h1>

            <p style={styles.subtitle}>
              Administrá las empresas cuyos productos son
              comercializados por la organización.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNuevaEmpresa}
            style={styles.primaryButton}
          >
            + Nueva empresa
          </button>
        </div>

        {/* MENSAJES */}

        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {mensaje && (
          <div style={styles.successBox}>{mensaje}</div>
        )}

        {/* FILTROS */}

        <section style={styles.filtersCard}>
          <div style={styles.searchGroup}>
            <label style={styles.label}>
              Buscar empresa
            </label>

            <input
              type="text"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Nombre, CUIT o contacto comercial"
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Estado</label>

            <select
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(
                  evento.target.value as FiltroEstado
                )
              }
              style={styles.select}
            >
              <option value="todas">
                Todas las empresas
              </option>
              <option value="activas">
                Empresas activas
              </option>
              <option value="inactivas">
                Empresas inactivas
              </option>
            </select>
          </div>
        </section>

        {/* RESUMEN */}

        <div style={styles.summary}>
          <span>
            Mostrando{" "}
            <strong>{empresasFiltradas.length}</strong>{" "}
            empresa
            {empresasFiltradas.length === 1 ? "" : "s"}
          </span>

          <span>
            Activas:{" "}
            <strong>
              {
                empresas.filter(
                  (empresa) => empresa.activo
                ).length
              }
            </strong>
          </span>

          <span>
            Inactivas:{" "}
            <strong>
              {
                empresas.filter(
                  (empresa) => !empresa.activo
                ).length
              }
            </strong>
          </span>
        </div>

        {/* TABLA */}

        <section style={styles.tableCard}>
          {loading ? (
            <div style={styles.emptyState}>
              Cargando empresas...
            </div>
          ) : empresasFiltradas.length === 0 ? (
            <div style={styles.emptyState}>
              <strong>
                No se encontraron empresas.
              </strong>

              <span>
                Modificá los filtros o registrá una nueva
                empresa.
              </span>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Empresa</th>
                    <th style={styles.th}>CUIT</th>
                    <th style={styles.th}>
                      Inicio relación
                    </th>
                    <th style={styles.th}>
                      Fin relación
                    </th>
                    <th style={styles.th}>Contacto</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {empresasFiltradas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td style={styles.td}>
                        <div style={styles.companyName}>
                          {empresa.nombre}
                        </div>

                        {empresa.email_contacto && (
                          <div style={styles.secondaryText}>
                            {empresa.email_contacto}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        {formatearCuit(empresa.cuit)}
                      </td>

                      <td style={styles.td}>
                        {formatearFecha(
                          empresa.fecha_inicio_relacion
                        )}
                      </td>

                      <td style={styles.td}>
                        {formatearFecha(
                          empresa.fecha_fin_relacion
                        )}
                      </td>

                      <td style={styles.td}>
                        <div>
                          {empresa.contacto_comercial ||
                            "—"}
                        </div>

                        {empresa.telefono_contacto && (
                          <div style={styles.secondaryText}>
                            {empresa.telefono_contacto}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={
                            empresa.activo
                              ? styles.activeBadge
                              : styles.inactiveBadge
                          }
                        >
                          {empresa.activo
                            ? "Activa"
                            : "Inactiva"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            onClick={() =>
                              abrirEdicion(empresa)
                            }
                            style={styles.editButton}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(empresa)
                            }
                            disabled={
                              procesandoId === empresa.id
                            }
                            style={
                              empresa.activo
                                ? styles.deactivateButton
                                : styles.activateButton
                            }
                          >
                            {procesandoId === empresa.id
                              ? "Procesando..."
                              : empresa.activo
                              ? "Desactivar"
                              : "Reactivar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* MODAL */}

      {modalAbierto && (
        <div
          style={styles.modalOverlay}
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              cerrarModal();
            }
          }}
        >
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {empresaEditando
                    ? "Editar empresa"
                    : "Nueva empresa"}
                </h2>

                <p style={styles.modalSubtitle}>
                  {empresaEditando
                    ? "Modificá los datos de la empresa seleccionada."
                    : "Registrá una nueva empresa comercializada."}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                style={styles.closeButton}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarEmpresa}>
              <div style={styles.formGrid}>
                <div style={styles.fullField}>
                  <label style={styles.label}>
                    Nombre de empresa *
                  </label>

                  <input
                    type="text"
                    value={formulario.nombre}
                    onChange={(evento) =>
                      actualizarCampo(
                        "nombre",
                        evento.target.value
                      )
                    }
                    maxLength={150}
                    placeholder="Ej. Banco Ejemplo S.A."
                    style={styles.input}
                    disabled={guardando}
                    autoFocus
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    CUIT *
                  </label>

                  <input
                    type="text"
                    value={formulario.cuit}
                    onChange={(evento) =>
                      manejarCambioCuit(
                        evento.target.value
                      )
                    }
                    maxLength={13}
                    placeholder="30-12345678-9"
                    style={styles.input}
                    disabled={guardando}
                    inputMode="numeric"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Estado
                  </label>

                  <select
                    value={
                      formulario.activo
                        ? "activo"
                        : "inactivo"
                    }
                    onChange={(evento) =>
                      actualizarCampo(
                        "activo",
                        evento.target.value === "activo"
                      )
                    }
                    style={styles.select}
                    disabled={
                      guardando ||
                      Boolean(
                        formulario.fecha_fin_relacion
                      )
                    }
                  >
                    <option value="activo">
                      Activa
                    </option>
                    <option value="inactivo">
                      Inactiva
                    </option>
                  </select>

                  {formulario.fecha_fin_relacion && (
                    <span style={styles.fieldHelp}>
                      Una empresa con fecha de fin queda
                      inactiva.
                    </span>
                  )}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Inicio de relación *
                  </label>

                  <input
                    type="date"
                    value={
                      formulario.fecha_inicio_relacion
                    }
                    onChange={(evento) =>
                      actualizarCampo(
                        "fecha_inicio_relacion",
                        evento.target.value
                      )
                    }
                    style={styles.input}
                    disabled={guardando}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Fin de relación
                  </label>

                  <input
                    type="date"
                    value={
                      formulario.fecha_fin_relacion
                    }
                    min={
                      formulario.fecha_inicio_relacion ||
                      undefined
                    }
                    onChange={(evento) =>
                      manejarFechaFin(
                        evento.target.value
                      )
                    }
                    style={styles.input}
                    disabled={guardando}
                  />
                </div>

                <div style={styles.fullField}>
                  <label style={styles.label}>
                    Contacto comercial
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.contacto_comercial
                    }
                    onChange={(evento) =>
                      actualizarCampo(
                        "contacto_comercial",
                        evento.target.value
                      )
                    }
                    maxLength={150}
                    placeholder="Nombre y apellido"
                    style={styles.input}
                    disabled={guardando}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Teléfono del contacto
                  </label>

                  <input
                    type="tel"
                    value={
                      formulario.telefono_contacto
                    }
                    onChange={(evento) =>
                      actualizarCampo(
                        "telefono_contacto",
                        evento.target.value
                      )
                    }
                    maxLength={50}
                    placeholder="+54 9 11 1234-5678"
                    style={styles.input}
                    disabled={guardando}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Email del contacto
                  </label>

                  <input
                    type="email"
                    value={formulario.email_contacto}
                    onChange={(evento) =>
                      actualizarCampo(
                        "email_contacto",
                        evento.target.value
                      )
                    }
                    maxLength={150}
                    placeholder="contacto@empresa.com"
                    style={styles.input}
                    disabled={guardando}
                  />
                </div>
              </div>

              {error && (
                <div style={styles.modalError}>
                  {error}
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={cerrarModal}
                  style={styles.cancelButton}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : empresaEditando
                    ? "Guardar cambios"
                    : "Crear empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    maxWidth: "1500px",
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

  breadcrumb: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1.2,
    color: "#0f172a",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
  },

  filtersCard: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 1fr) 260px",
    gap: "16px",
    padding: "18px",
    marginBottom: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  },

  searchGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  summary: {
    display: "flex",
    gap: "22px",
    flexWrap: "wrap",
    marginBottom: "14px",
    color: "#475569",
    fontSize: "14px",
  },

  tableCard: {
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1080px",
  },

  th: {
    padding: "13px 16px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 700,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  td: {
    padding: "15px 16px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontSize: "14px",
    verticalAlign: "middle",
  },

  companyName: {
    color: "#0f172a",
    fontWeight: 700,
  },

  secondaryText: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "12px",
  },

  activeBadge: {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 700,
  },

  inactiveBadge: {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#e2e8f0",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 700,
  },

  actionGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },

  label: {
    display: "block",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "42px",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "42px",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
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

  editButton: {
    padding: "7px 11px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },

  deactivateButton: {
    padding: "7px 11px",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    background: "#fff1f2",
    color: "#be123c",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },

  activateButton: {
    padding: "7px 11px",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    background: "#f0fdf4",
    color: "#15803d",
    cursor: "pointer",
    fontSize: "12px",
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
    padding: "30px",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#475569",
    textAlign: "center",
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "60px 24px",
    color: "#64748b",
    textAlign: "center",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    background: "rgba(15, 23, 42, 0.55)",
  },

  modal: {
    width: "100%",
    maxWidth: "760px",
    maxHeight: "92vh",
    overflowY: "auto",
    padding: "24px",
    borderRadius: "16px",
    background: "#ffffff",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "22px",
  },

  modalTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "22px",
  },

  modalSubtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  closeButton: {
    width: "36px",
    height: "36px",
    border: "none",
    borderRadius: "8px",
    background: "#f1f5f9",
    color: "#475569",
    cursor: "pointer",
    fontSize: "24px",
    lineHeight: 1,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "17px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  fullField: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  fieldHelp: {
    color: "#64748b",
    fontSize: "12px",
  },

  modalError: {
    padding: "12px 14px",
    marginTop: "18px",
    border: "1px solid #fecaca",
    borderRadius: "9px",
    background: "#fff1f2",
    color: "#be123c",
    fontSize: "13px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "24px",
    paddingTop: "18px",
    borderTop: "1px solid #e2e8f0",
  },
};