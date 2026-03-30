import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

/**
 * Root-level 404 — replaces the Next.js default "This page could not be found."
 * Must live at app/not-found.tsx to catch all unmatched routes.
 */
export default function NotFound() {
  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          background: '#09090b',
          color: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '1rem',
              background: '#27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageSquareText size={32} color="#71717a" />
          </div>
          <div>
            <p style={{ fontSize: '4.5rem', fontWeight: 700, lineHeight: 1, margin: 0 }}>404</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '0.5rem 0 0' }}>
              Page introuvable
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#71717a',
                margin: '0.25rem 0 0',
                maxWidth: '24rem',
              }}
            >
              La page que vous cherchez n&apos;existe pas ou a été déplacée.
            </p>
          </div>
        </div>
        <Link
          href="/"
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.375rem',
            background: '#fafafa',
            color: '#09090b',
            fontWeight: 500,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          Retour à l&apos;accueil
        </Link>
      </body>
    </html>
  );
}
