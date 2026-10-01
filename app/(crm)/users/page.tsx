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
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
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

type Role =
  (typeof ROLES)[number]["value"];

type PuntoVenta = {
  id: string;
  nombre: string;
  activo: boolean;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role | null;
  supervisor_id: string | null;
  punto_venta_id: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  avatar_url?: string | null;
  activo: boolean;
};

type UserForm = {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  punto_venta_id: string;
};

type StatusFilter =
  | "todos"
  | "activos"
  | "inactivos";

const INITIAL_FORM: UserForm = {
  email: "",
  password: "",
  full_name: "",
  role: "vendedor",
  punto_venta_id: "",
};

const PAGE_SIZE = 8;

function formatDate(
  date: string | null
) {
  if (!date) {
    return "Sin informar";
  }

  const parsed = new Date(
    `${date}T00:00:00`
  );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    "es-AR"
  );
}

function getRoleLabel(
  role: string | null
) {
  return (
    ROLES.find(
      (option) =>
        option.value === role
    )?.label ||
    role ||
    "Sin rol"
  );
}

function getInitials(
  name: string | null,
  email: string
) {
  const base =
    name?.trim() ||
    email.split("@")[0] ||
    "U";

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

  const {
    user,
    role,
    loading: userLoading,
  } = useUser();

  const [
    usersList,
    setUsersList,
  ] = useState<Profile[]>([]);

  const [
    puntosVenta,
    setPuntosVenta,
  ] = useState<PuntoVenta[]>([]);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] = useState<
    "todos" | Role
  >("todos");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>(
    "activos"
  );

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] =
    useState<UserForm>(
      INITIAL_FORM
    );

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    savingId,
    setSavingId,
  ] = useState<
    string | null
  >(null);

  const [
    statusChangingId,
    setStatusChangingId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  // =========================================================
  // SEGURIDAD
  // =========================================================

  useEffect(() => {
    if (
      !userLoading &&
      role !== "admin"
    ) {
      router.replace(
        "/no-access"
      );
    }
  }, [
    userLoading,
    role,
    router,
  ]);

  // =========================================================
  // USUARIOS
  // =========================================================

  const fetchUsers =
    useCallback(async () => {
      try {
        setLoadingUsers(true);
        setError("");

        const {
          data,
          error: usersError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              email,
              full_name,
              role,
              supervisor_id,
              punto_venta_id,
              sexo,
              fecha_nacimiento,
              avatar_url,
              activo
            `
          )
          .order(
            "full_name",
            {
              ascending: true,
              nullsFirst: false,
            }
          );

        if (usersError) {
          throw usersError;
        }

        setUsersList(
          (data ?? []) as Profile[]
        );
      } catch (err) {
        console.error(
          "Error obteniendo usuarios:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar los usuarios."
        );
      } finally {
        setLoadingUsers(false);
      }
    }, []);

  // =========================================================
  // PUNTOS DE VENTA
  // =========================================================

  const fetchPuntosVenta =
    useCallback(async () => {
      try {
        const {
          data,
          error: puntosError,
        } = await supabase
          .from(
            "puntos_venta"
          )
          .select(
            "id, nombre, activo"
          )
          .order(
            "nombre",
            {
              ascending: true,
            }
          );

        if (puntosError) {
          throw puntosError;
        }

        setPuntosVenta(
          (data ?? []) as PuntoVenta[]
        );
      } catch (err) {
        console.error(
          "Error obteniendo puntos de venta:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar los puntos de venta."
        );
      }
    }, []);

  // =========================================================
  // CARGA INICIAL
  // =========================================================

  useEffect(() => {
    if (
      userLoading ||
      role !== "admin"
    ) {
      return;
    }

    fetchUsers();
    fetchPuntosVenta();
  }, [
    userLoading,
    role,
    fetchUsers,
    fetchPuntosVenta,
  ]);

  // =========================================================
  // SUPERVISORES
  // =========================================================

  const supervisors =
    useMemo(() => {
      return usersList.filter(
        (currentUser) =>
          currentUser.role ===
            "supervisor" &&
          currentUser.activo
      );
    }, [usersList]);

  // =========================================================
  // RESUMEN
  // =========================================================

  const activeUsers =
    useMemo(
      () =>
        usersList.filter(
          (currentUser) =>
            currentUser.activo
        ),
      [usersList]
    );

  const inactiveUsers =
    useMemo(
      () =>
        usersList.filter(
          (currentUser) =>
            !currentUser.activo
        ),
      [usersList]
    );

  // =========================================================
  // FILTROS
  // =========================================================

  const filteredUsers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return usersList.filter(
        (currentUser) => {
          const matchesSearch =
            !normalizedSearch ||
            (
              currentUser.full_name ??
              ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            currentUser.email
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesRole =
            roleFilter ===
              "todos" ||
            currentUser.role ===
              roleFilter;

          const matchesStatus =
            statusFilter ===
              "todos" ||
            (
              statusFilter ===
                "activos" &&
              currentUser.activo
            ) ||
            (
              statusFilter ===
                "inactivos" &&
              !currentUser.activo
            );

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        }
      );
    }, [
      usersList,
      search,
      roleFilter,
      statusFilter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredUsers.length /
          PAGE_SIZE
      )
    );

  const paginatedUsers =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredUsers.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      filteredUsers,
      page,
    ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    roleFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (
      page > totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    page,
    totalPages,
  ]);

  // =========================================================
  // FORMULARIO
  // =========================================================

  function updateForm(
    event:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLSelectElement>
  ) {
    const {
      name,
      value,
    } = event.target;

    setError("");

    setForm(
      (current) => {
        if (
          name ===
            "role" &&
          value !==
            "vendedor"
        ) {
          return {
            ...current,
            role:
              value as Role,
            punto_venta_id:
              "",
          };
        }

        return {
          ...current,
          [name]: value,
        };
      }
    );
  }

  function openCreateModal() {
    setForm(
      INITIAL_FORM
    );

    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    setModalOpen(false);

    setForm(
      INITIAL_FORM
    );

    setError("");
  }

  // =========================================================
  // CREAR USUARIO
  // =========================================================

  async function createUser(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !form.full_name.trim()
    ) {
      setError(
        "Ingresá el nombre del usuario."
      );
      return;
    }

    if (
      !form.email.trim()
    ) {
      setError(
        "Ingresá el correo electrónico."
      );
      return;
    }

    if (
      form.password.length <
      6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (
      form.role ===
        "vendedor" &&
      !form.punto_venta_id
    ) {
      setError(
        "Seleccioná el punto de venta del vendedor."
      );
      return;
    }

    // =======================================================
    // DETECTAR USUARIO EXISTENTE
    // =======================================================

    const normalizedEmail =
      form.email
        .trim()
        .toLowerCase();

    const existingUser =
      usersList.find(
        (currentUser) =>
          currentUser.email
            .trim()
            .toLowerCase() ===
          normalizedEmail
      );

    if (existingUser) {
      if (
        !existingUser.activo
      ) {
        setError(
          `El usuario ${existingUser.email} ya existe pero está inactivo. No es necesario crearlo nuevamente: podés reactivarlo desde el listado de usuarios inactivos.`
        );
      } else {
        setError(
          `Ya existe un usuario activo con el correo ${existingUser.email}.`
        );
      }

      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/create-user",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  ...form,

                  email:
                    form.email.trim(),

                  full_name:
                    form.full_name.trim(),
                }
              ),
          }
        );

      const responseData =
        await response
          .json()
          .catch(() => ({
            error:
              "El servidor devolvió una respuesta inválida.",
          }));

      if (
        !response.ok
      ) {
        throw new Error(
          responseData.error ||
            "No se pudo crear el usuario."
        );
      }

      await fetchUsers();

      setModalOpen(false);

      setForm(
        INITIAL_FORM
      );

      setMessage(
        "Usuario creado correctamente."
      );
    } catch (err) {
      console.error(
        "Error creando usuario:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear el usuario."
      );
    } finally {
      setCreating(false);
    }
  }

  // =========================================================
  // ACTUALIZAR ROL
  // =========================================================

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
        punto_venta_id?: null;
      } = {
        role: newRole,
      };

      if (
        newRole !==
        "vendedor"
      ) {
        changes.supervisor_id =
          null;

        changes.punto_venta_id =
          null;
      }

      const {
        error: updateError,
      } = await supabase
        .from("profiles")
        .update(changes)
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      await fetchUsers();

      setMessage(
        "Rol actualizado correctamente."
      );
    } catch (err) {
      console.error(
        "Error actualizando rol:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el rol."
      );
    } finally {
      setSavingId(null);
    }
  }

  // =========================================================
  // ACTUALIZAR SUPERVISOR
  // =========================================================

  async function updateSupervisor(
    userId: string,
    supervisorId: string
  ) {
    try {
      setSavingId(userId);
      setError("");
      setMessage("");

      const {
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          supervisor_id:
            supervisorId ||
            null,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      await fetchUsers();

      setMessage(
        "Supervisor actualizado correctamente."
      );
    } catch (err) {
      console.error(
        "Error actualizando supervisor:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el supervisor."
      );
    } finally {
      setSavingId(null);
    }
  }

  // =========================================================
  // ACTUALIZAR PUNTO DE VENTA
  // =========================================================

  async function updatePuntoVenta(
    userId: string,
    puntoVentaId: string
  ) {
    try {
      setSavingId(userId);
      setError("");
      setMessage("");

      const {
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          punto_venta_id:
            puntoVentaId ||
            null,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      await fetchUsers();

      setMessage(
        "Punto de venta actualizado correctamente."
      );
    } catch (err) {
      console.error(
        "Error actualizando punto de venta:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el punto de venta."
      );
    } finally {
      setSavingId(null);
    }
  }

  // =========================================================
  // DESACTIVAR / REACTIVAR
  // =========================================================

  async function toggleUserStatus(
    selectedUser: Profile
  ) {
    if (
      selectedUser.id ===
        user?.id &&
      selectedUser.activo
    ) {
      setError(
        "No podés desactivar tu propio usuario."
      );
      return;
    }

    const newStatus =
      !selectedUser.activo;

    const action =
      newStatus
        ? "reactivar"
        : "desactivar";

    const confirmed =
      window.confirm(
        newStatus
          ? `¿Querés reactivar a ${
              selectedUser.full_name ||
              selectedUser.email
            }?\n\nEl usuario volverá a tener acceso al CRM.`
          : `¿Querés desactivar a ${
              selectedUser.full_name ||
              selectedUser.email
            }?\n\nEl usuario conservará todo su historial, pero no podrá acceder al CRM.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setStatusChangingId(
        selectedUser.id
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/toggle-user-status",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  id:
                    selectedUser.id,
                  activo:
                    newStatus,
                }
              ),
          }
        );

      const responseData =
        await response
          .json()
          .catch(() => ({
            error:
              "El servidor devolvió una respuesta inválida.",
          }));

      if (
        !response.ok
      ) {
        throw new Error(
          responseData.error ||
            `No se pudo ${action} el usuario.`
        );
      }

      await fetchUsers();

      setMessage(
        newStatus
          ? "Usuario reactivado correctamente."
          : "Usuario desactivado correctamente."
      );
    } catch (err) {
      console.error(
        "Error cambiando estado del usuario:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible modificar el estado del usuario."
      );
    } finally {
      setStatusChangingId(
        null
      );
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (
    userLoading ||
    role !== "admin"
  ) {
    return (
      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.loadingCard
          }
        >
          Cargando administración
          de usuarios...
        </div>
      </main>
    );
  }

  return (
    <main
      className={styles.page}
    >
      <div
        className={
          styles.container
        }
      >
        {/* HEADER */}

        <header
          className={
            styles.header
          }
        >
          <div>
            <div
              className={
                styles.breadcrumb
              }
            >
              Administración /
              Usuarios
            </div>

            <h1
              className={
                styles.title
              }
            >
              Administración de
              usuarios
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              Gestioná usuarios,
              roles, responsables,
              puntos de venta y
              accesos al CRM.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.primaryButton
            }
            onClick={
              openCreateModal
            }
          >
            <Plus size={17} />
            Nuevo usuario
          </button>
        </header>

        {error && (
          <div
            className={
              styles.errorBox
            }
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className={
              styles.successBox
            }
          >
            {message}
          </div>
        )}

        {/* RESUMEN */}

        <section
          className={
            styles.summaryGrid
          }
        >
          <article
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.summaryIconBlue
              }
            >
              <Users size={20} />
            </div>

            <div>
              <span
                className={
                  styles.summaryLabel
                }
              >
                Usuarios activos
              </span>

              <strong
                className={
                  styles.summaryValue
                }
              >
                {
                  activeUsers.length
                }
              </strong>
            </div>
          </article>

          <article
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.summaryIconPurple
              }
            >
              <ShieldCheck
                size={20}
              />
            </div>

            <div>
              <span
                className={
                  styles.summaryLabel
                }
              >
                Administradores
              </span>

              <strong
                className={
                  styles.summaryValue
                }
              >
                {
                  activeUsers.filter(
                    (
                      currentUser
                    ) =>
                      currentUser.role ===
                      "admin"
                  ).length
                }
              </strong>
            </div>
          </article>

          <article
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.summaryIconGreen
              }
            >
              <UserRound
                size={20}
              />
            </div>

            <div>
              <span
                className={
                  styles.summaryLabel
                }
              >
                Vendedores activos
              </span>

              <strong
                className={
                  styles.summaryValue
                }
              >
                {
                  activeUsers.filter(
                    (
                      currentUser
                    ) =>
                      currentUser.role ===
                      "vendedor"
                  ).length
                }
              </strong>
            </div>
          </article>

          <article
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.summaryIconBlue
              }
            >
              <Ban size={20} />
            </div>

            <div>
              <span
                className={
                  styles.summaryLabel
                }
              >
                Usuarios inactivos
              </span>

              <strong
                className={
                  styles.summaryValue
                }
              >
                {
                  inactiveUsers.length
                }
              </strong>
            </div>
          </article>
        </section>

        {/* FILTROS */}

        <section
          className={
            styles.filtersCard
          }
        >
          <div
            className={
              styles.searchField
            }
          >
            <label
              className={
                styles.label
              }
            >
              Buscar usuario
            </label>

            <div
              className={
                styles.inputWithIcon
              }
            >
              <Search size={17} />

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Nombre o correo electrónico"
              />
            </div>
          </div>

          <div
            className={
              styles.filterField
            }
          >
            <label
              className={
                styles.label
              }
            >
              Rol
            </label>

            <select
              value={
                roleFilter
              }
              onChange={(
                event
              ) =>
                setRoleFilter(
                  event.target
                    .value as
                    | "todos"
                    | Role
                )
              }
              className={
                styles.select
              }
            >
              <option value="todos">
                Todos los roles
              </option>

              {ROLES.map(
                (
                  roleOption
                ) => (
                  <option
                    key={
                      roleOption.value
                    }
                    value={
                      roleOption.value
                    }
                  >
                    {
                      roleOption.label
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div
            className={
              styles.filterField
            }
          >
            <label
              className={
                styles.label
              }
            >
              Estado
            </label>

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
              className={
                styles.select
              }
            >
              <option value="activos">
                Activos
              </option>

              <option value="inactivos">
                Inactivos
              </option>

              <option value="todos">
                Todos
              </option>
            </select>
          </div>
        </section>

        <div
          className={
            styles.resultsSummary
          }
        >
          Mostrando{" "}
          <strong>
            {
              filteredUsers.length
            }
          </strong>{" "}
          usuario
          {filteredUsers.length ===
          1
            ? ""
            : "s"}
        </div>

        {/* TABLA */}

        <section
          className={
            styles.tableCard
          }
        >
          {loadingUsers ? (
            <div
              className={
                styles.emptyState
              }
            >
              Cargando usuarios...
            </div>
          ) : paginatedUsers.length ===
            0 ? (
            <div
              className={
                styles.emptyState
              }
            >
              <strong>
                No se encontraron
                usuarios.
              </strong>

              <span>
                Modificá los filtros
                o registrá un usuario
                nuevo.
              </span>
            </div>
          ) : (
            <div
              className={
                styles.tableWrapper
              }
            >
              <table
                className={
                  styles.table
                }
              >
                <thead>
                  <tr>
                    <th>
                      Usuario
                    </th>

                    <th>
                      Datos personales
                    </th>

                    <th>Rol</th>

                    <th>
                      Supervisor
                    </th>

                    <th>
                      Punto de venta
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map(
                    (
                      currentUser
                    ) => (
                      <tr
                        key={
                          currentUser.id
                        }
                      >
                        <td>
                          <div
                            className={
                              styles.userCell
                            }
                          >
                            <div
                              className={
                                styles.avatar
                              }
                            >
                              {currentUser.avatar_url ? (
                                <img
                                  src={
                                    currentUser.avatar_url
                                  }
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

                            <div
                              className={
                                styles.userData
                              }
                            >
                              <strong>
                                {currentUser.full_name ||
                                  "Sin nombre"}
                              </strong>

                              <span>
                                <Mail
                                  size={
                                    12
                                  }
                                />

                                {
                                  currentUser.email
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div
                            className={
                              styles.personalData
                            }
                          >
                            <span>
                              <strong>
                                Sexo:
                              </strong>{" "}
                              {currentUser.sexo ||
                                "Sin informar"}
                            </span>

                            <span>
                              <strong>
                                Nacimiento:
                              </strong>{" "}
                              {formatDate(
                                currentUser.fecha_nacimiento
                              )}
                            </span>
                          </div>
                        </td>

                        {/* ROL */}

                        <td>
                          <select
                            value={
                              currentUser.role ||
                              "vendedor"
                            }
                            onChange={(
                              event
                            ) =>
                              updateRole(
                                currentUser.id,
                                event
                                  .target
                                  .value as Role
                              )
                            }
                            disabled={
                              savingId ===
                                currentUser.id ||
                              !currentUser.activo
                            }
                            className={
                              styles.tableSelect
                            }
                          >
                            {ROLES.map(
                              (
                                roleOption
                              ) => (
                                <option
                                  key={
                                    roleOption.value
                                  }
                                  value={
                                    roleOption.value
                                  }
                                >
                                  {
                                    roleOption.label
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <span
                            className={
                              styles[
                                `role_${
                                  currentUser.role ||
                                  "vendedor"
                                }`
                              ]
                            }
                          >
                            {getRoleLabel(
                              currentUser.role
                            )}
                          </span>
                        </td>

                        {/* SUPERVISOR */}

                        <td>
                          {currentUser.role ===
                          "vendedor" ? (
                            <select
                              value={
                                currentUser.supervisor_id ||
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateSupervisor(
                                  currentUser.id,
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                savingId ===
                                  currentUser.id ||
                                !currentUser.activo
                              }
                              className={
                                styles.tableSelect
                              }
                            >
                              <option value="">
                                Sin asignar
                              </option>

                              {supervisors
                                .filter(
                                  (
                                    supervisor
                                  ) =>
                                    supervisor.id !==
                                    currentUser.id
                                )
                                .map(
                                  (
                                    supervisor
                                  ) => (
                                    <option
                                      key={
                                        supervisor.id
                                      }
                                      value={
                                        supervisor.id
                                      }
                                    >
                                      {supervisor.full_name ||
                                        supervisor.email}
                                    </option>
                                  )
                                )}
                            </select>
                          ) : (
                            <span
                              className={
                                styles.notApplicable
                              }
                            >
                              No corresponde
                            </span>
                          )}
                        </td>

                        {/* PDV */}

                        <td>
                          {currentUser.role ===
                          "vendedor" ? (
                            <select
                              value={
                                currentUser.punto_venta_id ||
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updatePuntoVenta(
                                  currentUser.id,
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                savingId ===
                                  currentUser.id ||
                                !currentUser.activo
                              }
                              className={
                                styles.tableSelect
                              }
                            >
                              <option value="">
                                Sin asignar
                              </option>

                              {puntosVenta
                                .filter(
                                  (
                                    punto
                                  ) =>
                                    punto.activo ||
                                    punto.id ===
                                      currentUser.punto_venta_id
                                )
                                .map(
                                  (
                                    punto
                                  ) => (
                                    <option
                                      key={
                                        punto.id
                                      }
                                      value={
                                        punto.id
                                      }
                                    >
                                      {
                                        punto.nombre
                                      }
                                      {!punto.activo
                                        ? " (Inactivo)"
                                        : ""}
                                    </option>
                                  )
                                )}
                            </select>
                          ) : (
                            <span
                              className={
                                styles.notApplicable
                              }
                            >
                              No corresponde
                            </span>
                          )}
                        </td>

                        {/* ESTADO */}

                        <td>
                          {currentUser.activo ? (
                            <span>
                              <CheckCircle2
                                size={
                                  14
                                }
                              />{" "}
                              Activo
                            </span>
                          ) : (
                            <span>
                              <Ban
                                size={
                                  14
                                }
                              />{" "}
                              Inactivo
                            </span>
                          )}
                        </td>

                        {/* ACCIONES */}

                        <td>
                          <div
                            className={
                              styles.actions
                            }
                          >
                            <button
                              type="button"
                              className={
                                currentUser.activo
                                  ? styles.deleteButton
                                  : styles.cancelButton
                              }
                              onClick={() =>
                                toggleUserStatus(
                                  currentUser
                                )
                              }
                              disabled={
                                statusChangingId ===
                                  currentUser.id ||
                                (
                                  currentUser.id ===
                                    user?.id &&
                                  currentUser.activo
                                )
                              }
                            >
                              {currentUser.activo ? (
                                <Ban
                                  size={
                                    14
                                  }
                                />
                              ) : (
                                <RotateCcw
                                  size={
                                    14
                                  }
                                />
                              )}

                              {statusChangingId ===
                              currentUser.id
                                ? "Procesando..."
                                : currentUser.activo
                                ? "Desactivar"
                                : "Reactivar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PAGINACIÓN */}

        <div
          className={
            styles.pagination
          }
        >
          <span
            className={
              styles.paginationInfo
            }
          >
            Página {page} de{" "}
            {totalPages}
          </span>

          <div
            className={
              styles.paginationButtons
            }
          >
            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
              }
              disabled={
                page === 1
              }
              className={
                styles.paginationButton
              }
            >
              <ChevronLeft
                size={16}
              />
              Anterior
            </button>

            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                )
              }
              disabled={
                page ===
                totalPages
              }
              className={
                styles.paginationButton
              }
            >
              Siguiente
              <ChevronRight
                size={16}
              />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}

      {modalOpen && (
        <div
          className={
            styles.modalOverlay
          }
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <div
            className={
              styles.modal
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <div
                  className={
                    styles.modalIcon
                  }
                >
                  <UserRound
                    size={22}
                  />
                </div>

                <h2>
                  Nuevo usuario
                </h2>

                <p>
                  Registrá el acceso,
                  asigná el rol
                  inicial y, para
                  vendedores, su
                  punto de venta.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  closeCreateModal
                }
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                createUser
              }
            >
              <div
                className={
                  styles.formGrid
                }
              >
                <div
                  className={
                    styles.fullField
                  }
                >
                  <label
                    className={
                      styles.label
                    }
                  >
                    Nombre completo *
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={
                      form.full_name
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      styles.input
                    }
                    placeholder="Ej. Sofía Martínez"
                    disabled={
                      creating
                    }
                    autoFocus
                  />
                </div>

                <div
                  className={
                    styles.fullField
                  }
                >
                  <label
                    className={
                      styles.label
                    }
                  >
                    Correo electrónico
                    *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      form.email
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      styles.input
                    }
                    placeholder="usuario@empresa.com"
                    disabled={
                      creating
                    }
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    className={
                      styles.label
                    }
                  >
                    Contraseña inicial
                    *
                  </label>

                  <input
                    type="password"
                    name="password"
                    value={
                      form.password
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      styles.input
                    }
                    placeholder="Mínimo 6 caracteres"
                    disabled={
                      creating
                    }
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    className={
                      styles.label
                    }
                  >
                    Rol inicial *
                  </label>

                  <select
                    name="role"
                    value={
                      form.role
                    }
                    onChange={
                      updateForm
                    }
                    className={
                      styles.select
                    }
                    disabled={
                      creating
                    }
                  >
                    {ROLES.map(
                      (
                        roleOption
                      ) => (
                        <option
                          key={
                            roleOption.value
                          }
                          value={
                            roleOption.value
                          }
                        >
                          {
                            roleOption.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {form.role ===
                  "vendedor" && (
                  <div
                    className={
                      styles.fullField
                    }
                  >
                    <label
                      className={
                        styles.label
                      }
                    >
                      Punto de venta *
                    </label>

                    <select
                      name="punto_venta_id"
                      value={
                        form.punto_venta_id
                      }
                      onChange={
                        updateForm
                      }
                      className={
                        styles.select
                      }
                      disabled={
                        creating
                      }
                      required
                    >
                      <option value="">
                        Seleccionar punto
                        de venta
                      </option>

                      {puntosVenta
                        .filter(
                          (
                            punto
                          ) =>
                            punto.activo
                        )
                        .map(
                          (
                            punto
                          ) => (
                            <option
                              key={
                                punto.id
                              }
                              value={
                                punto.id
                              }
                            >
                              {
                                punto.nombre
                              }
                            </option>
                          )
                        )}
                    </select>
                  </div>
                )}
              </div>

              {error &&
                modalOpen && (
                  <div
                    className={
                      styles.modalError
                    }
                  >
                    {error}
                  </div>
                )}

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    closeCreateModal
                  }
                  disabled={
                    creating
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={
                    styles.primaryButton
                  }
                  disabled={
                    creating
                  }
                >
                  {creating
                    ? "Creando usuario..."
                    : (
                      <>
                        <Plus
                          size={
                            17
                          }
                        />
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