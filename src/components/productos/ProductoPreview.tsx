import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductoPreviewProps {
  producto: any;
}

export function ProductoPreview({ producto }: ProductoPreviewProps) {
  const formatPrice = (price: any): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return !isNaN(numPrice) ? numPrice.toFixed(2) : '0.00';
  };

  const getSafeNumber = (value: any, defaultValue = 0): number => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return !isNaN(num) ? num : defaultValue;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista Previa</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="w-full aspect-square relative rounded-md overflow-hidden mb-4">
          {producto.imagen ? (
            <Image
              src={producto.imagen}
              alt={producto.nombre}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground text-3xl font-bold">
              {producto.nombre ? producto.nombre.substring(0, 2).toUpperCase() : "??"}
            </div>
          )}
        </div>
        <h3 className="font-bold text-lg text-center">{producto.nombre}</h3>
        <p className="text-center text-muted-foreground text-sm mb-2">
          {producto.codigoBarras || producto.sku || "Sin código"}
        </p>
        <p className="text-center text-lg font-semibold">
          ${formatPrice(producto.precio)}
        </p>
        <p className="text-center mt-2">
          <span className={getSafeNumber(producto.enStock) < getSafeNumber(producto.stockMinimo, 5) ? "text-destructive font-medium" : ""}>
            Stock: {getSafeNumber(producto.enStock)} unidades
          </span>
        </p>
      </CardContent>
    </Card>
  );
}