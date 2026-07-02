"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Users, Heart } from "lucide-react";

interface POSHeaderSectionProps {
  nombreEmpresa: string;
  clienteSeleccionado: any;
  mascotaSeleccionada?: any;
  esVeterinaria: boolean;
  onOpenClientDialog: () => void;
  onOpenMascotaDialog?: () => void;
}

export function POSHeaderSection({
  nombreEmpresa,
  clienteSeleccionado,
  mascotaSeleccionada,
  esVeterinaria,
  onOpenClientDialog,
  onOpenMascotaDialog
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
              {/* Información del cliente */}
              <Button
                variant={clienteSeleccionado ? "default" : "outline"}
                onClick={onOpenClientDialog}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                {clienteSeleccionado ? clienteSeleccionado.nombre : "Seleccionar Cliente"}
              </Button>

              {/* Información de la mascota (veterinarias) */}
              {esVeterinaria && onOpenMascotaDialog && (
                <Button
                  variant={mascotaSeleccionada ? "default" : "outline"}
                  onClick={onOpenMascotaDialog}
                  className="flex items-center gap-2"
                  disabled={!clienteSeleccionado}
                >
                  <Heart className="h-4 w-4" />
                  {mascotaSeleccionada ? mascotaSeleccionada.nombre : "Seleccionar Mascota"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}