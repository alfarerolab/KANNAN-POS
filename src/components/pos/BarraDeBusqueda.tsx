"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Mic, Square, X, SlidersHorizontal, AlertCircle, Radio, Sparkles } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ProductoVoz {
  id: string | number;
  nombre: string;
  precio: number;
  empresaId: string;
  categoria?: string | { nombre: string; id: string };
  imagen?: string;
  enStock?: number;
  tipoVenta?: "UNIDAD" | "PESO" | "METRO" | "LITRO" | "TIEMPO" | "PRECIO_LIBRE";
}

interface UnifiedSearchBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  categoriaSeleccionada: string | null;
  onCategoriaChange: (categoria: string | null) => void;
  categorias: any[];
  filtroDisponibilidad?: string;
  onFiltroDisponibilidadChange?: (filtro: string) => void;
  mostrarFiltroDisponibilidad?: boolean;
  productos: any[];
  empresaId: string;
  onAddToCart: (producto: any) => void;
  placeholder?: string;
  vistaActual?: "productos" | "servicios";
}

export function UnifiedSearchBar({
  searchTerm,
  onSearchTermChange,
  categoriaSeleccionada,
  onCategoriaChange,
  categorias,
  filtroDisponibilidad = "todos",
  onFiltroDisponibilidadChange,
  mostrarFiltroDisponibilidad = false,
  productos,
  empresaId,
  onAddToCart,
  placeholder = "Buscar productos...",
  vistaActual = "productos"
}: UnifiedSearchBarProps) {
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [voiceAnimation, setVoiceAnimation] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>("");

  // Referencias para evitar problemas de DOM
  const componentMounted = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationInterval = useRef<NodeJS.Timeout>();

  // Hook de búsqueda por voz
  const {
    isListening,
    isVoiceAvailable,
    transcript,
    error: voiceError,
    setupVoiceSearch,
    updateProducts,
    startVoiceSearch,
    stopVoiceSearch
  } = useVoiceSearch({
    lang: 'es-ES',
    continuous: false
  });

  // Verificar si está montado el componente
  useEffect(() => {
    setMounted(true);
    return () => {
      componentMounted.current = false;
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, []);

  // Memoizar productos para evitar re-renders innecesarios
  const productosVoz = useMemo(() => {
    if (!Array.isArray(productos)) return [];

    return productos.map(producto => ({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      empresaId: producto.empresaId,
      categoria: typeof producto.categoria === 'string'
        ? producto.categoria
        : producto.categoria?.nombre || "",
      imagen: producto.imagen,
      enStock: producto.enStock,
      tipoVenta: producto.tipoVenta
    }));
  }, [productos]);

  // Configurar sistema de voz
  useEffect(() => {
    if (!mounted || !isVoiceAvailable) return;

    const timeoutId = setTimeout(() => {
      if (componentMounted.current) {
        try {
          setupVoiceSearch(
            // CALLBACK DE BÚSQUEDA - DEBE LLEGAR CORRECTAMENTE
            (searchTerm: string) => {
              onSearchTermChange(searchTerm);
            },
            // CALLBACK DE AGREGAR PRODUCTO
            (producto: any) => {
              onAddToCart(producto);
            },
            productosVoz
          );
        } catch (error) {
          console.error('Error configurando sistema de voz:', error);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mounted, isVoiceAvailable, setupVoiceSearch, onSearchTermChange, onAddToCart, productosVoz]);

  useEffect(() => {
  }, [searchTerm]);

  // Actualizar productos en el sistema de voz
  useEffect(() => {
    if (isVoiceAvailable && productosVoz.length > 0) {
      updateProducts(productosVoz);
    }
  }, [isVoiceAvailable, productosVoz, updateProducts]);

  // Manejar animación de voz
  useEffect(() => {
    if (isListening) {
      setVoiceStatus("Escuchando...");
      const interval = setInterval(() => {
        setVoiceAnimation(prev => !prev);
      }, 500);
      animationInterval.current = interval;

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
      setVoiceAnimation(false);
      setVoiceStatus("");
    }
  }, [isListening]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F3' && isVoiceAvailable) {
        event.preventDefault();
        handleVoiceToggle();
      }
    };

    if (mounted) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [mounted, isVoiceAvailable]);

  // Manejar toggle de voz
  const handleVoiceToggle = useCallback(async () => {
    if (!isVoiceAvailable) {
      toast({
        title: "Función no disponible",
        description: "Tu navegador no soporta reconocimiento de voz",
        variant: "destructive"
      });
      return;
    }

    // Verificar permisos de micrófono si es posible
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'denied') {
          toast({
            title: "Permisos requeridos",
            description: "Necesitas permitir el acceso al micrófono",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
      }
    }

    try {
      if (isListening) {
        stopVoiceSearch();
      } else {
        startVoiceSearch();
      }
    } catch (error) {
      console.error('Error en búsqueda por voz:', error);
      toast({
        title: "Error de búsqueda por voz",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      });
    }
  }, [isVoiceAvailable, isListening, startVoiceSearch, stopVoiceSearch, toast]);

  const handleClearSearch = () => {
    onSearchTermChange("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getVoiceButtonVariant = () => {
    if (voiceError) return "destructive";
    if (isListening) return "default";
    return "outline";
  };

  const getVoiceButtonIcon = () => {
    if (voiceError) return <AlertCircle className="h-4 w-4" />;
    if (isListening) return <Square className="h-4 w-4" />;
    return <Mic className="h-4 w-4" />;
  };

  const filtrosActivos = [
    categoriaSeleccionada,
    filtroDisponibilidad !== "todos" ? filtroDisponibilidad : null
  ].filter(Boolean).length;

  // No renderizar hasta que esté montado
  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* Barra principal de búsqueda */}
      <Card className="overflow-hidden border-border dark:border-border shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Campo de búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10 pr-10 h-11 border-border dark:border-border focus:border-blue-500 focus:ring-blue-500 bg-card dark:bg-background"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Botón de búsqueda por voz - Solo renderizar si hay soporte */}
            {isVoiceAvailable && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={getVoiceButtonVariant()}
                  size="sm"
                  onClick={handleVoiceToggle}
                  disabled={!!voiceError}
                  className={`h-11 px-4 relative transition-all duration-300 ${
                    isListening
                      ? "bg-red-500 hover:bg-red-600 text-primary-foreground border-red-500"
                      : voiceError
                      ? "bg-destructive/10 text-red-600 dark:text-red-400 border-destructive/30 hover:bg-destructive/15"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/15"
                  }`}
                  title={
                    voiceError 
                      ? voiceError 
                      : isListening 
                      ? "Presiona para detener (F3)" 
                      : "Presiona para hablar (F3)"
                  }
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isListening ? "listening" : "idle"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      {getVoiceButtonIcon()}
                      <span className="text-sm font-medium">
                        {isListening ? "Detener" : voiceError ? "Error" : "Voz"}
                      </span>
                    </motion.div>
                  </AnimatePresence>

                  {/* Indicador de animación de voz */}
                  {isListening && (
                    <motion.div
                      className="absolute inset-0 rounded-md border-2 border-destructive/40"
                      animate={{
                        scale: voiceAnimation ? 1.1 : 1,
                        opacity: voiceAnimation ? 0.5 : 1
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  )}

                  {/* Indicador de onda de sonido */}
                  {isListening && (
                    <div className="absolute -right-1 -top-1">
                      <motion.div
                        className="w-3 h-3 bg-red-500 rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Botón de filtros */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 px-4 border-border dark:border-border hover:bg-muted/50 relative"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {filtrosActivos > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {filtrosActivos}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtros de búsqueda</h4>
                    {filtrosActivos > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onCategoriaChange(null);
                          onFiltroDisponibilidadChange?.("todos");
                        }}
                        className="text-xs h-6 px-2"
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>

                  {/* Filtro por categoría */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">Categoría</label>
                    <Select value={categoriaSeleccionada || "todas"} onValueChange={(value) => onCategoriaChange(value === "todas" ? null : value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las categorías</SelectItem>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por disponibilidad */}
                  {mostrarFiltroDisponibilidad && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground/80">Disponibilidad</label>
                      <Select value={filtroDisponibilidad} onValueChange={(value) => onFiltroDisponibilidadChange?.(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los productos</SelectItem>
                          <SelectItem value="disponible">Solo disponibles</SelectItem>
                          <SelectItem value="agotado">Solo agotados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Estado de búsqueda por voz */}
      <AnimatePresence>
        {(isListening || voiceStatus || voiceError) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className={`border-2 transition-all duration-300 ${
              voiceError
                ? "border-destructive/30 bg-destructive/10/50"
                : isListening
                ? "border-blue-500/30 bg-blue-500/10/50"
                : "border-border bg-muted/50/50"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Icono animado */}
                  <div className={`relative p-2 rounded-full ${
                    voiceError
                      ? "bg-destructive/15"
                      : isListening
                      ? "bg-blue-500/15"
                      : "bg-muted"
                  }`}>
                    {voiceError ? (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    ) : isListening ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <Radio className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </motion.div>
                    ) : (
                      <Mic className="h-5 w-5 text-muted-foreground" />
                    )}

                    {/* Ondas de sonido animadas */}
                    {isListening && !voiceError && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-blue-500/40"
                          animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-blue-400"
                          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeOut", delay: 0.3 }}
                        />
                      </>
                    )}
                  </div>

                  {/* Mensaje de estado */}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      voiceError
                        ? "text-red-800 dark:text-red-300"
                        : isListening
                        ? "text-blue-800 dark:text-blue-300"
                        : "text-foreground"
                    }`}>
                      {voiceError
                        ? "Error en búsqueda por voz"
                        : isListening
                        ? "🎤 Escuchando... Di 'buscar' o 'agregar' + producto"
                        : "Búsqueda por voz"
                      }
                    </p>
                    {voiceStatus && (
                      <p className="text-sm text-muted-foreground mt-1">{voiceStatus}</p>
                    )}
                    {voiceError && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{voiceError}</p>
                    )}
                    {transcript && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 italic">"{transcript}"</p>
                    )}
                  </div>

                  {/* Atajo de teclado */}
                  {!voiceError && (
                    <div className="text-xs text-muted-foreground bg-card dark:bg-background px-2 py-1 rounded border">
                      F3
                    </div>
                  )}
                </div>

                {/* Barra de progreso visual */}
                {isListening && !voiceError && (
                  <div className="mt-3">
                    <div className="h-1 bg-blue-500/15 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                        animate={{
                          x: ["-100%", "100%"],
                          scaleX: [0.5, 1, 0.5]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Información de ayuda para búsqueda por voz */}
      {isVoiceAvailable && !isListening && !voiceError && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-blue-100 bg-blue-500/10/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Tip:</strong> Usa comandos como "buscar café" o "agregar leche" para búsqueda rápida por voz
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}