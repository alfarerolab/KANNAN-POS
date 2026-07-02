// components/ventas/ConfiguracionMetasModal.tsx
"use client"

import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Target, Calendar, DollarSign, TrendingUp, Save, AlertCircle } from "lucide-react";
import { useMetas } from "@/hooks/use-metas";
import { toast } from "sonner";

const metaSchema = z.object({
  periodo: z.enum(['diaria', 'semanal', 'mensual'], {
    required_error: "El período es requerido",
  }),
  objetivo: z.number({
    required_error: "El objetivo es requerido",
  }).min(1, "El objetivo debe ser mayor a 0"),
  tipo: z.enum(['ingresos', 'ventas']),
  activa: z.boolean(),
});

type FormularioMeta = z.infer<typeof metaSchema>;

interface ConfiguracionMetasModalProps {
  abierto: boolean;
  onClose: () => void;
  metaEditar?: {
    id: string;
    periodo: 'diaria' | 'semanal' | 'mensual';
    objetivo: number;
    tipo?: 'ingresos' | 'ventas';
    activa?: boolean;
  } | null;
}

export function ConfiguracionMetasModal({ 
  abierto, 
  onClose, 
  metaEditar = null 
}: ConfiguracionMetasModalProps) {
  const { 
    configurarMeta, 
    actualizarMeta, 
    configurarMetasMultiples,
    obtenerMetaPorTipo,
    loading,
    formatearMoneda 
  } = useMetas();

  const [modo, setModo] = useState<'individual' | 'multiple'>('individual');
  const [loadingAction, setLoadingAction] = useState(false);

  const form = useForm<FormularioMeta>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      periodo: 'mensual',
      objetivo: 0,
      tipo: 'ingresos',
      activa: true,
    },
  });

  // Formulario para configuración múltiple
  const [metasMultiples, setMetasMultiples] = useState({
    diaria: { objetivo: 0, activa: false },
    semanal: { objetivo: 0, activa: false },
    mensual: { objetivo: 0, activa: false },
  });

  // Cargar datos si estamos editando
  useEffect(() => {
    if (metaEditar) {
      form.reset({
        periodo: metaEditar.periodo,
        objetivo: metaEditar.objetivo,
        tipo: metaEditar.tipo || 'ingresos',
        activa: metaEditar.activa ?? true,
      });
    } else {
      form.reset({
        periodo: 'mensual',
        objetivo: 0,
        tipo: 'ingresos',
        activa: true,
      });
    }
  }, [metaEditar, form]);

  // Sugerencias basadas en el período
  const obtenerSugerencias = (periodo: string) => {
    const sugerencias = {
      diaria: [50000, 100000, 200000, 300000],
      semanal: [300000, 500000, 1000000, 1500000],
      mensual: [1000000, 3000000, 5000000, 10000000],
    };

    return sugerencias[periodo as keyof typeof sugerencias] || [];
  };

  const handleSubmitIndividual = async (datos: FormularioMeta) => {
    try {
      setLoadingAction(true);

      if (metaEditar) {
        await actualizarMeta(metaEditar.periodo, {
          objetivo: datos.objetivo,
          tipo: datos.tipo,
        });
      } else {
        await configurarMeta(datos);
      }

      onClose();
      form.reset();
    } catch (error) {
      console.error('Error al configurar meta:', error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSubmitMultiple = async () => {
    try {
      setLoadingAction(true);

      const configuraciones = Object.entries(metasMultiples)
        .filter(([_, meta]) => meta.activa && meta.objetivo > 0)
        .map(([periodo, meta]) => ({
          periodo: periodo as 'diaria' | 'semanal' | 'mensual',
          objetivo: meta.objetivo,
          tipo: 'ingresos' as const,
          activa: true,
        }));

      if (configuraciones.length === 0) {
        toast.error('Debes activar al menos una meta con un objetivo válido');
        return;
      }

      await configurarMetasMultiples(configuraciones);
      onClose();
      setMetasMultiples({
        diaria: { objetivo: 0, activa: false },
        semanal: { objetivo: 0, activa: false },
        mensual: { objetivo: 0, activa: false },
      });
    } catch (error) {
      console.error('Error al configurar metas múltiples:', error);
    } finally {
      setLoadingAction(false);
    }
  };

  const actualizarMetaMultiple = (periodo: string, campo: string, valor: any) => {
    setMetasMultiples(prev => ({
      ...prev,
      [periodo]: {
        ...prev[periodo as keyof typeof prev],
        [campo]: valor,
      }
    }));
  };

  return (
    <Dialog open={abierto} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {metaEditar ? 'Editar Meta' : 'Configurar Metas de Venta'}
          </DialogTitle>
          <DialogDescription>
            {metaEditar 
              ? `Actualiza la meta ${metaEditar.periodo} con los nuevos valores.`
              : 'Define tus objetivos de ventas para monitorear el progreso de tu negocio.'
            }
          </DialogDescription>
        </DialogHeader>

        {!metaEditar && (
          <Tabs value={modo} onValueChange={(v) => setModo(v as 'individual' | 'multiple')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Meta Individual</TabsTrigger>
              <TabsTrigger value="multiple">Múltiples Metas</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmitIndividual)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="periodo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Período</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar período" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="diaria">Diaria</SelectItem>
                              <SelectItem value="semanal">Semanal</SelectItem>
                              <SelectItem value="mensual">Mensual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Meta</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ingresos">Ingresos ($)</SelectItem>
                              <SelectItem value="ventas">Cantidad de Ventas</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="objetivo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Objetivo {form.watch('tipo') === 'ingresos' ? '(COP)' : '(Cantidad)'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ingresa tu objetivo"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          {form.watch('tipo') === 'ingresos' 
                            ? `Meta de ingresos ${form.watch('periodo')} en pesos colombianos`
                            : `Número de ventas que deseas alcanzar ${form.watch('periodo')}`
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sugerencias rápidas */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sugerencias rápidas:</label>
                    <div className="flex flex-wrap gap-2">
                      {obtenerSugerencias(form.watch('periodo')).map((sugerencia) => (
                        <Button
                          key={sugerencia}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue('objetivo', sugerencia)}
                        >
                          {formatearMoneda(sugerencia)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="activa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Meta Activa</FormLabel>
                          <FormDescription>
                            La meta aparecerá en el dashboard y se calculará automáticamente
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="multiple" className="space-y-4">
              <div className="grid gap-4">
                {(['diaria', 'semanal', 'mensual'] as const).map((periodo) => {
                  const metaExistente = obtenerMetaPorTipo(periodo);
                  
                  return (
                    <Card key={periodo} className={metaExistente ? "border-blue-500/30 bg-blue-500/10" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm capitalize flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Meta {periodo}
                          </CardTitle>
                          {metaExistente && (
                            <Badge variant="outline">Ya configurada</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {metaExistente && (
                          <div className="text-xs text-muted-foreground p-2 bg-card dark:bg-background rounded">
                            Actual: {formatearMoneda(metaExistente.objetivo)} 
                            • Progreso: {metaExistente.progreso?.toFixed(1) || 0}%
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={metasMultiples[periodo].activa}
                            onCheckedChange={(checked) => 
                              actualizarMetaMultiple(periodo, 'activa', checked)
                            }
                          />
                          <label className="text-sm">Activar meta {periodo}</label>
                        </div>

                        {metasMultiples[periodo].activa && (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="Objetivo en COP"
                              value={metasMultiples[periodo].objetivo || ''}
                              onChange={(e) => 
                                actualizarMetaMultiple(periodo, 'objetivo', Number(e.target.value))
                              }
                            />
                            
                            <div className="flex flex-wrap gap-1">
                              {obtenerSugerencias(periodo).slice(0, 3).map((sugerencia) => (
                                <Button
                                  key={sugerencia}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => 
                                    actualizarMetaMultiple(periodo, 'objetivo', sugerencia)
                                  }
                                >
                                  {formatearMoneda(sugerencia)}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Solo para edición individual */}
        {metaEditar && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitIndividual)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <div className="p-2 bg-muted rounded text-sm capitalize">
                    {metaEditar.periodo}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Meta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ingresos">Ingresos ($)</SelectItem>
                          <SelectItem value="ventas">Cantidad de Ventas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="objetivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuevo Objetivo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={metaEditar 
              ? form.handleSubmit(handleSubmitIndividual)
              : modo === 'individual' 
                ? form.handleSubmit(handleSubmitIndividual)
                : handleSubmitMultiple
            }
            disabled={loadingAction || loading}
          >
            {loadingAction ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {metaEditar ? 'Actualizar Meta' : 'Configurar Metas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}