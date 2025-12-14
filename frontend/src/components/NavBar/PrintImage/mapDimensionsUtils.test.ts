import type { AspectRatio } from 'components/MapExport/types';
import {
  calculateExportDimensions,
  getRecommendedAspectRatio,
} from './mapDimensionsUtils';

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

describe('getRecommendedAspectRatio', () => {
  describe('landscape bounding boxes', () => {
    test('should recommend 4:3 for wide landscape bounds', () => {
      // Very wide: 4:3 ratio is 1.333
      const boundingBox = [0, 0, 40, 30]; // ratio = 40/30 = 1.333
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('4:3');
      expect(result.options).toEqual(['4:3', '1:1', '2:3']);
    });

    test('should recommend 3:2 for moderately wide landscape bounds', () => {
      // 3:2 ratio is 1.5
      const boundingBox = [0, 0, 30, 20]; // ratio = 30/20 = 1.5
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('3:2');
      expect(result.options).toEqual(['3:2', '1:1', '2:3']);
    });

    test('should recommend 6:5 for slightly wide landscape bounds', () => {
      // 6:5 ratio is 1.2
      const boundingBox = [0, 0, 24, 20]; // ratio = 24/20 = 1.2
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('6:5');
      expect(result.options).toEqual(['6:5', '1:1', '2:3']);
    });

    test('should recommend closest landscape ratio for wide bounds', () => {
      // Between 4:3 (1.333) and 3:2 (1.5), closer to 4:3
      // 1.4 - 1.333 = 0.067 vs 1.5 - 1.4 = 0.1, so 4:3 is closer
      const boundingBox = [0, 0, 28, 20]; // ratio = 28/20 = 1.4
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('4:3');
      expect(result.options).toEqual(['4:3', '1:1', '2:3']);
    });
  });

  describe('portrait bounding boxes', () => {
    test('should recommend 2:3 for portrait bounds', () => {
      // 2:3 ratio is 0.667
      const boundingBox = [0, 0, 20, 30]; // ratio = 20/30 = 0.667
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('2:3');
      expect(result.options).toEqual(['3:2', '1:1', '2:3']);
    });

    test('should recommend 2:3 for tall portrait bounds', () => {
      // Very tall, close to 2:3
      const boundingBox = [0, 0, 10, 15]; // ratio = 10/15 = 0.667
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('2:3');
      expect(result.options).toEqual(['3:2', '1:1', '2:3']);
    });
  });

  describe('square bounding boxes', () => {
    test('should recommend 1:1 for square bounds', () => {
      const boundingBox = [0, 0, 30, 30]; // ratio = 30/30 = 1.0
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('1:1');
      // 1:1 is not in LANDSCAPE_RATIOS, so should default to landscape options
      expect(result.options).toEqual(['3:2', '1:1', '2:3']);
    });

    test('should recommend closest ratio for near-square bounds', () => {
      // Close to 1:1 but slightly wider
      const boundingBox = [0, 0, 31, 30]; // ratio = 31/30 = 1.033
      const result = getRecommendedAspectRatio(boundingBox);

      // Should be closest to 1:1
      expect(result.recommended).toBe('1:1');
    });
  });

  describe('options filtering', () => {
    test('should provide landscape options when recommended is landscape', () => {
      const boundingBox = [0, 0, 40, 30]; // 4:3
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('4:3');
      expect(result.options).toHaveLength(3);
      expect(result.options).toContain('4:3');
      expect(result.options).toContain('1:1');
      expect(result.options).toContain('2:3');
    });

    test('should provide default options when recommended is portrait', () => {
      const boundingBox = [0, 0, 20, 30]; // 2:3
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('2:3');
      expect(result.options).toHaveLength(3);
      expect(result.options).toEqual(['3:2', '1:1', '2:3']);
    });

    test('should provide default options when recommended is square', () => {
      const boundingBox = [0, 0, 30, 30]; // 1:1
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('1:1');
      expect(result.options).toEqual(['3:2', '1:1', '2:3']);
    });
  });

  describe('edge cases', () => {
    test('should handle very wide bounding boxes', () => {
      const boundingBox = [0, 0, 100, 10]; // ratio = 10.0
      const result = getRecommendedAspectRatio(boundingBox);

      // Should recommend the widest available landscape ratio (3:2 = 1.5)
      expect(result.recommended).toBe('3:2');
    });

    test('should handle very tall bounding boxes', () => {
      const boundingBox = [0, 0, 10, 100]; // ratio = 0.1
      const result = getRecommendedAspectRatio(boundingBox);

      // Should recommend the tallest available ratio (2:3 = 0.667)
      expect(result.recommended).toBe('2:3');
    });

    test('should handle zero-width bounding box gracefully', () => {
      const boundingBox = [0, 0, 0, 30];
      const result = getRecommendedAspectRatio(boundingBox);

      // Should default to first ratio when width is 0
      expect(result.recommended).toBeDefined();
      expect(result.options).toHaveLength(3);
    });

    test('should handle zero-height bounding box gracefully', () => {
      const boundingBox = [0, 0, 30, 0];
      const result = getRecommendedAspectRatio(boundingBox);

      // Should default to first ratio when height is 0
      expect(result.recommended).toBeDefined();
      expect(result.options).toHaveLength(3);
    });
  });

  describe('closest match calculation', () => {
    test('should find closest aspect ratio match', () => {
      // Test various ratios to ensure closest match logic works
      const testCases = [
        { bounds: [0, 0, 40, 30], expected: '4:3' }, // 1.333
        { bounds: [0, 0, 30, 20], expected: '3:2' }, // 1.5
        { bounds: [0, 0, 24, 20], expected: '6:5' }, // 1.2
        { bounds: [0, 0, 30, 30], expected: '1:1' }, // 1.0
        { bounds: [0, 0, 20, 30], expected: '2:3' }, // 0.667
      ];

      testCases.forEach(({ bounds, expected }) => {
        const result = getRecommendedAspectRatio(bounds);
        expect(result.recommended).toBe(expected);
      });
    });

    test('should handle ratios between available options', () => {
      // Between 6:5 (1.2) and 4:3 (1.333), closer to 4:3
      const boundingBox = [0, 0, 26, 20]; // ratio = 1.3
      const result = getRecommendedAspectRatio(boundingBox);

      expect(result.recommended).toBe('4:3');
    });
  });
});
