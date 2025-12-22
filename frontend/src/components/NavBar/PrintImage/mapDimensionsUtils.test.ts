import type { AspectRatio } from 'components/MapExport/types';
import { calculateExportDimensions } from './mapDimensionsUtils';

describe('calculateExportDimensions', () => {
  const baseWidth = 1200;

  describe('canvas dimensions calculation', () => {
    test('should calculate correct dimensions for 4:3 landscape', () => {
      const result = calculateExportDimensions('4:3');

      expect(result.canvasWidth).toBe(baseWidth);
      expect(result.canvasHeight).toBe(900); // 1200 * 3 / 4
      expect(result.mapWidthPercent).toBe(100);
      expect(result.mapHeightPercent).toBe(100);
      expect(result.isPortrait).toBe(false);
    });

    test('should calculate correct dimensions for 3:2 landscape', () => {
      const result = calculateExportDimensions('3:2');

      expect(result.canvasWidth).toBe(baseWidth);
      expect(result.canvasHeight).toBe(800); // 1200 * 2 / 3
      expect(result.mapWidthPercent).toBe(100);
      expect(result.mapHeightPercent).toBe(100);
      expect(result.isPortrait).toBe(false);
    });

    test('should calculate correct dimensions for 6:5 landscape', () => {
      const result = calculateExportDimensions('6:5');

      expect(result.canvasWidth).toBe(baseWidth);
      expect(result.canvasHeight).toBe(1000); // 1200 * 5 / 6
      expect(result.mapWidthPercent).toBe(100);
      expect(result.mapHeightPercent).toBe(100);
      expect(result.isPortrait).toBe(false);
    });

    test('should calculate correct dimensions for 1:1 square', () => {
      const result = calculateExportDimensions('1:1');

      expect(result.canvasWidth).toBe(baseWidth);
      expect(result.canvasHeight).toBe(1200); // 1200 * 1 / 1
      expect(result.mapWidthPercent).toBe(100);
      expect(result.mapHeightPercent).toBe(100);
      expect(result.isPortrait).toBe(false);
    });

    test('should calculate correct dimensions for 2:3 portrait', () => {
      const result = calculateExportDimensions('2:3');

      expect(result.canvasWidth).toBe(baseWidth);
      expect(result.canvasHeight).toBe(1800); // 1200 * 3 / 2
      expect(result.mapWidthPercent).toBe(100);
      expect(result.mapHeightPercent).toBe(100);
      expect(result.isPortrait).toBe(true);
    });
  });

  describe('portrait vs landscape detection', () => {
    test('should correctly identify landscape ratios', () => {
      const landscapeRatios: AspectRatio[] = ['4:3', '3:2', '6:5', '1:1'];

      landscapeRatios.forEach(ratio => {
        const result = calculateExportDimensions(ratio);
        expect(result.isPortrait).toBe(false);
      });
    });

    test('should correctly identify portrait ratios', () => {
      const result = calculateExportDimensions('2:3');
      expect(result.isPortrait).toBe(true);
    });
  });

  describe('map percentage values', () => {
    test('should always return 100% for map dimensions', () => {
      const allRatios: AspectRatio[] = ['4:3', '3:2', '6:5', '1:1', '2:3'];

      allRatios.forEach(ratio => {
        const result = calculateExportDimensions(ratio);
        expect(result.mapWidthPercent).toBe(100);
        expect(result.mapHeightPercent).toBe(100);
      });
    });
  });

  describe('rounding behavior', () => {
    test('should round canvas height correctly', () => {
      // 1200 * 2 / 3 = 800 (exact)
      const result = calculateExportDimensions('3:2');
      expect(result.canvasHeight).toBe(800);

      // 1200 * 3 / 4 = 900 (exact)
      const result2 = calculateExportDimensions('4:3');
      expect(result2.canvasHeight).toBe(900);

      // 1200 * 5 / 6 = 1000 (exact)
      const result3 = calculateExportDimensions('6:5');
      expect(result3.canvasHeight).toBe(1000);
    });

    test('should handle non-integer calculations with rounding', () => {
      // Test that rounding is applied consistently
      const result = calculateExportDimensions('2:3');
      // 1200 * 3 / 2 = 1800 (exact, but verify rounding works)
      expect(result.canvasHeight).toBe(1800);
      expect(Number.isInteger(result.canvasHeight)).toBe(true);
    });
  });

  describe('all aspect ratios', () => {
    test.each([
      ['4:3', 900, false],
      ['3:2', 800, false],
      ['6:5', 1000, false],
      ['1:1', 1200, false],
      ['2:3', 1800, true],
    ])(
      'should handle aspect ratio %s correctly',
      (aspectRatio, expectedHeight, isPortrait) => {
        const result = calculateExportDimensions(aspectRatio as AspectRatio);

        expect(result.canvasWidth).toBe(baseWidth);
        expect(result.canvasHeight).toBe(expectedHeight);
        expect(result.isPortrait).toBe(isPortrait);
        expect(result.mapWidthPercent).toBe(100);
        expect(result.mapHeightPercent).toBe(100);
      },
    );
  });
});
