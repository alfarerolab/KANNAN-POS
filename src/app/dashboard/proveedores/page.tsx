"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Eye, Edit, Trash2, Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Proveedor {
  id: string;
  nombre: string;
  empresa?: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  activo: boolean;
  createdAt: string;
  _count: {
    productos: number;
  };
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<boolean | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      
      // Construir parámetros de búsqueda
      const searchParams = new URLSearchParams();
      if (busqueda) {
        searchParams.append('search', busqueda);
      }
      if (filtroActivo !== undefined) {
        searchParams.append('activo', filtroActivo.toString());
      }

      const url = `/api/proveedores${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // La API refactorizada devuelve directamente el array de proveedores
      setProveedores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proveedores",
        variant: "destructive",
      });
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setDeleteDialogOpen(true);
  };

  const eliminarProveedor = async () => {
    if (!selectedProveedor) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/proveedores/${selectedProveedor.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar proveedor');
      }

      toast({
        title: "Proveedor eliminado",
        description: `${selectedProveedor.nombre} ha sido eliminado correctamente`,
      });
      cargarProveedores();
    } catch (error) {
      console.error("Error al eliminar proveedor:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el proveedor",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedProveedor(null);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, [busqueda, filtroActivo]);

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
  };

  const handleFiltroActivo = (value: boolean | undefined) => {
    setFiltroActivo(value);
  };

  const filteredProveedores = proveedores.filter((proveedor) => {
    const matchesSearch = !busqueda || 
      proveedor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.contacto?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchesFilter = filtroActivo === undefined || proveedor.activo === filtroActivo;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  
  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-6 lg:-m-8">
      {/* Banner header */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Proveedores</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona y organiza los proveedores de tu empresa
            </p>
          </div>
          <Link href="/dashboard/proveedores/nuevo">
            <Button className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 lg:px-8 py-4 border-b border-border/60">
          <div>
            <p className="font-semibold text-foreground">Lista de Proveedores</p>
            <p className="text-sm text-muted-foreground">
              {filteredProveedores.length === 0 && (busqueda || filtroActivo !== undefined)
                ? "No se encontraron resultados para tu búsqueda"
                : `${filteredProveedores.length} ${filteredProveedores.length === 1 ? 'proveedor' : 'proveedores'} ${busqueda || filtroActivo !== undefined ? 'encontrado(s)' : 'en total'}`
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedores..."
                className="pl-9 h-9"
                value={busqueda}
                onChange={(e) => handleBusqueda(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-4 border-input hover:bg-muted transition-all duration-200">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                  {filtroActivo !== undefined && (
                    <Badge variant="secondary" className="ml-2">
                      {filtroActivo ? "Activos" : "Inactivos"}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleFiltroActivo(undefined)}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFiltroActivo(true)}>
                  Activos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFiltroActivo(false)}>
                  Inactivos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="px-6 lg:px-8 pb-8 pt-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Proveedor
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Contacto
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Productos
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Estado
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Fecha de Registro
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground py-4 px-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProveedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-32 px-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {busqueda || filtroActivo !== undefined
                              ? "No se encontraron proveedores"
                              : "No hay proveedores registrados"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {busqueda || filtroActivo !== undefined
                              ? "Intenta con otros términos de búsqueda o filtros"
                              : "Crea tu primer proveedor para comenzar"}
                          </p>
                        </div>
                        {!busqueda && filtroActivo === undefined && (
                          <Link href="/dashboard/proveedores/nuevo">
                            <Button variant="outline" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              Crear primer proveedor
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProveedores.map((proveedor) => (
                    <TableRow 
                      key={proveedor.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150"
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                            <span className="text-white text-sm font-semibold">
                              {proveedor.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {proveedor.nombre}
                            </span>
                            {proveedor.empresa && (
                              <span className="text-sm text-muted-foreground">
                                {proveedor.empresa}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          {proveedor.email && (
                            <span className="text-sm text-foreground font-medium">
                              {proveedor.email}
                            </span>
                          )}
                          {proveedor.telefono && (
                            <span className="text-sm text-muted-foreground font-medium">
                              {proveedor.telefono}
                            </span>
                          )}
                          {proveedor.contacto && (
                            <span className="text-xs text-muted-foreground">
                              Contacto: {proveedor.contacto}
                            </span>
                          )}
                          {!proveedor.email && !proveedor.telefono && !proveedor.contacto && (
                            <span className="text-sm text-muted-foreground">
                              Sin información de contacto
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant="secondary" className="font-medium px-2.5 py-1">
                          {proveedor._count?.productos || 0} productos
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge
                          variant={proveedor.activo ? "default" : "secondary"}
                          className={proveedor.activo 
                            ? "bg-emerald-500/15 text-green-800 dark:text-green-300 hover:bg-emerald-500/15" 
                            : "bg-muted text-muted-foreground hover:bg-muted"
                          }
                        >
                          {proveedor.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {new Date(proveedor.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(proveedor.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/proveedores/${proveedor.id}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/proveedores/${proveedor.id}/editar`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-green-700 dark:text-green-400 transition-all duration-200"
                              title="Editar proveedor"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          {(!proveedor._count?.productos || proveedor._count.productos === 0) && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteClick(proveedor)}
                              className="h-9 w-9 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                              title="Eliminar proveedor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Información adicional */}
        {!loading && filteredProveedores.length > 0 && (
          <div className="px-6 lg:px-8 py-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {filteredProveedores.length} proveedor{filteredProveedores.length !== 1 ? 'es' : ''}
              {filtroActivo !== undefined && (
                <span> • Filtro: {filtroActivo ? 'Activos' : 'Inactivos'}</span>
              )}
              {busqueda && (
                <span> • Búsqueda: "{busqueda}"</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              ¿Estás seguro de que deseas eliminar el proveedor{" "}
              <span className="font-semibold text-foreground">
                "{selectedProveedor?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y eliminará permanentemente toda la información del proveedor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={eliminarProveedor}
              disabled={isDeleting}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Eliminando...
                </div>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}