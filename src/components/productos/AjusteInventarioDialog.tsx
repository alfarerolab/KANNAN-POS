"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ajusteInventarioSchema = z.object({
  cantidad: z
    .string()
    .min(1, { message: "La cantidad es requerida" })
    .refine((value) => !isNaN(parseInt(value)) && parseInt(value) !== 0, {
      message: "La cantidad debe ser un número entero distinto de cero",
    }),
  motivo: z
    .string()
    .min(2, { message: "El motivo debe tener al menos 2 caracteres" })
    .max(100, { message: "El motivo no puede tener más de 100 caracteres" }),
});

type AjusteInventarioValues = z.infer<typeof ajusteInventarioSchema>;

interface AjusteInventarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: any;
  onSuccess: (nuevoStock: number) => void;
}

export function AjusteInventarioDialog({
  open,
  onOpenChange,
  producto,
  onSuccess,
}: AjusteInventarioDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AjusteInventarioValues>({
    resolver: zodResolver(ajusteInventarioSchema),
    defaultValues: {
      cantidad: "",
      motivo: "",
    },
  });

  const handleSubmit = async (data: AjusteInventarioValues) => {
    setIsSubmitting(true);

    try {
      const cantidad = parseInt(data.cantidad);

      const response = await fetch(`/api/productos/${producto.id}/inventario`, {
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

      toast({
        title: "Inventario ajustado",
        description: `Se han ${cantidad > 0 ? 'añadido' : 'removido'} ${Math.abs(cantidad)} unidades al inventario`,
      });

      onSuccess(updatedData.enStock);
      onOpenChange(false);
      form.reset({ cantidad: "", motivo: "" });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al ajustar el inventario",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Inventario</DialogTitle>
          <DialogDescription>
            Añade o remueve unidades del inventario para el producto{" "}
            <strong>{producto?.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
              control={form.control}
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
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Aplicando..." : "Aplicar Ajuste"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}