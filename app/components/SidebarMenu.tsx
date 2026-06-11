"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { useState, useRef, useEffect, CSSProperties } from "react";

const menuSections = [
  {
    title: "📊 Reportes Gerenciales",
    key: "informes_gerencial",
    roles: ["admin", "gerente"],
    items: [
      { href: "/ventas-region", label: "1. Ventas por Región" },
      { href: "/ventas-supervision", label: "2. Ventas por Supervision" },
      { href: "/ventas-vendedor", label: "3. Ventas por Vendedor" },

    ],
  },
  {
    title: "📊 Reportes Supervisor",
    key: "informes_supervisor",
    roles: ["supervisor"],
    items: [
      { href: "/ventas-region", label: "1. Ventas por Región" },
      { href: "/cobertura-historica", label: "2. Cobertura Histórica" },
      { href: "/cobertura-region", label: "3. Cobertura por Región" },
    ],
  },
  {
    title: "📊 Reportes Vendedor",
    key: "informes_vendedor",
    roles: ["vendedor"],
    items: [
      { href: "/ventas-region", label: "1. Ventas por Región" },
      { href: "/cobertura-historica", label: "2. Cobertura Histórica" },
      { href: "/cobertura-region", label: "3. Cobertura por Región" },
    ],
  },
  {
    title: "🤝 CRM",
    key: "crm",
    roles: ["admin", "gerente", "supervisor", "vendedor"],
    items: [
      { href: "/facturacion", label: "1. Facturación" },
    ],
  },
  {
    title: "⚙️ Administración",
    key: "admin",
    roles: ["admin"],
    items: [{ href: "/users", label: "Usuarios" }],
  },
];

export function SidebarMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, role } = useUser();

  const userRole = role ?? "vendedor";

const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
  const initial: Record<string, boolean> = {};

  menuSections.forEach((s) => {
    initial[s.key] = true;
  });

  return initial;
});


  const [openUserMenu, setOpenUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
  dropdownRef.current &&
  !dropdownRef.current.contains(e.target as Node)
) {
  setOpenUserMenu(false);
}
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const iniciales = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const visibleSections = menuSections.filter((section) =>
    section.roles.includes(userRole)
  );

  return (
    <div style={container}>
      
      {/* MENU */}
      <div style={menuWrapper}>
        {visibleSections.map((section) => {
          const isOpen = openSections[section.key];

          const isSectionActive = section.items.some(
            (item) => item.href === pathname
          );

          return (
            <div key={section.key} style={sectionBox}>
              
              {/* HEADER */}
              <div
                onClick={() => toggleSection(section.key)}
                style={{
                  ...sectionHeader,
                  ...(isSectionActive ? activeSection : {}),
                }}
              >
                <span>{section.title}</span>
                <span style={{ fontSize: 12 }}>
                  {isOpen ? "▼" : "▶"}
                </span>
              </div>

              {/* ITEMS */}
              {isOpen && (
                <div style={itemsContainer}>
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          ...itemStyle,
                          ...(isActive ? activeItem : {}),
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* USER */}
      <div ref={dropdownRef} style={userContainer}>
        
        <div
          onClick={() => setOpenUserMenu(!openUserMenu)}
          style={userBox}
        >
          <div style={avatar}>
            {profile?.avatar_url ? (
              <img
  src={profile.avatar_url}
  alt="Avatar del usuario"
  style={avatarImg}
/>
            ) : (
              iniciales
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={userName}>{profile?.full_name}</div>
            <div style={userEmail}>{user?.email}</div>
            <div style={userRoleStyle}>{userRole.toUpperCase()}</div>
          </div>

          <span style={{ fontSize: 12 }}>
            {openUserMenu ? "▲" : "▼"}
          </span>
        </div>

        {openUserMenu && (
          <div style={dropdown}>
            <button onClick={() => router.push("/perfil")} style={dropdownItem}>
              👤 Mi perfil
            </button>

            <div style={divider} />

            <button onClick={handleLogout} style={{ ...dropdownItem, color: "red" }}>
              🚪 Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* 🎨 ESTILOS */

const container: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

const menuWrapper: CSSProperties = {
  flex: 1,
  padding: "10px",
};

const sectionBox: CSSProperties = {
  marginBottom: "20px",
};

const sectionHeader: CSSProperties = {
  padding: "10px 12px",
  fontSize: "15px",
  fontWeight: "bold",
  color: "#9ca3af",
  cursor: "pointer",
  borderRadius: "6px",
  display: "flex",
  justifyContent: "space-between",
};

const activeSection: CSSProperties = {
  background: "#1f2937",
  color: "white",
};

const itemsContainer: CSSProperties = {
  marginTop: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const itemStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "6px",
  fontSize: "16px",
  color: "#d1d5db",
  textDecoration: "none",
};

const activeItem: CSSProperties = {
  background: "#374151",
  color: "white",
};

const userContainer: CSSProperties   = {
  borderTop: "1px solid #1f2937",
  padding: "12px",
  position: "relative",
};

const userBox: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  cursor: "pointer",
};

const avatar: CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "#4f46e5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontWeight: "bold",
};

const avatarImg: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
};

const userName: CSSProperties = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "white",
};

const userEmail = {
  fontSize: "12px",
  color: "#9ca3af",
};

const userRoleStyle: CSSProperties = {
  fontSize: "11px",
  color: "#6b7280",
};

const dropdown: CSSProperties = {
  position: "absolute",
  bottom: "60px",
  left: "10px",
  right: "10px",
  background: "#111827",
  borderRadius: "10px",
  overflow: "hidden",
};

const dropdownItem: CSSProperties = {
  width: "100%",
  padding: "10px",
  background: "transparent",
  border: "none",
  color: "white",
  textAlign: "left",
  cursor: "pointer",
};

const divider = {
  height: "1px",
  background: "#1f2937",
};