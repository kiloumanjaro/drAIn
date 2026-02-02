import LoginForm from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
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
      </div>
    </main>
  );
}
