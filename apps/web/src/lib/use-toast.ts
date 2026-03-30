'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
  /** Auto-dismiss duration in ms. Default: 4000. */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: string;
  open: boolean;
}

/** Global singleton emitter so the hook works from any component tree depth. */
type Listener = (toast: ToastState) => void;
const listeners: Listener[] = [];

let counter = 0;

/**
 * Imperatively show a toast notification from anywhere in the component tree.
 * The `<Toaster>` component must be mounted (it is added to the locale layout).
 */
export function toast(options: ToastOptions): void {
  const id = `toast-${++counter}`;
  const state: ToastState = { ...options, id, open: true };
  listeners.forEach((l) => l(state));
}

/**
 * Internal hook consumed by `<Toaster>` to receive toast events.
 * Not intended for direct use — call `toast()` instead.
 */
export function useToastStore() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    // Remove from DOM after exit animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    const handler: Listener = (toastState) => {
      setToasts((prev) => [...prev, toastState]);
      const duration = toastState.duration ?? 4000;
      const timer = setTimeout(() => dismiss(toastState.id), duration);
      timers.current.set(toastState.id, timer);
    };

    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, [dismiss]);

  return { toasts, dismiss };
}
