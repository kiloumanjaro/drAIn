'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/context/AuthProvider';
import client from '@/app/api/client';

export function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await client.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="border-b-foreground/10 flex h-16 w-full justify-center border-b">
      <div className="flex w-full items-center justify-between p-3 px-5 text-sm">
        <div className="w-72 items-center text-xl font-semibold">
          <Link href={'/'}>drAIn</Link>
        </div>

        <div className="flex gap-10 font-medium">
          <Link href={'/map'} className="hover:text-primary transition-colors">
            Map
          </Link>
          <Link
            href={'/timeline'}
            className="hover:text-primary transition-colors"
          >
            Timeline
          </Link>
          <Link
            href={'/about'}
            className="hover:text-primary transition-colors"
          >
            About
          </Link>
        </div>

        <div className="flex w-72 justify-end">
          {user ? (
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-white transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
