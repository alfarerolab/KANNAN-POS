// components/citas/FormularioNuevoCliente.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Cliente, ClienteFormValues } from "@/types/citas";

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

interface FormularioNuevoClienteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClienteCreado: (cliente: Cliente) => void;
  tema: any;
}

export function FormularioNuevoCliente({
  open,
  onOpenChange,
  onClienteCreado,
  tema
}: FormularioNuevoClienteProps) {
  const [creandoCliente, setCreandoCliente] = useState(false);

  const clienteForm = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      direccion: "",
    },
  });

  const crearNuevoCliente = async (data: ClienteFormValues) => {
    try {
      setCreandoCliente(true);

      const datosCliente = {
        nombre: data.nombre,
        email: data.email || undefined,
        telefono: data.telefono || undefined,
        direccion: data.direccion || undefined,
      };

      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosCliente),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 409) {
          throw new Error('Ya existe un cliente con ese email');
        }

        throw new Error(
          errorData.mensaje ||
          errorData.error ||
          `Error ${response.status} al crear el cliente`
        );
      }

      const nuevoCliente = await response.json();
      clienteForm.reset();
      onClienteCreado(nuevoCliente);
      toast.success(`Cliente "${nuevoCliente.nombre}" creado exitosamente`);
    } catch (error) {
      console.error('Error al crear cliente:', error);

      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          toast.error("Error de conexión. Verifica tu internet e intenta de nuevo.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Error inesperado al crear el cliente");
      }
    } finally {
      setCreandoCliente(false);
    }
  };

  const cerrarModal = () => {
    onOpenChange(false);
    clienteForm.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Crea un nuevo cliente para asignar a la cita
          </DialogDescription>
        </DialogHeader>

        <Form {...clienteForm}>
          <form onSubmit={clienteForm.handleSubmit(crearNuevoCliente)} className="space-y-4">
            <div className="grid gap-4">
              <FormField
                control={clienteForm.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ingrese el nombre del cliente"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={clienteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clienteForm.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número de teléfono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={clienteForm.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dirección del cliente"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={cerrarModal}
                disabled={creandoCliente}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creandoCliente}
                className={tema.accent}
              >
                {creandoCliente ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear Cliente
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}