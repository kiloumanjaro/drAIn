import { describe, expect, it } from 'vitest';
import {
  FALLBACK_MODEL_INFO,
  caveatDetails,
  caveatHeadline,
  readModelInfo,
} from './model-info';

describe('readModelInfo', () => {
  it('reads the block a live run sends', () => {
    const response = { metadata: { model_info: FALLBACK_MODEL_INFO } };
    expect(readModelInfo(response)).toEqual(FALLBACK_MODEL_INFO);
  });

  it('is null for a response without one', () => {
    expect(readModelInfo({ metadata: {} })).toBeNull();
    expect(readModelInfo(null)).toBeNull();
  });
});

describe('caveatHeadline', () => {
  it('says the ratings are simulated, dated, uncalibrated and provisional', () => {
    expect(caveatHeadline(FALLBACK_MODEL_INFO)).toBe(
      'Simulated, not observed · network model from 18 Nov 2025 · not checked against field records · provisional thresholds'
    );
  });

  it('drops what no longer applies', () => {
    const calibrated = {
      ...FALLBACK_MODEL_INFO,
      network_built_on: null,
      calibrated: true,
      hazard_score: { ...FALLBACK_MODEL_INFO.hazard_score, provisional: false },
    };
    expect(caveatHeadline(calibrated)).toBe('Simulated, not observed');
  });
});

describe('caveatDetails', () => {
  it('warns that stored and live ratings come from different models', () => {
    const stored = caveatDetails(FALLBACK_MODEL_INFO, 'stored').join(' ');
    expect(stored).toMatch(/earlier clustering model/);
  });

  it('spells out the live weights from the payload', () => {
    const live = caveatDetails(FALLBACK_MODEL_INFO, 'live').join(' ');
    expect(live).toContain('flood volume 50%');
    expect(live).toContain('45 ML');
  });

  it('never lets "No hazard" read as "safe"', () => {
    expect(caveatDetails(FALLBACK_MODEL_INFO, 'live')[0]).toMatch(
      /not that the drain is safe/
    );
  });
});
