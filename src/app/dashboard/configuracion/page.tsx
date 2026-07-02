"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Settings,
  Save,
  RotateCcw,
  Building,
  ShoppingCart,
  Receipt,
  Package,
  Info,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Store,
  Upload,
  X,
  Image as ImageIcon,
  Building2
} from "lucide-react";

import { BusinessTypeSelector, BUSINESS_TYPES } from "@/components/setup/BusinessTypeSelector";
import { FeatureConfigurator, type FeatureConfig } from "@/components/setup/FeatureConfigurator";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ConfiguracionPos {
  mostrarStock: boolean;
  permitirVentaSinStock: boolean;
  impresionAutomatica: boolean;
  formatoTicket: string;
  mostrarLogos: boolean;
  sonidoVenta: boolean;
  mostrarServicios: boolean;
}

interface ConfiguracionFactura {
  numeracionAutomatica: boolean;
  prefijo: string;
  siguienteNumero: number;
  incluirImpuestos: boolean;
  porcentajeImpuesto: number;
}

interface ConfiguracionInventario {
  alertaStockMinimo: boolean;
  actualizacionAutomatica: boolean;
  permitirStockNegativo: boolean;
  metodoValoracion: 'FIFO' | 'LIFO' | 'PROMEDIO';
  manejarLotes: boolean;
  manejarVencimientos: boolean;
  inventarioAvanzado: boolean;
}

interface DatosEmpresa {
  nombre: string;
  nombreComercial: string;
  nit: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  email: string;
  logo: string | null;
  logoSecundario: string | null;
  imagenBanner: string | null;
  tipoNegocio: string;
}

interface ConfiguracionEmpresa {
  id: string;
  empresaId: string;
  tipoNegocio: string;
  habilitarServicios: boolean;
  habilitarCitas: boolean;
  habilitarVariantes: boolean;
  habilitarRecetas: boolean;
  habilitarLotes: boolean;
  habilitarVencimientos: boolean;
  habilitarInventarioAvanzado: boolean;
  habilitarReportes: boolean;
  habilitarMultiUsuarios: boolean;
  configuracionPos: ConfiguracionPos;
  configuracionFactura: ConfiguracionFactura;
  configuracionInventario: ConfiguracionInventario;
  empresa: {
    id: string;
    nombre: string;
    email: string;
    tipoNegocio: string;
    bodegaHabilitada: boolean;
  };
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_POS: ConfiguracionPos = {
  mostrarStock: true,
  permitirVentaSinStock: false,
  impresionAutomatica: false,
  formatoTicket: '58mm',
  mostrarLogos: true,
  sonidoVenta: true,
  mostrarServicios: false
};

const DEFAULT_FACTURA: ConfiguracionFactura = {
  numeracionAutomatica: true,
  prefijo: '',
  siguienteNumero: 1,
  incluirImpuestos: false,
  porcentajeImpuesto: 0
};

const DEFAULT_INVENTARIO: ConfiguracionInventario = {
  alertaStockMinimo: true,
  actualizacionAutomatica: true,
  permitirStockNegativo: false,
  metodoValoracion: 'FIFO',
  manejarLotes: false,
  manejarVencimientos: false,
  inventarioAvanzado: false
};

const DEFAULT_FEATURES: FeatureConfig = {
  habilitarServicios: false,
  habilitarCitas: false,
  habilitarVariantes: false,
  habilitarRecetas: false,
  habilitarLotes: false,
  habilitarVencimientos: false,
  habilitarInventarioAvanzado: false,
  habilitarReportes: false,
  habilitarMultiUsuarios: false
};

// ─── Subcomponentes ──────────────────────────────────────────────────────────

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
      <img src={src} alt={alt} className="h-24 w-24 object-contain mx-auto" />
    </div>
    <button
      onClick={onRemove}
      type="button"
      className="absolute -top-2 -right-2 bg-red-500 text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <X className="h-4 w-4" />
    </button>
    <p className="text-xs text-center mt-1 text-muted-foreground">{label}</p>
  </div>
);

// ─── Componente principal ────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  const [configuracion, setConfiguracion] = useState<ConfiguracionEmpresa | null>(null);
  const [estaCargando, setEstaCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [businessType, setBusinessType] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<FeatureConfig>(DEFAULT_FEATURES);
  const [configuracionPos, setConfiguracionPos] = useState<ConfiguracionPos>(DEFAULT_POS);
  const [configuracionFactura, setConfiguracionFactura] = useState<ConfiguracionFactura>(DEFAULT_FACTURA);
  const [configuracionInventario, setConfiguracionInventario] = useState<ConfiguracionInventario>(DEFAULT_INVENTARIO);

  const [datosEmpresa, setDatosEmpresa] = useState<DatosEmpresa>({
    nombre: '', nombreComercial: '', nit: '', telefono: '',
    direccion: '', ciudad: '', departamento: '', pais: 'Colombia',
    email: '', logo: null, logoSecundario: null, imagenBanner: null, tipoNegocio: ''
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasEmpresaChanges, setHasEmpresaChanges] = useState(false);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const markChanged = () => setHasChanges(true);
  const markEmpresaChanged = () => { setHasEmpresaChanges(true); setHasChanges(true); };

  const puedeModificarConfiguracion = () =>
    session?.user?.role && ['ADMINISTRADOR', 'SUPERADMIN'].includes(session.user.role);

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const cargarDatosEmpresa = async () => {
    try {
      const response = await fetch('/api/empresa');
      if (response.ok) {
        const data = await response.json();
        setDatosEmpresa({
          nombre: data.nombre || '',
          nombreComercial: data.nombreComercial || '',
          nit: data.nit || '',
          telefono: data.telefono || '',
          direccion: data.direccion || '',
          ciudad: data.ciudad || '',
          departamento: data.departamento || '',
          pais: data.pais || 'Colombia',
          email: data.email || '',
          logo: data.logo || null,
          logoSecundario: data.logoSecundario || null,
          imagenBanner: data.imagenBanner || null,
          tipoNegocio: data.tipoNegocio || ''
        });
      }
    } catch (err) {
      console.error('Error al cargar datos de empresa:', err);
    }
  };

  const cargarConfiguracion = async () => {
    if (!session?.user?.empresaId) return;

    try {
      setEstaCargando(true);
      setError(null);

      const response = await fetch('/api/configuracion', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No existe configuracionEmpresa, pero la empresa puede tener datos
          // Cargar datos de empresa y permitir crear la configuración aquí mismo
          console.log('📋 No existe configuracionEmpresa — cargando datos de empresa');
          try {
            const empresaRes = await fetch('/api/empresa');
            if (empresaRes.ok) {
              const empresaData = await empresaRes.json();
              
              // Pre-llenar datos de empresa
              setDatosEmpresa({
                nombre: empresaData.nombre || '',
                nombreComercial: empresaData.nombreComercial || '',
                nit: empresaData.nit || '',
                telefono: empresaData.telefono || '',
                direccion: empresaData.direccion || '',
                ciudad: empresaData.ciudad || '',
                departamento: empresaData.departamento || '',
                pais: empresaData.pais || 'Colombia',
                email: empresaData.email || '',
                logo: empresaData.logo || null,
                logoSecundario: empresaData.logoSecundario || null,
                imagenBanner: empresaData.imagenBanner || null,
                tipoNegocio: empresaData.tipoNegocio || ''
              });

              // Pre-seleccionar tipo de negocio
              if (empresaData.tipoNegocio) {
                setBusinessType(empresaData.tipoNegocio);
                const defaults = getDefaultConfigForType(empresaData.tipoNegocio);
                if (defaults) {
                  setConfiguration(defaults);
                }
              }
            }
          } catch (empErr) {
            console.error('Error al cargar datos de empresa:', empErr);
          }
          // No redirigir — dejar que el usuario vea y guarde la configuración
          setEstaCargando(false);
          return;
        }
        // FIX: parseo seguro del error
        let errorMsg = 'Error al cargar configuración';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Error del servidor (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      const data: ConfiguracionEmpresa = await response.json();
      setConfiguracion(data);

      setBusinessType(data.tipoNegocio);
      setConfiguration({
        habilitarServicios: data.habilitarServicios,
        habilitarCitas: data.habilitarCitas,
        habilitarVariantes: data.habilitarVariantes,
        habilitarRecetas: data.habilitarRecetas,
        habilitarLotes: data.habilitarLotes,
        habilitarVencimientos: data.habilitarVencimientos,
        habilitarInventarioAvanzado: data.habilitarInventarioAvanzado,
        habilitarReportes: data.habilitarReportes,
        habilitarMultiUsuarios: data.habilitarMultiUsuarios
      });

      setConfiguracionPos({
        mostrarStock: data.configuracionPos?.mostrarStock ?? DEFAULT_POS.mostrarStock,
        permitirVentaSinStock: data.configuracionPos?.permitirVentaSinStock ?? DEFAULT_POS.permitirVentaSinStock,
        impresionAutomatica: data.configuracionPos?.impresionAutomatica ?? DEFAULT_POS.impresionAutomatica,
        formatoTicket: data.configuracionPos?.formatoTicket ?? DEFAULT_POS.formatoTicket,
        mostrarLogos: data.configuracionPos?.mostrarLogos ?? DEFAULT_POS.mostrarLogos,
        sonidoVenta: data.configuracionPos?.sonidoVenta ?? DEFAULT_POS.sonidoVenta,
        mostrarServicios: data.configuracionPos?.mostrarServicios ?? DEFAULT_POS.mostrarServicios
      });

      setConfiguracionFactura({
        numeracionAutomatica: data.configuracionFactura?.numeracionAutomatica ?? DEFAULT_FACTURA.numeracionAutomatica,
        prefijo: data.configuracionFactura?.prefijo ?? DEFAULT_FACTURA.prefijo,
        siguienteNumero: data.configuracionFactura?.siguienteNumero ?? DEFAULT_FACTURA.siguienteNumero,
        incluirImpuestos: data.configuracionFactura?.incluirImpuestos ?? DEFAULT_FACTURA.incluirImpuestos,
        porcentajeImpuesto: data.configuracionFactura?.porcentajeImpuesto ?? DEFAULT_FACTURA.porcentajeImpuesto
      });

      setConfiguracionInventario({
        alertaStockMinimo: data.configuracionInventario?.alertaStockMinimo ?? DEFAULT_INVENTARIO.alertaStockMinimo,
        actualizacionAutomatica: data.configuracionInventario?.actualizacionAutomatica ?? DEFAULT_INVENTARIO.actualizacionAutomatica,
        permitirStockNegativo: data.configuracionInventario?.permitirStockNegativo ?? DEFAULT_INVENTARIO.permitirStockNegativo,
        metodoValoracion: data.configuracionInventario?.metodoValoracion ?? DEFAULT_INVENTARIO.metodoValoracion,
        manejarLotes: data.configuracionInventario?.manejarLotes ?? DEFAULT_INVENTARIO.manejarLotes,
        manejarVencimientos: data.configuracionInventario?.manejarVencimientos ?? DEFAULT_INVENTARIO.manejarVencimientos,
        inventarioAvanzado: data.configuracionInventario?.inventarioAvanzado ?? DEFAULT_INVENTARIO.inventarioAvanzado
      });

      await cargarDatosEmpresa();
    } catch (err) {
      console.error('Error al cargar configuración:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEstaCargando(false);
    }
  };

  useEffect(() => {
    if (session?.user?.empresaId) {
      cargarConfiguracion();
    }
  }, [session?.user?.empresaId]);

  // ─── Imágenes ─────────────────────────────────────────────────────────────

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'logo' | 'logoSecundario' | 'imagenBanner'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "⚠️ Archivo muy grande", description: "La imagen no debe superar 2MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: "⚠️ Tipo de archivo inválido", description: "Por favor selecciona una imagen válida", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDatosEmpresa(prev => ({ ...prev, [tipo]: reader.result as string }));
      markEmpresaChanged();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (tipo: 'logo' | 'logoSecundario' | 'imagenBanner') => {
    setDatosEmpresa(prev => ({ ...prev, [tipo]: null }));
    markEmpresaChanged();
  };

  // ─── Guardar empresa ──────────────────────────────────────────────────────

  const saveEmpresaData = async (silencioso = false) => {
    setSavingEmpresa(true);
    try {
      const response = await fetch('/api/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datosEmpresa.nombre,
          nombreComercial: datosEmpresa.nombreComercial || null,
          nit: datosEmpresa.nit,
          telefono: datosEmpresa.telefono || null,
          direccion: datosEmpresa.direccion || null,
          ciudad: datosEmpresa.ciudad || null,
          departamento: datosEmpresa.departamento || null,
          pais: datosEmpresa.pais || 'Colombia',
          email: datosEmpresa.email || null,
          logo: datosEmpresa.logo,
          logoSecundario: datosEmpresa.logoSecundario,
          imagenBanner: datosEmpresa.imagenBanner,
          tipoNegocio: businessType
        })
      });

      if (!response.ok) {
        let errorMsg = 'Error al actualizar empresa';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `Error del servidor (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      setHasEmpresaChanges(false);
      await cargarDatosEmpresa();
      if (!silencioso) {
        toast({ title: "✅ Datos actualizados", description: "Los datos de la empresa se han guardado correctamente" });
      }
    } catch (err) {
      console.error('Error al guardar empresa:', err);
      throw err; // re-throw para que el caller pueda capturarlo
    } finally {
      setSavingEmpresa(false);
    }
  };

  // ─── Guardar configuración ────────────────────────────────────────────────

  // Obtener el defaultConfig del tipo de negocio seleccionado
  const getDefaultConfigForType = (type: string): FeatureConfig | null => {
    const bt = BUSINESS_TYPES[type];
    return bt?.defaultConfig ?? null;
  };

  // Verificar si la config actual difiere de los defaults del tipo seleccionado
  const configDiffersFromDefaults = (config: FeatureConfig, type: string): boolean => {
    const defaults = getDefaultConfigForType(type);
    if (!defaults) return false;
    return (Object.keys(defaults) as (keyof FeatureConfig)[]).some(
      (key) => config[key] !== defaults[key]
    );
  };

  const handleConfigurationChange = (key: string, value: boolean) => {
    const updated = { ...configuration, [key]: value };
    setConfiguration(updated);

    // Si las funcionalidades ya no coinciden con el tipo actual → cambiar a PERSONALIZADO
    if (businessType && businessType !== 'PERSONALIZADO' && businessType !== 'OTRO') {
      if (configDiffersFromDefaults(updated, businessType)) {
        setBusinessType('PERSONALIZADO');
        toast({
          title: '🔧 Tipo de negocio ajustado',
          description: 'Al modificar las funcionalidades manualmente, el tipo se cambió a Personalizado.',
        });
      }
    }
    markChanged();
  };

  const handleBusinessTypeChange = (type: string) => {
    setBusinessType(type);

    // Auto-aplicar las funcionalidades del tipo de negocio seleccionado
    const defaults = getDefaultConfigForType(type);
    if (defaults) {
      setConfiguration(defaults);
      toast({
        title: '✅ Funcionalidades actualizadas',
        description: `Se aplicaron las funcionalidades recomendadas para ${BUSINESS_TYPES[type]?.nombre || type}.`,
      });
    }
    markChanged();
  };

  const saveConfiguration = async () => {
    if (!businessType) {
      toast({ title: "⚠️ Error", description: "Por favor selecciona un tipo de negocio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Si hay cambios en datos de empresa, guardarlos (solo requiere nombre)
      if (hasEmpresaChanges && datosEmpresa.nombre) {
        await saveEmpresaData(true); // silencioso — el toast final lo muestra saveConfiguration
      } else if (hasEmpresaChanges && !datosEmpresa.nombre) {
        toast({ title: "⚠️ Nombre requerido", description: "El nombre de la empresa es obligatorio para guardar", variant: "destructive" });
        setSaving(false);
        return;
      }
      const configData = {
        tipoNegocio: businessType,
        habilitarServicios: Boolean(configuration.habilitarServicios),
        habilitarCitas: Boolean(configuration.habilitarCitas),
        habilitarVariantes: Boolean(configuration.habilitarVariantes),
        habilitarRecetas: Boolean(configuration.habilitarRecetas),
        habilitarLotes: Boolean(configuration.habilitarLotes),
        habilitarVencimientos: Boolean(configuration.habilitarVencimientos),
        habilitarInventarioAvanzado: Boolean(configuration.habilitarInventarioAvanzado),
        habilitarReportes: Boolean(configuration.habilitarReportes),
        habilitarMultiUsuarios: Boolean(configuration.habilitarMultiUsuarios),
        configuracionPos: {
          mostrarStock: Boolean(configuracionPos.mostrarStock),
          permitirVentaSinStock: Boolean(configuracionPos.permitirVentaSinStock),
          impresionAutomatica: Boolean(configuracionPos.impresionAutomatica),
          formatoTicket: String(configuracionPos.formatoTicket || '58mm'),
          mostrarLogos: Boolean(configuracionPos.mostrarLogos),
          sonidoVenta: Boolean(configuracionPos.sonidoVenta),
          mostrarServicios: Boolean(configuration.habilitarServicios)
        },
        configuracionFactura: {
          numeracionAutomatica: Boolean(configuracionFactura.numeracionAutomatica),
          prefijo: String(configuracionFactura.prefijo || ''),
          siguienteNumero: Number(configuracionFactura.siguienteNumero) || 1,
          incluirImpuestos: Boolean(configuracionFactura.incluirImpuestos),
          porcentajeImpuesto: Number(configuracionFactura.porcentajeImpuesto) || 0
        },
        configuracionInventario: {
          alertaStockMinimo: Boolean(configuracionInventario.alertaStockMinimo),
          actualizacionAutomatica: Boolean(configuracionInventario.actualizacionAutomatica),
          permitirStockNegativo: Boolean(configuracionInventario.permitirStockNegativo),
          metodoValoracion: String(configuracionInventario.metodoValoracion || 'FIFO'),
          manejarLotes: Boolean(configuration.habilitarLotes),
          manejarVencimientos: Boolean(configuration.habilitarVencimientos),
          inventarioAvanzado: Boolean(configuration.habilitarInventarioAvanzado)
        }
      };

      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        // FIX: parseo seguro del error — evita que response.json() explote en el 500
        let errorMsg = 'Error al guardar configuración';
        try {
          const responseData = await response.json();
          errorMsg = responseData.error || responseData.message || errorMsg;
        } catch {
          errorMsg = `Error del servidor (${response.status}): ${response.statusText || errorMsg}`;
        }
        throw new Error(errorMsg);
      }

      const tipoNegocioCambio = configuracion?.tipoNegocio !== businessType;
      await cargarConfiguracion();
      setHasChanges(false);

      toast({
        title: "✅ Configuración actualizada",
        description: tipoNegocioCambio
          ? "Tipo de negocio actualizado. Recargando..."
          : "Los cambios se han guardado correctamente"
      });

      if (tipoNegocioCambio) {
        setTimeout(() => { window.location.reload(); }, 800);
      }
    } catch (err) {
      console.error('❌ Error al guardar configuración:', err);
      toast({
        title: "❌ Error al guardar",
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Restablecer cambios ──────────────────────────────────────────────────

  const resetChanges = () => {
    if (!configuracion) return;

    setBusinessType(configuracion.tipoNegocio);
    setConfiguration({
      habilitarServicios: configuracion.habilitarServicios,
      habilitarCitas: configuracion.habilitarCitas,
      habilitarVariantes: configuracion.habilitarVariantes,
      habilitarRecetas: configuracion.habilitarRecetas,
      habilitarLotes: configuracion.habilitarLotes,
      habilitarVencimientos: configuracion.habilitarVencimientos,
      habilitarInventarioAvanzado: configuracion.habilitarInventarioAvanzado,
      habilitarReportes: configuracion.habilitarReportes,
      habilitarMultiUsuarios: configuracion.habilitarMultiUsuarios
    });
    setConfiguracionPos({
      mostrarStock: configuracion.configuracionPos?.mostrarStock ?? DEFAULT_POS.mostrarStock,
      permitirVentaSinStock: configuracion.configuracionPos?.permitirVentaSinStock ?? DEFAULT_POS.permitirVentaSinStock,
      impresionAutomatica: configuracion.configuracionPos?.impresionAutomatica ?? DEFAULT_POS.impresionAutomatica,
      formatoTicket: configuracion.configuracionPos?.formatoTicket ?? DEFAULT_POS.formatoTicket,
      mostrarLogos: configuracion.configuracionPos?.mostrarLogos ?? DEFAULT_POS.mostrarLogos,
      sonidoVenta: configuracion.configuracionPos?.sonidoVenta ?? DEFAULT_POS.sonidoVenta,
      mostrarServicios: configuracion.configuracionPos?.mostrarServicios ?? DEFAULT_POS.mostrarServicios
    });
    setConfiguracionFactura({
      numeracionAutomatica: configuracion.configuracionFactura?.numeracionAutomatica ?? DEFAULT_FACTURA.numeracionAutomatica,
      prefijo: configuracion.configuracionFactura?.prefijo ?? DEFAULT_FACTURA.prefijo,
      siguienteNumero: configuracion.configuracionFactura?.siguienteNumero ?? DEFAULT_FACTURA.siguienteNumero,
      incluirImpuestos: configuracion.configuracionFactura?.incluirImpuestos ?? DEFAULT_FACTURA.incluirImpuestos,
      porcentajeImpuesto: configuracion.configuracionFactura?.porcentajeImpuesto ?? DEFAULT_FACTURA.porcentajeImpuesto
    });
    setConfiguracionInventario({
      alertaStockMinimo: configuracion.configuracionInventario?.alertaStockMinimo ?? DEFAULT_INVENTARIO.alertaStockMinimo,
      actualizacionAutomatica: configuracion.configuracionInventario?.actualizacionAutomatica ?? DEFAULT_INVENTARIO.actualizacionAutomatica,
      permitirStockNegativo: configuracion.configuracionInventario?.permitirStockNegativo ?? DEFAULT_INVENTARIO.permitirStockNegativo,
      metodoValoracion: configuracion.configuracionInventario?.metodoValoracion ?? DEFAULT_INVENTARIO.metodoValoracion,
      manejarLotes: configuracion.configuracionInventario?.manejarLotes ?? DEFAULT_INVENTARIO.manejarLotes,
      manejarVencimientos: configuracion.configuracionInventario?.manejarVencimientos ?? DEFAULT_INVENTARIO.manejarVencimientos,
      inventarioAvanzado: configuracion.configuracionInventario?.inventarioAvanzado ?? DEFAULT_INVENTARIO.inventarioAvanzado
    });
    cargarDatosEmpresa();
    setHasChanges(false);
    toast({ title: "↩️ Cambios descartados", description: "Se ha restaurado la configuración guardada" });
  };

  // ─── Pantallas de estado ──────────────────────────────────────────────────

  if (!puedeModificarConfiguracion()) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Solo los administradores pueden modificar la configuración del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (estaCargando) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error al cargar configuración</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={cargarConfiguracion}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Upload helper UI ─────────────────────────────────────────────────────

  const UploadBox = ({
    id,
    tipo,
    label
  }: {
    id: string;
    tipo: 'logo' | 'logoSecundario' | 'imagenBanner';
    label: string;
  }) => (
    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={(e) => handleImageUpload(e, tipo)}
        className="hidden"
      />
      <label htmlFor={id} className="cursor-pointer">
        <Upload className="h-8 w-8 mx-auto text-muted-foreground/70 mb-2" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/70">Max 2MB</p>
      </label>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
            <Settings className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
            <p className="text-muted-foreground">
              Modifica las funcionalidades y ajustes de tu sistema POS
            </p>
          </div>
        </div>
        {configuracion && (
          <Badge variant="outline" className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Configuración activa
          </Badge>
        )}
      </div>

      {/* Alerta de cambios sin guardar */}
      {hasChanges && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-800 dark:text-amber-300 font-medium">Tienes cambios sin guardar</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetChanges}
                className="text-amber-800 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/15"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Descartar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />Empresa
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />General
          </TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />POS
          </TabsTrigger>
          <TabsTrigger value="facturas" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />Facturas
          </TabsTrigger>
          <TabsTrigger value="inventario" className="flex items-center gap-2">
            <Package className="h-4 w-4" />Inventario
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Empresa ── */}
        <TabsContent value="empresa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>Actualiza los datos legales y de contacto de tu empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="nombre">Razón Social / Nombre Legal *</Label>
                  <Input
                    id="nombre"
                    value={datosEmpresa.nombre}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, nombre: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="nombreComercial">Nombre Comercial</Label>
                  <Input
                    id="nombreComercial"
                    value={datosEmpresa.nombreComercial}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, nombreComercial: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="nit">NIT / Documento</Label>
                  <Input
                    id="nit"
                    placeholder="Ej: 900123456-7"
                    value={datosEmpresa.nit}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, nit: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={datosEmpresa.telefono}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, telefono: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={datosEmpresa.email}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, email: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={datosEmpresa.direccion}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, direccion: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={datosEmpresa.ciudad}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, ciudad: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={datosEmpresa.departamento}
                    onChange={(e) => { setDatosEmpresa({ ...datosEmpresa, departamento: e.target.value }); markEmpresaChanged(); }}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Logos */}
              <div className="border-t pt-6 mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold">Logos e Imágenes</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Personaliza la imagen de tu negocio</p>

                <div className="grid gap-6 md:grid-cols-3">
                  <div>
                    <Label>Logo Principal</Label>
                    <p className="text-xs text-muted-foreground mb-2">Para tickets y facturas</p>
                    {datosEmpresa.logo
                      ? <ImagePreview src={datosEmpresa.logo} alt="Logo principal" onRemove={() => handleRemoveImage('logo')} label="Logo Principal" />
                      : <UploadBox id="logo" tipo="logo" label="Subir logo" />}
                  </div>
                  <div>
                    <Label>Logo para Tickets</Label>
                    <p className="text-xs text-muted-foreground mb-2">Versión optimizada para impresión</p>
                    {datosEmpresa.logoSecundario
                      ? <ImagePreview src={datosEmpresa.logoSecundario} alt="Logo secundario" onRemove={() => handleRemoveImage('logoSecundario')} label="Logo Tickets" />
                      : <UploadBox id="logoSecundario" tipo="logoSecundario" label="Subir logo" />}
                  </div>
                  <div>
                    <Label>Banner para Reportes</Label>
                    <p className="text-xs text-muted-foreground mb-2">Encabezado de documentos</p>
                    {datosEmpresa.imagenBanner
                      ? <ImagePreview src={datosEmpresa.imagenBanner} alt="Banner" onRemove={() => handleRemoveImage('imagenBanner')} label="Banner" />
                      : <UploadBox id="imagenBanner" tipo="imagenBanner" label="Subir banner" />}
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: General ── */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />Tipo de Negocio
              </CardTitle>
              <CardDescription>
                Modifica el tipo de negocio para ajustar las funcionalidades disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessTypeSelector selectedType={businessType} onTypeChange={handleBusinessTypeChange} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades del Sistema</CardTitle>
              <CardDescription>Activa o desactiva las características según tus necesidades</CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureConfigurator
                configuration={configuration}
                onConfigChange={handleConfigurationChange}
                businessType={businessType}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: POS ── */}
        <TabsContent value="pos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Punto de Venta</CardTitle>
              <CardDescription>Personaliza el comportamiento y la apariencia del punto de venta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  { id: 'mostrarStock', label: 'Mostrar Stock', desc: 'Mostrar cantidad disponible en el POS', key: 'mostrarStock' },
                  { id: 'venta-sin-stock', label: 'Permitir Venta Sin Stock', desc: 'Permitir ventas aunque no haya stock', key: 'permitirVentaSinStock' },
                  { id: 'impresion-automatica', label: 'Impresión Automática', desc: 'Imprimir ticket automáticamente al completar venta', key: 'impresionAutomatica' },
                  { id: 'mostrar-logos', label: 'Mostrar Logos', desc: 'Incluir logo de la empresa en tickets', key: 'mostrarLogos' },
                  { id: 'sonido-venta', label: 'Sonido de Venta', desc: 'Reproducir sonido al completar venta', key: 'sonidoVenta' },
                ].map(({ id, label, desc, key }) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={id}
                        checked={configuracionPos[key as keyof ConfiguracionPos] as boolean}
                        onCheckedChange={(checked) => {
                          setConfiguracionPos(prev => ({ ...prev, [key]: checked }));
                          markChanged();
                        }}
                      />
                      <span className="text-sm text-muted-foreground">{desc}</span>
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="formato-ticket">Formato de Ticket</Label>
                  <Select
                    value={configuracionPos.formatoTicket}
                    onValueChange={(value) => { setConfiguracionPos(prev => ({ ...prev, formatoTicket: value })); markChanged(); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm</SelectItem>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="A4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Facturas ── */}
        <TabsContent value="facturas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Facturación</CardTitle>
              <CardDescription>Configura la numeración automática y los impuestos para tus facturas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="numeracion-automatica">Numeración Automática</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="numeracion-automatica"
                      checked={configuracionFactura.numeracionAutomatica}
                      onCheckedChange={(checked) => { setConfiguracionFactura(prev => ({ ...prev, numeracionAutomatica: checked })); markChanged(); }}
                    />
                    <span className="text-sm text-muted-foreground">Generar números de factura automáticamente</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prefijo">Prefijo de Factura</Label>
                  <Input
                    id="prefijo"
                    value={configuracionFactura.prefijo}
                    onChange={(e) => { setConfiguracionFactura(prev => ({ ...prev, prefijo: e.target.value })); markChanged(); }}
                    placeholder="Ej: FAC, VENTA, etc."
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siguiente-numero">Siguiente Número</Label>
                  <Input
                    id="siguiente-numero"
                    type="number"
                    min="1"
                    value={configuracionFactura.siguienteNumero}
                    onChange={(e) => { setConfiguracionFactura(prev => ({ ...prev, siguienteNumero: parseInt(e.target.value) || 1 })); markChanged(); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incluir-impuestos">Incluir Impuestos</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="incluir-impuestos"
                      checked={configuracionFactura.incluirImpuestos}
                      onCheckedChange={(checked) => { setConfiguracionFactura(prev => ({ ...prev, incluirImpuestos: checked })); markChanged(); }}
                    />
                    <span className="text-sm text-muted-foreground">Calcular e incluir impuestos en facturas</span>
                  </div>
                </div>

                {configuracionFactura.incluirImpuestos && (
                  <div className="space-y-2">
                    <Label htmlFor="porcentaje-impuesto">Porcentaje de Impuesto (%)</Label>
                    <Input
                      id="porcentaje-impuesto"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={configuracionFactura.porcentajeImpuesto}
                      onChange={(e) => { setConfiguracionFactura(prev => ({ ...prev, porcentajeImpuesto: parseFloat(e.target.value) || 0 })); markChanged(); }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Inventario ── */}
        <TabsContent value="inventario" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Inventario</CardTitle>
              <CardDescription>Controla cómo se maneja el inventario y las alertas de stock</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  { id: 'alerta-stock-minimo', label: 'Alerta de Stock Mínimo', desc: 'Mostrar alertas cuando el stock sea bajo', key: 'alertaStockMinimo' },
                  { id: 'actualizacion-automatica', label: 'Actualización Automática', desc: 'Actualizar inventario automáticamente en ventas', key: 'actualizacionAutomatica' },
                  { id: 'stock-negativo', label: 'Permitir Stock Negativo', desc: 'Permitir que el stock llegue a valores negativos', key: 'permitirStockNegativo' },
                ].map(({ id, label, desc, key }) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={id}
                        checked={configuracionInventario[key as keyof ConfiguracionInventario] as boolean}
                        onCheckedChange={(checked) => { setConfiguracionInventario(prev => ({ ...prev, [key]: checked })); markChanged(); }}
                      />
                      <span className="text-sm text-muted-foreground">{desc}</span>
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="metodo-valoracion">Método de Valoración</Label>
                  <Select
                    value={configuracionInventario.metodoValoracion}
                    onValueChange={(value: 'FIFO' | 'LIFO' | 'PROMEDIO') => { setConfiguracionInventario(prev => ({ ...prev, metodoValoracion: value })); markChanged(); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIFO">FIFO (Primero en entrar, primero en salir)</SelectItem>
                      <SelectItem value="LIFO">LIFO (Último en entrar, primero en salir)</SelectItem>
                      <SelectItem value="PROMEDIO">Promedio Ponderado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Barra de acciones fija */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {hasChanges
              ? <span className="text-amber-600 dark:text-amber-400 font-medium">Hay cambios sin guardar</span>
              : <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Todos los cambios están guardados</span>}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetChanges} disabled={!hasChanges || saving}>
              <RotateCcw className="h-4 w-4 mr-2" />Restablecer
            </Button>

            {/* Botón de guardar — abre diálogo de confirmación controlado */}
            <Button
              disabled={!hasChanges || saving}
              onClick={() => setConfirmDialogOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                : <><Save className="h-4 w-4 mr-2" />Guardar Cambios</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmación — controlado para evitar race condition con AlertDialogAction */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Los cambios en la configuración afectarán el comportamiento del sistema para todos los usuarios.
              ¿Estás seguro de que quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={async (e) => {
                e.preventDefault(); // Evita que AlertDialogAction cierre el diálogo antes de que termine
                setConfirmDialogOpen(false);
                await saveConfiguration();
              }}
            >
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                : <>Confirmar y Guardar</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}