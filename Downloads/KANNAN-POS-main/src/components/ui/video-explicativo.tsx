"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  SkipBack,
  SkipForward,
  PlayCircle,
  Eye,
  Clock,
  Award,
  Sparkles,
  CheckCircle2,
  X
} from "lucide-react";

interface VideoExplicativoProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    titulo: string;
    descripcion: string;
    url: string;
    duracion: string;
    categoria: 'POS' | 'INVENTARIO' | 'REPORTES' | 'CONFIGURACION' | 'GENERAL';
    nivel: 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
    thumbnail?: string;
  };
  onComplete?: () => void;
}

export function VideoExplicativo({
  isOpen,
  onOpenChange,
  video,
  onComplete
}: VideoExplicativoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasWatched, setHasWatched] = useState(false);
  const [watchPercentage, setWatchPercentage] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Efectos para manejar el video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setHasWatched(true);
      onComplete?.();
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  // Calcular porcentaje de visualización
  useEffect(() => {
    if (duration > 0) {
      const percentage = (currentTime / duration) * 100;
      setWatchPercentage(percentage);
    }
  }, [currentTime, duration]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setCurrentTime(0);
    setWatchPercentage(0);
    setHasWatched(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCategoriaInfo = (categoria: string) => {
    const categorias = {
      'POS': { icon: '🛒', color: 'from-green-500 to-emerald-500', name: 'Punto de Venta' },
      'INVENTARIO': { icon: '📦', color: 'from-blue-500 to-cyan-500', name: 'Inventario' },
      'REPORTES': { icon: '📊', color: 'from-purple-500 to-pink-500', name: 'Reportes' },
      'CONFIGURACION': { icon: '⚙️', color: 'from-orange-500 to-red-500', name: 'Configuración' },
      'GENERAL': { icon: '🎯', color: 'from-gray-500 to-slate-500', name: 'General' }
    };
    return categorias[categoria as keyof typeof categorias] || categorias['GENERAL'];
  };

  const getNivelInfo = (nivel: string) => {
    const niveles = {
      'BASICO': { color: 'bg-emerald-500/15 text-green-700 dark:text-green-400 border-emerald-500/30', name: 'Básico' },
      'INTERMEDIO': { color: 'bg-amber-500/15 text-yellow-700 dark:text-yellow-400 border-amber-500/30', name: 'Intermedio' },
      'AVANZADO': { color: 'bg-destructive/15 text-red-700 dark:text-red-400 border-destructive/30', name: 'Avanzado' }
    };
    return niveles[nivel as keyof typeof niveles] || niveles['BASICO'];
  };

  const categoriaInfo = getCategoriaInfo(video.categoria);
  const nivelInfo = getNivelInfo(video.nivel);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full p-0 bg-transparent border-0 shadow-none">
        <div className="backdrop-blur-2xl bg-black/80 border border-border rounded-3xl overflow-hidden shadow-2xl">
          {/* Header del video */}
          <DialogHeader className="p-6 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${categoriaInfo.color} shadow-lg`}>
                    <span className="text-lg">{categoriaInfo.icon}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${nivelInfo.color} border font-medium`}
                    >
                      {nivelInfo.name}
                    </Badge>
                    <Badge variant="secondary" className="bg-card dark:bg-background/20 text-primary-foreground border-white/30">
                      {categoriaInfo.name}
                    </Badge>
                  </div>
                </div>
                <DialogTitle className="text-2xl font-bold text-primary-foreground mb-2 leading-tight">
                  {video.titulo}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/50 text-base leading-relaxed">
                  {video.descripcion}
                </DialogDescription>

                {/* Estadísticas del video */}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground/70">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{video.duracion}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{Math.round(watchPercentage)}% visto</span>
                  </div>
                  {hasWatched && (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Completado</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-card dark:bg-background/10 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Barra de progreso */}
            <div className="mt-4">
              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 relative"
                  style={{ width: `${watchPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-card dark:bg-background/20 animate-pulse rounded-full" />
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Reproductor de video */}
          <div
            ref={containerRef}
            className="relative bg-black group"
          >
            <video
              ref={videoRef}
              src={video.url}
              poster={video.thumbnail}
              className="w-full aspect-video object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
            />

            {/* Overlay de controles */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300">
              {/* Controles centrales */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skipTime(-10)}
                    className="h-12 w-12 text-primary-foreground hover:bg-card dark:bg-background/20 rounded-full backdrop-blur-sm"
                  >
                    <SkipBack className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="h-16 w-16 text-primary-foreground hover:bg-card dark:bg-background/20 rounded-full backdrop-blur-sm border border-white/30"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8 ml-1" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skipTime(10)}
                    className="h-12 w-12 text-primary-foreground hover:bg-card dark:bg-background/20 rounded-full backdrop-blur-sm"
                  >
                    <SkipForward className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {/* Controles inferiores */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="backdrop-blur-xl bg-black/50 rounded-2xl p-4 border border-border">
                  {/* Barra de progreso del video */}
                  <div className="w-full bg-gray-600 rounded-full h-1 mb-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={restart}
                        className="text-primary-foreground hover:bg-card dark:bg-background/10 h-8 px-3"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reiniciar
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="text-primary-foreground hover:bg-card dark:bg-background/10 h-8 w-8"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>

                      <span className="text-primary-foreground text-sm font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasWatched && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Award className="h-3 w-3 mr-1" />
                          ¡Completado!
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="text-primary-foreground hover:bg-card dark:bg-background/10 h-8 w-8"
                      >
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicador de carga */}
            {!isPlaying && currentTime === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <div className="p-6 rounded-full bg-card dark:bg-background/10 backdrop-blur-sm mb-4 mx-auto w-fit">
                    <PlayCircle className="h-16 w-16 text-primary-foreground" />
                  </div>
                  <p className="text-primary-foreground/80 font-medium">Haz clic para reproducir</p>
                </div>
              </div>
            )}
          </div>

          {/* Efectos decorativos */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />

          {/* Partículas decorativas */}
          <div className="absolute top-4 right-4 opacity-20">
            <Sparkles className="h-6 w-6 text-purple-400 animate-pulse" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
