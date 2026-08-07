"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";

import styles from "./UsersPage.module.css";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "gerente", label: "Gerente" },
  { value: "supervisor", label: "Supervisor" },
  { value: "vendedor", label: "Vendedor" },
] as const;

type Role = (typeof ROLES)[number]["value"];

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role | null;
  supervisor_id: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  avatar_url?: string | null;
};

type UserForm = {
  email: string;
  password: string;
  full_name: string;
  role: Role;
};

const INITIAL_FORM: UserForm = {
  email: "",
  password: "",
  full_name: "",
  role: "vendedor",
};

const PAGE_SIZE = 8;

function formatDate(date: string | null) {
  if (!date) {
    return "Sin informar";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("es-AR");
}

function getRoleLabel(role: string | null) {
  return (
    ROLES.find((option) => option.value === role)?.label ||
    role ||
    "Sin rol"
  );
}

function getInitials(name: string | null, email: string) {
  const base = name?.trim() || email.split("@")[0] || "U";

  return base
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function UsersPage() {
  const router = useRouter();
  const { user, role, loading: userLoading } = useUser();

  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | Role>(
    "todos"
  );
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(INITIAL_FORM);

  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userLoading && role !== "admin") {
      router.replace("/no-access");
    }
  }, [userLoading, role, router]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setError("");

      const { data, error: usersError } = await supabase
        .from("profiles")
        .select(
          `
            id,
            email,
            full_name,
            role,
            supervisor_id,
            sexo,
            fecha_nacimiento,
            avatar_url
          `
        )
        .order("full_name", {
          ascending: true,
          nullsFirst: false,
        });

      if (usersError) {
        throw usersError;
      }

      setUsersList((data ?? []) as Profile[]);
    } catch (err) {
      console.error("Error obteniendo usuarios:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los usuarios."
      );
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading || role !== "admin") {
      return;
    }

    fetchUsers();
  }, [userLoading, role, fetchUsers]);

  const supervisors = useMemo(() => {
    return usersList.filter(
      (currentUser) => currentUser.role === "supervisor"
    );
  }, [usersList]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return usersList.filter((currentUser) => {
      const matchesSearch =
        !normalizedSearch ||
        (currentUser.full_name ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        currentUser.email
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesRole =
        roleFilter === "todos" ||
        currentUser.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [usersList, search, roleFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / PAGE_SIZE)
  );

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function updateForm(
    event:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function openCreateModal() {
    setForm(INITIAL_FORM);
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    setModalOpen(false);
    setForm(INITIAL_FORM);
    setError("");
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("Ingresá el nombre del usuario.");
      return;
    }

    if (!form.email.trim()) {
      setError("Ingresá el correo electrónico.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          email: form.email.trim(),
          full_name: form.full_name.trim(),
        }),
      });

      const responseData = await response
        .json()
        .catch(() => ({
          error: "El servidor devolvió una respuesta inválida.",
        }));

      if (!response.ok) {
        throw new Error(
          responseData.error || "No se pudo crear el usuario."
        );
      }

      await fetchUsers();

      setModalOpen(false);
      setForm(INITIAL_FORM);
      setMessage("Usuario creado correctamente.");
    } catch (err) {
      console.error("Error creando usuario:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear el usuario."
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateRole(
    userId: string,
    newRole: Role
  ) {
    try {
      setSavingId(userId);
      setError("");
      setMessage("");

      const changes: {
        role: Role;
        supervisor_id?: null;
      } = {
        role: newRole,
      };

      if (newRole !== "vendedor") {
        changes.supervisor_id = null;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(changes)
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      await fetchUsers();
      setMessage("Rol actualizado correctamente.");
    } catch (err) {
      console.error("Error actualizando rol:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el rol."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function updateSupervisor(
    userId: string,
    supervisorId: string
  ) {
    try {
      setSavingId(userId);
      setError("");
      setMessage("");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          supervisor_id: supervisorId || null,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      await fetchUsers();
      setMessage("Supervisor actualizado correctamente.");
    } catch (err) {
      console.error("Error actualizando supervisor:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el supervisor."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUser(selectedUser: Profile) {
    if (selectedUser.id === user?.id) {
      setError("No podés eliminar tu propio usuario.");
      return;
    }

    const confirmed = window.confirm(
      `¿Querés eliminar a ${
        selectedUser.full_name || selectedUser.email
      }?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(selectedUser.id);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/delete-user",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: selectedUser.id,
          }),
        }
      );

      const responseData = await response
        .json()
        .catch(() => ({
          error: "El servidor devolvió una respuesta inválida.",
        }));

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            "No se pudo eliminar el usuario."
        );
      }

      await fetchUsers();
      setMessage("Usuario eliminado correctamente.");
    } catch (err) {
      console.error("Error eliminando usuario:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar el usuario."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (userLoading || role !== "admin") {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>
          Cargando administración de usuarios...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* ENCABEZADO */}

        <header className={styles.header}>
          <div>
            <div className={styles.breadcrumb}>
              Administración / Usuarios
            </div>

            <h1 className={styles.title}>
              Administración de usuarios
            </h1>

            <p className={styles.subtitle}>
              Gestioná usuarios, roles, responsables y jerarquías
              del CRM.
            </p>
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={openCreateModal}
          >
            <Plus size={17} />
            Nuevo usuario
          </button>
        </header>

        {/* MENSAJES */}

        {error && (
          <div className={styles.errorBox}>{error}</div>
        )}

        {message && (
          <div className={styles.successBox}>{message}</div>
        )}

        {/* RESUMEN */}

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <div className={styles.summaryIconBlue}>
              <Users size={20} />
            </div>

            <div>
              <span className={styles.summaryLabel}>
                Usuarios registrados
              </span>

              <strong className={styles.summaryValue}>
                {usersList.length}
              </strong>
            </div>
          </article>

          <article className={styles.summaryCard}>
            <div className={styles.summaryIconPurple}>
              <ShieldCheck size={20} />
            </div>

            <div>
              <span className={styles.summaryLabel}>
                Administradores
              </span>

              <strong className={styles.summaryValue}>
                {
                  usersList.filter(
                    (currentUser) =>
                      currentUser.role === "admin"
                  ).length
                }
              </strong>
            </div>
          </article>

          <article className={styles.summaryCard}>
            <div className={styles.summaryIconGreen}>
              <UserRound size={20} />
            </div>

            <div>
              <span className={styles.summaryLabel}>
                Vendedores
              </span>

              <strong className={styles.summaryValue}>
                {
                  usersList.filter(
                    (currentUser) =>
                      currentUser.role === "vendedor"
                  ).length
                }
              </strong>
            </div>
          </article>
        </section>

        {/* FILTROS */}

        <section className={styles.filtersCard}>
          <div className={styles.searchField}>
            <label className={styles.label}>
              Buscar usuario
            </label>

            <div className={styles.inputWithIcon}>
              <Search size={17} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Nombre o correo electrónico"
              />
            </div>
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Rol</label>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value as "todos" | Role
                )
              }
              className={styles.select}
            >
              <option value="todos">Todos los roles</option>

              {ROLES.map((roleOption) => (
                <option
                  key={roleOption.value}
                  value={roleOption.value}
                >
                  {roleOption.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className={styles.resultsSummary}>
          Mostrando{" "}
          <strong>{filteredUsers.length}</strong>{" "}
          usuario
          {filteredUsers.length === 1 ? "" : "s"}
        </div>

        {/* TABLA */}

        <section className={styles.tableCard}>
          {loadingUsers ? (
            <div className={styles.emptyState}>
              Cargando usuarios...
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No se encontraron usuarios.</strong>
              <span>
                Modificá los filtros o registrá un usuario nuevo.
              </span>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Datos personales</th>
                    <th>Rol</th>
                    <th>Supervisor</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((currentUser) => (
                    <tr key={currentUser.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>
                            {currentUser.avatar_url ? (
                              <img
                                src={currentUser.avatar_url}
                                alt={
                                  currentUser.full_name ||
                                  currentUser.email
                                }
                              />
                            ) : (
                              getInitials(
                                currentUser.full_name,
                                currentUser.email
                              )
                            )}
                          </div>

                          <div className={styles.userData}>
                            <strong>
                              {currentUser.full_name ||
                                "Sin nombre"}
                            </strong>

                            <span>
                              <Mail size={12} />
                              {currentUser.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={styles.personalData}>
                          <span>
                            <strong>Sexo:</strong>{" "}
                            {currentUser.sexo || "Sin informar"}
                          </span>

                          <span>
                            <strong>Nacimiento:</strong>{" "}
                            {formatDate(
                              currentUser.fecha_nacimiento
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <select
                          value={
                            currentUser.role || "vendedor"
                          }
                          onChange={(event) =>
                            updateRole(
                              currentUser.id,
                              event.target.value as Role
                            )
                          }
                          disabled={
                            savingId === currentUser.id
                          }
                          className={styles.tableSelect}
                        >
                          {ROLES.map((roleOption) => (
                            <option
                              key={roleOption.value}
                              value={roleOption.value}
                            >
                              {roleOption.label}
                            </option>
                          ))}
                        </select>

                        <span
                          className={
                            styles[
                              `role_${currentUser.role || "vendedor"}`
                            ]
                          }
                        >
                          {getRoleLabel(currentUser.role)}
                        </span>
                      </td>

                      <td>
                        {currentUser.role === "vendedor" ? (
                          <select
                            value={
                              currentUser.supervisor_id || ""
                            }
                            onChange={(event) =>
                              updateSupervisor(
                                currentUser.id,
                                event.target.value
                              )
                            }
                            disabled={
                              savingId === currentUser.id
                            }
                            className={styles.tableSelect}
                          >
                            <option value="">
                              Sin asignar
                            </option>

                            {supervisors.map((supervisor) => (
                              <option
                                key={supervisor.id}
                                value={supervisor.id}
                              >
                                {supervisor.full_name ||
                                  supervisor.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={styles.notApplicable}>
                            No corresponde
                          </span>
                        )}
                      </td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() =>
                              deleteUser(currentUser)
                            }
                            disabled={
                              deletingId === currentUser.id ||
                              currentUser.id === user?.id
                            }
                          >
                            <Trash2 size={14} />

                            {deletingId === currentUser.id
                              ? "Eliminando..."
                              : "Eliminar"}
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

        {/* PAGINACIÓN */}

        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Página {page} de {totalPages}
          </span>

          <div className={styles.paginationButtons}>
            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              disabled={page === 1}
              className={styles.paginationButton}
            >
              <ChevronLeft size={16} />
              Anterior
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              disabled={page === totalPages}
              className={styles.paginationButton}
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL NUEVO USUARIO */}

      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalIcon}>
                  <UserRound size={22} />
                </div>

                <h2>Nuevo usuario</h2>

                <p>
                  Registrá el acceso y asigná el rol inicial del
                  usuario.
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeCreateModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createUser}>
              <div className={styles.formGrid}>
                <div className={styles.fullField}>
                  <label className={styles.label}>
                    Nombre completo *
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={updateForm}
                    className={styles.input}
                    placeholder="Ej. Sofía Martínez"
                    disabled={creating}
                    autoFocus
                  />
                </div>

                <div className={styles.fullField}>
                  <label className={styles.label}>
                    Correo electrónico *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateForm}
                    className={styles.input}
                    placeholder="usuario@empresa.com"
                    disabled={creating}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Contraseña inicial *
                  </label>

                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={updateForm}
                    className={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    disabled={creating}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Rol inicial *
                  </label>

                  <select
                    name="role"
                    value={form.role}
                    onChange={updateForm}
                    className={styles.select}
                    disabled={creating}
                  >
                    {ROLES.map((roleOption) => (
                      <option
                        key={roleOption.value}
                        value={roleOption.value}
                      >
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && modalOpen && (
                <div className={styles.modalError}>
                  {error}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeCreateModal}
                  disabled={creating}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={creating}
                >
                  {creating ? (
                    "Creando usuario..."
                  ) : (
                    <>
                      <Plus size={17} />
                      Crear usuario
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}