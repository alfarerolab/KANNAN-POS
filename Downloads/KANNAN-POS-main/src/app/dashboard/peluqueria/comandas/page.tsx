"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Scissors, Loader2, Clock, User, Plus, Search, CheckCircle, Store, Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function CuentasAbiertasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/iniciar-sesion");
      return;
    }
    cargarCuentas();
  }, [session, status, router]);

  const cargarCuentas = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/peluqueria/comandas?estado=ABIERTA");
      if (res.ok) {
        setCuentas(await res.json());
      } else {
        toast({ title: "Error", description: "No se pudieron cargar las cuentas activas", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

  const cuentasFiltradas = cuentas.filter(c => 
    !busqueda || 
    c.cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.usuario?.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            Cuentas Abiertas
          </h1>
          <p className="text-base text-muted-foreground">
            Gestiona los servicios en curso y añade servicios a cuentas existentes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push("/dashboard/peluqueria/walk-in")} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente o cajero..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10"
        />
      </div>

      {cuentasFiltradas.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">No hay cuentas abiertas</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Actualmente no hay clientes en curso. Puedes crear un nuevo servicio.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuentasFiltradas.map((cuenta) => (
            <Card 
              key={cuenta.id} 
              className="group relative cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col bg-card border-border/50"
              onClick={() => router.push(`/dashboard/peluqueria/comandas/${cuenta.id}`)}
            >
              {/* Decorative top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="pb-3 pt-6">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1.5">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 tracking-tight text-foreground">
                      <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="truncate max-w-[180px]">
                        {cuenta.cliente ? cuenta.cliente.nombre : "Cliente Directo"}
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                      <span>{format(new Date(cuenta.createdAt), "hh:mm a", { locale: es })}</span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-200/50 dark:border-emerald-900 shadow-sm font-semibold tracking-wide uppercase text-[10px] px-2 py-0.5 rounded-full">
                    En Curso
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 flex-1 flex flex-col">
                <div className="space-y-3 flex-1 bg-muted/30 rounded-xl p-3 border border-border/40">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Servicios
                    </p>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-background font-mono">
                      {cuenta.items?.length || 0}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                    {cuenta.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm items-center p-2 rounded-lg bg-background border border-border/50 shadow-sm group/item hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-background shadow-sm" 
                            style={{ backgroundColor: item.servicio?.color || "#6366F1" }}
                          />
                          <span className="truncate max-w-[130px] font-medium text-[13px] text-foreground" title={item.servicio?.nombre || item.producto?.nombre || "Ítem"}>
                            {item.servicio?.nombre || item.producto?.nombre || "Ítem"}
                          </span>
                        </div>
                        <span className="font-medium text-muted-foreground text-[11px] shrink-0 bg-muted px-1.5 py-0.5 rounded-md max-w-[70px] truncate" title={item.empleado?.nombre}>
                          {item.empleado ? item.empleado.nombre.split(' ')[0] : 'Sin asignar'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-end justify-between mt-auto">
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Acumulado</span>
                    <span className="font-black text-2xl text-primary tracking-tight leading-none">
                      {formatCurrency(Number(cuenta.total))}
                    </span>
                  </div>
                  <Button size="sm" className="rounded-full px-4 h-9 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all group-hover:scale-105">
                    Ver Detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
