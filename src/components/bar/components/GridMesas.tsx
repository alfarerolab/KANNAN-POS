"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ClipboardList } from "lucide-react";
import { useBarContext } from "@/components/bar/context/BarContext";
import { useToast } from "@/hooks/use-toast";

import { formatCurrency, extraerNumeroMesa } from "./utils";

export function GridMesas() {
  const {
    mesas,
    mesaSeleccionada,
    setSelectedMesaId,
    recargarOperativo,
    cuentasAbiertas,
  } = useBarContext();
  const { toast } = useToast();

  // nombre provisional LOCAL por mesaId (no depende de pedido abierto)
  const [nombresProvisionales, setNombresProvisionales] = useState<Record<string, string>>({});
  const [editandoMesaId, setEditandoMesaId] = useState<string | null>(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  // Confirmar eliminación inline
  const [confirmandoEliminarId, setConfirmandoEliminarId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  // Modal crear mesa con nombre personalizado
  const [creandoConNombre, setCreandoConNombre] = useState(false);
  const [nombreNuevaMesa, setNombreNuevaMesa] = useState("");
  const [creandoLocal, setCreandoLocal] = useState(false);

  const mesasActivas = mesas
    .filter((m) => m.activa && !m.id.startsWith("synthetic-"))
    .sort((a, b) => {
      const numA = parseInt(a.nombre.match(/\d+/)?.[0] ?? "0", 10);
      const numB = parseInt(b.nombre.match(/\d+/)?.[0] ?? "0", 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.nombre.localeCompare(b.nombre, "es");
    });

  // Limpiar nombre provisional cuando una mesa queda libre (cuenta pagada)
  useEffect(() => {
    setNombresProvisionales((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      const updated = { ...prev };
      let changed = false;
      for (const id of keys) {
        const mesa = mesasActivas.find((m) => m.id === id);
        // Si la mesa ya no existe o no tiene pedido abierto, eliminar nombre provisional
        if (!mesa || !mesa.pedidoAbierto) {
          delete updated[id];
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [mesas, mesasActivas]);

  // Calcula el siguiente número de mesa disponible
  const siguienteNumero = () => {
    const numeros = mesasActivas
      .map((m) => parseInt(extraerNumeroMesa(m.nombre), 10))
      .filter((n) => !isNaN(n));
    return numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  };

  const abrirModalCrear = () => {
    setNombreNuevaMesa("");
    setCreandoConNombre(true);
  };

  const confirmarCrearMesa = async () => {
    const num = siguienteNumero();
    const nombreBase = nombreNuevaMesa.trim() || `Mesa ${num}`;

    // Si el nombre ya existe en las mesas activas, buscar uno libre añadiendo sufijo
    const nombresExistentes = mesas.map((m) => m.nombre.toLowerCase());
    let nombreFinal = nombreBase;
    if (nombresExistentes.includes(nombreFinal.toLowerCase())) {
      let i = 2;
      while (nombresExistentes.includes(`${nombreBase} (${i})`.toLowerCase())) i++;
      nombreFinal = `${nombreBase} (${i})`;
    }

    setCreandoLocal(true);
    try {
      const res = await fetch("/api/restaurante/mesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreFinal, capacidad: 4, ubicacion: "" }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Error al crear");
      await recargarOperativo();
      toast({ title: "Mesa creada", description: `${nombreFinal} ya está disponible` });
    } catch (err) {
      toast({ title: "No se pudo crear la mesa", description: err instanceof Error ? err.message : "Intenta nuevamente", variant: "destructive" });
    } finally {
      setCreandoLocal(false);
      setCreandoConNombre(false);
      setNombreNuevaMesa("");
    }
  };

  const handleClickMesa = (mesa: (typeof mesas)[0]) => {
    if (confirmandoEliminarId === mesa.id || editandoMesaId === mesa.id) return;
    // Solo seleccionar — el modal se abre desde el botón "Añadir a Mesa"
    setSelectedMesaId(mesa.id);
  };

  const abrirEdicion = (e: React.MouseEvent, mesa: (typeof mesas)[0]) => {
    e.stopPropagation();
    setConfirmandoEliminarId(null);
    setEditandoMesaId(mesa.id);
    setNombreEdicion(
      mesa.pedidoAbierto?.nombreCuenta ||
      nombresProvisionales[mesa.id] ||
      ""
    );
  };

  const guardarNombre = async (mesa: (typeof mesas)[0]) => {
    setGuardandoNombre(true);
    try {
      const nombre = nombreEdicion.trim();
      if (mesa.pedidoAbierto) {
        await fetch(`/api/restaurante/pedidos/${mesa.pedidoAbierto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombreCuenta: nombre || null }),
        });
        await recargarOperativo(mesa.id);
      } else {
        setNombresProvisionales((prev) =>
          nombre
            ? { ...prev, [mesa.id]: nombre }
            : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== mesa.id))
        );
      }
      toast({ title: "Nombre guardado" });
      setEditandoMesaId(null);
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setGuardandoNombre(false);
    }
  };

  const eliminarMesa = async (mesa: (typeof mesas)[0]) => {
    if (mesa.estado === "OCUPADA") {
      toast({ title: "No se puede eliminar", description: "La mesa tiene una cuenta abierta", variant: "destructive" });
      setConfirmandoEliminarId(null);
      return;
    }
    setEliminandoId(mesa.id);
    try {
      const res = await fetch(`/api/restaurante/mesas/${mesa.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al eliminar");
      }
      await recargarOperativo();
      toast({ title: "Mesa eliminada" });
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    } finally {
      setEliminandoId(null);
      setConfirmandoEliminarId(null);
    }
  };

  const num = siguienteNumero();

  return (
    <div className="space-y-3">
      {/* Modal crear mesa con nombre */}
      {creandoConNombre && (
        <div className="rounded-xl border-2 border-primary/40 bg-card p-3 shadow-md space-y-2">
          <p className="text-xs font-semibold text-foreground/70">Nueva mesa</p>
          <input
            autoFocus
            type="text"
            value={nombreNuevaMesa}
            onChange={(e) => setNombreNuevaMesa(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmarCrearMesa();
              if (e.key === "Escape") setCreandoConNombre(false);
            }}
            placeholder={`Mesa ${num} (dejar vacío para nombre automático)`}
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmarCrearMesa}
              disabled={creandoLocal}
              className="flex-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {creandoLocal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Crear
            </button>
            <button
              type="button"
              onClick={() => setCreandoConNombre(false)}
              className="flex-1 rounded-lg bg-muted border border-border text-xs font-semibold py-1.5 hover:bg-muted/80"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
        {mesasActivas.map((mesa) => {
          const ocupada = mesa.estado === "OCUPADA" && !!mesa.pedidoAbierto;
          const seleccionada = mesa.id === mesaSeleccionada?.id;
          const pedido = mesa.pedidoAbierto;
          const estaEditando = editandoMesaId === mesa.id;
          const estaConfirmando = confirmandoEliminarId === mesa.id;
          const estaEliminando = eliminandoId === mesa.id;
          const numeroMesa = extraerNumeroMesa(mesa.nombre);
          // nombre personalizado: del pedido, o provisional local, o null
          const nombrePersonalizado = pedido?.nombreCuenta || nombresProvisionales[mesa.id] || null;
          // nombre base de la mesa (siempre disponible)
          const nombreBase = mesa.nombre;

          return (
            <div key={mesa.id} className="relative">
              {/* ── Tarjeta principal ── */}
              {!estaEditando && !estaConfirmando && (
                <button
                  type="button"
                  onClick={() => handleClickMesa(mesa)}
                  className={`w-full rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 transition-all duration-150 min-h-[58px]
                    ${ocupada
                      ? seleccionada
                        ? "border-amber-500 bg-amber-500/25 ring-2 ring-amber-400/40 shadow-md"
                        : "border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/20 hover:border-amber-500/80"
                      : seleccionada
                        ? "border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-400/30"
                        : "border-border bg-card hover:bg-muted/60 hover:border-border"
                    }`}
                >
                  {/* Número grande */}
                  <span className={`text-base font-extrabold leading-none ${ocupada ? "text-amber-700 dark:text-amber-300" : "text-foreground/80"}`}>
                    {numeroMesa}
                  </span>
                  {/* Nombre personalizado o nombre base */}
                  {nombrePersonalizado ? (
                    <span className="text-[9px] font-semibold leading-tight truncate w-full text-center text-foreground/70">
                      {nombrePersonalizado}
                    </span>
                  ) : (
                    <span className="text-[9px] leading-tight text-muted-foreground/40 text-center">
                      {ocupada ? "Sin nombre" : "Libre"}
                    </span>
                  )}
                  {/* Total si ocupada */}
                  {ocupada && pedido && (
                    <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 leading-tight">
                      {formatCurrency(pedido.total)}
                    </span>
                  )}
                </button>
              )}

              {/* ── Panel edición de nombre ── */}
              {estaEditando && (
                <div
                  className="rounded-lg bg-card border-2 border-primary/50 p-1.5 flex flex-col gap-1 shadow-xl min-h-[58px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-center text-[10px] font-bold text-foreground/60">{nombreBase}</p>
                  <input
                    autoFocus
                    type="text"
                    value={nombreEdicion}
                    onChange={(e) => setNombreEdicion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") guardarNombre(mesa);
                      if (e.key === "Escape") setEditandoMesaId(null);
                    }}
                    placeholder="Nombre..."
                    className="w-full rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => guardarNombre(mesa)}
                      disabled={guardandoNombre}
                      className="flex-1 rounded bg-primary text-primary-foreground text-[9px] font-semibold py-0.5 hover:opacity-90 disabled:opacity-50"
                    >
                      {guardandoNombre ? "…" : "OK"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoMesaId(null)}
                      className="flex-1 rounded bg-muted border border-border text-[9px] font-semibold py-0.5 hover:bg-muted/80"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* ── Confirmación eliminar ── */}
              {estaConfirmando && (
                <div
                  className="rounded-lg bg-card border-2 border-destructive/50 p-1.5 flex flex-col gap-1 shadow-xl min-h-[58px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-center text-[10px] font-semibold text-destructive leading-tight">¿Eliminar {nombreBase}?</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => eliminarMesa(mesa)}
                      disabled={!!estaEliminando}
                      className="flex-1 rounded bg-destructive text-destructive-foreground text-[9px] font-semibold py-0.5 hover:opacity-90 disabled:opacity-50"
                    >
                      {estaEliminando ? "…" : "Sí"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoEliminarId(null)}
                      className="flex-1 rounded bg-muted border border-border text-[9px] font-semibold py-0.5 hover:bg-muted/80"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* ── Botones de acción (lápiz + basura) ── */}
              {!estaEditando && !estaConfirmando && (
                <div className="absolute top-0.5 right-0.5 flex gap-0.5 z-10">
                  {/* Lápiz: editar nombre */}
                  <button
                    type="button"
                    title="Renombrar"
                    onClick={(e) => abrirEdicion(e, mesa)}
                    className={`h-4 w-4 rounded flex items-center justify-center transition-colors
                      ${ocupada
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/40"
                        : "bg-muted/70 text-muted-foreground/50 hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {/* Basura: eliminar mesa (solo si está libre) */}
                  {!ocupada && (
                    <button
                      type="button"
                      title="Eliminar mesa"
                      onClick={(e) => { e.stopPropagation(); setEditandoMesaId(null); setConfirmandoEliminarId(mesa.id); }}
                      className="h-4 w-4 rounded flex items-center justify-center bg-muted/70 text-muted-foreground/40 hover:bg-destructive/15 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Cuentas abiertas sin mesa */}
        {cuentasAbiertas.map((cuenta) => {
          const seleccionada = mesaSeleccionada?.id === cuenta.id;
          const estaEditandoCuenta = editandoMesaId === cuenta.id;
          return (
            <div key={cuenta.id} className="relative">
              {/* ── Tarjeta principal ── */}
              {!estaEditandoCuenta && (
                <button
                  type="button"
                  onClick={() => setSelectedMesaId(cuenta.id)}
                  className={[
                    "w-full rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 transition-all duration-150 min-h-[58px]",
                    seleccionada
                      ? "border-indigo-500 bg-indigo-500/25 ring-2 ring-indigo-400/40 shadow-md"
                      : "border-indigo-400/60 bg-indigo-500/15 hover:bg-indigo-500/20 hover:border-indigo-500/80",
                  ].join(" ")}
                >
                  <ClipboardList className={`h-3.5 w-3.5 ${seleccionada ? "text-indigo-700 dark:text-indigo-300" : "text-indigo-500 dark:text-indigo-400"}`} />
                  <span className={`text-[9px] font-semibold leading-tight truncate w-full text-center ${seleccionada ? "text-indigo-700 dark:text-indigo-300" : "text-indigo-600 dark:text-indigo-400"}`}>
                    {cuenta.nombreCuenta || "Cuenta"}
                  </span>
                  <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 leading-tight">
                    {formatCurrency(cuenta.total)}
                  </span>
                </button>
              )}

              {/* ── Panel edición de nombre ── */}
              {estaEditandoCuenta && (
                <div
                  className="rounded-lg bg-card border-2 border-indigo-500/50 p-1.5 flex flex-col gap-1 shadow-xl min-h-[58px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    type="text"
                    value={nombreEdicion}
                    onChange={(e) => setNombreEdicion(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        setGuardandoNombre(true);
                        try {
                          await fetch(`/api/restaurante/pedidos/${cuenta.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ nombreCuenta: nombreEdicion.trim() || null }),
                          });
                          await recargarOperativo(cuenta.id);
                          toast({ title: "Nombre guardado" });
                        } catch {
                          toast({ title: "Error al guardar", variant: "destructive" });
                        } finally {
                          setGuardandoNombre(false);
                          setEditandoMesaId(null);
                        }
                      }
                      if (e.key === "Escape") setEditandoMesaId(null);
                    }}
                    placeholder="Nombre..."
                    className="w-full rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500/60"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setGuardandoNombre(true);
                        try {
                          await fetch(`/api/restaurante/pedidos/${cuenta.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ nombreCuenta: nombreEdicion.trim() || null }),
                          });
                          await recargarOperativo(cuenta.id);
                          toast({ title: "Nombre guardado" });
                        } catch {
                          toast({ title: "Error al guardar", variant: "destructive" });
                        } finally {
                          setGuardandoNombre(false);
                          setEditandoMesaId(null);
                        }
                      }}
                      disabled={guardandoNombre}
                      className="flex-1 rounded bg-indigo-600 text-white text-[9px] font-semibold py-0.5 hover:opacity-90 disabled:opacity-50"
                    >
                      {guardandoNombre ? "…" : "OK"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoMesaId(null)}
                      className="flex-1 rounded bg-muted border border-border text-[9px] font-semibold py-0.5 hover:bg-muted/80"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* ── Botón lápiz ── */}
              {!estaEditandoCuenta && (
                <div className="absolute top-0.5 right-0.5 z-10">
                  <button
                    type="button"
                    title="Renombrar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditandoMesaId(cuenta.id);
                      setNombreEdicion(cuenta.nombreCuenta || "");
                    }}
                    className="h-4 w-4 rounded flex items-center justify-center bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/40 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Botón nueva mesa */}
        <button
          type="button"
          onClick={abrirModalCrear}
          disabled={creandoLocal || creandoConNombre}
          className="rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 min-h-[58px] text-muted-foreground/60 hover:border-primary/40 hover:text-foreground hover:bg-muted/40 transition-all disabled:opacity-50"
        >
          {creandoLocal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="text-[9px] font-medium leading-tight text-center">Nueva<br/>mesa</span>
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-amber-500/30 border border-amber-400/60" />
          <span className="text-[11px] text-muted-foreground/70">Ocupada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-card border border-border" />
          <span className="text-[11px] text-muted-foreground/70">Libre</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/15 border border-emerald-500/50" />
          <span className="text-[11px] text-muted-foreground/70">Seleccionada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-indigo-500/15 border border-indigo-400/60" />
          <span className="text-[11px] text-muted-foreground/70">Cuenta abierta</span>
        </div>
      </div>
    </div>
  );
}
