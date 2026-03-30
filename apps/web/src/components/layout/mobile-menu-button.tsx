'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/lib/stores/sidebar.store';

/**
 * Hamburger button — visible only on mobile (hidden on md+).
 * Opens the sidebar drawer via {@link useSidebarStore}.
 */
export function MobileMenuButton() {
  const open = useSidebarStore((s) => s.open);
  return (
    <Button variant="ghost" size="icon" className="mr-1 md:hidden" onClick={open} aria-label="Menu">
      <Menu className="h-5 w-5" />
    </Button>
  );
}
