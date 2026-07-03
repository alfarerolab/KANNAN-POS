"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Users, Heart, Columns, LayoutGrid, ShoppingCart } from "lucide-react";

interface POSHeaderSectionProps {
  nombreEmpresa: string;
  clienteSeleccionado: any;
  mascotaSeleccionada?: any;
  esVeterinaria: boolean;
  onOpenClientDialog: () => void;
  onOpenMascotaDialog?: () => void;
  layoutMode: "split" | "catalog" | "cart";
  onLayoutModeChange: (mode: "split" | "catalog" | "cart") => void;
  totalItems: number;
}

export function POSHeaderSection({
  nombreEmpresa,
  clienteSeleccionado,
  mascotaSeleccionada,
  esVeterinaria,
  onOpenClientDialog,
  onOpenMascotaDialog,
  layoutMode,
  onLayoutModeChange,
  totalItems
}: POSHeaderSectionProps) {
  return (
    <div className="mb-2">
      <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardContent className="p-3 lg:p-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 lg:p-2.5 rounded-xl bg-primary">
                <Store className="h-5 w-5 lg:h-6 lg:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                  Punto de Venta
                </h1>
                <p className="text-sm text-muted-foreground">
                  {nombreEmpresa}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botón de Carrito (móvil y responsive) */}
              <Button
                variant={layoutMode === "cart" ? "default" : "outline"}
                onClick={() => onLayoutModeChange(layoutMode === "cart" ? "catalog" : "cart")}
                className="relative flex items-center gap-2 px-3 lg:hidden h-9"
              >
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center p-0 text-xs font-bold border border-background">
                    {totalItems}
                  </Badge>
                )}
              </Button>

              {/* Botones de Layout en pantallas medianas y grandes */}
              <div className="hidden lg:flex items-center bg-muted p-1 rounded-xl border mr-2">
                <Button
                  type="button"
                  variant={layoutMode === "split" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onLayoutModeChange("split")}
                  className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all ${
                    layoutMode === "split"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Columns className="h-3.5 w-3.5 mr-1" />
                  Dividida
                </Button>
                <Button
                  type="button"
                  variant={layoutMode === "catalog" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onLayoutModeChange("catalog")}
                  className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all ${
                    layoutMode === "catalog"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                  Catálogo
                </Button>
                <Button
                  type="button"
                  variant={layoutMode === "cart" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onLayoutModeChange("cart")}
                  className={`h-8 px-3 text-xs font-semibold rounded-lg transition-all relative ${
                    layoutMode === "cart"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                  Carrito
                  {totalItems > 0 && (
                    <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold">
                      {totalItems}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Información del cliente */}
              <Button
                variant={clienteSeleccionado ? "default" : "outline"}
                onClick={onOpenClientDialog}
                className="flex items-center gap-2 text-xs sm:text-sm h-9 sm:h-10"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {clienteSeleccionado ? clienteSeleccionado.nombre : "Seleccionar Cliente"}
                </span>
                <span className="sm:hidden">
                  {clienteSeleccionado ? clienteSeleccionado.nombre.split(' ')[0] : "Cliente"}
                </span>
              </Button>

              {/* Información de la mascota (veterinarias) */}
              {esVeterinaria && onOpenMascotaDialog && (
                <Button
                  variant={mascotaSeleccionada ? "default" : "outline"}
                  onClick={onOpenMascotaDialog}
                  className="flex items-center gap-2 text-xs sm:text-sm h-9 sm:h-10"
                  disabled={!clienteSeleccionado}
                >
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {mascotaSeleccionada ? mascotaSeleccionada.nombre : "Seleccionar Mascota"}
                  </span>
                  <span className="sm:hidden">
                    {mascotaSeleccionada ? mascotaSeleccionada.nombre : "Mascota"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}