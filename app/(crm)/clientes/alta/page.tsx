"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Phone, Info } from "lucide-react";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useRouter, useSearchParams } from "next/navigation";

/* ================= COMPONENTS ================= */

const Input = React.forwardRef<HTMLInputElement, any>(
  ({ fullWidth, style, ...props }, ref) => {
    return (
      <input
        {...props}
        ref={ref}
        style={{
          ...styles.input,
          ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
          ...style,
        }}
      />
    );
  }
);
Input.displayName = "Input";



/* ================= PAGE ================= */

export default function NuevoCliente() {
  const searchParams = useSearchParams();
  const [phoneError, setPhoneError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    tipo_documento: "DNI",
    numero_documento: "",
    fecha_nacimiento: "",
    email: "",
    celular: "",
    domicilio: "",
    sexo: "",
    estado_civil: "",
    cantidad_hijos: "",
    compania_celular: "",
    actividad: "",
  });


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
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    if (!form.nombre) return "Nombre requerido";
    if (!form.apellido) return "Apellido requerido";
    if (!form.numero_documento) return "Documento requerido";
    if (!form.sexo) return "Sexo requerido";
    if (!form.estado_civil) return "Estado civil requerido";
    if (!form.actividad) return "Actividad requerida";
    if (phoneError) return "Teléfono inválido";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validate();
    if (error) return setMensaje("❌ " + error);
    if (!userId) return setMensaje("❌ Usuario no autenticado");

    setLoading(true);

    const { error: insertError } = await supabase.from("clientes").insert([
      {
        ...form,
        cantidad_hijos: Number(form.cantidad_hijos || 0),
        created_by: userId,
      },
    ]);

    setLoading(false);

    if (insertError) {
      console.error(insertError);
      console.log(userId);
      setMensaje(
        `❌ ${insertError.message} (${insertError.code ?? "sin código"})`
      );

      return;
    }

    setMensaje("✅ Cliente creado correctamente");

    setTimeout(() => {
      router.push("/clientes/nuevo?success=1");
    }, 1500);

    setForm({
      nombre: "",
      apellido: "",
      tipo_documento: "DNI",
      numero_documento: "",
      email: "",
      celular: "",
      domicilio: "",
      sexo: "",
      estado_civil: "",
      cantidad_hijos: "",
      compania_celular: "",
      actividad: "",
      fecha_nacimiento: "",
    });
  };

  const router = useRouter();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Nuevo Cliente</h1>

        <form onSubmit={handleSubmit} style={styles.card}>

          {/* 👤 DATOS PERSONALES */}
          <Section title="Datos personales" icon={User}>
            <Grid>
              <Input name="nombre" placeholder="Nombre" onChange={handleChange} />
              <Input name="apellido" placeholder="Apellido" onChange={handleChange} />
              <Select
                        name="tipo_documento"
    value={form.tipo_documento}
    disabled
                >
                <option value="DNI">DNI</option>
                <option value="CUIT">CUIT</option>
                <option value="Pasaporte">Pasaporte</option>
              </Select>

              <Input
                  name="numero_documento"
    value={form.numero_documento}
    disabled
              />
              <Input name="fecha_nacimiento" type="date" onChange={handleChange} />
            </Grid>
          </Section>

          {/* 📞 CONTACTO */}
          <Section title="Contacto" icon={Phone}>
            <Grid>
              <Input name="email" placeholder="Email" onChange={handleChange} />

              <PhoneInput
                country="ar"
                value={form.celular}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, celular: value }));

                  try {
                    const isValid = isValidPhoneNumber("+" + value);
                    setPhoneError(isValid ? "" : "Número inválido");
                  } catch {
                    setPhoneError("Número inválido");
                  }
                }}
                inputStyle={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  border: phoneError
                    ? "1px solid red"
                    : "1px solid #e5e7eb",
                }}
              />

              {phoneError && (
                <span style={{ color: "red", fontSize: 12 }}>
                  {phoneError}
                </span>
              )}

              <Input
                name="domicilio"
                placeholder="Domicilio"
                fullWidth
                onChange={handleChange}
              />
            </Grid>
          </Section>

          {/* ℹ️ INFO ADICIONAL */}
          <Section title="Información adicional" icon={Info}>
            <Grid>
              <Select name="sexo" onChange={handleChange}>
                <option value="">Sexo</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="X">Otro</option>
              </Select>

              <Select name="estado_civil" onChange={handleChange}>
                <option value="">Estado civil</option>
                <option value="soltero">Soltero</option>
                <option value="casado">Casado</option>
                <option value="divorciado">Divorciado</option>
                <option value="viudo">Viudo</option>
              </Select>

              <Input
                name="cantidad_hijos"
                type="number"
                placeholder="Cantidad de hijos"
                onChange={handleChange}
              />

              <Select name="compania_celular" onChange={handleChange}>
                <option value="">Compañía celular</option>
                <option value="claro">Claro</option>
                <option value="movistar">Movistar</option>
                <option value="personal">Personal</option>
                <option value="otro">Otro</option>
              </Select>

              <Select name="actividad" onChange={handleChange}>
                <option value="">Actividad</option>
                <option value="relacion_dependencia">Relación de dependencia</option>
                <option value="autonomo">Autónomo</option>
                <option value="estudiante">Estudiante</option>
                <option value="jubilado">Jubilado</option>
                <option value="desocupado">Desocupado</option>
              </Select>
            </Grid>
          </Section>

          {/* FOOTER */}
          <div style={styles.footer}>
            {mensaje && <span>{mensaje}</span>}
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Guardando..." : "Guardar cliente"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Section({ title, icon: Icon, children }: any) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        {Icon && <Icon size={18} style={{ marginRight: 8 }} />}
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: any) {
  return <div style={styles.grid}>{children}</div>;
}

function Select(props: any) {
  return <select {...props} style={styles.input} />;
}
/* ================= STYLES ================= */

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#f4f6fb",
    minHeight: "100vh",
    padding: "40px",
    fontFamily: "system-ui",
  },
  container: {
    maxWidth: 900,
    margin: "0 auto",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
  },
  subtitle: {
    color: "#6b7280",
    marginBottom: 20,
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  input: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    fontSize: 14,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  sectionHeader: {
  display: "flex",
  alignItems: "center",
  marginBottom: 12,
  color: "#111827",
},
};