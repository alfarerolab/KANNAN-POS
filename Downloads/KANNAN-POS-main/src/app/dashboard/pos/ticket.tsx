"use client";

import { forwardRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ItemCarrito } from "@/types";
import { calcularIVAProducto } from "@/utils/iva";

interface PagoDetalle {
  metodoPago: string;
  monto: number;
  referencia?: string;
}

interface PropiedadesTicket {
  idVenta: string;
  fecha: Date;
  items: ItemCarrito[];
  subtotal: number;
  impuesto: number;
  total: number;
  metodoPago: string;
  nombreCliente?: string;
  empresaNombre?: string;
  empresaDireccion?: string;
  empresaTelefono?: string;
  empresaEmail?: string;
  empresaNIT?: string;
  empresaLogo?: string | null;
  mostrarLogo?: boolean;
  formatoPapel?: "58mm" | "80mm";
  // Nueva prop para pagos múltiples
  pagosMultiples?: PagoDetalle[];
}

// Métodos de pago para mostrar nombres legibles
const METODOS_PAGO: { [key: string]: string } = {
  "EFECTIVO": "Efectivo",
  "TARJETA_CREDITO": "Tarjeta de Crédito",
  "TARJETA_DEBITO": "Tarjeta de Débito",
  "TRANSFERENCIA": "Transferencia Bancaria",
  "NEQUI": "Transferencia (Nequi)",
  "DAVIPLATA": "Transferencia (Daviplata)",
  "OTRO": "Otro"
};

export const Ticket = forwardRef<HTMLDivElement, PropiedadesTicket>(
  ({
    idVenta,
    fecha,
    items,
    subtotal,
    impuesto,
    total,
    metodoPago,
    nombreCliente,
    empresaNombre = "Tu Empresa",
    empresaDireccion,
    empresaTelefono,
    empresaEmail,
    empresaNIT,
    empresaLogo,
    mostrarLogo = true,
    formatoPapel = "80mm",
    pagosMultiples
  }, ref) => {
    
    const [logoError, setLogoError] = useState(false);
    const esPagoMultiple = pagosMultiples && pagosMultiples.length > 1;

    // Filtrar productos de cortesía (no se muestran en el ticket impreso)
    const itemsImprimibles = items.filter(item => {
      const p = item.producto;
      return (
        p.tipoVenta !== 'CORTESIA' &&
        Number(p.precio) > 0
      );
    });

    const formatearFecha = (date: Date) => {
      return new Date(date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    const agruparIVA = () => {
      const ivasPorTarifa: { [key: string]: number } = {};

      itemsImprimibles.forEach(item => {
        const producto = item.producto;
        const tarifaIva = Number(producto.tarifaIva || 0);

        if (!producto.esExentoIva && tarifaIva > 0) {
          const calculoIva = calcularIVAProducto(item.subtotal, {
            id: producto.id,
            precio: Number(producto.precio),
            tieneIva: !producto.esExentoIva,
            tarifaIva: tarifaIva,
            incluyeIva: producto.incluyeIva || false,
            tipoVenta: producto.tipoVenta
          });

          const tarifaKey = `${tarifaIva}%`;
          ivasPorTarifa[tarifaKey] = (ivasPorTarifa[tarifaKey] || 0) + calculoIva.valorIva;
        }
      });

      return ivasPorTarifa;
    };

    const ivasAgrupados = agruparIVA();
    const is58 = formatoPapel === "58mm";
    const anchoTicket = formatoPapel === "58mm" ? "58mm" : "80mm";
    const tieneLogoValido = mostrarLogo && empresaLogo && !logoError;

    // Tamanos responsivos segun formato de papel
    const sizes = {
      base: is58 ? "8px" : "11px",
      title: is58 ? "11px" : "14px",
      small: is58 ? "7.5px" : "9px",
      xsmall: is58 ? "7px" : "8px",
      large: is58 ? "11px" : "14px",
      gridCols: is58 ? "1fr 15% 20%" : "1fr 15% 28%",
    };

    return (
      <div
        ref={ref}
        className="bg-card text-black bg-transparent"
        style={{
          width: "100%",
          maxWidth: is58 ? "58mm" : "100%",
          margin: "0 auto",
          padding: is58 ? "0" : "1mm 2mm",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: sizes.base,
          fontWeight: "bold",
          lineHeight: "1.3",
          color: "#000",
          boxSizing: "border-box"
        }}
      >
        {/* ============= ENCABEZADO EMPRESA ============= */}
        <div style={{
          textAlign: "center",
          borderBottom: "2px solid #000",
          paddingBottom: "8px",
          marginBottom: "10px"
        }}>
          {/* Logo de la empresa */}
          {tieneLogoValido && (
            <div style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "6px"
            }}>
              <div style={{
                width: formatoPapel === "58mm" ? "25mm" : "35mm",
                height: formatoPapel === "58mm" ? "18mm" : "22mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fff",
                border: "1px solid #000",
                borderRadius: "3px",
                padding: "3px",
                overflow: "hidden"
              }}>
                <img
                  src={empresaLogo}
                  alt={`Logo ${empresaNombre}`}
                  onError={() => setLogoError(true)}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    display: "block"
                  }}
                />
              </div>
            </div>
          )}

          {/* Nombre de la empresa */}
          <div style={{
            fontSize: tieneLogoValido ? sizes.title : (is58 ? "14px" : "16px"),
            fontWeight: "bold",
            marginBottom: "4px",
            letterSpacing: "0.5px"
          }}>
            {empresaNombre.toUpperCase()}
          </div>
          
          {/* NIT */}
          {empresaNIT && (
            <div style={{ 
              fontSize: sizes.small, 
              marginBottom: "3px",
              fontWeight: "bold",
              letterSpacing: "0.3px"
            }}>
              NIT: {empresaNIT}
            </div>
          )}
          
          {/* Dirección */}
          {empresaDireccion && (
            <div style={{ fontSize: sizes.small, marginBottom: "2px" }}>
              {empresaDireccion}
            </div>
          )}
          
          {/* Teléfono y Email */}
          <div style={{ fontSize: sizes.small }}>
            {empresaTelefono && <span>Tel: {empresaTelefono}</span>}
            {empresaTelefono && empresaEmail && <span> | </span>}
            {empresaEmail && <span>{empresaEmail}</span>}
          </div>
        </div>

        {/* ============= INFO DEL TICKET ============= */}
        <div style={{
          borderBottom: "1px dashed #000",
          paddingBottom: "8px",
          marginBottom: "10px"
        }}>
          <div style={{
            textAlign: "center",
            fontSize: sizes.large,
            fontWeight: "bold",
            marginBottom: "6px",
            letterSpacing: "1px"
          }}>
            TICKET DE VENTA
          </div>

          <table style={{ width: "100%", fontSize: sizes.small, tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: "2px" }}>No. Ticket:</td>
                <td style={{ textAlign: "right", fontWeight: "bold", paddingBottom: "2px", wordBreak: "break-all" }}>
                  {idVenta.slice(0, 15).toUpperCase()}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "2px" }}>Fecha:</td>
                <td style={{ textAlign: "right", paddingBottom: "2px" }}>
                  {formatearFecha(fecha)}
                </td>
              </tr>
              {nombreCliente && (
                <tr>
                  <td style={{ paddingBottom: "2px" }}>Cliente:</td>
                  <td style={{ textAlign: "right", fontWeight: "bold", paddingBottom: "2px" }}>
                    {nombreCliente}
                  </td>
                </tr>
              )}
              
              {/* Mostrar método de pago único o múltiple */}
              {!esPagoMultiple ? (
                <tr>
                  <td style={{ paddingBottom: "2px" }}>Pago:</td>
                  <td style={{ textAlign: "right", paddingBottom: "2px" }}>
                    {METODOS_PAGO[metodoPago] || metodoPago}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={2} style={{ paddingTop: "4px" }}>
                    <div style={{
                      fontSize: sizes.small,
                      fontWeight: "bold",
                      marginBottom: "4px"
                    }}>
                      PAGO MIXTO:
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Detalle de pagos múltiples */}
          {esPagoMultiple && (
            <div style={{
              marginTop: "4px",
              paddingTop: "4px",
              borderTop: "1px dotted #000"
            }}>
              {pagosMultiples.map((pago, index) => (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: sizes.xsmall,
                  marginBottom: "3px",
                  paddingLeft: "4px"
                }}>
                  <div>
                    <span style={{ fontWeight: "bold" }}>
                      • {METODOS_PAGO[pago.metodoPago] || pago.metodoPago}
                    </span>
                    {pago.referencia && (
                      <span style={{ 
                        marginLeft: "4px",
                        color: "#000",
                        fontSize: sizes.xsmall
                      }}>
                        (Ref: {pago.referencia})
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: "bold" }}>
                    {formatCurrency(pago.monto)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============= PRODUCTOS ============= */}
        <div style={{
          borderBottom: "1px dashed #000",
          paddingBottom: "8px",
          marginBottom: "10px"
        }}>
          {/* Encabezado de tabla */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: sizes.small,
            fontWeight: "900", // Extra bold
            borderBottom: "1px solid #000",
            paddingBottom: "4px",
            marginBottom: "6px"
          }}>
            <div style={{ flex: 1 }}>PRODUCTO</div>
            <div style={{ width: "20%", textAlign: "center" }}>CANT</div>
            <div style={{ width: is58 ? "38%" : "30%", textAlign: "right" }}>TOTAL</div>
          </div>

          {/* Items */}
          {itemsImprimibles.map((item, index) => {
            const producto = item.producto;
            const tarifaIva = Number(producto.tarifaIva || 0);
            const tieneIva = !producto.esExentoIva && tarifaIva > 0;
            const precioUnitario = Number(producto.precio);

            return (
              <div key={index} style={{ marginBottom: "8px" }}>
                {/* Línea principal */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: sizes.small,
                  fontWeight: "900", // Extra bold
                  alignItems: "start"
                }}>
                  <div style={{ 
                    flex: 1,
                    wordBreak: "break-word",
                    fontWeight: "900",
                    paddingRight: "2px"
                  }}>
                    {producto.nombre}
                  </div>
                  <div style={{ width: "20%", textAlign: "center", whiteSpace: "nowrap" }}>
                    {item.cantidad}
                  </div>
                  <div style={{ width: is58 ? "38%" : "30%", textAlign: "right", fontWeight: "900", whiteSpace: "nowrap", letterSpacing: "-0.5px" }}>
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>

                {/* Línea de precio unitario e IVA */}
                <div style={{
                  fontSize: sizes.xsmall,
                  color: "#000",
                  marginTop: "2px",
                  paddingLeft: "2px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap"
                }}>
                  <span>@ {formatCurrency(precioUnitario)}</span>
                  {tieneIva && (
                    <span style={{ marginLeft: "8px", fontWeight: "900" }}>
                      • IVA {tarifaIva}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ============= TOTALES ============= */}
        <div style={{ marginBottom: "10px" }}>
          <table style={{ width: "100%", fontSize: sizes.base, tableLayout: "fixed" }}>
            <tbody>
              {/* Subtotal */}
              <tr>
                <td style={{ paddingBottom: "3px" }}>Subtotal:</td>
                <td style={{ textAlign: "right", paddingBottom: "3px", whiteSpace: "nowrap" }}>
                  {formatCurrency(subtotal)}
                </td>
              </tr>

              {/* IVA desglosado */}
              {Object.entries(ivasAgrupados).map(([tarifa, valor]) => (
                <tr key={tarifa}>
                  <td style={{ paddingBottom: "3px", paddingLeft: "8px", fontSize: sizes.small }}>
                    IVA {tarifa}:
                  </td>
                  <td style={{ textAlign: "right", paddingBottom: "3px", fontSize: sizes.small, whiteSpace: "nowrap" }}>
                    {formatCurrency(valor)}
                  </td>
                </tr>
              ))}

              {/* IVA total si no hay desglose */}
              {impuesto > 0 && Object.entries(ivasAgrupados).length === 0 && (
                <tr>
                  <td style={{ paddingBottom: "3px" }}>IVA:</td>
                  <td style={{ textAlign: "right", paddingBottom: "3px", whiteSpace: "nowrap" }}>
                    {formatCurrency(impuesto)}
                  </td>
                </tr>
              )}

              {/* Línea divisoria antes del total */}
              <tr>
                <td colSpan={2} style={{ paddingTop: "4px", paddingBottom: "4px" }}>
                  <div style={{ borderTop: "2px solid #000" }}></div>
                </td>
              </tr>

              {/* TOTAL */}
              <tr style={{ fontSize: sizes.large, fontWeight: "bold" }}>
                <td style={{ paddingTop: "4px" }}>TOTAL:</td>
                <td style={{ textAlign: "right", paddingTop: "4px", whiteSpace: "nowrap" }}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ============= PIE DE PÁGINA ============= */}
        <div style={{
          borderTop: "1px dashed #000",
          paddingTop: "8px",
          paddingBottom: "12mm",
          textAlign: "center",
          fontSize: sizes.small
        }}>
          <div style={{
            fontSize: sizes.base,
            fontWeight: "bold",
            marginBottom: "6px"
          }}>
            ¡GRACIAS POR SU COMPRA!
          </div>
          
          <div style={{ marginBottom: "4px", color: "#000" }}>
            Este documento no tiene validez fiscal
          </div>
          
          <div style={{ marginBottom: "4px", color: "#000" }}>
            Conserve este ticket para cambios o devoluciones
          </div>

          <div style={{
            marginTop: "8px",
            paddingTop: "6px",
            borderTop: "1px solid #000",
            fontSize: sizes.xsmall,
            color: "#000"
          }}>
            Generado: {new Date().toLocaleString('es-CO')}
          </div>
        </div>
      </div>
    );
  }
);

Ticket.displayName = "Ticket";