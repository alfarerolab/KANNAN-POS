"use client";

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutsProps {
  onNewProduct?: () => void;
  onEditProduct?: () => void;
  onProcessSale?: () => void;
  onToggleSearch?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
  onFocusSearch?: () => void;
  onToggleAccessibility?: () => void;
}

export const useKeyboardShortcuts = ({
  onNewProduct,
  onEditProduct,
  onProcessSale,
  onToggleSearch,
  onShowHelp,
  onEscape,
  onFocusSearch,
  onToggleAccessibility
}: KeyboardShortcutsProps) => {
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Evitar ejecutar shortcuts cuando se está escribiendo en inputs
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true') {
      // Solo permitir Escape en inputs
      if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
      return;
    }

    const { ctrlKey, altKey, shiftKey, key, metaKey } = event;
    const modifierKey = ctrlKey || metaKey; // Soporte para Mac (Cmd) y Windows/Linux (Ctrl)

    // Ctrl/Cmd + N: Nuevo producto
    if (modifierKey && key === 'n' && onNewProduct) {
      event.preventDefault();
      onNewProduct();
      return;
    }

    // F2: Editar producto
    if (key === 'F2' && onEditProduct) {
      event.preventDefault();
      onEditProduct();
      return;
    }

    // Ctrl/Cmd + S: Procesar venta
    if (modifierKey && key === 's' && onProcessSale) {
      event.preventDefault();
      onProcessSale();
      return;
    }

    // Ctrl/Cmd + F: Enfocar búsqueda
    if (modifierKey && key === 'f' && onFocusSearch) {
      event.preventDefault();
      onFocusSearch();
      return;
    }

    // Ctrl/Cmd + K: Toggle búsqueda rápida
    if (modifierKey && key === 'k' && onToggleSearch) {
      event.preventDefault();
      onToggleSearch();
      return;
    }

    // F1: Mostrar ayuda/onboarding
    if (key === 'F1' && onShowHelp) {
      event.preventDefault();
      onShowHelp();
      return;
    }

    // Escape: Cancelar/cerrar
    if (key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    // Ctrl/Cmd + Alt + A: Toggle modo accesibilidad
    if (modifierKey && altKey && key === 'a' && onToggleAccessibility) {
      event.preventDefault();
      onToggleAccessibility();
      return;
    }

    // Números 1-9: Selección rápida de categorías o productos
    if (/^[1-9]$/.test(key) && !modifierKey && !altKey && !shiftKey) {
      // Implementar lógica de selección rápida si es necesario
      // Por ahora solo prevenimos el comportamiento por defecto
      // event.preventDefault();
    }

  }, [onNewProduct, onEditProduct, onProcessSale, onToggleSearch, onShowHelp, onEscape, onFocusSearch, onToggleAccessibility]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Retornar función para mostrar shortcuts disponibles
  const getAvailableShortcuts = useCallback(() => {
    const shortcuts = [];

    if (onNewProduct) shortcuts.push({ key: 'Ctrl+N', description: 'Nuevo producto' });
    if (onEditProduct) shortcuts.push({ key: 'F2', description: 'Editar producto seleccionado' });
    if (onProcessSale) shortcuts.push({ key: 'Ctrl+S', description: 'Procesar venta' });
    if (onFocusSearch) shortcuts.push({ key: 'Ctrl+F', description: 'Buscar productos' });
    if (onToggleSearch) shortcuts.push({ key: 'Ctrl+K', description: 'Búsqueda rápida' });
    if (onShowHelp) shortcuts.push({ key: 'F1', description: 'Mostrar ayuda' });
    if (onEscape) shortcuts.push({ key: 'Esc', description: 'Cancelar/Cerrar' });
    if (onToggleAccessibility) shortcuts.push({ key: 'Ctrl+Alt+A', description: 'Modo accesibilidad' });

    return shortcuts;
  }, [onNewProduct, onEditProduct, onProcessSale, onToggleSearch, onShowHelp, onEscape, onFocusSearch, onToggleAccessibility]);

  return {
    getAvailableShortcuts
  };
};
