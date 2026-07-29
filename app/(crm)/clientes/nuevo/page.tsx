"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  RotateCcw,
  Search,
  User,
} from "lucide-react";
import { ClipboardList } from "lucide-react";

import { getClienteByDocumento } from "@/lib/sql/clientes";
import type { Cliente } from "../types";

export default function NuevoCliente() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const success = searchParams.get("success");

  const [loading, setLoading] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!success) return;

    setMensajeExito("Cliente registrado correctamente.");

    const timer = window.setTimeout(() => {
      setMensajeExito("");
      router.replace("/clientes/nuevo");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [success, router]);

  function limpiarBusqueda() {
    setCliente(null);
    setNumeroDocumento("");
    setMensaje("");
    inputRef.current?.focus();
  }

  async function verificarCliente(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault();

    const documentoLimpio = numeroDocumento.trim();

    setMensaje("");
    setCliente(null);

    if (!documentoLimpio) {
      setMensaje("Ingresá un número de documento para continuar.");
      inputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await getClienteByDocumento(
        tipoDocumento,
        documentoLimpio
      );

      if (error) {
        setMensaje(error.message || "No fue posible verificar el documento.");
        return;
      }

      if (data) {
        setCliente(data);
        return;
      }

      router.push(
        `/clientes/alta?tipo=${encodeURIComponent(
          tipoDocumento
        )}&numero=${encodeURIComponent(documentoLimpio)}`
      );
    } catch (error) {
      console.error("Error verificando cliente:", error);
      setMensaje("Ocurrió un error inesperado al verificar el documento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.breadcrumb}>Clientes / Nuevo lead</div>

            <h1 style={styles.title}>Registrar un nuevo lead</h1>

            <p style={styles.subtitle}>
              Verificá primero si la persona ya se encuentra registrada antes de
              iniciar el alta y continuar con el journey comercial.
            </p>
          </div>
        </header>

        {mensajeExito && (
          <div style={styles.successBox}>
            <CheckCircle2 size={19} />
            <span>{mensajeExito}</span>
          </div>
        )}

        <section style={styles.searchCard}>
          <div style={styles.cardHeader}>
            <div style={styles.iconBox}>
              <FileSearch size={25} />
            </div>

            <div>
              <h2 style={styles.cardTitle}>Búsqueda por documento</h2>
              <p style={styles.cardSubtitle}>
                Si el cliente no existe, el sistema te llevará automáticamente
                al formulario de alta.
              </p>
            </div>
          </div>

          <form style={styles.form} onSubmit={verificarCliente}>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label htmlFor="tipo-documento" style={styles.label}>
                  Tipo de documento
                </label>

                <select
                  id="tipo-documento"
                  style={styles.select}
                  value={tipoDocumento}
                  disabled={loading}
                  onChange={(evento) => {
                    setTipoDocumento(evento.target.value);
                    setMensaje("");
                    setCliente(null);
                  }}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>

              <div style={styles.fieldWide}>
                <label htmlFor="numero-documento" style={styles.label}>
                  Número de documento
                </label>

                <div style={styles.inputWrapper}>
                  <Search size={18} style={styles.inputIcon} />

                  <input
                    id="numero-documento"
                    ref={inputRef}
                    style={styles.inputWithIcon}
                    value={numeroDocumento}
                    disabled={loading}
                    inputMode={
                      tipoDocumento === "Pasaporte" ? "text" : "numeric"
                    }
                    autoComplete="off"
                    onChange={(evento) => {
                      const valor =
                        tipoDocumento === "Pasaporte"
                          ? evento.target.value.toUpperCase()
                          : evento.target.value.replace(/\D/g, "");

                      setNumeroDocumento(valor);
                      setMensaje("");
                      setCliente(null);
                    }}
                    placeholder={
                      tipoDocumento === "Pasaporte"
                        ? "Ej.: AA123456"
                        : tipoDocumento === "CUIT"
                          ? "Ej.: 20123456789"
                          : "Ej.: 32123456"
                    }
                  />
                </div>
              </div>
            </div>

            {mensaje && (
              <div style={styles.errorBox}>
                <AlertCircle size={19} />
                <span>{mensaje}</span>
              </div>
            )}

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.secondaryButton}
                disabled={loading || (!numeroDocumento && !cliente)}
                onClick={limpiarBusqueda}
              >
                <RotateCcw size={17} />
                Limpiar
              </button>

              <button
                type="submit"
                style={{
                  ...styles.primaryButton,
                  ...(loading ? styles.disabledButton : {}),
                }}
                disabled={loading}
              >
                <Search size={18} />
                {loading ? "Verificando..." : "Verificar documento"}
              </button>
            </div>
          </form>
        </section>

        <section style={styles.infoCard}>
          <div style={styles.infoIcon}>
            <User size={21} />
          </div>

          <div>
            <strong style={styles.infoTitle}>¿Qué sucede después?</strong>
            <p style={styles.infoText}>
              Si el documento no está registrado, se abrirá el alta del cliente
              con el tipo y número de documento ya completados.
            </p>
          </div>
        </section>

        {cliente && (
          <section style={styles.resultCard}>
            <div style={styles.resultTop}>
              <div style={styles.resultHeader}>
                <div style={styles.existingIcon}>
                  <AlertCircle size={22} />
                </div>

                <div>
                  <div style={styles.statusBadge}>Cliente existente</div>

                  <h2 style={styles.resultTitle}>
                    {cliente.nombre} {cliente.apellido}
                  </h2>

                  <p style={styles.resultSubtitle}>
                    Ya existe un cliente registrado con este documento.
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Documento</span>
                <strong style={styles.detailValue}>
                  {cliente.tipo_documento} {cliente.numero_documento}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Correo electrónico</span>
                <strong style={styles.detailValue}>
                  {cliente.email || "No informado"}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Celular</span>
                <strong style={styles.detailValue}>
                  {cliente.celular || "No informado"}
                </strong>
              </div>
            </div>

            <div style={styles.resultActions}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={limpiarBusqueda}
              >
                <RotateCcw size={17} />
                Buscar otro documento
              </button>
              <button
                type="button"
                style={styles.relevamientoButton}
                onClick={() =>
                  router.push(`/clientes/${cliente.id}/onboarding/intereses`)
                }
              >
                <ClipboardList size={18} />
                Relevar intereses
              </button>
              <button
                type="button"
                style={styles.darkButton}
                onClick={() => router.push(`/clientes/${cliente.id}`)}
              >
                Ver ficha del cliente
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
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

  searchCard: {
    overflow: "hidden",
    padding: "24px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    paddingBottom: "20px",
    marginBottom: "22px",
    borderBottom: "1px solid #e2e8f0",
  },

  iconBox: {
    display: "flex",
    width: "48px",
    height: "48px",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "12px",
    color: "#2563eb",
    background: "#eff6ff",
  },

  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "19px",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 260px) minmax(280px, 1fr)",
    gap: "16px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  fieldWide: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: 600,
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "44px",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    outline: "none",
    color: "#0f172a",
    background: "#ffffff",
    fontSize: "14px",
    cursor: "pointer",
  },

  inputWrapper: {
    position: "relative",
    width: "100%",
  },

  inputIcon: {
    position: "absolute",
    top: "50%",
    left: "13px",
    zIndex: 1,
    color: "#94a3b8",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },

  inputWithIcon: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "44px",
    padding: "10px 12px 10px 41px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    outline: "none",
    color: "#0f172a",
    background: "#ffffff",
    fontSize: "14px",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    display: "inline-flex",
    minHeight: "42px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "none",
    borderRadius: "9px",
    color: "#ffffff",
    background: "#2563eb",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    display: "inline-flex",
    minHeight: "42px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    color: "#334155",
    background: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  darkButton: {
    display: "inline-flex",
    minHeight: "42px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "none",
    borderRadius: "9px",
    color: "#ffffff",
    background: "#0f172a",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.65,
    cursor: "not-allowed",
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
    fontSize: "14px",
    fontWeight: 600,
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    border: "1px solid #fecaca",
    borderRadius: "9px",
    color: "#b91c1c",
    background: "#fef2f2",
    fontSize: "14px",
  },

  infoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "16px 18px",
    marginTop: "16px",
    border: "1px solid #dbeafe",
    borderRadius: "12px",
    color: "#1e3a8a",
    background: "#eff6ff",
  },

  infoIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#2563eb",
  },

  infoTitle: {
    display: "block",
    marginBottom: "4px",
    fontSize: "14px",
  },

  infoText: {
    margin: 0,
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  resultCard: {
    overflow: "hidden",
    padding: "24px",
    marginTop: "18px",
    border: "1px solid #fecaca",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  },

  resultTop: {
    paddingBottom: "20px",
    marginBottom: "20px",
    borderBottom: "1px solid #e2e8f0",
  },

  resultHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
  },

  existingIcon: {
    display: "flex",
    width: "44px",
    height: "44px",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "12px",
    color: "#dc2626",
    background: "#fef2f2",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 9px",
    marginBottom: "8px",
    borderRadius: "999px",
    color: "#b91c1c",
    background: "#fee2e2",
    fontSize: "12px",
    fontWeight: 700,
  },

  resultTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "21px",
  },

  resultSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },

  detailItem: {
    display: "flex",
    minHeight: "72px",
    flexDirection: "column",
    justifyContent: "center",
    gap: "6px",
    padding: "13px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#f8fafc",
  },

  detailLabel: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  detailValue: {
    overflowWrap: "anywhere",
    color: "#0f172a",
    fontSize: "14px",
  },

  resultActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    paddingTop: "22px",
    flexWrap: "wrap",
  },
  relevamientoButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",

    minHeight: "42px",
    padding: "10px 16px",

    border: "none",
    borderRadius: "9px",

    background: "#2563eb",
    color: "#ffffff",

    fontSize: "14px",
    fontWeight: 700,

    cursor: "pointer",
  },
};
