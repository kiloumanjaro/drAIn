import { describe, expect, it } from 'vitest';

import { transformToNodeDetails } from './simulation';
import type { NodeSimulationResult } from './simulation';

function result(
  overrides: Partial<NodeSimulationResult> = {}
): NodeSimulationResult {
  return {
    Node: 'I-1',
    Hours_Flooded: 2,
    Maximum_Rate_CMS: 0.5,
    Time_of_Max_days: 0,
    Time_of_Max_hr_min: 20,
    Total_Flood_Volume_10e6_ltr: 42,
    Time_After_Raining_min: 120,
    Vulnerability_Category: 'Medium',
    Vulnerability_Score: 0.6,
    ...overrides,
  };
}

describe('transformToNodeDetails', () => {
  it('maps the backend field names onto the table shape', () => {
    const [row] = transformToNodeDetails([result()]);
    expect(row).toMatchObject({
      Node_ID: 'I-1',
      Vulnerability_Category: 'Medium',
      Hours_Flooded: 2,
      Maximum_Rate: 0.5,
      Time_Of_Max_Occurence: 20,
      Total_Flood_Volume: 42,
      Time_Before_Overflow: 120,
    });
  });

  it.each([
    [5, 4],
    [4.1, 4],
    [2, 3],
    [1.1, 3],
    [0.5, 2],
    [0, 1],
    [-1, 1],
  ])('ranks a score of %s as %s', (score, rank) => {
    const [row] = transformToNodeDetails([
      result({ Vulnerability_Score: score }),
    ]);
    expect(row.Vulnerability_Rank).toBe(rank);
  });

  it.each([
    [1, 10],
    [0.5, 10],
    [2, 25],
    [3, 50],
    [24, 50],
  ])('approximates a %s-hour storm as a %s-year return period', (hours, yr) => {
    const [row] = transformToNodeDetails([result()], hours);
    expect(row.YR).toBe(yr);
  });

  it('defaults to a one-hour storm', () => {
    expect(transformToNodeDetails([result()])[0].YR).toBe(10);
  });

  it('returns nothing for an empty response', () => {
    expect(transformToNodeDetails([])).toEqual([]);
  });
});
