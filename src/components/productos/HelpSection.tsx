import { Card, CardContent } from "@/components/ui/card";

export function HelpSection() {
  return (
    <Card className="bg-emerald-500/10/50 border-emerald-500/30/50">
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-green-900">
              Consejos para crear productos
            </p>
            <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
              <li>• Usa nombres descriptivos pero concisos para facilitar la búsqueda</li>
              <li>• El SKU se genera automáticamente pero puedes regenerarlo si necesitas</li>
              <li>• Si no tienes código de barras, puedes generar uno EAN-13 válido</li>
              <li>• La imagen del código de barras se guarda automáticamente con el nombre del producto</li>
              <li>• Configura el stock mínimo según la rotación del producto</li>
              <li>• Revisa el tipo de venta según cómo realmente vendes el producto</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}