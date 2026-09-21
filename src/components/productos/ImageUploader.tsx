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
    const [previewError, setPreviewError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true);
        setUploadError(null);
        setPreviewError(false);

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
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsUploading(false);
        }
    }, [productoId, value, onChange]);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
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
        // Si es imagen local, eliminarla del servidor
        if (value && value.startsWith("/uploads/")) {
            try {
                await fetch("/api/upload", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: value }),
                });
            } catch {
                // No crítico
            }
        }
        onChange("");
        setPreviewError(false);
    }, [value, onChange]);

    const handleUrlSubmit = useCallback(() => {
        if (urlInputValue.trim()) {
            onChange(urlInputValue.trim());
            setShowUrlInput(false);
            setUrlInputValue("");
            setPreviewError(false);
        }
    }, [urlInputValue, onChange]);

    const hasImage = value && value.trim() !== "";

    return (
        <div className={cn("space-y-3", className)}>
            {/* Zona principal */}
            {hasImage && !previewError ? (
                /* Vista previa de imagen */
                <div className="relative group rounded-xl overflow-hidden border border-border bg-muted/30 aspect-square max-w-[200px]">
                    <Image
                        src={value}
                        alt="Imagen del producto"
                        fill
                        className="object-contain p-2"
                        onError={() => setPreviewError(true)}
                        unoptimized={value.startsWith("/uploads/")}
                    />
                    {/* Overlay con acciones */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3 text-xs shadow-lg"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Upload className="h-3 w-3 mr-1" />
                            )}
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
                    </div>
                </div>
            ) : (
                /* Zona de drop / upload */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={cn(
                        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none",
                        "aspect-square max-w-[200px] p-4",
                        isDragging
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : "border-border hover:border-primary/50 hover:bg-muted/40 bg-muted/20",
                        isUploading && "pointer-events-none opacity-70"
                    )}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-xs text-muted-foreground text-center">Subiendo y optimizando...</p>
                        </>
                    ) : (
                        <>
                            <div className={cn(
                                "rounded-full p-3 transition-colors",
                                isDragging ? "bg-primary/10" : "bg-muted"
                            )}>
                                <ImageIcon className={cn(
                                    "h-6 w-6 transition-colors",
                                    isDragging ? "text-primary" : "text-muted-foreground"
                                )} />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-xs font-medium text-foreground">
                                    {isDragging ? "Suelta aquí" : "Subir imagen"}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    JPG, PNG o WebP<br />Máx. 5MB
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Input de archivo oculto */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
            />

            {/* Botones de acción adicionales */}
            {!hasImage && !isUploading && (
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 border-dashed"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                    >
                        <Link className="h-3 w-3" />
                        Usar URL
                    </Button>
                </div>
            )}

            {/* Input de URL alternativo */}
            {showUrlInput && (
                <div className="flex gap-2">
                    <Input
                        value={urlInputValue}
                        onChange={(e) => setUrlInputValue(e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="h-8 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
                    />
                    <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs px-3 shrink-0"
                        onClick={handleUrlSubmit}
                    >
                        OK
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-2 shrink-0"
                        onClick={() => { setShowUrlInput(false); setUrlInputValue(""); }}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Error de carga */}
            {uploadError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {uploadError}
                </p>
            )}

            {/* Ayuda cuando hay error de preview */}
            {previewError && hasImage && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
                    No se pudo cargar la imagen desde la URL actual. Sube una nueva imagen o verifica la URL.
                </div>
            )}

            {/* Info de imagen actual */}
            {hasImage && !previewError && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={value}>
                    {value.startsWith("/uploads/") ? "📁 Imagen local (optimizada)" : "🌐 Imagen desde URL"}
                </p>
            )}
        </div>
    );
}
