"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash, AlertTriangle, Package } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProductForm } from "@/components/productos/ProductoForm";
import { ComboForm } from "@/components/productos/ComboForm";
import { useProductForm } from "@/hooks/useProductForm";
import { useCategories } from "@/hooks/useCategories";
import { useProveedores } from "@/hooks/useProveedores";
import type { ProductoFormValues } from "@/types/producto";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Esquema para ajuste de inventario
const ajusteInventarioSchema = z.object({
  cantidad: z
    .string()
    .min(1, { message: "La cantidad es requerida" })
    .refine((value) => !isNaN(Number.parseInt(value)) && Number.parseInt(value) !== 0, {
      message: "La cantidad debe ser un número entero distinto de cero",
    }),
  motivo: z
    .string()
    .min(2, { message: "El motivo debe tener al menos 2 caracteres" })
    .max(100, { message: "El motivo no puede tener más de 100 caracteres" }),
});

type AjusteInventarioValues = z.infer<typeof ajusteInventarioSchema>;

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [producto, setProducto] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false);
  const [isAjusteSubmitting, setIsAjusteSubmitting] = useState(false);

  const { categorias } = useCategories();
  const { proveedores } = useProveedores();
  const { form } = useProductForm();

  const ajusteForm = useForm<AjusteInventarioValues>({
    resolver: zodResolver(ajusteInventarioSchema),
    defaultValues: {
      cantidad: "",
      motivo: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productoResponse = await fetch(`/api/productos/${resolvedParams.id}`);

        if (!productoResponse.ok) {
          throw new Error(`Error ${productoResponse.status}: ${productoResponse.statusText}`);
        }

        const productoData = await productoResponse.json();
        setProducto(productoData);

        // Establecer los valores del formulario con conversión segura de tipos
        form.reset({
          nombre: productoData.nombre || "",
          descripcion: productoData.descripcion || "",
          tipoVenta: productoData.tipoVenta || "UNIDAD",
          tieneIva: Boolean(productoData.tieneIva ?? false),
          tarifaIva: productoData.tarifaIva ? productoData.tarifaIva.toString() : "",
          precio: productoData.precio ? productoData.precio.toString() : "",
          precioSugerido: productoData.precioSugerido ? productoData.precioSugerido.toString() : "",
          precioCosto: productoData.precioCosto ? productoData.precioCosto.toString() : "",
          margenGanancia: productoData.margenGanancia ? productoData.margenGanancia.toString() : "",
          precioPorKilo: productoData.precioPorKilo ? productoData.precioPorKilo.toString() : "",
          precioPorGramo: productoData.precioPorGramo ? productoData.precioPorGramo.toString() : "",
          precioPorMetro: productoData.precioPorMetro ? productoData.precioPorMetro.toString() : "",
          precioPorLitro: productoData.precioPorLitro ? productoData.precioPorLitro.toString() : "",
          unidadBase: productoData.unidadBase || "",
          unidadVenta: productoData.unidadVenta || "",
          factorConversion: productoData.factorConversion ? productoData.factorConversion.toString() : "",
          requiereBalanza: Boolean(productoData.requiereBalanza),
          pesoAproximado: productoData.pesoAproximado ? productoData.pesoAproximado.toString() : "",
          codigoBarras: productoData.codigoBarras || "",
          sku: productoData.sku || "",
          imagen: productoData.imagen || "",
          imagenCodigoBarras: productoData.imagenCodigoBarras || "",
          enStock: productoData.enStock ? productoData.enStock.toString() : "0",
          stockMinimo: productoData.stockMinimo ? productoData.stockMinimo.toString() : "5",
          activo: Boolean(productoData.activo),
          categoriaId: productoData.categoriaId || "",
          proveedorId: productoData.proveedorId || "",
        });
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información del producto",
          variant: "destructive",
        });
        router.push("/dashboard/productos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id, form, router, toast]);

  const onSubmit = async (data: ProductoFormValues) => {
    setIsSubmitting(true);

    try {
      // Preparar precio según el tipo de venta
      let precioFinal = null;

      if (data.tipoVenta === "PESO") {
        // Para PESO: copiar precioPorKilo al precio
        precioFinal = data.precioPorKilo && data.precioPorKilo !== "" 
          ? Number.parseFloat(data.precioPorKilo) 
          : null;
      } else if (data.tipoVenta === "METRO") {
        // Para METRO: copiar precioPorMetro al precio
        precioFinal = data.precioPorMetro && data.precioPorMetro !== "" 
          ? Number.parseFloat(data.precioPorMetro) 
          : null;
      } else if (data.tipoVenta === "LITRO") {
        // Para LITRO: copiar precioPorLitro al precio
        precioFinal = data.precioPorLitro && data.precioPorLitro !== "" 
          ? Number.parseFloat(data.precioPorLitro) 
          : null;
      } else if (data.tipoVenta === "PRECIO_LIBRE") {
        // Para PRECIO_LIBRE: usar 0 si está vacío
        precioFinal = data.precio && data.precio !== "" 
          ? Number.parseFloat(data.precio) 
          : 0;
      } else {
        // Para otros tipos (UNIDAD, etc.): usar el precio normal
        precioFinal = data.precio && data.precio !== "" 
          ? Number.parseFloat(data.precio) 
          : null;
      }

      // Convertir y limpiar los valores
      const formattedData = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        tipoVenta: data.tipoVenta,
        precio: precioFinal,
        precioSugerido: data.precioSugerido && data.precioSugerido !== "" ? Number.parseFloat(data.precioSugerido) : null,
        precioCosto: data.precioCosto && data.precioCosto !== "" ? Number.parseFloat(data.precioCosto) : null,
        margenGanancia: data.margenGanancia && data.margenGanancia !== "" ? Number.parseFloat(data.margenGanancia) : null,
        tieneIva: Boolean(data.tieneIva),
        tarifaIva: data.tarifaIva && data.tarifaIva !== "" ? Number.parseFloat(data.tarifaIva) : null,
        precioPorKilo: data.precioPorKilo && data.precioPorKilo !== "" ? Number.parseFloat(data.precioPorKilo) : null,
        precioPorGramo: data.precioPorGramo && data.precioPorGramo !== "" ? Number.parseFloat(data.precioPorGramo) : null,
        precioPorMetro: data.precioPorMetro && data.precioPorMetro !== "" ? Number.parseFloat(data.precioPorMetro) : null,
        precioPorLitro: data.precioPorLitro && data.precioPorLitro !== "" ? Number.parseFloat(data.precioPorLitro) : null,
        unidadBase: data.unidadBase?.trim() || null,
        unidadVenta: data.unidadVenta?.trim() || null,
        factorConversion: data.factorConversion && data.factorConversion !== "" ? Number.parseFloat(data.factorConversion) : null,
        requiereBalanza: Boolean(data.requiereBalanza),
        pesoAproximado: data.pesoAproximado && data.pesoAproximado !== "" ? Number.parseFloat(data.pesoAproximado) : null,
        codigoBarras: data.codigoBarras?.trim() || null,
        sku: data.sku?.trim() || null,
        imagen: data.imagen?.trim() || null,
        imagenCodigoBarras: data.imagenCodigoBarras?.trim() || null,
        enStock: Number.parseFloat(data.enStock),
        stockMinimo: Number.parseFloat(data.stockMinimo),
        activo: Boolean(data.activo),
        categoriaId: data.categoriaId && data.categoriaId !== "sin-categoria" && data.categoriaId !== "" ? data.categoriaId : null,
        proveedorId: data.proveedorId && data.proveedorId !== "sin-proveedor" && data.proveedorId !== "" ? data.proveedorId : null,
      };

      const response = await fetch(`/api/productos/${resolvedParams.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        let errorMessage = "Error al actualizar el producto";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.mensaje || errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Actualizar los datos del producto en el estado
      setProducto({
        ...producto,
        ...formattedData,
      });

      toast({
        title: "¡Éxito!",
        description: "El producto ha sido actualizado correctamente",
      });
    } catch (error) {
      let errorMessage = "Error inesperado al actualizar el producto";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitCombo = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
      };

      const res = await fetch(`/api/productos/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.mensaje || "Error al actualizar el combo");
      }

      toast({
        title: "¡Éxito!",
        description: "El combo ha sido actualizado correctamente.",
      });
      
      const updatedData = await res.json();
      setProducto({ ...producto, ...updatedData });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error inesperado al actualizar el combo";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  async function onAjusteSubmit(data: AjusteInventarioValues) {
    setIsAjusteSubmitting(true);

    try {
      const cantidad = Number.parseInt(data.cantidad);

      const response = await fetch(`/api/productos/${resolvedParams.id}/inventario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cantidad,
          motivo: data.motivo,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Error al ajustar el inventario";
        try {
          const errorData = await response.json();
          errorMessage = errorData.mensaje || errorData.message || errorMessage;
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const updatedData = await response.json();

      setProducto({
        ...producto,
        enStock: updatedData.enStock,
      });

      form.setValue("enStock", updatedData.enStock.toString());

      toast({
        title: "Inventario ajustado",
        description: `Se han ${cantidad > 0 ? 'añadido' : 'removido'} ${Math.abs(cantidad)} unidades al inventario`,
      });

      setAjusteDialogOpen(false);
      ajusteForm.reset({ cantidad: "", motivo: "" });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al ajustar el inventario",
        variant: "destructive",
      });
    } finally {
      setIsAjusteSubmitting(false);
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/productos/${resolvedParams.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let errorMessage = "Error al eliminar el producto";
        try {
          const errorData = await response.json();
          errorMessage = errorData.mensaje || errorData.message || errorMessage;
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado correctamente",
      });

      router.push("/dashboard/productos");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el producto",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando información del producto...</p>
        </div>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No se pudo cargar el producto</p>
      </div>
    );
  }

  return (
  <div className="flex flex-col gap-6">
    {/* Header superior */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/productos">
          <Button variant="outline" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Editar Producto</h1>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setAjusteDialogOpen(true)}>
          <Package className="h-4 w-4 mr-2" />
          Ajustar Inventario
        </Button>
        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          <Trash className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </div>
    </div>

    {/* Contenedor principal */}
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr]">
      {/* Tarjeta izquierda - Vista previa */}
      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle>Vista Previa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <div className="w-full aspect-square relative rounded-md overflow-hidden mb-4 bg-muted">
            {producto?.imagen ? (
              <Image
                src={producto.imagen}
                alt={producto.nombre}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground">
                {producto?.nombre ? producto.nombre.substring(0, 2).toUpperCase() : "??"}
              </div>
            )}
          </div>
          <h3 className="font-bold text-lg text-center">{producto?.nombre}</h3>
          <p className="text-center text-muted-foreground text-sm mb-1">
            {producto?.codigoBarras || producto?.sku || "Sin código"}
          </p>
          <p className="text-center text-lg font-semibold mb-1">
            {`$${Number(producto?.precio ?? 0).toLocaleString("es-CO", {
              minimumFractionDigits: 2,
            })}`}
          </p>
          <p className="text-center mt-1">
            <span
              className={
                Number(producto?.enStock ?? 0) < Number(producto?.stockMinimo ?? 5)
                  ? "text-destructive font-medium"
                  : ""
              }
            >
              Stock: {producto?.enStock ?? 0} unidades
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Tarjeta derecha - Formulario */}
      <Card className="shadow-md border border-border">
        <CardHeader>
          <CardTitle className="text-xl">Datos del Producto</CardTitle>
          <CardDescription>
            Actualiza la información del producto
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {producto?.esCombo ? (
            <ComboForm
              categorias={categorias}
              onSubmit={onSubmitCombo}
              isSubmitting={isSubmitting}
              initialData={producto}
            />
          ) : (
            <ProductForm
              form={form}
              categorias={categorias}
              proveedores={proveedores}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              isEditing={true}
              productoId={resolvedParams.id}
            />
          )}
        </CardContent>
      </Card>
    </div>

    {/* Diálogo eliminar */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmar eliminación
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro de eliminar el producto{" "}
            <strong>{producto?.nombre}</strong>? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Diálogo ajuste de inventario */}
    <Dialog open={ajusteDialogOpen} onOpenChange={setAjusteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Inventario</DialogTitle>
          <DialogDescription>
            Añade o remueve unidades del inventario para el producto{" "}
            <strong>{producto?.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...ajusteForm}>
          <form onSubmit={ajusteForm.handleSubmit(onAjusteSubmit)} className="space-y-4">
            <FormField
              control={ajusteForm.control}
              name="cantidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad*</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 10 para añadir, -5 para restar"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Usa números positivos para añadir y negativos para restar unidades
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={ajusteForm.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo*</FormLabel>
                  <FormControl>
                    <Input placeholder="Motivo del ajuste" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setAjusteDialogOpen(false);
                  ajusteForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isAjusteSubmitting}>
                {isAjusteSubmitting ? "Aplicando..." : "Aplicar Ajuste"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  </div>
);
}