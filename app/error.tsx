'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#e8e8e8]/50 p-8 text-center">
      <h1 className="text-2xl font-semibold text-[#34332e]">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-gray-600">
        An unexpected error occurred while loading this page. You can try again,
        and if the problem persists please report it.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
