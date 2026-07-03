"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, MapPin, Settings, Trash2, Users, Star, Search, Filter, Edit, Eye, Monitor, AlertTriangle, UserPlus, UserMinus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAutorizacion } from "@/hooks/use-autorizacion";
import { ProtectorAutorizacion } from "@/components/authorization-guard";
import { servicioTerminales, servicioUsuarios } from "@/lib/api-service";
import { useToast } from "@/hooks/use-toast";
import { ValoresFormularioTerminal, Terminal } from "@/types";

export default function TerminalesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { tienePermiso, estaCargando } = useAutorizacion();

  // Verificar acceso
  useEffect(() => {
    if (status === "loading" || estaCargando) return;

    if (!session) {
      router.push("/iniciar-sesion");
      return;
    }

    if (!tienePermiso("leerTerminal")) {
      router.push("/dashboard");
    }
  }, [session, status, router, tienePermiso, estaCargando]);

  if (estaCargando || status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando terminales...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectorAutorizacion
      permiso="leerTerminal"
      redirigirA="/dashboard"
    >
      <GestionTerminales />
    </ProtectorAutorizacion>
  );
}

function GestionTerminales() {
  const { toast } = useToast();
  const { tienePermiso } = useAutorizacion();
  const [terminales, setTerminales] = useState<Terminal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoTerminal, setEditandoTerminal] = useState<Terminal | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<boolean | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para gestión de usuarios
  const [usuariosDialogOpen, setUsuariosDialogOpen] = useState(false);
  const [terminalSeleccionado, setTerminalSeleccionado] = useState<Terminal | null>(null);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<any[]>([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState<any[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [procesandoUsuario, setProcesandoUsuario] = useState<string | null>(null);
  const [busquedaUsuario, setBusquedaUsuario] = useState("");

  const [formulario, setFormulario] = useState<ValoresFormularioTerminal>({
    nombre: "",
    descripcion: "",
    ubicacion: "",
    numeracion: "",
    activo: true,
    esTerminalPrincipal: false,
  });

  useEffect(() => {
    cargarTerminales();
  }, []);

  const cargarTerminales = async () => {
    try {
      setIsLoading(true);
      const data = await servicioTerminales.obtenerTerminales();
      setTerminales(data);
    } catch (error) {
      console.error("Error al cargar terminales:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los terminales",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const abrirDialog = (terminal?: Terminal) => {
    if (terminal) {
      setEditandoTerminal(terminal);
      setFormulario({
        nombre: terminal.nombre,
        descripcion: terminal.descripcion || "",
        ubicacion: terminal.ubicacion || "",
        numeracion: terminal.numeracion || "",
        activo: terminal.activo,
        esTerminalPrincipal: terminal.esTerminalPrincipal,
      });
    } else {
      setEditandoTerminal(null);
      setFormulario({
        nombre: "",
        descripcion: "",
        ubicacion: "",
        numeracion: "",
        activo: true,
        esTerminalPrincipal: false,
      });
    }
    setDialogOpen(true);
  };

  const cerrarDialog = () => {
    setDialogOpen(false);
    setEditandoTerminal(null);
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);

    try {
      if (editandoTerminal) {
        await servicioTerminales.actualizarTerminal(editandoTerminal.id, formulario);
        toast({
          title: "Terminal actualizado",
          description: "Los datos del terminal han sido actualizados correctamente",
        });
      } else {
        await servicioTerminales.crearTerminal(formulario);
        toast({
          title: "Terminal creado",
          description: "El nuevo terminal ha sido creado correctamente",
        });
      }

      await cargarTerminales();
      cerrarDialog();
    } catch (error) {
      console.error("Error al procesar terminal:", error);
      toast({
        title: "Error",
        description: `No se pudo ${editandoTerminal ? "actualizar" : "crear"} el terminal`,
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleDeleteClick = (terminal: Terminal) => {
    setSelectedTerminal(terminal);
    setDeleteDialogOpen(true);
  };

  const eliminarTerminal = async () => {
    if (!selectedTerminal) return;

    setIsDeleting(true);
    try {
      await servicioTerminales.eliminarTerminal(selectedTerminal.id);
      toast({
        title: "Terminal eliminado",
        description: "El terminal ha sido eliminado correctamente",
      });
      await cargarTerminales();
    } catch (error: any) {
      console.error("Error al eliminar terminal:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el terminal",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedTerminal(null);
    }
  };

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
  };

  const handleFiltroActivo = (value: boolean | undefined) => {
    setFiltroActivo(value);
  };

  // ===== Funciones de gestión de usuarios =====
  const abrirDialogUsuarios = async (terminal: Terminal) => {
    setTerminalSeleccionado(terminal);
    setUsuariosDialogOpen(true);
    setBusquedaUsuario("");
    await cargarUsuariosTerminal(terminal.id);
  };

  const cargarUsuariosTerminal = async (terminalId: string) => {
    setCargandoUsuarios(true);
    try {
      const [asignados, todosUsuarios] = await Promise.all([
        servicioTerminales.obtenerTerminal(terminalId),
        servicioUsuarios.obtenerUsuarios({ limite: 100 }),
      ]);

      const listaAsignados = asignados.usuariosAsignados || [];
      setUsuariosAsignados(listaAsignados);

      // Obtener la lista de usuarios de la empresa
      const lista = todosUsuarios.datos || todosUsuarios.usuarios || todosUsuarios;
      setUsuariosEmpresa(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const asignarUsuarioATerminal = async (usuarioId: string) => {
    if (!terminalSeleccionado) return;
    setProcesandoUsuario(usuarioId);
    try {
      await servicioTerminales.asignarUsuario(terminalSeleccionado.id, usuarioId);
      toast({
        title: "Usuario asignado",
        description: "El usuario ha sido asignado al terminal correctamente",
      });
      await cargarUsuariosTerminal(terminalSeleccionado.id);
    } catch (error: any) {
      console.error("Error al asignar usuario:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el usuario",
        variant: "destructive",
      });
    } finally {
      setProcesandoUsuario(null);
    }
  };

  const desasignarUsuarioDeTerminal = async (usuarioId: string) => {
    if (!terminalSeleccionado) return;
    setProcesandoUsuario(usuarioId);
    try {
      await servicioTerminales.desasignarUsuario(terminalSeleccionado.id, usuarioId);
      toast({
        title: "Usuario desasignado",
        description: "El usuario ha sido desasignado del terminal",
      });
      await cargarUsuariosTerminal(terminalSeleccionado.id);
    } catch (error: any) {
      console.error("Error al desasignar usuario:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo desasignar el usuario",
        variant: "destructive",
      });
    } finally {
      setProcesandoUsuario(null);
    }
  };

  const cerrarDialogUsuarios = () => {
    setUsuariosDialogOpen(false);
    setTerminalSeleccionado(null);
    setUsuariosAsignados([]);
    setUsuariosEmpresa([]);
    setBusquedaUsuario("");
    // Recargar terminales para actualizar los conteos
    cargarTerminales();
  };

  // IDs de usuarios ya asignados
  const idsAsignados = new Set(usuariosAsignados.map((ua: any) => ua.usuario?.id || ua.usuarioId));

  // Usuarios disponibles (no asignados)
  const usuariosDisponibles = usuariosEmpresa.filter(
    (u: any) => !idsAsignados.has(u.id)
  );

  // Filtrar por búsqueda
  const usuariosDisponiblesFiltrados = usuariosDisponibles.filter((u: any) => {
    if (!busquedaUsuario) return true;
    const term = busquedaUsuario.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  const filteredTerminales = terminales.filter((terminal) => {
    const matchesSearch = !busqueda || 
      terminal.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      terminal.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      terminal.ubicacion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      terminal.numeracion?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchesFilter = filtroActivo === undefined || terminal.activo === filtroActivo;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando terminales...</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Terminales</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los puntos de venta de tu empresa
            </p>
          </div>
          {tienePermiso("crearTerminal") && (
            <Button 
              onClick={() => abrirDialog()}
              className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Nuevo Terminal
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 lg:px-8 py-4 border-b border-border/60">
          <div>
            <p className="font-semibold text-foreground">Lista de Terminales</p>
            <p className="text-sm text-muted-foreground">
              {filteredTerminales.length === 0 && (busqueda || filtroActivo !== undefined)
                ? "No se encontraron resultados para tu búsqueda"
                : `${filteredTerminales.length} ${filteredTerminales.length === 1 ? 'terminal' : 'terminales'} ${busqueda || filtroActivo !== undefined ? 'encontrado(s)' : 'en total'}`
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar terminales..."
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
                    Terminal
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Ubicación
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Numeración DIAN
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Usuarios
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Estado
                  </TableHead>
                  <TableHead className="font-semibold text-foreground py-4 px-6">
                    Ventas
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground py-4 px-6">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTerminales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 px-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Monitor className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {busqueda || filtroActivo !== undefined
                              ? "No se encontraron terminales"
                              : "No hay terminales registrados"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {busqueda || filtroActivo !== undefined
                              ? "Intenta con otros términos de búsqueda o filtros"
                              : "Crea tu primer terminal para comenzar"}
                          </p>
                        </div>
                        {!busqueda && filtroActivo === undefined && tienePermiso("crearTerminal") && (
                          <Button variant="outline" className="mt-2" onClick={() => abrirDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear primer terminal
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTerminales.map((terminal) => (
                    <TableRow 
                      key={terminal.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150"
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                            <span className="text-primary-foreground text-sm font-semibold">
                              {terminal.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {terminal.nombre}
                              </span>
                              {terminal.esTerminalPrincipal && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            {terminal.descripcion && (
                              <span className="text-sm text-muted-foreground">
                                {terminal.descripcion}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {terminal.ubicacion || "Sin ubicación"}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {terminal.numeracion ? (
                          <span className="text-sm font-medium text-foreground">
                            {terminal.numeracion}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No configurada
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary" className="font-medium">
                            {(terminal as any).usuariosAsignados?.length || 0} usuarios
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge
                          variant={terminal.activo ? "default" : "secondary"}
                          className={terminal.activo 
                            ? "bg-emerald-500/15 text-green-800 dark:text-green-300 hover:bg-emerald-500/15" 
                            : "bg-muted text-muted-foreground hover:bg-muted"
                          }
                        >
                          {terminal.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-sm font-medium text-foreground">
                          {(terminal as any)._count?.ventas || 0} ventas
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <div className="flex justify-end gap-2">
                          {tienePermiso("editarTerminal") && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => abrirDialogUsuarios(terminal)}
                              className="h-9 w-9 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all duration-200"
                              title="Gestionar usuarios"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          )}

                          {tienePermiso("editarTerminal") && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => abrirDialog(terminal)}
                              className="h-9 w-9 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-green-700 dark:text-green-400 transition-all duration-200"
                              title="Editar terminal"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          {tienePermiso("eliminarTerminal") && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteClick(terminal)}
                              className="h-9 w-9 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all duration-200"
                              title="Eliminar terminal"
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
        {!isLoading && filteredTerminales.length > 0 && (
          <div className="px-6 lg:px-8 py-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {filteredTerminales.length} terminal{filteredTerminales.length !== 1 ? 'es' : ''}
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

      {/* Modal para crear/editar terminal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={manejarSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editandoTerminal ? "Editar Terminal" : "Nuevo Terminal"}
              </DialogTitle>
              <DialogDescription>
                {editandoTerminal
                  ? "Modifica los datos del terminal"
                  : "Crea un nuevo terminal para tu punto de venta"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formulario.nombre}
                  onChange={(e) =>
                    setFormulario({ ...formulario, nombre: e.target.value })
                  }
                  required
                  className="h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formulario.descripcion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, descripcion: e.target.value })
                  }
                  className="h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ubicacion">Ubicación</Label>
                <Input
                  id="ubicacion"
                  value={formulario.ubicacion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, ubicacion: e.target.value })
                  }
                  className="h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="numeracion">Numeración DIAN</Label>
                <Input
                  id="numeracion"
                  value={formulario.numeracion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, numeracion: e.target.value })
                  }
                  placeholder="Para facturación electrónica"
                  className="h-11"
                />
              </div>

              <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/20">
                <Switch
                  id="activo"
                  checked={formulario.activo}
                  onCheckedChange={(checked) =>
                    setFormulario({ ...formulario, activo: checked })
                  }
                />
                <Label htmlFor="activo">Terminal activo</Label>
              </div>

              <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/20">
                <Switch
                  id="esTerminalPrincipal"
                  checked={formulario.esTerminalPrincipal}
                  onCheckedChange={(checked) =>
                    setFormulario({ ...formulario, esTerminalPrincipal: checked })
                  }
                />
                <Label htmlFor="esTerminalPrincipal">Terminal principal</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={cerrarDialog}
                className="h-11"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={procesando} className="h-11">
                {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editandoTerminal ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              ¿Estás seguro de que deseas eliminar el terminal{" "}
              <span className="font-semibold text-foreground">
                "{selectedTerminal?.nombre}"
              </span>?
              <br /><br />
              Esta acción no se puede deshacer y eliminará permanentemente toda la información del terminal.
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
              onClick={eliminarTerminal}
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

      {/* Dialog de Gestión de Usuarios */}
      <Dialog open={usuariosDialogOpen} onOpenChange={(open) => { if (!open) cerrarDialogUsuarios(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span>Gestionar Usuarios</span>
                {terminalSeleccionado && (
                  <p className="text-sm font-normal text-muted-foreground mt-0.5">
                    {terminalSeleccionado.nombre}
                  </p>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              Asigna o desasigna usuarios que pueden operar en este terminal.
            </DialogDescription>
          </DialogHeader>

          {cargandoUsuarios ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 overflow-hidden flex-1">
              {/* Usuarios Asignados */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Usuarios asignados
                  <Badge variant="secondary" className="ml-auto">
                    {usuariosAsignados.length}
                  </Badge>
                </h3>
                {usuariosAsignados.length === 0 ? (
                  <div className="text-center py-6 border rounded-lg bg-muted/20">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No hay usuarios asignados a este terminal</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[180px]">
                    <div className="space-y-2 pr-4">
                      {usuariosAsignados.map((asignacion: any) => {
                        const usuario = asignacion.usuario;
                        if (!usuario) return null;
                        return (
                          <div
                            key={asignacion.id || usuario.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <span className="text-primary-foreground text-xs font-semibold">
                                  {usuario.nombre?.charAt(0)?.toUpperCase() || "U"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{usuario.nombre}</p>
                                <p className="text-xs text-muted-foreground">{usuario.email}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => desasignarUsuarioDeTerminal(usuario.id)}
                              disabled={procesandoUsuario === usuario.id}
                              className="h-8 px-3 hover:bg-destructive/10 hover:border-destructive/30 hover:text-red-700 dark:text-red-400 transition-all"
                            >
                              {procesandoUsuario === usuario.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <UserMinus className="h-3 w-3 mr-1" />
                                  <span>Quitar</span>
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Separador */}
              <div className="border-t" />

              {/* Usuarios Disponibles */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Usuarios disponibles
                    <Badge variant="secondary" className="ml-2">
                      {usuariosDisponiblesFiltrados.length}
                    </Badge>
                  </h3>
                </div>

                {/* Buscador */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario por nombre o email..."
                    className="pl-10 h-9 text-sm"
                    value={busquedaUsuario}
                    onChange={(e) => setBusquedaUsuario(e.target.value)}
                  />
                </div>

                {usuariosDisponiblesFiltrados.length === 0 ? (
                  <div className="text-center py-6 border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                      {busquedaUsuario
                        ? "No se encontraron usuarios con esa búsqueda"
                        : "Todos los usuarios ya están asignados"}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2 pr-4">
                      {usuariosDisponiblesFiltrados.map((usuario: any) => (
                        <div
                          key={usuario.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <span className="text-primary-foreground text-xs font-semibold">
                                {usuario.nombre?.charAt(0)?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{usuario.nombre}</p>
                              <p className="text-xs text-muted-foreground">{usuario.email}</p>
                            </div>
                            {usuario.rol && (
                              <Badge variant="outline" className="text-xs">
                                {usuario.rol}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => asignarUsuarioATerminal(usuario.id)}
                            disabled={procesandoUsuario === usuario.id}
                            className="h-8 px-3 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-700 dark:text-blue-400 transition-all"
                          >
                            {procesandoUsuario === usuario.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3 mr-1" />
                                <span>Asignar</span>
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={cerrarDialogUsuarios} className="h-10">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}