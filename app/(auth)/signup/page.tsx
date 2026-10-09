import type { Metadata } from 'next';
import SignUpForm from '@/components/auth/sign-up-form';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign Up',
};

// The page shell (main landmark, logo, card) is in the auth layout.
export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-4 text-center text-2xl font-bold">Create an Account</h1>
      <SignUpForm />
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  );
}
