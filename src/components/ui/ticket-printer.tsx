"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Printer, Download, Eye, Settings, ImageIcon, Zap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Ticket } from "@/app/dashboard/pos/ticket";

interface TicketData {
  venta: any;
  empresa: any;
  cliente?: any;
  items: any[];
  subtotal: number;
  impuesto: number;
  total: number;
  metodoPago: string;
  terminal?: any;
  usuario?: any;
}

interface TicketPrinterProps {
  ticketData: TicketData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrintComplete?: () => void;
  /** Si true, imprime directamente al abrir sin mostrar preview */
  autoImprimir?: boolean;
  /** Si true, abre el cajero automáticamente al imprimir (solo para EFECTIVO) */
  abrirCajero?: boolean;
}

const FORMATOS_PAPEL = [
  { id: "58mm", nombre: "58mm (Estándar)", ancho: 220 },
  { id: "80mm", nombre: "80mm (Ancho)", ancho: 300 },
];

export function TicketPrinter({ ticketData, open, onOpenChange, onPrintComplete, autoImprimir = false, abrirCajero = false }: TicketPrinterProps) {
  const { toast } = useToast();
  const { configuracion, configNegocio, obtenerTema } = useConfiguracionEmpresa();
  const ticketRef = useRef<HTMLDivElement>(null);
  const hasAutoprinted = useRef(false);

  const [formatoPapel, setFormatoPapel] = useState<"58mm" | "80mm">("80mm");
  const [incluirLogo, setIncluirLogo] = useState(true);
  const [incluirCodigoBarras, setIncluirCodigoBarras] = useState(true);
  const [impresionAutomatica, setImpresionAutomatica] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(true);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(true);
  const [modoRapido, setModoRapido] = useState(true); // Nuevo: modo impresión rápida

  const tema = obtenerTema();
  const formato = FORMATOS_PAPEL.find(f => f.id === formatoPapel);

  // Cargar datos de la empresa incluyendo el logo
  useEffect(() => {
    const cargarDatosEmpresa = async () => {
      try {
        setCargandoEmpresa(true);
        const response = await fetch('/api/empresa');
        if (response.ok) {
          const data = await response.json();
          setEmpresaData(data);
          
          // Si no hay logo, deshabilitar la opción por defecto
          if (!data.logo && !data.logoSecundario) {
            setIncluirLogo(false);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos de empresa:', error);
      } finally {
        setCargandoEmpresa(false);
      }
    };

    if (open) {
      cargarDatosEmpresa();
    }
  }, [open]);

  // Configurar impresión automática desde la configuración del sistema
  useEffect(() => {
    if (configuracion?.configuracionPos?.impresionAutomatica) {
      setImpresionAutomatica(true);
    }
    if (configuracion?.configuracionPos?.formatoTicket) {
      setFormatoPapel(configuracion.configuracionPos.formatoTicket as "58mm" | "80mm");
    }
    if (configuracion?.configuracionPos?.mostrarLogos !== undefined) {
      setIncluirLogo(configuracion.configuracionPos.mostrarLogos);
    }
  }, [configuracion]);

  // ─── APERTURA DE CAJERO (ESC/POS via iframe) ───────────────────────────────
  const abrirCajeroCaja = useCallback(() => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      // Comando ESC/POS p 0 — pulso estándar para abrir cajero
      // Compatible con la mayoría de impresoras térmicas POS (Epson, Star, Bixolon…)
      doc.write(`<!DOCTYPE html><html><head>
        <style>@page{size:auto;margin:0;}body{margin:0;padding:0;}</style>
      </head><body>
        <script>
          document.write("\\x1B\\x70\\x00\\x19\\xFA");
          window.onload = function() {
            setTimeout(function() { window.print(); }, 80);
            setTimeout(function() { try { window.close(); } catch(e){} }, 900);
          };
        <\/script>
      </body></html>`);
      doc.close();
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 2000);
    } catch (e) {
      console.warn("No se pudo abrir el cajero:", e);
    }
  }, []);

  // ─── IMPRESIÓN RÁPIDA VIA IFRAME (sin html2canvas) ─────────────────────────
  const imprimirRapido = useCallback(async () => {
    if (!ticketRef.current) return;

    try {
      setImprimiendo(true);

      // Removed double print job from opening cash drawer. If needed, this must be handled natively or via WebUSB, not via a second iframe.print()

      // Clonar el contenido HTML del ticket
      const ticketHTML = ticketRef.current.outerHTML;
      const ticketWidth = formatoPapel === "58mm" ? "58mm" : "80mm";

      // Crear iframe oculto para impresión directa
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("No se pudo acceder al iframe para imprimir");
      }

      // Escribir el HTML del ticket con estilos de impresión optimizados
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Ticket - ${ticketData.venta?.id?.slice(0, 8) || 'venta'}</title>
            <style>
              /* ── Reset total ── */
              * {
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }

              /* ── Página sin márgenes, ancho exacto del papel ── */
              @page {
                margin: 0mm !important;
                size: ${ticketWidth} auto;
              }

              /* ── html y body: ancho exacto del papel, sin márgenes ── */
              html, body {
                width: ${ticketWidth} !important;
                max-width: ${ticketWidth} !important;
                min-width: ${ticketWidth} !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                font-family: 'Courier New', Courier, monospace !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* ── Todos los contenedores hijos llenan el ancho completo ── */
              body * {
                max-width: 100% !important;
                min-width: 0 !important;
                color: #000 !important;
                font-family: 'Courier New', Courier, monospace !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* ── El div raíz del ticket llena todo el ancho del papel ── */
              body > div,
              body > div > div {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding-left: 2mm !important;
                padding-right: 2mm !important;
              }

              /* ── Evitar que textos largos (precios, nombres) se corten ── */
              span, p, td, th, div {
                /* Quitamos !important globales para respetar white-space definidos en componentes (ej: de precios) */
              }

              /* ── Tablas y filas se adaptan al ancho total ── */
              table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
              }

              td, th {
                overflow: hidden !important;
              }

              /* ── Imágenes (logo) no desbordan ── */
              img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
              }

              /* ── Media print: reforzar ancho exacto del papel ── */
              @media print {
                html, body {
                  width: ${ticketWidth} !important;
                  max-width: ${ticketWidth} !important;
                  min-width: ${ticketWidth} !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            ${ticketHTML}
          </body>
        </html>
      `);
      iframeDoc.close();

      // Esperar a que el iframe cargue completamente (incluidas imágenes)
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (iframeDoc.readyState === 'complete') {
            // Dar un pequeño margen para que las imágenes se rendericen
            setTimeout(resolve, 150);
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });

      // Imprimir directamente
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Limpiar iframe después de un momento
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);

      toast({
        title: "✅ Ticket enviado a impresora",
        description: "El ticket ha sido enviado a la impresora directamente"
      });

      onPrintComplete?.();

    } catch (error) {
      console.error("Error en impresión rápida:", error);
      toast({
        title: "❌ Error de impresión",
        description: "No se pudo imprimir. Intenta con el modo clásico.",
        variant: "destructive"
      });
    } finally {
      setImprimiendo(false);
    }
  }, [formatoPapel, ticketData.venta?.id, toast, onPrintComplete, abrirCajero, abrirCajeroCaja]);

  // Impresión automática cuando se abre con autoImprimir
  useEffect(() => {
    if (open && autoImprimir && !cargandoEmpresa && ticketRef.current && !hasAutoprinted.current) {
      hasAutoprinted.current = true;
      const timer = setTimeout(() => {
        imprimirRapido();
      }, 500); // Dar tiempo para que se renderice el ticket
      return () => clearTimeout(timer);
    }
    // Reset guard when dialog closes
    if (!open) {
      hasAutoprinted.current = false;
    }
  }, [open, autoImprimir, cargandoEmpresa, imprimirRapido]);

  // ─── IMPRESIÓN CLÁSICA (con html2canvas, como fallback) ────────────────────
  const handlePrintClassic = async () => {
    if (!ticketRef.current) return;

    try {
      setImprimiendo(true);

      // Capturar el ticket con mejor calidad
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        width: formato?.ancho,
        allowTaint: true,
        useCORS: true,
        logging: false,
        imageTimeout: 0
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      if (typeof window !== 'undefined') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const ticketWidth = formatoPapel === "58mm" ? 58 : 80;
          const aspectRatio = canvas.height / canvas.width;
          const ticketHeight = ticketWidth * aspectRatio;

          printWindow.document.write(`
            <html>
              <head>
                <title>Ticket - ${ticketData.venta.id}</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  @page { size: ${ticketWidth}mm auto; margin: 0; }
                  @media print {
                    html, body { width: ${ticketWidth}mm; height: auto; margin: 0; padding: 0; }
                    img { width: ${ticketWidth}mm !important; height: auto !important; max-width: ${ticketWidth}mm !important; display: block; margin: 0; padding: 0; }
                  }
                  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
                  body { display: flex; justify-content: center; align-items: flex-start; background: white; }
                  img { width: 100%; height: auto; display: block; }
                </style>
              </head>
              <body>
                <img src="${imgData}" alt="Ticket" />
                <script>
                  window.onload = function() {
                    setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 250);
                  }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        } else {
          // Fallback: descargar PDF
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: formatoPapel === "58mm" ? [58, 200] : [80, 200]
          });

          const pdfWidth = formatoPapel === "58mm" ? 58 : 80;
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`ticket-${ticketData.venta.id}.pdf`);
          
          toast({
            title: "📥 PDF descargado",
            description: "No se pudo abrir ventana de impresión. Ticket guardado como PDF.",
          });
          return;
        }
      }

      toast({
        title: "✅ Ticket procesado",
        description: "El ticket ha sido enviado a la impresora"
      });

      onPrintComplete?.();

    } catch (error) {
      console.error("Error al imprimir:", error);
      toast({
        title: "❌ Error de impresión",
        description: "No se pudo imprimir el ticket. Intenta descargar el PDF.",
        variant: "destructive"
      });
    } finally {
      setImprimiendo(false);
    }
  };

  // Seleccionar el método de impresión
  const handlePrint = () => {
    if (modoRapido) {
      imprimirRapido();
    } else {
      handlePrintClassic();
    }
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        width: formato?.ancho,
        allowTaint: true,
        useCORS: true,
        logging: false,
        imageTimeout: 0
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: formatoPapel === "58mm" ? [58, 200] : [80, 200]
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdfWidth = formatoPapel === "58mm" ? 58 : 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ticket-${ticketData.venta.id}.pdf`);

      toast({
        title: "📥 PDF descargado",
        description: "El ticket ha sido guardado como PDF"
      });

    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo generar el PDF",
        variant: "destructive"
      });
    }
  };

  // Determinar qué logo usar (priorizar logoSecundario para tickets)
  const logoParaTicket = empresaData?.logoSecundario || empresaData?.logo;
  const tieneLogoDisponible = Boolean(logoParaTicket);

  // Fecha segura (soportar createdAt Y fechaCreacion)
  const fechaVenta = ticketData.venta?.fechaCreacion || ticketData.venta?.createdAt || new Date().toISOString();

  if (autoImprimir) {
    if (!open) return null;
    return (
      <div className="fixed -top-[9999px] -left-[9999px] opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
        <div className="flex justify-center bg-card dark:bg-background p-4">
          <Ticket
            ref={ticketRef}
            idVenta={ticketData.venta?.id || ''}
            fecha={new Date(fechaVenta)}
            items={ticketData.items}
            subtotal={ticketData.subtotal}
            impuesto={ticketData.impuesto}
            total={ticketData.total}
            metodoPago={ticketData.metodoPago}
            nombreCliente={ticketData.cliente?.nombre}
            empresaNombre={empresaData?.nombre || ticketData.empresa.nombre}
            empresaDireccion={empresaData?.direccion || ticketData.empresa.direccion}
            empresaTelefono={empresaData?.telefono || ticketData.empresa.telefono}
            empresaEmail={empresaData?.email || ticketData.empresa.email}
            empresaNIT={empresaData?.nit || ticketData.empresa.nit}
            empresaLogo={incluirLogo ? logoParaTicket : null}
            mostrarLogo={incluirLogo && tieneLogoDisponible}
            formatoPapel={formatoPapel}
          />
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Ticket
          </DialogTitle>
          <DialogDescription>
            Usa el botón de impresión rápida para enviar directo a tu impresora POS/térmica
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
          {/* Preview del ticket */}
          <div className="flex justify-center bg-muted p-4 rounded-lg overflow-auto max-h-[55vh]">
            <Ticket
              ref={ticketRef}
              idVenta={ticketData.venta?.id || ''}
              fecha={new Date(fechaVenta)}
              items={ticketData.items}
              subtotal={ticketData.subtotal}
              impuesto={ticketData.impuesto}
              total={ticketData.total}
              metodoPago={ticketData.metodoPago}
              nombreCliente={ticketData.cliente?.nombre}
              empresaNombre={empresaData?.nombre || ticketData.empresa.nombre}
              empresaDireccion={empresaData?.direccion || ticketData.empresa.direccion}
              empresaTelefono={empresaData?.telefono || ticketData.empresa.telefono}
              empresaEmail={empresaData?.email || ticketData.empresa.email}
              empresaNIT={empresaData?.nit || ticketData.empresa.nit}
              empresaLogo={incluirLogo ? logoParaTicket : null}
              mostrarLogo={incluirLogo && tieneLogoDisponible}
              formatoPapel={formatoPapel}
            />
          </div>

          {/* Controles simplificados */}
          <div className="space-y-4">
            {/* Formato de papel */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Formato de papel</Label>
              <Select 
                value={formatoPapel} 
                onValueChange={(value) => setFormatoPapel(value as "58mm" | "80mm")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATOS_PAPEL.map(formato => (
                    <SelectItem key={formato.id} value={formato.id}>
                      {formato.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Logo toggle */}
            {tieneLogoDisponible && (
              <div className="flex items-center justify-between">
                <Label htmlFor="logo-toggle" className="text-sm">Incluir logo</Label>
                <Switch
                  id="logo-toggle"
                  checked={incluirLogo}
                  onCheckedChange={setIncluirLogo}
                />
              </div>
            )}

            {/* Info del ticket */}
            <div className="rounded-lg bg-muted/50 border p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Ticket</span>
                <span className="font-mono font-bold">{ticketData.venta?.id?.slice(0, 8) || '---'}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Items</span>
                <span className="font-bold">{ticketData.items.length}</span>
              </div>
              <div className="flex justify-between text-foreground font-bold text-base pt-1 border-t">
                <span>Total</span>
                <span>${ticketData.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Nota para el usuario */}
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <p className="font-bold mb-1">💡 Tip: Impresora POS</p>
              <p>En el diálogo del navegador, selecciona tu impresora térmica POS y asegúrate de que el tamaño de papel esté en <strong>{formatoPapel}</strong>.</p>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={imprimirRapido}
                disabled={imprimiendo}
                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                {imprimiendo ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5 mr-2" />
                )}
                {imprimiendo ? "Imprimiendo..." : "⚡ Imprimir Rápido (POS)"}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrintClassic}
                  disabled={imprimiendo}
                  className="text-sm"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Modo clásico
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="text-sm"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}