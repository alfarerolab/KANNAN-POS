"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Package,
  Loader2,
  Grid3x3,
  List,
  Filter,
  Sparkles,
  Tag,
  Search,
  X,
} from "lucide-react";
import { ProductCard } from "./cards/ProductoCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ProductGridProps {
  productos: any[];
  categorias: any[];
  categoriaSeleccionada: string | null;
  isLoading: boolean;
  searchTerm: string;
  configuracion: any;
  formatearMoneda: (valor: number) => string;
  tieneVariantes: boolean;
  tieneLotes: boolean;
  tieneVencimientos: boolean;
  varianteSeleccionada: any;
  setVarianteSeleccionada: (variante: any) => void;
  loteSeleccionado: string;
  setLoteSeleccionado: (lote: string) => void;
  fechaVencimiento: string;
  setFechaVencimiento: (fecha: string) => void;
  onCategoriaChange: (categoriaId: string | null) => void;
  onAddToCart: (producto: any, variante?: any) => void;
}

export function ProductGrid({
  productos,
  categorias,
  categoriaSeleccionada,
  isLoading,
  searchTerm,
  configuracion,
  formatearMoneda,
  tieneVariantes,
  tieneLotes,
  tieneVencimientos,
  varianteSeleccionada,
  setVarianteSeleccionada,
  loteSeleccionado,
  setLoteSeleccionado,
  fechaVencimiento,
  setFechaVencimiento,
  onCategoriaChange,
  onAddToCart,
}: ProductGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [animateProducts, setAnimateProducts] = useState(false);
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

  useEffect(() => {
    setAnimateProducts(true);
    const timer = setTimeout(() => setAnimateProducts(false), 100);
    return () => clearTimeout(timer);
  }, [productos, categoriaSeleccionada, searchTerm]);

  const getCategoriaIcon = (categoria: any) => {
    const icons: { [key: string]: string } = {
      COMIDA: "🍽️",
      BEBIDA: "🥤",
      BEBIDAS: "🥤",
      MEDICAMENTO: "💊",
      MEDICAMENTOS: "💊",
      VITAMINA: "💉",
      VITAMINAS: "💉",
      JUGUETE: "🧸",
      JUGUETES: "🧸",
      ACCESORIO: "🎀",
      ACCESORIOS: "🎀",
      LIMPIEZA: "🧽",
      HIGIENE: "🧼",
      ELECTRONICOS: "⚡",
      ROPA: "👕",
      ZAPATOS: "👟",
      LIBROS: "📚",
      DEPORTES: "⚽",
      HOGAR: "🏠",
      JARDIN: "🌱",
      HERRAMIENTAS: "🔧",
      DULCE: "🍬",
      DULCES: "🍬",
      OTRO: "🏷️",
    };

    const nombre = categoria.nombre?.toUpperCase() || "";
    return icons[nombre] || icons["OTRO"];
  };

  const getCategoriaColor = (categoria: any, isSelected: boolean) => {
    // SLATE PROFESSIONAL — colores sólidos de acento por índice
    const solidColors = [
      "#0f172a", // slate profundo
      "#10b981", // success verde
      "#f59e0b", // warning ámbar
      "#e11d48", // error rose
      "#0369a1", // azul tech
      "#7c3aed", // violeta
      "#0891b2", // cyan
      "#059669", // esmeralda
      "#dc2626", // rojo
      "#d97706", // naranja
    ];
    return solidColors[categoria.nombre?.length % solidColors.length] || solidColors[0];
  };

  const productosConStock = productos.filter(p => p.enStock > 0);
  const productosSinStock = productos.filter(p => p.enStock <= 0);
  const productosStockBajo = productos.filter(p =>
    p.enStock > 0 &&
    p.stockMinimo &&
    p.stockMinimo > 0 &&
    p.enStock < p.stockMinimo
  );


  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 py-6 space-y-6" style={{
        paddingLeft: windowWidth >= 1024 ? '1.5rem' : '1rem',
        paddingRight: windowWidth >= 1024 ? '1.5rem' : '1rem',
        maxWidth: '100%'
      }}>
        <div className="bg-card dark:bg-background/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary shadow-sm">
                  <Package className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                    Productos Disponibles
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{productos.length} producto{productos.length !== 1 ? "s" : ""}</span>
                    {productosConStock.length > 0 && (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-green-700 dark:text-green-400 text-xs">
                        {productosConStock.length} en stock
                      </Badge>
                    )}
                    {productosStockBajo.length > 0 && (
                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">
                        {productosStockBajo.length} stock bajo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`h-9 px-3 text-sm ${viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-sm"
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
                  className={`h-9 px-3 text-sm ${viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-card"
                    }`}
                >
                  <List className="h-4 w-4 mr-1.5" />
                  Lista
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                  <Filter className="h-4 w-4" />
                  <span>Categorías</span>
                  {categoriaSeleccionada && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
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

              <div className={`${showMobileFilters ? 'block' : 'hidden md:block'}`}>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
                  <Button
                    variant={categoriaSeleccionada === null ? "default" : "outline"}
                    onClick={() => onCategoriaChange(null)}
                    className={`flex-shrink-0 h-12 px-4 transition-all duration-200 ${categoriaSeleccionada === null
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card/90 hover:bg-card border-border hover:border-border"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium text-sm">Todos</div>
                        <div className="text-xs opacity-80">{productos.length}</div>
                      </div>
                    </div>
                  </Button>

                  {categorias.map((categoria: any) => {
                    const isSelected = categoriaSeleccionada === categoria.id;
                    const solidColor = getCategoriaColor(categoria, isSelected);
                    const icon = getCategoriaIcon(categoria);

                    return (
                      <Button
                        key={categoria.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => onCategoriaChange(categoria.id)}
                        style={isSelected ? { backgroundColor: solidColor, color: '#ffffff', borderColor: solidColor } : {}}
                        className={`flex-shrink-0 h-12 px-4 transition-all duration-200 ${!isSelected ? "bg-card/90 hover:bg-card border-border hover:border-border" : "shadow-sm"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{icon}</span>
                          <div className="text-left">
                            <div className="font-medium text-sm truncate max-w-24">
                              {categoria.nombre}
                            </div>
                            <div className="text-xs opacity-80">
                              {categoria._count?.productos || 0}
                            </div>
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card dark:bg-background/60 backdrop-blur-xl rounded-2xl border border-white/40">
              <div className="relative mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
                <Sparkles className="h-6 w-6 absolute -top-2 -right-2 text-purple-500 animate-pulse" />
              </div>
              <p className="text-lg text-foreground/80 font-medium">Cargando productos...</p>
            </div>
          ) : productos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card dark:bg-background/60 backdrop-blur-xl rounded-2xl border border-white/40">
              <div className="p-6 rounded-full bg-muted mb-6">
                <Package className="h-16 w-16 text-muted-foreground/70" />
              </div>
              <h3 className="text-xl font-semibold text-foreground/80 mb-2">No hay productos</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || categoriaSeleccionada
                  ? "No se encontraron productos que coincidan con los filtros seleccionados"
                  : "Aún no tienes productos registrados en tu inventario"}
              </p>
            </div>
          ) : (
            <>
              <div
                className={`transition-all duration-300 ${animateProducts ? "opacity-50 scale-95" : "opacity-100 scale-100"
                  }`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: viewMode === "list"
                    ? '1fr'
                    : 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: viewMode === "list" ? '1rem' : '1.25rem'
                }}
              >
                {productos.map((producto: any, index: number) => (
                  <div
                    key={producto.id}
                    className={`transform transition-all duration-200 hover:scale-[1.02] ${!animateProducts ? 'animate-fade-in-up' : ''
                      }`}
                    style={{
                      animationDelay: !animateProducts ? `${index * 30}ms` : undefined,
                    }}
                  >
                    <ProductCard
                      producto={producto}
                      onAddToCart={onAddToCart}
                      formatearMoneda={formatearMoneda}
                      configuracion={configuracion}
                      tieneVariantes={tieneVariantes}
                      tieneLotes={tieneLotes}
                      tieneVencimientos={tieneVencimientos}
                      varianteSeleccionada={varianteSeleccionada}
                      setVarianteSeleccionada={setVarianteSeleccionada}
                      loteSeleccionado={loteSeleccionado}
                      setLoteSeleccionado={setLoteSeleccionado}
                      fechaVencimiento={fechaVencimiento}
                      setFechaVencimiento={setFechaVencimiento}
                      viewMode={viewMode}
                    />
                  </div>
                ))}
              </div>

              {productos.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 bg-card dark:bg-background/60 rounded-lg backdrop-blur-sm text-sm">
                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-foreground/80">
                      Total: {productos.length} productos
                    </span>
                  </div>
                  {productosConStock.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-card dark:bg-background/60 rounded-lg backdrop-blur-sm text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-foreground/80">
                        {productosConStock.length} en stock
                      </span>
                    </div>
                  )}
                  {productosSinStock.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-card dark:bg-background/60 rounded-lg backdrop-blur-sm text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium text-foreground/80">
                        {productosSinStock.length} agotados
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
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
  );
}