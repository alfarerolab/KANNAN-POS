"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import React from "react";

// Tipos para el sistema de temas
export interface TemaColores {
  primary: string;
  secondary: string;
  accent: string;
  gradiente: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface TemaPersonalizado {
  id: string;
  nombre: string;
  colores: {
    light: TemaColores;
    dark: TemaColores;
  };
  particulas?: {
    enabled: boolean;
    tipo: 'stars' | 'geometric' | 'floating' | 'minimal';
    densidad: number;
    velocidad: number;
    interactivo: boolean;
  };
}

export type ModoOscuro = 'light' | 'dark' | 'system';

// Temas predefinidos
export const TEMAS_PREDEFINIDOS: TemaPersonalizado[] = [
  {
    id: 'minimal',
    nombre: 'Minimal',
    colores: {
      light: {
        primary: 'from-slate-600 to-slate-800',
        secondary: 'from-gray-500 to-slate-600',
        accent: 'from-slate-400 to-slate-700',
        gradiente: 'from-slate-50 via-gray-50 to-slate-100',
        background: 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100',
        surface: 'bg-white/90 backdrop-blur-xl border-gray-200/30',
        text: 'text-slate-900',
        textSecondary: 'text-slate-600',
        border: 'border-gray-200/50',
        success: 'from-green-500 to-emerald-500',
        warning: 'from-yellow-500 to-orange-500',
        error: 'from-red-500 to-pink-500',
        info: 'from-blue-500 to-indigo-500'
      },
      dark: {
        primary: 'from-slate-200 to-slate-400',
        secondary: 'from-slate-300 to-slate-500',
        accent: 'from-slate-400 to-slate-600',
        gradiente: 'from-zinc-950 via-zinc-900 to-zinc-950',
        background: 'bg-[#141518]',
        surface: 'bg-[#1e2025] border-[#32363c]/50',
        text: 'text-[#e8eaed]',
        textSecondary: 'text-[#808a96]',
        border: 'border-[#32363c]/50',
        success: 'from-green-500 to-emerald-600',
        warning: 'from-yellow-500 to-orange-500',
        error: 'from-red-500 to-rose-600',
        info: 'from-blue-500 to-indigo-500'
      }
    },
    particulas: {
      enabled: false,
      tipo: 'minimal',
      densidad: 20,
      velocidad: 0.1,
      interactivo: false
    }
  }
];

// Funciones auxiliares para localStorage
const getStorageItem = (key: string, defaultValue = ''): string => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (error) {
    console.error(`Error accessing localStorage for key ${key}:`, error);
    return defaultValue;
  }
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error setting localStorage for key ${key}:`, error);
  }
};

// Función para sincronizar tema con servidor



// Contexto del tema
interface ThemeContextType {
  temaActual: TemaPersonalizado;
  modoOscuro: ModoOscuro;
  isDark: boolean;
  cambiarTema: (temaId: string) => void;
  cambiarModoOscuro: (modo: ModoOscuro) => void;
  coloresActuales: TemaColores;
  particulas: TemaPersonalizado['particulas'];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook principal useTheme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};

// Hook interno para la lógica del tema
export const useThemeLogic = () => {
  const { data: session, status } = useSession();
  const [temaActual, setTemaActual] = useState<TemaPersonalizado>(TEMAS_PREDEFINIDOS[0]);
  const [modoOscuro, setModoOscuro] = useState<ModoOscuro>('system');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [serverSynced, setServerSynced] = useState(false);

  // Marcar como montado para evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detectar preferencia del sistema
  const detectarModoSistema = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  // Actualizar isDark basado en modo actual
  useEffect(() => {
    if (!mounted) return;

    if (modoOscuro === 'system') {
      setIsDark(detectarModoSistema());
    } else {
      setIsDark(modoOscuro === 'dark');
    }
  }, [modoOscuro, detectarModoSistema, mounted]);

  // Escuchar cambios en preferencias del sistema
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || modoOscuro !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [modoOscuro, mounted]);

  // Cargar preferencias desde servidor primero, luego localStorage
  useEffect(() => {
    if (!mounted || status === 'loading') return;

    const cargarPreferencias = async () => {
      try {
      

        // Fallback a localStorage si no hay servidor o sesión
        const temaGuardado = getStorageItem('tema-personalizado');
        const modoGuardado = getStorageItem('modo-oscuro', 'system') as ModoOscuro;

        if (temaGuardado) {
          const tema = TEMAS_PREDEFINIDOS.find(t => t.id === temaGuardado);
          if (tema) setTemaActual(tema);
        }

        if (modoGuardado && ['light', 'dark', 'system'].includes(modoGuardado)) {
          setModoOscuro(modoGuardado);
        }
      } catch (error) {
        console.error('Error cargando preferencias de tema:', error);
      }
    };

    cargarPreferencias();
  }, [mounted, session, status, serverSynced]);

  // Cambiar tema con sincronización al servidor
  const cambiarTema = useCallback(async (temaId: string) => {
    const nuevoTema = TEMAS_PREDEFINIDOS.find(t => t.id === temaId);
    if (nuevoTema) {
      setTemaActual(nuevoTema);
      setStorageItem('tema-personalizado', temaId);

     
    }
  }, [session, modoOscuro]);

  // Cambiar modo oscuro con sincronización al servidor
  const cambiarModoOscuro = useCallback(async (modo: ModoOscuro) => {
    setModoOscuro(modo);
    setStorageItem('modo-oscuro', modo);

   
  }, [session, temaActual.id]);

  // Obtener colores actuales según el modo
  const coloresActuales = isDark ? temaActual.colores.dark : temaActual.colores.light;

  // Aplicar clase al document y CSS variables globales
  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;

    // Aplicar clase de tema
    document.documentElement.className = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', temaActual.id);

    // Aplicar CSS variables globales para asegurar consistencia
    const root = document.documentElement;
    const colores = coloresActuales;

    // Aplicar variables CSS principales
    root.style.setProperty('--theme-primary', colores.primary);
    root.style.setProperty('--theme-secondary', colores.secondary);
    root.style.setProperty('--theme-accent', colores.accent);
    root.style.setProperty('--theme-background', colores.background);
    root.style.setProperty('--theme-surface', colores.surface);
    root.style.setProperty('--theme-text', colores.text);
    root.style.setProperty('--theme-text-secondary', colores.textSecondary);
    root.style.setProperty('--theme-border', colores.border);
    root.style.setProperty('--theme-success', colores.success);
    root.style.setProperty('--theme-warning', colores.warning);
    root.style.setProperty('--theme-error', colores.error);
    root.style.setProperty('--theme-info', colores.info);

    // Aplicar al body también para consistencia global
    document.body.className = `${colores.background} ${colores.text}`;

  }, [isDark, temaActual.id, coloresActuales, mounted]);

  return {
    temaActual,
    modoOscuro,
    isDark,
    cambiarTema,
    cambiarModoOscuro,
    coloresActuales,
    particulas: temaActual.particulas,
    serverSynced
  };
};

// Provider del contexto
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeLogic = useThemeLogic();

  return React.createElement(
    ThemeContext.Provider,
    { value: themeLogic },
    children
  );
}
