export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function tiempoTranscurrido(fechaSolicitud: string): string {
  const segundos = Math.floor(
    (Date.now() - new Date(fechaSolicitud).getTime()) / 1000
  );
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos}m`;
  return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
}

export function getTimerStyle(fechaSolicitud: string): string {
  const minutos = Math.floor(
    (Date.now() - new Date(fechaSolicitud).getTime()) / 60_000
  );
  if (minutos >= 15) return "text-red-700 dark:text-red-400 bg-destructive/10 border border-destructive/30";
  if (minutos >= 8) return "text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30";
  return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30";
}

export function getBorderEstado(estadoPreparacion: string): string {
  if (estadoPreparacion === "EN_PREPARACION")
    return "border-l-4 border-l-amber-400 border border-border";
  if (estadoPreparacion === "LISTO")
    return "border-l-4 border-l-emerald-400 border border-border bg-emerald-500/10/30";
  return "border border-border";
}

export function extraerNumeroMesa(nombre: string): string {
  const match = nombre.match(/\d+/);
  return match ? match[0] : nombre;
}
