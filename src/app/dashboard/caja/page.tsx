"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, Wallet, ArrowDownRight, ArrowUpRight, Calendar, Loader2, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CajaResumen {
  ingresos: { efectivo: number; transferencia_tarjeta: number; total: number };
  gastos: { efectivo: number; transferencia_tarjeta: number; total: number };
  caja: { efectivoEsperado: number; montoInicial?: number };
  turnoAbierto: any | null;
}

export default function CajaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [resumen, setResumen] = useState<CajaResumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [turnos, setTurnos] = useState<any[]>([]);

  const [openAbrir, setOpenAbrir] = useState(false);
  const [montoInicial, setMontoInicial] = useState(0);
  const [openCerrar, setOpenCerrar] = useState(false);
  const [montoFinalReal, setMontoFinalReal] = useState(0);
  const [notasArqueo, setNotasArqueo] = useState("");
  const [procesandoTurno, setProcesandoTurno] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/iniciar-sesion"); return; }
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role as string)) {
      toast({ title: "Sin permisos", variant: "destructive" });
      router.push("/dashboard");
    }
  }, [session, status, router, toast]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/caja/resumen?fecha=${fecha}`);
      if (!res.ok) throw new Error("Error al cargar resumen");
      const data = await res.json();
      setResumen(data.resumen);

      const resTurnos = await fetch(`/api/caja/turnos`);
      if (resTurnos.ok) {
        const dataTurnos = await resTurnos.json();
        setTurnos(dataTurnos.turnos || []);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCargando(false);
    }
  }, [fecha, toast]);

  const handleAbrirCaja = async () => {
    setProcesandoTurno(true);
    try {
      const res = await fetch("/api/caja/turnos/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoInicial })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo abrir la caja");
      }
      toast({ title: "Caja abierta correctamente" });
      setOpenAbrir(false);
      cargar();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcesandoTurno(false);
    }
  };

  const handleCerrarCaja = async () => {
    setProcesandoTurno(true);
    try {
      const res = await fetch("/api/caja/turnos/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoFinalReal, notas: notasArqueo })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo cerrar la caja");
      }
      toast({ title: "Arqueo realizado correctamente" });
      setOpenCerrar(false);
      setMontoFinalReal(0);
      setNotasArqueo("");
      cargar();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcesandoTurno(false);
    }
  };

  useEffect(() => {
    if (session) cargar();
  }, [cargar, session]);

  const formatMoneda = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const esHoy = fecha === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Caja y Flujo de Efectivo</h1>
          <p className="text-base text-muted-foreground">
            Control de ingresos, gastos y efectivo disponible.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-44 h-9"
            />
          </div>
          <Button size="sm" variant="outline" onClick={cargar} disabled={cargando} className="h-9 w-9 p-0">
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Indicador de fecha */}
      {esHoy && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 py-3 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${resumen?.turnoAbierto ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {resumen?.turnoAbierto ? (
              <span>Turno actual abierto — <strong className="text-emerald-600 dark:text-emerald-400">Base: {formatMoneda(resumen.caja.montoInicial || 0)}</strong></span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">La caja del día está cerrada o no se ha abierto</span>
            )}
            <span className="hidden sm:inline mx-2 text-muted-foreground">|</span>
            <span className="text-muted-foreground">{format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}</span>
          </div>
          <div>
            {!cargando && resumen && (
              resumen.turnoAbierto ? (
                <Button variant="destructive" onClick={() => setOpenCerrar(true)} className="h-9 px-4">
                  Cerrar Caja (Arqueo)
                </Button>
              ) : (
                <Button onClick={() => setOpenAbrir(true)} className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                  Abrir Caja
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : resumen ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ingresos Totales */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoneda(resumen.ingresos.total)}
                </span>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Efectivo:</span>
                  <span className="font-medium text-foreground">{formatMoneda(resumen.ingresos.efectivo)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Digital:</span>
                  <span className="font-medium text-foreground">{formatMoneda(resumen.ingresos.transferencia_tarjeta)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gastos Totales */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Salidas / Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                  {formatMoneda(resumen.gastos.total)}
                </span>
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <ArrowDownRight className="h-6 w-6 text-rose-600" />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Efectivo:</span>
                  <span className="font-medium text-foreground">{formatMoneda(resumen.gastos.efectivo)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Digital:</span>
                  <span className="font-medium text-foreground">{formatMoneda(resumen.gastos.transferencia_tarjeta)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Efectivo Físico en Caja */}
          <Card className="border-border shadow-md bg-gradient-to-br from-primary/5 to-purple-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Efectivo en Caja
              </CardTitle>
              <CardDescription>Dinero físico que debe haber en caja</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="mt-2">
                <span className="text-4xl font-extrabold text-foreground">
                  {formatMoneda(resumen.caja.efectivoEsperado)}
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground space-y-1.5">
                <div className="flex justify-between">
                  <span>+ Ingresos Efectivo:</span>
                  <span className="text-emerald-600 font-medium">{formatMoneda(resumen.ingresos.efectivo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- Salidas Efectivo:</span>
                  <span className="text-rose-600 font-medium">{formatMoneda(resumen.gastos.efectivo)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Historial de Turnos */}
      {turnos.length > 0 && (
        <Card className="mt-8 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Historial de Turnos y Arqueos</CardTitle>
            <CardDescription>Últimas cajas registradas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Apertura</TableHead>
                  <TableHead>Fecha Cierre</TableHead>
                  <TableHead>Monto Inicial</TableHead>
                  <TableHead>Monto Esperado</TableHead>
                  <TableHead>Monto Real</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnos.map((turno) => (
                  <TableRow key={turno.id}>
                    <TableCell className="py-3 text-xs">{format(new Date(turno.abiertaEn), "dd/MM/yy HH:mm")}</TableCell>
                    <TableCell className="py-3 text-xs">
                      {turno.cerradaEn ? format(new Date(turno.cerradaEn), "dd/MM/yy HH:mm") : <Badge variant="secondary">Abierto</Badge>}
                    </TableCell>
                    <TableCell className="py-3 font-medium text-xs">{formatMoneda(Number(turno.montoInicial || 0))}</TableCell>
                    <TableCell className="py-3 text-xs">{turno.montoFinalEsperado !== null ? formatMoneda(Number(turno.montoFinalEsperado)) : "-"}</TableCell>
                    <TableCell className="py-3 font-medium text-xs">{turno.montoFinalReal !== null ? formatMoneda(Number(turno.montoFinalReal)) : "-"}</TableCell>
                    <TableCell className="py-3 text-xs">
                      {turno.diferencia !== null ? (
                        <span className={Number(turno.diferencia) < 0 ? "text-rose-600 font-bold" : Number(turno.diferencia) > 0 ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                          {formatMoneda(Number(turno.diferencia))}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="py-3 text-xs">{turno.usuario?.nombre || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={openAbrir} onOpenChange={setOpenAbrir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>
              Registra el monto inicial (base) con el que vas a abrir la caja hoy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Efectivo Inicial en Caja</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={montoInicial || ''}
                  onChange={(e) => setMontoInicial(Number(e.target.value))}
                  className="pl-9"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAbrir(false)} disabled={procesandoTurno}>
              Cancelar
            </Button>
            <Button onClick={handleAbrirCaja} disabled={procesandoTurno || montoInicial < 0} className="bg-emerald-600 hover:bg-emerald-700">
              {procesandoTurno && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Apertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCerrar} onOpenChange={setOpenCerrar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja (Arqueo)</DialogTitle>
            <DialogDescription>
              Cuenta el efectivo físico que hay en la caja registradora e ingrésalo aquí.
              El sistema comparará con el Efectivo Esperado ({resumen ? formatMoneda(resumen.caja.efectivoEsperado) : "$0"}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-rose-600 dark:text-rose-400">Efectivo Físico Real (Contado)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={montoFinalReal || ''}
                  onChange={(e) => setMontoFinalReal(Number(e.target.value))}
                  className="pl-9 font-bold border-rose-200 dark:border-rose-900 focus-visible:ring-rose-500"
                  placeholder="0"
                />
              </div>
              {montoFinalReal > 0 && resumen && (
                <p className={`text-xs mt-1 ${montoFinalReal - resumen.caja.efectivoEsperado === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  Diferencia: {formatMoneda(montoFinalReal - resumen.caja.efectivoEsperado)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (Opcional)</label>
              <Input
                value={notasArqueo}
                onChange={(e) => setNotasArqueo(e.target.value)}
                placeholder="Ej. Faltaron $500 por cambio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCerrar(false)} disabled={procesandoTurno}>
              Cancelar
            </Button>
            <Button onClick={handleCerrarCaja} disabled={procesandoTurno || montoFinalReal < 0} variant="destructive">
              {procesandoTurno && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Arqueo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
