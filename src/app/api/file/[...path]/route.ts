import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const filePathArray = resolvedParams.path;
  
  if (!filePathArray || filePathArray.length === 0) {
    return new NextResponse("File not found", { status: 404 });
  }

  // Sanitizar el path para evitar directory traversal
  const safePath = filePathArray.join("/").replace(/\.\./g, "");
  
  // Construir el path absoluto hacia public/uploads/...
  const absolutePath = path.join(process.cwd(), "public", "uploads", safePath);

  if (!existsSync(absolutePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(absolutePath);
    
    // Determinar el Content-Type básico
    const ext = path.extname(absolutePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".svg") contentType = "image/svg+xml";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
