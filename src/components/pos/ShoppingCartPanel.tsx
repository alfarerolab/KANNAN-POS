// Editado: Importado desde la versión de producción en la VPS
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, X, CreditCard, Trash2, ChevronUp, ChevronDown, Weight, Package, Ruler, Droplets, DollarSign, Beaker, User } from "lucide-react";
import type { ItemCarrito } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

interface ConsumoInterno {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
}

interface ShoppingCartPanelProps {
  items: ItemCarrito[];
  totalItems: number;
  subtotal: number;
  total: number;
  formatearMoneda: (valor: number) => string;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateWeight?: (itemId: string, weight: number) => void;
  onUpdatePrecioLibre?: (itemId: string, precio: number) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenCheckout: () => void;
  onClearCart: () => void;
  isFullWidth?: boolean;
  onBackToCatalog?: () => void;
  onConsumoChange?: (itemId: string, consumos: ConsumoInterno[]) => void;
  empleados?: { id: string; nombre: string }[];
  initialConsumos?: Record<string, ConsumoInterno[]>;
}

export function ShoppingCartPanel({
  items,
  totalItems,
  subtotal,
  total,
  formatearMoneda,
  onUpdateQuantity,
  onUpdateWeight,
  onRemoveItem,
  onOpenCheckout,
  onClearCart,
  onConsumoChange,
  empleados = [],
  initialConsumos,
  isFullWidth = false,
  onBackToCatalog
}: ShoppingCartPanelProps) {
  // Consumos internos por item de servicio
  const [consumosPorItem, setConsumosPorItem] = useState<Record<string, ConsumoInterno[]>>({});
  const [expandidoConsumo, setExpandidoConsumo] = useState<Record<string, boolean>>({});
  const [busquedaProducto, setBusquedaProducto] = useState<Record<string, string>>({});
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Record<string, any[]>>({});
  const [cantidadConsumo, setCantidadConsumo] = useState<Record<string, number>>({});
  const [buscando, setBuscando] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialConsumos && Object.keys(initialConsumos).length > 0) {
      setConsumosPorItem(initialConsumos);
    }
  }, [initialConsumos]);

  const buscarProductosParaConsumo = async (itemId: string, termino: string) => {
    if (termino.length < 2) {
      setResultadosBusqueda(prev => ({ ...prev, [itemId]: [] }));
      return;
    }
    setBuscando(prev => ({ ...prev, [itemId]: true }));
    try {
      const res = await fetch(`/api/pos/productos/buscar?q=${encodeURIComponent(termino)}&soloInventario=true`);
      if (res.ok) {
        const data = await res.json();
        const productos = Array.isArray(data) ? data.slice(0, 6) : (data.productos?.slice(0, 6) || []);
        setResultadosBusqueda(prev => ({ ...prev, [itemId]: productos }));
      }
    } catch { } finally {
      setBuscando(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Debounce búsqueda
  useEffect(() => {
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    Object.entries(busquedaProducto).forEach(([itemId, termino]) => {
      timers[itemId] = setTimeout(() => buscarProductosParaConsumo(itemId, termino), 300);
    });
    return () => Object.values(timers).forEach(clearTimeout);
  }, [busquedaProducto]);

  const [productoSeleccionado, setProductoSeleccionado] = useState<Record<string, any | null>>({});

  const agregarConsumo = (itemId: string, producto: any, cantidadOverride?: number) => {
    const cantidad = cantidadOverride ?? cantidadConsumo[itemId] ?? 1;
    const nuevosConsumos = [
      ...(consumosPorItem[itemId] || []),
      { productoId: producto.id, nombreProducto: producto.nombre, cantidad }
    ];
    setConsumosPorItem(prev => ({ ...prev, [itemId]: nuevosConsumos }));
    setBusquedaProducto(prev => ({ ...prev, [itemId]: '' }));
    setResultadosBusqueda(prev => ({ ...prev, [itemId]: [] }));
    setCantidadConsumo(prev => ({ ...prev, [itemId]: 1 }));
    setProductoSeleccionado(prev => ({ ...prev, [itemId]: null }));
    onConsumoChange?.(itemId, nuevosConsumos);
  };

  const eliminarConsumo = (itemId: string, index: number) => {
    const nuevosConsumos = (consumosPorItem[itemId] || []).filter((_, i) => i !== index);
    setConsumosPorItem(prev => ({ ...prev, [itemId]: nuevosConsumos }));
    onConsumoChange?.(itemId, nuevosConsumos);
  };
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [modoEdicion, setModoEdicion] = useState<"cantidad" | "dinero">("cantidad");
  const [tempValor, setTempValor] = useState<string>("");

  const cartRef = useRef<HTMLDivElement>(null);

  const calcularCantidadDesdeDinero = (item: ItemCarrito, dinero: number): number => {
    const { producto } = item;

    if (dinero <= 0) return 0;

    switch (producto.tipoVenta) {
      case "PESO":
        const precioPorKilo = producto.precioPorKilo || producto.precio || 0;
        if (precioPorKilo > 0) {
          return dinero / precioPorKilo;
        }
        return 0;

      case "METRO":
        const precioPorMetro = producto.precioPorMetro || producto.precio || 0;
        if (precioPorMetro > 0) {
          return dinero / precioPorMetro;
        }
        return 0;

      case "LITRO":
        const precioPorLitro = producto.precioPorLitro || producto.precio || 0;
        if (precioPorLitro > 0) {
          return dinero / precioPorLitro;
        }
        return 0;

      default:
        return 0;
    }
  };

  const formatearCantidad = (valor: number): string => {
    if (valor % 1 === 0) {
      return valor.toString();
    }
    return valor.toFixed(1);
  };

  const handleEditItem = (itemId: string, item: ItemCarrito, modo: "cantidad" | "dinero") => {
    const esPrecioLibre = item.producto.tipoVenta === "PRECIO_LIBRE";

    setEditingItem(itemId);

    // Para PRECIO_LIBRE, siempre usar modo "cantidad" (que en realidad es el precio)
    if (esPrecioLibre) {
      setModoEdicion("cantidad");
      const precioActual = item.precioLibre || item.subtotal || 0;
      setTempValor(precioActual.toString());
    } else {
      setModoEdicion(modo);

      if (modo === "dinero") {
        setTempValor(item.subtotal.toFixed(2));
      } else {
        const esPorPeso = item.producto.tipoVenta === "PESO";
        const esPorMedida = item.producto.tipoVenta === "METRO" || item.producto.tipoVenta === "LITRO";

        if (esPorPeso && item.peso) {
          const pesoStr = item.peso % 1 === 0 ? item.peso.toString() : item.peso.toFixed(2);
          setTempValor(pesoStr);
        } else if (esPorMedida && item.medida) {
          const medidaStr = item.medida % 1 === 0 ? item.medida.toString() : item.medida.toFixed(2);
          setTempValor(medidaStr);
        } else {
          setTempValor("");
        }
      }
    }
  };

  const handleSaveEdit = (itemId: string, item: ItemCarrito) => {
    if (!tempValor || tempValor.trim() === "") {
      setEditingItem(null);
      setTempValor("");
      return;
    }

    const valor = parseFloat(tempValor);

    if (isNaN(valor) || valor <= 0) {
      console.error('Valor inválido:', tempValor);
      setEditingItem(null);
      setTempValor("");
      return;
    }

    const esPrecioLibre = item.producto.tipoVenta === "PRECIO_LIBRE";

    if (onUpdateWeight) {
      if (esPrecioLibre) {
        onUpdateWeight(itemId, valor);
      } else if (modoEdicion === "dinero") {
        const cantidadCalculada = calcularCantidadDesdeDinero(item, valor);
        if (cantidadCalculada > 0) {
          onUpdateWeight(itemId, cantidadCalculada);
        }
      } else {
        onUpdateWeight(itemId, valor);
      }
    }

    setEditingItem(null);
    setTempValor("");
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setTempValor("");
  };

  const renderItemContent = (item: ItemCarrito, isMobile: boolean = false) => {
    const esPorPeso = item.producto.tipoVenta === "PESO";
    const esPorMetro = item.producto.tipoVenta === "METRO";
    const esPorLitro = item.producto.tipoVenta === "LITRO";
    const esPorUnidad = item.producto.tipoVenta === "UNIDAD";
    const esPrecioLibre = item.producto.tipoVenta === "PRECIO_LIBRE";
    const esEditable = esPorPeso || esPorMetro || esPorLitro || esPrecioLibre;

    const getUnidadMedida = () => {
      if (esPorPeso) return '/kg';
      if (esPorMetro) return '/m';
      if (esPorLitro) return '/L';
      if (esPorUnidad) return ' c/u';
      return '';
    };

    const getPrecioUnitario = () => {
      if (esPorPeso) return item.producto.precioPorKilo || item.producto.precio || 0;
      if (esPorMetro) return item.producto.precioPorMetro || item.producto.precio || 0;
      if (esPorLitro) return item.producto.precioPorLitro || item.producto.precio || 0;
      return item.producto.precio || 0;
    };

    const precioUnitario = getPrecioUnitario();
    const unidadMedida = getUnidadMedida();

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -60 }}
        className="group relative bg-background border border-border rounded-xl p-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
      >
        {/* Fila principal: nombre + precio + eliminar */}
        <div className="flex items-start gap-2 mb-2">
          {/* Indicador tipo */}
          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.producto.esServicio ? 'bg-violet-500' : 'bg-primary/60'}`} />

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight text-foreground truncate pr-1">
              {item.producto.nombre}
            </p>
            {item.esCortesia && (
              <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">Cortesía</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-bold text-sm text-foreground">
              {formatearMoneda(item.subtotal)}
            </span>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Fila secundaria: cantidad o edición */}
        <div className="pl-4">
          {esEditable ? (
            <div className="flex-1">
              {editingItem === item.id ? (
                <div className="space-y-2">
                  {!esPrecioLibre && (
                    <div className="flex gap-1 bg-muted rounded-lg border p-1">
                      <Button
                        type="button"
                        variant={modoEdicion === "cantidad" ? "default" : "ghost"}
                        size="sm"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setModoEdicion("cantidad");
                          handleEditItem(item.id, item, "cantidad");
                        }}
                        className="h-6 px-2 text-xs flex-1"
                      >
                        {esPorPeso && <Weight className="h-3 w-3 mr-1" />}
                        {esPorMetro && <Ruler className="h-3 w-3 mr-1" />}
                        {esPorLitro && <Droplets className="h-3 w-3 mr-1" />}
                        {esPorPeso && "Peso"}
                        {esPorMetro && "Metros"}
                        {esPorLitro && "Litros"}
                      </Button>
                      <Button
                        type="button"
                        variant={modoEdicion === "dinero" ? "default" : "ghost"}
                        size="sm"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setModoEdicion("dinero");
                          handleEditItem(item.id, item, "dinero");
                        }}
                        className="h-6 px-2 text-xs flex-1"
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Dinero
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-1 bg-background rounded-lg border p-1">
                    {(modoEdicion === "dinero" || esPrecioLibre) && (
                      <span className="text-xs text-muted-foreground ml-1">$</span>
                    )}
                    <Input
                      type="number"
                      value={tempValor}
                      onChange={(e) => setTempValor(e.target.value)}
                      step={modoEdicion === "dinero" || esPrecioLibre ? "0.01" : (esPorPeso ? "0.01" : "0.1")}
                      min="0"
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(item.id, item); }
                        if (e.key === 'Escape') { e.preventDefault(); handleCancelEdit(); }
                      }}
                    />
                    {modoEdicion === "cantidad" && !esPrecioLibre && (
                      <span className="text-xs text-muted-foreground mr-1">
                        {esPorPeso && 'kg'}{esPorMetro && 'm'}{esPorLitro && 'L'}
                      </span>
                    )}
                  </div>

                  {modoEdicion === "dinero" && !esPrecioLibre && tempValor && parseFloat(tempValor) > 0 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded px-2 py-1">
                      = {formatearCantidad(calcularCantidadDesdeDinero(item, parseFloat(tempValor)))} {esPorPeso && 'kg'}{esPorMetro && 'm'}{esPorLitro && 'L'}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="inline-flex items-center gap-1.5 bg-muted hover:bg-muted/80 rounded-lg px-2 py-1 cursor-pointer transition-colors text-xs font-medium"
                  onClick={() => handleEditItem(item.id, item, "cantidad")}
                >
                  {esPorPeso && <Weight className="h-3 w-3 text-emerald-600" />}
                  {esPorMetro && <Ruler className="h-3 w-3 text-orange-500" />}
                  {esPorLitro && <Droplets className="h-3 w-3 text-cyan-500" />}
                  {esPrecioLibre && <DollarSign className="h-3 w-3 text-amber-500" />}
                  <span>
                    {esPorPeso && item.peso && (item.peso < 1 ? `${(item.peso * 1000).toFixed(0)}g` : `${item.peso % 1 === 0 ? item.peso : item.peso.toFixed(2)} kg`)}
                    {esPorMetro && item.medida && `${item.medida % 1 === 0 ? item.medida : item.medida.toFixed(2)} m`}
                    {esPorLitro && item.medida && `${item.medida % 1 === 0 ? item.medida : item.medida.toFixed(2)} L`}
                    {esPrecioLibre && formatearMoneda(item.precioLibre || 0)}
                  </span>
                  <span className="text-muted-foreground">· {formatearMoneda(precioUnitario)}{unidadMedida}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Controles de cantidad */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.cantidad - 1))}
                  className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-background transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="font-semibold text-xs min-w-[1.5rem] text-center">{item.cantidad}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.cantidad + 1)}
                  className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-background transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <span className="text-xs text-muted-foreground">
                {formatearMoneda(precioUnitario)}{unidadMedida}
              </span>
            </div>
          )}
        </div>

        {/* Sección de consumos internos - solo para servicios */}
        {item.producto.esServicio && (
          <div className="mt-2 border-t border-dashed border-border/60 pt-2">
            {/* Empleado asignado */}
            {item.empleadoId && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex items-center gap-1 bg-violet-100 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/40 rounded-full px-2 py-0.5">
                  <User className="h-2.5 w-2.5 text-violet-600 dark:text-violet-400" />
                  <span className="text-[10px] font-medium text-violet-700 dark:text-violet-300">
                    {empleados.find(e => e.id === item.empleadoId)?.nombre || 'Empleado asignado'}
                  </span>
                </div>
              </div>
            )}

            {/* Toggle consumos */}
            <button
              type="button"
              onClick={() => setExpandidoConsumo(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Beaker className="h-3 w-3" />
                Consumos de inventario
                {(consumosPorItem[item.id]?.length || 0) > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {consumosPorItem[item.id]?.length}
                  </Badge>
                )}
              </span>
              {expandidoConsumo[item.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {expandidoConsumo[item.id] && (
              <div className="mt-2 space-y-2">
                {/* Lista de consumos agregados */}
                {(consumosPorItem[item.id] || []).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-lg px-2 py-1">
                    <Package className="h-3 w-3 text-amber-600 flex-shrink-0" />
                    <span className="text-xs flex-1 truncate text-amber-800 dark:text-amber-300">{c.nombreProducto}</span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">×{c.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => eliminarConsumo(item.id, i)}
                      className="text-amber-500 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Buscar y agregar producto */}
                <div className="space-y-1.5 p-2 bg-muted/40 rounded-lg border border-dashed">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Agregar producto consumido</p>

                  {productoSeleccionado[item.id] ? (
                    /* Producto seleccionado - confirmar cantidad */
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 bg-background rounded-md px-2 py-1.5 border">
                        <Package className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="text-xs flex-1 font-medium truncate">{productoSeleccionado[item.id].nombre}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setProductoSeleccionado(prev => ({ ...prev, [item.id]: null }));
                            setBusquedaProducto(prev => ({ ...prev, [item.id]: '' }));
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={cantidadConsumo[item.id] || 1}
                          onChange={(e) => setCantidadConsumo(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 1 }))}
                          placeholder="Cant."
                          className="h-8 text-xs w-24"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 flex-1 text-xs"
                          onClick={() => agregarConsumo(item.id, productoSeleccionado[item.id])}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Búsqueda */
                    <div className="relative">
                      <Input
                        placeholder="🔍 Escribir nombre del producto..."
                        value={busquedaProducto[item.id] || ''}
                        onChange={(e) => setBusquedaProducto(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      {buscando[item.id] && (
                        <div className="absolute right-2 top-2 h-4 w-4 border-2 border-muted-foreground/50 border-t-transparent rounded-full animate-spin" />
                      )}
                      {(resultadosBusqueda[item.id] || []).length > 0 && (
                        <div className="mt-1 w-full bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                          {(resultadosBusqueda[item.id] || []).map((p: any) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                              onClick={() => {
                                setProductoSeleccionado(prev => ({ ...prev, [item.id]: p }));
                                setResultadosBusqueda(prev => ({ ...prev, [item.id]: [] }));
                                setBusquedaProducto(prev => ({ ...prev, [item.id]: '' }));
                              }}
                            >
                              <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 truncate font-medium">{p.nombre}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">{p.enStock} en stock</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                      {busquedaProducto[item.id] && busquedaProducto[item.id].length < 2 && (
                        <p className="text-[10px] text-muted-foreground mt-1">Escribe al menos 2 caracteres...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <div className="xl:hidden fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative bg-primary text-primary-foreground rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-red-500 text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg border-2 border-background"
              >
                {totalItems}
              </motion.div>
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-blue-400 rounded-full opacity-25 blur-sm"
              />
            </>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="xl:hidden fixed right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl z-[70] flex flex-col"
            >
              {/* Mobile header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Carrito</h2>
                    {totalItems > 0 && (
                      <p className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile items */}
              <div className="flex-1 overflow-y-auto p-3">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                      <ShoppingCart className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="font-medium text-muted-foreground">Carrito vacío</p>
                    <p className="text-sm text-muted-foreground/60 mt-0.5">Agrega productos para comenzar</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => renderItemContent(item, true))}
                  </div>
                )}
              </div>

              {/* Mobile footer */}
              {items.length > 0 && (
                <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}</span>
                    <span className="text-xs text-muted-foreground">{formatearMoneda(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border pt-2">
                    <span className="font-semibold text-sm">Total</span>
                    <span className="font-bold text-lg">{formatearMoneda(total)}</span>
                  </div>

                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCheckout();
                    }}
                    className="w-full font-semibold py-3 text-sm rounded-xl shadow-md"
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Cobrar {formatearMoneda(total)}
                  </Button>

                  <button
                    onClick={onClearCart}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Vaciar carrito
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`flex flex-col flex-shrink-0 min-h-0 h-full transition-all duration-300 ${
        isFullWidth 
          ? "w-full flex-1" 
          : "hidden xl:flex w-72 2xl:w-80"
      }`}>
        <div className="rounded-2xl border border-border bg-card shadow-lg flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div
              className={`px-4 py-3 flex items-center justify-between border-b border-border ${
                isFullWidth ? "" : "cursor-pointer hover:bg-muted/30 transition-colors"
              }`}
              onClick={() => !isFullWidth && setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-2.5">
                {isFullWidth && onBackToCatalog && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBackToCatalog();
                    }}
                    className="h-8 px-2 text-xs font-semibold mr-1"
                  >
                    ← Catálogo
                  </Button>
                )}
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">Carrito</span>
                {totalItems > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0">
                    {totalItems}
                  </Badge>
                )}
              </div>
              {!isFullWidth && (
                <button className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              )}
            </div>

            <AnimatePresence>
              {(isFullWidth || !isMinimized) && (
                <motion.div
                  initial={{ height: "100%", opacity: 1 }}
                  animate={{ height: "100%", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col overflow-hidden w-full h-full min-h-0"
                >
                  {/* Items */}
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <ShoppingCart className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Carrito vacío</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Agrega productos o servicios</p>
                      </div>
                    ) : (
                      <>
                        <div
                          className="p-3 space-y-2 flex-1 overflow-y-auto custom-scrollbar"
                        >
                          {items.map((item) => renderItemContent(item, false))}
                        </div>

                        {/* Totales y acción */}
                        <div className="border-t border-border bg-card/50">
                          {/* Resumen */}
                          <div className="px-4 py-3 space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>{totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}</span>
                              <span>{formatearMoneda(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-sm">Total</span>
                              <span className="font-bold text-lg text-foreground">{formatearMoneda(total)}</span>
                            </div>
                          </div>

                          {/* Botones */}
                          <div className="px-3 pb-3 space-y-1.5">
                            <Button
                              onClick={onOpenCheckout}
                              className="w-full font-semibold py-2.5 text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Cobrar {formatearMoneda(total)}
                            </Button>

                            <button
                              onClick={onClearCart}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/5"
                            >
                              <Trash2 className="h-3 w-3" />
                              Vaciar carrito
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isMinimized && items.length > 0 && (
              <div className="px-4 pb-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{totalItems} artículos</span>
                  <span className="font-bold text-sm">{formatearMoneda(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

    </>
  );
}
