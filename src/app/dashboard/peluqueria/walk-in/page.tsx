"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Scissors, User, Clock, CheckCircle, ChevronRight,
  Loader2, Calendar, Search, AlertCircle, Plus, X,
  Sparkles, Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
  color?: string;
  descripcion?: string;
}

interface Empleado {
  id: string;
  nombre: string;
  imagen?: string | null;
}

interface BloqueOcupado {
  tipo: "cita" | "walk-in";
  id: string;
  inicio: string;
  fin: string;
  duracionMin: number;
  servicio: string;
  servicioColor: string;
  cliente: string;
  estado: string;
}

interface DisponibilidadData {
  empleadoId: string;
  bloquesOcupados: BloqueOcupado[];
  proximoSlotLibre: string | null;
  totalCitas: number;
  totalWalkIn: number;
}

interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
}

// ─── Timeline de disponibilidad ───────────────────────────────────────────────
function TimelineDisponibilidad({
  data,
  servicioDuracion,
}: {
  data: DisponibilidadData | null;
  servicioDuracion: number;
}) {
  if (!data) return null;

  const ahora = new Date();
  const horaInicio = 7; // 7am
  const horaFin = 21;   // 9pm
  const totalMinutos = (horaFin - horaInicio) * 60;

  const posicion = (fecha: Date) => {
    const mins = (fecha.getHours() - horaInicio) * 60 + fecha.getMinutes();
    return Math.max(0, Math.min(100, (mins / totalMinutos) * 100));
  };

  const ahoraPos = posicion(ahora);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>7:00 AM</span>
        <span>12:00 PM</span>
        <span>9:00 PM</span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-12 bg-emerald-500/10 rounded-lg overflow-hidden border border-emerald-500/20">
        {/* Bloques ocupados */}
        {data.bloquesOcupados.map((bloque, i) => {
          const ini = new Date(bloque.inicio);
          const finB = new Date(bloque.fin);
          const left = posicion(ini);
          const width = posicion(finB) - left;
          return (
            <div
              key={i}
              className="absolute top-0 h-full opacity-80 flex items-center justify-center rounded-sm"
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 2)}%`,
                backgroundColor: bloque.tipo === "cita" ? "#6366F1" : "#8B5CF6",
              }}
              title={`${bloque.servicio} - ${bloque.cliente}\n${format(new Date(bloque.inicio), "HH:mm")} - ${format(new Date(bloque.fin), "HH:mm")}`}
            >
              {width > 8 && (
                <span className="text-[9px] text-white font-medium px-1 truncate">
                  {bloque.servicio.substring(0, 10)}
                </span>
              )}
            </div>
          );
        })}

        {/* Cursor de hora actual */}
        {ahoraPos >= 0 && ahoraPos <= 100 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
            style={{ left: `${ahoraPos}%` }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
          </div>
        )}

        {/* Slot sugerido */}
        {data.proximoSlotLibre && (() => {
          const slotInicio = new Date(data.proximoSlotLibre);
          const slotFin = new Date(slotInicio.getTime() + servicioDuracion * 60000);
          const left = posicion(slotInicio);
          const width = posicion(slotFin) - left;
          return (
            <div
              className="absolute top-0 h-full opacity-40 border-2 border-emerald-500 rounded-sm"
              style={{ left: `${left}%`, width: `${Math.max(width, 2)}%`, backgroundColor: "#22c55e" }}
              title={`Slot disponible: ${format(slotInicio, "HH:mm")} - ${format(slotFin, "HH:mm")}`}
            />
          );
        })()}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> Cita agendada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-purple-500" /> Walk-in activo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 opacity-60" /> Slot sugerido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 bg-red-500" /> Ahora
        </span>
      </div>

      {/* Bloques detallados */}
      {data.bloquesOcupados.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {data.bloquesOcupados.map((bloque, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg text-sm">
              <span
                className="inline-block w-2 h-8 rounded-full shrink-0"
                style={{ backgroundColor: bloque.tipo === "cita" ? "#6366F1" : "#8B5CF6" }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{bloque.servicio}</p>
                <p className="text-xs text-muted-foreground">{bloque.cliente}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium">
                  {format(new Date(bloque.inicio), "HH:mm")} - {format(new Date(bloque.fin), "HH:mm")}
                </p>
                <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                  {bloque.tipo === "cita" ? "Cita" : "Walk-in"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.proximoSlotLibre && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>
            Próximo horario disponible: <strong>{format(new Date(data.proximoSlotLibre), "HH:mm")}</strong>
          </span>
        </div>
      )}

      {data.bloquesOcupados.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Este empleado está disponible ahora</span>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function WalkInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // Data
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadData | null>(null);

  // Form state
  const [servicioId, setServicioId] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [notas, setNotas] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  // UI state
  const [cargando, setCargando] = useState(true);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exitoso, setExitoso] = useState(false);
  const [comandaCreada, setComandaCreada] = useState<any>(null);

  const servicioSeleccionado = servicios.find(s => s.id === servicioId);
  const empleadoSeleccionado = empleados.find(e => e.id === empleadoId);

  // Autenticación
  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/iniciar-sesion"); return; }
  }, [session, status, router]);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [svcRes, empRes, cliRes] = await Promise.all([
          fetch("/api/servicios"),
          fetch("/api/usuarios?rol=EMPLEADO&activo=true"),
          fetch("/api/clientes"),
        ]);

        if (svcRes.ok) {
          const data = await svcRes.json();
          setServicios(Array.isArray(data) ? data : []);
        }
        if (empRes.ok) {
          const data = await empRes.json();
          const lista = Array.isArray(data) ? data : data?.datos || data?.usuarios || data?.data || [];
          setEmpleados(lista.filter((u: any) => u.activo !== false));
        }
        if (cliRes.ok) {
          const data = await cliRes.json();
          const lista = Array.isArray(data) ? data : data?.clientes || data?.data || [];
          setClientes(lista);
        }
      } catch (err) {
        toast({ title: "Error al cargar datos", variant: "destructive" });
      } finally {
        setCargando(false);
      }
    };
    if (session) cargarDatos();
  }, [session, toast]);

  // Cargar disponibilidad cuando cambia el empleado
  const cargarDisponibilidad = useCallback(async (empId: string) => {
    if (!empId) { setDisponibilidad(null); return; }
    setCargandoDisponibilidad(true);
    try {
      const res = await fetch(`/api/peluqueria/disponibilidad?empleadoId=${empId}`);
      if (res.ok) {
        setDisponibilidad(await res.json());
      }
    } catch {
      // silencioso
    } finally {
      setCargandoDisponibilidad(false);
    }
  }, []);

  useEffect(() => {
    cargarDisponibilidad(empleadoId);
  }, [empleadoId, cargarDisponibilidad]);

  // Crear walk-in
  const crearWalkIn = async () => {
    if (!servicioId) {
      toast({ title: "Selecciona un servicio", variant: "destructive" });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/peluqueria/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioId,
          empleadoId: empleadoId === "ninguno" ? null : (empleadoId || null),
          clienteId: clienteId || null,
          notas: notas || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al crear el servicio");
      }

      const data = await res.json();
      setComandaCreada(data);
      setExitoso(true);
      toast({ title: "✅ Servicio registrado", description: `${servicioSeleccionado?.nombre} — Comanda abierta` });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error desconocido", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  const reiniciar = () => {
    setServicioId("");
    setEmpleadoId("");
    setClienteId("");
    setNotas("");
    setBusquedaCliente("");
    setDisponibilidad(null);
    setExitoso(false);
    setComandaCreada(null);
  };

  const clientesFiltrados = clientes.filter(c =>
    !busquedaCliente ||
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    c.telefono?.includes(busquedaCliente)
  ).slice(0, 10);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Pantalla de éxito ──────────────────────────────────────────────────────
  if (exitoso && comandaCreada) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="border border-emerald-500/30 shadow-lg">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">¡Servicio Registrado!</h2>
              <p className="text-muted-foreground mt-1">La comanda ha sido creada exitosamente</p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl text-left space-y-2">
              {comandaCreada.items?.[0] && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Servicio:</span>
                    <span className="font-medium">{comandaCreada.items[0].servicio?.nombre}</span>
                  </div>
                  {comandaCreada.items[0].empleado && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Empleado:</span>
                      <span className="font-medium">{comandaCreada.items[0].empleado.nombre}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="font-bold text-foreground">{formatCurrency(Number(comandaCreada.items[0].precio))}</span>
                  </div>
                </>
              )}
              {comandaCreada.cliente && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{comandaCreada.cliente.nombre}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hora:</span>
                <span className="font-medium">{format(new Date(comandaCreada.createdAt), "HH:mm", { locale: es })}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={reiniciar} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Servicio
              </Button>
              <Button onClick={() => router.push("/dashboard/peluqueria/comandas")} className="flex-1">
                Ver Cuentas Abiertas
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Formulario principal ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Scissors className="h-7 w-7 text-primary" />
          Servicio Directo
        </h1>
        <p className="text-muted-foreground">
          Registra un servicio para un cliente que llegó directamente al local, sin cita previa
        </p>
      </div>

      {/* Paso 1: Servicio */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
            Seleccionar Servicio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={servicioId} onValueChange={setServicioId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="¿Qué servicio necesita?" />
            </SelectTrigger>
            <SelectContent>
              {servicios.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color || "#6366F1" }}
                    />
                    <span>{s.nombre}</span>
                    <span className="text-muted-foreground ml-auto pl-4 text-xs">
                      {formatCurrency(s.precio)} · {s.duracion} min
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {servicioSeleccionado && (
            <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${servicioSeleccionado.color || "#6366F1"}20` }}
              >
                <Sparkles className="h-5 w-5" style={{ color: servicioSeleccionado.color || "#6366F1" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{servicioSeleccionado.nombre}</p>
                {servicioSeleccionado.descripcion && (
                  <p className="text-xs text-muted-foreground truncate">{servicioSeleccionado.descripcion}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-lg">{formatCurrency(servicioSeleccionado.precio)}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" /> {servicioSeleccionado.duracion} min
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paso 2: Empleado + disponibilidad */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
            Asignar Empleado
            <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={empleadoId} onValueChange={setEmpleadoId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Seleccionar empleado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguno">Sin asignar</SelectItem>
              {empleados.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {e.nombre[0]}
                    </div>
                    {e.nombre}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Vista de disponibilidad */}
          {empleadoId && empleadoId !== "ninguno" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Agenda de hoy — {empleadoSeleccionado?.nombre}
                </Label>
                {cargandoDisponibilidad && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {!cargandoDisponibilidad && (
                <TimelineDisponibilidad
                  data={disponibilidad}
                  servicioDuracion={servicioSeleccionado?.duracion || 30}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paso 3: Cliente (opcional) */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
            Cliente
            <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nombre o teléfono..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {busquedaCliente && (
            <div className="border rounded-lg overflow-hidden">
              {clientesFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">No se encontraron clientes</p>
              ) : (
                clientesFiltrados.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClienteId(c.id);
                      setBusquedaCliente(c.nombre);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${
                      clienteId === c.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {c.nombre[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.nombre}</p>
                      {c.telefono && <p className="text-xs text-muted-foreground">{c.telefono}</p>}
                    </div>
                    {clienteId === c.id && (
                      <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {clienteId && (
            <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{clientes.find(c => c.id === clienteId)?.nombre}</span>
              </div>
              <button onClick={() => { setClienteId(""); setBusquedaCliente(""); }}>
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notas" className="text-sm">Notas adicionales</Label>
            <Textarea
              id="notas"
              placeholder="Instrucciones especiales, preferencias del cliente..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumen y botón de crear */}
      {servicioSeleccionado && (
        <Card className="border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{servicioSeleccionado.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {empleadoSeleccionado ? `con ${empleadoSeleccionado.nombre}` : "Sin empleado asignado"}
                  {clienteId && clientes.find(c => c.id === clienteId)
                    ? ` · ${clientes.find(c => c.id === clienteId)?.nombre}`
                    : " · Cliente directo"
                  }
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(servicioSeleccionado.precio)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={crearWalkIn}
        disabled={!servicioId || guardando}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {guardando ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Registrando servicio...
          </>
        ) : (
          <>
            <Scissors className="h-5 w-5 mr-2" />
            Iniciar Servicio
          </>
        )}
      </Button>
    </div>
  );
}
