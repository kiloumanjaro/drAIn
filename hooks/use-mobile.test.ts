import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHONE_QUERY } from '@/lib/map/report-pin';
import { isPhone, subscribeToPhone } from './use-mobile';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubWindow(matches: boolean) {
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  const matchMedia = vi.fn(() => ({
    matches,
    addEventListener,
    removeEventListener,
  }));
  vi.stubGlobal('window', { matchMedia });
  return { matchMedia, addEventListener, removeEventListener };
}

describe('useIsMobile', () => {
  it('is false on the server', () => {
    expect(isPhone()).toBe(false);
  });

  it('asks the browser the shared phone query', () => {
    const { matchMedia } = stubWindow(true);
    expect(isPhone()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(PHONE_QUERY);
    stubWindow(false);
    expect(isPhone()).toBe(false);
  });

  it('listens to that query and stops on unsubscribe', () => {
    const { matchMedia, addEventListener, removeEventListener } =
      stubWindow(false);
    const onChange = () => {};
    const unsubscribe = subscribeToPhone(onChange);
    expect(matchMedia).toHaveBeenCalledWith(PHONE_QUERY);
    expect(addEventListener).toHaveBeenCalledWith('change', onChange);
    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith('change', onChange);
  });
});
