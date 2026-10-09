'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import client from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/supabase/profile';
import { CharCount } from '@/components/common/char-count';

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

    try {
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
      } else if (data.session) {
        // After successful sign-up, create the profile
        try {
          await updateUserProfile(data.session, fullName, null, {});
        } catch (profileError) {
          // The account exists and is signed in, and the name went with the
          // sign-up itself: carry on rather than leave the form stuck. The
          // profile tab can set it again.
          console.error('Failed to save profile after sign-up:', profileError);
        }
        // ✅ Success — redirect to root
        router.push('/');
      } else {
        // Email confirmation is on: no session until the link is clicked.
        setNotice(`Check ${email} for a confirmation link, then log in.`);
      }
    } catch (signUpError) {
      // Thrown rather than returned: the request never got an answer.
      setError(
        signUpError instanceof Error
          ? signUpError.message
          : 'Could not sign up. Try again in a moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label
            htmlFor="signup-name"
            className="block text-xs font-medium text-gray-700"
          >
            Full name
          </label>
          <CharCount value={fullName} max={100} />
        </div>
        <input
          id="signup-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
          autoComplete="name"
          className="w-full rounded border p-2"
          maxLength={100}
          required
        />
      </div>
      <div>
        <label
          htmlFor="signup-email"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'signup-error' : undefined}
          className="w-full rounded border p-2"
          required
        />
      </div>
      <div>
        <label
          htmlFor="signup-password"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="new-password"
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? 'signup-password-hint signup-error' : 'signup-password-hint'
          }
          className="w-full rounded border p-2"
          minLength={8}
          required
        />
        <p id="signup-password-hint" className="mt-1 text-xs text-gray-600">
          8+ characters, with an upper-case letter, a lower-case letter and a
          digit.
        </p>
      </div>
      {/* Both stay in the page so their text is announced when it arrives. */}
      <p
        id="signup-error"
        role="alert"
        className={error ? 'text-sm text-red-700' : 'sr-only'}
      >
        {error}
      </p>
      <p
        role="status"
        className={notice ? 'text-sm text-green-700' : 'sr-only'}
      >
        {notice}
      </p>
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
