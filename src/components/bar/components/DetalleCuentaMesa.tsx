"use client";

import { useState } from "react";
import { ClipboardList, Minus, Plus, Gift } from "lucide-react";
import { useBarContext } from "@/components/bar/context/BarContext";
import { restauranteApi } from "@/lib/restaurante-api";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "./utils";

interface GrupoProducto {
  productoId: string;
  nombreProducto: string;
  notas: string | null | undefined;
  itemNormal: (typeof dummyItems)[0] | null;
  itemCortesia: (typeof dummyItems)[0] | null;
  cantidadTotal: number;
  cantidadCortesia: number;
  precioUnitario: number;
}
const dummyItems: import("@/types/restaurante").RestaurantePedidoItem[] = [];

export function DetalleCuentaMesa() {
  const {
    pedidoActivo,
    mesaSeleccionada,
    ajustarCantidadRapida,
    actualizandoItem,
    recargarOperativo,
  } = useBarContext();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!pedidoActivo || !mesaSeleccionada) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
        <ClipboardList className="h-7 w-7 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Selecciona una mesa para ver sus productos</p>
      </div>
    );
  }

  const items = pedidoActivo.items;

  const grupos: GrupoProducto[] = [];
  for (const item of items) {
    let grupo = grupos.find((g) => g.productoId === item.productoId);
    if (!grupo) {
      grupo = {
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        notas: item.notas,
        itemNormal: null,
        itemCortesia: null,
        cantidadTotal: 0,
        cantidadCortesia: 0,
        precioUnitario: item.esCortesia ? 0 : item.precioUnitario,
      };
      grupos.push(grupo);
    }
    if (item.esCortesia) {
      grupo.itemCortesia = item;
      grupo.cantidadCortesia += item.cantidad;
    } else {
      grupo.itemNormal = item;
      grupo.precioUnitario = item.precioUnitario;
    }
    grupo.cantidadTotal += item.cantidad;
  }

  const handleAddCortesia = async (grupo: GrupoProducto) => {
    const cantNormalActual = grupo.itemNormal?.cantidad ?? 0;
    if (cantNormalActual <= 0) return;
    try {
      setBusy(grupo.productoId);
      if (cantNormalActual === 1 && !grupo.itemCortesia) {
        await fetch(
          `/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemNormal!.id}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ esCortesia: true }) }
        );
      } else {
        const nuevaCantNormal = cantNormalActual - 1;
        if (nuevaCantNormal <= 0) {
          await fetch(`/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemNormal!.id}`, { method: "DELETE" });
        } else {
          await fetch(
            `/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemNormal!.id}`,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cantidad: nuevaCantNormal }) }
          );
        }
        if (grupo.itemCortesia) {
          await fetch(
            `/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemCortesia.id}`,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cantidad: grupo.cantidadCortesia + 1 }) }
          );
        } else {
          await restauranteApi.agregarItem(pedidoActivo.id, {
            productoId: grupo.productoId, cantidad: 1, esCortesia: true, estadoPreparacion: "ENTREGADO",
          });
        }
      }
      await recargarOperativo(mesaSeleccionada.id);
      toast({ title: "Cortesía añadida", description: `1 ${grupo.nombreProducto} marcado como cortesía` });
    } catch {
      toast({ title: "Error", description: "No se pudo dar cortesía", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveCortesia = async (grupo: GrupoProducto) => {
    if (grupo.cantidadCortesia <= 0 || !grupo.itemCortesia) return;
    try {
      setBusy(grupo.productoId);
      if (grupo.cantidadCortesia === 1 && !grupo.itemNormal) {
        await fetch(
          `/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemCortesia.id}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ esCortesia: false }) }
        );
      } else {
        const nuevaCantCortesia = grupo.cantidadCortesia - 1;
        if (nuevaCantCortesia <= 0) {
          await fetch(`/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemCortesia.id}`, { method: "DELETE" });
        } else {
          await fetch(
            `/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemCortesia.id}`,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cantidad: nuevaCantCortesia }) }
          );
        }
        if (grupo.itemNormal) {
          await fetch(
            `/api/restaurante/pedidos/${pedidoActivo.id}/items/${grupo.itemNormal.id}`,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cantidad: grupo.itemNormal.cantidad + 1 }) }
          );
        } else {
          await restauranteApi.agregarItem(pedidoActivo.id, {
            productoId: grupo.productoId, cantidad: 1, esCortesia: false, estadoPreparacion: "ENTREGADO",
          });
        }
      }
      await recargarOperativo(mesaSeleccionada.id);
      toast({ title: "Cortesía removida", description: `1 ${grupo.nombreProducto} vuelve a precio normal` });
    } catch {
      toast({ title: "Error", description: "No se pudo quitar cortesía", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground/70">
        Esta mesa no tiene productos aún
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {grupos.map((grupo) => {
        const isBusy = busy === grupo.productoId;
        const cantNormal = grupo.cantidadTotal - grupo.cantidadCortesia;
        const subtotalNormal = grupo.itemNormal ? grupo.itemNormal.subtotal : 0;

        return (
          <div
            key={grupo.productoId}
            className={`rounded-xl border p-3 transition-all ${
              grupo.cantidadCortesia > 0 ? "border-orange-100 bg-orange-500/10/40" : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground leading-tight">{grupo.nombreProducto}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground/70">{formatCurrency(grupo.precioUnitario)} c/u</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-sm font-semibold text-foreground/80">{formatCurrency(subtotalNormal)}</span>
                  {grupo.cantidadCortesia > 0 && (
                    <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded-full">
                      +{grupo.cantidadCortesia} gratis
                    </span>
                  )}
                </div>
                {grupo.notas && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">📝 {grupo.notas}</p>}
              </div>
              <p className="text-xs text-muted-foreground/70 shrink-0">×{grupo.cantidadTotal}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {grupo.itemNormal && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wide">Cant.</span>
                  <div className="flex items-center rounded-lg overflow-hidden border border-border bg-muted/50">
                    <button
                      type="button"
                      className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted transition disabled:opacity-30"
                      disabled={actualizandoItem || isBusy}
                      onClick={() => ajustarCantidadRapida(grupo.itemNormal!, grupo.itemNormal!.cantidad - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-foreground bg-card dark:bg-background border-x border-border">
                      {cantNormal}
                    </span>
                    <button
                      type="button"
                      className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted transition disabled:opacity-30"
                      disabled={actualizandoItem || isBusy}
                      onClick={() => ajustarCantidadRapida(grupo.itemNormal!, grupo.itemNormal!.cantidad + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="w-px h-5 bg-border" />

              <div className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">Cortesía</span>
                <div className="flex items-center rounded-lg overflow-hidden border border-orange-500/30 bg-orange-500/10">
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center text-orange-500 hover:bg-orange-500/15 transition disabled:opacity-30"
                    disabled={isBusy || grupo.cantidadCortesia <= 0}
                    onClick={() => handleRemoveCortesia(grupo)}
                    title="Quitar 1 cortesía"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className={`w-7 text-center text-sm font-semibold bg-card border-x border-orange-500/30 ${
                    grupo.cantidadCortesia > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/50"
                  }`}>
                    {isBusy ? "…" : grupo.cantidadCortesia}
                  </span>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center text-orange-500 hover:bg-orange-500/15 transition disabled:opacity-30"
                    disabled={isBusy || cantNormal <= 0}
                    onClick={() => handleAddCortesia(grupo)}
                    title="Dar 1 como cortesía"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="mt-2 pt-3 border-t border-border space-y-1.5 px-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(pedidoActivo.subtotal)}</span>
        </div>
        {pedidoActivo.impuesto > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Impuestos</span>
            <span>{formatCurrency(pedidoActivo.impuesto)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold text-foreground pt-1 border-t border-border">
          <span>Total</span>
          <span>{formatCurrency(pedidoActivo.total)}</span>
        </div>
      </div>
    </div>
  );
}
