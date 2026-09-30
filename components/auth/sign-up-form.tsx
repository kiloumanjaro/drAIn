'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import client from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/supabase/profile';

export default function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      // After successful sign-up, create the profile
      await updateUserProfile(data.session, fullName, null, {});
      // ✅ Success — redirect to root
      router.push('/');
    } else {
      // Email confirmation is on: no session until the link is clicked.
      setNotice(`Check ${email} for a confirmation link, then log in.`);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name"
        className="w-full rounded border p-2"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded border p-2"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (8+ characters, upper, lower and a digit)"
        className="w-full rounded border p-2"
        minLength={8}
        required
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 p-2 text-white hover:bg-blue-700"
      >
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}
