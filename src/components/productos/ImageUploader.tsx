"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon, Loader2, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    productoId?: string;
    className?: string;
}

export function ImageUploader({ value, onChange, productoId, className }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInputValue, setUrlInputValue] = useState("");
    // Preview local antes de subir (objectURL)
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true);
        setUploadError(null);

        // Mostrar preview local INMEDIATAMENTE mientras sube
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);

        try {
            const formData = new FormData();
            formData.append("file", file);
            if (productoId) formData.append("productoId", productoId);
            if (value && value.startsWith("/uploads/")) {
                formData.append("imagenAnterior", value);
            }

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al subir la imagen");
            }

            onChange(data.url);
            // Liberar objectURL ya que ahora tenemos la URL real
            URL.revokeObjectURL(objectUrl);
            setLocalPreview(null);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Error desconocido");
            // En caso de error, limpiar preview local
            URL.revokeObjectURL(objectUrl);
            setLocalPreview(null);
        } finally {
            setIsUploading(false);
        }
    }, [productoId, value, onChange]);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];

        // Validar tipo
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            setUploadError("Solo se permiten imágenes JPG, PNG o WebP.");
            return;
        }
        // Validar tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError("La imagen no puede superar 5MB.");
            return;
        }

        setUploadError(null);
        uploadFile(file);
    }, [uploadFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleRemoveImage = useCallback(async () => {
        if (value && value.startsWith("/uploads/")) {
            try {
                await fetch("/api/upload", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: value }),
                });
            } catch { /* no crítico */ }
        }
        onChange("");
        setLocalPreview(null);
        setUploadError(null);
    }, [value, onChange]);

    const handleUrlSubmit = useCallback(() => {
        if (urlInputValue.trim()) {
            onChange(urlInputValue.trim());
            setShowUrlInput(false);
            setUrlInputValue("");
        }
    }, [urlInputValue, onChange]);

    // La imagen a mostrar: primero el preview local, luego la URL guardada
    const displaySrc = localPreview || (value && value.trim() !== "" ? value : null);

    return (
        <div className={cn("space-y-2", className)}>
            {displaySrc ? (
                /* ── Vista previa de la imagen ── */
                <div className="relative group rounded-xl overflow-hidden border border-border bg-muted/20 w-[180px] h-[180px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={displaySrc}
                        alt="Vista previa del producto"
                        className="w-full h-full object-contain p-2"
                    />

                    {/* Overlay al hacer hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        {!isUploading && (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 px-3 text-xs shadow-lg"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-3 w-3 mr-1" />
                                    Cambiar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-3 text-xs shadow-lg"
                                    onClick={handleRemoveImage}
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Quitar
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Spinner mientras sube */}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-7 w-7 text-white animate-spin" />
                            <p className="text-white text-xs font-medium">Subiendo...</p>
                        </div>
                    )}
                </div>
            ) : (
                /* ── Zona de drop / selección ── */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={cn(
                        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none w-[180px] h-[180px]",
                        isDragging
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : "border-border hover:border-primary/50 hover:bg-muted/40 bg-muted/10",
                        isUploading && "pointer-events-none opacity-60"
                    )}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-xs text-muted-foreground">Subiendo...</p>
                        </>
                    ) : (
                        <>
                            <div className={cn("rounded-full p-3 transition-colors", isDragging ? "bg-primary/10" : "bg-muted")}>
                                <ImageIcon className={cn("h-6 w-6 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                            </div>
                            <div className="text-center space-y-0.5 px-2">
                                <p className="text-xs font-medium text-foreground">
                                    {isDragging ? "Suelta aquí" : "Sube la imagen"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    JPG, PNG o WebP · Máx. 5MB
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Input oculto */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
            />

            {/* Opción URL alternativa (solo si no hay imagen) */}
            {!displaySrc && !isUploading && (
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] px-2 text-muted-foreground gap-1 hover:text-foreground"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                    >
                        <Link className="h-3 w-3" />
                        Usar URL externa
                    </Button>
                </div>
            )}

            {showUrlInput && (
                <div className="flex gap-2 w-[280px]">
                    <Input
                        value={urlInputValue}
                        onChange={(e) => setUrlInputValue(e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="h-8 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
                    />
                    <Button type="button" size="sm" className="h-8 text-xs px-3 shrink-0" onClick={handleUrlSubmit}>OK</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 shrink-0" onClick={() => { setShowUrlInput(false); setUrlInputValue(""); }}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Error de upload */}
            {uploadError && (
                <p className="text-xs text-destructive flex items-center gap-1 w-[280px]">
                    <X className="h-3 w-3 shrink-0" />
                    {uploadError}
                </p>
            )}

            {/* Indicador de tipo de imagen guardada */}
            {value && !localPreview && (
                <p className="text-[10px] text-muted-foreground truncate w-[180px]" title={value}>
                    {value.startsWith("/uploads/") ? "📁 Imagen local" : "🌐 URL externa"}
                </p>
            )}
        </div>
    );
}
