"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { productoFormSchema, type ProductoFormValues } from "@/types/producto";

export function useEditProducto(productId: string) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [producto, setProducto] = useState<any>(null);

  const form = useForm<ProductoFormValues>({
    // @ts-expect-error Mismatch de tipos Prisma u obj temporal
    resolver: zodResolver(productoFormSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      tipoVenta: "UNIDAD",
      incluyeIva: true,
      tarifaIva: "19",
      // @ts-expect-error Mismatch de tipos Prisma u obj temporal
      esExentoIva: false,
      precio: "",
      precioCosto: "",
      precioPorKilo: "",
      precioPorGramo: "",
      precioPorMetro: "",
      precioPorLitro: "",
      unidadBase: "",
      unidadVenta: "",
      factorConversion: "",
      requiereBalanza: false,
      pesoAproximado: "",
      codigoBarras: "",
      sku: "",
      imagen: "",
      enStock: "0",
      stockMinimo: "5",
      activo: true,
      categoriaId: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const response = await fetch(`/api/productos/${productId}`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const productoData = await response.json();
        setProducto(productoData);

        // Establecer valores del formulario
        form.reset({
          nombre: productoData.nombre || "",
          descripcion: productoData.descripcion || "",
          tipoVenta: productoData.tipoVenta || "UNIDAD",
          incluyeIva: Boolean(productoData.incluyeIva ?? true),
          tarifaIva: productoData.tarifaIva ? productoData.tarifaIva.toString() : "19",
          // @ts-expect-error Mismatch de tipos Prisma u obj temporal
          esExentoIva: Boolean(productoData.esExentoIva),
          precio: productoData.precio ? productoData.precio.toString() : "",
          precioCosto: productoData.precioCosto ? productoData.precioCosto.toString() : "",
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
          enStock: productoData.enStock ? productoData.enStock.toString() : "0",
          stockMinimo: productoData.stockMinimo ? productoData.stockMinimo.toString() : "5",
          activo: Boolean(productoData.activo),
          categoriaId: productoData.categoriaId || "",
        });
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información del producto",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducto();
  }, [productId, form, toast]);

  const handleSubmit = async (data: ProductoFormValues) => {
    setIsSubmitting(true);

    try {
      const formattedData = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        tipoVenta: data.tipoVenta,
        precio: parseFloat(data.precio),
        precioCosto: data.precioCosto && data.precioCosto !== "" ? parseFloat(data.precioCosto) : null,
        incluyeIva: Boolean(data.incluyeIva),
        tarifaIva: parseFloat(data.tarifaIva),
        // @ts-expect-error Mismatch de tipos Prisma u obj temporal
        esExentoIva: Boolean(data.esExentoIva),
        precioPorKilo: data.precioPorKilo && data.precioPorKilo !== "" ? parseFloat(data.precioPorKilo) : null,
        precioPorGramo: data.precioPorGramo && data.precioPorGramo !== "" ? parseFloat(data.precioPorGramo) : null,
        precioPorMetro: data.precioPorMetro && data.precioPorMetro !== "" ? parseFloat(data.precioPorMetro) : null,
        precioPorLitro: data.precioPorLitro && data.precioPorLitro !== "" ? parseFloat(data.precioPorLitro) : null,
        unidadBase: data.unidadBase?.trim() || null,
        unidadVenta: data.unidadVenta?.trim() || null,
        factorConversion: data.factorConversion && data.factorConversion !== "" ? parseFloat(data.factorConversion) : null,
        requiereBalanza: Boolean(data.requiereBalanza),
        pesoAproximado: data.pesoAproximado && data.pesoAproximado !== "" ? parseFloat(data.pesoAproximado) : null,
        codigoBarras: data.codigoBarras?.trim() || null,
        sku: data.sku?.trim() || null,
        imagen: data.imagen?.trim() || null,
        enStock: parseFloat(data.enStock),
        stockMinimo: parseFloat(data.stockMinimo),
        activo: Boolean(data.activo),
        categoriaId: data.categoriaId && data.categoriaId !== "sin-categoria" && data.categoriaId !== "" ? data.categoriaId : null,
      };

      const response = await fetch(`/api/productos/${productId}`, {
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

      // Actualizar el producto en el estado
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

  const handleDelete = async () => {
    const response = await fetch(`/api/productos/${productId}`, {
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
  };

  return {
    producto,
    isLoading,
    isSubmitting,
    form,
    handleSubmit,
    handleDelete,
  };
}