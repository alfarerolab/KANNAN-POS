"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Settings, Building, Search, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { obtenerTiposNegocio, obtenerConfiguracionNegocio, type ConfiguracionNegocio } from "@/lib/configuracion-negocio";
import type { TipoNegocio } from "../../../../lib/prisma-types";

interface EmpresaConTipo {
  id: string;
  nombre: string;
  email: string;
  tipoNegocio: TipoNegocio;
  activa: boolean;
  createdAt: Date;
  configuracion?: {
    habilitarServicios: boolean;
    habilitarCitas: boolean;
    habilitarVariantes: boolean;
    habilitarRecetas: boolean;
    habilitarLotes: boolean;
    habilitarVencimientos: boolean;
  };
}

// Helper que garantiza un ConfiguracionNegocio no-null
function getConfig(tipo: string): ConfiguracionNegocio {
  return obtenerConfiguracionNegocio(tipo) ?? obtenerTiposNegocio()[0];
}

export default function TiposEmpresaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [empresas, setEmpresas] = useState<EmpresaConTipo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoNegocio | "TODOS">("TODOS");

  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<EmpresaConTipo | null>(null);
  const [dialogConfigOpen, setDialogConfigOpen] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState<TipoNegocio | "">("");
  const [configuracionPersonalizada, setConfiguracionPersonalizada] = useState({
    habilitarServicios: false,
    habilitarCitas: false,
    habilitarVariantes: false,
    habilitarRecetas: false,
    habilitarLotes: false,
    habilitarVencimientos: false,
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/iniciar-sesion"); return; }
    if (session.user.role !== "SUPERADMIN") { router.push("/dashboard"); return; }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role !== "SUPERADMIN") return;

    const cargarEmpresas = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/administrador/empresas");
        if (!response.ok) throw new Error("Error al cargar empresas");
        const data = await response.json();
        setEmpresas(data.datos || []);
      } catch (error) {
        console.error("Error al cargar empresas:", error);
        toast({ title: "Error", description: "No se pudieron cargar las empresas", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    cargarEmpresas();
  }, [session, toast]);

  const tiposNegocio = obtenerTiposNegocio();

  const empresasFiltradas = empresas.filter(empresa => {
    const matchSearch = empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        empresa.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filtroTipo === "TODOS" || empresa.tipoNegocio === filtroTipo;
    return matchSearch && matchTipo;
  });

  const estadisticas = tiposNegocio.map(tipo => ({
    tipo: tipo.tipo,
    nombre: tipo.nombre,
    icono: tipo.icono,
    cantidad: empresas.filter(e => e.tipoNegocio === tipo.tipo).length,
    color: tipo.color
  }));

  const handleConfigureEmpresa = (empresa: EmpresaConTipo) => {
    setEmpresaSeleccionada(empresa);
    setNuevoTipo(empresa.tipoNegocio);

    const configTipo = getConfig(empresa.tipoNegocio);
    setConfiguracionPersonalizada({
      habilitarServicios: empresa.configuracion?.habilitarServicios ?? configTipo.funcionalidades.servicios,
      habilitarCitas: empresa.configuracion?.habilitarCitas ?? configTipo.funcionalidades.citas,
      habilitarVariantes: empresa.configuracion?.habilitarVariantes ?? configTipo.funcionalidades.variantes,
      habilitarRecetas: empresa.configuracion?.habilitarRecetas ?? configTipo.funcionalidades.recetas,
      habilitarLotes: empresa.configuracion?.habilitarLotes ?? configTipo.funcionalidades.lotes,
      habilitarVencimientos: empresa.configuracion?.habilitarVencimientos ?? configTipo.funcionalidades.vencimientos,
    });

    setDialogConfigOpen(true);
  };

  const handleTipoChange = (tipo: TipoNegocio) => {
    setNuevoTipo(tipo);

    const configTipo = getConfig(tipo);
    setConfiguracionPersonalizada({
      habilitarServicios: configTipo.funcionalidades.servicios,
      habilitarCitas: configTipo.funcionalidades.citas,
      habilitarVariantes: configTipo.funcionalidades.variantes,
      habilitarRecetas: configTipo.funcionalidades.recetas,
      habilitarLotes: configTipo.funcionalidades.lotes,
      habilitarVencimientos: configTipo.funcionalidades.vencimientos,
    });
  };

  const handleGuardarConfiguracion = async () => {
    if (!empresaSeleccionada || !nuevoTipo) return;

    try {
      setGuardando(true);

      const responseTipo = await fetch(`/api/administrador/empresas/${empresaSeleccionada.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoNegocio: nuevoTipo })
      });
      if (!responseTipo.ok) throw new Error("Error al actualizar tipo de empresa");

      const responseConfig = await fetch("/api/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: empresaSeleccionada.id, tipoNegocio: nuevoTipo, ...configuracionPersonalizada })
      });
      if (!responseConfig.ok) throw new Error("Error al actualizar configuración");

      setEmpresas(prev => prev.map(emp =>
        emp.id === empresaSeleccionada.id
          ? { ...emp, tipoNegocio: nuevoTipo as TipoNegocio, configuracion: configuracionPersonalizada }
          : emp
      ));

      toast({
        title: "Configuración actualizada",
        description: `Se ha configurado ${empresaSeleccionada.nombre} como ${getConfig(nuevoTipo).nombre}`
      });

      setDialogConfigOpen(false);
      setEmpresaSeleccionada(null);

    } catch (error) {
      console.error("Error al guardar configuración:", error);
      toast({ title: "Error", description: "No se pudo guardar la configuración", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (session?.user?.role !== "SUPERADMIN") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Acceso Denegado</p>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Tipos de Empresa</h1>
          <p className="text-muted-foreground">Configura y gestiona los tipos de negocio de las empresas</p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
          <Settings className="h-4 w-4 mr-2" />
          Panel SuperAdmin
        </Badge>
      </div>

      <Tabs defaultValue="estadisticas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="estadisticas">Estadísticas por Tipo</TabsTrigger>
          <TabsTrigger value="empresas">Gestionar Empresas</TabsTrigger>
        </TabsList>

        <TabsContent value="estadisticas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {estadisticas.map((stat) => (
              <Card key={stat.tipo} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span className="text-2xl">{stat.icono}</span>
                    {stat.nombre}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.cantidad}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.cantidad === 1 ? "empresa" : "empresas"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="empresas" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresas..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filtroTipo} onValueChange={(value) => setFiltroTipo(value as TipoNegocio | "TODOS")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los tipos</SelectItem>
                {tiposNegocio.map((tipo) => (
                  <SelectItem key={tipo.tipo} value={tipo.tipo}>
                    {tipo.icono} {tipo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {empresasFiltradas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {searchTerm || filtroTipo !== "TODOS"
                      ? "No se encontraron empresas con los filtros aplicados"
                      : "No hay empresas registradas"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              empresasFiltradas.map((empresa) => {
                const configTipo = getConfig(empresa.tipoNegocio);
                return (
                  <Card key={empresa.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {empresa.nombre}
                            {!empresa.activa && <Badge variant="destructive">Inactiva</Badge>}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{empresa.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`bg-${configTipo.color}-50 text-${configTipo.color}-700`}>
                            {configTipo.icono} {configTipo.nombre}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handleConfigureEmpresa(empresa)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Configurar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {empresa.configuracion?.habilitarServicios && <Badge variant="secondary">Servicios</Badge>}
                        {empresa.configuracion?.habilitarCitas && <Badge variant="secondary">Citas</Badge>}
                        {empresa.configuracion?.habilitarVariantes && <Badge variant="secondary">Variantes</Badge>}
                        {empresa.configuracion?.habilitarRecetas && <Badge variant="secondary">Recetas</Badge>}
                        {empresa.configuracion?.habilitarLotes && <Badge variant="secondary">Lotes</Badge>}
                        {empresa.configuracion?.habilitarVencimientos && <Badge variant="secondary">Vencimientos</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogConfigOpen} onOpenChange={setDialogConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Empresa</DialogTitle>
            <DialogDescription>
              Configura el tipo de negocio y funcionalidades para {empresaSeleccionada?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Tipo de Negocio</Label>
              <Select value={nuevoTipo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de negocio" />
                </SelectTrigger>
                <SelectContent>
                  {tiposNegocio.map((tipo) => (
                    <SelectItem key={tipo.tipo} value={tipo.tipo}>
                      <div className="flex items-center gap-2">
                        <span>{tipo.icono}</span>
                        <span>{tipo.nombre}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Funcionalidades Habilitadas</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "servicios", label: "Servicios", key: "habilitarServicios" },
                  { id: "citas", label: "Citas", key: "habilitarCitas" },
                  { id: "variantes", label: "Variantes", key: "habilitarVariantes" },
                  { id: "recetas", label: "Recetas", key: "habilitarRecetas" },
                  { id: "lotes", label: "Lotes", key: "habilitarLotes" },
                  { id: "vencimientos", label: "Vencimientos", key: "habilitarVencimientos" },
                ].map(({ id, label, key }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <Switch
                      id={id}
                      checked={configuracionPersonalizada[key as keyof typeof configuracionPersonalizada]}
                      onCheckedChange={(checked) =>
                        setConfiguracionPersonalizada(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {nuevoTipo && (
              <div className="rounded-md bg-muted p-4">
                <h5 className="font-medium mb-2">Vista previa de configuración</h5>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getConfig(nuevoTipo).icono}</span>
                  <span className="font-medium">{getConfig(nuevoTipo).nombre}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Este tipo de negocio estará optimizado para las funcionalidades seleccionadas.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardarConfiguracion} disabled={guardando || !nuevoTipo}>
              {guardando ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : "Guardar Configuración"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}