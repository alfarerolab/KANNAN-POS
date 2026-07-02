"use client";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogOutIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface NavItemProps {
  href: string;
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  sidebarCollapsed: boolean;
}

// ✅ SIN MEMO - La comparación de pathname es más rápida que memo
export const NavItem = ({
  href,
  title,
  icon: Icon,
  isActive,
  sidebarCollapsed,
}: NavItemProps) => {
  const { coloresActuales } = useTheme();

  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out",
        isActive
          ? `bg-primary text-primary-foreground shadow-sm`
          : `${coloresActuales.text} hover:bg-muted active:scale-[0.98]`,
        sidebarCollapsed ? "justify-center px-2" : ""
      )}
      title={sidebarCollapsed ? title : undefined}
      aria-label={title}
      aria-current={isActive ? "page" : undefined}
    >
      <div className={cn(
        "p-2 rounded-lg transition-all duration-150 ease-out flex-shrink-0",
        isActive
          ? "bg-card/20 text-primary-foreground"
          : `bg-card/10 ${coloresActuales.text} group-hover:bg-card/20 group-hover:scale-110`
      )}>
        <Icon className="h-4 w-4" />
      </div>

      {!sidebarCollapsed && (
        <span className="truncate min-w-0 flex-1">{title}</span>
      )}

      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-foreground rounded-r-full transition-all duration-150 ease-out" />
      )}
    </Link>
  );
};

// ✅ NavItem con submenú colapsable
export interface SubNavItem {
  href: string;
  title: string;
  icon: LucideIcon;
}

interface NavItemWithSubmenuProps {
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  sidebarCollapsed: boolean;
  children: SubNavItem[];
  pathname: string;
}

export const NavItemWithSubmenu = ({
  title,
  icon: Icon,
  isActive,
  sidebarCollapsed,
  children,
  pathname,
}: NavItemWithSubmenuProps) => {
  const { coloresActuales } = useTheme();
  const [expanded, setExpanded] = useState(isActive);

  // Auto-expand when a child is active
  const anyChildActive = children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));

  // biome-ignore lint: auto expand effect
  useState(() => {
    if (anyChildActive) setExpanded(true);
  });

  if (sidebarCollapsed) {
    // When collapsed, show just the parent icon linking to first child
    return (
      <Link
        href={children[0]?.href || "#"}
        prefetch={true}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium transition-all duration-150 ease-out justify-center",
          anyChildActive
            ? `bg-primary text-primary-foreground shadow-sm`
            : `${coloresActuales.text} hover:bg-card/5 active:scale-[0.98]`
        )}
        title={title}
        aria-label={title}
      >
        <div className={cn(
          "p-2 rounded-lg transition-all duration-150 ease-out flex-shrink-0",
          anyChildActive
            ? "bg-card/20 text-primary-foreground"
            : `bg-card/10 ${coloresActuales.text} group-hover:bg-card/20 group-hover:scale-110`
        )}>
          <Icon className="h-4 w-4" />
        </div>
        {anyChildActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-foreground rounded-r-full transition-all duration-150 ease-out" />
        )}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out w-full text-left",
          anyChildActive
            ? `bg-primary text-primary-foreground shadow-sm`
            : `${coloresActuales.text} hover:bg-card/5 active:scale-[0.98]`
        )}
      >
        <div className={cn(
          "p-2 rounded-lg transition-all duration-150 ease-out flex-shrink-0",
          anyChildActive
            ? "bg-card/20 text-primary-foreground"
            : `bg-card/10 ${coloresActuales.text} group-hover:bg-card/20 group-hover:scale-110`
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="truncate min-w-0 flex-1">{title}</span>
        <svg
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-transform duration-200",
            expanded ? "rotate-180" : ""
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {anyChildActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-foreground rounded-r-full transition-all duration-150 ease-out" />
        )}
      </button>

      {/* Sub-items */}
      <div className={cn(
        "overflow-hidden transition-all duration-200 ease-in-out",
        expanded ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
      )}>
        <div className="ml-4 pl-3 border-l border-border space-y-0.5">
          {children.map((child) => {
            const ChildIcon = child.icon;
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                prefetch={true}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                  childActive
                    ? `bg-primary text-primary-foreground shadow-sm`
                    : `${coloresActuales.textSecondary} hover:bg-black/5 dark:hover:bg-card/5 hover:text-foreground dark:hover:text-primary-foreground`
                )}
              >
                <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{child.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ✅ Logo sin memo - las props casi nunca cambian
const EmpresaLogo = ({ 
  logo, 
  nombre, 
  temaIcon, 
  collapsed = false 
}: { 
  logo: string | null; 
  nombre: string; 
  temaIcon: string;
  collapsed?: boolean;
}) => {
  const { coloresActuales } = useTheme();

  if (logo) {
    return (
      <div className="h-10 w-10 p-2.5 rounded-2xl bg-card shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0">
        <img
          src={logo}
          alt={`Logo ${nombre}`}
          className="h-full w-full object-contain"
          onError={(e) => e.currentTarget.style.display = 'none'}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-2xl bg-primary shadow-sm flex-shrink-0 flex items-center justify-center`}>
      <span className="text-xl filter drop-shadow-sm text-primary-foreground">
        {temaIcon}
      </span>
    </div>
  );
};

interface SidebarProps {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  empresaLogo: string | null;
  empresaNombre: string;
  temaIcon: string;
  tipoNegocio?: string;
  navItems: React.ReactNode;
  userName: string;
  userInitials: string;
  userRole: string;
  onLogout: () => void;
}

// ✅ Sidebar SIN memo - Deja que React haga su trabajo
export const Sidebar = ({
  sidebarCollapsed,
  toggleSidebar,
  empresaLogo,
  empresaNombre,
  temaIcon,
  tipoNegocio,
  navItems,
  userName,
  userInitials,
  userRole,
  onLogout,
}: SidebarProps) => {
  const { coloresActuales } = useTheme();
  const tipoNegocioText = tipoNegocio?.replace('_', ' ').toLowerCase() || 'sistema pos';

  return (
    <div className={cn(
      "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-50 transition-all duration-300 ease-in-out",
      sidebarCollapsed ? "lg:w-20" : "lg:w-64"
    )}>
      <div className={`flex-1 flex flex-col min-h-0 ${coloresActuales.surface} ${coloresActuales.border} border-r shadow-2xl overflow-hidden`}>
        
        {/* Header */}
        <div className={`flex items-center h-20 flex-shrink-0 px-4 border-b ${coloresActuales.border} overflow-hidden`}>
          {!sidebarCollapsed ? (
            <Link href="/dashboard" className="flex items-center space-x-3 group min-w-0 w-full" prefetch={true}>
              <EmpresaLogo 
                logo={empresaLogo} 
                nombre={empresaNombre} 
                temaIcon={temaIcon}
              />
              <div className="flex-1 min-w-0">
                <h1 className={`text-base font-bold ${coloresActuales.text} truncate group-hover:opacity-80 transition-opacity`}>
                  {empresaNombre}
                </h1>
                <p className={`text-xs ${coloresActuales.textSecondary} truncate capitalize`}>
                  {tipoNegocioText}
                </p>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center justify-center w-full group" prefetch={true}>
              <EmpresaLogo 
                logo={empresaLogo} 
                nombre={empresaNombre} 
                temaIcon={temaIcon}
                collapsed={true}
              />
            </Link>
          )}
        </div>

        {/* Navegación */}
        <div className="flex-1 flex flex-col overflow-y-auto py-4">
          <nav className="flex-1 space-y-1 px-3">
            {navItems}
          </nav>
        </div>

        {/* Usuario y logout */}
        <div className={`flex-shrink-0 p-4 border-t ${coloresActuales.border} overflow-hidden`}>
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center space-x-3 mb-4 min-w-0">
                <Avatar className="h-10 w-10 ring-2 ring-white/50 flex-shrink-0">
                  <AvatarImage src="/placeholder-user.jpg" alt={userName} />
                  <AvatarFallback className={`bg-primary text-primary-foreground font-semibold`}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${coloresActuales.text} truncate`}>{userName}</p>
                  <p className={`text-xs ${coloresActuales.textSecondary} truncate`}>Rol: {userRole}</p>
                </div>
                <ThemeToggle variant="compact" size="sm" />
              </div>
              <Button
                variant="outline"
                className={`w-full justify-start gap-3 ${coloresActuales.surface} hover:bg-card/10 ${coloresActuales.border} backdrop-blur-sm transition-colors ${coloresActuales.text}`}
                onClick={onLogout}
              >
                <LogOutIcon className="h-4 w-4" />
                <span className="truncate">Cerrar sesión</span>
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-10 w-10 ring-2 ring-white/50">
                <AvatarImage src="/placeholder-user.jpg" alt={userName} />
                <AvatarFallback className={`bg-primary text-primary-foreground font-semibold`}>
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <ThemeToggle variant="compact" size="sm" />
              <Button
                variant="outline"
                size="icon"
                className={`${coloresActuales.surface} hover:bg-card/10 ${coloresActuales.border} backdrop-blur-sm transition-colors`}
                onClick={onLogout}
                title="Cerrar sesión"
              >
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};