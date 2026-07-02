"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Palette,
  Ruler,
  Weight,
  Calendar,
  Barcode,
  Tag,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Boxes,
  ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import type { producto } from "@prisma/client";

interface Variante {
  id: string;
  nombre: string;
  sku?: string;
  codigoBarras?: string;
  precio?: number;
  precioPorKilo?: number;
  precioPorGramo?: number;
  precioPorMetro?: number;
  precioPorLitro?: number;
  enStock: number;
  stockMinimo?: number;
  talla?: string;
  color?: string;
  material?: string;
  peso?: number;
  dimensiones?: string;
  imagen?: string;
  activo: boolean;
  atributosExtra?: Record<string, any>;
  esExentoIva: boolean;
  tarifaIva?: number;
  incluyeIva: boolean;
  fechaVencimiento?: Date;
  lote?: string;
  fechaProduccion?: Date;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

interface Producto {
  id: string;
  nombre: string;
  tipoVenta: string;
}

interface Estadisticas {
  total: number;
  activas: number;
  inactivas: number;
  conStock: number;
  sinStock: number;
  stockTotal: number;
  valorInventario: number;
}

interface VariantesManagerProps {
  productoId: string;
  producto?: Producto;
  onVariantesChange?: (variantes: Variante[]) => void;
}

export function VariantesManager({ productoId, producto, onVariantesChange }: VariantesManagerProps) {
  const { toast } = useToast();
  const { tieneVencimientos, tieneLotes, estaCargando: configLoading } = useConfiguracionEmpresa();

  // Generación rápida de combinaciones
  const [showQuickGen, setShowQuickGen] = useState(false);
  const [quickTallas, setQuickTallas] = useState("");
  const [quickColores, setQuickColores] = useState("");
  const [quickPrecio, setQuickPrecio] = useState("");
  const [quickStock, setQuickStock] = useState("0");
  const [generando, setGenerando] = useState(false);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingVariante, setEditingVariante] = useState<Variante | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Formulario para variante
  const [formData, setFormData] = useState({
    nombre: "",
    sku: "",
    codigoBarras: "",
    precio: "",
    precioPorKilo: "",
    precioPorGramo: "",
    precioPorMetro: "",
    precioPorLitro: "",
    enStock: "0",
    stockMinimo: "",
    talla: "",
    color: "",
    material: "",
    peso: "",
    dimensiones: "",
    imagen: "",
    activa: true,
    esExentoIva: false,
    tarifaIva: "",
    incluyeIva: false,
    fechaVencimiento: "",
    lote: "",
    fechaProduccion: ""
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      sku: "",
      codigoBarras: "",
      precio: "",
      precioPorKilo: "",
      precioPorGramo: "",
      precioPorMetro: "",
      precioPorLitro: "",
      enStock: "0",
      stockMinimo: "",
      talla: "",
      color: "",
      material: "",
      peso: "",
      dimensiones: "",
      imagen: "",
      activa: true,
      esExentoIva: false,
      tarifaIva: "",
      incluyeIva: false,
      fechaVencimiento: "",
      lote: "",
      fechaProduccion: ""
    });
    setEditingVariante(null);
    setActiveTab("general");
  };

  const cargarVariantes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/productos/${productoId}/variantes?incluirInactivas=${showInactive}`);
      const data = await response.json();

      if (response.ok) {
        setVariantes(data.variantes);
        setEstadisticas(data.estadisticas);
        onVariantesChange?.(data.variantes);
      } else {
        throw new Error(data.error || 'Error al cargar variantes');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las variantes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarVariantes();
  }, [productoId, showInactive]);

  const handleSave = async () => {
    try {
      // Preparar datos
      const dataToSend = {
        ...formData,
        precio: formData.precio ? Number.parseFloat(formData.precio) : undefined,
        precioPorKilo: formData.precioPorKilo ? Number.parseFloat(formData.precioPorKilo) : undefined,
        precioPorGramo: formData.precioPorGramo ? Number.parseFloat(formData.precioPorGramo) : undefined,
        precioPorMetro: formData.precioPorMetro ? Number.parseFloat(formData.precioPorMetro) : undefined,
        precioPorLitro: formData.precioPorLitro ? Number.parseFloat(formData.precioPorLitro) : undefined,
        enStock: Number.parseInt(formData.enStock) || 0,
        stockMinimo: formData.stockMinimo ? Number.parseInt(formData.stockMinimo) : undefined,
        peso: formData.peso ? Number.parseFloat(formData.peso) : undefined,
        tarifaIva: formData.tarifaIva ? Number.parseFloat(formData.tarifaIva) : undefined
      };

      let response;
      if (editingVariante) {
        // Actualizar variante existente
        response = await fetch(`/api/productos/${productoId}/variantes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            varianteId: editingVariante.id,
            ...dataToSend
          })
        });
      } else {
        // Crear nueva variante
        response = await fetch(`/api/productos/${productoId}/variantes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });
      }

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Éxito",
          description: editingVariante ? "Variante actualizada correctamente" : "Variante creada correctamente"
        });
        setShowDialog(false);
        resetForm();
        cargarVariantes();
      } else {
        throw new Error(result.error || 'Error al guardar variante');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar la variante",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (variante: Variante) => {
    setEditingVariante(variante);
    setFormData({
      nombre: variante.nombre,
      sku: variante.sku || "",
      codigoBarras: variante.codigoBarras || "",
      precio: variante.precio?.toString() || "",
      precioPorKilo: variante.precioPorKilo?.toString() || "",
      precioPorGramo: variante.precioPorGramo?.toString() || "",
      precioPorMetro: variante.precioPorMetro?.toString() || "",
      precioPorLitro: variante.precioPorLitro?.toString() || "",
      enStock: variante.enStock.toString(),
      stockMinimo: variante.stockMinimo?.toString() || "",
      talla: variante.talla || "",
      color: variante.color || "",
      material: variante.material || "",
      peso: variante.peso?.toString() || "",
      dimensiones: variante.dimensiones || "",
      imagen: variante.imagen || "",
      activa: variante.activo,
      esExentoIva: variante.esExentoIva,
      tarifaIva: variante.tarifaIva?.toString() || "",
      incluyeIva: variante.incluyeIva,
      fechaVencimiento: variante.fechaVencimiento ? new Date(variante.fechaVencimiento).toISOString().split('T')[0] : "",
      lote: variante.lote || "",
      fechaProduccion: variante.fechaProduccion ? new Date(variante.fechaProduccion).toISOString().split('T')[0] : ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (varianteId: string) => {
    try {
      const response = await fetch(`/api/productos/${productoId}/variantes?varianteId=${varianteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Variante eliminada correctamente"
        });
        cargarVariantes();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar variante');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar la variante",
        variant: "destructive"
      });
    }
  };

  const handleQuickGenerate = async () => {
    const tallas = quickTallas.split(',').map(s => s.trim()).filter(Boolean);
    const colores = quickColores.split(',').map(s => s.trim()).filter(Boolean);
    
    if (tallas.length === 0 && colores.length === 0) {
      toast({ title: "Error", description: "Ingresa al menos tallas o colores para generar combinaciones", variant: "destructive" });
      return;
    }

    const combinaciones: Array<{nombre: string; talla?: string; color?: string}> = [];

    if (tallas.length > 0 && colores.length > 0) {
      for (const talla of tallas) {
        for (const color of colores) {
          combinaciones.push({ nombre: `${color} - ${talla}`, talla, color });
        }
      }
    } else if (tallas.length > 0) {
      for (const talla of tallas) {
        combinaciones.push({ nombre: `Talla ${talla}`, talla });
      }
    } else {
      for (const color of colores) {
        combinaciones.push({ nombre: color, color });
      }
    }

    setGenerando(true);
    let created = 0;
    try {
      for (const combo of combinaciones) {
        const dataToSend = {
          nombre: combo.nombre,
          talla: combo.talla || undefined,
          color: combo.color || undefined,
          precio: quickPrecio ? Number.parseFloat(quickPrecio) : undefined,
          enStock: Number.parseInt(quickStock) || 0,
          activa: true,
        };

        const response = await fetch(`/api/productos/${productoId}/variantes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });

        if (response.ok) created++;
      }

      toast({ title: "Generación rápida", description: `${created} de ${combinaciones.length} variantes creadas exitosamente` });
      setQuickTallas("");
      setQuickColores("");
      setQuickPrecio("");
      setQuickStock("0");
      setShowQuickGen(false);
      cargarVariantes();
    } catch (error) {
      toast({ title: "Error", description: "Error al generar variantes", variant: "destructive" });
    } finally {
      setGenerando(false);
    }
  };

  const getStockBadge = (stock: number, stockMinimo?: number) => {
    if (stock === 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Sin stock</Badge>;
    }
    if (stockMinimo && stock <= stockMinimo) {
      return <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400 bg-orange-500/10 flex items-center gap-1"><TrendingDown className="h-3 w-3" />Stock bajo</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400 bg-emerald-500/10 flex items-center gap-1"><CheckCircle className="h-3 w-3" />En stock</Badge>;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const filteredVariantes = variantes.filter(v => showInactive || v.activo);

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      {estadisticas && (
        <Card className="border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/15 rounded-lg">
                  <Boxes className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Variantes del Producto</CardTitle>
                  <p className="text-sm text-muted-foreground">{producto?.nombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <span className="text-sm text-muted-foreground">Mostrar inactivas</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estadisticas.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{estadisticas.conStock}</div>
                <div className="text-sm text-muted-foreground">Con Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{estadisticas.stockTotal}</div>
                <div className="text-sm text-muted-foreground">Stock Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatMoney(estadisticas.valorInventario)}</div>
                <div className="text-sm text-muted-foreground">Valor Inventario</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generación rápida de combinaciones */}
      {showQuickGen && (
        <Card className="border-emerald-500/30 bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-5 w-5 text-emerald-600" />
              Generación rápida de combinaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Ingresa valores separados por coma. Se generarán todas las combinaciones posibles.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tallas (separadas por coma)</Label>
                <Input value={quickTallas} onChange={(e) => setQuickTallas(e.target.value)} placeholder="S, M, L, XL, XXL" />
              </div>
              <div>
                <Label>Colores (separados por coma)</Label>
                <Input value={quickColores} onChange={(e) => setQuickColores(e.target.value)} placeholder="Rojo, Azul, Negro, Blanco" />
              </div>
              <div>
                <Label>Precio por variante (opcional)</Label>
                <Input type="number" step="0.01" min="0" value={quickPrecio} onChange={(e) => setQuickPrecio(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Stock inicial por variante</Label>
                <Input type="number" min="0" value={quickStock} onChange={(e) => setQuickStock(e.target.value)} />
              </div>
            </div>
            {quickTallas && quickColores && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Se generarán {quickTallas.split(',').filter(s => s.trim()).length * quickColores.split(',').filter(s => s.trim()).length} combinaciones
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleQuickGenerate} disabled={generando} className="bg-emerald-600 hover:bg-emerald-700">
                {generando ? "Generando..." : "Generar combinaciones"}
              </Button>
              <Button variant="outline" onClick={() => setShowQuickGen(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones para agregar variante */}
      <div className="flex justify-end gap-2">
        {!showQuickGen && (
          <Button variant="outline" onClick={() => setShowQuickGen(true)} className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
            <Boxes className="h-4 w-4 mr-2" />
            Generar combinaciones
          </Button>
        )}
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Variante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVariante ? "Editar Variante" : "Nueva Variante"}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="precios">Precios</TabsTrigger>
                <TabsTrigger value="atributos">Atributos</TabsTrigger>
                <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre">Nombre de la variante *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      placeholder="Ej: Rojo - Talla M"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      placeholder="Código único del producto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="codigoBarras">Código de barras</Label>
                    <Input
                      id="codigoBarras"
                      value={formData.codigoBarras}
                      onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})}
                      placeholder="Código de barras"
                    />
                  </div>
                  <div>
                    <Label htmlFor="enStock">Stock actual</Label>
                    <Input
                      id="enStock"
                      type="number"
                      min="0"
                      value={formData.enStock}
                      onChange={(e) => setFormData({...formData, enStock: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stockMinimo">Stock mínimo</Label>
                    <Input
                      id="stockMinimo"
                      type="number"
                      min="0"
                      value={formData.stockMinimo}
                      onChange={(e) => setFormData({...formData, stockMinimo: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="activa"
                      checked={formData.activa}
                      onCheckedChange={(checked) => setFormData({...formData, activa: checked})}
                    />
                    <Label htmlFor="activa">Variante activa</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="precios" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="precio">Precio por unidad</Label>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: e.target.value})}
                    />
                  </div>
                  {producto?.tipoVenta === "PESO" && (
                    <>
                      <div>
                        <Label htmlFor="precioPorKilo">Precio por kilo</Label>
                        <Input
                          id="precioPorKilo"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.precioPorKilo}
                          onChange={(e) => setFormData({...formData, precioPorKilo: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="precioPorGramo">Precio por gramo</Label>
                        <Input
                          id="precioPorGramo"
                          type="number"
                          step="0.001"
                          min="0"
                          value={formData.precioPorGramo}
                          onChange={(e) => setFormData({...formData, precioPorGramo: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                  {producto?.tipoVenta === "METRO" && (
                    <div>
                      <Label htmlFor="precioPorMetro">Precio por metro</Label>
                      <Input
                        id="precioPorMetro"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.precioPorMetro}
                        onChange={(e) => setFormData({...formData, precioPorMetro: e.target.value})}
                      />
                    </div>
                  )}
                  {producto?.tipoVenta === "LITRO" && (
                    <div>
                      <Label htmlFor="precioPorLitro">Precio por litro</Label>
                      <Input
                        id="precioPorLitro"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.precioPorLitro}
                        onChange={(e) => setFormData({...formData, precioPorLitro: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Configuración de IVA</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="esExentoIva"
                        checked={formData.esExentoIva}
                        onCheckedChange={(checked) => setFormData({...formData, esExentoIva: checked})}
                      />
                      <Label htmlFor="esExentoIva">Exento de IVA</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="incluyeIva"
                        checked={formData.incluyeIva}
                        onCheckedChange={(checked) => setFormData({...formData, incluyeIva: checked})}
                      />
                      <Label htmlFor="incluyeIva">El precio incluye IVA</Label>
                    </div>
                    {!formData.esExentoIva && (
                      <div>
                        <Label htmlFor="tarifaIva">Tarifa de IVA (%)</Label>
                        <Input
                          id="tarifaIva"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.tarifaIva}
                          onChange={(e) => setFormData({...formData, tarifaIva: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="atributos" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="talla">Talla</Label>
                    <Input
                      id="talla"
                      value={formData.talla}
                      onChange={(e) => setFormData({...formData, talla: e.target.value})}
                      placeholder="S, M, L, XL, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      placeholder="Rojo, Azul, Verde, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      value={formData.material}
                      onChange={(e) => setFormData({...formData, material: e.target.value})}
                      placeholder="Algodón, Poliéster, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="peso">Peso (kg)</Label>
                    <Input
                      id="peso"
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.peso}
                      onChange={(e) => setFormData({...formData, peso: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dimensiones">Dimensiones</Label>
                    <Input
                      id="dimensiones"
                      value={formData.dimensiones}
                      onChange={(e) => setFormData({...formData, dimensiones: e.target.value})}
                      placeholder="Largo x Ancho x Alto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="imagen">URL de imagen</Label>
                    <Input
                      id="imagen"
                      type="url"
                      value={formData.imagen}
                      onChange={(e) => setFormData({...formData, imagen: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="avanzado" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {tieneLotes() && (
                    <>
                      <div>
                        <Label htmlFor="lote">Lote</Label>
                        <Input
                          id="lote"
                          value={formData.lote}
                          onChange={(e) => setFormData({...formData, lote: e.target.value})}
                          placeholder="Número de lote"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fechaProduccion">Fecha de producción</Label>
                        <Input
                          id="fechaProduccion"
                          type="date"
                          value={formData.fechaProduccion}
                          onChange={(e) => setFormData({...formData, fechaProduccion: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                  {tieneVencimientos() && (
                    <div>
                      <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                      <Input
                        id="fechaVencimiento"
                        type="date"
                        value={formData.fechaVencimiento}
                        onChange={(e) => setFormData({...formData, fechaVencimiento: e.target.value})}
                      />
                    </div>
                  )}
                  {!tieneLotes() && !tieneVencimientos() && (
                    <div className="col-span-2 p-6 text-center border-2 border-dashed rounded-lg">
                      <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-medium mb-1">Funcionalidades no habilitadas</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Para usar control de lotes y vencimientos, habilítalos en la configuración de tu empresa.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = '/dashboard/configuracion'}
                      >
                        Ir a Configuración
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingVariante ? "Actualizar" : "Crear"} Variante
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de variantes */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVariantes.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="h-16 w-16 text-muted-foreground/70 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                  No hay variantes
                </h3>
                <p className="text-muted-foreground">
                  Crea la primera variante para este producto
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVariantes.map((variante, index) => (
                <motion.div
                  key={variante.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`hover:shadow-lg transition-all duration-200 ${!variante.activo ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground dark:text-foreground truncate">
                            {variante.nombre}
                          </h4>
                          {variante.sku && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Tag className="h-3 w-3" />
                              {variante.sku}
                            </p>
                          )}
                        </div>
                        {!variante.activo && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Inactiva
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        {variante.precio && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Precio:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {formatMoney(variante.precio)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Stock:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{variante.enStock}</span>
                            {getStockBadge(variante.enStock, variante.stockMinimo)}
                          </div>
                        </div>

                        {variante.talla && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Talla:</span>
                            <Badge variant="outline">{variante.talla}</Badge>
                          </div>
                        )}

                        {variante.color && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Color:</span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Palette className="h-3 w-3" />
                              {variante.color}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(variante)}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-400 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar variante?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción marcará la variante "{variante.nombre}" como inactiva.
                                Podrás reactivarla más tarde si es necesario.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(variante.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
