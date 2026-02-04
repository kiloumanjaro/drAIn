'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #ced1cd',
          boxShadow: 'none',
          color: '#7c7282',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
