import { redirect } from 'next/navigation';

/**
 * Root page — immediately redirects to the login page.
 * Authentication and routing are handled by the app layout in Phase 8.
 */
export default function RootPage(): never {
  redirect('/login');
}
