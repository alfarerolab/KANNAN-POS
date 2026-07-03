"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserIcon, Search, Heart, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface POSHeaderProps {
  tipoNegocio: string;
  tema: { icon: string; accent: string; gradiente?: string };
  clienteSeleccionado: any;
  mascotaSeleccionada: any;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClienteDialogOpen: () => void;
  onMascotaDialogOpen: () => void;
  esVeterinaria: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

/* SLATE PROFESSIONAL — colores sólidos por tipo de negocio, SIN gradientes */
const TIPO_NEGOCIO_CONFIG: Record<string, { icon: string; name: string; color: string }> = {
  RESTAURANTE: { icon: "🍽️", name: "Restaurante",      color: "#f59e0b" },
  TIENDA:      { icon: "🛍️", name: "Tienda",            color: "#10b981" },
  FARMACIA:    { icon: "💊",  name: "Farmacia",          color: "#0891b2" },
  VETERINARIA: { icon: "🐾", name: "Veterinaria",        color: "#7c3aed" },
  BELLEZA:     { icon: "💅", name: "Centro de Belleza",  color: "#e11d48" },
  GIMNASIO:    { icon: "💪", name: "Gimnasio",           color: "#e11d48" },
  LIBRERIA:    { icon: "📚", name: "Librería",           color: "#0369a1" },
  OTRO:        { icon: "🏪", name: "Comercio",           color: "#020617" },
};

export function POSHeader({
  tipoNegocio,
  clienteSeleccionado,
  mascotaSeleccionada,
  searchTerm,
  onSearchChange,
  onClienteDialogOpen,
  onMascotaDialogOpen,
  esVeterinaria,
  searchInputRef,
}: POSHeaderProps) {
  const { toast } = useToast();
  const tipoInfo = TIPO_NEGOCIO_CONFIG[tipoNegocio] ?? TIPO_NEGOCIO_CONFIG.OTRO;

  const handleMascotaClick = () => {
    if (!clienteSeleccionado) {
      toast({ title: "Cliente requerido", description: "Primero debe seleccionar un cliente", variant: "destructive" });
      return;
    }
    onMascotaDialogOpen();
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

        {/* Identidad del negocio */}
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl shadow-sm" style={{ backgroundColor: tipoInfo.color }}>
            <span className="text-2xl">{tipoInfo.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">Punto de Venta</h1>
              <Crown className="h-5 w-5 text-[#f59e0b]" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-medium" style={{ color: tipoInfo.color, borderColor: `${tipoInfo.color}50` }}>
                {tipoInfo.name}
              </Badge>
              {esVeterinaria && (
                <Badge variant="secondary" className="bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/30 text-xs">
                  <Heart className="h-3 w-3 mr-1" /> Veterinaria
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Controles: cliente + búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">

            {/* Cliente */}
            <Button
              variant="outline"
              onClick={onClienteDialogOpen}
              className={`group flex items-center gap-3 px-4 py-3 h-12 min-w-[200px] border-border transition-all duration-200 ${clienteSeleccionado ? "ring-2 ring-[#10b981]/40" : ""}`}
            >
              <div className={`p-2 rounded-lg transition-colors ${clienteSeleccionado ? "bg-[#10b981]/10 text-[#10b981]" : "bg-muted text-muted-foreground"}`}>
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{clienteSeleccionado ? clienteSeleccionado.nombre : "Seleccionar cliente"}</p>
                {clienteSeleccionado && <p className="text-xs text-muted-foreground truncate">{clienteSeleccionado.email || "Cliente frecuente"}</p>}
              </div>
              {clienteSeleccionado && <div className="w-2 h-2 bg-[#10b981] rounded-full flex-shrink-0" />}
            </Button>

            {/* Mascota (solo veterinaria) */}
            {esVeterinaria && (
              <Button
                variant="outline"
                onClick={handleMascotaClick}
                disabled={!clienteSeleccionado}
                className={`group flex items-center gap-3 px-4 py-3 h-12 min-w-[180px] border-border transition-all duration-200 disabled:opacity-50 ${mascotaSeleccionada ? "ring-2 ring-[#7c3aed]/40" : ""}`}
              >
                <div className={`p-2 rounded-lg transition-colors ${mascotaSeleccionada ? "bg-[#7c3aed]/10 text-[#7c3aed]" : "bg-muted text-muted-foreground"}`}>
                  <span className="text-sm">🐾</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{mascotaSeleccionada ? mascotaSeleccionada.nombre : "Seleccionar mascota"}</p>
                  {mascotaSeleccionada && <p className="text-xs text-muted-foreground truncate">{mascotaSeleccionada.especie} • {mascotaSeleccionada.raza || "Sin raza"}</p>}
                </div>
                {mascotaSeleccionada && <div className="w-2 h-2 bg-[#7c3aed] rounded-full flex-shrink-0" />}
              </Button>
            )}
          </div>

          {/* Buscador */}
          <div className="relative min-w-[300px]" data-tour="search-products">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <Input
              ref={searchInputRef}
              placeholder="Buscar productos por nombre, código..."
              className="pl-11 pr-4 h-12 bg-background border-border focus:border-primary rounded-xl placeholder:text-muted-foreground transition-all duration-200"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar productos"
            />
            {searchTerm && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <Badge variant="secondary" className="text-xs px-2 py-0.5">Buscando...</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info cliente / mascota activos */}
      {(clienteSeleccionado || mascotaSeleccionada) && (
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-3">
          {clienteSeleccionado && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#10b981]/10 rounded-lg border border-[#10b981]/30">
              <div className="w-2 h-2 bg-[#10b981] rounded-full" />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Cliente: {clienteSeleccionado.nombre}</span>
              {clienteSeleccionado.telefono && <span className="text-xs text-emerald-600 dark:text-emerald-400">📞 {clienteSeleccionado.telefono}</span>}
            </div>
          )}
          {mascotaSeleccionada && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#7c3aed]/10 rounded-lg border border-[#7c3aed]/30">
              <div className="w-2 h-2 bg-[#7c3aed] rounded-full" />
              <span className="text-sm font-medium text-violet-800 dark:text-violet-300">Mascota: {mascotaSeleccionada.nombre}</span>
              <span className="text-xs text-violet-600 dark:text-violet-400">🐾 {mascotaSeleccionada.especie}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
