"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import styles from "./login.module.css";

type Mode = "login" | "signup" | "reset";

function En1ClicLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <svg
        className={styles.symbolLogo}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="EN1CLIC"
      >
        <rect x="22" y="4" width="11" height="36" rx="5.5" fill="#0057FF" />
        <rect x="9" y="4" width="28" height="11" rx="5.5" fill="#0057FF" />
        <rect x="9" y="40" width="32" height="11" rx="5.5" fill="#0057FF" />
        <circle cx="46" cy="9" r="8" fill="#00C2A0" />
      </svg>
    );
  }

  return (
    <svg
      className={styles.fullLogo}
      viewBox="0 0 500 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EN1CLIC by EAYA"
    >
      <rect x="44" y="12" width="20" height="76" rx="10" fill="#0057FF" />
      <rect x="20" y="12" width="56" height="20" rx="10" fill="#0057FF" />
      <rect x="20" y="88" width="60" height="20" rx="10" fill="#0057FF" />
      <circle cx="92" cy="20" r="14" fill="#00C2A0" />
      <text x="128" y="84" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontWeight="800" fontSize="68" fill="#0A0F1E" letterSpacing="-2">
        EN1CLIC
      </text>
      <text x="130" y="120" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontWeight="600" fontSize="22" fill="#94A3B8" letterSpacing="4">
        by EAYA
      </text>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function cambiarModo(nuevoModo: Mode) {
    setMode(nuevoModo);
    setError(null);
    setMessage(null);

    if (nuevoModo === "reset") {
      setPassword("");
      setMostrarPassword(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Ingresá email y contraseña.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        setError(
          msg.includes("invalid") || msg.includes("credentials")
            ? "El email o la contraseña son incorrectos."
            : error.message
        );
        return;
      }

      if (!data?.user) {
        setError("No fue posible iniciar sesión.");
        return;
      }

      router.replace("/inicio");
      router.refresh();
    } catch (err) {
      console.error("Error iniciando sesión:", err);
      setError("Ocurrió un error inesperado al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!email.trim() || !password || !nombre.trim()) {
      setError("Completá todos los campos.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: nombre.trim() },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Usuario creado correctamente. Revisá tu email para continuar.");
    } catch (err) {
      console.error("Error creando usuario:", err);
      setError("No fue posible crear el usuario.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      setError("Ingresá tu email.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Te enviamos un email para recuperar tu contraseña.");
    } catch (err) {
      console.error("Error recuperando contraseña:", err);
      setError("No fue posible iniciar la recuperación de contraseña.");
    } finally {
      setLoading(false);
    }
  }

  async function ejecutarAccion() {
    if (mode === "login") return handleLogin();
    if (mode === "signup") return handleSignUp();
    return handleResetPassword();
  }

  const titulo =
    mode === "login"
      ? "Bienvenido nuevamente"
      : mode === "signup"
      ? "Crear una cuenta"
      : "Recuperar contraseña";

  const descripcion =
    mode === "login"
      ? "Ingresá tus credenciales para acceder al CRM."
      : mode === "signup"
      ? "Registrá un nuevo usuario para comenzar."
      : "Ingresá tu email y te enviaremos las instrucciones.";

  const textoBoton =
    loading
      ? "Procesando..."
      : mode === "login"
      ? "Ingresar"
      : mode === "signup"
      ? "Crear cuenta"
      : "Enviar email";

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <div className={styles.desktopLogoWrap}>
              <En1ClicLogo />
            </div>

            <div>
              <div className={styles.brandEyebrow}>CRM COMERCIAL</div>
              <h1 className={styles.brandTitle}>
                Todo tu negocio,
                <br />
                en un clic.
              </h1>
              <p className={styles.brandText}>
                Gestioná clientes, productos, operaciones y oportunidades
                desde una única plataforma.
              </p>
            </div>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><ShieldCheck size={18} /></div>
                <span>Acceso seguro y gestión de permisos</span>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><LogIn size={18} /></div>
                <span>Journey comercial centralizado</span>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><UserPlus size={18} /></div>
                <span>Clientes, productos y oportunidades en un solo lugar</span>
              </div>
            </div>
          </div>

          <div className={styles.brandFooter}>Una solución del ecosistema EAYA</div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formPanelInner}>
            <div className={styles.mobileBrand}>
              <En1ClicLogo compact />
              <div className={styles.mobileBrandText}>
                <strong>EN1CLIC</strong>
                <span>by EAYA</span>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.header}>
                <div className={styles.modeIcon}>
                  {mode === "login" && <LogIn size={22} />}
                  {mode === "signup" && <UserPlus size={22} />}
                  {mode === "reset" && <KeyRound size={22} />}
                </div>
                <h2>{titulo}</h2>
                <p>{descripcion}</p>
              </div>

              <div className={styles.tabs}>
                <button type="button" className={mode === "login" ? styles.tabActive : styles.tab} onClick={() => cambiarModo("login")}>Ingresar</button>
                <button type="button" className={mode === "signup" ? styles.tabActive : styles.tab} onClick={() => cambiarModo("signup")}>Registro</button>
                <button type="button" className={mode === "reset" ? styles.tabActive : styles.tab} onClick={() => cambiarModo("reset")}>Recuperar</button>
              </div>

              <form className={styles.form} onSubmit={(event) => { event.preventDefault(); ejecutarAccion(); }}>
                {mode === "signup" && (
                  <div className={styles.field}>
                    <label>Nombre completo</label>
                    <input type="text" placeholder="Ej. Juan Pérez" autoComplete="name" value={nombre} disabled={loading} onChange={(event) => setNombre(event.target.value)} />
                  </div>
                )}

                <div className={styles.field}>
                  <label>Email</label>
                  <div className={styles.inputWrapper}>
                    <Mail size={18} className={styles.inputIcon} />
                    <input type="email" placeholder="nombre@empresa.com" autoComplete="email" value={email} disabled={loading} className={styles.inputWithIcon} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                </div>

                {mode !== "reset" && (
                  <div className={styles.field}>
                    <label>Contraseña</label>
                    <div className={styles.inputWrapper}>
                      <KeyRound size={18} className={styles.inputIcon} />
                      <input type={mostrarPassword ? "text" : "password"} placeholder="Ingresá tu contraseña" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} disabled={loading} className={styles.passwordInput} onChange={(event) => setPassword(event.target.value)} />
                      <button type="button" className={styles.passwordToggle} onClick={() => setMostrarPassword((actual) => !actual)} aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                        {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && <div className={styles.errorBox}>{error}</div>}
                {message && <div className={styles.successBox}>{message}</div>}

                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {mode === "login" && <LogIn size={18} />}
                  {mode === "signup" && <UserPlus size={18} />}
                  {mode === "reset" && <Mail size={18} />}
                  {textoBoton}
                </button>

                {mode === "login" && (
                  <button type="button" className={styles.forgot} onClick={() => cambiarModo("reset")}>¿Olvidaste tu contraseña?</button>
                )}
              </form>
            </div>

            <div className={styles.formFooter}>Acceso exclusivo para usuarios autorizados.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
