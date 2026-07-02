"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Plus,
  Search,
  Edit,
  Trash,
  AlertTriangle,
  Check,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Activity
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { servicioEmpresas } from "@/lib/api-service";
import { useAutorizacion } from "@/hooks/use-autorizacion";

interface Empresa {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  activa: boolean;
  fechaVencimiento: string | null;
  createdAt: string;
}

export default function EmpresasPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { esSuperAdmin } = useAutorizacion();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [filtroVencimiento, setFiltroVencimiento] = useState<string>("all");

  // Diálogos
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!esSuperAdmin) {
      router.push("/dashboard");
      return;
    }
    cargarEmpresas();
  }, [esSuperAdmin]);

  const cargarEmpresas = async () => {
  try {
    setIsLoading(true);
    const response = await fetch("/api/administrador/empresas", {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Importante para incluir cookies de sesión
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // Manejar tanto el formato con 'datos' como sin él
    const empresasData = data.datos || data;
    
    if (Array.isArray(empresasData)) {
      setEmpresas(empresasData);
    } else {
      console.error('Los datos recibidos no son un array:', empresasData);
      throw new Error('Formato de datos incorrecto');
    }
    
  } catch (error) {
    console.error("Error completo:", error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "No se pudieron cargar las empresas",
      variant: "destructive",
    });
    setEmpresas([]); // Establecer array vacío en caso de error
  } finally {
    setIsLoading(false);
  }
};

  const eliminarEmpresa = async () => {
    if (!selectedEmpresa) return;

    try {
      const response = await fetch(`/api/administrador/empresas/${selectedEmpresa.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar empresa");

      setEmpresas(prev => prev.filter(emp => emp.id !== selectedEmpresa.id));

      toast({
        title: "✅ Empresa eliminada",
        description: "La empresa ha sido eliminada correctamente",
      });

      setDeleteDialogOpen(false);
      setSelectedEmpresa(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa",
        variant: "destructive",
      });
    }
  };

  const toggleEstadoEmpresa = async (empresa: Empresa) => {
    try {
      const response = await fetch(`/api/administrador/empresas/${empresa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !empresa.activa }),
      });

      if (!response.ok) throw new Error("Error al cambiar estado");

      setEmpresas(prev =>
        prev.map(emp =>
          emp.id === empresa.id ? { ...emp, activa: !emp.activa } : emp
        )
      );

      toast({
        title: empresa.activa ? "🔴 Empresa suspendida" : "🟢 Empresa activada",
        description: `La empresa ha sido ${empresa.activa ? "suspendida" : "reactivada"}`,
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la empresa",
        variant: "destructive",
      });
    }
  };

  const empresasFiltradas = empresas.filter(empresa => {
    const matchesSearch = empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         empresa.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filtroEstado === "all" ||
                         (filtroEstado === "activa" && empresa.activa) ||
                         (filtroEstado === "inactiva" && !empresa.activa);

    let matchesVencimiento = true;
    if (filtroVencimiento !== "all" && empresa.fechaVencimiento) {
      const vencimiento = new Date(empresa.fechaVencimiento);
      const hoy = new Date();
      const diasDiferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      switch (filtroVencimiento) {
        case "vencidas":
          matchesVencimiento = diasDiferencia < 0;
          break;
        case "por-vencer":
          matchesVencimiento = diasDiferencia >= 0 && diasDiferencia <= 30;
          break;
        case "vigentes":
          matchesVencimiento = diasDiferencia > 30;
          break;
      }
    }

    return matchesSearch && matchesEstado && matchesVencimiento;
  });

  // Métricas SaaS
  const totalEmpresas = empresas.length;
  const empresasActivas = empresas.filter(e => e.activa).length;
  const empresasVencidas = empresas.filter(e => {
    if (!e.fechaVencimiento) return false;
    return new Date(e.fechaVencimiento) < new Date();
  }).length;
  const empresasPorVencer = empresas.filter(e => {
    if (!e.fechaVencimiento) return false;
    const vencimiento = new Date(e.fechaVencimiento);
    const hoy = new Date();
    const diasDiferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diasDiferencia >= 0 && diasDiferencia <= 30;
  }).length;

  const getEstadoVencimiento = (fechaVencimiento: string | null) => {
    if (!fechaVencimiento) return { color: "gray", texto: "Sin vencimiento" };

    const vencimiento = new Date(fechaVencimiento);
    const hoy = new Date();
    const diasDiferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diasDiferencia < 0) {
      return { color: "red", texto: `Vencida hace ${Math.abs(diasDiferencia)} días` };
    } else if (diasDiferencia <= 30) {
      return { color: "yellow", texto: `Vence en ${diasDiferencia} días` };
    } else {
      return { color: "green", texto: `${diasDiferencia} días restantes` };
    }
  };

  if (!esSuperAdmin) {
    return <div>Acceso denegado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Clientes SaaS
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus empresas cliente y sus suscripciones
          </p>
        </div>
        <Link href="/dashboard/superadmin/empresas/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Suscripción
          </Button>
        </Link>
      </div>

      {/* Métricas SaaS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmpresas}</div>
            <p className="text-xs text-muted-foreground">
              Empresas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{empresasActivas}</div>
            <p className="text-xs text-muted-foreground">
              {totalEmpresas > 0 ? Math.round((empresasActivas/totalEmpresas)*100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{empresasPorVencer}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{empresasVencidas}</div>
            <p className="text-xs text-muted-foreground">
              Requieren renovación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra y busca empresas cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="activa">Activas</SelectItem>
                <SelectItem value="inactiva">Inactivas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroVencimiento} onValueChange={setFiltroVencimiento}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Vencimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="vigentes">Vigentes</SelectItem>
                <SelectItem value="por-vencer">Por vencer</SelectItem>
                <SelectItem value="vencidas">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Empresas */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cliente ({empresasFiltradas.length})</CardTitle>
          <CardDescription>Lista de todas las empresas suscritas al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : empresasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron empresas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Suscripción</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresasFiltradas.map((empresa) => {
                    const estadoVencimiento = getEstadoVencimiento(empresa.fechaVencimiento);

                    return (
                      <TableRow key={empresa.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{empresa.nombre}</div>
                            <div className="text-sm text-muted-foreground">{empresa.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {empresa.telefono || "Sin teléfono"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={empresa.activa ? "default" : "secondary"}
                            className={empresa.activa ? "bg-emerald-500/15 text-green-800 dark:text-green-300" : "bg-destructive/15 text-red-800 dark:text-red-300"}
                          >
                            {empresa.activa ? "Activa" : "Suspendida"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge
                              variant="outline"
                              className={
                                estadoVencimiento.color === "green" ? "border-green-500 text-green-700 dark:text-green-400" :
                                estadoVencimiento.color === "yellow" ? "border-yellow-500 text-yellow-700 dark:text-yellow-400" :
                                estadoVencimiento.color === "red" ? "border-red-500 text-red-700 dark:text-red-400" :
                                "border-gray-500 text-foreground/80"
                              }
                            >
                              {estadoVencimiento.texto}
                            </Badge>
                            {empresa.fechaVencimiento && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Vence: {new Date(empresa.fechaVencimiento).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(empresa.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleEstadoEmpresa(empresa)}
                            >
                              {empresa.activa ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>

                            <Link href={`/dashboard/superadmin/empresas/${empresa.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmpresa(empresa);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-400 hover:bg-destructive/10"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar la empresa "{selectedEmpresa?.nombre}"?
              Esta acción no se puede deshacer y eliminará todos los datos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={eliminarEmpresa}
            >
              Eliminar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
