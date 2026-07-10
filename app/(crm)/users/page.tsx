"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";
import { useRouter } from "next/navigation";

const roles = ["admin", "gerente", "supervisor", "vendedor"];

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  supervisor_id: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
};

export default function UsersPage() {
  const { user, role, loading } = useUser();
  const router = useRouter();

  const [users, setUsers] = useState<Profile[]>([]);
  const [supervisores, setSupervisores] = useState<Profile[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 3;

  const filteredUsers = users.filter((u) => {
    const text = search.toLowerCase();

    return (
      (u.full_name ?? "").toLowerCase().includes(text) ||
      u.email.toLowerCase().includes(text)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "vendedor",
  });

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/no-access");
    }
  }, [loading, role, router]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, supervisor_id, sexo, fecha_nacimiento"
      )
      .order("full_name");

    console.log("DATA:", data)
    console.log("ERROR:", error)

    if (error) {
      console.error("Error trayendo usuarios:", error);
      return;
    }

    setUsers(data || []);
    setSupervisores((data || []).filter((u) => u.role === "supervisor"));
  };

  useEffect(() => {
    const loadUsers = async () => {
      await fetchUsers();
    };
    const newTotalPages = Math.ceil((filteredUsers.length - 1) / PAGE_SIZE);

    if (page > newTotalPages && page > 1) {
      setPage(page - 1);
    }
    loadUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const updateRole = async (userId: string, newRole: string) => {
    setSavingId(userId);

    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);

    if (newRole !== "vendedor") {
      await supabase
        .from("profiles")
        .update({ supervisor_id: null })
        .eq("id", userId);
    }

    await fetchUsers();
    setSavingId(null);
  };

  const updateSupervisor = async (userId: string, supervisorId: string) => {
    await supabase
      .from("profiles")
      .update({ supervisor_id: supervisorId || null })
      .eq("id", userId);

    fetchUsers();
  };

  // 🔥 FIX IMPORTANTE ACÁ
  const createUser = async () => {
    if (!form.email || !form.password) {
      alert("Email y password obligatorios");
      return;
    }

    setCreating(true);

    try {
      console.log("ENVIANDO:", form);

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      let data;

      // 🧠 evitar crash si viene vacío
      try {
        data = await res.json();
      } catch {
        data = { error: "Respuesta vacía del servidor" };
      }

      console.log("RESPUESTA BACK:", data);

      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario");
      }

      // limpiar form
      setForm({
        email: "",
        password: "",
        full_name: "",
        role: "vendedor",
      });

      // refrescar tabla
      await fetchUsers();

      alert("Usuario creado correctamente");

    } catch (err: unknown) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Ocurrió un error inesperado");
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (selectedUser: Profile) => {

    if (selectedUser.id === user?.id) {
      alert("No podés eliminar tu propio usuario.");
      return;
    }

    const ok = confirm(
      `¿Está seguro que desea eliminar a ${selectedUser.full_name || selectedUser.email}?`
    );

    if (!ok) return;

    setDeletingId(selectedUser.id);

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedUser.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo eliminar el usuario");
      }

      await fetchUsers();

      alert("Usuario eliminado correctamente");

    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Error eliminando usuario");
      }
    } finally {
      setDeletingId(null);
    };
  }
  if (loading || role !== "admin") {
    return <p style={{ padding: 20 }}>Cargando...</p>;
  }

  return (
    <div style={container}>
      <div>
        <h1 style={title}>Administración de Usuarios</h1>
        <p style={subtitle}>
          Gestioná los roles y jerarquías del sistema
        </p>
      </div>

      <div style={card}>
        <h2 style={cardTitle}>Crear Usuario</h2>

        <div style={formGrid}>
          <input
            placeholder="Nombre"
            value={form.full_name}
            onChange={(e) =>
              setForm({ ...form, full_name: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            style={input}
          />

          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value })
            }
            style={input}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button onClick={createUser} style={button} disabled={creating}>
          {creating ? "Creando..." : "Crear usuario"}
        </button>
      </div>

      <div style={{ marginBottom: 15 }}>
        <input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            ...input,
            width: "350px",
          }}
        />
      </div>

      <div style={card}>
        <table style={table}>
          <thead>
            <tr style={thead}>
              <th style={th}>Usuario</th>
              <th style={th}>Sexo</th>
              <th style={th}>Nacimiento</th>
              <th style={th}>Email</th>
              <th style={th}>Rol</th>
              <th style={th}>Supervisor</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.map((u, i) => (
              <tr key={u.id} style={i % 2 === 0 ? row : rowAlt}>
                <td style={td}>{u.full_name || "-"}</td>
                <td style={td}>{u.sexo || "-"}</td>
                <td style={td}>{u.fecha_nacimiento || "-"}</td>
                <td style={td}>{u.email}</td>

                <td style={td}>
                  <select
                    value={u.role || "vendedor"}
                    onChange={(e) =>
                      updateRole(u.id, e.target.value)
                    }
                    disabled={savingId === u.id}
                    style={input}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={td}>
                  {u.role === "vendedor" ? (
                    <select
                      value={u.supervisor_id || ""}
                      onChange={(e) =>
                        updateSupervisor(u.id, e.target.value)
                      }
                      style={input}
                    >
                      <option value="">Sin asignar</option>
                      {supervisores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={td}>
                  <button
                    onClick={() => deleteUser(u)}
                    disabled={deletingId === u.id}
                    style={{
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 12px",
                      cursor: deletingId === u.id ? "not-allowed" : "pointer",
                      opacity: deletingId === u.id ? 0.6 : 1,
                    }}
                  >
                    {deletingId === u.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
          alignItems: "center",
        }}
      >
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          style={button}
        >
          Anterior
        </button>

        <span>
          Página {page} de {totalPages || 1}
        </span>

        <button
          disabled={page === totalPages || totalPages === 0}
          onClick={() => setPage(page + 1)}
          style={button}
        >
          Siguiente
        </button>
      </div>
    </div>


  );
}

/* 🎨 ESTILOS */

const container = {
  padding: "30px",
  background: "#f1f5f9",
};

const title = {
  fontSize: "26px",
  fontWeight: "bold",
};

const subtitle = {
  color: "#64748b",
  marginBottom: "20px",
};

const card = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  marginBottom: "20px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
};

const cardTitle = {
  marginBottom: "15px",
  fontWeight: "bold",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "10px",
};

const input = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const button = {
  marginTop: "15px",
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const thead = {
  background: "#1f2937",
  color: "white",
};

const th = {
  padding: "12px",
  textAlign: "left" as const,
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
};

const row = {};

const rowAlt = {
  background: "#f9fafb",
};