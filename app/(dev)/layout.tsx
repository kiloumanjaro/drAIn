import { notFound } from 'next/navigation';

/**
 * Developer-only pages (the component gallery). They 404 in production
 * builds so they aren't reachable on the deployed site.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <>{children}</>;
}
