'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToastStore } from '@/lib/use-toast';

/**
 * Mount this component once near the root of the app (locale layout).
 * It renders all active toasts into the Radix UI viewport.
 */
export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          open={t.open}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          variant={t.variant}
        >
          <div className="grid gap-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
