import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The preview card shown when a link to any page is shared. Built at build
// time from the logo and the landing page's colours.
export const alt =
  'drAIn: drainage flood simulation and citizen flood reporting';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const logo = await readFile(join(process.cwd(), 'public/images/logo.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        background: '#f0f0f0',
        color: '#34332e',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> only */}
      <img src={logoSrc} alt="" width={160} height={160} />
      <div style={{ fontSize: 96, fontWeight: 700 }}>drAIn</div>
      <div style={{ fontSize: 36, color: '#5b5a55' }}>
        Drainage flood simulation and citizen flood reporting
      </div>
    </div>,
    size
  );
}
