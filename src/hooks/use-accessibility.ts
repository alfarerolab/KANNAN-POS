"use client";

import { useState, useEffect, useCallback } from 'react';

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  keyboardNavigation: boolean;
  screenReaderFriendly: boolean;
  focusIndicators: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  keyboardNavigation: true,
  screenReaderFriendly: false,
  focusIndicators: true,
};

const STORAGE_KEY = 'pos-accessibility-settings';

export const useAccessibility = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isEnabled, setIsEnabled] = useState(false);

  // Cargar configuración desde localStorage al inicializar
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setIsEnabled(Object.values(parsed).some(Boolean));
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }

    // Detectar preferencias del sistema
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');

    if (prefersReducedMotion.matches) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }

    if (prefersHighContrast.matches) {
      setSettings(prev => ({ ...prev, highContrast: true }));
    }
  }, []);

  // Guardar configuración en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setIsEnabled(Object.values(settings).some(Boolean));
  }, [settings]);

  // Aplicar clases CSS basadas en la configuración
  useEffect(() => {
    const root = document.documentElement;

    // Alto contraste
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Texto grande
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Movimiento reducido
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Navegación por teclado mejorada
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }

    // Indicadores de foco mejorados
    if (settings.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }

    // Screen reader friendly
    if (settings.screenReaderFriendly) {
      root.classList.add('screen-reader-friendly');
    } else {
      root.classList.remove('screen-reader-friendly');
    }

  }, [settings]);

  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const toggleSetting = useCallback((key: keyof AccessibilitySettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const toggleAccessibilityMode = useCallback(() => {
    if (isEnabled) {
      // Desactivar todo
      setSettings(DEFAULT_SETTINGS);
    } else {
      // Activar configuración básica de accesibilidad
      setSettings({
        highContrast: true,
        largeText: true,
        reducedMotion: true,
        keyboardNavigation: true,
        screenReaderFriendly: true,
        focusIndicators: true,
      });
    }
  }, [isEnabled]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Funciones para anunciar cambios a lectores de pantalla
  const announceToScreenReader = useCallback((message: string) => {
    if (!settings.screenReaderFriendly) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [settings.screenReaderFriendly]);

  return {
    settings,
    isEnabled,
    updateSetting,
    toggleSetting,
    toggleAccessibilityMode,
    resetSettings,
    announceToScreenReader,
  };
};
