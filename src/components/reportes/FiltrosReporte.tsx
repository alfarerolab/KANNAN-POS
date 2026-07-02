"use client";

import { useState } from "react";
import { CalendarIcon, Filter, X, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface FiltrosReporteProps {
  fechaInicio: Date | undefined;
  fechaFin: Date | undefined;
  setFechaInicio: (fecha: Date | undefined) => void;
  setFechaFin: (fecha: Date | undefined) => void;
  filtroUsuario: string;
  setFiltroUsuario: (filtro: string) => void;
  filtroCliente: string;
  setFiltroCliente: (filtro: string) => void;
  usuarios: any[];
  clientes: any[];
}

export function FiltrosReporte({
  fechaInicio,
  fechaFin,
  setFechaInicio,
  setFechaFin,
  filtroUsuario,
  setFiltroUsuario,
  filtroCliente,
  setFiltroCliente,
  usuarios,
  clientes,
}: FiltrosReporteProps) {
  const [openInicio, setOpenInicio] = useState(false);
  const [openFin, setOpenFin] = useState(false);

  const hoy = new Date();

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="pb-6 border-b border-border/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-sm">
            <Filter className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-card-foreground">
              Filtros de Reporte
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-1">
              Personaliza los reportes filtrando por fecha, usuario o cliente
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {/* Fecha de Inicio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Fecha de Inicio</label>
            <Popover open={openInicio} onOpenChange={setOpenInicio}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-11 bg-background border-input focus:border-ring"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {fechaInicio ? (
                    format(fechaInicio, "PPP", { locale: es })
                  ) : (
                    <span className="text-muted-foreground">Seleccionar fecha inicio</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {/* Botones Hoy / Borrar */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5"
                    onClick={() => {
                      setFechaInicio(hoy);
                      setOpenInicio(false);
                    }}
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Hoy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFechaInicio(undefined);
                      setOpenInicio(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Borrar
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={fechaInicio}
                  onSelect={(date) => {
                    setFechaInicio(date);
                    setOpenInicio(false); // ← cierra al seleccionar
                  }}
                  initialFocus
                  locale={es}
                  defaultMonth={fechaInicio}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha de Fin */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Fecha de Fin</label>
            <Popover open={openFin} onOpenChange={setOpenFin}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-11 bg-background border-input focus:border-ring"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {fechaFin ? (
                    format(fechaFin, "PPP", { locale: es })
                  ) : (
                    <span className="text-muted-foreground">Seleccionar fecha fin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {/* Botones Hoy / Borrar */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5"
                    onClick={() => {
                      setFechaFin(hoy);
                      setOpenFin(false);
                    }}
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Hoy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFechaFin(undefined);
                      setOpenFin(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Borrar
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={fechaFin}
                  onSelect={(date) => {
                    if (date) {
                      setFechaFin(date);
                      setOpenFin(false); // ← cierra al seleccionar
                    }
                  }}
                  initialFocus
                  locale={es}
                  defaultMonth={fechaFin}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro de usuario */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Usuario</label>
            <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
              <SelectTrigger className="w-full h-11 bg-background border-input focus:border-ring">
                <SelectValue placeholder="Sin filtro de usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los usuarios</SelectItem>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cliente</label>
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="w-full h-11 bg-background border-input focus:border-ring">
                <SelectValue placeholder="Sin filtro de cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}