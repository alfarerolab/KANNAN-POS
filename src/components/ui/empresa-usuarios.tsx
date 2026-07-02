"use client";

import { useState, useEffect } from "react";
import { Search, Users, Crown, User, UserCheck, UserX, Filter, Download, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

interface EmpresaUsuariosProps {
  empresaId: string;
  empresaNombre: string;
  onClose?: () => void;
}

interface EstadisticasUsuarios {
  total: number;
  activos: number;
  inactivos: number;
  administradores: number;
  empleados: number;
  gerentes: number;
}

const roleIcons = {
  SUPERADMIN: Crown,
  ADMINISTRADOR: UserCheck,
  GERENTE: User,
  EMPLEADO: User,
};

const roleColors = {
  SUPERADMIN: "text-yellow-600 dark:text-yellow-400",
  ADMINISTRADOR: "text-blue-600 dark:text-blue-400",
  GERENTE: "text-green-600 dark:text-green-400",
  EMPLEADO: "text-muted-foreground",
};

export default function EmpresaUsuarios({ empresaId, empresaNombre, onClose }: EmpresaUsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("all");
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [estadisticas, setEstadisticas] = useState<EstadisticasUsuarios>({
    total: 0,
    activos: 0,
    inactivos: 0,
    administradores: 0,
    empleados: 0,
    gerentes: 0
  });

  // Cargar usuarios
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/administrador/empresas/${empresaId}/usuarios`);
        if (!response.ok) throw new Error("Error al cargar usuarios");

        const data = await response.json();
        const usuariosData = data.datos || data.data || data || [];
        setUsuarios(usuariosData);

        // Calcular estadísticas
        const stats = {
          total: usuariosData.length,
          activos: usuariosData.filter((u: Usuario) => u.activo).length,
          inactivos: usuariosData.filter((u: Usuario) => !u.activo).length,
          administradores: usuariosData.filter((u: Usuario) => u.rol === 'ADMINISTRADOR').length,
          gerentes: usuariosData.filter((u: Usuario) => u.rol === 'GERENTE').length,
          empleados: usuariosData.filter((u: Usuario) => u.rol === 'EMPLEADO').length,
        };
        setEstadisticas(stats);

      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsuarios();
  }, [empresaId]);

  // Aplicar filtros
  useEffect(() => {
    let filtrados = usuarios;

    // Filtro de búsqueda
    if (busqueda) {
      filtrados = filtrados.filter(usuario =>
        usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        usuario.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        (usuario.telefono && usuario.telefono.includes(busqueda))
      );
    }

    // Filtro por rol
    if (filtroRol !== "all") {
      filtrados = filtrados.filter(usuario => usuario.rol === filtroRol);
    }

    // Filtro por estado
    if (filtroEstado !== "all") {
      filtrados = filtrados.filter(usuario =>
        filtroEstado === "activo" ? usuario.activo : !usuario.activo
      );
    }

    setUsuariosFiltrados(filtrados);
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const exportarCSV = () => {
    const headers = ["Nombre", "Email", "Teléfono", "Rol", "Estado", "Fecha Registro"];
    const csvContent = [
      headers.join(","),
      ...usuariosFiltrados.map(usuario => [
        `"${usuario.nombre}"`,
        `"${usuario.email}"`,
        `"${usuario.telefono || ''}"`,
        `"${usuario.rol}"`,
        `"${usuario.activo ? 'Activo' : 'Inactivo'}"`,
        `"${new Date(usuario.fechaCreacion).toLocaleDateString()}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `usuarios_${empresaNombre.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usuarios de {empresaNombre}</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los usuarios registrados en esta empresa
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportarCSV}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{estadisticas.activos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{estadisticas.inactivos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Crown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estadisticas.administradores}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
            <User className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{estadisticas.gerentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{estadisticas.empleados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={filtroRol} onValueChange={setFiltroRol}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                <SelectItem value="GERENTE">Gerente</SelectItem>
                <SelectItem value="EMPLEADO">Empleado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Usuarios ({usuariosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados.map((usuario) => {
                  const RoleIcon = roleIcons[usuario.rol as keyof typeof roleIcons] || User;
                  const roleColor = roleColors[usuario.rol as keyof typeof roleColors] || "text-muted-foreground";

                  return (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full bg-muted ${roleColor}`}>
                            <RoleIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{usuario.nombre}</div>
                            <div className="text-sm text-muted-foreground">{usuario.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{usuario.email}</span>
                          </div>
                          {usuario.telefono && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{usuario.telefono}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColor}>
                          {usuario.rol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.activo ? "default" : "destructive"}>
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(usuario.fechaCreacion).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {usuariosFiltrados.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron usuarios con los filtros aplicados
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
