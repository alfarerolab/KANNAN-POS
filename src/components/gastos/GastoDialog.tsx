"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface CategoriaGasto {
  id: string;
  nombre: string;
}

interface GastoForm {
  concepto: string;
  monto: number;
  categoriaId: string;
  metodoPago: string;
  fecha: string;
}

interface GastoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gastoEditar?: {
    id: string;
    concepto: string;
    monto: number;
    categoriaId: string;
    metodoPago?: string;
    fecha: string;
  } | null;
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "OTRO", label: "Otro" },
];

export function GastoDialog({ open, onOpenChange, onSuccess, gastoEditar }: GastoDialogProps) {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GastoForm>({
    defaultValues: {
      concepto: "",
      monto: 0,
      categoriaId: "",
      metodoPago: "EFECTIVO",
      fecha: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const categoriaId = watch("categoriaId");
  const metodoPago = watch("metodoPago");

  // Cargar categorías
  useEffect(() => {
    if (open) {
      fetch("/api/gastos/categorias")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setCategorias(data);
        })
        .catch(console.error);
    }
  }, [open]);

  // Precargar datos si es edición
  useEffect(() => {
    if (gastoEditar) {
      reset({
        concepto: gastoEditar.concepto,
        monto: gastoEditar.monto,
        categoriaId: gastoEditar.categoriaId,
        metodoPago: gastoEditar.metodoPago || "EFECTIVO",
        fecha: gastoEditar.fecha.slice(0, 10),
      });
    } else {
      reset({
        concepto: "",
        monto: 0,
        categoriaId: "",
        metodoPago: "EFECTIVO",
        fecha: format(new Date(), "yyyy-MM-dd"),
      });
    }
  }, [gastoEditar, reset, open]);

  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setCreandoCategoria(true);
    try {
      const res = await fetch("/api/gastos/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCategoria.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje);
      setCategorias((prev) => [...prev, data]);
      setValue("categoriaId", data.id);
      setNuevaCategoria("");
      setMostrarNuevaCategoria(false);
      toast({ title: "Categoría creada", description: data.nombre });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreandoCategoria(false);
    }
  };

  const onSubmit = async (datos: GastoForm) => {
    setGuardando(true);
    try {
      const url = gastoEditar ? `/api/gastos/${gastoEditar.id}` : "/api/gastos";
      const method = gastoEditar ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje);

      toast({
        title: gastoEditar ? "Gasto actualizado" : "Gasto registrado",
        description: `$${Number(datos.monto).toLocaleString("es-CO")} — ${datos.concepto}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {gastoEditar ? "Editar Gasto" : "Registrar Gasto Operativo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Concepto */}
          <div className="space-y-1.5">
            <Label htmlFor="concepto-gasto">Concepto / Descripción *</Label>
            <Textarea
              id="concepto-gasto"
              placeholder="Ej: Taxi para compra de emergencia..."
              className="resize-none"
              rows={2}
              {...register("concepto", { required: "El concepto es requerido" })}
            />
            {errors.concepto && (
              <p className="text-xs text-destructive">{errors.concepto.message}</p>
            )}
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label htmlFor="monto-gasto">Monto *</Label>
            <Input
              id="monto-gasto"
              type="number"
              min="1"
              step="any"
              placeholder="0"
              {...register("monto", {
                required: "El monto es requerido",
                min: { value: 1, message: "El monto debe ser mayor a 0" },
              })}
            />
            {errors.monto && (
              <p className="text-xs text-destructive">{errors.monto.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="categoria-gasto">Categoría *</Label>
              <button
                type="button"
                onClick={() => setMostrarNuevaCategoria((v) => !v)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Nueva categoría
              </button>
            </div>

            {mostrarNuevaCategoria && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la categoría..."
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCrearCategoria())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCrearCategoria}
                  disabled={creandoCategoria || !nuevaCategoria.trim()}
                >
                  {creandoCategoria ? <Loader2 className="h-3 w-3 animate-spin" /> : "Crear"}
                </Button>
              </div>
            )}

            <Select
              value={categoriaId}
              onValueChange={(v) => setValue("categoriaId", v)}
            >
              <SelectTrigger id="categoria-gasto">
                <SelectValue placeholder="Seleccionar categoría..." />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
                {categorias.length === 0 && (
                  <p className="py-2 px-4 text-sm text-muted-foreground">
                    Sin categorías. Crea una arriba.
                  </p>
                )}
              </SelectContent>
            </Select>
            {errors.categoriaId && (
              <p className="text-xs text-destructive">{errors.categoriaId.message}</p>
            )}
          </div>

          {/* Fila: Fecha + Método de pago */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha-gasto">Fecha</Label>
              <Input
                id="fecha-gasto"
                type="date"
                {...register("fecha")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metodo-gasto">Método de pago</Label>
              <Select value={metodoPago} onValueChange={(v) => setValue("metodoPago", v)}>
                <SelectTrigger id="metodo-gasto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
            >
              {guardando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : gastoEditar ? "Actualizar" : "Registrar Gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
