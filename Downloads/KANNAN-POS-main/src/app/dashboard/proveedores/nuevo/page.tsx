"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, X, Building2 } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

// Esquema de validación para el formulario
const proveedorFormSchema = z.object({
  nombre: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede tener más de 100 caracteres" })
    .trim(),
  empresa: z
    .string()
    .max(100, { message: "La empresa no puede tener más de 100 caracteres" })
    .transform(val => val?.trim() || ""),
  email: z
    .string()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    }, { message: "Ingresa un email válido" })
    .transform(val => val?.trim() || ""),
  telefono: z
    .string()
    .max(20, { message: "El teléfono no puede tener más de 20 caracteres" })
    .transform(val => val?.trim() || ""),
  direccion: z
    .string()
    .max(200, { message: "La dirección no puede tener más de 200 caracteres" })
    .transform(val => val?.trim() || ""),
  contacto: z
    .string()
    .max(100, { message: "El contacto no puede tener más de 100 caracteres" })
    .transform(val => val?.trim() || ""),
  notas: z
    .string()
    .max(500, { message: "Las notas no pueden tener más de 500 caracteres" })
    .transform(val => val?.trim() || ""),
  activo: z.boolean(),
});

// Tipo para el formulario
type ProveedorFormValues = {
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  direccion: string;
  contacto: string;
  notas: string;
  activo: boolean;
};

export default function NuevoProveedorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Definir valores por defecto para el formulario
  const defaultValues: ProveedorFormValues = {
    nombre: "",
    empresa: "",
    email: "",
    telefono: "",
    direccion: "",
    contacto: "",
    notas: "",
    activo: true,
  };

  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<ProveedorFormValues> = async (data) => {
    setIsSubmitting(true);

    try {
      // Convertir y limpiar los valores
      const formattedData = {
        nombre: data.nombre.trim(),
        empresa: data.empresa.trim() || null,
        email: data.email.trim() || null,
        telefono: data.telefono.trim() || null,
        direccion: data.direccion.trim() || null,
        contacto: data.contacto.trim() || null,
        notas: data.notas.trim() || null,
        activo: Boolean(data.activo),
      };

      const response = await fetch("/api/proveedores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        let errorMessage = "Error al crear el proveedor";
        let errorData = null;

        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }

        // Log para debugging (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
          console.error("Error de la API:", {
            status: response.status,
            statusText: response.statusText,
            errorData,
            error: errorMessage
          });
        }

        throw new Error(errorMessage);
      }

      // Parsear respuesta exitosa
      const result = await response.json();

      // Log para debugging (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
      }

      toast({
        title: "¡Proveedor creado exitosamente!",
        description: `El proveedor "${result.nombre}" ha sido creado correctamente`,
      });

      // Redireccionar al listado de proveedores
      router.push("/dashboard/proveedores");
      router.refresh();

    } catch (error) {
      // Log para debugging (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.error("Error completo:", error);
      }

      let errorMessage = "Error inesperado al crear el proveedor";

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

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/proveedores">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuevo Proveedor</h1>
            <p className="text-muted-foreground">
              Crea un nuevo proveedor para gestionar tus productos
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold text-card-foreground">
                Información del Proveedor
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">
                Completa los campos a continuación para registrar un nuevo proveedor
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-6" />

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                {/* Información Básica */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-foreground">
                            Nombre del Proveedor *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ej: Juan Pérez, Empresa ABC..."
                              className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-sm text-muted-foreground">
                            Nombre completo o razón social del proveedor
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="empresa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-foreground">
                            Empresa
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nombre de la empresa"
                              className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-sm text-muted-foreground">
                            Empresa o organización a la que pertenece
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-foreground">
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="email@ejemplo.com"
                              className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-sm text-muted-foreground">
                            Correo electrónico de contacto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-foreground">
                            Teléfono
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Número de teléfono"
                              className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-sm text-muted-foreground">
                            Número de contacto principal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contacto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-foreground">
                          Persona de Contacto
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nombre del contacto principal"
                            className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-sm text-muted-foreground">
                          Persona responsable o contacto directo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-foreground">
                          Dirección
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Dirección completa"
                            className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-sm text-muted-foreground">
                          Dirección física del proveedor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-foreground">
                          Notas
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Información adicional sobre el proveedor..."
                            className="resize-none h-24 bg-background border-input focus:border-ring transition-colors duration-200"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-sm text-muted-foreground">
                          Observaciones, condiciones especiales o información relevante
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium text-foreground">
                            Proveedor Activo
                          </FormLabel>
                          <FormDescription className="text-sm text-muted-foreground">
                            Los proveedores inactivos no aparecerán disponibles para nuevos productos
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Link href="/dashboard/proveedores">
                  <Button 
                    variant="outline" 
                    type="button"
                    className="w-full sm:w-auto h-11 px-8 border-input hover:bg-muted transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-11 px-8 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Crear Proveedor
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-emerald-500/10/50 border-emerald-500/30/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-900">
                Consejo
              </p>
              <p className="text-sm text-green-800 dark:text-green-300">
                Completa toda la información de contacto disponible. Esto te facilitará 
                la comunicación y gestión de pedidos con tus proveedores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}