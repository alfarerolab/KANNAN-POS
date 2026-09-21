import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Tamaño máximo: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "productos");

export async function POST(request: NextRequest) {
    try {
        // Verificar autenticación
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const productoId = formData.get("productoId") as string | null;
        const imagenAnterior = formData.get("imagenAnterior") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
        }

        // Validar tipo de archivo
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Tipo de archivo no permitido. Solo JPG, PNG o WebP." },
                { status: 400 }
            );
        }

        // Validar tamaño
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "El archivo es muy grande. Máximo 5MB." },
                { status: 400 }
            );
        }

        // Crear directorio si no existe
        if (!existsSync(UPLOAD_DIR)) {
            await mkdir(UPLOAD_DIR, { recursive: true });
        }

        // Leer el archivo como buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generar nombre único
        const timestamp = Date.now();
        const suffix = productoId ? `${productoId}-${timestamp}` : `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
        const filename = `producto-${suffix}.webp`;
        const filepath = path.join(UPLOAD_DIR, filename);

        // Procesar imagen con sharp (comprimir + convertir a WebP)
        try {
            const sharp = (await import("sharp")).default;
            const processedBuffer = await sharp(buffer)
                .resize(800, 800, {
                    fit: "inside",       // Mantiene aspecto, no recorta
                    withoutEnlargement: true, // No agranda imágenes pequeñas
                })
                .webp({ quality: 82 }) // WebP calidad 82% — buen balance calidad/tamaño
                .toBuffer();

            await writeFile(filepath, processedBuffer);
        } catch {
            // Si sharp falla (raro), guardar imagen original sin procesar
            await writeFile(filepath, buffer);
        }

        // Eliminar imagen anterior si existe y si es un archivo local
        if (imagenAnterior && imagenAnterior.startsWith("/uploads/")) {
            try {
                const oldPath = path.join(process.cwd(), "public", imagenAnterior);
                if (existsSync(oldPath)) {
                    await unlink(oldPath);
                }
            } catch {
                // Si falla la eliminación, no es crítico
            }
        }

        const publicUrl = `/uploads/productos/${filename}`;
        return NextResponse.json({ url: publicUrl }, { status: 200 });
    } catch (error) {
        console.error("Error al subir imagen:", error);
        return NextResponse.json(
            { error: "Error interno al procesar la imagen" },
            { status: 500 }
        );
    }
}

// Endpoint DELETE para eliminar imágenes huérfanas
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { url } = await request.json();

        if (!url || !url.startsWith("/uploads/")) {
            return NextResponse.json({ error: "URL inválida" }, { status: 400 });
        }

        const filepath = path.join(process.cwd(), "public", url);
        if (existsSync(filepath)) {
            await unlink(filepath);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar imagen:", error);
        return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
    }
}
