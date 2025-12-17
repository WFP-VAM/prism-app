import { DateItem, DisplayDateTimestamp } from 'config/types';
import { findMatchingDateBetweenLayers } from './utils';

describe('findMatchingDateBetweenLayers', () => {
  // Helper to create a DateItem
  const createDateItem = (date: number): DateItem => ({
    displayDate: date as DisplayDateTimestamp,
    queryDate: date,
  });

  describe('forward direction', () => {
    it('should return the minimum date when all layers have dates', () => {
      const layerDates = [
        [createDateItem(100), createDateItem(200)],
        [createDateItem(150), createDateItem(250)],
        [createDateItem(120), createDateItem(220)],
      ];

      const result = findMatchingDateBetweenLayers(layerDates, 'forward');
      expect(result).toBe(100);
    });

    it('should return the minimum date when one layer has no dates', () => {
      const layerDates = [
        [createDateItem(100), createDateItem(200)],
        [], // empty layer
        [createDateItem(120), createDateItem(220)],
      ];

      const result = findMatchingDateBetweenLayers(layerDates, 'forward');
      expect(result).toBe(100);
    });

    it('should return undefined when all layers have no dates', () => {
      const layerDates: DateItem[][] = [[], [], []];

      const result = findMatchingDateBetweenLayers(layerDates, 'forward');
      expect(result).toBeUndefined();
    });

    it('should handle three layers with non-sequential dates', () => {
      // Simulating the bug scenario:
      // - Layer 1: daily data (100, 101, 102, 103, ...)
      // - Layer 2: dekadal data (every 10 days: 100, 110, 120, ...)
      // - Layer 3: irregular data (100, 115, 145, ...)
      const layerDates = [
        [createDateItem(101), createDateItem(102), createDateItem(103)],
        [createDateItem(110), createDateItem(120)],
        [createDateItem(115), createDateItem(145)],
      ];

      const result = findMatchingDateBetweenLayers(layerDates, 'forward');
      // Should return 101 (the earliest next date from any layer)
      expect(result).toBe(101);
    });
  });

  describe('back direction', () => {
    it('should return the maximum date when all layers have dates', () => {
      const layerDates = [
        [createDateItem(80), createDateItem(90)],
        [createDateItem(70), createDateItem(85)],
        [createDateItem(75), createDateItem(88)],
      ];

      const result = findMatchingDateBetweenLayers(layerDates, 'back');
      expect(result).toBe(90);
    });

    it('should return the maximum date when one layer has no dates', () => {
      const layerDates = [
        [createDateItem(80), createDateItem(90)],
        [], // empty layer
        [createDateItem(75), createDateItem(88)],
      ];

      const result = findMatchingDateBetweenLayers(layerDates, 'back');
      expect(result).toBe(90);
    });

    it('should return undefined when all layers have no dates', () => {
      const layerDates: DateItem[][] = [[], [], []];

      const result = findMatchingDateBetweenLayers(layerDates, 'back');
      expect(result).toBeUndefined();
    });

    it('should handle three layers with non-sequential dates going backwards', () => {
      // Going backwards from date 100:
      // - Layer 1: daily data (..., 97, 98, 99)
      // - Layer 2: dekadal data (..., 80, 90)
      // - Layer 3: irregular data (..., 75, 95)
      const layerDates = [
        [createDateItem(97), createDateItem(98), createDateItem(99)],
        [createDateItem(80), createDateItem(90)],
        [createDateItem(75), createDateItem(95)],
      ];

      const result = findMatchingDateBetweenLayers(layerDates, 'back');
      // Should return 99 (the latest previous date from any layer)
      expect(result).toBe(99);
    });
  });
});
