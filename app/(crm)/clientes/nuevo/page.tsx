"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertCircle, User } from "lucide-react";
import { getClienteByDocumento } from "@/lib/sql/clientes";
import type { Cliente } from "../types";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";


export default function NuevoCliente() {
  const router = useRouter();
    const searchParams = useSearchParams();
    const success = searchParams.get("success");
    const [mensajeExito, setMensajeExito] = useState("");
  const [loading, setLoading] = useState(false);

  const [tipoDocumento, setTipoDocumento] = useState("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [mensaje, setMensaje] = useState("");

 async function verificarCliente() {
  setLoading(true);
  setMensaje("");
  setCliente(null);

  try {
    const { data, error } = await getClienteByDocumento(
      tipoDocumento,
      numeroDocumento
    );
        console.log("DATA:", data);
        console.log("ERROR:", error);
    // SIEMPRE apagar loading
    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    if (data) {
      console.log("Cliente encontrado:", data);
      setCliente(data);
      return;
    }

    router.push(
      `/clientes/alta?tipo=${encodeURIComponent(tipoDocumento)}&numero=${encodeURIComponent(numeroDocumento)}`
    );

  } catch (err) {
    console.error(err);
    setLoading(false);
    setMensaje("Error inesperado");
  }
}

const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);


useEffect(() => {
  if (!success) return;

  setMensajeExito("✅ Cliente registrado correctamente.");

  const timer = setTimeout(() => {
    setMensajeExito("");

    router.replace("/clientes/nuevo");
  }, 3000);

  return () => clearTimeout(timer);
}, [success, router]);



return (


    <div style={styles.page}>
      <div style={styles.container}>

{mensajeExito && (
  <div
    style={{
      background: "#ecfdf5",
      color: "#065f46",
      padding: 16,
      borderRadius: 10,
      marginBottom: 20,
      border: "1px solid #10b981",
      fontWeight: 600,
    }}
  >
    {mensajeExito}
  </div>
)}


        <div style={styles.card}>

          <div style={styles.header}>
            <Search size={28} color="#2563eb" />

            <div>
              <h1 style={styles.title}>Nuevo cliente</h1>

              <p style={styles.subtitle}>
                Antes de registrar un cliente verificá que no exista previamente.
              </p>
            </div>
          </div>

          <form
  style={styles.form}
  onSubmit={(e) => {
    e.preventDefault();
    verificarCliente();
  }}
>

            <div style={styles.field}>
  <label style={styles.label}>Tipo de documento</label>

              <select
                    style={styles.select}
                    value={tipoDocumento}
                    disabled={loading}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    >
                <option>DNI</option>
                <option>CUIT</option>
                <option>Pasaporte</option>
              </select>
            </div>

            <div style={styles.field}>
  <label style={styles.label}>Número de documento</label>

              <input ref={inputRef}
  style={styles.input}
  value={numeroDocumento}
  disabled={loading}
  onChange={(e) =>
    setNumeroDocumento(e.target.value.replace(/\D/g, ""))
  }
  placeholder="Ej: 32123456"
/>
            </div>

            <button
  type="submit"
  style={styles.button}
  disabled={loading}
>
  {loading ? "Verificando..." : "Verificar documento"}
</button>

            {mensaje && (
              <div style={styles.warning}>
                <AlertCircle size={18} />
                {mensaje}
              </div>
            )}

          </form>

        </div>

        {cliente && (

          <div style={styles.resultCard}>

            

              <div style={styles.resultHeader}>
                    <User size={22} color="#dc2626" />

                    <div>
                        <h2 style={{ margin: 0 }}>
                        Cliente existente
                        </h2>

                        <span style={{ color: "#6b7280", fontSize: 14 }}>
                        Ya existe un cliente registrado con este documento.
                        </span>
                  
                    </div>
            </div>

            <p>
              <strong>Nombre:</strong>{" "}
              {cliente.nombre} {cliente.apellido}
            </p>

            <p>
              <strong>Documento:</strong>{" "}
              {cliente.tipo_documento} {cliente.numero_documento}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {cliente.email || "-"}
            </p>

            <p>
              <strong>Celular:</strong>{" "}
              {cliente.celular || "-"}
            </p>

            <button
              style={styles.secondaryButton}
              onClick={() =>
                router.push(`/clientes/${cliente.id}`)
              }
            >
              Ver ficha del cliente
            </button>
<button
  style={styles.outlineButton}
  onClick={() => {
  setCliente(null);
  setNumeroDocumento("");
  setMensaje("");
  inputRef.current?.focus();
}}
>
  Buscar otro documento
</button>
          </div>

        )}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#f4f6fb",
    minHeight: "100vh",
    padding: 40,
  },

field: {
  display: "flex",
  flexDirection: "column",
  gap: 8,
},

input: {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 15,
  background: "#fff",
  outline: "none",
  transition: "all .2s",
},

select: {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 15,
  background: "#fff",
  outline: "none",
  cursor: "pointer",
},

outlineButton: {
  marginTop: 10,
  background: "white",
  color: "#111827",
  border: "1px solid #d1d5db",
  padding: "12px",
  borderRadius: 10,
  cursor: "pointer",
  width: "100%",
},


  container: {
    maxWidth: 700,
    margin: "0 auto",
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: 30,
    boxShadow: "0 8px 30px rgba(0,0,0,.08)",
    
  },

  header: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginBottom: 30,
  },

  title: {
    margin: 0,
    fontSize: 28,
  },

  subtitle: {
    color: "#6b7280",
    marginTop: 5,
  },

  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },

  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 600,
  },

  button: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: 14,
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },


  secondaryButton: {
    width: "100%",
    background: "#111827",
    color: "white",
    border: "none",
    padding: 12,
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 20,
  },

  warning: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#dc2626",
    marginTop: 10,
  },

  resultCard: {
    background: "white",
    borderRadius: 16,
    marginTop: 30,
    padding: 25,
    borderLeft: "5px solid #dc2626",
    boxShadow: "0 8px 30px rgba(0,0,0,.08)",
  },

  resultHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
};



