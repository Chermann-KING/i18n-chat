import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Custom 404 page — shown when no matching route is found within the locale segment.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <MessageSquareText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-7xl font-bold tracking-tight">404</p>
          <p className="mt-2 text-lg font-medium">Page introuvable</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            La page que vous cherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
      </div>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
