import type { RestaurantePedido } from "@/types/restaurante";

interface CuentaConsumoProps {
  pedido: RestaurantePedido;
  nombreEmpresa?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function CuentaConsumo({
  pedido,
  nombreEmpresa = "Restaurante",
}: CuentaConsumoProps) {
  const mesas = pedido.mesas.map((mesa) => mesa.mesa.nombre).join(" + ");
  const totalItems = pedido.items.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <div className="mx-auto w-full max-w-xl bg-card dark:bg-background p-8 text-foreground">
      <div className="border-b-2 border-dashed border-border pb-4 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Cuenta de consumo
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{nombreEmpresa}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generada {new Date().toLocaleString("es-CO")}
        </p>
      </div>

      <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Cuenta</p>
          <p className="font-semibold">{pedido.nombreCuenta || `Mesa ${mesas}`}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Mesas</p>
          <p className="font-semibold">{mesas}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Comensales</p>
          <p className="font-semibold">{pedido.comensales}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cliente</p>
          <p className="font-semibold">{pedido.cliente?.nombre || "Consumidor final"}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Producto</span>
          <span>Cant.</span>
          <span>Total</span>
        </div>

        <div className="divide-y divide-slate-200">
          {pedido.items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{item.nombreProducto}</p>
                {item.notas ? (
                  <p className="text-xs text-muted-foreground">{item.notas}</p>
                ) : null}
              </div>
              <span className="font-medium text-foreground/80">{item.cantidad}</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-muted/50 p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Productos</span>
          <span>{totalItems}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(pedido.subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>Impuestos</span>
          <span>{formatCurrency(pedido.impuesto)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-lg font-semibold text-slate-950">
          <span>Total consumo</span>
          <span>{formatCurrency(pedido.total)}</span>
        </div>
      </div>

      {pedido.notas ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Notas</p>
          <p className="mt-1">{pedido.notas}</p>
        </div>
      ) : null}

      <p className="mt-6 text-center text-xs text-muted-foreground/70">
        Documento informativo para revisión de consumo
      </p>
    </div>
  );
}
