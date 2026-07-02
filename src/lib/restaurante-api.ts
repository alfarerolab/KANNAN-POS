import type {
  RestauranteAddItemPayload,
  RestauranteFacturarPayload,
  RestauranteMesa,
  RestauranteMesaPayload,
  RestauranteMoverMesaPayload,
  RestaurantePreparacionItem,
  RestaurantePedido,
  RestaurantePedidoPayload,
  RestauranteReporteResumen,
  RestauranteUpdateItemPayload,
} from "@/types/restaurante";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "Ocurrió un error inesperado";

    try {
      const body = await response.json();
      errorMessage = body.error || body.message || errorMessage;
    } catch {
      const text = await response.text().catch(() => "");
      if (text) {
        errorMessage = text;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const restauranteApi = {
  async obtenerMesas() {
    const response = await fetch("/api/restaurante/mesas", {
      cache: "no-store",
    });
    return parseResponse<RestauranteMesa[]>(response);
  },

  async crearMesa(payload: RestauranteMesaPayload) {
    const response = await fetch("/api/restaurante/mesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<RestauranteMesa>(response);
  },

  async actualizarMesa(id: string, payload: Partial<RestauranteMesaPayload>) {
    const response = await fetch(`/api/restaurante/mesas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<RestauranteMesa>(response);
  },

  async desactivarMesa(id: string) {
    const response = await fetch(`/api/restaurante/mesas/${id}`, {
      method: "DELETE",
    });
    return parseResponse<RestauranteMesa>(response);
  },

  async abrirPedido(payload: RestaurantePedidoPayload) {
    const response = await fetch("/api/restaurante/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<RestaurantePedido>(response);
  },

  async obtenerPedido(id: string) {
    const response = await fetch(`/api/restaurante/pedidos/${id}`, {
      cache: "no-store",
    });
    return parseResponse<RestaurantePedido>(response);
  },

  async actualizarPedido(id: string, payload: Partial<RestaurantePedidoPayload>) {
    const response = await fetch(`/api/restaurante/pedidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<RestaurantePedido>(response);
  },

  async agregarItem(id: string, payload: RestauranteAddItemPayload) {
    const response = await fetch(`/api/restaurante/pedidos/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<RestaurantePedido>(response);
  },

  async obtenerTurnoActivo() {
    const response = await fetch("/api/restaurante/caja/turno", {
      cache: "no-store",
    });
    return parseResponse<{
      turno: {
        id: string;
        abiertaEn: string;
        cerradaEn: string | null;
        notas: string | null;
        usuario: { id: string; nombre: string };
      } | null;
    }>(response);
  },
 
  async abrirTurno(notas?: string) {
    const response = await fetch("/api/restaurante/caja/turno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas }),
    });
    return parseResponse<{
      turno: {
        id: string;
        abiertaEn: string;
        cerradaEn: string | null;
        notas: string | null;
        usuario: { id: string; nombre: string };
      };
    }>(response);
  },
 
  async cerrarTurno() {
    const response = await fetch("/api/restaurante/caja/turno", {
      method: "PATCH",
    });
    return parseResponse<{
      turno: {
        id: string;
        abiertaEn: string;
        cerradaEn: string | null;
        notas: string | null;
        usuario: { id: string; nombre: string };
      };
    }>(response);
  },

  async actualizarItem(
    pedidoId: string,
    itemId: string,
    payload: RestauranteUpdateItemPayload
  ) {
    const response = await fetch(
      `/api/restaurante/pedidos/${pedidoId}/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return parseResponse<RestaurantePedido>(response);
  },

  async eliminarItem(pedidoId: string, itemId: string) {
    const response = await fetch(
      `/api/restaurante/pedidos/${pedidoId}/items/${itemId}`,
      {
        method: "DELETE",
      }
    );
    return parseResponse<RestaurantePedido>(response);
  },

  async unirMesas(pedidoId: string, mesaIds: string[]) {
    const response = await fetch(
      `/api/restaurante/pedidos/${pedidoId}/unir-mesas`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaIds }),
      }
    );
    return parseResponse<RestaurantePedido>(response);
  },

  // ── NUEVO: desunir una mesa específica de un pedido ──────────────────────────
  // El backend debe implementar: DELETE /api/restaurante/pedidos/:pedidoId/mesas/:mesaId
  // Efecto esperado: quita la mesa del pedido y la pone en estado LIBRE
  async desunirMesa(pedidoId: string, mesaId: string) {
    const response = await fetch(
      `/api/restaurante/pedidos/${pedidoId}/mesas/${mesaId}`,
      {
        method: "DELETE",
      }
    );
    return parseResponse<RestaurantePedido>(response);
  },

  // ── NUEVO: cancelar un pedido sin ítems para liberar la mesa ─────────────────
  // El backend debe implementar: POST /api/restaurante/pedidos/:pedidoId/cancelar
  // Efecto esperado: elimina el pedido y pone todas sus mesas en estado LIBRE
  async cancelarPedido(pedidoId: string) {
    const response = await fetch(
      `/api/restaurante/pedidos/${pedidoId}/cancelar`,
      {
        method: "POST",
      }
    );
    return parseResponse<{ ok: boolean }>(response);
  },

  async moverMesa(pedidoId: string, payload: RestauranteMoverMesaPayload) {
    const response = await fetch(
      `/api/restaurante/pedidos/${pedidoId}/mover-mesa`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return parseResponse<RestaurantePedido>(response);
  },

  async obtenerPreparacion(params?: {
    estacion?: string;
    estado?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.estacion) {
      searchParams.set("estacion", params.estacion);
    }
    if (params?.estado) {
      searchParams.set("estado", params.estado);
    }

    const query = searchParams.toString();
    const response = await fetch(
      `/api/restaurante/preparacion${query ? `?${query}` : ""}`,
      {
        cache: "no-store",
      }
    );
    return parseResponse<RestaurantePreparacionItem[]>(response);
  },

 async obtenerReporteResumen(desde?: string) {
    const url = desde
      ? `/api/restaurante/reportes/resumen?desde=${encodeURIComponent(desde)}`
      : "/api/restaurante/reportes/resumen";
    const response = await fetch(url, { cache: "no-store" });
    return parseResponse<RestauranteReporteResumen>(response);
  },

  async facturarPedido(id: string, payload: RestauranteFacturarPayload) {
    const response = await fetch(`/api/restaurante/pedidos/${id}/facturar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<{
      pedido: RestaurantePedido;
      venta: {
        id: string;
        subtotal: number;
        impuesto: number;
        total: number;
        createdAt: string;
        metodoPago: string;
        clienteId?: string | null;
      };
    }>(response);
  },

  async dividirPedidoItems(id: string, payload: { items: { itemId: string; cantidadAExtraer: number }[], metodoPago: string, clienteId?: string | null }) {
    const response = await fetch(`/api/restaurante/pedidos/${id}/dividir-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<{
      pedido: RestaurantePedido;
      venta: {
        id: string;
        subtotal: number;
        impuesto: number;
        total: number;
        createdAt: string;
        metodoPago: string;
        clienteId?: string | null;
      };
    }>(response);
  },

  async pagoFraccionado(id: string, payload: { pagosMultiples: { metodoPago: string; monto: number }[], clienteId?: string | null }) {
    const response = await fetch(`/api/restaurante/pedidos/${id}/pago-fraccionado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<{
      pedido: RestaurantePedido;
      venta: {
        id: string;
        subtotal: number;
        impuesto: number;
        total: number;
        createdAt: string;
        metodoPago: string;
        clienteId?: string | null;
      };
    }>(response);
  },
};