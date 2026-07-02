"use client";

import { memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuIcon, LogOutIcon, Settings, PanelLeft } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

// Componente para el logo (reutilizado)
const EmpresaLogo = memo(({ 
  logo, 
  nombre, 
  temaIcon, 
  size = "default",
}: { 
  logo: string | null; 
  nombre: string; 
  temaIcon: string;
  size?: "small" | "default";
}) => {
  const { coloresActuales } = useTheme();
  
  const logoSize = size === "small" ? "h-8 w-8" : "h-10 w-10";
  const containerSize = size === "small" ? "p-1.5" : "p-2.5";

  if (logo) {
    return (
      <div className={`${logoSize} ${containerSize} rounded-2xl bg-card shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0`}>
        <img
          src={logo}
          alt={`Logo ${nombre}`}
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${containerSize} rounded-2xl bg-primary shadow-sm flex-shrink-0 flex items-center justify-center`}>
      <span className={`${size === "small" ? "text-base" : "text-xl"} filter drop-shadow-sm text-primary-foreground`}>
        {temaIcon}
      </span>
    </div>
  );
});

EmpresaLogo.displayName = "EmpresaLogo";

interface MobileHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  empresaLogo: string | null;
  empresaNombre: string;
  temaIcon: string;
  tipoNegocio?: string;
  navItems: React.ReactNode;
  pageTitle: string;
  userName: string;
  userInitials: string;
  userEmail?: string;
  userRole: string;
  onLogout: () => void;
  showConfig: boolean;
}

export const MobileHeader = memo(({
  isSidebarOpen,
  setIsSidebarOpen,
  empresaLogo,
  empresaNombre,
  temaIcon,
  tipoNegocio,
  navItems,
  pageTitle,
  userName,
  userInitials,
  userEmail,
  userRole,
  onLogout,
  showConfig,
}: MobileHeaderProps) => {
  const { coloresActuales } = useTheme();

  return (
    <header className={`lg:hidden sticky top-0 z-40 flex h-16 items-center gap-4 border-b ${coloresActuales.border} ${coloresActuales.surface} px-4 sm:px-6 shadow-sm min-w-0`}>
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <MenuIcon className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className={`flex flex-col ${coloresActuales.surface} p-0 w-80`}>
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>
          <div className={`flex items-center h-16 px-6 border-b ${coloresActuales.border}`}>
            <Link href="/dashboard" className="flex items-center space-x-3 min-w-0 w-full">
              <EmpresaLogo 
                logo={empresaLogo} 
                nombre={empresaNombre} 
                temaIcon={temaIcon}
                size="small"
              />
              <div className="min-w-0 flex-1">
                <h1 className={`text-lg font-bold ${coloresActuales.text} truncate`}>
                  {empresaNombre}
                </h1>
                <p className={`text-xs ${coloresActuales.textSecondary} capitalize truncate`}>
                  {tipoNegocio?.replace('_', ' ').toLowerCase() || 'sistema pos'}
                </p>
              </div>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-3">
              {navItems}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1 min-w-0">
        <h1 className="text-xl font-bold text-foreground truncate">
          {pageTitle}
        </h1>
      </div>

      <ThemeToggle variant="compact" size="sm" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder-user.jpg" alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {showConfig && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/configuracion" className="flex w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onLogout}>
            <LogOutIcon className="h-4 w-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
});

MobileHeader.displayName = "MobileHeader";

interface DesktopHeaderProps {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  pageTitle: string;
  userName: string;
  userInitials: string;
  userEmail?: string;
  userRole: string;
  empresaNombre: string;
  onLogout: () => void;
  showConfig: boolean;
}

export const DesktopHeader = memo(({
  sidebarCollapsed,
  toggleSidebar,
  pageTitle,
  userName,
  userInitials,
  userEmail,
  userRole,
  empresaNombre,
  onLogout,
  showConfig,
}: DesktopHeaderProps) => {
  const { coloresActuales } = useTheme();

  return (
    <header className={`hidden lg:flex sticky top-0 z-30 h-20 items-center gap-4 border-b ${coloresActuales.border} ${coloresActuales.surface} px-6 shadow-sm min-w-0`}>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSidebar}
        className={`shrink-0 transition-colors ${coloresActuales.surface} hover:bg-card/10 ${coloresActuales.border}`}
        title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        <PanelLeft className={cn(
          "h-5 w-5 transition-transform duration-200",
          sidebarCollapsed ? "rotate-180" : ""
        )} />
      </Button>

      <div className="w-full flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-foreground truncate">
          {pageTitle}
        </h1>
      </div>

      <ThemeToggle variant="dropdown" size="default" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full overflow-hidden bg-card hover:bg-card border-border backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow flex-shrink-0"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder-user.jpg" alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="backdrop-blur-xl bg-card border-border shadow-2xl">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              <p className="text-xs text-muted-foreground">Rol: {userRole}</p>
              <p className="text-xs text-muted-foreground truncate">Empresa: {empresaNombre}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {showConfig && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/configuracion" className="flex w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onLogout}>
            <LogOutIcon className="h-4 w-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
});

DesktopHeader.displayName = "DesktopHeader";