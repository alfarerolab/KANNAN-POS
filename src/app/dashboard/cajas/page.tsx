"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Search, Filter, Edit, Trash2, AlertTriangle, Monitor, Boxes, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Caja {
  id: string;
  nombre: string;
  activa: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    turnos: number;
    ventas: number;
    gastos: number;
  };
}

export default function CajasPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [cajas, setCajas] = useState<Caja[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoCaja, setEditandoCaja] = useState<Caja | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<boolean | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState<Caja | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [nombre, setNombre] = useState("");
  const [activa, setActiva] = useState(true);

  // Authorization check
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/iniciar-sesion");
      return;
    }
    const userRole = session.user.role as string;
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(userRole)) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para gestionar las cajas registradoras",
        variant: "destructive",
      });
      router.push("/dashboard");
    }
  }, [session, status, router, toast]);

  useEffect(() => {
    if (session) {
      cargarCajas();
    }
  }, [session]);

  const cargarCajas = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cajas");
      if (!res.ok) throw new Error("No se pudieron cargar las cajas");
      const data = await res.json();
      setCajas(data || []);
    } catch (error: any) {
      console.error("Error al cargar cajas:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron obtener las cajas registradoras",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const abrirDialog = (caja: Caja | null = null) => {
    if (caja) {
      setEditandoCaja(caja);
      setNombre(caja.nombre);
      setActiva(caja.activa);
    } else {
      setEditandoCaja(null);
      setNombre("");
      setActiva(true);
    }
    setDialogOpen(true);
  };

  const guardarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre de la caja es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setProcesando(true);
    try {
      const url = editandoCaja ? `/api/cajas/${editandoCaja.id}` : "/api/cajas";
      const method = editandoCaja ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, activa }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al procesar la solicitud");
      }

      toast({
        title: editandoCaja ? "Caja actualizada" : "Caja creada",
        description: `La caja registradora ha sido ${editandoCaja ? "actualizada" : "creada"} correctamente.`,
      });

      setDialogOpen(false);
      cargarCajas();
    } catch (error: any) {
      console.error("Error al guardar caja:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la caja registradora",
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const toggleEstadoCaja = async (caja: Caja) => {
    try {
      const res = await fetch(`/api/cajas/${caja.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !caja.activa }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "No se pudo cambiar el estado de la caja");
      }

      toast({
        title: "Estado actualizado",
        description: `La caja "${caja.nombre}" ahora está ${!caja.activa ? "Activa" : "Inactiva"}.`,
      });

      cargarCajas();
    } catch (error: any) {
      console.error("Error al cambiar estado:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (caja: Caja) => {
    setSelectedCaja(caja);
    setDeleteDialogOpen(true);
  };

  const eliminarCaja = async () => {
    if (!selectedCaja) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cajas/${selectedCaja.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "No se pudo eliminar la caja");
      }

      toast({
        title: "Caja eliminada",
        description: "La caja registradora ha sido eliminada correctamente",
      });
      await cargarCajas();
    } catch (error: any) {
      console.error("Error al eliminar caja:", error);
      toast({
        title: "No se puede eliminar",
        description: error.message || "La caja tiene operaciones asociadas y no puede ser eliminada. Desactívala en su lugar.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedCaja(null);
    }
  };

  // Filter local state list
  const filteredCajas = cajas.filter((c) => {
    const matchesSearch = !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchesFilter = filtroActivo === undefined || c.activa === filtroActivo;
    return matchesSearch && matchesFilter;
  });

  if (isLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm font-semibold">Cargando cajas registradoras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-6 lg:-m-8">
      {/* Header Banner */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Boxes className="h-6 w-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Cajas Registradoras</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestiona las cajas de flujo de efectivo de tu establecimiento comercial.
            </p>
          </div>
          <Button 
            onClick={() => abrirDialog()}
            className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Nueva Caja
          </Button>
        </div>
      </div>

      {/* Filter Options */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 lg:px-8 py-4 border-b border-border/60">
          <div>
            <p className="font-semibold text-foreground text-sm">Lista de Cajas registradas</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredCajas.length === 0 && (busqueda || filtroActivo !== undefined)
                ? "No se encontraron resultados para tu búsqueda"
                : `${filteredCajas.length} ${filteredCajas.length === 1 ? 'caja' : 'cajas'} registradas en total`
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-9 h-9 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-4 border-input hover:bg-muted transition-all duration-200 text-sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                  {filtroActivo !== undefined && (
                    <Badge variant="secondary" className="ml-2">
                      {filtroActivo ? "Activas" : "Inactivas"}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFiltroActivo(undefined)}>
                  Todas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltroActivo(true)}>
                  Activas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltroActivo(false)}>
                  Inactivas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        <div className="px-6 lg:px-8 pb-8 pt-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Nombre de la Caja
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Fecha de Creación
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Estado
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground py-4 px-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCajas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                      No se encontraron cajas registradoras.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCajas.map((caja) => (
                    <TableRow key={caja.id} className="hover:bg-muted/10 transition-colors border-b border-border/60">
                      <TableCell className="py-4 px-6 font-semibold text-foreground">
                        {caja.nombre}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                        {format(new Date(caja.createdAt), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={caja.activa}
                            onCheckedChange={() => toggleEstadoCaja(caja)}
                          />
                          <Badge variant={caja.activa ? "default" : "secondary"} className="text-[10px] font-bold uppercase tracking-wider">
                            {caja.activa ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirDialog(caja)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(caja)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Dialog: Create/Edit Caja */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={guardarCaja}>
            <DialogHeader>
              <DialogTitle>{editandoCaja ? "Editar Caja Registradora" : "Nueva Caja Registradora"}</DialogTitle>
              <DialogDescription>
                Ingresa los datos correspondientes para la caja registradora.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm font-semibold">Nombre de la Caja *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. Caja Principal, Caja Segundo Piso"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={procesando}
                  required
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="activa" className="text-sm font-semibold">Estado de la Caja</Label>
                  <p className="text-xs text-muted-foreground">Indica si está disponible para abrir turnos</p>
                </div>
                <Switch
                  id="activa"
                  checked={activa}
                  onCheckedChange={setActiva}
                  disabled={procesando}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={procesando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={procesando} className="bg-primary hover:bg-primary/90 text-white font-semibold">
                {procesando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  editandoCaja ? "Guardar Cambios" : "Crear Caja"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              ¿Estás seguro de eliminar esta caja?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la caja registradora <strong>{selectedCaja?.nombre}</strong>. Solo puedes eliminar cajas que no tengan movimientos contables asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setSelectedCaja(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                eliminarCaja();
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
