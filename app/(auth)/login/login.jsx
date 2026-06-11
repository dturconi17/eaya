import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // 👇 ESTE ES EL LUGAR CORRECTO
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        navigate("/cobertura-historica")
      }
    }

    checkSession()
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error) {
      navigate("/cobertura-historica")
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button>Login</button>
    </form>
  )
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f6f8",
  },
  card: {
    width: 350,
    padding: 30,
    background: "white",
    borderRadius: 10,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  title: {
    marginBottom: 5,
  },
  subtitle: {
    marginBottom: 20,
    color: "#666",
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ddd",
    fontSize: 14,
  },
  button: {
    padding: 10,
    borderRadius: 6,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  error: {
    color: "red",
    fontSize: 13,
  },
}