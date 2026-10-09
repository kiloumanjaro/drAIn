import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#e8e8e8]/50 p-8 text-center outline-none"
    >
      <h1 className="text-4xl font-bold text-[#34332e]">404</h1>
      <p className="max-w-md text-sm text-gray-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
