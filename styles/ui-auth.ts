export const container = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f4f6f8",
}

export const card = {
  width: 400,
  padding: 30,
  borderRadius: 12,
  background: "white",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
}

export const title = {
  fontSize: 24,
  marginBottom: 20,
}

export const form = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 15,
}

export const input = {
  padding: "14px 16px",
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid #ccc",
}

export const button = {
  padding: "14px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  background: "#4f46e5",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
}