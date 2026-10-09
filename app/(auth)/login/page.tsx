import type { Metadata } from 'next';
import LoginForm from '@/components/auth/login-form';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Log In',
};

// The page shell (main landmark, logo, card) is in the auth layout.
export default function LoginPage() {
  return (
    <>
      <h1 className="mb-4 text-center text-2xl font-bold">Log In</h1>
      <LoginForm />

      <p className="mt-4 text-center text-sm text-gray-600">
        Don’t have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
