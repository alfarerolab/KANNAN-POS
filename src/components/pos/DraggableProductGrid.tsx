"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Package,
  Loader2,
  Grid3x3,
  List,
  Filter,
  Sparkles,
  Tag,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { ProductCard } from "./cards/ProductoCard";
import { Badge } from "@/components/ui/badge";

interface DraggableProductGridProps {
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

interface SortableProductCardProps {
  producto: any;
  onAddToCart: (producto: any, variante?: any) => void;
  formatearMoneda: (valor: number) => string;
  configuracion: any;
  tieneVariantes: boolean;
  tieneLotes: boolean;
  tieneVencimientos: boolean;
  varianteSeleccionada: any;
  setVarianteSeleccionada: (variante: any) => void;
  loteSeleccionado: string;
  setLoteSeleccionado: (lote: string) => void;
  fechaVencimiento: string;
  setFechaVencimiento: (fecha: string) => void;
  isDragging?: boolean;
}

// Hook para manejar el orden personalizado de productos
const useCustomProductOrder = (
  productos: any[],
  categoriaSeleccionada: string | null
) => {
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  const storageKey = `product-order-${categoriaSeleccionada || "all"}`;

  // Cargar orden personalizado desde localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        setCustomOrder(JSON.parse(savedOrder));
      } catch (error) {
        console.error("Error loading custom order:", error);
        setCustomOrder([]);
      }
    } else {
      setCustomOrder([]);
    }
  }, [storageKey]);

  // Ordenar productos según el orden personalizado
  const orderedProducts = useMemo(() => {
    if (customOrder.length === 0) {
      return productos;
    }

    const ordered = [...productos];
    ordered.sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);

      // Si ambos están en el orden personalizado, ordenar por posición
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // Si solo uno está en el orden personalizado, ponerlo primero
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // Si ninguno está en el orden personalizado, mantener orden original
      return 0;
    });

    return ordered;
  }, [productos, customOrder]);

  const updateOrder = (newOrder: string[]) => {
    setCustomOrder(newOrder);
    localStorage.setItem(storageKey, JSON.stringify(newOrder));
  };

  const resetOrder = () => {
    setCustomOrder([]);
    localStorage.removeItem(storageKey);
  };

  return {
    orderedProducts,
    updateOrder,
    resetOrder,
    hasCustomOrder: customOrder.length > 0,
  };
};

// Componente de ProductCard sorteable
function SortableProductCard({
  producto,
  onAddToCart,
  formatearMoneda,
  configuracion,
  tieneVariantes,
  tieneLotes,
  tieneVencimientos,
  varianteSeleccionada,
  setVarianteSeleccionada,
  loteSeleccionado,
  setLoteSeleccionado,
  fechaVencimiento,
  setFechaVencimiento,
  isDragging = false,
}: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: producto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSortableDragging ? "z-50" : ""}`}
      data-tour="drag-drop"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
      >
        <div className="bg-card dark:bg-background/90 backdrop-blur-sm rounded-md p-1 shadow-md border">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

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
      />
    </motion.div>
  );
}

export function DraggableProductGrid({
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
}: DraggableProductGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { orderedProducts, updateOrder, resetOrder, hasCustomOrder } =
    useCustomProductOrder(productos, categoriaSeleccionada);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = orderedProducts.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = orderedProducts.findIndex((item) => item.id === over.id);

      const newProducts = arrayMove(orderedProducts, oldIndex, newIndex);
      const newOrder = newProducts.map((p) => p.id);
      updateOrder(newOrder);

      // Anunciar cambio para lectores de pantalla
      const movedProduct = orderedProducts[oldIndex];
      if (movedProduct) {
        const announcement = `Producto ${
          movedProduct.nombre
        } movido a la posición ${newIndex + 1}`;
        setTimeout(() => {
          const ariaLiveRegion = document.createElement("div");
          ariaLiveRegion.setAttribute("aria-live", "polite");
          ariaLiveRegion.setAttribute("aria-atomic", "true");
          ariaLiveRegion.style.position = "absolute";
          ariaLiveRegion.style.left = "-10000px";
          ariaLiveRegion.textContent = announcement;
          document.body.appendChild(ariaLiveRegion);
          setTimeout(() => document.body.removeChild(ariaLiveRegion), 1000);
        }, 100);
      }
    }
  };

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
      OTRO: "🏷️",
    };

    const nombre = categoria.nombre?.toUpperCase() || "";
    return icons[nombre] || icons["OTRO"];
  };

  const getCategoriaColor = (categoria: any, isSelected: boolean) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-green-500 to-emerald-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-purple-500",
      "from-pink-500 to-rose-500",
      "from-cyan-500 to-blue-500",
      "from-emerald-500 to-green-500",
      "from-red-500 to-pink-500",
      "from-yellow-500 to-orange-500",
    ];

    if (isSelected) {
      return colors[categoria.nombre?.length % colors.length] || colors[0];
    }

    return "from-slate-100 to-slate-200";
  };

  const activeProduct = activeId
    ? orderedProducts.find((p) => p.id === activeId)
    : null;

  return (
    <div className="space-y-6" data-tour="product-grid">
      {/* Header con filtros y controles */}
      <div className="backdrop-blur-xl bg-card dark:bg-background/20 border border-white/30 rounded-2xl p-6 shadow-lg">
        {/* Título y controles de vista */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                Productos Disponibles
                <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
              </h2>
              <p className="text-sm text-muted-foreground">
                {productos.length} producto{productos.length !== 1 ? "s" : ""}
                {searchTerm && ` • Búsqueda: "${searchTerm}"`}
                {categoriaSeleccionada &&
                  categorias.find((c) => c.id === categoriaSeleccionada) &&
                  ` • Categoría: ${
                    categorias.find((c) => c.id === categoriaSeleccionada)
                      ?.nombre
                  }`}
                {hasCustomOrder && (
                  <span className="ml-2">
                    <Badge variant="secondary" className="text-xs">
                      Orden personalizado
                    </Badge>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Controles de vista */}
          <div className="flex items-center gap-2">
            {hasCustomOrder && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetOrder}
                className="bg-card dark:bg-background/50 backdrop-blur-sm border-white/30 text-muted-foreground hover:text-foreground"
                title="Restablecer orden original"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Restablecer
              </Button>
            )}

            <div className="flex items-center gap-2 bg-card dark:bg-background/50 backdrop-blur-sm rounded-xl p-1 border border-white/30">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-8 px-3 ${
                  viewMode === "grid"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-8 px-3 ${
                  viewMode === "list"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros de categorías */}
        <div className="space-y-3" data-tour="categories-filter">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Filter className="h-4 w-4" />
            <span>Filtrar por categoría</span>
            {categoriaSeleccionada && (
              <Badge
                variant="secondary"
                className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
              >
                {categorias.find((c) => c.id === categoriaSeleccionada)?.nombre}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Botón "Todos" */}
            <Button
              variant={categoriaSeleccionada === null ? "default" : "outline"}
              onClick={() => onCategoriaChange(null)}
              className={`group relative flex items-center gap-3 px-4 py-3 h-12 transition-all duration-300 hover:scale-105 ${
                categoriaSeleccionada === null
                  ? "bg-gradient-to-r from-slate-600 to-slate-800 text-primary-foreground shadow-lg ring-2 ring-slate-300"
                  : "bg-card/60 hover:bg-card/80 border-border text-foreground/80 hover:border-border shadow-md hover:shadow-lg backdrop-blur-sm"
              }`}
            >
              <div
                className={`p-2 rounded-lg transition-all duration-300 ${
                  categoriaSeleccionada === null
                    ? "bg-card/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground group-hover:bg-border"
                }`}
              >
                <Tag className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">Todos</span>
                <span className="text-xs opacity-70">
                  {productos.length} productos
                </span>
              </div>
            </Button>

            {/* Botones de categorías */}
            {categorias.map((categoria: any) => {
              const isSelected = categoriaSeleccionada === categoria.id;
              const colorClass = getCategoriaColor(categoria, isSelected);
              const icon = getCategoriaIcon(categoria);

              return (
                <Button
                  key={categoria.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => onCategoriaChange(categoria.id)}
                  className={`group relative flex items-center gap-3 px-4 py-3 h-12 transition-all duration-300 hover:scale-105 ${
                    isSelected
                      ? `bg-gradient-to-r ${colorClass} text-primary-foreground shadow-lg ring-2 ring-white/50`
                      : "bg-card/60 hover:bg-card/80 border-border text-foreground/80 hover:border-border shadow-md hover:shadow-lg backdrop-blur-sm"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isSelected
                        ? "bg-card/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-border"
                    }`}
                  >
                    <span className="text-sm">{icon}</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium truncate max-w-24">
                      {categoria.nombre}
                    </span>
                    <span className="text-xs opacity-70">
                      {categoria._count?.productos || 0} productos
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Instrucciones de drag & drop */}
        {orderedProducts.length > 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
          >
            <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <GripVertical className="h-4 w-4" />
              Arrastra los productos para reordenarlos a tu preferencia. El
              orden se guardará automáticamente.
            </p>
          </motion.div>
        )}
      </div>

      {/* Grid de productos con drag & drop */}
      <div className="relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card dark:bg-background/20 backdrop-blur-xl rounded-2xl border border-white/30">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
              <Sparkles className="h-6 w-6 absolute -top-2 -right-2 text-purple-500 animate-pulse" />
            </div>
            <p className="mt-4 text-foreground/80 font-medium">
              Cargando productos...
            </p>
            <div className="mt-4 w-32 h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" />
            </div>
          </div>
        ) : orderedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card dark:bg-background/20 backdrop-blur-xl rounded-2xl border border-white/30">
            <div className="p-6 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 mb-6">
              <Package className="h-16 w-16 text-muted-foreground/70" />
            </div>
            <h3 className="text-xl font-semibold text-foreground/80 mb-2">
              No hay productos
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchTerm || categoriaSeleccionada
                ? "No se encontraron productos que coincidan con los filtros seleccionados"
                : "Aún no tienes productos registrados en tu inventario"}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedProducts.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className={`grid gap-6 transition-all duration-300 ${
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1"
                }`}
              >
                <AnimatePresence>
                  {orderedProducts.map((producto: any) => (
                    <SortableProductCard
                      key={producto.id}
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
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>

            <DragOverlay>
              {activeProduct ? (
                <div className="transform rotate-3 scale-105 opacity-90">
                  <ProductCard
                    producto={activeProduct}
                    onAddToCart={() => {}}
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
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
