"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Save, Plus, Package, Minus, Trash2, Calendar, Target, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import type { Categoria } from "@/types/producto";
import { DIAS_SEMANA } from "@/lib/precio-dinamico";

const comboSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().optional(),
  precio: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  categoriaId: z.string().optional().nullable(),
  activo: z.boolean(),
  
  // Precios especiales
  precioEspecial: z.coerce.number().nullable().optional(),
  diasPrecioEspecial: z.string().nullable().optional(),
  
  // Componentes
  componentes: z.array(z.object({
    componenteId: z.string(),
    cantidad: z.coerce.number().min(0.01),
  })).min(1, "Un combo debe tener al menos 1 producto"),
});

export type ComboFormValues = z.infer<typeof comboSchema>;

interface ComboFormProps {
  categorias: Categoria[];
  onSubmit: (data: ComboFormValues) => Promise<void>;
  isSubmitting: boolean;
  initialData?: any;
}

export function ComboForm({ categorias, onSubmit, isSubmitting, initialData }: ComboFormProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);

  const form = useForm<ComboFormValues>({
    resolver: zodResolver(comboSchema),
    defaultValues: {
      nombre: initialData?.nombre || "",
      descripcion: initialData?.descripcion || "",
      precio: initialData?.precio || 0,
      categoriaId: initialData?.categoriaId || null,
      activo: initialData?.activo ?? true,
      precioEspecial: initialData?.precioEspecial || null,
      diasPrecioEspecial: initialData?.diasPrecioEspecial || null,
      componentes: initialData?.componentes?.map((c: any) => ({
        componenteId: c.componenteId || c.productoId,
        cantidad: c.cantidad
      })) || [],
    },
  });

  const { fields: componentes, append, remove, update } = useFieldArray({
    control: form.control,
    name: "componentes",
  });

  // Cargar lista de productos disponibles
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await fetch("/api/productos");
        if (res.ok) {
          const data = await res.json();
          // Excluir el mismo combo si se está editando
          const lista = data.datos ?? data.productos ?? data;
          let prodList = Array.isArray(lista) ? lista : [];
          if (initialData?.id) {
            prodList = prodList.filter((p: any) => p.id !== initialData.id);
          }
          setProductos(prodList);
        }
      } catch (err) {
        console.error("Error cargando productos", err);
      }
    };
    fetchProductos();
  }, [initialData]);

  // Cargar días especiales iniciales
  useEffect(() => {
    if (initialData?.diasPrecioEspecial) {
      try {
        const dias = JSON.parse(initialData.diasPrecioEspecial);
        if (Array.isArray(dias)) setDiasSeleccionados(dias);
      } catch (e) {}
    }
  }, [initialData]);

  // Actualizar el campo serializado
  useEffect(() => {
    const jsonStr = diasSeleccionados.length > 0 ? JSON.stringify(diasSeleccionados) : null;
    form.setValue("diasPrecioEspecial", jsonStr, { shouldDirty: true });
  }, [diasSeleccionados, form]);

  const toggleDia = (diaId: string) => {
    setDiasSeleccionados((prev) => 
      prev.includes(diaId) ? prev.filter((d) => d !== diaId) : [...prev, diaId]
    );
  };

  const handleAdjustQuantity = (index: number, current: number, delta: number) => {
    let newVal = current + delta;
    if (newVal < 1) newVal = 1;
    const item = form.getValues(`componentes.${index}`);
    update(index, { ...item, cantidad: newVal });
  };

  const calculateCostPrice = () => {
    let totalCost = 0;
    const comps = form.getValues('componentes') || [];
    comps.forEach(c => {
      const p = productos.find(prod => prod.id === c.componenteId);
      if (p) {
        totalCost += (p.precioCosto || 0) * c.cantidad;
      }
    });
    return totalCost;
  };

  // Stock disponible del combo = mínimo de floor(stockComponente / cantidadRequerida)
  const calculateComboStock = () => {
    const comps = form.getValues('componentes') || [];
    if (comps.length === 0) return 0;
    let minStock = Infinity;
    comps.forEach(c => {
      const p = productos.find(prod => prod.id === c.componenteId);
      if (p) {
        const stockDisponible = Math.floor((Number(p.enStock) || 0) / c.cantidad);
        if (stockDisponible < minStock) minStock = stockDisponible;
      }
    });
    return minStock === Infinity ? 0 : minStock;
  };

  const watchedComponentes = form.watch("componentes");
  const currentCost = calculateCostPrice();
  const comboStock = calculateComboStock();
  const currentPrice = form.watch("precio") || 0;
  const currentSpecial = form.watch("precioEspecial") || 0;
  
  const marginNormal = currentPrice > 0 ? ((currentPrice - currentCost) / currentPrice) * 100 : 0;
  const marginSpecial = currentSpecial > 0 ? ((currentSpecial - currentCost) / currentSpecial) * 100 : 0;

  const filteredProductos = productos.filter(p => !p.esCombo && (
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.codigoBarras && p.codigoBarras.includes(searchTerm))
  ));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        // Calcular stock disponible según componentes antes de enviar
        const stockCalculado = calculateComboStock();
        return onSubmit({ ...data, enStock: stockCalculado } as any);
      })} className="space-y-8">
        
        {/* Info y Precios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Target className="h-5 w-5 text-orange-500"/> Información General</h3>
            
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Combo *</FormLabel>
                <FormControl><Input placeholder="Ej. Cubetazo Aguila" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="precio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de Venta</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="categoriaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="descripcion" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea className="resize-none h-16" placeholder="Incluye esto y aquello..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="activo" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/50">
                <div className="space-y-0.5">
                  <FormLabel>Combo Activo</FormLabel>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-orange-500"/> Precios Especiales (Promociones)</h3>
            
            <FormField control={form.control} name="precioEspecial" render={({ field }) => (
              <FormItem>
                <FormLabel>Precio Promocional</FormLabel>
                <FormControl><Input type="number" placeholder="Ej. 19900" {...field} value={field.value || ''}/></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormItem>
              <FormLabel>¿Qué días aplica el precio promocional?</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {diasSeleccionados.length === 0 ? "No hay días seleccionados" : 
                     diasSeleccionados.length === 7 ? "Todos los días" : 
                     `${diasSeleccionados.length} días seleccionados`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  {DIAS_SEMANA.map((dia) => (
                    <DropdownMenuCheckboxItem
                      key={dia.id}
                      checked={diasSeleccionados.includes(dia.id)}
                      onCheckedChange={() => toggleDia(dia.id)}
                    >
                      {dia.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FormItem>

            <div className="rounded-xl bg-orange-500/10 border border-orange-100 p-4 mt-6">
              <h4 className="text-sm font-semibold text-orange-900 mb-2">Análisis de Costos</h4>
              <p className="text-xs text-orange-800 dark:text-orange-300 mb-4 tracking-wide">
                El costo total de este combo se calcula sumando los precios de costo de los productos que selecciones.
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock disponible del combo:</span>
                  <span className={`font-bold ${comboStock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {comboStock} unidades
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo Base Individuales:</span>
                  <span className="font-medium text-foreground">{formatCurrency(currentCost)}</span>
                </div>
                {currentPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Margen Precio Normal:</span>
                    <span className={`font-bold ${marginNormal > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {marginNormal.toFixed(1)}%
                    </span>
                  </div>
                )}
                {currentSpecial > 0 && diasSeleccionados.length > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-orange-500/30">
                    <span className="text-muted-foreground flex items-center gap-1">Margen Promocional:</span>
                    <span className={`font-bold ${marginSpecial > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {marginSpecial.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section Componentes */}
         <div className="mt-12 rounded-xl border border-border bg-card dark:bg-background overflow-hidden shadow-sm">
          <div className="bg-muted/50 border-b border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-500" /> Componentes del Combo
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega los productos que conforman este combo
              </p>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 grid lg:grid-cols-[1fr,350px] xl:grid-cols-[1fr,400px] gap-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">Productos Incluidos</h4>
              
              {componentes.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center p-8 text-center bg-muted/50/50">
                  <PlusCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">Aún no hay productos</p>
                  <p className="text-sm text-muted-foreground mt-1">Busca y selecciona a la derecha</p>
                  {form.formState.errors.componentes && (
                    <p className="text-red-500 text-sm mt-2">{form.formState.errors.componentes.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {componentes.map((field, index) => {
                    const prod = productos.find(p => p.id === field.componenteId);
                    if (!prod) return null;
                    return (
                      <div key={field.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-card dark:bg-background shadow-sm gap-3">
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-10 w-10 rounded shrink-0 bg-muted flex items-center justify-center text-muted-foreground/70 overflow-hidden relative">
                            {prod.imagen ? (
                              <Image src={prod.imagen} alt={prod.nombre} layout="fill" objectFit="cover" />
                            ) : <Package className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{prod.nombre}</p>
                            <p className="text-xs text-muted-foreground">Costo ind: {formatCurrency(prod.precioCosto || 0)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                          <div className="flex items-center bg-muted rounded-md border border-border">
                            <button type="button" onClick={() => handleAdjustQuantity(index, field.cantidad, -1)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-border hover:text-foreground rounded-l-md transition-colors"><Minus className="h-3 w-3" /></button>
                            <span className="w-10 text-center text-sm font-medium">{field.cantidad}</span>
                            <button type="button" onClick={() => handleAdjustQuantity(index, field.cantidad, 1)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-border hover:text-foreground rounded-r-md transition-colors"><Plus className="h-3 w-3" /></button>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-destructive/10 rounded-md"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Buscador de productos */}
            <div className="border border-border rounded-xl bg-muted/50 flex flex-col h-[500px]">
              <div className="p-4 border-b border-border bg-card dark:bg-background rounded-t-xl">
                 <Input 
                  placeholder="Buscar producto para agregar..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="p-2 space-y-1 overflow-y-auto flex-1">
                 {filteredProductos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No se encontraron productos.</p>
                  ) : (
                    filteredProductos.map((prod) => {
                      const yaAgregado = componentes.some(c => c.componenteId === prod.id);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          disabled={yaAgregado}
                          onClick={() => {
                            if (!yaAgregado) {
                              append({ componenteId: prod.id, cantidad: 1 });
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                            yaAgregado 
                              ? "bg-muted opacity-60 cursor-not-allowed" 
                              : "bg-card hover:bg-indigo-500/10 border border-transparent hover:border-indigo-100 shadow-sm"
                          }`}
                        >
                          <div className="h-8 w-8 rounded shrink-0 bg-muted flex items-center justify-center text-muted-foreground/70 overflow-hidden relative">
                            {prod.imagen ? (
                              <Image src={prod.imagen} alt={prod.nombre} layout="fill" objectFit="cover" />
                            ) : <Package className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{prod.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {prod.enStock} en stock
                            </p>
                          </div>
                          {yaAgregado ? (
                            <span className="text-[10px] font-bold text-muted-foreground/70 bg-border px-1.5 py-0.5 rounded-sm">AGREGADO</span>
                          ) : (
                            <Plus className="h-4 w-4 text-indigo-400" />
                          )}
                        </button>
                      );
                    })
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={() => window.history.back()} className="h-11 px-8">Cancelar</Button>
          <Button type="submit" disabled={isSubmitting} className="h-11 px-8 bg-orange-600 hover:bg-orange-700 text-primary-foreground">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Guardando..." : "Guardar Combo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}