"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, X, UserPlus, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// Esquema de validación para el formulario
const clienteFormSchema = z.object({
  nombre: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede tener más de 100 caracteres" }),
  email: z
    .string()
    .email({ message: "Debe ser un correo electrónico válido" })
    .optional()
    .or(z.literal("")),
  telefono: z
    .string()
    .max(15, { message: "El teléfono no puede tener más de 15 caracteres" })
    .optional()
    .or(z.literal("")),
  direccion: z
    .string()
    .max(200, { message: "La dirección no puede tener más de 200 caracteres" })
    .optional()
    .or(z.literal("")),
});

type ClienteFormValues = z.infer<typeof clienteFormSchema>;

export default function NuevoClientePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<ClienteFormValues> = {
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
  };

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues,
  });

  async function onSubmit(data: ClienteFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: data.nombre,
          email: data.email || undefined,
          telefono: data.telefono || undefined,
          direccion: data.direccion || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || errorData.message || "Error al crear el cliente");
      }

      const nuevoCliente = await response.json();
      toast({
        title: "¡Cliente registrado exitosamente!",
        description: `${data.nombre} ha sido agregado a tu base de clientes`,
      });

      router.push("/dashboard/clientes");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el cliente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clientes">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuevo Cliente</h1>
            <p className="text-muted-foreground">
              Registra un nuevo cliente en tu base de datos
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <UserPlus className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold text-card-foreground">
                Información del Cliente
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">
                Completa los datos del nuevo cliente. Solo el nombre es obligatorio.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-6" />

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                {/* Nombre - Campo obligatorio */}
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Nombre Completo *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Juan Pérez González"
                          className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Nombre completo del cliente tal como deseas que aparezca en los registros
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Información de Contacto */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Información de Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Correo Electrónico
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="correo@ejemplo.com"
                              type="email"
                              className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-sm text-muted-foreground">
                            Email para comunicaciones y facturas electrónicas
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
                          <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Teléfono
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ej: +57 300 123 4567"
                              className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-sm text-muted-foreground">
                            Número de contacto principal del cliente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Dirección */}
                <FormField
                  control={form.control}
                  name="direccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Dirección
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: Calle 123 #45-67, Barrio Centro, Ciudad"
                          className="resize-none h-24 bg-background border-input focus:border-ring transition-colors duration-200"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Dirección completa para entregas o visitas (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Link href="/dashboard/clientes">
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
                      Guardando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Crear Cliente
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
                Puedes agregar solo el nombre inicialmente y completar el resto de la información más tarde. 
                Los datos de contacto te ayudarán a comunicarte mejor con tus clientes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}