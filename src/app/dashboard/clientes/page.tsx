"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Trash, AlertTriangle, Mail, Phone, Users, UserCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  createdAt: string;
}

export default function ClientesPage() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await fetch("/api/clientes");
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          throw new Error("Error al cargar clientes");
        }
        
        const data = await response.json();
        if (data && Array.isArray(data.datos)) {
          setClientes(data.datos);
        } else if (Array.isArray(data)) {
          setClientes(data);
        } else {
          console.error("API response structure is not valid:", data);
          setClientes([]);
          toast({
            title: "Error",
            description: "La respuesta del servidor no es válida",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error:", error);
        setClientes([]);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientes();
  }, [toast]);

  const handleDeleteClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCliente) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clientes/${selectedCliente.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error al eliminar el cliente");
      }

      setClientes(clientes.filter((c) => c.id !== selectedCliente.id));

      toast({
        title: "Cliente eliminado",
        description: `${selectedCliente.nombre} ha sido eliminado correctamente`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el cliente",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedCliente(null);
    }
  };

  const filteredClientes = Array.isArray(clientes) ? clientes.filter(
    (cliente) =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.email && cliente.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cliente.telefono && cliente.telefono.includes(searchTerm))
  ) : [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-500 to-indigo-600",
      "from-green-500 to-emerald-600", 
      "from-purple-500 to-violet-600",
      "from-orange-500 to-red-600",
      "from-pink-500 to-rose-600",
      "from-cyan-500 to-blue-600"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  const clientesConEmail = clientes.filter(c => c.email).length;
  const clientesNuevos = clientes.filter(c =>
    new Date(c.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-6 lg:-m-8">
      {/* Banner header */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu base de clientes y sus datos de contacto
            </p>
          </div>
          <Link href="/dashboard/clientes/nuevo">
            <Button className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60 border-b border-border/60">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
              <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Con Email</p>
              <p className="text-2xl font-bold text-foreground">{clientesConEmail}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Nuevos (30 días)</p>
              <p className="text-2xl font-bold text-foreground">{clientesNuevos}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 lg:px-8 py-4 border-b border-border/60">
          <div>
            <p className="font-semibold text-foreground">Listado de Clientes</p>
            <p className="text-sm text-muted-foreground">
              {filteredClientes.length === 0 && searchTerm
                ? "No se encontraron resultados para tu búsqueda"
                : `${filteredClientes.length} ${filteredClientes.length === 1 ? 'cliente' : 'clientes'} ${searchTerm ? 'encontrado(s)' : 'registrado(s)'}`
              }
            </p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 lg:px-8 pb-8 pt-4">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Cliente
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Contacto
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Dirección
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Registro
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground py-4 px-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-32 px-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {searchTerm
                              ? "No se encontraron clientes"
                              : "No hay clientes registrados"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm
                              ? "Intenta con otros términos de búsqueda"
                              : "Registra tu primer cliente para comenzar"}
                          </p>
                        </div>
                        {!searchTerm && (
                          <Link href="/dashboard/clientes/nuevo">
                            <Button variant="outline" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              Registrar primer cliente
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow 
                      key={cliente.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150"
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarColor(cliente.nombre)} flex items-center justify-center shadow-sm`}>
                            <span className="text-white text-sm font-semibold">
                              {getInitials(cliente.nombre)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {cliente.nombre}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-2">
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <span className="text-foreground truncate font-medium">{cliente.email}</span>
                            </div>
                          )}
                          {cliente.telefono && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span className="text-foreground font-medium">{cliente.telefono}</span>
                            </div>
                          )}
                          {!cliente.email && !cliente.telefono && (
                            <span className="text-sm text-muted-foreground">Sin datos de contacto</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-muted-foreground font-medium">
                          {cliente.direccion || "Sin dirección"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {new Date(cliente.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(cliente.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/clientes/${cliente.id}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteClick(cliente)}
                            className="h-9 w-9 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                            title="Eliminar cliente"
                          >
                            <Trash className="h-4 w-4" />
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
              ¿Estás seguro de que deseas eliminar al cliente{" "}
              <span className="font-semibold text-foreground">
                "{selectedCliente?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y se perderá toda la información asociada al cliente.
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
              onClick={handleDeleteConfirm}
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