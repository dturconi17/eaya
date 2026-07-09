"use client"

type Props = {
  seconds: number
  onContinue: () => void
  onLogout: () => void
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`
}

export default function SessionTimeoutModal({
  seconds,
  onContinue,
  onLogout,
}: Props) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={icon}>
          ⚠️
        </div>

        <h2 style={title}>
          Sesión por expirar
        </h2>

        <p style={description}>
          Por seguridad, detectamos un período prolongado de inactividad.
        </p>

        <p style={description}>
          Tu sesión se cerrará automáticamente en:
        </p>

        <div style={counter}>
          {formatTime(seconds)}
        </div>

        <div style={actions}>

          <button
            style={continueButton}
            onClick={onContinue}
          >
            Continuar trabajando
          </button>


          <button
            style={logoutButton}
            onClick={onLogout}
          >
            Cerrar sesión
          </button>

        </div>

      </div>
    </div>
  )
}


/* ===========================
   ESTILOS
=========================== */


const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15,23,42,0.65)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
}


const modal: React.CSSProperties = {
  width: "430px",
  maxWidth: "90%",
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "32px",
  textAlign: "center",
  boxShadow: "0 25px 60px rgba(0,0,0,.35)",
}


const icon: React.CSSProperties = {
  fontSize: "48px",
  marginBottom: "10px",
}


const title: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "24px",
}


const description: React.CSSProperties = {
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.5,
  marginTop: "16px",
}


const counter: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 700,
  color: "#dc2626",
  margin: "25px 0",
  letterSpacing: "2px",
}


const actions: React.CSSProperties = {
  display: "flex",
  gap: "12px",
}


const continueButton: React.CSSProperties = {
  flex: 1,
  border: "none",
  borderRadius: "8px",
  padding: "12px",
  backgroundColor: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
}


const logoutButton: React.CSSProperties = {
  flex: 1,
  border: "none",
  borderRadius: "8px",
  padding: "12px",
  backgroundColor: "#dc2626",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
}