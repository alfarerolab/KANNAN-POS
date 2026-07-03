"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoExplicativo } from "@/components/ui/video-explicativo";
import { useTheme } from "@/hooks/use-theme";
import {
  VIDEO_LIBRARY,
  CATEGORY_METADATA,
  getVideosByCategory,
  getVideosByLevel,
  searchVideos,
  getRecommendedVideos,
  type VideoTutorial
} from "@/lib/video-library";
import {
  Play,
  Search,
  Clock,
  Award,
  BookOpen,
  Star,
  Filter,
  PlayCircle,
  ChevronRight
} from "lucide-react";

export function VideoLibraryPanel() {
  const { coloresActuales } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<VideoTutorial['categoria'] | 'ALL'>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<VideoTutorial['nivel'] | 'ALL'>('ALL');

  // Filtrar videos según criterios de búsqueda
  const getFilteredVideos = () => {
    let videos = VIDEO_LIBRARY;

    if (searchQuery) {
      videos = searchVideos(searchQuery);
    }

    if (selectedCategory !== 'ALL') {
      videos = videos.filter(video => video.categoria === selectedCategory);
    }

    if (selectedLevel !== 'ALL') {
      videos = videos.filter(video => video.nivel === selectedLevel);
    }

    return videos;
  };

  const filteredVideos = getFilteredVideos();
  const recommendedVideos = getRecommendedVideos();

  const getLevelBadgeStyle = (nivel: VideoTutorial['nivel']) => {
    const styles = {
      'BASICO': 'bg-emerald-500/15 text-green-700 dark:text-green-400 border-emerald-500/30',
      'INTERMEDIO': 'bg-amber-500/15 text-yellow-700 dark:text-yellow-400 border-amber-500/30',
      'AVANZADO': 'bg-destructive/15 text-red-700 dark:text-red-400 border-destructive/30'
    };
    return styles[nivel];
  };

  const VideoCard = ({ video }: { video: VideoTutorial }) => {
    const categoryInfo = CATEGORY_METADATA[video.categoria];

    return (
      <Card className={`${coloresActuales.surface} ${coloresActuales.border} hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105`}
        onClick={() => setSelectedVideo(video)}
      >
        <CardContent className="p-4">
          {/* Header del video */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${categoryInfo.color} shadow-md`}>
              <span className="text-lg">{categoryInfo.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${coloresActuales.text} line-clamp-2 group-hover:text-blue-600 dark:text-blue-400 transition-colors`}>
                {video.titulo}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${getLevelBadgeStyle(video.nivel)} border text-xs`}>
                  {video.nivel}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                  {categoryInfo.name}
                </Badge>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <p className={`text-sm ${coloresActuales.textSecondary} line-clamp-2 mb-3`}>
            {video.descripcion}
          </p>

          {/* Footer del video */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{video.duracion}</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                <span>{video.nivel}</span>
              </div>
            </div>

            <Button
              size="sm"
              className={`bg-gradient-to-r ${coloresActuales.primary} hover:bg-primary/90 transition-all duration-300 group-hover:scale-105`}
            >
              <Play className="h-3 w-3 mr-1" />
              Ver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${coloresActuales.text} flex items-center gap-3`}>
            <div className={`p-2 rounded-lg bg-gradient-to-r ${coloresActuales.primary}`}>
              <PlayCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            Centro de Aprendizaje
          </h2>
          <p className={`${coloresActuales.textSecondary} mt-1`}>
            Aprende a usar tu sistema POS con videos tutoriales paso a paso
          </p>
        </div>
      </div>

      {/* Videos Recomendados */}
      <Card className={`${coloresActuales.surface} ${coloresActuales.border}`}>
        <CardHeader>
          <CardTitle className={`${coloresActuales.text} flex items-center gap-2`}>
            <Star className="h-5 w-5 text-yellow-500" />
            Videos Recomendados para Empezar
          </CardTitle>
          <CardDescription className={coloresActuales.textSecondary}>
            Los videos más importantes para comenzar a usar tu sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtros y Búsqueda */}
      <Card className={`${coloresActuales.surface} ${coloresActuales.border}`}>
        <CardHeader>
          <CardTitle className={`${coloresActuales.text} flex items-center gap-2`}>
            <Filter className="h-5 w-5" />
            Buscar Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Buscar por título o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as VideoTutorial['categoria'] | 'ALL')}
              className={`rounded-md border ${coloresActuales.border} px-3 py-2 text-sm ${coloresActuales.text} bg-card`}
            >
              <option value="ALL">Todas las categorías</option>
              {Object.entries(CATEGORY_METADATA).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.icon} {value.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as VideoTutorial['nivel'] | 'ALL')}
              className={`rounded-md border ${coloresActuales.border} px-3 py-2 text-sm ${coloresActuales.text} bg-card`}
            >
              <option value="ALL">Todos los niveles</option>
              <option value="BASICO">Básico</option>
              <option value="INTERMEDIO">Intermedio</option>
              <option value="AVANZADO">Avanzado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Biblioteca por Categorías */}
      <Tabs defaultValue="ALL" className="w-full">
        <TabsList className={`grid w-full grid-cols-6 ${coloresActuales.surface}`}>
          <TabsTrigger value="ALL" className="text-sm">
            <BookOpen className="h-4 w-4 mr-1" />
            Todos
          </TabsTrigger>
          {Object.entries(CATEGORY_METADATA).map(([key, value]) => (
            <TabsTrigger key={key} value={key} className="text-sm">
              <span className="mr-1">{value.icon}</span>
              {value.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ALL" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          {filteredVideos.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <p className={`${coloresActuales.textSecondary} text-lg`}>
                No se encontraron videos con los filtros aplicados
              </p>
            </div>
          )}
        </TabsContent>

        {Object.keys(CATEGORY_METADATA).map((categoria) => (
          <TabsContent key={categoria} value={categoria} className="mt-6">
            <div className="mb-6">
              <h3 className={`text-xl font-semibold ${coloresActuales.text} mb-2`}>
                {CATEGORY_METADATA[categoria as keyof typeof CATEGORY_METADATA].name}
              </h3>
              <p className={coloresActuales.textSecondary}>
                {CATEGORY_METADATA[categoria as keyof typeof CATEGORY_METADATA].description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getVideosByCategory(categoria as VideoTutorial['categoria']).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Modal de Video */}
      {selectedVideo && (
        <VideoExplicativo
          isOpen={!!selectedVideo}
          onOpenChange={(open) => !open && setSelectedVideo(null)}
          video={selectedVideo}
          onComplete={() => {
          }}
        />
      )}
    </div>
  );
}
