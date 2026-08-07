"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";


import {
  useEffect,
  useMemo,
  useRef,
  useState, type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";

import styles from "./SidebarMenu.module.css";

type UserRole = "admin" | "gerente" | "supervisor" | "vendedor";

type MenuItem = {
  href: string;
  label: string;
};

type MenuSection = {
  title: string;
  key: string;
  roles: UserRole[];
  icon: ReactNode;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Reportes Gerenciales",
    key: "informes_gerencial",
    roles: ["admin", "gerente"],
    icon: <BarChart3 size={18} />,
    items: [
      {
        href: "/reportes",
        label: "Resumen carga de prospectos",
      },
    ],
  },
  {
    title: "Reportes Supervisor",
    key: "informes_supervisor",
    roles: ["supervisor"],
    icon: <BarChart3 size={18} />,
    items: [
      {
        href: "/clientes",
        label: "Ventas por región",
      },
    ],
  },
  {
    title: "Reportes Vendedor",
    key: "informes_vendedor",
    roles: ["vendedor"],
    icon: <BarChart3 size={18} />,
    items: [
      {
        href: "/clientes",
        label: "Mis clientes",
      },
    ],
  },
  {
    title: "CRM",
    key: "crm",
    roles: ["admin", "gerente", "supervisor", "vendedor"],
    icon: <BriefcaseBusiness size={18} />,
    items: [
      {
        href: "/clientes/nuevo",
        label: "Carga de clientes",
      },
    ],
  },
  {
    title: "Configuración",
    key: "configuracion",
    roles: ["admin"],
    icon: <Settings size={18} />,
    items: [
      {
        href: "/configuracion/empresas",
        label: "Empresas",
      },
      {
        href: "/configuracion/productos",
        label: "Productos",
      },
      {
        href: "/configuracion/intereses/preguntas",
        label: "Preguntas generales",
      },
    ],
  },
  {
    title: "Administración",
    key: "admin",
    roles: ["admin"],
    icon: <ShieldCheck size={18} />,
    items: [
      {
        href: "/users",
        label: "Usuarios",
      },
    ],
  },
];

function pathIsActive(pathname: string, href: string) {
  if (href === "/inicio") {
    return pathname === "/inicio";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarMenu() {
  const router = useRouter();
  const pathname = usePathname();

  const { user, profile, role } = useUser();

  const userRole = (role ?? "vendedor") as UserRole;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleSections = useMemo(() => {
    return menuSections.filter((section) =>
      section.roles.includes(userRole)
    );
  }, [userRole]);

  const [openSections, setOpenSections] = useState<
    Record<string, boolean>
  >(() => {
    return Object.fromEntries(
      menuSections.map((section) => [section.key, true])
    );
  });

  /*
   * Cuando cambia la ruta cerramos automáticamente el drawer
   * móvil y el menú del usuario.
   */
  useEffect(() => {
    setMobileOpen(false);
    setOpenUserMenu(false);
  }, [pathname]);

  /*
   * Bloqueamos el scroll de la página cuando el menú móvil
   * está abierto.
   */
  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /*
   * Cerrar con Escape.
   */
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setOpenUserMenu(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /*
   * Cerrar el desplegable del usuario al hacer clic afuera.
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpenUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * Abrimos automáticamente una sección que contiene
   * la ruta activa.
   */
  useEffect(() => {
    const activeSection = visibleSections.find((section) =>
      section.items.some((item) =>
        pathIsActive(pathname, item.href)
      )
    );

    if (!activeSection) {
      return;
    }

    setOpenSections((current) => ({
      ...current,
      [activeSection.key]: true,
    }));
  }, [pathname, visibleSections]);

  function toggleSection(key: string) {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error cerrando sesión:", error);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Error inesperado cerrando sesión:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName =
    profile?.full_name ||
    profile?.nombre ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      {/* BOTÓN MÓVIL */}

      <button
        type="button"
        className={styles.mobileTrigger}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={mobileOpen}
      >
        <Menu size={22} />
      </button>

      {/* FONDO OSCURO EN MÓVIL */}

      {mobileOpen && (
        <button
          type="button"
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={[
          styles.sidebar,
          mobileOpen ? styles.sidebarMobileOpen : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* CABECERA */}

        <div className={styles.sidebarHeader}>
          <Link
            href="/inicio"
            className={styles.brand}
            title="Página principal"
            aria-label="Ir a la página principal"
          >
            <div className={styles.brandLogo}>E</div>

            <div className={styles.brandText}>
              <strong>EAYA</strong>
              <span>CRM Comercial</span>
            </div>
          </Link>

          <button
            type="button"
            className={styles.mobileClose}
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={21} />
          </button>
        </div>

        {/* INICIO */}

        <nav className={styles.navigation}>
          <Link
            href="/inicio"
            className={[
              styles.homeLink,
              pathname === "/inicio" ? styles.homeLinkActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title="Página principal"
          >
            <span className={styles.homeIcon}>
              <Home size={18} />
            </span>

            <span className={styles.collapsibleText}>
              Página principal
            </span>
          </Link>

          <div className={styles.menuDivider} />

          {/* SECCIONES */}

          <div className={styles.menuWrapper}>
            {visibleSections.map((section) => {
              const isOpen = openSections[section.key];

              const isSectionActive = section.items.some(
                (item) => pathIsActive(pathname, item.href)
              );

              return (
                <section
                  key={section.key}
                  className={styles.sectionBox}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    className={[
                      styles.sectionHeader,
                      isSectionActive
                        ? styles.sectionHeaderActive
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-expanded={isOpen}
                    title={section.title}
                  >
                    <span className={styles.sectionTitleContent}>
                      <span className={styles.sectionIcon}>
                        {section.icon}
                      </span>

                      <span className={styles.collapsibleText}>
                        {section.title}
                      </span>
                    </span>

                    <span className={styles.sectionChevron}>
                      {isOpen ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className={styles.itemsContainer}>
                      {section.items.map((item) => {
                        const isActive = pathIsActive(
                          pathname,
                          item.href
                        );

                        return (
                          <Link
  key={item.href}
  href={item.href}
  className={[
    styles.item,
    isActive ? styles.itemActive : "",
  ]
    .filter(Boolean)
    .join(" ")}
  title={item.label}
>
  <span className={styles.itemIndicator} />

  <span className={styles.collapsibleText}>
    {item.label}
  </span>
</Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </nav>

        {/* USUARIO */}

        <div
          ref={dropdownRef}
          className={styles.userContainer}
        >
          {openUserMenu && (
            <div className={styles.userDropdown}>
              <button
                type="button"
                onClick={() => router.push("/perfil")}
                className={styles.dropdownItem}
              >
                <User size={17} />
                <span>Mi perfil</span>
              </button>

              <div className={styles.dropdownDivider} />

              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutItem}
                disabled={loggingOut}
              >
                <LogOut size={17} />

                <span>
                  {loggingOut
                    ? "Cerrando sesión..."
                    : "Cerrar sesión"}
                </span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              setOpenUserMenu((current) => !current)
            }
            className={styles.userBox}
            aria-expanded={openUserMenu}
          >
            <div className={styles.avatar}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className={styles.avatarImage}
                />
              ) : (
                initials
              )}
            </div>

            <div className={styles.userInformation}>
              <strong className={styles.userName}>
                {displayName}
              </strong>

              <span className={styles.userEmail}>
                {user?.email}
              </span>

              <span className={styles.userRole}>
                {userRole}
              </span>
            </div>

            <ChevronDown
              size={16}
              className={[
                styles.userChevron,
                openUserMenu
                  ? styles.userChevronOpened
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </button>
        </div>

        {/* COLAPSAR EN ESCRITORIO */}


      </aside>
    </>
  );
}