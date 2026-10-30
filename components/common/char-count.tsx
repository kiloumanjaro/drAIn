import { cn } from '@/lib/utils';

/** The counter appears once this share of the limit is used. */
const NEAR_LIMIT = 0.9;

/** True when the text is within about 10% of its limit. */
export function isNearLimit(length: number, max: number): boolean {
  return max > 0 && length >= max * NEAR_LIMIT;
}

interface CharCountProps {
  value: string;
  max: number;
  className?: string;
}

/**
 * "950 / 1000" beside an input with a maxLength, shown only when the text
 * is close to the limit. The element is always in the page, empty, so the
 * count is announced when it arrives.
 */
export function CharCount({ value, max, className }: CharCountProps) {
  return (
    <span
      aria-live="polite"
      className={cn('text-muted-foreground text-xs tabular-nums', className)}
    >
      {isNearLimit(value.length, max) ? `${value.length} / ${max}` : ''}
    </span>
  );
}
