"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Scissors,
  Clock,
  Calendar,
  Star,
  Sparkles,
  UserCheck,
  CheckCircle,
  CalendarPlus,
  Eye,
  Plus,
  Stethoscope,
  ShoppingCart,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Categoria {
  id: string;
  nombre: string;
}

interface CitaCount {
  citas: number;
}

interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion: number;
  activo: boolean;
  categoria?: Categoria;
  _count?: CitaCount;
}

interface ServiceCardProps {
  servicio: Servicio;
  onSelectService: (servicio: Servicio) => void;
  onAddToCart?: (servicio: Servicio) => void;
  formatearMoneda: (valor: number) => string;
  isPopular?: boolean;
  viewMode?: 'grid' | 'list';
  redirectToCitas?: boolean;
}

const getServiceConfig = (categoria?: Categoria, isPopular?: boolean) => {
  const servicioConfig = {
    icon: Scissors,
    colorClass: "text-white",
    solidBg: "bg-[#020617]",
    borderColorClass: "border-[#020617]/30",
    bgColorClass: "bg-[#020617]/10",
    textColorClass: "text-slate-700 dark:text-slate-300",
    buttonBgClass: "bg-[#020617] hover:bg-[#0f172a] text-white",
    label: "Servicio"
  };

  if (categoria) {
    const categoriaLower = categoria.nombre.toLowerCase();

    if (categoriaLower.includes('corte') || categoriaLower.includes('pelo')) {
      return {
        icon: Scissors,
        colorClass: "text-white",
        solidBg: "bg-[#7c3aed]",
        borderColorClass: "border-[#7c3aed]/30",
        bgColorClass: "bg-[#7c3aed]/10",
        textColorClass: "text-violet-700 dark:text-violet-400",
        buttonBgClass: "bg-[#7c3aed] hover:bg-violet-700 text-white",
        label: "Corte & Estilo"
      };
    }

    if (categoriaLower.includes('belleza') || categoriaLower.includes('estetica')) {
      return {
        icon: Sparkles,
        colorClass: "text-white",
        solidBg: "bg-[#e11d48]",
        borderColorClass: "border-[#e11d48]/30",
        bgColorClass: "bg-[#e11d48]/10",
        textColorClass: "text-rose-700 dark:text-rose-400",
        buttonBgClass: "bg-[#e11d48] hover:bg-rose-700 text-white",
        label: "Belleza"
      };
    }

    if (categoriaLower.includes('salud') || categoriaLower.includes('medicina')) {
      return {
        icon: Stethoscope,
        colorClass: "text-white",
        solidBg: "bg-[#10b981]",
        borderColorClass: "border-[#10b981]/30",
        bgColorClass: "bg-[#10b981]/10",
        textColorClass: "text-emerald-700 dark:text-emerald-400",
        buttonBgClass: "bg-[#10b981] hover:bg-emerald-600 text-white",
        label: "Salud"
      };
    }

    if (categoriaLower.includes('limpieza') || categoriaLower.includes('hogar')) {
      return {
        icon: CheckCircle,
        colorClass: "text-white",
        solidBg: "bg-[#0891b2]",
        borderColorClass: "border-[#0891b2]/30",
        bgColorClass: "bg-[#0891b2]/10",
        textColorClass: "text-cyan-700 dark:text-cyan-400",
        buttonBgClass: "bg-[#0891b2] hover:bg-cyan-700 text-white",
        label: "Limpieza"
      };
    }

    if (categoriaLower.includes('consulta') || categoriaLower.includes('asesoria')) {
      return {
        icon: UserCheck,
        colorClass: "text-white",
        solidBg: "bg-[#0369a1]",
        borderColorClass: "border-[#0369a1]/30",
        bgColorClass: "bg-[#0369a1]/10",
        textColorClass: "text-blue-700 dark:text-blue-400",
        buttonBgClass: "bg-[#0369a1] hover:bg-blue-800 text-white",
        label: "Consultoría"
      };
    }
  }

  if (isPopular) {
    return {
      icon: Star,
      colorClass: "text-white",
      solidBg: "bg-[#f59e0b]",
      borderColorClass: "border-[#f59e0b]/30",
      bgColorClass: "bg-[#f59e0b]/10",
      textColorClass: "text-amber-700 dark:text-amber-400",
      buttonBgClass: "bg-[#f59e0b] hover:bg-amber-600 text-white",
      label: "Popular"
    };
  }

  return servicioConfig;
};

export function ServiceCard({
  servicio,
  onSelectService,
  onAddToCart,
  formatearMoneda,
  isPopular = false,
  viewMode = 'grid',
  redirectToCitas = true
}: ServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const serviceConfig = getServiceConfig(servicio.categoria, isPopular);
  const IconComponent = serviceConfig.icon;

  const handleSelectService = async () => {
    if (!servicio.activo) return;
    setIsSelecting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      onSelectService(servicio);
    } catch (error) {
      console.error('Error al seleccionar servicio:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleAddDirectly = async () => {
    if (!onAddToCart || !servicio.activo) return;
    setIsSelecting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      onAddToCart(servicio);
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 w-full"
      >
        <Card
          className={cn(
            "group cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
            serviceConfig.borderColorClass.replace('border-', 'border-l-'),
            !servicio.activo && "opacity-60",
            isPopular && "ring-2 ring-amber-200 border-l-amber-400"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {/* Fila principal */}
              <div className="flex items-start gap-3">
                {/* Icono */}
                <div className={cn("w-12 h-12 rounded-lg", serviceConfig.solidBg)}>
                  <IconComponent className={cn("h-6 w-6", serviceConfig.colorClass)} />
                  {isPopular && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <Star className="h-2 w-2 text-primary-foreground fill-white" />
                    </div>
                  )}
                </div>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <h3 className="font-semibold text-base sm:text-lg">{servicio.nombre}</h3>
                    <Badge variant="outline" className={cn("text-xs shrink-0", serviceConfig.bgColorClass, serviceConfig.textColorClass)}>
                      {serviceConfig.label}
                    </Badge>
                    {isPopular && (
                      <Badge className="text-xs bg-amber-500/15 text-amber-800 dark:text-amber-300 shrink-0">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Popular
                      </Badge>
                    )}
                  </div>

                  {servicio.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {servicio.descripcion}
                    </p>
                  )}

                  {/* Info inferior */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-bold text-green-600 dark:text-green-400 shrink-0">
                      {formatearMoneda(servicio.precio)}
                    </span>

                    <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatDuration(servicio.duracion)}</span>
                    </div>

                    {servicio._count?.citas && servicio._count.citas > 0 && (
                      <div className="flex items-center gap-1 shrink-0 text-blue-600 dark:text-blue-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{servicio._count.citas} citas</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones - siempre abajo en móvil */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailsDialog(true)}
                  className="shrink-0"
                >
                  <Eye className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Ver</span>
                </Button>

                {onAddToCart && (
                  <Button
                    onClick={handleAddDirectly}
                    disabled={!servicio.activo || isSelecting}
                    size="sm"
                    className={cn(
                      "flex-1 transition-all duration-200",
                      serviceConfig.buttonBgClass,
                      isSelecting && "scale-95"
                    )}
                  >
                    {isSelecting ? (
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        <span className="text-sm">Agregar</span>
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleSelectService}
                  disabled={!servicio.activo || isSelecting}
                  size="sm"
                  className={cn(
                    "flex-1 transition-all duration-200",
                    serviceConfig.buttonBgClass,
                    isSelecting && "scale-95"
                  )}
                >
                  {isSelecting ? (
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CalendarPlus className="h-4 w-4 mr-1" />
                      <span className="text-sm">Programar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
      >
        <Card
          className={cn(
            "group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 border border-border/50 hover:border-indigo-500/30 h-full relative overflow-hidden flex flex-col bg-card/40 backdrop-blur-sm",
            !servicio.activo && "opacity-60 grayscale",
            isPopular && "border-amber-500/50 hover:border-amber-500/70 shadow-amber-500/5",
            isHovered && "translate-y-[-4px]"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isPopular && (
            <div className="absolute top-2 right-2 z-10">
              <Badge className="bg-amber-500 text-primary-foreground text-xs">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Popular
              </Badge>
            </div>
          )}

          <CardContent className="p-5 h-full flex flex-col">
            {/* Header con icono y badge */}
            <div className="flex justify-between items-start mb-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", serviceConfig.solidBg, "shadow-" + serviceConfig.solidBg.split('-')[1] + "/20")}>
                <IconComponent className={cn("h-6 w-6", serviceConfig.colorClass)} />
                {isPopular && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <Star className="h-2 w-2 text-primary-foreground fill-white" />
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border-transparent", serviceConfig.bgColorClass, serviceConfig.textColorClass)}>
                  {serviceConfig.label}
                </Badge>

                {!servicio.activo && (
                  <Badge variant="secondary" className="text-xs">
                    Inactivo
                  </Badge>
                )}
              </div>
            </div>

            {/* Información del servicio */}
            <div className="flex-1 flex flex-col min-w-0 mt-2">
              <h3 className="font-bold text-lg mb-1.5 line-clamp-2 text-foreground group-hover:text-primary transition-colors">{servicio.nombre}</h3>

              {servicio.descripcion && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{servicio.descripcion}</p>
              )}

              {/* Precio y duración */}
              <div className="mb-5 mt-auto">
                <div className="text-2xl font-black text-foreground mb-2 flex items-baseline gap-1">
                  {formatearMoneda(servicio.precio)}
                  <span className="text-xs text-muted-foreground font-normal">COP</span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{formatDuration(servicio.duracion)}</span>
                </div>
              </div>

              {/* Información adicional */}
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-5 p-2.5 rounded-xl bg-background/50 border border-border/40">
                {servicio._count?.citas && servicio._count.citas > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{servicio._count.citas} citas agendadas</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Disponible hoy</span>
                  </div>
                )}

                {servicio.categoria && (
                  <span className="opacity-70">
                    {servicio.categoria.nombre}
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2.5 mt-auto pt-4 border-t border-border/40">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailsDialog(true)}
                  className="flex-1 rounded-xl bg-background/50 hover:bg-background border-border/50"
                >
                  <Eye className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  Ver más
                </Button>

                {onAddToCart && (
                  <Button
                    onClick={handleAddDirectly}
                    disabled={!servicio.activo || isSelecting}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                )}
              </div>

              <Button
                onClick={handleSelectService}
                disabled={!servicio.activo || isSelecting}
                className={cn(
                  "w-full transition-all duration-300 rounded-xl shadow-md",
                  serviceConfig.buttonBgClass,
                  "hover:shadow-lg",
                  isSelecting && "scale-[0.98] opacity-90"
                )}
              >
                <AnimatePresence mode="wait">
                  {isSelecting ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      <span>Programando...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="add"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      <span>Programar Cita</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog de detalles */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconComponent className={cn("h-5 w-5", serviceConfig.colorClass)} />
              <span>{servicio.nombre}</span>
              {isPopular && (
                <Badge className="bg-amber-500 text-primary-foreground">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Popular
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Precio:</Label>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatearMoneda(servicio.precio)}</p>
              </div>

              <div>
                <Label className="font-medium">Duración:</Label>
                <p className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(servicio.duracion)}</span>
                </p>
              </div>

              <div>
                <Label className="font-medium">Estado:</Label>
                <Badge variant={servicio.activo ? "default" : "secondary"} className="text-xs">
                  {servicio.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              {servicio.categoria && (
                <div>
                  <Label className="font-medium">Categoría:</Label>
                  <p>{servicio.categoria.nombre}</p>
                </div>
              )}

              {servicio._count?.citas && servicio._count.citas > 0 && (
                <div className="col-span-2">
                  <Label className="font-medium">Citas programadas:</Label>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{servicio._count.citas} citas</span>
                  </p>
                </div>
              )}
            </div>

            {servicio.descripcion && (
              <div>
                <Label className="font-medium">Descripción:</Label>
                <p className="text-sm text-muted-foreground mt-1">{servicio.descripcion}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {onAddToCart && servicio.activo && (
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleAddDirectly();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Agregar al carrito
                </Button>
              )}

              <Button
                onClick={() => {
                  setShowDetailsDialog(false);
                  handleSelectService();
                }}
                disabled={!servicio.activo}
                className={cn("flex-1", serviceConfig.buttonBgClass)}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Programar Cita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}