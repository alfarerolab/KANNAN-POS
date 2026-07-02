// Función para generar código de barras EAN-13
export function generateEAN13(): string {
  // Generar 12 dígitos aleatorios
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += Math.floor(Math.random() * 10);
  }
  
  // Calcular dígito de control
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
}

// Función para generar imagen del código de barras
export async function generateBarcodeImage(barcode: string, productName: string): Promise<string> {
  // Crear canvas para generar código de barras simple
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto del canvas');

  // Configurar canvas
  canvas.width = 300;
  canvas.height = 100;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar barras (representación simple)
  ctx.fillStyle = 'black';
  const barWidth = 2;
  let x = 20;

  // Patrón simple de barras basado en el código
  for (let i = 0; i < barcode.length; i++) {
    const digit = parseInt(barcode[i]);
    const pattern = digit % 2 === 0 ? [1, 0, 1, 0] : [0, 1, 0, 1];
    
    pattern.forEach(bar => {
      if (bar) {
        ctx.fillRect(x, 10, barWidth, 60);
      }
      x += barWidth;
    });
  }

  // Agregar texto del código
  ctx.fillStyle = 'black';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(barcode, canvas.width / 2, 85);

  // Convertir a base64
  return canvas.toDataURL('image/png');
}

// Función para generar SKU automático
export function generateSKU(nombre: string = ""): string {
  const timestamp = Date.now().toString().slice(-3);
  const randomNum = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  const namePrefix = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3) 
    .padEnd(2, 'X');
  
  return `${namePrefix}${timestamp}${randomNum}`;
}