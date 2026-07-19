// Editado: Importado desde la versión de producción en la VPS
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Loader2,
  Grid3x3,
  List,
  Filter,
  Star,
  Clock,
  Heart,
  CalendarPlus,
  Users,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { ServiceCard } from "./cards/ServicioCard";
import { Badge } from "@/components/ui/badge";

interface ServiceGridProps {
  servicios: any[];
  categorias?: any[];
  categoriaSeleccionada?: string | null;
  isLoading: boolean;
  searchTerm?: string;
  formatearMoneda: (valor: number) => string;
  onCategoriaChange?: (categoriaId: string | null) => void;
  onSelectService: (servicio: any) => void;
  onAddToCart?: (servicio: any) => void;
  redirectToCitas?: boolean;
}

export function ServiceGrid({
  servicios,
  categorias = [],
  categoriaSeleccionada = null,
  isLoading,
  searchTerm = "",
  formatearMoneda,
  onCategoriaChange,
  onSelectService,
  onAddToCart,
  redirectToCitas = true,
}: ServiceGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Detectar cambios en tamaño de ventana para ajuste responsive inmediato
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const getCategoriaIcon = (categoria: any) => {
    const icons: { [key: string]: string } = {
      CORTE: "✂️",
      SPA: "🛁",
      ESTETICA: "💅",
      VETERINARIA: "🏥",
      CONSULTA: "🩺",
      CIRUGIA: "🔬",
      VACUNACION: "💉",
      DESPARASITACION: "💊",
      LIMPIEZA: "🧼",
      BAÑO: "🛀",
      PELUQUERIA: "💇",
      MASAJE: "🤲",
      TERAPIA: "🌿",
      ENTRENAMIENTO: "🎾",
      ADIESTRAMIENTO: "🦮",
      OTRO: "⭐",
    };

    const nombre = categoria.nombre?.toUpperCase() || "";
    return icons[nombre] || icons["OTRO"];
  };

  const getCategoriaColor = (categoria: any, isSelected: boolean) => {
    const colors = [
      "from-purple-500 to-pink-500",
      "from-blue-500 to-indigo-500",
      "from-green-500 to-teal-500",
      "from-orange-500 to-amber-500",
      "from-pink-500 to-rose-500",
      "from-indigo-500 to-blue-500",
      "from-teal-500 to-cyan-500",
      "from-amber-500 to-yellow-500",
      "from-rose-500 to-pink-500",
      "from-cyan-500 to-blue-500",
    ];

    if (isSelected) {
      return colors[categoria.nombre?.length % colors.length] || colors[0];
    }

    return "from-slate-100 to-slate-200";
  };

  const serviciosPopulares = servicios.filter((s) => s._count?.citas > 5);
  const serviciosActivos = servicios.filter((s) => s.activo);
  const duracionPromedio = servicios.length > 0 
    ? Math.round(servicios.reduce((acc, s) => acc + s.duracion, 0) / servicios.length)
    : 0;

  return (
    <div className="h-full bg-background rounded-xl overflow-hidden border border-border shadow-sm">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Header mejorado */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-8">
            {/* Título y controles principales */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Servicios Disponibles
                    <Sparkles className="h-6 w-6 text-indigo-400" />
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                    <span>Selecciona para agendar tu cita</span>
                    {serviciosActivos.length > 0 && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 transition-colors">
                        {serviciosActivos.length} activos
                      </Badge>
                    )}
                    {serviciosPopulares.length > 0 && (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 transition-colors">
                        {serviciosPopulares.length} populares
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Controles de vista */}
              <div className="hidden md:flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`h-9 px-3 text-sm ${
                    viewMode === "grid"
                      ? "bg-gradient-to-br from-slate-800 to-slate-600 hover:from-slate-700 hover:to-slate-500 text-primary-foreground shadow-sm"
                      : "hover:bg-card"
                  }`}
                >
                  <Grid3x3 className="h-4 w-4 mr-1.5" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`h-9 px-3 text-sm ${
                    viewMode === "list"
                      ? "bg-gradient-to-br from-slate-800 to-slate-600 hover:from-slate-700 hover:to-slate-500 text-primary-foreground shadow-sm"
                      : "hover:bg-card"
                  }`}
                >
                  <List className="h-4 w-4 mr-1.5" />
                  Lista
                </Button>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            {servicios.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-8 p-5 bg-background/40 backdrop-blur-sm rounded-xl border border-border/50">
                <div className="flex items-center gap-2.5 text-sm">
                  <CalendarPlus className="h-4 w-4 text-indigo-500" />
                  <span className="font-medium text-foreground">
                    {servicios.length} servicios disponibles
                  </span>
                </div>
                {duracionPromedio > 0 && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-foreground">
                      {duracionPromedio} min promedio
                    </span>
                  </div>
                )}
                {serviciosPopulares.length > 0 && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-foreground">
                      {serviciosPopulares.length} más solicitados
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-emerald-600">
                    Listo para agendar
                  </span>
                </div>
              </div>
            )}

            {/* Filtros de categorías */}
            {categorias.length > 0 && onCategoriaChange && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <Filter className="h-4 w-4" />
                    <span>Filtrar por categoría</span>
                    {categoriaSeleccionada && (
                      <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                        {categorias.find((c) => c.id === categoriaSeleccionada)?.nombre}
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Filtros
                  </Button>
                </div>

                {/* Categorías - Scroll horizontal en mobile */}
                <div className={`${showMobileFilters ? 'block' : 'hidden md:block'}`}>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
                    {/* Botón "Todos" */}
                    <Button
                      variant={categoriaSeleccionada === null ? "default" : "outline"}
                      onClick={() => onCategoriaChange(null)}
                      className={`flex-shrink-0 h-12 px-5 rounded-xl transition-all duration-300 ${
                        categoriaSeleccionada === null
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                          : "bg-background hover:bg-accent border border-border/50 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium text-sm">Todos</div>
                          <div className="text-xs opacity-80">{servicios.length}</div>
                        </div>
                      </div>
                    </Button>

                    {/* Categorías */}
                    {categorias.map((categoria: any) => {
                      const isSelected = categoriaSeleccionada === categoria.id;
                      const colorClass = getCategoriaColor(categoria, isSelected);
                      const icon = getCategoriaIcon(categoria);

                      return (
                        <Button
                          key={categoria.id}
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => onCategoriaChange(categoria.id)}
                          className={`flex-shrink-0 h-12 px-5 rounded-xl transition-all duration-300 ${
                            isSelected
                              ? `bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105`
                              : "bg-background hover:bg-accent border border-border/50 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{icon}</span>
                            <div className="text-left">
                              <div className="font-medium text-sm truncate max-w-24">
                                {categoria.nombre}
                              </div>
                              <div className="text-xs opacity-80">
                                {categoria._count?.servicios || 0}
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grid de servicios */}
        <div className="relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card dark:bg-background/60 backdrop-blur-xl rounded-2xl border border-white/40">
              <div className="relative mb-6">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-amber-400 animate-pulse" />
              </div>
              <p className="text-lg text-foreground/80 font-medium">Cargando servicios...</p>
            </div>
          ) : servicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card dark:bg-background/60 backdrop-blur-xl rounded-2xl border border-white/40">
              <div className="p-6 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 mb-6">
                <Calendar className="h-16 w-16 text-muted-foreground/70" />
              </div>
              <h3 className="text-xl font-semibold text-foreground/80 mb-2">No hay servicios</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || categoriaSeleccionada
                  ? "No se encontraron servicios que coincidan con los filtros seleccionados"
                  : "Aún no tienes servicios registrados en tu sistema"}
              </p>
            </div>
          ) : (
            <>
              {/* Grid responsivo */}
              <div
                className={`transition-all duration-500 ${
                  viewMode === "grid"
                    ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "flex flex-col gap-4"
                }`}
              >
                {servicios.map((servicio: any, index: number) => (
                  <div
                    key={servicio.id}
                    className="group"
                    style={{
                      animation: `fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 50}ms both`,
                    }}
                  >
                    <ServiceCard
                      servicio={servicio}
                      onSelectService={onSelectService}
                      onAddToCart={onAddToCart}
                      formatearMoneda={formatearMoneda}
                      isPopular={serviciosPopulares.includes(servicio)}
                      viewMode={viewMode}
                      redirectToCitas={redirectToCitas}
                    />
                  </div>
                ))}
              </div>

              {/* Información adicional */}
              {servicios.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 bg-card dark:bg-background/60 rounded-lg backdrop-blur-sm text-sm">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-foreground/80">
                      Total: {servicios.length} servicios
                    </span>
                  </div>
                  {serviciosActivos.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-card dark:bg-background/60 rounded-lg backdrop-blur-sm text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-foreground/80">
                        {serviciosActivos.length} activos
                      </span>
                    </div>
                  )}
                  {serviciosPopulares.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-card dark:bg-background/60 rounded-lg backdrop-blur-sm text-sm">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-foreground/80">
                        {serviciosPopulares.length} populares
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* CSS para animaciones */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          .scrollbar-thin {
            scrollbar-width: thin;
          }
          
          .scrollbar-thumb-slate-300::-webkit-scrollbar-thumb {
            background-color: rgb(203 213 225);
          }
          
          .scrollbar-thin::-webkit-scrollbar {
            height: 6px;
          }
        `}</style>
      </div>
    </div>
  );
}