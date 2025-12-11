import { calculateMapDimensions } from './mapDimensionsUtils';
import { MapDimensions } from './printConfig.context';

describe('calculateMapDimensions', () => {
  const baseDimensions: MapDimensions = {
    width: 80,
    height: 60,
    aspectRatio: '4:3',
  };

  const availableWidths = [50, 60, 70, 80, 90, 100];

  describe('changing width only', () => {
    test('should update width and recalculate height', () => {
      const result = calculateMapDimensions(baseDimensions, {
        newWidth: 60,
        availableWidths,
      });

      expect(result.width).toBe(60);
      expect(result.height).toBe(45); // 60 * 3 / 4
      expect(result.aspectRatio).toBe('4:3');
    });

    test('should handle width change that keeps height <= 100%', () => {
      const result = calculateMapDimensions(baseDimensions, {
        newWidth: 100,
        availableWidths,
      });

      expect(result.width).toBe(100);
      expect(result.height).toBe(75); // 100 * 3 / 4
      expect(result.aspectRatio).toBe('4:3');
    });
  });

  describe('changing aspect ratio only', () => {
    test('should update aspect ratio and recalculate height', () => {
      const result = calculateMapDimensions(baseDimensions, {
        newAspectRatio: '1:1',
        availableWidths,
      });

      expect(result.width).toBe(80);
      expect(result.height).toBe(80); // 80 * 1 / 1
      expect(result.aspectRatio).toBe('1:1');
    });

    test('should handle aspect ratio change that keeps height <= 100%', () => {
      const result = calculateMapDimensions(baseDimensions, {
        newAspectRatio: '3:2',
        availableWidths,
      });

      expect(result.width).toBe(80);
      expect(result.height).toBe(53); // Math.round(80 * 2 / 3)
      expect(result.aspectRatio).toBe('3:2');
    });
  });

  describe('changing both width and aspect ratio', () => {
    test('should update both and recalculate height', () => {
      const result = calculateMapDimensions(baseDimensions, {
        newWidth: 70,
        newAspectRatio: '1:1',
        availableWidths,
      });

      expect(result.width).toBe(70);
      expect(result.height).toBe(70); // 70 * 1 / 1
      expect(result.aspectRatio).toBe('1:1');
    });
  });

  describe('height exceeding 100% - snapping behavior', () => {
    test('should snap to largest valid width when height would exceed 100%', () => {
      // With 4:3 aspect ratio, width 100 would give height 75 (OK)
      // But if we try width 100 with 2:3 (portrait), height would be 150 (exceeds 100)
      const result = calculateMapDimensions(
        { width: 80, height: 60, aspectRatio: '4:3' },
        {
          newAspectRatio: '2:3',
          availableWidths,
        },
      );

      // With 2:3 aspect ratio and width 100, height = 150 (exceeds 100)
      // With width 66, height = 99 (valid)
      // Should snap to largest valid width
      expect(result.height).toBeLessThanOrEqual(100);
      expect(result.width).toBeLessThanOrEqual(100);
      // Should find a valid width that keeps height <= 100
      const [w, h] = result.aspectRatio.split(':').map(Number);
      const calculatedHeight = Math.round((result.width * h) / w);
      expect(calculatedHeight).toBe(result.height);
      expect(calculatedHeight).toBeLessThanOrEqual(100);
    });

    test('should snap width when new width would cause height > 100%', () => {
      // Start with a tall aspect ratio
      const tallDimensions: MapDimensions = {
        width: 50,
        height: 75,
        aspectRatio: '2:3',
      };

      const result = calculateMapDimensions(tallDimensions, {
        newWidth: 100,
        availableWidths,
      });

      // Width 100 with 2:3 would give height 150, so should snap
      expect(result.height).toBeLessThanOrEqual(100);
      expect(result.width).toBeLessThan(100); // Should be snapped down
    });

    test('should choose largest valid width option', () => {
      // With 2:3 aspect ratio, find which widths are valid
      const result = calculateMapDimensions(
        { width: 50, height: 75, aspectRatio: '2:3' },
        {
          newWidth: 100,
          availableWidths: [50, 60, 70, 80, 90, 100],
        },
      );

      // Valid widths for 2:3: 50->75, 60->90, 66->99, 70->105 (invalid)
      // So max valid is 66, but since we only have discrete options, should be 60
      expect(result.height).toBeLessThanOrEqual(100);
      // Should be the largest width that keeps height <= 100
      const validWidths = [50, 60, 70, 80, 90, 100].filter(
        w => Math.round((w * 3) / 2) <= 100,
      );
      expect(validWidths).toContain(result.width);
      expect(result.width).toBe(Math.max(...validWidths));
    });
  });

  describe('edge cases', () => {
    test('should handle exact 100% height', () => {
      // With 1:1 aspect ratio and width 100, height is exactly 100
      const result = calculateMapDimensions(
        { width: 80, height: 80, aspectRatio: '1:1' },
        {
          newWidth: 100,
          availableWidths,
        },
      );

      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    test('should preserve other properties when only width changes', () => {
      const customDimensions: MapDimensions = {
        width: 80,
        height: 60,
        aspectRatio: '4:3',
      };

      const result = calculateMapDimensions(customDimensions, {
        newWidth: 60,
        availableWidths,
      });

      expect(result.aspectRatio).toBe('4:3');
    });

    test('should update aspect ratio when provided', () => {
      const result = calculateMapDimensions(baseDimensions, {
        newAspectRatio: '3:2',
        availableWidths,
      });

      expect(result.aspectRatio).toBe('3:2');
    });
  });

  describe('different aspect ratios', () => {
    test.each([
      ['4:3', 80, 60],
      ['1:1', 80, 80],
      ['3:2', 80, 53],
      ['6:5', 80, 67],
      ['2:3', 80, 120], // This would exceed 100, so should snap
    ])(
      'should handle aspect ratio %s with width 80',
      (aspectRatio, expectedWidth, expectedHeight) => {
        const result = calculateMapDimensions(baseDimensions, {
          newAspectRatio: aspectRatio as any,
          availableWidths,
        });

        if (expectedHeight <= 100) {
          expect(result.width).toBe(expectedWidth);
          expect(result.height).toBe(expectedHeight);
        } else {
          // Should snap to keep height <= 100
          expect(result.height).toBeLessThanOrEqual(100);
          expect(result.width).toBeLessThanOrEqual(expectedWidth);
        }
        expect(result.aspectRatio).toBe(aspectRatio);
      },
    );
  });

  describe('rounding behavior', () => {
    test('should round height calculations correctly', () => {
      // 80 * 2 / 3 = 53.33... should round to 53
      const result = calculateMapDimensions(baseDimensions, {
        newAspectRatio: '3:2',
        availableWidths,
      });

      expect(result.height).toBe(53);
    });

    test('should round snapped width calculations correctly', () => {
      const result = calculateMapDimensions(
        { width: 50, height: 75, aspectRatio: '2:3' },
        {
          newWidth: 67,
          availableWidths: [50, 60, 67, 70, 80, 90, 100],
        },
      );

      // 67 * 3 / 2 = 100.5, should round to 101, but that exceeds 100
      // So should snap to a valid width
      expect(result.height).toBeLessThanOrEqual(100);
    });
  });
});
