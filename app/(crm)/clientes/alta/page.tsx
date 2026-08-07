"use client";

import React, {
  FormEvent,
  Suspense,
  useEffect,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  MapPin,
  PackageCheck,
  Phone,
  Save,
  ShoppingBag,
  User,
} from "lucide-react";
import PhoneInput from "react-phone-input-2";
import { isValidPhoneNumber } from "libphonenumber-js";

import { supabase } from "@/lib/supabase";
import "react-phone-input-2/lib/style.css";

type FormState = {
  nombre: string;
  apellido: string;
  tipo_documento: string;
  numero_documento: string;
  fecha_nacimiento: string;
  email: string;
  celular: string;
  localidad: string;
  sexo: string;
  estado_civil: string;
  cantidad_hijos: string;
  actividad: string;
};

const FORM_INICIAL: FormState = {
  nombre: "",
  apellido: "",
  tipo_documento: "DNI",
  numero_documento: "",
  fecha_nacimiento: "",
  email: "",
  celular: "",
  localidad: "",
  sexo: "",
  estado_civil: "",
  cantidad_hijos: "",
  actividad: "",
};

const LOCALIDADES = [
  "Ciudad Autónoma de Buenos Aires",
  "La Plata",
  "Mar del Plata",
  "Bahía Blanca",
  "San Isidro",
  "Vicente López",
  "Tigre",
  "Pilar",
  "Morón",
  "Quilmes",
  "Lomas de Zamora",
  "Avellaneda",
  "Lanús",
  "San Martín",
  "Tres de Febrero",
  "Otra",
];

function AltaClienteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [phoneError, setPhoneError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"error" | "success" | "">("");

  useEffect(() => {
    const tipo = searchParams.get("tipo");
    const numero = searchParams.get("numero");

    if (!tipo || !numero) return;

    setForm((prev) => ({
      ...prev,
      tipo_documento: tipo,
      numero_documento: numero,
    }));
  }, [searchParams]);

  useEffect(() => {
    async function cargarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id ?? null);
    }

    cargarUsuario();
  }, []);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMensaje("");
    setTipoMensaje("");
  }

  function validarFormulario() {
    if (!form.nombre.trim()) return "El nombre es obligatorio.";
    if (!form.apellido.trim()) return "El apellido es obligatorio.";
    if (!form.numero_documento.trim()) return "El documento es obligatorio.";
    if (!form.sexo) return "Seleccioná el sexo.";
    if (!form.estado_civil) return "Seleccioná el estado civil.";
    if (!form.localidad) return "Seleccioná la localidad.";
    if (!form.actividad) return "Seleccioná la actividad.";
    if (phoneError) return "El número de teléfono no es válido.";

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMensaje("");
    setTipoMensaje("");

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setMensaje(errorValidacion);
      setTipoMensaje("error");
      return;
    }

    if (!userId) {
      setMensaje("No se pudo identificar al usuario autenticado.");
      setTipoMensaje("error");
      return;
    }

    try {
      setLoading(true);

      const { data: clienteCreado, error: insertError } = await supabase
        .from("clientes")
        .insert({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          tipo_documento: form.tipo_documento,
          numero_documento: form.numero_documento.trim(),
          fecha_nacimiento: form.fecha_nacimiento || null,
          email: form.email.trim() || null,
          celular: form.celular || null,
          localidad: form.localidad,
          sexo: form.sexo,
          estado_civil: form.estado_civil,
          cantidad_hijos: Number(form.cantidad_hijos || 0),
          actividad: form.actividad,
          created_by: userId,
          onboarding_etapa: "intereses",
          onboarding_completado: false,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creando cliente:", insertError);

        setMensaje(
          `${insertError.message} (${insertError.code ?? "sin código"})`
        );
        setTipoMensaje("error");
        return;
      }

      if (!clienteCreado?.id) {
        setMensaje("El cliente fue creado, pero no se pudo obtener su identificador.");
        setTipoMensaje("error");
        return;
      }

      setMensaje("Lead creado. Continuando con el relevamiento...");
      setTipoMensaje("success");

      window.setTimeout(() => {
        router.push(`/clientes/${clienteCreado.id}/onboarding/intereses`);
      }, 700);
    } catch (error) {
      console.error("Error inesperado creando cliente:", error);
      setMensaje("Ocurrió un error inesperado al guardar el cliente.");
      setTipoMensaje("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.breadcrumb}>Clientes / Alta</div>
            <h1 style={styles.title}>Alta de nuevo lead</h1>
            <p style={styles.subtitle}>
              Completá los datos personales y de contacto para iniciar el
              journey comercial del cliente.
            </p>
          </div>

          <button
            type="button"
            style={styles.backButton}
            onClick={() => router.push("/clientes/nuevo")}
          >
            <ArrowLeft size={17} />
            Volver a búsqueda
          </button>
        </header>

        <OnboardingSteps etapaActual={1} />

        <form onSubmit={handleSubmit} style={styles.card}>
          <Section
            title="Datos personales"
            description="Información básica e identificación del cliente."
            icon={User}
          >
            <div style={styles.grid}>
              <Field label="Nombre" required>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ingresá el nombre"
                  style={styles.input}
                  disabled={loading}
                />
              </Field>

              <Field label="Apellido" required>
                <input
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  placeholder="Ingresá el apellido"
                  style={styles.input}
                  disabled={loading}
                />
              </Field>

              <Field label="Tipo de documento" required>
                <select
                  name="tipo_documento"
                  value={form.tipo_documento}
                  style={{ ...styles.input, ...styles.disabledInput }}
                  disabled
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </Field>

              <Field label="Número de documento" required>
                <input
                  name="numero_documento"
                  value={form.numero_documento}
                  style={{ ...styles.input, ...styles.disabledInput }}
                  disabled
                />
              </Field>

              <Field label="Fecha de nacimiento">
                <input
                  name="fecha_nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loading}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Contacto"
            description="Medios de contacto y ubicación principal."
            icon={Phone}
          >
            <div style={styles.grid}>
              <Field label="Correo electrónico">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nombre@correo.com"
                  style={styles.input}
                  disabled={loading}
                />
              </Field>

              <Field label="Celular">
                <div style={styles.phoneWrapper}>
                  <PhoneInput
                    country="ar"
                    value={form.celular}
                    disabled={loading}
                    onChange={(value) => {
                      setForm((prev) => ({ ...prev, celular: value }));
                      setMensaje("");
                      setTipoMensaje("");

                      if (!value) {
                        setPhoneError("");
                        return;
                      }

                      try {
                        setPhoneError(
                          isValidPhoneNumber(`+${value}`)
                            ? ""
                            : "Número inválido"
                        );
                      } catch {
                        setPhoneError("Número inválido");
                      }
                    }}
                    inputStyle={{
                      width: "100%",
                      height: 44,
                      borderRadius: 9,
                      border: phoneError
                        ? "1px solid #ef4444"
                        : "1px solid #cbd5e1",
                      fontSize: 14,
                    }}
                    buttonStyle={{
                      borderRadius: "9px 0 0 9px",
                      border: phoneError
                        ? "1px solid #ef4444"
                        : "1px solid #cbd5e1",
                      background: "#f8fafc",
                    }}
                  />

                  {phoneError && (
                    <span style={styles.fieldError}>{phoneError}</span>
                  )}
                </div>
              </Field>

              <Field label="Localidad" required fullWidth>
                <div style={styles.selectWithIcon}>
                  <MapPin size={18} style={styles.selectIcon} />

                  <select
                    name="localidad"
                    value={form.localidad}
                    onChange={handleChange}
                    style={styles.selectIconInput}
                    disabled={loading}
                  >
                    <option value="">Seleccioná una localidad</option>

                    {LOCALIDADES.map((localidad) => (
                      <option key={localidad} value={localidad}>
                        {localidad}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </Section>

          <Section
            title="Información adicional"
            description="Datos complementarios para la segmentación del lead."
            icon={Info}
          >
            <div style={styles.grid}>
              <Field label="Sexo" required>
                <select
                  name="sexo"
                  value={form.sexo}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loading}
                >
                  <option value="">Seleccioná una opción</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="X">Otro</option>
                </select>
              </Field>

              <Field label="Estado civil" required>
                <select
                  name="estado_civil"
                  value={form.estado_civil}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loading}
                >
                  <option value="">Seleccioná una opción</option>
                  <option value="soltero">Soltero</option>
                  <option value="casado">Casado</option>
                  <option value="divorciado">Divorciado</option>
                  <option value="viudo">Viudo</option>
                </select>
              </Field>

              <Field label="Cantidad de hijos">
                <input
                  name="cantidad_hijos"
                  type="number"
                  min={0}
                  value={form.cantidad_hijos}
                  onChange={handleChange}
                  placeholder="0"
                  style={styles.input}
                  disabled={loading}
                />
              </Field>

              <Field label="Actividad" required>
                <select
                  name="actividad"
                  value={form.actividad}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loading}
                >
                  <option value="">Seleccioná una actividad</option>
                  <option value="relacion_dependencia">
                    Relación de dependencia
                  </option>
                  <option value="autonomo">Autónomo</option>
                  <option value="estudiante">Estudiante</option>
                  <option value="jubilado">Jubilado</option>
                  <option value="desocupado">Desocupado</option>
                </select>
              </Field>
            </div>
          </Section>

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

          <footer style={styles.footer}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => router.push("/clientes/nuevo")}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                ...styles.saveButton,
                ...(loading ? styles.disabledButton : {}),
              }}
              disabled={loading}
            >
              <Save size={18} />
              {loading ? "Guardando..." : "Guardar y continuar"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

export default function AltaCliente() {
  return (
    <Suspense
      fallback={
        <main style={styles.page}>
          <div style={styles.container}>
            <div
              style={{
                padding: "40px",
                borderRadius: "14px",
                background: "#ffffff",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              Cargando alta de cliente...
            </div>
          </div>
        </main>
      }
    >
      <AltaClienteContent />
    </Suspense>
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
          </React.Fragment>
        );
      })}
    </section>
  );
}

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionIcon}>
          <Icon size={20} />
        </div>

        <div>
          <h2 style={styles.sectionTitle}>{title}</h2>
          <p style={styles.sectionDescription}>{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  required = false,
  fullWidth = false,
  children,
}: {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        ...styles.field,
        ...(fullWidth ? styles.fullWidth : {}),
      }}
    >
      <span style={styles.label}>
        {label}
        {required && <span style={styles.required}> *</span>}
      </span>

      {children}
    </label>
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
    maxWidth: "1100px",
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
    marginBottom: "8px",
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
    maxWidth: "760px",
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
    lineHeight: 1.6,
  },

  backButton: {
    display: "inline-flex",
    minHeight: "40px",
    alignItems: "center",
    justifyContent: "center",
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

  card: {
    overflow: "hidden",
    padding: "24px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  },

  section: {
    paddingBottom: "24px",
    marginBottom: "24px",
    borderBottom: "1px solid #e2e8f0",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  sectionIcon: {
    display: "flex",
    width: "42px",
    height: "42px",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "11px",
    color: "#2563eb",
    background: "#eff6ff",
  },

  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "17px",
  },

  sectionDescription: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },

  field: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "7px",
  },

  fullWidth: {
    gridColumn: "1 / -1",
  },

  label: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: 600,
  },

  required: {
    color: "#dc2626",
  },

  input: {
    width: "100%",
    minHeight: "44px",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    outline: "none",
    color: "#0f172a",
    background: "#ffffff",
    fontSize: "14px",
  },

  disabledInput: {
    color: "#64748b",
    background: "#f8fafc",
    cursor: "not-allowed",
  },

  phoneWrapper: {
    width: "100%",
  },

  fieldError: {
    display: "block",
    marginTop: "6px",
    color: "#dc2626",
    fontSize: "12px",
  },

  selectWithIcon: {
    position: "relative",
    width: "100%",
  },

  selectIcon: {
    position: "absolute",
    top: "50%",
    left: "13px",
    zIndex: 1,
    color: "#64748b",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },

  selectIconInput: {
    width: "100%",
    minHeight: "44px",
    boxSizing: "border-box",
    padding: "10px 12px 10px 41px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    outline: "none",
    color: "#0f172a",
    background: "#ffffff",
    fontSize: "14px",
    cursor: "pointer",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    marginBottom: "18px",
    border: "1px solid #fecaca",
    borderRadius: "9px",
    color: "#b91c1c",
    background: "#fef2f2",
    fontSize: "14px",
  },

  successBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    marginBottom: "18px",
    border: "1px solid #86efac",
    borderRadius: "9px",
    color: "#166534",
    background: "#f0fdf4",
    fontSize: "14px",
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },

  cancelButton: {
    minHeight: "42px",
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    color: "#334155",
    background: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  saveButton: {
    display: "inline-flex",
    minHeight: "42px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 17px",
    border: "none",
    borderRadius: "9px",
    color: "#ffffff",
    background: "#2563eb",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
};
