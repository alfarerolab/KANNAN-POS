"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  Settings, 
  Rocket, 
  Building2,
  Upload,
  Store,
  Sparkles,
  X,
  Lock,
  LogOut,
  Image as ImageIcon
} from "lucide-react";
import { CONFIGURACIONES_NEGOCIO, type ConfiguracionNegocio } from "@/lib/configuracion-negocio";

// Tipos habilitados (tienen soporte completo en la app)
const TIPOS_HABILITADOS = new Set([
  'TIENDA_BARRIO', 'FARMACIA', 'RESTAURANTE', 'BAR', 'CAFETERIA',
  'SALON_BELLEZA', 'PELUQUERIA', 'VETERINARIA', 'FERRETERIA',
  'ROPA', 'MIXTO', 'PERSONALIZADO', 'OTRO'
]);

// Tipos proximamente (existen en BD pero no tienen UI dedicada aun)
const TIPOS_PROXIMAMENTE = new Set([
  'TIENDA_COMIDA', 'LIBRERIA', 'ELECTRONICA', 'SUPERMERCADO',
  'SERVICIOS', 'SALUD', 'PROFESIONAL'
]);

// Orden en que se muestran los tipos
const ORDEN_TIPOS = [
  'TIENDA_BARRIO', 'RESTAURANTE', 'BAR', 'CAFETERIA', 'FARMACIA',
  'SALON_BELLEZA', 'PELUQUERIA', 'VETERINARIA', 'FERRETERIA',
  'ROPA', 'MIXTO', 'PERSONALIZADO', 'OTRO',
  'TIENDA_COMIDA', 'SUPERMERCADO', 'LIBRERIA', 'ELECTRONICA',
  'SERVICIOS', 'SALUD', 'PROFESIONAL'
];

// Generar lista ordenada de tipos con su config
const TIPOS_NEGOCIO = ORDEN_TIPOS
  .filter(id => CONFIGURACIONES_NEGOCIO[id])
  .map(id => {
    const cfg = CONFIGURACIONES_NEGOCIO[id];
    return {
      id,
      nombre: cfg.nombre,
      icon: cfg.icono,
      descripcion: cfg.descripcion || '',
      habilitado: TIPOS_HABILITADOS.has(id),
      config: {
        habilitarServicios: cfg.funcionalidades.servicios,
        habilitarCitas: cfg.funcionalidades.citas,
        habilitarVariantes: cfg.funcionalidades.variantes,
        habilitarRecetas: cfg.funcionalidades.recetas,
        habilitarLotes: cfg.funcionalidades.lotes,
        habilitarVencimientos: cfg.funcionalidades.vencimientos,
        habilitarInventarioAvanzado: cfg.funcionalidades.inventarioAvanzado,
        habilitarReportes: cfg.funcionalidades.reportesAvanzados,
        habilitarMultiUsuarios: cfg.funcionalidades.empleadosEspecializados
      }
    };
  });

// Componente para preview de imagen
const ImagePreview = ({ 
  src, 
  alt, 
  onRemove, 
  label 
}: { 
  src: string; 
  alt: string; 
  onRemove: () => void;
  label: string;
}) => (
  <div className="relative group">
    <div className="border-2 border-dashed border-border rounded-lg p-2 bg-muted/50">
      <img 
        src={src} 
        alt={alt} 
        className="h-24 w-24 object-contain mx-auto"
      />
    </div>
    <button
      onClick={onRemove}
      className="absolute -top-2 -right-2 bg-red-500 text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <X className="h-4 w-4" />
    </button>
    <p className="text-xs text-center mt-1 text-muted-foreground">{label}</p>
  </div>
);

export default function ConfiguracionInicial() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // Datos de la empresa con todos los campos del modelo
  const [datosEmpresa, setDatosEmpresa] = useState({
    nombre: '',
    nombreComercial: '',
    nit: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    pais: 'Colombia',
    email: ''
  });
  
  // Imágenes de la empresa
  const [imagenes, setImagenes] = useState({
    logo: null as string | null,
    logoSecundario: null as string | null,
    imagenBanner: null as string | null
  });

  const [businessType, setBusinessType] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState({
    habilitarServicios: false,
    habilitarCitas: false,
    habilitarVariantes: false,
    habilitarRecetas: false,
    habilitarLotes: false,
    habilitarVencimientos: false,
    habilitarInventarioAvanzado: false,
    habilitarReportes: false,
    habilitarMultiUsuarios: false
  });

  const totalSteps = 4;

  // Cargar datos existentes de la empresa al montar el componente
  useEffect(() => {
    if (!session?.user?.empresaId) return;

    const cargarDatosExistentes = async () => {
      try {
        const response = await fetch('/api/empresa');
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Pre-llenar datos de la empresa si existen
        setDatosEmpresa(prev => ({
          ...prev,
          nombre: data.nombre || prev.nombre,
          nombreComercial: data.nombreComercial || prev.nombreComercial,
          nit: data.nit || prev.nit,
          telefono: data.telefono || prev.telefono,
          direccion: data.direccion || prev.direccion,
          ciudad: data.ciudad || prev.ciudad,
          departamento: data.departamento || prev.departamento,
          pais: data.pais || prev.pais,
          email: data.email || prev.email,
        }));

        // Pre-llenar imágenes si existen
        if (data.logo || data.logoSecundario || data.imagenBanner) {
          setImagenes(prev => ({
            ...prev,
            logo: data.logo || prev.logo,
            logoSecundario: data.logoSecundario || prev.logoSecundario,
            imagenBanner: data.imagenBanner || prev.imagenBanner,
          }));
        }

        // Pre-seleccionar tipo de negocio si ya está guardado en la empresa
        if (data.tipoNegocio && data.tipoNegocio !== 'OTRO') {
          setBusinessType(data.tipoNegocio);
          const tipoSeleccionado = TIPOS_NEGOCIO.find(t => t.id === data.tipoNegocio);
          if (tipoSeleccionado) {
            setConfiguration(tipoSeleccionado.config);
          }
        }

        console.log('✅ Datos existentes de empresa cargados en el wizard');
      } catch (err) {
        console.error('Error al cargar datos existentes:', err);
      }
    };

    cargarDatosExistentes();
  }, [session?.user?.empresaId]);

  // Manejar cambio de tipo de negocio y aplicar configuración automática
  const handleBusinessTypeChange = (type: string) => {
    setBusinessType(type);
    
    const tipoSeleccionado = TIPOS_NEGOCIO.find(t => t.id === type);
    if (tipoSeleccionado) {
      setConfiguration(tipoSeleccionado.config);
    }
  };

  // Manejar subida de imágenes
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'logo' | 'logoSecundario' | 'imagenBanner'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Imagen demasiado grande",
          description: "El archivo no puede superar 2MB.",
          variant: "destructive",
        });
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Archivo no válido",
          description: "Por favor selecciona un archivo de imagen.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenes(prev => ({
          ...prev,
          [tipo]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Remover imagen
  const handleRemoveImage = (tipo: 'logo' | 'logoSecundario' | 'imagenBanner') => {
    setImagenes(prev => ({
      ...prev,
      [tipo]: null
    }));
  };

  // Comprimir imagen base64 al 70% de calidad para reducir payload
  const comprimirImagen = (base64: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64); // fallback: usar original
      img.src = base64;
    });
  };

  // Guardar configuración — una sola llamada al endpoint unificado
  const saveConfiguration = async () => {
    if (!businessType) {
      toast({
        title: "Tipo de negocio requerido",
        description: "Selecciona un tipo de negocio antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Comprimir imágenes antes de enviar para no superar el límite del body
      const [logo, logoSecundario, imagenBanner] = await Promise.all([
        imagenes.logo ? comprimirImagen(imagenes.logo) : Promise.resolve(null),
        imagenes.logoSecundario ? comprimirImagen(imagenes.logoSecundario) : Promise.resolve(null),
        imagenes.imagenBanner ? comprimirImagen(imagenes.imagenBanner, 1200) : Promise.resolve(null),
      ]);

      const response = await fetch('/api/configuracion-inicial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: {
            nombre: datosEmpresa.nombre,
            nombreComercial: datosEmpresa.nombreComercial || null,
            nit: datosEmpresa.nit,
            telefono: datosEmpresa.telefono || null,
            direccion: datosEmpresa.direccion || null,
            ciudad: datosEmpresa.ciudad || null,
            departamento: datosEmpresa.departamento || null,
            pais: datosEmpresa.pais || 'Colombia',
            email: datosEmpresa.email || null,
            logo,
            logoSecundario,
            imagenBanner,
          },
          tipoNegocio: businessType,
          ...configuration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar configuración');
      }

      // Actualizar sesión de NextAuth para que refleje configuracionCompletada: true
      await updateSession();

      toast({
        title: "¡Configuración guardada!",
        description: "Tu sistema está listo. Redirigiendo al dashboard...",
      });

      // Hard redirect para que el middleware lea el JWT actualizado
      // (router.push no recarga el token JWT del cookie)
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('❌ Error en configuración:', error);
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : 'Error desconocido. Intenta nuevamente.',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  const canContinue = () => {
    if (step === 1) return datosEmpresa.nombre && datosEmpresa.nit;
    if (step === 2) return businessType !== null;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1" />
            <div className="flex items-center justify-center">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mr-4">
                <Settings className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ¡Bienvenido a tu POS!
              </h1>
            </div>
            <div className="flex-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/iniciar-sesion' })}
                className="flex items-center gap-2 text-muted-foreground hover:text-red-600 dark:text-red-400 hover:border-destructive/40"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Vamos a configurar tu sistema en {totalSteps} pasos simples
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((num) => (
                <React.Fragment key={num}>
                  <div className={`flex items-center transition-all duration-300 ${step >= num ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/70'}`}>
                    <div className={`rounded-full h-12 w-12 flex items-center justify-center transition-all duration-300 ${
                      step >= num ? 'bg-blue-600 text-primary-foreground shadow-lg' : 'bg-muted'
                    }`}>
                      {step > num ? <CheckCircle className="h-6 w-6" /> : num}
                    </div>
                    <div className="ml-3 hidden md:block">
                      <div className="font-medium">
                        {num === 1 && 'Datos de Empresa'}
                        {num === 2 && 'Tipo de Negocio'}
                        {num === 3 && 'Funcionalidades'}
                        {num === 4 && 'Resumen'}
                      </div>
                    </div>
                  </div>
                  {num < 4 && (
                    <div className={`flex-1 mx-2 md:mx-6 h-2 transition-all duration-300 ${step > num ? 'bg-blue-600' : 'bg-muted'} rounded-full`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contenido del paso actual */}
        <div className="mb-8">
          {/* PASO 1: Datos de la Empresa */}
          {step === 1 && (
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-2xl font-bold">Información de tu Empresa</h2>
                </div>
                
                <div className="grid gap-6">
                  {/* Información Básica */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="nombre">Razón Social / Nombre Legal *</Label>
                      <Input
                        id="nombre"
                        placeholder="Ej: Mi Empresa S.A.S"
                        value={datosEmpresa.nombre}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, nombre: e.target.value})}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nombre legal registrado de la empresa
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="nombreComercial">Nombre Comercial</Label>
                      <Input
                        id="nombreComercial"
                        placeholder="Ej: Mi Tienda"
                        value={datosEmpresa.nombreComercial}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, nombreComercial: e.target.value})}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nombre con el que se conoce tu negocio (opcional)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="nit">NIT o Documento </Label>
                      <Input
                        id="nit"
                        placeholder="Ej: 900123456-7"
                        value={datosEmpresa.nit}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, nit: e.target.value})}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        placeholder=""
                        value={datosEmpresa.telefono}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, telefono: e.target.value})}
                        className="mt-2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Ej: contacto@mitienda.com"
                        value={datosEmpresa.email}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, email: e.target.value})}
                        className="mt-2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="direccion">Dirección</Label>
                      <Input
                        id="direccion"
                        placeholder="Ej: Calle 123 #45-67"
                        value={datosEmpresa.direccion}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, direccion: e.target.value})}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ciudad">Ciudad</Label>
                      <Input
                        id="ciudad"
                        placeholder="Ej: Bogotá"
                        value={datosEmpresa.ciudad}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, ciudad: e.target.value})}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="departamento">Departamento</Label>
                      <Input
                        id="departamento"
                        placeholder="Ej: Cundinamarca"
                        value={datosEmpresa.departamento}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, departamento: e.target.value})}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Logos e Imágenes */}
                  <div className="border-t pt-6 mt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold">Logos e Imágenes</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Personaliza la imagen de tu negocio (opcional, puedes agregar esto después)
                    </p>

                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Logo Principal */}
                      <div>
                        <Label htmlFor="logo">Logo Principal</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Para tickets y facturas
                        </p>
                        {imagenes.logo ? (
                          <ImagePreview
                            src={imagenes.logo}
                            alt="Logo principal"
                            onRemove={() => handleRemoveImage('logo')}
                            label="Logo Principal"
                          />
                        ) : (
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                            <input
                              id="logo"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'logo')}
                              className="hidden"
                            />
                            <label htmlFor="logo" className="cursor-pointer">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground/70 mb-2" />
                              <p className="text-sm text-muted-foreground">Subir logo</p>
                              <p className="text-xs text-muted-foreground/70">Max 2MB</p>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Logo Secundario */}
                      <div>
                        <Label htmlFor="logoSecundario">Logo para Tickets</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Versión optimizada para impresión
                        </p>
                        {imagenes.logoSecundario ? (
                          <ImagePreview
                            src={imagenes.logoSecundario}
                            alt="Logo secundario"
                            onRemove={() => handleRemoveImage('logoSecundario')}
                            label="Logo Tickets"
                          />
                        ) : (
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                            <input
                              id="logoSecundario"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'logoSecundario')}
                              className="hidden"
                            />
                            <label htmlFor="logoSecundario" className="cursor-pointer">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground/70 mb-2" />
                              <p className="text-sm text-muted-foreground">Subir logo</p>
                              <p className="text-xs text-muted-foreground/70">Max 2MB</p>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Banner */}
                      <div>
                        <Label htmlFor="imagenBanner">Banner para Reportes</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Encabezado de documentos
                        </p>
                        {imagenes.imagenBanner ? (
                          <ImagePreview
                            src={imagenes.imagenBanner}
                            alt="Banner"
                            onRemove={() => handleRemoveImage('imagenBanner')}
                            label="Banner"
                          />
                        ) : (
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                            <input
                              id="imagenBanner"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'imagenBanner')}
                              className="hidden"
                            />
                            <label htmlFor="imagenBanner" className="cursor-pointer">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground/70 mb-2" />
                              <p className="text-sm text-muted-foreground">Subir banner</p>
                              <p className="text-xs text-muted-foreground/70">Max 2MB</p>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PASO 2: Tipo de Negocio */}
          {step === 2 && (
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-2xl font-bold">¿Qué tipo de negocio tienes?</h2>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {TIPOS_NEGOCIO.map((tipo) => {
                    const esProximamente = !tipo.habilitado;
                    const seleccionado = businessType === tipo.id;
                    
                    return (
                      <button
                        key={tipo.id}
                        onClick={() => {
                          if (!esProximamente) handleBusinessTypeChange(tipo.id);
                        }}
                        disabled={esProximamente}
                        className={`p-6 rounded-xl border-2 transition-all text-left relative ${
                          esProximamente
                            ? 'border-border bg-muted opacity-60 cursor-not-allowed'
                            : seleccionado
                              ? 'border-blue-600 bg-blue-500/10 shadow-lg scale-105'
                              : 'border-border hover:border-blue-500/40 hover:shadow-md'
                        }`}
                      >
                        {esProximamente && (
                          <Badge variant="secondary" className="absolute top-3 right-3 bg-muted text-foreground/80 text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Proximamente
                          </Badge>
                        )}
                        <div className="text-4xl mb-3">{tipo.icon}</div>
                        <h3 className="font-bold text-lg mb-2">{tipo.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{tipo.descripcion}</p>
                        
                        {seleccionado && !esProximamente && (
                          <div className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Seleccionado</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PASO 3: Funcionalidades */}
          {step === 3 && businessType && (
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h2 className="text-2xl font-bold">Funcionalidades Configuradas</h2>
                    <p className="text-muted-foreground">Basadas en tu tipo de negocio</p>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>¡Genial!</strong> Hemos preconfigurado las funcionalidades más útiles para un negocio de tipo <strong>{TIPOS_NEGOCIO.find(t => t.id === businessType)?.nombre}</strong>. Puedes modificarlas después si lo necesitas.
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(configuration).map(([key, value]) => (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border-2 ${
                        value ? 'border-green-500/40 bg-emerald-500/10' : 'border-border bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {key === 'habilitarServicios' && 'Servicios'}
                            {key === 'habilitarCitas' && 'Sistema de Citas'}
                            {key === 'habilitarVariantes' && 'Variantes de Productos'}
                            {key === 'habilitarRecetas' && 'Recetas Médicas'}
                            {key === 'habilitarLotes' && 'Control de Lotes'}
                            {key === 'habilitarVencimientos' && 'Fechas de Vencimiento'}
                            {key === 'habilitarInventarioAvanzado' && 'Inventario Avanzado'}
                            {key === 'habilitarReportes' && 'Reportes Detallados'}
                            {key === 'habilitarMultiUsuarios' && 'Multi-usuarios'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {value ? 'Habilitado' : 'Deshabilitado'}
                          </p>
                        </div>
                        {value ? (
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-border" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PASO 4: Resumen */}
          {step === 4 && (
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <Rocket className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">¡Todo Listo!</h2>
                  <p className="text-muted-foreground">Revisa tu configuración antes de finalizar</p>
                </div>

                <div className="space-y-6">
                  {/* Resumen Empresa */}
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Datos de la Empresa
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Razón Social:</span>
                        <p className="font-medium">{datosEmpresa.nombre}</p>
                      </div>
                      {datosEmpresa.nombreComercial && (
                        <div>
                          <span className="text-sm text-muted-foreground">Nombre Comercial:</span>
                          <p className="font-medium">{datosEmpresa.nombreComercial}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-muted-foreground">NIT:</span>
                        <p className="font-medium">{datosEmpresa.nit}</p>
                      </div>
                      {datosEmpresa.telefono && (
                        <div>
                          <span className="text-sm text-muted-foreground">Teléfono:</span>
                          <p className="font-medium">{datosEmpresa.telefono}</p>
                        </div>
                      )}
                      {datosEmpresa.email && (
                        <div>
                          <span className="text-sm text-muted-foreground">Email:</span>
                          <p className="font-medium">{datosEmpresa.email}</p>
                        </div>
                      )}
                      {datosEmpresa.direccion && (
                        <div>
                          <span className="text-sm text-muted-foreground">Dirección:</span>
                          <p className="font-medium">{datosEmpresa.direccion}</p>
                        </div>
                      )}
                      {datosEmpresa.ciudad && (
                        <div>
                          <span className="text-sm text-muted-foreground">Ciudad:</span>
                          <p className="font-medium">{datosEmpresa.ciudad}</p>
                        </div>
                      )}
                      {datosEmpresa.departamento && (
                        <div>
                          <span className="text-sm text-muted-foreground">Departamento:</span>
                          <p className="font-medium">{datosEmpresa.departamento}</p>
                        </div>
                      )}
                    </div>

                    {/* Mostrar imágenes cargadas */}
                    {(imagenes.logo || imagenes.logoSecundario || imagenes.imagenBanner) && (
                      <div className="mt-6 border-t pt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Imágenes Cargadas
                        </h4>
                        <div className="flex gap-4 flex-wrap">
                          {imagenes.logo && (
                            <div className="text-center">
                              <img src={imagenes.logo} alt="Logo" className="h-16 w-16 object-contain border rounded mb-1" />
                              <p className="text-xs text-muted-foreground">Logo Principal</p>
                            </div>
                          )}
                          {imagenes.logoSecundario && (
                            <div className="text-center">
                              <img src={imagenes.logoSecundario} alt="Logo Tickets" className="h-16 w-16 object-contain border rounded mb-1" />
                              <p className="text-xs text-muted-foreground">Logo Tickets</p>
                            </div>
                          )}
                          {imagenes.imagenBanner && (
                            <div className="text-center">
                              <img src={imagenes.imagenBanner} alt="Banner" className="h-16 w-16 object-contain border rounded mb-1" />
                              <p className="text-xs text-muted-foreground">Banner</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resumen Tipo */}
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Tipo de Negocio
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">
                        {TIPOS_NEGOCIO.find(t => t.id === businessType)?.icon}
                      </div>
                      <div>
                        <p className="font-bold text-lg">
                          {TIPOS_NEGOCIO.find(t => t.id === businessType)?.nombre}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {TIPOS_NEGOCIO.find(t => t.id === businessType)?.descripcion}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen Funcionalidades */}
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Funcionalidades Habilitadas
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Object.entries(configuration)
                        .filter(([_, value]) => value)
                        .map(([key]) => (
                          <div key={key} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm">
                              {key === 'habilitarServicios' && 'Servicios'}
                              {key === 'habilitarCitas' && 'Sistema de Citas'}
                              {key === 'habilitarVariantes' && 'Variantes'}
                              {key === 'habilitarRecetas' && 'Recetas'}
                              {key === 'habilitarLotes' && 'Control de Lotes'}
                              {key === 'habilitarVencimientos' && 'Vencimientos'}
                              {key === 'habilitarInventarioAvanzado' && 'Inventario Avanzado'}
                              {key === 'habilitarReportes' && 'Reportes'}
                              {key === 'habilitarMultiUsuarios' && 'Multi-usuarios'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Nota Informativa */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>📝 Nota:</strong> Podrás modificar toda esta configuración más adelante desde el panel de administración.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1 || saving}
            className="flex items-center px-6 py-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="text-sm text-muted-foreground bg-card dark:bg-background px-4 py-2 rounded-full border">
            Paso {step} de {totalSteps}
          </div>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={saveConfiguration}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 flex items-center text-lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-background border-t-transparent mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5 mr-2" />
                  ¡Finalizar!
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}