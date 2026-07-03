"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Plus, Trash2, Search, Package, Tag, AlertCircle } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { ProductoFormValues } from "@/types/producto";
import { DIAS_SEMANA } from "@/lib/precio-dinamico";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProductoSimple {
  id: string;
  nombre: string;
  precio: number | string | null;
  enStock: number | string;
  categoria?: { nombre: string } | null;
}

// ─── Sección: Componentes del Combo ──────────────────────────────────────────

function SeccionComponentes() {
  const form = useFormContext<ProductoFormValues>();
  const componentes = form.watch("componentes") ?? [];

  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<ProductoSimple[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  // Buscar productos disponibles en la empresa
  useEffect(() => {
    if (!mostrarBuscador) return;
    const timeout = setTimeout(async () => {
      setCargando(true);
      try {
        const params = new URLSearchParams({ limite: "50" });
        if (busqueda.trim()) params.set("busqueda", busqueda.trim());
        const res = await fetch(`/api/productos?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          // Excluir el producto que se está editando (para no agregarSe a sí mismo)
          const lista = data.datos ?? data.productos ?? data;
          setProductos(Array.isArray(lista) ? lista : []);
        }
      } catch {
        // silencioso
      } finally {
        setCargando(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, mostrarBuscador]);

  const agregarComponente = (producto: ProductoSimple) => {
    const yaAgregado = componentes.some((c) => c.componenteId === producto.id);
    if (yaAgregado) return;
    form.setValue("componentes", [
      ...componentes,
      { componenteId: producto.id, cantidad: 1, esCortesia: false },
    ]);
    // Guardar nombre y stock en cache local para mostrar en la UI
    setNombresProductos((prev) => ({ ...prev, [producto.id]: producto.nombre }));
    setStockProductos((prev) => ({ ...prev, [producto.id]: Number(producto.enStock) || 0 }));
    setMostrarBuscador(false);
    setBusqueda("");
  };

  const quitarComponente = (componenteId: string) => {
    form.setValue(
      "componentes",
      componentes.filter((c) => c.componenteId !== componenteId)
    );
  };

  const actualizarCantidad = (componenteId: string, cantidad: number) => {
    form.setValue(
      "componentes",
      componentes.map((c) =>
        c.componenteId === componenteId ? { ...c, cantidad: Math.max(1, cantidad) } : c
      )
    );
  };

  const toggleCortesia = (componenteId: string, valor: boolean) => {
    form.setValue(
      "componentes",
      componentes.map((c) =>
        c.componenteId === componenteId ? { ...c, esCortesia: valor } : c
      )
    );
  };

  // Cache local de nombres y stock de productos para mostrarlos en la lista
  const [nombresProductos, setNombresProductos] = useState<Record<string, string>>({});
  const [stockProductos, setStockProductos] = useState<Record<string, number>>({});

  // Cargar nombres y stock para los componentes ya guardados al editar
  useEffect(() => {
    const ids = componentes.map((c) => c.componenteId).filter((id) => !nombresProductos[id]);
    if (ids.length === 0) return;
    Promise.all(
      ids.map((id) =>
        fetch(`/api/productos/${id}`)
          .then((r) => r.json())
          .then((p) => ({ id, nombre: p.nombre ?? id, enStock: Number(p.enStock) || 0 }))
          .catch(() => ({ id, nombre: id, enStock: 0 }))
      )
    ).then((results) => {
      setNombresProductos((prev) => {
        const next = { ...prev };
        results.forEach(({ id, nombre }) => { next[id] = nombre; });
        return next;
      });
      setStockProductos((prev) => {
        const next = { ...prev };
        results.forEach(({ id, enStock }) => { next[id] = enStock; });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentes.length]);

  // Stock disponible del combo (calculado localmente para mostrarlo en UI)
  const comboStock = (() => {
    if (componentes.length === 0) return 0;
    let minStock = Infinity;
    componentes.forEach((c) => {
      const stock = stockProductos[c.componenteId];
      if (stock !== undefined) {
        const posibles = Math.floor(stock / c.cantidad);
        if (posibles < minStock) minStock = posibles;
      }
    });
    return minStock === Infinity ? 0 : minStock;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Componentes del combo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            El inventario se descontará de estos productos al facturar.
          </p>
          {componentes.length > 0 && (
            <p className={`text-xs font-semibold mt-1 ${comboStock > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
              Stock disponible del combo: {comboStock} unidades
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrarBuscador((v) => !v)}
          className="shrink-0 border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar producto
        </Button>
      </div>

      {/* Buscador de productos */}
      {mostrarBuscador && (
        <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
            <Input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="pl-9"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {cargando ? (
              <p className="text-xs text-muted-foreground text-center py-3">Buscando...</p>
            ) : productos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No se encontraron productos.</p>
            ) : (
              productos.map((prod) => {
                const yaAgregado = componentes.some((c) => c.componenteId === prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={yaAgregado}
                    onClick={() => agregarComponente(prod)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                      yaAgregado
                        ? "bg-muted text-muted-foreground/70 cursor-not-allowed border-border"
                        : "bg-card hover:border-orange-500/40 hover:bg-orange-500/10 border-border"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{prod.nombre}</p>
                      {prod.categoria && (
                        <p className="text-xs text-muted-foreground/70">{prod.categoria.nombre}</p>
                      )}
                    </div>
                    {yaAgregado ? (
                      <Badge variant="secondary" className="text-xs">Agregado</Badge>
                    ) : (
                      <Plus className="h-4 w-4 text-orange-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Lista de componentes actuales */}
      {componentes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aún no has agregado componentes al combo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {componentes.map((comp, idx) => (
            <div
              key={comp.componenteId}
              className="flex items-center gap-3 rounded-xl border border-border bg-card dark:bg-background px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {nombresProductos[comp.componenteId] || comp.componenteId}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                    <Checkbox
                      checked={comp.esCortesia}
                      onCheckedChange={(v) => toggleCortesia(comp.componenteId, !!v)}
                      className="h-3.5 w-3.5"
                    />
                    Cortesía (precio $0)
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => actualizarCantidad(comp.componenteId, comp.cantidad - 1)}
                >
                  <span className="text-base leading-none">−</span>
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={comp.cantidad}
                  onChange={(e) => actualizarCantidad(comp.componenteId, Number(e.target.value))}
                  className="h-7 w-12 text-center text-sm px-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => actualizarCantidad(comp.componenteId, comp.cantidad + 1)}
                >
                  <span className="text-base leading-none">+</span>
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 dark:text-red-400 hover:bg-destructive/10 shrink-0"
                onClick={() => quitarComponente(comp.componenteId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sección: Precio Dinámico ─────────────────────────────────────────────────

function SeccionPrecioDinamico() {
  const form = useFormContext<ProductoFormValues>();
  const diasSeleccionados = form.watch("diasPrecioEspecial") ?? [];

  const toggleDia = (diaId: string) => {
    const actuales = form.getValues("diasPrecioEspecial") ?? [];
    if (actuales.includes(diaId)) {
      form.setValue("diasPrecioEspecial", actuales.filter((d) => d !== diaId));
    } else {
      form.setValue("diasPrecioEspecial", [...actuales, diaId]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Precio especial por día</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configura un precio alternativo que aplicará automáticamente los días que elijas.
        </p>
      </div>

      <FormField
        control={form.control}
        name="precioEspecial"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Precio alternativo</FormLabel>
            <FormControl>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                <Input
                  {...field}
                  type="number"
                  min={0}
                  placeholder="Ej: 15000"
                  className="pl-9"
                />
              </div>
            </FormControl>
            <FormDescription>
              Déjalo vacío para no usar precio especial.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/80">
          Días en que aplica el precio especial
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DIAS_SEMANA.map((dia) => {
            const activo = diasSeleccionados.includes(dia.id);
            return (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  activo
                    ? "border-orange-400 bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-1 ring-orange-300"
                    : "border-border bg-card text-muted-foreground hover:border-orange-500/30 hover:bg-orange-500/10/50"
                }`}
              >
                <span className="hidden sm:inline">{dia.label}</span>
                <span className="sm:hidden">{dia.abrev}</span>
              </button>
            );
          })}
        </div>
        {diasSeleccionados.length > 0 && (
          <p className="text-xs text-green-700 dark:text-green-400 bg-emerald-500/10 rounded-lg px-3 py-2 border border-green-100">
            El precio especial aplicará los días:{" "}
            <strong>
              {diasSeleccionados
                .map((id) => DIAS_SEMANA.find((d) => d.id === id)?.label)
                .filter(Boolean)
                .join(", ")}
            </strong>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal: ComboTab ──────────────────────────────────────────

export function ComboTab() {
  const form = useFormContext<ProductoFormValues>();
  const esCombo = form.watch("esCombo");

  return (
    <div className="space-y-8">
      {/* Toggle ¿Es combo? */}
      <FormField
        control={form.control}
        name="esCombo"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-border bg-muted/50/60 px-5 py-4">
            <div>
              <FormLabel className="text-base font-semibold">
                ¿Es un combo / producto compuesto?
              </FormLabel>
              <FormDescription className="mt-0.5">
                Al activar esto, el sistema descontará los ingredientes del inventario al vender este producto (ej: Cubetazo = 6 cervezas).
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                className="data-[state=checked]:bg-orange-500"
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Sección componentes — solo si es combo */}
      {esCombo && (
        <>
          <Alert className="border-orange-500/30 bg-orange-500/10">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-300 text-sm">
              El stock visible en Bar y Restaurante se calculará automáticamente a partir de los componentes.
            </AlertDescription>
          </Alert>
          <SeccionComponentes />
          <Separator />
        </>
      )}

      {/* Precios dinámicos — siempre visible */}
      <SeccionPrecioDinamico />
    </div>
  );
}