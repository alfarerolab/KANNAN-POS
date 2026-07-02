import type { EstacionPreparacionRestaurante } from "@/lib/prisma-types";

import {
  getEstacionPreparacionLabel,
  getEstadoPreparacionLabel,
} from "@/lib/restaurante-shared";
import type { RestaurantePreparacionItem } from "@/types/restaurante";

interface ComandaPreparacionProps {
  estacion: EstacionPreparacionRestaurante;
  items: RestaurantePreparacionItem[];
  nombreEmpresa?: string;
}

export function ComandaPreparacion({
  estacion,
  items,
  nombreEmpresa = "Restaurante",
}: ComandaPreparacionProps) {
  const grupos = items.reduce<Record<string, RestaurantePreparacionItem[]>>(
    (acc, item) => {
      const key = `${item.pedidoId}-${item.mesas.join("+")}`;
      acc[key] = [...(acc[key] || []), item];
      return acc;
    },
    {}
  );

  return (
    <div className="mx-auto w-full max-w-2xl bg-card dark:bg-background p-8 text-foreground">
      <div className="border-b-2 border-dashed border-border pb-4 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Comanda
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{nombreEmpresa}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {getEstacionPreparacionLabel(estacion)} • {new Date().toLocaleString("es-CO")}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {Object.entries(grupos).map(([key, group]) => (
          <div key={key} className="rounded-2xl border border-border p-4">
            <div className="border-b border-dashed border-border pb-3">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Mesa
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {group[0]?.mesas.join(" + ")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {group[0]?.nombreCuenta || "Cuenta abierta"}
                {group[0]?.cliente ? ` • ${group[0].cliente}` : ""}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {group.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-muted/50 px-4 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.cantidad} x {item.nombreProducto}
                      </p>
                      {item.notas ? (
                        <p className="mt-1 text-xs text-muted-foreground">{item.notas}</p>
                      ) : null}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {getEstadoPreparacionLabel(item.estadoPreparacion)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground/70">
        Documento interno para preparación
      </p>
    </div>
  );
}
