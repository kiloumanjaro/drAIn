import { describe, expect, it } from 'vitest';
import { clientAddress, createReportLimiter } from './report-limiter';

/** A limiter on a clock the test moves by hand. */
function limiterAt(options: Parameters<typeof createReportLimiter>[0] = {}) {
  const clock = { ms: 1_000_000 };
  const limiter = createReportLimiter({ ...options, now: () => clock.ms });
  return { limiter, clock };
}

const count = (times: number, call: (i: number) => boolean) =>
  Array.from({ length: times }, (_, i) => call(i)).filter(Boolean).length;

describe('clientAddress', () => {
  it('prefers x-real-ip', () => {
    expect(
      clientAddress(
        new Headers({
          'x-real-ip': '203.0.113.7',
          'x-forwarded-for': '10.0.0.1',
        })
      )
    ).toBe('203.0.113.7');
  });

  it('takes the first forwarded address', () => {
    expect(
      clientAddress(
        new Headers({ 'x-forwarded-for': ' 2001:DB8::1 , 10.0.0.1' })
      )
    ).toBe('2001:db8::1');
  });

  it('gives every caller without an address the same key', () => {
    expect(clientAddress(new Headers())).toBe('unknown');
    expect(clientAddress(new Headers({ 'x-forwarded-for': ' , ' }))).toBe(
      'unknown'
    );
  });

  it('keeps only address characters, to a fixed length', () => {
    expect(
      clientAddress(new Headers({ 'x-real-ip': '1.2.3.4\u0007 <script>' }))
    ).toBe('1.2.3.4c');
    expect(
      clientAddress(new Headers({ 'x-real-ip': '1'.repeat(500) })).length
    ).toBe(64);
  });
});

describe('createReportLimiter: admit', () => {
  it('allows twenty reports a minute from one address, then refuses', () => {
    const { limiter } = limiterAt();
    expect(count(25, () => limiter.admit('203.0.113.7'))).toBe(20);
  });

  it('counts each address on its own', () => {
    const { limiter } = limiterAt();
    count(25, () => limiter.admit('203.0.113.7'));
    expect(limiter.admit('203.0.113.8')).toBe(true);
  });

  it('refills over time, up to the full allowance and no further', () => {
    const { limiter, clock } = limiterAt();
    count(25, () => limiter.admit('a'));

    clock.ms += 3_000; // one report every three seconds at 20 a minute
    expect(limiter.admit('a')).toBe(true);
    expect(limiter.admit('a')).toBe(false);

    clock.ms += 60 * 60_000;
    expect(count(25, () => limiter.admit('a'))).toBe(20);
  });

  it('does not refill when the clock goes backwards', () => {
    const { limiter, clock } = limiterAt();
    count(25, () => limiter.admit('a'));
    clock.ms -= 60 * 60_000;
    expect(limiter.admit('a')).toBe(false);
  });

  it('remembers a bounded number of addresses, forgetting the oldest', () => {
    const { limiter } = limiterAt({ maxAddresses: 3, perAddressPerMinute: 1 });
    for (const address of ['a', 'b', 'c']) limiter.admit(address);
    expect(limiter.admit('a')).toBe(false); // seen again: now the newest
    limiter.admit('d'); // pushes out b, the least recently seen
    expect(limiter.size().addresses).toBe(3);
    expect(limiter.admit('a')).toBe(false);
    expect(limiter.admit('c')).toBe(false);
    expect(limiter.admit('b')).toBe(true);
  });

  it('never grows past its bound however many addresses call', () => {
    const { limiter } = limiterAt({ maxAddresses: 50 });
    for (let i = 0; i < 5_000; i++) limiter.admit(`10.0.${i >> 8}.${i & 255}`);
    expect(limiter.size().addresses).toBe(50);
  });
});

describe('createReportLimiter: lineToLog', () => {
  it('logs a line once and counts the repeats', () => {
    const { limiter, clock } = limiterAt({ repeatWindowMs: 60_000 });
    expect(limiter.lineToLog('x blocked')).toBe('x blocked');
    expect(limiter.lineToLog('x blocked')).toBeNull();
    expect(limiter.lineToLog('x blocked')).toBeNull();
    expect(limiter.lineToLog('y blocked')).toBe('y blocked');

    clock.ms += 60_000;
    expect(limiter.lineToLog('x blocked')).toBe(
      'x blocked (and 2 more like it since last logged)'
    );
    expect(limiter.lineToLog('x blocked')).toBeNull();

    clock.ms += 60_000;
    expect(limiter.lineToLog('y blocked')).toBe('y blocked');
  });

  it('caps the lines all callers cause in a minute', () => {
    const { limiter, clock } = limiterAt({ totalLinesPerMinute: 5 });
    expect(count(50, (i) => limiter.lineToLog(`line ${i}`) !== null)).toBe(5);

    clock.ms += 12_000; // one line every twelve seconds at 5 a minute
    expect(limiter.lineToLog('later')).toBe('later');
    expect(limiter.lineToLog('later still')).toBeNull();
  });

  it('logs a line it had to drop once there is room again', () => {
    const { limiter, clock } = limiterAt({ totalLinesPerMinute: 1 });
    expect(limiter.lineToLog('first')).toBe('first');
    expect(limiter.lineToLog('dropped')).toBeNull();
    clock.ms += 60_000;
    expect(limiter.lineToLog('dropped')).toBe('dropped');
  });

  it('remembers a bounded number of lines', () => {
    const { limiter } = limiterAt({ maxLines: 10, totalLinesPerMinute: 1000 });
    for (let i = 0; i < 500; i++) limiter.lineToLog(`line ${i}`);
    expect(limiter.size().lines).toBe(10);
  });
});
