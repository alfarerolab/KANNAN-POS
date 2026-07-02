"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Plus, Search, Edit, Trash, AlertTriangle, Mail, Phone, Users, UserCheck, UserPlus, Shield, Crown, User as UserIcon } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { esAdminOGerente } from "@/lib/auth/auth";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  telefono: string | null;
  imagen: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await fetch("/api/usuarios");
        if (!response.ok) throw new Error("Error al cargar usuarios");
        const data = await response.json();
        setUsuarios(data.datos);
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsuarios();
  }, [toast]);

  const handleDeleteClick = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUsuario) return;

    // No permitir eliminar al propio usuario
    if (selectedUsuario.id === session?.user.id) {
      toast({
        title: "Acción no permitida",
        description: "No puedes eliminar tu propio usuario",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/usuarios/${selectedUsuario.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar el usuario");

      // Actualizar la lista de usuarios
      setUsuarios(usuarios.filter((u) => u.id !== selectedUsuario.id));

      toast({
        title: "Usuario eliminado",
        description: `${selectedUsuario.nombre} ha sido eliminado correctamente`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const filteredUsuarios = usuarios.filter(
    (usuario) =>
      usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para generar las iniciales del nombre
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

  const getRoleIcon = (rol: string) => {
    switch (rol) {
      case "ADMINISTRADOR":
        return <Shield className="h-4 w-4" />;
      case "GERENTE":
        return <Crown className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (rol: string) => {
    switch (rol) {
      case "ADMINISTRADOR":
        return "default";
      case "GERENTE":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Determinar si el usuario actual tiene permisos para crear/editar usuarios
  const canManageUsers = session && esAdminOGerente(session.user.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  const administradores = usuarios.filter(u => u.rol === "ADMINISTRADOR" || u.rol === "GERENTE").length;
  const empleados = usuarios.filter(u => u.rol === "EMPLEADO").length;
  const usuariosNuevos = usuarios.filter(u =>
    new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-6 lg:-m-8">
      {/* Banner header */}
      <div className="relative px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              Administra los usuarios y permisos del sistema
            </p>
          </div>
          {canManageUsers && (
            <Link href="/dashboard/usuarios/nuevo">
              <Button className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto">
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60 border-b border-border/60">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
              <p className="text-2xl font-bold text-foreground">{usuarios.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Administradores</p>
              <p className="text-2xl font-bold text-foreground">{administradores}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Nuevos (30 días)</p>
              <p className="text-2xl font-bold text-foreground">{usuariosNuevos}</p>
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
            <p className="font-semibold text-foreground">Listado de Usuarios</p>
            <p className="text-sm text-muted-foreground">
              {filteredUsuarios.length === 0 && searchTerm
                ? "No se encontraron resultados para tu búsqueda"
                : `${filteredUsuarios.length} ${filteredUsuarios.length === 1 ? 'usuario' : 'usuarios'} ${searchTerm ? 'encontrado(s)' : 'registrado(s)'}`
              }
            </p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 lg:px-8 pb-8 pt-2">
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Usuario
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Contacto
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Rol
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
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-32 px-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {searchTerm
                              ? "No se encontraron usuarios"
                              : "No hay usuarios registrados"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm
                              ? "Intenta con otros términos de búsqueda"
                              : "Registra el primer usuario para comenzar"}
                          </p>
                        </div>
                        {!searchTerm && canManageUsers && (
                          <Link href="/dashboard/usuarios/nuevo">
                            <Button variant="outline" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              Registrar primer usuario
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow 
                      key={usuario.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150"
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarColor(usuario.nombre)} flex items-center justify-center shadow-sm`}>
                            {usuario.imagen ? (
                              <AvatarImage src={usuario.imagen} alt={usuario.nombre} />
                            ) : (
                              <span className="text-white text-sm font-semibold">
                                {getInitials(usuario.nombre)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {usuario.nombre}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-foreground truncate font-medium">{usuario.email}</span>
                          </div>
                          {usuario.telefono && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span className="text-foreground font-medium">{usuario.telefono}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge
                          variant={getRoleBadgeVariant(usuario.rol)}
                          className="flex items-center gap-1.5 w-fit px-2.5 py-1"
                        >
                          {getRoleIcon(usuario.rol)}
                          <span className="font-medium tracking-wide">{usuario.rol}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {new Date(usuario.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(usuario.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <div className="flex justify-end gap-2">
                          {canManageUsers && (
                            <>
                              <Link href={`/dashboard/usuarios/${usuario.id}`}>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                                  title="Editar usuario"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteClick(usuario)}
                                className="h-9 w-9 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                                title="Eliminar usuario"
                                disabled={usuario.id === session?.user.id}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </>
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
              ¿Estás seguro de que deseas eliminar al usuario{" "}
              <span className="font-semibold text-foreground">
                "{selectedUsuario?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y se perderá toda la información asociada al usuario.
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

      {/* Help Section */}
      <div className="px-6 lg:px-8 pb-8 mt-4">
        <Card className="bg-blue-500/10/50 border-blue-500/30/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Gestión de Usuarios
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Los usuarios con rol de Administrador tienen acceso completo al sistema, 
                  los Gerentes pueden gestionar productos y ventas, y los Empleados solo pueden realizar ventas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}