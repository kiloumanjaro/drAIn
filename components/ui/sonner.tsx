'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';
import { toastColorVariables } from './toast-colors';

const Toaster = ({ style, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      // Error, success, info and warning each get their own colours. They
      // were all the same grey on white, so a failure looked like a success.
      richColors
      style={{ ...toastColorVariables(), ...style }}
      toastOptions={{
        style: {
          boxShadow: 'none',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
