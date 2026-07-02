"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Scissors, Loader2, Clock, User, Plus, CheckCircle, 
  ArrowLeft, ShoppingCart, Trash2, ShieldAlert, Package, X, ChevronDown, ChevronUp
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function CuentaDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };
  const { toast } = useToast();

  const [cuenta, setCuenta] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  // Estados para modales de confirmación
  const [itemAEliminar, setItemAEliminar] = useState<string | null>(null);
  const [consumoAEliminar, setConsumoAEliminar] = useState<{itemId: string, consumoId: string} | null>(null);

  // Estados para modal de añadir servicio/producto
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoItem, setTipoItem] = useState<"servicio" | "producto">("servicio");
  const [servicios, setServicios] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Estados para consumos internos
  const [expandidoConsumo, setExpandidoConsumo] = useState<Record<string, boolean>>({});
  const [consumoProductoSeleccionado, setConsumoProductoSeleccionado] = useState<Record<string, string>>({});
  const [consumoCantidad, setConsumoCantidad] = useState<Record<string, number>>({});
  const [guardandoConsumo, setGuardandoConsumo] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/iniciar-sesion");
      return;
    }
    cargarDatos();
  }, [session, status, router, id]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [cuentaRes, srvRes, prodRes, empRes] = await Promise.all([
        fetch(`/api/peluqueria/comandas/${id}`),
        fetch("/api/servicios"),
        fetch("/api/productos"),
        fetch("/api/pos/empleados")
      ]);

      if (cuentaRes.ok) setCuenta(await cuentaRes.json());
      
      if (srvRes.ok) {
        const data = await srvRes.json();
        setServicios(Array.isArray(data) ? data : data?.datos || []);
      }

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProductos(Array.isArray(data) ? data : data?.datos || []);
      }
      
      if (empRes.ok) {
        const data = await empRes.json();
        const lista = Array.isArray(data) ? data : data?.datos || data?.usuarios || data?.data || [];
        setEmpleados(lista.filter((u: any) => u.activo !== false));
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error al cargar datos", variant: "destructive" });
    } finally {
      setCargando(false);
    }
  };

  const añadirItem = async () => {
    if (tipoItem === "servicio" && !servicioSeleccionado) {
      toast({ title: "Selecciona un servicio", variant: "destructive" });
      return;
    }
    if (tipoItem === "producto" && !productoSeleccionado) {
      toast({ title: "Selecciona un producto", variant: "destructive" });
      return;
    }
    
    setGuardando(true);
    try {
      const payload: any = {
        empleadoId: empleadoSeleccionado === "ninguno" ? null : (empleadoSeleccionado || null),
        notas: notas || null,
      };

      if (tipoItem === "servicio") {
        payload.servicioId = servicioSeleccionado;
      } else {
        payload.productoId = productoSeleccionado;
      }

      const res = await fetch(`/api/peluqueria/comandas/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({ title: "Item añadido a la cuenta" });
        setModalAbierto(false);
        setServicioSeleccionado("");
        setProductoSeleccionado("");
        setEmpleadoSeleccionado("");
        setNotas("");
        cargarDatos(); // Recargar la cuenta para ver los cambios
      } else {
        const err = await res.json();
        throw new Error(err.error || "Error al añadir item");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCuenta = async () => {
    try {
      const res = await fetch(`/api/peluqueria/comandas/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast({ title: "Cuenta cancelada exitosamente" });
        router.push("/dashboard/peluqueria/comandas");
      } else {
        throw new Error("No se pudo cancelar la cuenta");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const cobrarCuenta = () => {
    // Guardar la cuenta completa en localStorage
    localStorage.setItem("comandaParaCobro", JSON.stringify(cuenta));
    // Redirigir al POS
    router.push("/dashboard/pos?autoAddComanda=true");
  };

  const agregarConsumo = async (itemId: string) => {
    const prodId = consumoProductoSeleccionado[itemId];
    const qty = consumoCantidad[itemId] || 1;
    
    if (!prodId) return;
    
    setGuardandoConsumo(prev => ({ ...prev, [itemId]: true }));
    try {
      const res = await fetch(`/api/peluqueria/comandas/${id}/items/${itemId}/consumos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: prodId, cantidad: qty })
      });

      if (res.ok) {
        setConsumoProductoSeleccionado(prev => ({ ...prev, [itemId]: "" }));
        setConsumoCantidad(prev => ({ ...prev, [itemId]: 1 }));
        cargarDatos();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "No se pudo agregar el consumo", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGuardandoConsumo(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const solicitarEliminarConsumo = (itemId: string, consumoId: string) => {
    setConsumoAEliminar({ itemId, consumoId });
  };

  const confirmarEliminarConsumo = async () => {
    if (!consumoAEliminar) return;
    try {
      const res = await fetch(`/api/peluqueria/comandas/${id}/items/${consumoAEliminar.itemId}/consumos/${consumoAEliminar.consumoId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setConsumoAEliminar(null);
    }
  };

  const solicitarEliminarItem = (itemId: string) => {
    setItemAEliminar(itemId);
  };

  const confirmarEliminarItem = async () => {
    if (!itemAEliminar) return;
    try {
      const res = await fetch(`/api/peluqueria/comandas/${id}/items/${itemAEliminar}`, { method: "DELETE" });
      if (res.ok) {
        const itemsRestantes = (cuenta?.items || []).filter((i: any) => i.id !== itemAEliminar);
        if (itemsRestantes.length === 0) {
          // La comanda quedó vacía, fue cancelada automáticamente — redirigir
          toast({ title: "Cuenta vacía", description: "No quedan servicios. La cuenta fue cancelada automáticamente." });
          router.push("/dashboard/peluqueria/comandas");
          return;
        }
        cargarDatos();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setItemAEliminar(null);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cuenta) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <div>
          <h2 className="text-2xl font-bold">Cuenta no encontrada</h2>
          <p className="text-muted-foreground">La cuenta solicitada no existe o ha sido cerrada.</p>
        </div>
        <Button onClick={() => router.push("/dashboard/peluqueria/comandas")}>Volver a Cuentas</Button>
      </div>
    );
  }

  const servicioDetalle = servicios.find(s => s.id === servicioSeleccionado);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" className="pl-0 gap-2 hover:bg-transparent" onClick={() => router.push("/dashboard/peluqueria/comandas")}>
        <ArrowLeft className="h-4 w-4" />
        Volver a Cuentas
      </Button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-muted/30 p-6 rounded-xl border border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {cuenta.cliente ? cuenta.cliente.nombre : "Cliente Directo"}
            </h1>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
              Activa
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Iniciada: {format(new Date(cuenta.createdAt), "HH:mm a", { locale: es })}
            </span>
          </div>
        </div>

        <div className="text-left md:text-right">
          <p className="text-sm text-muted-foreground mb-1">Total a Cobrar</p>
          <p className="text-4xl font-black text-primary">{formatCurrency(Number(cuenta.total))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Scissors className="h-5 w-5 text-muted-foreground" />
              Servicios en la Cuenta
            </h2>
          </div>

          <div className="space-y-3">
            {cuenta.items?.map((item: any, index: number) => {
              const isServicio = !!item.servicio;
              const nombre = isServicio ? item.servicio.nombre : item.producto?.nombre;
              
              return (
              <div key={item.id} className="group relative bg-background border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start gap-3 mb-2">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isServicio ? 'bg-violet-500' : 'bg-primary/60'}`} />

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-tight text-foreground pr-1 flex items-center gap-2">
                      {nombre}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <span>{formatCurrency(Number(item.precio))}</span>
                      {isServicio && item.servicio?.duracion && (
                        <span className="ml-2">· {item.servicio.duracion} min</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-base text-foreground">
                      {formatCurrency(Number(item.precio))}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); solicitarEliminarItem(item.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="pl-5 mt-3 border-t border-dashed border-border/60 pt-3">
                  {item.empleado && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex items-center gap-1 bg-violet-100 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/40 rounded-full px-2.5 py-1">
                        <User className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                        <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                          {item.empleado.nombre}
                        </span>
                      </div>
                    </div>
                  )}

                  {item.notas && (
                    <p className="text-xs text-muted-foreground italic flex gap-1 mb-2">
                      <span>Nota:</span> {item.notas}
                    </p>
                  )}

                  {isServicio && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setExpandidoConsumo(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <Package className="h-3 w-3" />
                          Consumos de inventario
                          {(item.consumosInternos?.length || 0) > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {item.consumosInternos.length}
                            </Badge>
                          )}
                        </span>
                        {expandidoConsumo[item.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {expandidoConsumo[item.id] && (
                        <div className="mt-2 space-y-2">
                          {(item.consumosInternos || []).map((c: any) => (
                            <div key={c.id} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-lg px-2 py-1">
                              <Package className="h-3 w-3 text-amber-600 flex-shrink-0" />
                              <span className="text-xs flex-1 truncate text-amber-800 dark:text-amber-300">
                                {c.producto?.nombre || 'Producto'}
                              </span>
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">×{c.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => solicitarEliminarConsumo(item.id, c.id)}
                                className="text-amber-500 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}

                          {/* Añadir nuevo consumo */}
                          <div className="space-y-1.5 p-2 bg-muted/40 rounded-lg border border-dashed mt-2">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Añadir producto consumido</p>
                            <Select 
                              value={consumoProductoSeleccionado[item.id] || ""} 
                              onValueChange={(val) => setConsumoProductoSeleccionado(prev => ({ ...prev, [item.id]: val }))}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Seleccionar producto..." />
                              </SelectTrigger>
                              <SelectContent>
                                {productos.map(p => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs">
                                    {p.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {consumoProductoSeleccionado[item.id] && (
                              <div className="flex gap-2 items-center mt-2">
                                <Input 
                                  type="number" 
                                  className="h-7 text-xs w-16" 
                                  value={consumoCantidad[item.id] || 1}
                                  onChange={(e) => setConsumoCantidad(prev => ({ ...prev, [item.id]: Number(e.target.value) || 1 }))}
                                  min={0.1}
                                  step="any"
                                />
                                <Button 
                                  size="sm" 
                                  className="h-7 text-xs flex-1" 
                                  onClick={() => agregarConsumo(item.id)}
                                  disabled={guardandoConsumo[item.id]}
                                >
                                  {guardandoConsumo[item.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Añadir"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Lado derecho: Acciones */}
        <div className="space-y-4">
          <Card className="border-primary/20 shadow-sm sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Acciones de Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start h-12 text-base border-dashed border-2">
                    <Plus className="h-5 w-5 mr-2 text-primary" />
                    Añadir Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir a la Cuenta</DialogTitle>
                    <DialogDescription>
                      Selecciona un nuevo servicio o producto consumido por el cliente o su acompañante.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="flex gap-4 p-1 bg-muted/50 rounded-lg">
                      <Button 
                        variant={tipoItem === "servicio" ? "default" : "ghost"} 
                        className="flex-1" 
                        onClick={() => setTipoItem("servicio")}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Servicio
                      </Button>
                      <Button 
                        variant={tipoItem === "producto" ? "default" : "ghost"} 
                        className="flex-1" 
                        onClick={() => setTipoItem("producto")}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Producto
                      </Button>
                    </div>

                    {tipoItem === "servicio" ? (
                      <div className="space-y-2">
                        <Label>Servicio Realizado</Label>
                        <Select value={servicioSeleccionado} onValueChange={setServicioSeleccionado}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar servicio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {servicios.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.nombre} - {formatCurrency(s.precio)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Producto Adquirido</Label>
                        <Select value={productoSeleccionado} onValueChange={setProductoSeleccionado}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {productos.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombre} - {formatCurrency(p.precio)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Empleado Asignado (opcional)</Label>
                      <Select value={empleadoSeleccionado} onValueChange={setEmpleadoSeleccionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="¿Quién realizó o vendió el item?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguno">Sin asignar</SelectItem>
                          {empleados.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notas</Label>
                      <Textarea 
                        placeholder="Ej. Realizado al acompañante..." 
                        value={notas} 
                        onChange={e => setNotas(e.target.value)}
                        className="resize-none h-20 text-sm"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setModalAbierto(false)}>Cancelar</Button>
                    <Button onClick={añadirItem} disabled={guardando || (tipoItem === "servicio" ? !servicioSeleccionado : !productoSeleccionado)}>
                      {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Añadir a la Cuenta"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="bg-muted h-[1px] w-full my-2" />

              <Button 
                onClick={cobrarCuenta} 
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cobrar Cuenta
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Te llevará al Punto de Venta donde podrás añadir productos si el cliente los compró.
              </p>

            </CardContent>
            <CardFooter className="pt-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancelar Cuenta Completa
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar cuenta completa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Estás a punto de cancelar y eliminar permanentemente esta cuenta abierta. Todos los servicios y productos añadidos se perderán y no podrán recuperarse. ¿Deseas continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={eliminarCuenta}
                    >
                      Sí, Cancelar Cuenta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!itemAEliminar} onOpenChange={(open) => !open && setItemAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este servicio de la cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará este servicio y todos los productos asociados a su consumo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!consumoAEliminar} onOpenChange={(open) => !open && setConsumoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto consumido?</AlertDialogTitle>
            <AlertDialogDescription>
              El producto se quitará de la cuenta pero su stock no se verá afectado hasta que se liquide el inventario de la cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminarConsumo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
