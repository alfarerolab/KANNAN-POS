"use client";

import { useState, useEffect, useMemo, useCallback, memo, useTransition } from "react";
import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

// Lazy: el canvas de partículas no bloquea el bundle inicial
const ParticleBackground = dynamic(
  () => import("@/components/ui/particle-background").then((m) => m.ParticleBackground),
  { ssr: false, loading: () => null }
);

import {
  BarChartIcon,
  BoxesIcon,
  CircleDollarSign,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  TagIcon,
  UsersIcon,
  BuildingIcon,
  Users2Icon,
  TruckIcon,
  WarehouseIcon,
  MonitorIcon,
  Calendar,
  Activity,
  Settings,
  Loader2,
  Bell,
  Sparkles,
  CreditCard,
  XCircle,
  RefreshCw,
  UtensilsCrossed,
  Wine,
  GlassWater,
  Pill,
  ChefHat,
  Receipt,
  ClipboardCheck,
  Package,
  AlertTriangle,
  Beer,
  Scissors,
  TrendingDown,
  Percent,
  Clock,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import {
  useConfiguracionEmpresa,
  type ConfiguracionEmpresa,
} from "@/hooks/use-configuracion-empresa";
import type { Rol } from "../../lib/prisma-types";
// Importar componentes separados
import { Sidebar, NavItem, NavItemWithSubmenu, type SubNavItem } from "@/components/dashboard/Sidebar";
import { MobileHeader, DesktopHeader } from "@/components/dashboard/DashboardHeader";

interface NavItemData {
  key: string;
  href: string;
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  children?: SubNavItem[];
}

interface EmpresaHeaderData {
  nombre?: string;
  logo?: string | null;
}

// Función para generar items de navegación
const useNavItems = (
  role: Rol | undefined,
  pathname: string,
  configuracion: ConfiguracionEmpresa | null,
  tieneServicios: boolean,
  tieneCitas: boolean
): NavItemData[] => {
  return useMemo(() => {
    const items: NavItemData[] = [];

    items.push({
      key: 'dashboard',
      href: '/dashboard',
      title: 'Dashboard',
      icon: LayoutDashboardIcon,
      isActive: pathname === '/dashboard',
    });

    if (role === "SUPERADMIN") {
      items.push(
        { key: 'empresas', href: '/dashboard/superadmin/empresas', title: 'Empresas', icon: BuildingIcon, isActive: pathname.startsWith('/dashboard/superadmin/empresas') },
        { key: 'suscripciones', href: '/dashboard/superadmin/suscripciones', title: 'Suscripciones', icon: CircleDollarSign, isActive: pathname.startsWith('/dashboard/superadmin/suscripciones') },
        { key: 'planes', href: '/dashboard/superadmin/planes', title: 'Planes', icon: CreditCard, isActive: pathname.startsWith('/dashboard/superadmin/planes') },
        { key: 'analytics', href: '/dashboard/superadmin/analytics', title: 'Analytics', icon: BarChartIcon, isActive: pathname.startsWith('/dashboard/superadmin/analytics') },
        { key: 'notificaciones', href: '/dashboard/superadmin/notificaciones', title: 'Notificaciones', icon: Bell, isActive: pathname.startsWith('/dashboard/superadmin/notificaciones') },
        { key: 'usuarios-admin', href: '/dashboard/superadmin/usuarios', title: 'Usuarios', icon: Users2Icon, isActive: pathname.startsWith('/dashboard/superadmin/usuarios') }
      );
      return items;
    }

    if (["ADMINISTRADOR", "GERENTE", "EMPLEADO"].includes(role || "")) {
      const mostrarRestaurante =
        configuracion?.tipoNegocio === "RESTAURANTE" ||
        configuracion?.tipoNegocio === "CAFETERIA" ||
        configuracion?.tipoNegocio === "PERSONALIZADO";
        
      const mostrarBar = configuracion?.tipoNegocio === "BAR";

      items.push(
        { key: 'pos', href: '/dashboard/pos', title: 'Punto de Venta', icon: ShoppingCartIcon, isActive: pathname.startsWith('/dashboard/pos') },
        { key: 'productos', href: '/dashboard/productos', title: 'Productos', icon: BoxesIcon, isActive: pathname.startsWith('/dashboard/productos') }
      );

      if (mostrarRestaurante) {
        items.push({
          key: 'restaurante',
          href: '/dashboard/restaurante',
          title: 'Restaurante',
          icon: UtensilsCrossed,
          isActive: pathname.startsWith('/dashboard/restaurante'),
          children: [
            { href: '/dashboard/restaurante', title: 'Mesas (Mesero)', icon: UtensilsCrossed },
            { href: '/dashboard/restaurante/cocina', title: 'Cocina', icon: ChefHat },
            { href: '/dashboard/restaurante/caja', title: 'Caja', icon: Receipt },
          ],
        });
      }
      
      if (mostrarBar) {
        items.push({
          key: 'bar',
          href: '/dashboard/bar',
          title: 'Bar',
          icon: Wine,
          isActive: pathname.startsWith('/dashboard/bar'),
        });
      }

      const mostrarFarmacia =
        configuracion?.tipoNegocio === "FARMACIA";

      if (mostrarFarmacia) {
        items.push({
          key: 'farmacia',
          href: '/dashboard/farmacia',
          title: 'Farmacia',
          icon: Pill,
          isActive: pathname.startsWith('/dashboard/farmacia'),
          children: [
            { href: '/dashboard/farmacia', title: 'Dashboard', icon: Pill },
            { href: '/dashboard/farmacia/vencimientos', title: 'Vencimientos', icon: AlertTriangle },
            { href: '/dashboard/farmacia/lotes', title: 'Lotes', icon: Package },
          ],
        });
      }

      if (tieneServicios) {
        items.push({ key: 'servicios', href: '/dashboard/servicios', title: 'Servicios', icon: Activity, isActive: pathname.startsWith('/dashboard/servicios') });
      }
      if (tieneCitas) {
        items.push({ key: 'citas', href: '/dashboard/citas', title: 'Citas', icon: Calendar, isActive: pathname.startsWith('/dashboard/citas') });
      }

      // Peluquería / Salón de belleza
      const mostrarPeluqueria =
        configuracion?.tipoNegocio === 'PELUQUERIA' ||
        configuracion?.tipoNegocio === 'SALON_BELLEZA';

      if (mostrarPeluqueria && ["ADMINISTRADOR", "GERENTE"].includes(role || "")) {
        items.push({
          key: 'peluqueria',
          href: '/dashboard/peluqueria/comisiones',
          title: 'Gestión de Servicios',
          icon: Scissors,
          isActive: pathname.startsWith('/dashboard/peluqueria'),
          children: [
            { href: '/dashboard/peluqueria/walk-in', title: 'Nuevo Servicio', icon: Sparkles },
            { href: '/dashboard/peluqueria/comandas', title: 'Cuentas Abiertas', icon: Clock },
            { href: '/dashboard/peluqueria/comisiones', title: 'Equipo y Liquidaciones', icon: Percent },
          ],
        });
      }
    } // cierre del if ADMIN/GERENTE/EMPLEADO

    if (["ADMINISTRADOR", "GERENTE"].includes(role || "")) {
      const childrenCaja = [
        { href: '/dashboard/caja', title: 'Movimientos y Turnos', icon: Wallet }
      ];
      
      if (role === "ADMINISTRADOR") {
        childrenCaja.push(
          { href: '/dashboard/cajas', title: 'Cajas Registradoras', icon: BoxesIcon },
          { href: '/dashboard/terminales', title: 'Terminales POS', icon: MonitorIcon }
        );
      } else if (role === "GERENTE") {
        childrenCaja.push(
          { href: '/dashboard/cajas', title: 'Cajas Registradoras', icon: BoxesIcon }
        );
      }

      items.push(
        { 
          key: 'caja-group', 
          href: '/dashboard/caja', 
          title: 'Caja', 
          icon: Wallet, 
          isActive: pathname.startsWith('/dashboard/caja') || pathname.startsWith('/dashboard/cajas') || pathname.startsWith('/dashboard/terminales'),
          children: childrenCaja
        },
        { key: 'categorias', href: '/dashboard/categorias', title: 'Categorías', icon: TagIcon, isActive: pathname.startsWith('/dashboard/categorias') },
        { key: 'ventas', href: '/dashboard/ventas', title: 'Ventas', icon: BarChartIcon, isActive: pathname.startsWith('/dashboard/ventas') },
        { key: 'clientes', href: '/dashboard/clientes', title: 'Clientes', icon: UsersIcon, isActive: pathname.startsWith('/dashboard/clientes') },
        { key: 'inventario', href: '/dashboard/inventario', title: 'Inventario', icon: WarehouseIcon, isActive: pathname.startsWith('/dashboard/inventario') },
        { key: 'proveedores', href: '/dashboard/proveedores', title: 'Proveedores', icon: TruckIcon, isActive: pathname.startsWith('/dashboard/proveedores') },
        { key: 'reportes', href: '/dashboard/reportes', title: 'Reportes', icon: ClipboardListIcon, isActive: pathname.startsWith('/dashboard/reportes') },
        { key: 'gastos', href: '/dashboard/gastos', title: 'Gastos', icon: TrendingDown, isActive: pathname.startsWith('/dashboard/gastos') }
      );
    }


    if (role === "ADMINISTRADOR") {
      items.push(
        { key: 'users', href: '/dashboard/usuarios', title: 'Usuarios', icon: UsersIcon, isActive: pathname.startsWith('/dashboard/usuarios') }
      );

      const configuracionCargada = configuracion != null;
      const necesitaConfigInicial = !configuracionCargada || configuracion.tipoNegocio == null;

      if (necesitaConfigInicial) {
        items.push({ 
          key: 'configuracion-inicial', 
          href: '/dashboard/configuracion-inicial', 
          title: 'Configuración Inicial', 
          icon: Settings, 
          isActive: pathname.startsWith('/dashboard/configuracion-inicial') 
        });
      } else {
        items.push({ 
          key: 'configuracion', 
          href: '/dashboard/configuracion', 
          title: 'Configuración', 
          icon: Settings, 
          isActive: pathname.startsWith('/dashboard/configuracion') 
        });
      }
    }

    if (role === "EMPLEADO") {
      items.push({ 
        key: 'clientes', 
        href: '/dashboard/clientes', 
        title: 'Clientes', 
        icon: UsersIcon, 
        isActive: pathname.startsWith('/dashboard/clientes') 
      });
    }

    return items;
  }, [role, pathname, configuracion, tieneServicios, tieneCitas]);
};

// Función para obtener el título de la página según la ruta
const getPageTitle = (pathname: string, role: Rol | undefined): string => {
  if (pathname === "/dashboard") return "Dashboard";

  if (role === "SUPERADMIN") {
    if (pathname.startsWith("/dashboard/superadmin/empresas")) return "Clientes SaaS";
    if (pathname.startsWith("/dashboard/superadmin/suscripciones")) return "Gestión de Suscripciones";
    if (pathname.startsWith("/dashboard/superadmin/planes")) return "Planes de Precios";
    if (pathname.startsWith("/dashboard/superadmin/analytics")) return "Analytics del Sistema";
    if (pathname.startsWith("/dashboard/superadmin/notificaciones")) return "Centro de Notificaciones";
    if (pathname.startsWith("/dashboard/superadmin/usuarios")) return "Gestión de Usuarios";
    if (pathname.startsWith("/dashboard/superadmin")) return "Super Administrador";
  }

  const titleMap: { [key: string]: string } = {
    "/dashboard/pos": "Punto de Venta",
    "/dashboard/productos": "Productos",
    "/dashboard/categorias": "Categorías",
    "/dashboard/ventas": "Ventas",
    "/dashboard/clientes": "Clientes",
    "/dashboard/inventario": "Inventario",
    "/dashboard/proveedores": "Proveedores",
    "/dashboard/reportes": "Reportes",
    "/dashboard/restaurante": "Restaurante",
    "/dashboard/restaurante/cocina": "Cocina",
    "/dashboard/restaurante/caja": "Caja Restaurante",
    "/dashboard/bar": "Bar",
    "/dashboard/bar/barra": "Barra / Caja",
    "/dashboard/farmacia": "Farmacia",
    "/dashboard/farmacia/vencimientos": "Control de Vencimientos",
    "/dashboard/farmacia/lotes": "Gestión de Lotes",
    "/dashboard/usuarios": "Usuarios",
    "/dashboard/terminales": "Terminales",
    "/dashboard/configuracion-inicial": "Configuración Inicial",
    "/dashboard/configuracion": "Configuración",
    "/dashboard/servicios": "Servicios",
    "/dashboard/citas": "Citas",
    "/dashboard/gastos": "Gastos Operativos",
    "/dashboard/peluqueria/comisiones": "Equipo y Liquidaciones",
    "/dashboard/peluqueria/comandas": "Cuentas Abiertas",
    "/dashboard/peluqueria/walk-in": "Nuevo Servicio",
  };

  for (const [route, title] of Object.entries(titleMap)) {
    if (pathname.startsWith(route)) {
      return title;
    }
  }

  return "Dashboard";
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cerrarSesion } = useAuth();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [empresaData, setEmpresaData] = useState<EmpresaHeaderData | null>(null);
  const [mostrarContenido, setMostrarContenido] = useState(false);

  const { coloresActuales, isDark } = useTheme();

  const {
    configuracion,
    estaCargando,
    error,
    configuracionCargada,
    necesitaConfiguracionInicial,
    mostrarConfiguracion,
    obtenerTema,
    tieneServicios,
    tieneCitas,
    recargarConfiguracion
  } = useConfiguracionEmpresa();

  const userRole = session?.user?.role;
  const userName = session?.user?.nombre || "Usuario";
  
  const userInitials = useMemo(() => 
    userName.split(" ").map(n => n[0]).join("").toUpperCase(),
    [userName]
  );
  
  const empresaNombre = useMemo(() => 
    empresaData?.nombre || configuracion?.empresa?.nombre || "Mi Empresa",
    [empresaData, configuracion?.empresa?.nombre]
  );

  const empresaLogo = useMemo(() => 
    empresaData?.logo || null,
    [empresaData]
  );

  const tema = useMemo(() => obtenerTema(), [obtenerTema]);
  
  const tieneServiciosMemo = useMemo(() => tieneServicios(), [tieneServicios]);
  const tieneCitasMemo = useMemo(() => tieneCitas(), [tieneCitas]);

  // ✅ Mostrar contenido inmediatamente si la sesión está lista
  useEffect(() => {
    if (status === "authenticated") {
      // Pequeño delay para evitar flash, pero mucho menor que antes
      const timer = setTimeout(() => setMostrarContenido(true), 50);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // ✅ Cargar datos de la empresa en segundo plano
  useEffect(() => {
    if (!session?.user?.empresaId) return;
    
    const cargarDatosEmpresa = async () => {
      try {
        const response = await fetch('/api/empresa');
        if (response.ok) {
          const data = await response.json();
          setEmpresaData(data);
        }
      } catch (error) {
        console.error('Error al cargar datos de empresa:', error);
      }
    };

    cargarDatosEmpresa();
  }, [session?.user?.empresaId]);

  // Polling para verificar estado de la empresa (bloqueo en tiempo real)
  const necesitaConfig = useMemo(() => {
    // Solo los ADMINISTRADORES pueden necesitar configuración inicial
    if (userRole !== "ADMINISTRADOR") return false;
    
    // Si está cargando, NO forzar redirección
    if (estaCargando || !configuracionCargada) return false;
    
    // Solo redirigir si el usuario NO ha completado la configuración inicial
    // Y además no existe configuración en la BD
    if (session?.user?.configuracionCompletada === true) return false;
    
    const sinConfiguracion = !configuracion || !configuracion.tipoNegocio;
   
    return sinConfiguracion;
  }, [userRole, estaCargando, configuracionCargada, configuracion, session?.user?.configuracionCompletada]);

  const debeOcultarSidebar = useMemo(() => {
    if (userRole === "SUPERADMIN") return false;
    if (userRole === "EMPLEADO" || userRole === "GERENTE") return false;
    if (userRole === "ADMINISTRADOR" && necesitaConfig) return true;
    return false;
  }, [userRole, necesitaConfig]);

  const navItemsData = useNavItems(
    userRole,
    pathname,
    configuracion,
    tieneServiciosMemo,
    tieneCitasMemo
  );

  const navItems = useMemo(() => 
    navItemsData.map(item => {
      if (item.children && item.children.length > 0) {
        return (
          <NavItemWithSubmenu
            key={item.key}
            title={item.title}
            icon={item.icon}
            isActive={item.isActive}
            sidebarCollapsed={sidebarCollapsed}
            children={item.children}
            pathname={pathname}
          />
        );
      }
      return (
        <NavItem
          key={item.key}
          href={item.href}
          title={item.title}
          icon={item.icon}
          isActive={item.isActive}
          sidebarCollapsed={sidebarCollapsed}
        />
      );
    }),
    [navItemsData, sidebarCollapsed, pathname]
  );

  const pageTitle = useMemo(() => 
    getPageTitle(pathname, userRole),
    [pathname, userRole]
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);


  useEffect(() => {
    if (!session || estaCargando || !configuracionCargada) return;

    const esAdministrador = session.user?.role === 'ADMINISTRADOR';
    const esConfiguracionInicial = pathname === "/dashboard/configuracion-inicial";

    // SOLO redirigir si el admin NECESITA configuración y NO está en esa página
    if (esAdministrador && necesitaConfig && !esConfiguracionInicial) {
      startTransition(() => {
        router.push("/dashboard/configuracion-inicial");
      });
      return;
    }

    // SOLO redirigir si está EN config-inicial pero ya NO la necesita
    // ⚠️ NO redirigir desde otras páginas del dashboard
    if (esAdministrador && !necesitaConfig && esConfiguracionInicial) {
      startTransition(() => {
        router.push("/dashboard");
      });
      return;
    }

    // Para todas las demás rutas, NO hacer nada
  }, [session, estaCargando, configuracionCargada, necesitaConfig, pathname, router]);

  const reintentarCarga = useCallback(async () => {
    try {
      await recargarConfiguracion();
    } catch (err) {
      console.error('Error al reintentar carga:', err);
    }
  }, [recargarConfiguracion]);

  const handleLogout = useCallback(() => {
    startTransition(() => {
      cerrarSesion();
    });
  }, [cerrarSesion]);

  // ✅ Pantalla de carga MINIMALISTA mientras se autentica
  if (status === "loading" || !mostrarContenido) {
    return (
      <div className={`min-h-screen ${coloresActuales.background} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className={`text-sm ${coloresActuales.textSecondary}`}>Cargando...</p>
        </div>
      </div>
    );
  }

  //  Pantalla de carga de configuración 
  if (estaCargando || !configuracionCargada) {
    return (
      <div className={`min-h-screen ${coloresActuales.background} flex items-center justify-center relative overflow-hidden`}>
        <ParticleBackground className="fixed inset-0" zIndex={-1} />
        <div className={`text-center p-8 ${coloresActuales.surface} rounded-3xl ${coloresActuales.border} border shadow-2xl max-w-md`}>
          <div className="relative">
            <Loader2 className={`h-12 w-12 animate-spin mx-auto mb-4 bg-gradient-to-r ${coloresActuales.primary} bg-clip-text text-transparent`} />
            <Sparkles className={`h-6 w-6 absolute -top-2 -right-2 bg-gradient-to-r ${coloresActuales.secondary} bg-clip-text text-transparent animate-pulse`} />
          </div>
          <p className={`${coloresActuales.text} font-medium`}>Configurando espacio de trabajo...</p>
          <div className="mt-4 w-32 h-2 bg-muted rounded-full mx-auto overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${coloresActuales.primary} rounded-full animate-pulse`} style={{width: '70%'}} />
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de error
  if (error && (error.includes('Error de conexión') || error.includes('500'))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center overflow-hidden">
        <div className="text-center p-8 backdrop-blur-xl bg-card dark:bg-background/60 rounded-3xl border border-destructive/30 shadow-2xl max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error de Conexión</h3>
          <p className="text-red-600 dark:text-red-400 mb-4 text-sm">
            No se pudo cargar la configuración. Verifica tu conexión a internet.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={reintentarCarga}
              disabled={isPending}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            >
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Layout sin sidebar (configuración inicial)
  if (debeOcultarSidebar) {
    return (
      <div className={`min-h-screen ${coloresActuales.background} flex flex-col relative overflow-hidden`}>
        <ParticleBackground className="fixed inset-0" zIndex={-1} />
        <MobileHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          empresaLogo={empresaLogo}
          empresaNombre={empresaNombre}
          temaIcon={tema.icon}
          tipoNegocio={configuracion?.tipoNegocio}
          navItems={navItems}
          pageTitle="Configuración Inicial"
          userName={userName}
          userInitials={userInitials}
          userEmail={session?.user?.email}
          userRole={userRole || ""}
          onLogout={handleLogout}
          showConfig={false}
        />

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
          <Toaster />
        </main>
      </div>
    );
  }

  // Layout completo con sidebar
  return (
    <div className={`min-h-screen ${coloresActuales.background} flex relative overflow-hidden`}>
      <ParticleBackground className="fixed inset-0" zIndex={-1} />

      {/* Sidebar Desktop */}
      <Sidebar
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        empresaLogo={empresaLogo}
        empresaNombre={empresaNombre}
        temaIcon={tema.icon}
        tipoNegocio={configuracion?.tipoNegocio}
        navItems={navItems}
        userName={userName}
        userInitials={userInitials}
        userRole={userRole || ""}
        onLogout={handleLogout}
      />

      {/* Contenido principal */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out min-w-0",
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
      )}>
        {/* Header móvil */}
        <MobileHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          empresaLogo={empresaLogo}
          empresaNombre={empresaNombre}
          temaIcon={tema.icon}
          tipoNegocio={configuracion?.tipoNegocio}
          navItems={navItems}
          pageTitle={pageTitle}
          userName={userName}
          userInitials={userInitials}
          userEmail={session?.user?.email}
          userRole={userRole || ""}
          onLogout={handleLogout}
          showConfig={userRole === "ADMINISTRADOR" && mostrarConfiguracion()}
        />

        {/* Header desktop */}
        <DesktopHeader
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          pageTitle={pageTitle}
          userName={userName}
          userInitials={userInitials}
          userEmail={session?.user?.email}
          userRole={userRole || ""}
          empresaNombre={empresaNombre}
          onLogout={handleLogout}
          showConfig={userRole === "ADMINISTRADOR" && mostrarConfiguracion()}
        />

        {/* Contenido principal */}
        <main className={cn(
          "flex-1 min-w-0 overflow-x-hidden flex flex-col",
          pathname.startsWith("/dashboard/pos") ? "p-0 sm:p-4 lg:p-6" : "p-0 sm:p-4 lg:p-6"
        )}>
          {pathname.startsWith("/dashboard/pos") ? (
            <div className="mx-auto w-full flex-1 flex flex-col min-h-0 max-w-full">
              {children}
            </div>
          ) : (
            <div className="mx-auto w-full flex-1 flex flex-col min-h-0 max-w-7xl">
              <div className="flex-1 sm:rounded-2xl sm:border sm:border-border bg-background sm:bg-card sm:shadow-sm overflow-auto">
                <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 min-h-full">
                  {children}
                </div>
              </div>
            </div>
          )}
          <Toaster />
        </main>
      </div>
    </div>
  );
}