"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Plus, Search, Edit, Trash, AlertTriangle, Check, X, Building } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAutorizacion } from "@/hooks/use-autorizacion";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  activo: boolean;
  createdAt: string;
  empresa: {
    id: string;
    nombre: string;
    activa: boolean;
  };
}

interface Empresa {
  id: string;
  nombre: string;
  activa: boolean;
}

// Tipo para estadísticas dinámicas
interface EstadisticasUsuarios {
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosNuevos: number;
  usuariosPorRol: Record<string, number>; // Cambiado para ser dinámico
}

export default function SuperAdminUsuariosPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { esSuperAdmin } = useAutorizacion();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all");
  const [selectedRol, setSelectedRol] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Estadísticas dinámicas
  const [estadisticas, setEstadisticas] = useState<EstadisticasUsuarios>({
    totalUsuarios: 0,
    usuariosActivos: 0,
    usuariosNuevos: 0,
    usuariosPorRol: {}
  });

  // Obtener todos los roles únicos de los usuarios
  const rolesUnicos = Array.from(new Set(usuarios.map(u => u.rol))).sort();

  useEffect(() => {
    // Verificar autorización
    const checkAuthorization = () => {
      if (!session) {
        setIsAuthorized(null);
        return;
      }

      if (session.user.role !== "SUPERADMIN" || !esSuperAdmin) {
        setIsAuthorized(false);
        router.push("/dashboard");
        return;
      }

      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [session, esSuperAdmin, router]);

  // Función para calcular estadísticas
  const calcularEstadisticas = (usuariosList: Usuario[]) => {
    const totalUsuarios = usuariosList.length;
    const usuariosActivos = usuariosList.filter(u => u.activo).length;

    // Calcular usuarios nuevos (últimos 30 días)
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
    const usuariosNuevos = usuariosList.filter(u =>
      new Date(u.createdAt) >= hace30Dias
    ).length;

    // Calcular usuarios por rol de forma dinámica
    const usuariosPorRol = usuariosList.reduce((acc: Record<string, number>, usuario) => {
      acc[usuario.rol] = (acc[usuario.rol] || 0) + 1;
      return acc;
    }, {});

    return {
      totalUsuarios,
      usuariosActivos,
      usuariosNuevos,
      usuariosPorRol
    };
  };

  useEffect(() => {
    if (isAuthorized !== true) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Cargar usuarios
        const usuariosResponse = await fetch("/api/administrador/usuarios");
        if (!usuariosResponse.ok) {
          const errorText = await usuariosResponse.text();
          console.error("Error response usuarios:", errorText);
          throw new Error(`Error al cargar usuarios: ${usuariosResponse.status}`);
        }

        const usuariosData = await usuariosResponse.json();
        // Cargar empresas para el filtro
        const empresasResponse = await fetch("/api/administrador/empresas");
        if (!empresasResponse.ok) {
          const errorText = await empresasResponse.text();
          console.error("Error response empresas:", errorText);
          throw new Error(`Error al cargar empresas: ${empresasResponse.status}`);
        }

        const empresasData = await empresasResponse.json();
        const usuariosList = usuariosData.data || usuariosData || [];
        const empresasList = empresasData.datos || empresasData.data || empresasData || [];

        setUsuarios(usuariosList);
        setEmpresas(empresasList);

        // Calcular estadísticas dinámicas
        const nuevasEstadisticas = calcularEstadisticas(usuariosList);
        setEstadisticas(nuevasEstadisticas);

      } catch (error) {
        console.error("Error completo:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudieron cargar los datos",
          variant: "destructive",
        });

        // Establecer valores por defecto para evitar crashes
        setUsuarios([]);
        setEmpresas([]);
        setEstadisticas({
          totalUsuarios: 0,
          usuariosActivos: 0,
          usuariosNuevos: 0,
          usuariosPorRol: {}
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized, toast]);

  const handleDeleteClick = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDeleteDialogOpen(true);
  };

  const handleStatusClick = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setStatusDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUsuario) return;

    try {
      const response = await fetch(`/api/administrador/usuarios/${selectedUsuario.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar el usuario");

      // Actualizar la lista de usuarios
      const nuevosUsuarios = usuarios.filter((u) => u.id !== selectedUsuario.id);
      setUsuarios(nuevosUsuarios);

      // Recalcular estadísticas
      const nuevasEstadisticas = calcularEstadisticas(nuevosUsuarios);
      setEstadisticas(nuevasEstadisticas);

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
      setDeleteDialogOpen(false);
    }
  };

  const handleStatusConfirm = async () => {
    if (!selectedUsuario) return;

    try {
      const newStatus = !selectedUsuario.activo;
      const response = await fetch(`/api/administrador/usuarios/${selectedUsuario.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activo: newStatus
        }),
      });

      if (!response.ok) throw new Error(`Error al ${newStatus ? 'activar' : 'desactivar'} el usuario`);

      // Actualizar la lista de usuarios
      const nuevosUsuarios = usuarios.map((u) =>
        u.id === selectedUsuario.id ? { ...u, activo: newStatus } : u
      );
      setUsuarios(nuevosUsuarios);

      // Recalcular estadísticas
      const nuevasEstadisticas = calcularEstadisticas(nuevosUsuarios);
      setEstadisticas(nuevasEstadisticas);

      toast({
        title: newStatus ? "Usuario activado" : "Usuario desactivado",
        description: `${selectedUsuario.nombre} ha sido ${newStatus ? 'activado' : 'desactivado'} correctamente`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario",
        variant: "destructive",
      });
    } finally {
      setStatusDialogOpen(false);
    }
  };

  const getRolBadgeVariant = (rol: string) => {
    switch (rol.toUpperCase()) {
      case "SUPERADMIN":
        return "destructive"; // Badge rojo para SuperAdmin - máximo nivel
      case "ADMIN":
      case "ADMINISTRADOR":
        return "default"; // Badge azul para Administrador - alto nivel
      case "GERENTE":
        return "secondary"; // Badge gris para Gerente - nivel medio
      case "EMPLEADO":
        return "outline"; // Badge con borde para Empleado - nivel básico
      default:
        return "outline"; // Badge por defecto para roles desconocidos
    }
  };

  const formatRolName = (rol: string) => {
    // Capitalizar primera letra y resto en minúsculas
    return rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase();
  };

  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch =
      usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEmpresa = selectedEmpresa === "all" || usuario.empresa.id === selectedEmpresa;
    const matchesRol = selectedRol === "all" || usuario.rol === selectedRol;

    return matchesSearch && matchesEmpresa && matchesRol;
  });

  if (isAuthorized === null || (isAuthorized && isLoading)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <Link href="/dashboard/superadmin/usuarios/nuevo">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </Button>
        </Link>
      </div>

      {/* Estadísticas Dinámicas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">
              {estadisticas.usuariosActivos} activos
            </p>
          </CardContent>
        </Card>

        {/* Mostrar estadísticas para cada rol encontrado */}
        {Object.entries(estadisticas.usuariosPorRol)
          .sort(([rolA], [rolB]) => rolA.localeCompare(rolB))
          .slice(0, 3) // Mostrar solo los primeros 3 roles más comunes
          .map(([rol, cantidad]) => (
            <Card key={rol}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {formatRolName(rol)}s
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cantidad}</div>
                <p className="text-xs text-muted-foreground">
                  Rol: {rol}
                </p>
              </CardContent>
            </Card>
          ))}

        {/* Card para usuarios nuevos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estadisticas.usuariosNuevos}
            </div>
            <p className="text-xs text-muted-foreground">
              En los últimos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mostrar resumen de todos los roles si hay más de 3 */}
      {Object.keys(estadisticas.usuariosPorRol).length > 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución por Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(estadisticas.usuariosPorRol)
                .sort(([, a], [, b]) => b - a)
                .map(([rol, cantidad]) => (
                  <Badge key={rol} variant="outline" className="text-xs">
                    {formatRolName(rol)}: {cantidad}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Gestiona todos los usuarios registrados en todas las empresas
          </CardDescription>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRol} onValueChange={setSelectedRol}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {rolesUnicos.map((rol) => (
                  <SelectItem key={rol} value={rol}>
                    {formatRolName(rol)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nombre}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{usuario.empresa.nombre}</span>
                          {!usuario.empresa.activa && (
                            <Badge variant="destructive" className="ml-1">
                              Inactiva
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRolBadgeVariant(usuario.rol)}>
                          {formatRolName(usuario.rol)}
                        </Badge>
                      </TableCell>
                      <TableCell>{usuario.telefono || "--"}</TableCell>
                      <TableCell>
                        <Badge variant={usuario.activo ? "default" : "destructive"}>
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(usuario.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleStatusClick(usuario)}
                            title={usuario.activo ? "Desactivar" : "Activar"}
                          >
                            {usuario.activo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Link href={`/dashboard/superadmin/usuarios/${usuario.id}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteClick(usuario)}
                            title="Eliminar"
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
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar al usuario {" "}
              <strong>{selectedUsuario?.nombre}</strong>? Esta acción no se puede deshacer y eliminará todos los datos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de cambio de estado */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUsuario?.activo ? (
                <>
                  <X className="h-5 w-5 text-destructive" />
                  Desactivar usuario
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 text-primary" />
                  Activar usuario
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedUsuario?.activo
                ? `¿Estás seguro de que deseas desactivar al usuario "${selectedUsuario?.nombre}"? No podrá acceder al sistema.`
                : `¿Estás seguro de que deseas activar al usuario "${selectedUsuario?.nombre}"? Podrá volver a acceder al sistema.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={selectedUsuario?.activo ? "destructive" : "default"}
              onClick={handleStatusConfirm}
            >
              {selectedUsuario?.activo ? "Desactivar" : "Activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
