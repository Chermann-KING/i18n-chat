import { redirect } from 'next/navigation';

/**
 * Root page — the middleware handles locale-prefixed redirects.
 * This fallback covers any edge case where the middleware is bypassed.
 */
export default function RootPage(): never {
  redirect('/fr/login');
}
