"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { User, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Empleado {
  id: string;
  nombre: string;
  imagen: string | null;
  porcentajeComision: number | null;
}

interface SelectEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: any;
  empleados: Empleado[];
  cargandoEmpleados: boolean;
  onConfirm: (empleadoId: string) => void;
}

export function SelectEmployeeDialog({
  open,
  onOpenChange,
  servicio,
  empleados,
  cargandoEmpleados,
  onConfirm,
}: SelectEmployeeDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  // Reset selected ID when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedId("");
    }
  }, [open, servicio]);

  const handleConfirm = () => {
    if (!selectedId) {
      toast.error("Selección obligatoria", {
        description: "Debes seleccionar un empleado antes de agregar este servicio al carrito."
      });
      return;
    }
    onConfirm(selectedId);
    onOpenChange(false);
  };

  if (!servicio) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            ¿Quién realizará este servicio?
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="font-medium text-sm">{servicio.nombre}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Selecciona el empleado para asignar la comisión correspondiente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Empleado responsable</Label>
            {cargandoEmpleados ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando empleados...
              </div>
            ) : (
              <>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className={!selectedId ? "border-red-400 focus:ring-red-400" : "border-green-500"}>
                    <SelectValue placeholder="Seleccionar empleado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <span>{emp.nombre}</span>
                          {emp.porcentajeComision && (
                            <Badge variant="outline" className="text-[10px]">
                              {emp.porcentajeComision}%
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedId && (
                  <p className="text-xs text-red-500 mt-1">Debes seleccionar un empleado para continuar.</p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={cargandoEmpleados || !selectedId}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Agregar al carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
