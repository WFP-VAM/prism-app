import {
  FTW_CONFIDENCE_MAX,
  ftwConfidenceFilter,
  ftwConfidenceMaskMin,
  ftwConfidenceRawThreshold,
} from './ftwConfidence';

describe('ftwConfidence', () => {
  test('maps Explorer default 70% to raw threshold and uint8 mask min', () => {
    expect(ftwConfidenceRawThreshold(70)).toBeCloseTo(0.7 * FTW_CONFIDENCE_MAX);
    expect(ftwConfidenceMaskMin(70)).toBeCloseTo(
      0.7 * FTW_CONFIDENCE_MAX * 200,
    );
  });

  test('builds a MapLibre filter on confidence_mean', () => {
    expect(ftwConfidenceFilter(70)).toEqual([
      '>',
      ['get', 'confidence_mean'],
      ftwConfidenceRawThreshold(70),
    ]);
  });
});
