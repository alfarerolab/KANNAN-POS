"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users, UserIcon } from "lucide-react";
import { servicioClientes } from '@/lib/api-service';
import { useToast } from "@/hooks/use-toast";

interface ClientSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  clienteSeleccionado: any;
  onSelectCliente: (cliente: any) => void;
}

export function ClientSelectionDialog({
  open,
  onOpenChange,
  empresaId,
  clienteSeleccionado,
  onSelectCliente
}: ClientSelectionDialogProps) {
  const { toast } = useToast();
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  const handleSelectCliente = (cliente: any) => {
    onSelectCliente(cliente);
    onOpenChange(false);
    toast({
      title: "Cliente seleccionado",
      description: `${cliente.nombre} asociado a la venta`
    });
  };

  // Cargar clientes cuando se abre el diálogo
  useEffect(() => {
    if (!open || !empresaId) return;

    const cargarClientes = async () => {
      try {
        setCargandoClientes(true);
        const response = await servicioClientes.obtenerClientes({
          busqueda: busquedaCliente,
          empresaId: empresaId
        });
        setClientes(response.datos || []);
      } catch (error) {
        console.error("Error loading clients:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive"
        });
      } finally {
        setCargandoClientes(false);
      }
    };

    cargarClientes();
  }, [open, busquedaCliente, empresaId, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Seleccionar Cliente
          </DialogTitle>
          <DialogDescription>
            Busca y selecciona un cliente para la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              className="pl-9 rounded-lg"
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {cargandoClientes ? (
              <div className="flex justify-center p-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando clientes...</p>
                </div>
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center p-8 bg-muted/50 rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-foreground font-medium">
                  {busquedaCliente
                    ? "No se encontraron clientes"
                    : "No hay clientes registrados"
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {busquedaCliente
                    ? "Intenta con otros términos de búsqueda"
                    : "Puedes procesar la venta sin cliente"
                  }
                </p>
              </div>
            ) : (
              clientes.map((cliente: any) => (
                <div
                  key={cliente.id}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary/30 hover:bg-accent/50 cursor-pointer transition-all duration-200"
                  onClick={() => handleSelectCliente(cliente)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{cliente.nombre}</div>
                      {cliente.email && (
                        <div className="text-sm text-muted-foreground mt-1">{cliente.email}</div>
                      )}
                      {cliente.telefono && (
                        <div className="text-sm text-muted-foreground">{cliente.telefono}</div>
                      )}
                    </div>
                    <div className="p-2 rounded-full bg-primary/10">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {clienteSeleccionado && (
            <Button
              variant="destructive"
              onClick={() => {
                onSelectCliente(null);
                onOpenChange(false);
              }}
            >
              Quitar Cliente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}