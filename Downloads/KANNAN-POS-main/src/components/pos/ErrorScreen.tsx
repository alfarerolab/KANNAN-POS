"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorScreenProps {
  title: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorScreen({ 
  title, 
  message, 
  onRetry, 
  showRetry = true 
}: ErrorScreenProps) {
  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">Contacta al administrador del sistema.</p>
          {showRetry && (
            <Button 
              onClick={onRetry || (() => window.location.reload())} 
              variant="outline"
            >
              Reintentar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}