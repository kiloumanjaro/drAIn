import Image from 'next/image';
import Link from 'next/link';

// The shell both auth pages share. min-h-dvh with my-auto, not a fixed
// height with items-center: on a short screen the card then starts at the
// top and the page scrolls, instead of the card's top being cut off.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center bg-gray-100 px-4 py-8 outline-none"
    >
      <div className="my-auto w-full max-w-md">
        <Link
          href="/"
          aria-label="drAIn home"
          className="mx-auto mb-6 block w-fit rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 focus-visible:outline-none"
        >
          <Image
            src="/images/logo.png"
            alt=""
            width={64}
            height={64}
            priority
          />
        </Link>
        <div className="rounded-2xl bg-white p-6 shadow">{children}</div>
      </div>
    </main>
  );
}
