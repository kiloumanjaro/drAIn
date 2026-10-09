/**
 * Toast colours by type, as the CSS variables sonner reads. Set here rather
 * than left to sonner's `richColors` defaults, whose text falls short of
 * 4.5:1 on its own backgrounds (warning is under 3:1). The same in light and
 * dark, as the toasts were before.
 */
export const TOAST_COLORS = {
  normal: { bg: '#ffffff', border: '#ced1cd', text: '#7c7282' },
  success: { bg: '#ecfdf3', border: '#bffcd9', text: '#166534' },
  info: { bg: '#f0f8ff', border: '#d3e0fd', text: '#1d4ed8' },
  warning: { bg: '#fffcf0', border: '#fdf5d3', text: '#92400e' },
  error: { bg: '#fff0f0', border: '#ffe0e1', text: '#b91c1c' },
} as const;

/** `{ '--error-bg': '#fff0f0', ... }`, for the toaster's `style`. */
export function toastColorVariables(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(TOAST_COLORS).flatMap(([type, colors]) =>
      Object.entries(colors).map(([part, value]) => [
        `--${type}-${part}`,
        value,
      ])
    )
  );
}

/** WCAG contrast ratio of two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
