"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building, Save, User, Crown, CreditCard, Calendar, Loader2, Check, Star, Percent, Eye, EyeOff, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { servicioEmpresas } from "@/lib/api-service";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  meses: number;
  activo: boolean;
  destacado: boolean;
  descuento: number;
  caracteristicas: string[];
}

interface FormData {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  planId: string;
  planMeses: number;
  fechaVencimiento: string;
  nombreAdmin: string;
  emailAdmin: string;
  telefonoAdmin: string;
  contrasenaAdmin: string;
  confirmarContrasena: string;
}

export default function NuevaEmpresaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [planesLoading, setPlanesLoading] = useState(true);
  const [planes, setPlanes] = useState<Plan[]>([]);

  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    planId: "",
    planMeses: 1,
    fechaVencimiento: "",
    nombreAdmin: "",
    emailAdmin: "",
    telefonoAdmin: "",
    contrasenaAdmin: "",
    confirmarContrasena: ""
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const generarContrasena = () => {
    const minLongitud = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let newPassword = "";
    
    // Asegurar al menos uno de cada tipo
    newPassword += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    newPassword += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    newPassword += "0123456789"[Math.floor(Math.random() * 10)];
    newPassword += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    
    for (let i = 4; i < minLongitud; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        newPassword += charset[randomIndex];
    }
    
    // Shuffle the password
    newPassword = newPassword.split('').sort(() => 0.5 - Math.random()).join('');

    setFormData(prev => ({ 
      ...prev, 
      contrasenaAdmin: newPassword,
      confirmarContrasena: newPassword 
    }));
    
    if (errors.contrasenaAdmin) setErrors(prev => ({ ...prev, contrasenaAdmin: undefined }));
    if (errors.confirmarContrasena) setErrors(prev => ({ ...prev, confirmarContrasena: undefined }));
    
    setShowPassword(true);
    setShowConfirmPassword(true);
    
    toast({
      title: "Contraseña generada",
      description: "Se ha generado una contraseña segura automáticamente.",
    });
  };

  useEffect(() => {
    let intentos = 0;
    const maxIntentos = 3;

    const cargarPlanes = async () => {
      try {
        setPlanesLoading(true);
        const response = await fetch('/api/administrador/planes', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        // Si no autorizado, reintentar después de que cargue la sesión
        if (response.status === 401 && intentos < maxIntentos) {
          intentos++;
          setTimeout(cargarPlanes, 800);
          return;
        }

        if (!response.ok) {
          throw new Error('Error al cargar planes');
        }

        const data = await response.json();
        
        const planesActivos = data
          .filter((plan: Plan) => plan.activo)
          .map((plan: any) => {
            let caracteristicas = [];
            
            if (Array.isArray(plan.caracteristicas)) {
              caracteristicas = plan.caracteristicas;
            } else if (typeof plan.caracteristicas === 'string') {
              try {
                caracteristicas = JSON.parse(plan.caracteristicas);
              } catch (e) {
                caracteristicas = plan.caracteristicas
                  .split(/[\n,]+/)
                  .map((item: string) => item.trim())
                  .filter((item: string) => item.length > 0);
              }
            }
            
            return {
              ...plan,
              caracteristicas
            };
          });
        setPlanes(planesActivos);

        const planDestacado = planesActivos.find((p: Plan) => p.destacado);
        // No autoseleccionar plan — es opcional
        if (planDestacado) {
          setFormData(prev => ({
            ...prev,
            planId: planDestacado.id,
            planMeses: planDestacado.meses
          }));
        }
      } catch (error) {
        console.error("Error al cargar planes:", error);
        // No mostrar error bloqueante — los planes son opcionales
      } finally {
        setPlanesLoading(false);
      }
    };

    cargarPlanes();
  }, [toast]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    // Si ya está seleccionado, deseleccionar (plan opcional)
    if (formData.planId === plan.id) {
      setFormData(prev => ({
        ...prev,
        planId: "",
        planMeses: 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        planId: plan.id,
        planMeses: plan.meses
      }));
    }
  };

  const calcularPrecioConDescuento = (precio: number, descuento: number) => {
    return precio - (precio * descuento / 100);
  };

  const calcularPrecioMensual = (precio: number, meses: number) => {
    return Math.round((precio / meses) * 100) / 100;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // planId es opcional - la empresa puede crearse sin plan
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido";
    if (!formData.email.trim()) newErrors.email = "El email es requerido";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    if (!formData.nombreAdmin.trim()) newErrors.nombreAdmin = "El nombre del administrador es requerido";
    if (!formData.emailAdmin.trim()) newErrors.emailAdmin = "El email del administrador es requerido";
    if (!formData.contrasenaAdmin) newErrors.contrasenaAdmin = "La contraseña es requerida";
    if (formData.contrasenaAdmin.length < 6) newErrors.contrasenaAdmin = "La contraseña debe tener al menos 6 caracteres";
    if (formData.contrasenaAdmin !== formData.confirmarContrasena) {
      newErrors.confirmarContrasena = "Las contraseñas no coinciden";
    }

    if (formData.emailAdmin && !emailRegex.test(formData.emailAdmin)) {
      newErrors.emailAdmin = "El email del administrador no es válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor corrija los errores en el formulario",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Solo calcular fechaVencimiento si hay un plan seleccionado
      const fechaVencimiento = formData.planId ? new Date() : null;
      if (fechaVencimiento && formData.planMeses) {
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + formData.planMeses);
      }

      await servicioEmpresas.crearEmpresa({
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono || undefined,
        direccion: formData.direccion || undefined,
        tipoNegocio: "OTRO",
        ...(fechaVencimiento ? { fechaVencimiento: fechaVencimiento.toISOString() } : {}),
        nombreAdmin: formData.nombreAdmin,
        emailAdmin: formData.emailAdmin,
        telefonoAdmin: formData.telefonoAdmin || undefined,
        contrasenaAdmin: formData.contrasenaAdmin,
        ...(formData.planId ? { planId: formData.planId, planMeses: formData.planMeses } : {}),
      });

      toast({
        title: "🎉 Empresa creada exitosamente",
        description: formData.planId
          ? `La empresa ha sido creada con una suscripción de ${formData.planMeses} mes(es)`
          : "La empresa ha sido creada correctamente",
      });

      router.push("/dashboard/superadmin/empresas");
    } catch (error) {
      console.error("Error al registrar empresa:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la empresa. Verifica los datos o intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const planSeleccionado = planes.find(plan => plan.id === formData.planId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/superadmin/empresas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Nueva Suscripción SaaS
          </h1>
          <p className="text-muted-foreground">
            Crea una nueva empresa cliente con suscripción mensual al sistema POS
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan de Suscripción <span className="text-sm font-normal text-muted-foreground">(Opcional)</span>
            </CardTitle>
            <CardDescription>
              Selecciona un plan de suscripción (opcional). Puedes asignarlo después desde la gestión de suscripciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planesLoading ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">Cargando planes disponibles...</p>
                </div>
              </div>
            ) : planes.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-border dark:border-border rounded-lg">
                <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">Sin planes activos</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  No hay planes disponibles. Puedes crear la empresa sin plan y asignar uno después.
                </p>
                <Link href="/dashboard/superadmin/planes" target="_blank">
                  <Button variant="outline" size="sm">
                    Crear un plan (abre en nueva pestaña)
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {planes.map((plan) => {
                    const precioConDescuento = calcularPrecioConDescuento(plan.precio, plan.descuento);
                    const precioMensual = calcularPrecioMensual(precioConDescuento, plan.meses);
                    const isSelected = formData.planId === plan.id;

                    return (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all relative ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-300 shadow-md'
                            : 'hover:bg-muted/50 hover:border-border'
                        } ${plan.destacado ? 'ring-2 ring-yellow-400' : ''}`}
                        onClick={() => handlePlanSelect(plan)}
                      >
                        {plan.destacado && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-yellow-500 text-primary-foreground">
                              <Star className="h-3 w-3 mr-1" />
                              Destacado
                            </Badge>
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute -top-2 -right-2">
                            <div className="bg-blue-600 text-primary-foreground rounded-full p-1">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )}

                        <CardHeader className="text-center pb-2">
                          <CardTitle className="text-lg">{plan.nombre}</CardTitle>
                          {plan.descripcion && (
                            <p className="text-xs text-muted-foreground">{plan.descripcion}</p>
                          )}
                          <div className="space-y-1 mt-2">
                            {plan.descuento > 0 && (
                              <div className="text-sm text-muted-foreground line-through">
                                {formatCurrency(plan.precio)}
                              </div>
                            )}
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(precioConDescuento)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 text-center space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(precioMensual)}/mes
                          </p>
                          <div className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <Calendar className="h-3 w-3" />
                            {plan.meses} {plan.meses === 1 ? 'mes' : 'meses'}
                          </div>
                          {plan.descuento > 0 && (
                            <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600">
                              <Percent className="h-3 w-3 mr-1" />
                              {plan.descuento}% descuento
                            </Badge>
                          )}
                          {Array.isArray(plan.caracteristicas) && plan.caracteristicas.length > 0 && (
                            <div className="text-xs text-left mt-3 space-y-1">
                              {plan.caracteristicas.slice(0, 3).map((caracteristica, index) => (
                                <div key={index} className="flex items-start gap-1">
                                  <Check className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-1">{caracteristica}</span>
                                </div>
                              ))}
                              {plan.caracteristicas.length > 3 && (
                                <div className="text-muted-foreground">
                                  +{plan.caracteristicas.length - 3} más...
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {!formData.planId && planes.length > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">⚠️ No has seleccionado un plan. La empresa se creará sin suscripción activa.</p>
                )}

                {planSeleccionado && (
                  <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-blue-900">
                      <Check className="h-4 w-4" />
                      Plan Seleccionado: {planSeleccionado.nombre}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Precio base:</span>
                        <div className="font-medium">{formatCurrency(planSeleccionado.precio)}</div>
                      </div>
                      {planSeleccionado.descuento > 0 && (
                        <div>
                          <span className="text-muted-foreground">Descuento:</span>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            -{formatCurrency(planSeleccionado.precio * planSeleccionado.descuento / 100)}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Precio final:</span>
                        <div className="font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(calcularPrecioConDescuento(planSeleccionado.precio, planSeleccionado.descuento))}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duración:</span>
                        <div className="font-medium">
                          {planSeleccionado.meses} {planSeleccionado.meses === 1 ? 'mes' : 'meses'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Vencimiento: {new Date(Date.now() + (planSeleccionado.meses * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Información de la Empresa Cliente
            </CardTitle>
            <CardDescription>
              Datos básicos de la empresa que usará el sistema POS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Ej: Tienda El Progreso"
                />
                {errors.nombre && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.nombre}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Corporativo *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contacto@empresa.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  placeholder="+502 1234-5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Textarea
                id="direccion"
                value={formData.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                placeholder="Dirección completa de la empresa"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Administrador de la Empresa
            </CardTitle>
            <CardDescription>
              Usuario que tendrá acceso completo para gestionar su sistema POS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombreAdmin">Nombre Completo *</Label>
                <Input
                  id="nombreAdmin"
                  value={formData.nombreAdmin}
                  onChange={(e) => handleInputChange('nombreAdmin', e.target.value)}
                  placeholder="Juan Pérez"
                />
                {errors.nombreAdmin && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.nombreAdmin}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailAdmin">Email *</Label>
                <Input
                  id="emailAdmin"
                  type="email"
                  value={formData.emailAdmin}
                  onChange={(e) => handleInputChange('emailAdmin', e.target.value)}
                  placeholder="admin@empresa.com"
                />
                {errors.emailAdmin && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.emailAdmin}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefonoAdmin">Teléfono</Label>
                <Input
                  id="telefonoAdmin"
                  value={formData.telefonoAdmin}
                  onChange={(e) => handleInputChange('telefonoAdmin', e.target.value)}
                  placeholder="+502 1234-5678"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="contrasenaAdmin">Contraseña *</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    onClick={generarContrasena}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Generar segura
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="contrasenaAdmin"
                    type={showPassword ? "text" : "password"}
                    value={formData.contrasenaAdmin}
                    onChange={(e) => handleInputChange('contrasenaAdmin', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.contrasenaAdmin && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.contrasenaAdmin}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmarContrasena">Confirmar Contraseña *</Label>
                <div className="relative md:w-1/2 pr-2">
                  <Input
                    id="confirmarContrasena"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmarContrasena}
                    onChange={(e) => handleInputChange('confirmarContrasena', e.target.value)}
                    placeholder="Repite la contraseña"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmarContrasena && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.confirmarContrasena}</p>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                💡 <strong>Nota:</strong> El cliente configurará su tipo de negocio y funcionalidades en su primer inicio de sesión
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/superadmin/empresas">
            <Button variant="outline" type="button" disabled={isLoading}>
              Cancelar
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isLoading || planesLoading} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear Suscripción SaaS
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}