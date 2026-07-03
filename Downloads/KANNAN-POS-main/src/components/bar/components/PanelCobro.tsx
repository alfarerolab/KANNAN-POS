"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  ArrowLeftRight,
  FileText,
  HelpCircle,
  SplitSquareHorizontal,
  X,
  AlertCircle,
  Plus,
  CheckCircle,
  Loader2,
  Printer,
  Receipt,
} from "lucide-react";
import { useBarContext } from "@/components/bar/context/BarContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "./utils";
import type { MetodoPagoRestaurante } from "@/types/restaurante";

const METODOS_PAGO_POS = [
  { id: "EFECTIVO",        label: "Efectivo",      Icon: Banknote       },
  { id: "TARJETA_DEBITO",  label: "Débito",        Icon: CreditCard     },
  { id: "TARJETA_CREDITO", label: "Crédito",       Icon: CreditCard     },
  { id: "TRANSFERENCIA",   label: "Transferencia", Icon: ArrowLeftRight },
  { id: "FIADO",           label: "Fiado",         Icon: FileText       },
  { id: "OTRO",            label: "Otro",          Icon: HelpCircle     },
];

interface PagoMixto {
  id: string;
  metodoPago: string;
  monto: number;
  referencia?: string;
}

export function PanelCobro() {
  const {
    pedidoActivo,
    mesaSeleccionada,
    clientes,
    facturaForm,
    setFacturaForm,
    facturarCuenta,
    facturandoCuenta,
    setImprimirOpen,
    setDividirCuentaOpen,
    recargarOperativo,
  } = useBarContext();

  const total = pedidoActivo?.total ?? 0;

  // ── Estados pago simple ──
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [valorRecibido, setValorRecibido] = useState("");
  const [referencia, setReferencia] = useState("");

  // ── Estados pago mixto ──
  const [modoMixto, setModoMixto] = useState(false);
  const [pagos, setPagos] = useState<PagoMixto[]>([]);
  const [nuevoMetodo, setNuevoMetodo] = useState("EFECTIVO");
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [nuevaRef, setNuevaRef] = useState("");

  // ── Estado crear cliente inline ──
  const [modoCrearCliente, setModoCrearCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", telefono: "" });
  const [creandoCliente, setCreandoCliente] = useState(false);

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre.trim()) return;
    try {
      setCreandoCliente(true);
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoCliente.nombre.trim(),
          telefono: nuevoCliente.telefono.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const creado = await res.json();
      setFacturaForm((prev: any) => ({ ...prev, clienteId: creado.id }));
      setModoCrearCliente(false);
      setNuevoCliente({ nombre: "", telefono: "" });
      await recargarOperativo();
    } catch {
      // silently fail — el toast lo maneja el contexto si es necesario
    } finally {
      setCreandoCliente(false);
    }
  };

  // ── Derivados ──
  const recibido = parseFloat(valorRecibido) || 0;
  const cambio = recibido - total;
  const mostrarCambio = metodoPago === "EFECTIVO" && valorRecibido !== "";

  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const faltante = total - totalPagado;
  const pagosCompletos = Math.abs(faltante) < 0.01;

  const tieneFiado =
    (!modoMixto && metodoPago === "FIADO") ||
    (modoMixto && pagos.some((p) => p.metodoPago === "FIADO"));

  const clienteSeleccionado = clientes.find((c) => c.id === facturaForm.clienteId);
  const necesitaRef = ["TRANSFERENCIA", "TARJETA_CREDITO", "TARJETA_DEBITO"].includes(metodoPago);

  // Sync metodoPago → facturaForm (solo si realmente cambió para no disparar re-renders extra)
  useEffect(() => {
    if (!modoMixto) {
      setFacturaForm((prev: any) => {
        if (prev.metodoPago === metodoPago) return prev; // sin cambio, devuelve misma referencia
        return { ...prev, metodoPago: metodoPago as MetodoPagoRestaurante };
      });
    }
  }, [metodoPago, modoMixto, setFacturaForm]);

  // Reset al cambiar cuenta
  useEffect(() => {
    setModoMixto(false);
    setPagos([]);
    setMetodoPago("EFECTIVO");
    setValorRecibido("");
    setReferencia("");
    setNuevoMonto("");
    setNuevaRef("");
  }, [pedidoActivo?.id]);

  const agregarPago = () => {
    const monto = parseFloat(nuevoMonto.replace(",", "."));
    if (!monto || monto <= 0) return;
    setPagos([...pagos, { id: crypto.randomUUID(), metodoPago: nuevoMetodo, monto, referencia: nuevaRef || undefined }]);
    setNuevoMonto("");
    setNuevaRef("");
  };

  const handleFacturar = () => {
    if (modoMixto) {
      setFacturaForm((prev: any) => ({ ...prev, pagos, metodoPago: "MIXTO" as any }));
    } else {
      setFacturaForm((prev: any) => ({
        ...prev,
        metodoPago: metodoPago as MetodoPagoRestaurante,
        referencia: necesitaRef ? referencia || undefined : undefined,
      }));
    }
    facturarCuenta();
  };

  const puedeFacturar =
    !facturandoCuenta &&
    pedidoActivo &&
    pedidoActivo.items.length > 0 &&
    (modoMixto ? pagosCompletos && pagos.length > 0 : !tieneFiado || !!clienteSeleccionado);

  if (!pedidoActivo) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
        <CreditCard className="h-7 w-7 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Selecciona una cuenta para cobrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="rounded-xl bg-foreground p-4 text-background">
        <p className="text-[11px] text-background/50 uppercase tracking-widest mb-3">
          {mesaSeleccionada?.nombre} · {pedidoActivo.nombreCuenta || "Cuenta"}
        </p>
        <div className="flex justify-between text-xs text-background/60 mb-1.5">
          <span>Subtotal</span>
          <span>{formatCurrency(pedidoActivo.subtotal)}</span>
        </div>
        {pedidoActivo.impuesto > 0 && (
          <div className="flex justify-between text-xs text-background/60">
            <span>Impuestos</span>
            <span>{formatCurrency(pedidoActivo.impuesto)}</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-semibold border-t border-background/20 pt-3 mt-3">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Toggle pago mixto */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Método de pago</Label>
        <button
          type="button"
          onClick={() => { setModoMixto(!modoMixto); setPagos([]); setNuevoMonto(""); setNuevaRef(""); }}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
            modoMixto
              ? "bg-foreground text-background border-foreground"
              : "bg-muted/50 text-muted-foreground border-border hover:border-border"
          }`}
        >
          <SplitSquareHorizontal className="h-3 w-3" />
          {modoMixto ? "Pago mixto ✓" : "Pago mixto"}
        </button>
      </div>

      {!modoMixto ? (
        /* ── MODO SIMPLE ── */
        <>
          {/* Botones métodos */}
          <div className="grid grid-cols-3 gap-1.5">
            {METODOS_PAGO_POS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMetodoPago(id)}
                className={`flex flex-col items-center gap-1 rounded-xl py-3 px-1 text-xs font-semibold border-2 transition-all ${
                  metodoPago === id ? "bg-foreground text-background border-foreground" : "bg-muted text-muted-foreground border-transparent hover:bg-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="leading-tight text-center">{label}</span>
              </button>
            ))}
          </div>

          {/* Efectivo: valor recibido + cambio */}
          {metodoPago === "EFECTIVO" && (
            <div className="space-y-2 p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10">
              <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Valor recibido</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={valorRecibido}
                  onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setValorRecibido(e.target.value); }}
                  className="pl-7 font-mono border-emerald-500/40 focus:border-emerald-500"
                />
              </div>
              {mostrarCambio && (
                <div className={`rounded-lg p-2.5 border-2 text-center ${cambio >= 0 ? "bg-card border-emerald-500/40" : "bg-destructive/10 border-destructive/40"}`}>
                  <p className="text-[11px] text-muted-foreground">{cambio >= 0 ? "💵 Cambio a devolver" : "⚠️ Monto insuficiente"}</p>
                  <p className={`text-xl font-bold font-mono ${cambio >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatCurrency(Math.abs(cambio))}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Referencia para transferencia/tarjeta */}
          {necesitaRef && (
            <div className="space-y-2 p-3 rounded-xl border-2 border-blue-500/30 bg-blue-500/10">
              <Label className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                {metodoPago === "TRANSFERENCIA" ? "🏦 N° comprobante" : "💳 N° autorización datáfono"}
                <span className="font-normal ml-1 opacity-70">(opcional)</span>
              </Label>
              <Input
                type="text"
                placeholder={metodoPago === "TRANSFERENCIA" ? "Ej: 123456789" : "Ej: 789456"}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="border-blue-500/40 focus:border-blue-500 text-sm"
              />
            </div>
          )}

          {/* Fiado: aviso */}
          {metodoPago === "FIADO" && (
            <div className="p-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 space-y-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Venta a crédito
              </p>
              {!clienteSeleccionado ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ Selecciona un cliente para registrar fiado</p>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400">✓ Deuda a nombre de <strong>{clienteSeleccionado.nombre}</strong></p>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── MODO MIXTO ── */
        <>
          {/* Lista de pagos */}
          {pagos.length === 0 ? (
            <div className="text-center py-5 text-xs text-muted-foreground/70 border-2 border-dashed rounded-xl">
              Todavía no agregaste ningún pago
            </div>
          ) : (
            <div className="space-y-1.5">
              {pagos.map((pago) => {
                const m = METODOS_PAGO_POS.find((x) => x.id === pago.metodoPago) ?? METODOS_PAGO_POS[5];
                return (
                  <div key={pago.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card dark:bg-background text-sm">
                    <m.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 font-medium text-foreground/80">{m.label}</span>
                    {pago.referencia && <span className="text-xs text-muted-foreground/70 truncate max-w-[60px]">#{pago.referencia}</span>}
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(pago.monto)}</span>
                    <button type="button" onClick={() => setPagos(pagos.filter((p) => p.id !== pago.id))} className="text-muted-foreground/50 hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra de progreso */}
          {pagos.length > 0 && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${pagosCompletos ? "bg-emerald-500" : "bg-orange-500"}`}
                  style={{ width: `${Math.min((totalPagado / total) * 100, 100)}%` }}
                />
              </div>
              <p className={`text-xs text-right font-medium ${pagosCompletos ? "text-emerald-600" : "text-muted-foreground"}`}>
                {pagosCompletos ? "✓ Total cubierto" : `Faltan ${formatCurrency(faltante)}`}
              </p>
            </div>
          )}

          {/* Formulario agregar pago */}
          {!pagosCompletos && (
            <div className="space-y-2.5 p-3 rounded-xl border-2 border-dashed border-border bg-muted/50">
              <Label className="text-xs font-semibold text-muted-foreground">Agregar pago</Label>
              <div className="grid grid-cols-3 gap-1">
                {METODOS_PAGO_POS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNuevoMetodo(id)}
                    className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium border-2 transition-all ${
                      nuevoMetodo === id ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-border"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="leading-tight">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={nuevoMonto}
                    onChange={(e) => { if (e.target.value === "" || /^\d*[.,]?\d*$/.test(e.target.value)) setNuevoMonto(e.target.value); }}
                    className="pl-7 text-sm font-mono"
                  />
                </div>
                {faltante > 0.01 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setNuevoMonto(faltante.toFixed(0))} className="text-xs whitespace-nowrap">
                    Restante
                  </Button>
                )}
              </div>
              {["TRANSFERENCIA", "TARJETA_CREDITO", "TARJETA_DEBITO"].includes(nuevoMetodo) && (
                <Input type="text" placeholder="Referencia (opcional)" value={nuevaRef} onChange={(e) => setNuevaRef(e.target.value)} className="text-sm" />
              )}
              {nuevoMetodo === "FIADO" && !clienteSeleccionado && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Selecciona un cliente primero
                </p>
              )}
              <Button
                type="button"
                size="sm"
                onClick={agregarPago}
                disabled={!nuevoMonto || parseFloat(nuevoMonto.replace(",", ".")) <= 0 || (nuevoMetodo === "FIADO" && !clienteSeleccionado)}
                className="w-full gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar pago
              </Button>
            </div>
          )}
        </>
      )}

      {/* Cliente */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            Cliente
            {tieneFiado && <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">(requerido para fiado)</span>}
          </Label>
          <button
            type="button"
            onClick={() => setModoCrearCliente(!modoCrearCliente)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {modoCrearCliente ? (
              <><X className="h-3 w-3" /> Cancelar</>
            ) : (
              <><Plus className="h-3 w-3" /> Nuevo</>
            )}
          </button>
        </div>

        {modoCrearCliente ? (
          <div className="space-y-2 p-3 rounded-xl border-2 border-dashed border-border bg-muted/50">
            <Input
              type="text"
              placeholder="Nombre *"
              value={nuevoCliente.nombre}
              onChange={(e) => setNuevoCliente((p) => ({ ...p, nombre: e.target.value }))}
              className="h-8 text-sm"
              autoFocus
            />
            <Input
              type="tel"
              placeholder="Celular (opcional)"
              value={nuevoCliente.telefono}
              onChange={(e) => setNuevoCliente((p) => ({ ...p, telefono: e.target.value }))}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCrearCliente}
              disabled={!nuevoCliente.nombre.trim() || creandoCliente}
              className="w-full h-8 gap-1.5 bg-card hover:bg-muted text-primary-foreground"
            >
              {creandoCliente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Guardar cliente
            </Button>
          </div>
        ) : (
          <Select
            value={facturaForm.clienteId}
            onValueChange={(v) => setFacturaForm((prev: any) => ({ ...prev, clienteId: v }))}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sin-cliente">Consumidor final</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Notas</Label>
        <Textarea
          value={facturaForm.notas}
          onChange={(e) => setFacturaForm((prev: any) => ({ ...prev, notas: e.target.value }))}
          placeholder="Notas opcionales..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Validación fiado sin cliente */}
      {tieneFiado && !clienteSeleccionado && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/40">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">Selecciona un cliente para continuar con venta fiada.</p>
        </div>
      )}

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setImprimirOpen(true)}>
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Precuenta
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs"
          onClick={() => setDividirCuentaOpen(true)}
          disabled={pedidoActivo.items.length === 0}
        >
          <Receipt className="mr-1.5 h-3.5 w-3.5" />
          Dividir
        </Button>
      </div>

      <Button
        className="w-full bg-orange-600 text-primary-foreground hover:bg-orange-700 h-11 font-semibold"
        onClick={handleFacturar}
        disabled={!puedeFacturar}
      >
        {facturandoCuenta ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Confirmar cobro · {formatCurrency(total)}
      </Button>
    </div>
  );
}
