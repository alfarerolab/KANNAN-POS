"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

interface TutorialState {
  hasSeenTutorial: boolean;
  completedSteps: string[];
  isFirstLogin: boolean;
}

export function useTutorial() {
  const { session } = useAuth();
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    hasSeenTutorial: false,
    completedSteps: [],
    isFirstLogin: false,
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar estado del tutorial al montar el componente
  useEffect(() => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    loadTutorialState();
  }, [session?.user?.id]);

  const loadTutorialState = async () => {
    try {
      setIsLoading(true);

      // Obtener estado del tutorial desde localStorage primero (fallback)
      const localState = localStorage.getItem(`tutorial_state_${session?.user?.id}`);

      if (localState) {
        const parsedState = JSON.parse(localState);
        setTutorialState(parsedState);

        // Si es primera vez y no ha visto el tutorial, mostrarlo
        if (!parsedState.hasSeenTutorial && parsedState.isFirstLogin !== false) {
          setShowTutorial(true);
        }
      } else {
        // Primera vez del usuario - marcar como primer login
        const newState: TutorialState = {
          hasSeenTutorial: false,
          completedSteps: [],
          isFirstLogin: true,
        };

        setTutorialState(newState);
        setShowTutorial(true);

        // Guardar en localStorage
        localStorage.setItem(`tutorial_state_${session?.user?.id}`, JSON.stringify(newState));
      }

      // También verificar con el servidor si hay configuración inicial pendiente
      const response = await fetch('/api/configuracion');
      if (response.ok) {
        const config = await response.json();

        // Si no tiene configuración inicial, definitivamente necesita el tutorial
        if (!config || !config.tipoNegocio) {
          setShowTutorial(true);
        }
      }

    } catch (error) {
      console.error('Error loading tutorial state:', error);

      // En caso de error, asumir que es primera vez
      setTutorialState({
        hasSeenTutorial: false,
        completedSteps: [],
        isFirstLogin: true,
      });
      setShowTutorial(true);
    } finally {
      setIsLoading(false);
    }
  };

  const markStepCompleted = (stepId: string) => {
    const newState = {
      ...tutorialState,
      completedSteps: [...tutorialState.completedSteps.filter(id => id !== stepId), stepId],
    };

    setTutorialState(newState);
    localStorage.setItem(`tutorial_state_${session?.user?.id}`, JSON.stringify(newState));
  };

  const completeTutorial = async () => {
    const newState: TutorialState = {
      ...tutorialState,
      hasSeenTutorial: true,
      isFirstLogin: false,
    };

    setTutorialState(newState);
    setShowTutorial(false);
    localStorage.setItem(`tutorial_state_${session?.user?.id}`, JSON.stringify(newState));

    // También enviar al servidor que completó el onboarding
    try {
      await fetch('/api/usuario/tutorial-completado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          completedSteps: newState.completedSteps,
        }),
      });
    } catch (error) {
      console.error('Error saving tutorial completion:', error);
    }
  };

  const resetTutorial = () => {
    const newState: TutorialState = {
      hasSeenTutorial: false,
      completedSteps: [],
      isFirstLogin: false,
    };

    setTutorialState(newState);
    localStorage.setItem(`tutorial_state_${session?.user?.id}`, JSON.stringify(newState));
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const closeTutorial = () => {
    setShowTutorial(false);

    // Marcar que ha visto el tutorial aunque no lo haya completado
    const newState = {
      ...tutorialState,
      hasSeenTutorial: true,
    };

    setTutorialState(newState);
    localStorage.setItem(`tutorial_state_${session?.user?.id}`, JSON.stringify(newState));
  };

  const shouldShowTutorial = () => {
    return !isLoading && showTutorial && session?.user?.id;
  };

  const getTutorialProgress = () => {
    const totalSteps = 6; // Total de pasos en el tutorial
    const completedCount = tutorialState.completedSteps.length;
    return {
      completed: completedCount,
      total: totalSteps,
      percentage: Math.round((completedCount / totalSteps) * 100),
    };
  };

  return {
    // Estado
    tutorialState,
    showTutorial: shouldShowTutorial(),
    isLoading,

    // Acciones
    markStepCompleted,
    completeTutorial,
    resetTutorial,
    startTutorial,
    closeTutorial,

    // Utilidades
    getTutorialProgress,
    isFirstLogin: tutorialState.isFirstLogin,
    hasSeenTutorial: tutorialState.hasSeenTutorial,
  };
}
