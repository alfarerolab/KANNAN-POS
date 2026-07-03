"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Package,
  AlertTriangle,
  ShoppingCart,
  Weight,
  Ruler,
  Droplets,
  DollarSign,
  Eye,
  Clock,
  Box
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  producto: any;
  onAddToCart: (producto: any, data?: any) => void;
  formatearMoneda: (valor: number) => string;
  configuracion: any;
  tieneVariantes: boolean;
  tieneLotes: boolean;
  tieneVencimientos: boolean;
  varianteSeleccionada: any;
  setVarianteSeleccionada: (variante: any) => void;
  loteSeleccionado: string;
  setLoteSeleccionado: (lote: string) => void;
  fechaVencimiento: string;
  setFechaVencimiento: (fecha: string) => void;
  viewMode?: "grid" | "list";
}

const getTipoVentaConfig = (tipoVenta: string) => {
  const configs = {
    ["UNIDAD"]: {
      icon: Package,
      colorClass: "text-[#0f172a] dark:text-[#f8fafc]",
      solidBg: "bg-[#020617]",
      borderColorClass: "border-[#020617]/30",
      bgColorClass: "bg-[#020617]/10",
      textColorClass: "text-[#0f172a] dark:text-slate-300",
      buttonBgClass: "bg-[#020617] hover:bg-[#0f172a] text-white",
      label: "Por Unidad",
      placeholder: "Cantidad",
      unit: "unidades"
    },
    ["PESO"]: {
      icon: Weight,
      colorClass: "text-[#10b981]",
      solidBg: "bg-[#10b981]",
      borderColorClass: "border-[#10b981]/30",
      bgColorClass: "bg-[#10b981]/10",
      textColorClass: "text-emerald-700 dark:text-emerald-400",
      buttonBgClass: "bg-[#10b981] hover:bg-emerald-600 text-white",
      label: "Por Peso",
      placeholder: "Peso en kg",
      unit: "kg"
    },
    ["METRO"]: {
      icon: Ruler,
      colorClass: "text-[#f59e0b]",
      solidBg: "bg-[#f59e0b]",
      borderColorClass: "border-[#f59e0b]/30",
      bgColorClass: "bg-[#f59e0b]/10",
      textColorClass: "text-amber-700 dark:text-amber-400",
      buttonBgClass: "bg-[#f59e0b] hover:bg-amber-600 text-white",
      label: "Por Metro",
      placeholder: "Metros",
      unit: "m"
    },
    ["LITRO"]: {
      icon: Droplets,
      colorClass: "text-[#0891b2]",
      solidBg: "bg-[#0891b2]",
      borderColorClass: "border-[#0891b2]/30",
      bgColorClass: "bg-[#0891b2]/10",
      textColorClass: "text-cyan-700 dark:text-cyan-400",
      buttonBgClass: "bg-[#0891b2] hover:bg-cyan-700 text-white",
      label: "Por Litro",
      placeholder: "Litros",
      unit: "L"
    },
    ["TIEMPO"]: {
      icon: Clock,
      colorClass: "text-[#7c3aed]",
      solidBg: "bg-[#7c3aed]",
      borderColorClass: "border-[#7c3aed]/30",
      bgColorClass: "bg-[#7c3aed]/10",
      textColorClass: "text-violet-700 dark:text-violet-400",
      buttonBgClass: "bg-[#7c3aed] hover:bg-violet-700 text-white",
      label: "Por Tiempo",
      placeholder: "Duración",
      unit: "min"
    },
    ["PRECIO_LIBRE"]: {
      icon: DollarSign,
      colorClass: "text-[#f59e0b]",
      solidBg: "bg-[#f59e0b]",
      borderColorClass: "border-[#f59e0b]/30",
      bgColorClass: "bg-[#f59e0b]/10",
      textColorClass: "text-amber-700 dark:text-amber-400",
      buttonBgClass: "bg-[#f59e0b] hover:bg-amber-600 text-white",
      label: "Precio Libre",
      placeholder: "Precio personalizado",
      unit: "$"
    },
  };

  return configs[tipoVenta as keyof typeof configs] || configs["UNIDAD"];
};

export function ProductCard({
  producto,
  onAddToCart,
  formatearMoneda,
  configuracion,
  tieneVariantes,
  tieneLotes,
  tieneVencimientos,
  varianteSeleccionada,
  setVarianteSeleccionada,
  loteSeleccionado,
  setLoteSeleccionado,
  fechaVencimiento,
  setFechaVencimiento,
  viewMode = "grid"
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

  const [cantidad, setCantidad] = useState(1);
  const [peso, setPeso] = useState("");
  const [unidadPeso, setUnidadPeso] = useState<"kg" | "g">("kg");
  const [medida, setMedida] = useState("");
  const [precioLibre, setPrecioLibre] = useState<string>(
    producto.tipoVenta === "PRECIO_LIBRE"
      ? String(producto.precioSugerido || producto.precio || "")
      : String(producto.precio || "")
  );

  const [modoEntrada, setModoEntrada] = useState<"cantidad" | "dinero">("cantidad");
  const [valorDinero, setValorDinero] = useState("");

  const stockActual = Number(producto.enStock) || 0;
  const stockMinimo = Number(producto.stockMinimo) || 0;

  const stockBajo = stockActual > 0 && stockActual <= stockMinimo;
  const sinStock = stockActual <= 0;

  const tipoConfig = getTipoVentaConfig(producto.tipoVenta);
  const IconComponent = tipoConfig.icon;

  const calcularCantidadDesdeDinero = () => {
    const dinero = Number.parseFloat(valorDinero);
    if (isNaN(dinero) || dinero <= 0) return 0;

    switch (producto.tipoVenta) {
      case "PESO":
        const precioPorKilo = Number(producto.precioPorKilo || 0);
        if (precioPorKilo > 0) return dinero / precioPorKilo;
        return 0;
      case "METRO":
        const precioPorMetro = Number(producto.precioPorMetro || 0);
        if (precioPorMetro > 0) return dinero / precioPorMetro;
        return 0;
      case "LITRO":
        const precioPorLitro = Number(producto.precioPorLitro || 0);
        if (precioPorLitro > 0) return dinero / precioPorLitro;
        return 0;
      default:
        return 0;
    }
  };

  const formatearCantidad = (valor: number): string => {
    if (valor % 1 === 0) return valor.toString();
    return valor.toFixed(1);
  };

  const calcularPrecioPorPeso = () => {
    if (modoEntrada === "dinero") return Number.parseFloat(valorDinero) || 0;
    const pesoEnKg = obtenerPesoEnKg();
    const precioPorKilo = Number(producto.precioPorKilo || 0);
    if (pesoEnKg > 0 && precioPorKilo > 0) return Math.round(pesoEnKg * precioPorKilo * 100) / 100;
    return 0;
  };

  const obtenerPesoEnKg = () => {
    const pesoNum = Number.parseFloat(peso);
    if (isNaN(pesoNum) || pesoNum <= 0) return 0;
    if (unidadPeso === "g") return pesoNum / 1000;
    return pesoNum;
  };

  const handleQuickAdd = async () => {
    setIsAdding(true);
    if (producto.tipoVenta === "UNIDAD" && !tieneVariantes && !tieneLotes && !tieneVencimientos) {
      setTimeout(() => {
        onAddToCart(producto, { cantidad: 1, variante: varianteSeleccionada });
        setIsAdding(false);
      }, 300);
    } else {
      setShowQuantityDialog(true);
      setIsAdding(false);
    }
  };

  const handleAddWithQuantity = () => {
    const data: any = { variante: varianteSeleccionada };

    if (tieneLotes) data.lote = loteSeleccionado;
    if (tieneVencimientos) data.fechaVencimiento = fechaVencimiento;

    switch (producto.tipoVenta) {
      case "PESO":
        let pesoFinal: number;
        if (modoEntrada === "dinero") {
          pesoFinal = calcularCantidadDesdeDinero();
          if (pesoFinal <= 0) { toast({ title: "Valor inválido", description: "Por favor ingresa un valor válido en dinero", variant: "destructive" }); return; }
        } else {
          const pesoNum = Number.parseFloat(peso);
          if (isNaN(pesoNum) || pesoNum <= 0) { toast({ title: "Valor inválido", description: "Por favor ingresa un peso válido mayor a 0", variant: "destructive" }); return; }
          pesoFinal = obtenerPesoEnKg();
        }
        if (pesoFinal > stockActual) { toast({ title: "Stock insuficiente", description: `No hay suficiente stock. Disponible: ${stockActual} kg`, variant: "destructive" }); return; }
        data.peso = pesoFinal;
        data.cantidad = 1;
        data.unidadMedida = 'kg';
        break;

      case "METRO":
        let metrosFinal: number;
        if (modoEntrada === "dinero") {
          metrosFinal = calcularCantidadDesdeDinero();
          if (metrosFinal <= 0) { toast({ title: "Valor inválido", description: "Por favor ingresa un valor válido en dinero", variant: "destructive" }); return; }
        } else {
          metrosFinal = Number.parseFloat(medida);
          if (isNaN(metrosFinal) || metrosFinal <= 0 || !medida) { toast({ title: "Valor inválido", description: "Por favor ingresa los metros válidos mayor a 0", variant: "destructive" }); return; }
        }
        data.medida = metrosFinal;
        data.cantidad = 1;
        data.unidadMedida = 'm';
        break;

      case "LITRO":
        let litrosFinal: number;
        if (modoEntrada === "dinero") {
          litrosFinal = calcularCantidadDesdeDinero();
          if (litrosFinal <= 0) { toast({ title: "Valor inválido", description: "Por favor ingresa un valor válido en dinero", variant: "destructive" }); return; }
        } else {
          litrosFinal = Number.parseFloat(medida);
          if (isNaN(litrosFinal) || litrosFinal <= 0 || !medida) { toast({ title: "Valor inválido", description: "Por favor ingresa los litros válidos mayor a 0", variant: "destructive" }); return; }
        }
        data.medida = litrosFinal;
        data.cantidad = 1;
        data.unidadMedida = 'L';
        break;

      case "TIEMPO":
        data.tiempo = medida;
        data.cantidad = 1;
        data.unidadMedida = 'min';
        break;

      case "PRECIO_LIBRE":
        data.precioLibre = Number(precioLibre) || 0;
        data.cantidad = 1;
        break;

      default:
        data.cantidad = cantidad;
    }

    onAddToCart(producto, data);
    setShowQuantityDialog(false);

    setCantidad(1);
    setPeso("");
    setUnidadPeso("kg");
    setMedida("");
    setValorDinero("");
    setModoEntrada("cantidad");
    setPrecioLibre(String(producto.precioSugerido || producto.precio || ""));
  };

  const renderQuantityInput = () => {
    switch (producto.tipoVenta) {
      case "PESO":
        const precioTotal = calcularPrecioPorPeso();
        const pesoDisponible = stockActual;
        const pesoEnKg = modoEntrada === "dinero" ? calcularCantidadDesdeDinero() : obtenerPesoEnKg();

        const handlePesoChange = (valor: string) => {
          const valorNum = Number.parseFloat(valor);
          if (!valor || isNaN(valorNum)) { setPeso(valor); return; }
          if (unidadPeso === "g" && valorNum >= 1000) {
            const kilos = Math.round(valorNum / 1000);
            setUnidadPeso("kg");
            setPeso(kilos.toString());
          } else {
            setPeso(valor);
          }
        };

        return (
          <div className="space-y-3">
            <div className={cn("p-4 rounded-lg border", tipoConfig.bgColorClass, tipoConfig.borderColorClass)}>
              <div className="flex items-center gap-2 mb-4">
                <Label className="text-sm text-muted-foreground">Ingresar por:</Label>
                <div className="flex gap-1 bg-card dark:bg-background rounded-lg border p-1">
                  <Button type="button" variant={modoEntrada === "cantidad" ? "default" : "ghost"} size="sm" onClick={() => setModoEntrada("cantidad")} className="h-8 px-3 text-xs">
                    <Weight className="h-3 w-3 mr-1" />Peso
                  </Button>
                  <Button type="button" variant={modoEntrada === "dinero" ? "default" : "ghost"} size="sm" onClick={() => setModoEntrada("dinero")} className="h-8 px-3 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />Dinero
                  </Button>
                </div>
              </div>

              {modoEntrada === "cantidad" ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Weight className={cn("h-5 w-5", tipoConfig.colorClass)} />
                      <Label className="text-sm font-medium">Peso del producto</Label>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", tipoConfig.textColorClass)}>
                      Disponible: {Math.round(pesoDisponible)} kg
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Unidad:</Label>
                      <div className="flex gap-1 bg-card dark:bg-background rounded-lg border p-1">
                        <Button type="button" variant={unidadPeso === "kg" ? "default" : "ghost"} size="sm"
                          onClick={() => {
                            if (peso && unidadPeso === "g") {
                              const pesoNum = Number.parseFloat(peso);
                              if (!isNaN(pesoNum)) setPeso(Math.round(pesoNum / 1000).toString());
                            }
                            setUnidadPeso("kg");
                          }}
                          className="h-7 px-3 text-xs">Kilogramos (kg)</Button>
                        <Button type="button" variant={unidadPeso === "g" ? "default" : "ghost"} size="sm"
                          onClick={() => {
                            if (peso && unidadPeso === "kg") {
                              const pesoNum = Number.parseFloat(peso);
                              if (!isNaN(pesoNum)) setPeso(Math.round(pesoNum * 1000).toString());
                            }
                            setUnidadPeso("g");
                          }}
                          className="h-7 px-3 text-xs">Gramos (g)</Button>
                      </div>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        value={peso}
                        onChange={(e) => handlePesoChange(e.target.value)}
                        placeholder={unidadPeso === "kg" ? "0" : "0"}
                        step={unidadPeso === "kg" ? "1" : "1"}
                        min="0"
                        max={unidadPeso === "kg" ? Math.round(pesoDisponible) : Math.round(pesoDisponible * 1000)}
                        className="text-lg font-medium pr-12"
                        autoFocus
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{unidadPeso}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Precio por kg: {formatearMoneda(producto.precioPorKilo || producto.precio || 0)}</span>
                      {peso && pesoEnKg > pesoDisponible && <span className="text-red-600 dark:text-red-400 font-medium">⚠️ Excede stock disponible</span>}
                      {peso && unidadPeso === "g" && pesoEnKg < pesoDisponible && <span className="text-blue-600 dark:text-blue-400 font-medium">= {formatearCantidad(pesoEnKg)} kg</span>}
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">Pesos rápidos:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {unidadPeso === "kg"
                        ? [1, 2, 5, 10].map((pesoRapido) => (
                            <Button key={pesoRapido} type="button" variant="outline" size="sm" onClick={() => setPeso(pesoRapido.toString())} disabled={pesoRapido > pesoDisponible} className="text-xs">{pesoRapido} kg</Button>
                          ))
                        : [100, 250, 500, 750].map((pesoRapido) => (
                            <Button key={pesoRapido} type="button" variant="outline" size="sm" onClick={() => setPeso(pesoRapido.toString())} disabled={(pesoRapido / 1000) > pesoDisponible} className="text-xs">{pesoRapido} g</Button>
                          ))
                      }
                    </div>
                  </div>

                  {unidadPeso === "g" && (
                    <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <span className="text-sm">💡</span>
                        Al ingresar 1000g o más, se convertirá automáticamente a kilogramos
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <DollarSign className={cn("h-5 w-5", tipoConfig.colorClass)} />
                      <Label className="text-sm font-medium">Valor en dinero</Label>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", tipoConfig.textColorClass)}>
                      {formatearMoneda(producto.precioPorKilo || 0)}/kg
                    </Badge>
                  </div>

                  <div className="relative">
                    <Input type="number" value={valorDinero} onChange={(e) => setValorDinero(e.target.value)} placeholder="0.00" step="0.01" min="0" className="text-lg font-medium pl-8" autoFocus />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  </div>

                  {valorDinero && pesoEnKg > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground/80">Peso equivalente:</span>
                        <span className="text-lg font-bold text-emerald-600">{pesoEnKg.toFixed(2)} kg</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatearMoneda(Number(valorDinero))} ÷ {formatearMoneda(producto.precioPorKilo || 0)}/kg
                      </div>
                      {pesoEnKg > pesoDisponible && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Excede el stock disponible ({pesoDisponible} kg)
                        </div>
                      )}
                    </motion.div>
                  )}

                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">Valores rápidos:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5000, 10000, 20000, 500000].map((valor) => (
                        <Button key={valor} type="button" variant="outline" size="sm" onClick={() => setValorDinero(valor.toString())} className="text-xs">${valor}</Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {precioTotal > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground/80">Total a pagar:</span>
                    <span className="text-xl font-bold text-emerald-600">{formatearMoneda(precioTotal)}</span>
                  </div>
                  {modoEntrada === "cantidad" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {unidadPeso === "kg"
                        ? `${peso} kg × ${formatearMoneda(producto.precioPorKilo || producto.precio || 0)}/kg`
                        : `${peso}g × ${formatearMoneda(producto.precioPorKilo || producto.precio || 0)}/kg`
                      }
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        );

      case "METRO":
        const medidaMetros = modoEntrada === "dinero" ? calcularCantidadDesdeDinero() : (medida ? Number.parseFloat(medida) : 0);
        const precioMetros = medidaMetros * (producto.precioPorMetro || 0);

        return (
          <div className="space-y-3">
            <div className={cn("p-4 rounded-lg border", tipoConfig.bgColorClass, tipoConfig.borderColorClass)}>
              <div className="flex items-center gap-2 mb-4">
                <Label className="text-sm text-muted-foreground">Ingresar por:</Label>
                <div className="flex gap-1 bg-card dark:bg-background rounded-lg border p-1">
                  <Button type="button" variant={modoEntrada === "cantidad" ? "default" : "ghost"} size="sm" onClick={() => setModoEntrada("cantidad")} className="h-8 px-3 text-xs">
                    <Ruler className="h-3 w-3 mr-1" />Metros
                  </Button>
                  <Button type="button" variant={modoEntrada === "dinero" ? "default" : "ghost"} size="sm" onClick={() => setModoEntrada("dinero")} className="h-8 px-3 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />Dinero
                  </Button>
                </div>
              </div>

              {modoEntrada === "cantidad" ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Ruler className={cn("h-5 w-5", tipoConfig.colorClass)} />
                      <Label className="text-sm font-medium">Metros</Label>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", tipoConfig.textColorClass)}>
                      {formatearMoneda(producto.precioPorMetro || 0)}/m
                    </Badge>
                  </div>
                  <Input type="number" value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="0" step="0.1" min="0.1" className="text-lg font-medium" autoFocus />
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">Medidas rápidas:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 5, 10].map((metros) => (
                        <Button key={metros} type="button" variant="outline" size="sm" onClick={() => setMedida(metros.toString())} className="text-xs">{metros} m</Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <DollarSign className={cn("h-5 w-5", tipoConfig.colorClass)} />
                      <Label className="text-sm font-medium">Valor en dinero</Label>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", tipoConfig.textColorClass)}>
                      {formatearMoneda(producto.precioPorMetro || 0)}/m
                    </Badge>
                  </div>
                  <div className="relative">
                    <Input type="number" value={valorDinero} onChange={(e) => setValorDinero(e.target.value)} placeholder="0.00" step="0.01" min="0" className="text-lg font-medium pl-8" autoFocus />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  </div>
                  {valorDinero && medidaMetros > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground/80">Metros equivalentes:</span>
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatearCantidad(medidaMetros)} m</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatearMoneda(Number(valorDinero))} ÷ {formatearMoneda(producto.precioPorMetro || 0)}/m
                      </div>
                    </motion.div>
                  )}
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">Valores rápidos:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5000, 10000, 20000, 500000].map((valor) => (
                        <Button key={valor} type="button" variant="outline" size="sm" onClick={() => setValorDinero(valor.toString())} className="text-xs">${valor}</Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {precioMetros > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground/80">Total a pagar:</span>
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatearMoneda(precioMetros)}</span>
                  </div>
                  {modoEntrada === "cantidad" && medida && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {medida} m × {formatearMoneda(producto.precioPorMetro || 0)}/m
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        );

      case "LITRO":
        const litrosNum = modoEntrada === "dinero" ? calcularCantidadDesdeDinero() : (medida ? Number.parseFloat(medida) : 0);
        const precioLitros = litrosNum * (producto.precioPorLitro || 0);

        return (
          <div className="space-y-3">
            <div className={cn("p-4 rounded-lg border", tipoConfig.bgColorClass, tipoConfig.borderColorClass)}>
              <div className="flex items-center gap-2 mb-4">
                <Label className="text-sm text-muted-foreground">Ingresar por:</Label>
                <div className="flex gap-1 bg-card dark:bg-background rounded-lg border p-1">
                  <Button type="button" variant={modoEntrada === "cantidad" ? "default" : "ghost"} size="sm" onClick={() => setModoEntrada("cantidad")} className="h-8 px-3 text-xs">
                    <Droplets className="h-3 w-3 mr-1" />Litros
                  </Button>
                  <Button type="button" variant={modoEntrada === "dinero" ? "default" : "ghost"} size="sm" onClick={() => setModoEntrada("dinero")} className="h-8 px-3 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />Dinero
                  </Button>
                </div>
              </div>

              {modoEntrada === "cantidad" ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Droplets className={cn("h-5 w-5", tipoConfig.colorClass)} />
                      <Label className="text-sm font-medium">Litros</Label>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", tipoConfig.textColorClass)}>
                      {formatearMoneda(producto.precioPorLitro || 0)}/L
                    </Badge>
                  </div>
                  <Input type="number" value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="0" step="0.1" min="0.1" className="text-lg font-medium" autoFocus />
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">Cantidades rápidas:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 5, 10].map((litros) => (
                        <Button key={litros} type="button" variant="outline" size="sm" onClick={() => setMedida(litros.toString())} className="text-xs">{litros} L</Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <DollarSign className={cn("h-5 w-5", tipoConfig.colorClass)} />
                      <Label className="text-sm font-medium">Valor en dinero</Label>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", tipoConfig.textColorClass)}>
                      {formatearMoneda(producto.precioPorLitro || 0)}/L
                    </Badge>
                  </div>
                  <div className="relative">
                    <Input type="number" value={valorDinero} onChange={(e) => setValorDinero(e.target.value)} placeholder="0.00" step="0.01" min="0" className="text-lg font-medium pl-8" autoFocus />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  </div>
                  {valorDinero && litrosNum > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground/80">Litros equivalentes:</span>
                        <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{formatearCantidad(litrosNum)} L</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatearMoneda(Number(valorDinero))} ÷ {formatearMoneda(producto.precioPorLitro || 0)}/L
                      </div>
                    </motion.div>
                  )}
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">Valores rápidos:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5000, 10000, 20000, 500000].map((valor) => (
                        <Button key={valor} type="button" variant="outline" size="sm" onClick={() => setValorDinero(valor.toString())} className="text-xs">${valor}</Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {precioLitros > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground/80">Total a pagar:</span>
                    <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{formatearMoneda(precioLitros)}</span>
                  </div>
                  {modoEntrada === "cantidad" && medida && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {medida} L × {formatearMoneda(producto.precioPorLitro || 0)}/L
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        );

      case "PRECIO_LIBRE":
        return (
          <div className="space-y-3">
            <div className={cn("p-3 rounded-lg border", tipoConfig.bgColorClass, tipoConfig.borderColorClass)}>
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className={cn("h-4 w-4", tipoConfig.colorClass)} />
                <Label className="text-sm font-medium">Precio personalizado</Label>
              </div>
              <Input type="number" value={precioLibre} onChange={(e) => setPrecioLibre(e.target.value)} placeholder="0.00" step="0.01" min="0" className="text-lg font-medium" />
              {producto.precioSugerido && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Precio sugerido: {formatearMoneda(producto.precioSugerido)}
                </div>
              )}
              {precioLibre && Number(precioLibre) > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                  Total: {formatearMoneda(Number(precioLibre))}
                </motion.div>
              )}
            </div>
          </div>
        );

      default:
        // ✅ FIX: type="text" + inputMode="numeric" elimina el subrayado azul del navegador
        // y permite borrar el campo libremente para escribir cualquier número
        return (
          <div className="space-y-3">
            <div className={cn("p-3 rounded-lg border", tipoConfig.bgColorClass, tipoConfig.borderColorClass)}>
              <div className="flex items-center space-x-2 mb-2">
                <Package className={cn("h-4 w-4", tipoConfig.colorClass)} />
                <Label className="text-sm font-medium">Cantidad</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  disabled={cantidad <= 1}
                  className="h-10 w-10 p-0 shrink-0"
                >
                  -
                </Button>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={cantidad === 0 ? "" : cantidad}
                  onChange={(e) => {
                    // Solo permite dígitos, sin subrayado ni controles nativos
                    const val = e.target.value.replace(/\D/g, "");
                    setCantidad(val === "" ? 0 : Number(val));
                  }}
                  onBlur={() => {
                    // Si queda vacío o 0 al salir del campo, volver a 1
                    if (!cantidad || cantidad < 1) setCantidad(1);
                  }}
                  className="text-center text-lg font-medium [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  autoFocus
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCantidad(cantidad + 1)}
                  className="h-10 w-10 p-0 shrink-0"
                >
                  +
                </Button>
              </div>
              {cantidad > 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm text-muted-foreground">
                  Total: {formatearMoneda(producto.precio * cantidad)}
                </motion.div>
              )}
            </div>
          </div>
        );
    }
  };

  if (viewMode === "list") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-2 w-full">
        <Card
          className={cn(
            "group cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
            tipoConfig.borderColorClass.replace('border-', 'border-l-'),
            sinStock && "opacity-60",
            stockBajo && !sinStock && "border-l-yellow-400"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0", tipoConfig.solidBg)}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <h3 className="font-semibold text-base sm:text-lg">{producto.nombre}</h3>
                    <Badge variant="outline" className={cn("text-xs shrink-0", tipoConfig.bgColorClass, tipoConfig.textColorClass)}>
                      {tipoConfig.label}
                    </Badge>
                  </div>
                  {producto.descripcion && <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{producto.descripcion}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-bold text-green-600 dark:text-green-400 shrink-0">
                      {formatearMoneda(producto.tipoVenta === "PESO" ? producto.precioPorKilo : producto.precio)}
                      {producto.tipoVenta === "PESO" && <span className="text-sm font-normal">/kg</span>}
                    </span>
                    {(stockBajo || sinStock) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <AlertTriangle className={cn("h-4 w-4", sinStock ? 'text-red-500' : 'text-yellow-500')} />
                        <span className={cn("text-sm font-medium", sinStock ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400')}>
                          {sinStock ? 'Sin stock' : 'Stock bajo'}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground shrink-0">
                      Stock: {stockActual}{producto.tipoVenta === "PESO" && ' kg'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDetailsDialog(true)} className="shrink-0">
                  <Eye className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Ver</span>
                </Button>
                <Button
                  onClick={handleQuickAdd}
                  disabled={sinStock || isAdding}
                  size="sm"
                  className={cn("flex-1 transition-all duration-200", tipoConfig.buttonBgClass, isAdding && "scale-95")}
                >
                  {isAdding
                    ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    : <><Plus className="h-4 w-4 mr-1" /><span className="text-sm">Agregar</span></>
                  }
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
      >
        <Card
          className={cn(
            "group cursor-pointer transition-all duration-200 hover:shadow-xl border-t-4 h-full flex flex-col",
            tipoConfig.borderColorClass.replace('border-', 'border-t-'),
            sinStock && "opacity-60 grayscale",
            stockBajo && !sinStock && "border-t-yellow-400",
            isHovered && "ring-2 ring-offset-1 ring-border"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", tipoConfig.solidBg)}>
                <IconComponent className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                <Badge variant="outline" className={cn("text-xs", tipoConfig.bgColorClass, tipoConfig.textColorClass)}>
                  {tipoConfig.label}
                </Badge>
                {stockBajo && !sinStock && <Badge variant="secondary" className="text-xs bg-amber-500/15 text-yellow-800">Stock bajo</Badge>}
                {sinStock && <Badge variant="destructive" className="text-xs">Sin stock</Badge>}
              </div>
            </div>

            {producto.imagen && (
              <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-muted">
                <Image src={producto.imagen} alt={producto.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-200" />
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
              <h3 className="font-semibold text-lg mb-1 line-clamp-2">{producto.nombre}</h3>
              {producto.descripcion && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{producto.descripcion}</p>}

              <div className="mb-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {formatearMoneda(producto.tipoVenta === "PESO" ? producto.precioPorKilo : producto.precio)}
                  {producto.tipoVenta === "PESO" && <span className="text-sm font-normal ml-1">/kg</span>}
                </div>
                {producto.tipoVenta === "PRECIO_LIBRE" && producto.precioSugerido && (
                  <div className="text-sm text-muted-foreground">Sugerido: {formatearMoneda(producto.precioSugerido)}</div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Box className="h-4 w-4 flex-shrink-0" />
                  <span>Stock: {stockActual}{producto.tipoVenta === "PESO" && ' kg'}</span>
                  {stockBajo && !sinStock && (
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">(mín: {stockMinimo}{producto.tipoVenta === "PESO" && ' kg'})</span>
                  )}
                </div>
                {producto.categoria && (
                  <Badge variant="outline" className="text-xs">
                    {typeof producto.categoria === 'string' ? producto.categoria : producto.categoria.nombre}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <Button variant="outline" size="sm" onClick={() => setShowDetailsDialog(true)} className="flex-1">
                <Eye className="h-4 w-4 mr-1" />Ver
              </Button>
              <Button
                onClick={handleQuickAdd}
                disabled={sinStock || isAdding}
                className={cn("flex-1 transition-all duration-200", tipoConfig.buttonBgClass, isAdding && "scale-95")}
              >
                <AnimatePresence mode="wait">
                  {isAdding ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                      <Plus className="h-4 w-4" /><span>Agregar</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog de cantidad */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconComponent className="h-5 w-5 text-white" />
              <span>Agregar {producto.nombre}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {renderQuantityInput()}

            {tieneVariantes && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Variante</Label>
                <Select value={varianteSeleccionada?.id || ""} onValueChange={(value) => {
                  const variante = producto.variantes?.find((v: any) => v.id === value);
                  setVarianteSeleccionada(variante);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar variante" />
                  </SelectTrigger>
                  <SelectContent>
                    {producto.variantes?.map((variante: any) => (
                      <SelectItem key={variante.id} value={variante.id}>{variante.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowQuantityDialog(false)} className="flex-1">Cancelar</Button>
              <Button
                onClick={handleAddWithQuantity}
                className={cn("flex-1", tipoConfig.buttonBgClass)}
                disabled={
                  (producto.tipoVenta === "PESO" && modoEntrada === "cantidad" &&
                    (!peso || Number.parseFloat(peso) <= 0 || obtenerPesoEnKg() > stockActual)) ||
                  (producto.tipoVenta === "PESO" && modoEntrada === "dinero" &&
                    (!valorDinero || Number.parseFloat(valorDinero) <= 0 || calcularCantidadDesdeDinero() > stockActual)) ||
                  (producto.tipoVenta === "METRO" && modoEntrada === "cantidad" &&
                    (!medida || Number.parseFloat(medida) <= 0)) ||
                  (producto.tipoVenta === "METRO" && modoEntrada === "dinero" &&
                    (!valorDinero || Number.parseFloat(valorDinero) <= 0)) ||
                  (producto.tipoVenta === "LITRO" && modoEntrada === "cantidad" &&
                    (!medida || Number.parseFloat(medida) <= 0)) ||
                  (producto.tipoVenta === "LITRO" && modoEntrada === "dinero" &&
                    (!valorDinero || Number.parseFloat(valorDinero) <= 0))
                }
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalles */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconComponent className="h-5 w-5 text-white" />
              <span>{producto.nombre}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {producto.imagen && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image src={producto.imagen} alt={producto.nombre} fill className="object-cover" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Precio:</Label>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatearMoneda(producto.tipoVenta === "PESO" ? producto.precioPorKilo : producto.precio)}
                  {producto.tipoVenta === "PESO" && <span className="text-sm">/kg</span>}
                </p>
              </div>
              <div>
                <Label className="font-medium">Stock:</Label>
                <p className={stockBajo ? "text-yellow-600 dark:text-yellow-400" : sinStock ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                  {stockActual} {producto.tipoVenta === "PESO" ? 'kg' : 'unidades'}
                </p>
                {stockBajo && !sinStock && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">Mínimo: {stockMinimo} {producto.tipoVenta === "PESO" ? 'kg' : 'unidades'}</p>
                )}
              </div>
              <div>
                <Label className="font-medium">Tipo:</Label>
                <p>{tipoConfig.label}</p>
              </div>
              {producto.categoria && (
                <div>
                  <Label className="font-medium">Categoría:</Label>
                  <p>{typeof producto.categoria === 'string' ? producto.categoria : producto.categoria.nombre}</p>
                </div>
              )}
              {producto.tipoVenta === "PRECIO_LIBRE" && producto.precioSugerido && (
                <div>
                  <Label className="font-medium">Precio Sugerido:</Label>
                  <p className="text-green-600 dark:text-green-400 font-semibold">{formatearMoneda(producto.precioSugerido)}</p>
                </div>
              )}
            </div>

            {producto.descripcion && (
              <div>
                <Label className="font-medium">Descripción:</Label>
                <p className="text-sm text-muted-foreground mt-1">{producto.descripcion}</p>
              </div>
            )}

            {producto.tipoVenta === "PESO" && (
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <Label className="font-medium text-emerald-900">Información de Pesaje</Label>
                <div className="mt-2 space-y-1 text-sm text-emerald-700 dark:text-emerald-400">
                  <p className="font-semibold">Precio por kilo: {formatearMoneda(producto.precioPorKilo)}</p>
                  {producto.precioPorGramo && <p>Precio por gramo: {formatearMoneda(producto.precioPorGramo)}</p>}
                  {producto.pesoAproximado && <p>Peso aproximado por unidad: {producto.pesoAproximado} kg</p>}
                  <p className="text-xs text-emerald-600 mt-2">💡 El precio se calcula automáticamente según el peso vendido</p>
                </div>
              </div>
            )}

            {producto.tipoVenta === "METRO" && producto.precioPorMetro && (
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <Label className="font-medium text-orange-900">Información de Medida</Label>
                <div className="mt-2 space-y-1 text-sm text-orange-700 dark:text-orange-400">
                  <p>Precio por metro: {formatearMoneda(producto.precioPorMetro)}</p>
                </div>
              </div>
            )}

            {producto.tipoVenta === "LITRO" && producto.precioPorLitro && (
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <Label className="font-medium text-cyan-900">Información de Volumen</Label>
                <div className="mt-2 space-y-1 text-sm text-cyan-700">
                  <p>Precio por litro: {formatearMoneda(producto.precioPorLitro)}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => { setShowDetailsDialog(false); handleQuickAdd(); }}
                disabled={sinStock}
                className={cn("flex-1", tipoConfig.buttonBgClass)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar al carrito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}