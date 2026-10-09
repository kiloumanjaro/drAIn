'use client';

import { useState } from 'react';
import client from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* Always in the page, so screen readers announce the text when it
          arrives; an alert added together with its text is often missed. */}
      <p
        id="login-error"
        role="alert"
        className={error ? 'text-sm text-red-700' : 'sr-only'}
      >
        {error}
      </p>

      <div>
        <label
          htmlFor="login-email"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="login-password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
