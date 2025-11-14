import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { DashboardMode, DashboardElements } from '../../config/types';
import type { ExportConfig } from './DashboardContent';

// A constant for the gap between various columns and padding
export const GAP = 16;

interface HeightConfig {
  flex: string;
  overflow: 'auto' | 'visible';
}

interface UseColumnHeightManagementParams {
  mode: DashboardMode;
  exportConfig?: ExportConfig;
  columns: DashboardElements[][];
}

interface UseColumnHeightManagementReturn {
  componentHeights: Map<string, HeightConfig>;
  columnRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  componentRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

/**
 * Custom hook for managing dynamic column heights in dashboard layout.
 *
 * Logic:
 * 1. If components fit naturally, use natural heights
 * 2. If components overflow, distribute space intelligently:
 *    - Components needing less than equal share get their natural height
 *    - Unused space is redistributed to larger components
 *    - Only overflowing components get scroll
 */
export function useColumnHeightManagement({
  mode,
  exportConfig,
  columns,
}: UseColumnHeightManagementParams): UseColumnHeightManagementReturn {
  const [componentHeights, setComponentHeights] = useState<
    Map<string, HeightConfig>
  >(new Map());
  const columnRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const componentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousHeightsRef = useRef<Map<string, HeightConfig>>(new Map());

  // Calculate dynamic component heights based on content and available space
  useEffect(() => {
    if (mode === DashboardMode.EDIT || columns.length === 0) {
      setComponentHeights(new Map());
      previousHeightsRef.current = new Map();
      return;
    }

    const calculateHeights = () => {
      const newHeights = new Map<string, HeightConfig>();

      columnRefs.current.forEach((columnElement, columnIndex) => {
        const column = columns?.[columnIndex];
        // Single component (including maps) takes natural height
        if (!column || column.length <= 1) {
          return;
        }

        const columnHeight = columnElement.clientHeight;
        const availableHeight = columnHeight - GAP * (column.length - 1);

        // Measure natural heights of all components in this column
        const tempComponentHeights: Array<{
          id: string;
          naturalHeight: number;
        }> = [];

        let totalNaturalHeight = 0;

        column.forEach((_element: DashboardElements, elementIndex: number) => {
          const componentId = `${columnIndex}-${elementIndex}`;
          const componentElement = componentRefs.current.get(componentId);

          if (componentElement) {
            // Temporarily remove constraints to get true natural height
            const currentStyle = componentElement.style.cssText;
            componentElement.style.flex = ''; // eslint-disable-line fp/no-mutation
            componentElement.style.overflow = ''; // eslint-disable-line fp/no-mutation
            componentElement.style.minHeight = ''; // eslint-disable-line fp/no-mutation
            const naturalHeight = componentElement.scrollHeight;

            // Restore original styles
            // eslint-disable-next-line fp/no-mutation
            componentElement.style.cssText = currentStyle;

            // eslint-disable-next-line fp/no-mutating-methods
            tempComponentHeights.push({
              id: componentId,
              naturalHeight,
            });
            // eslint-disable-next-line fp/no-mutation
            totalNaturalHeight += naturalHeight;
          }
        });

        // If total natural height fits, let components use natural heights
        if (totalNaturalHeight <= availableHeight) {
          return;
        }

        // COMPONENTS EXCEED COLUMN HEIGHT - apply distribution logic
        const numComponents = column.length;
        const equalShare = availableHeight / numComponents;

        // First pass: identify which components need less than equal share
        const smallComponents: Array<{ id: string; height: number }> = [];
        const largeComponents: Array<{ id: string; height: number }> = [];
        let unusedSpace = 0;

        tempComponentHeights.forEach(({ id, naturalHeight }) => {
          if (naturalHeight <= equalShare) {
            // eslint-disable-next-line fp/no-mutating-methods
            smallComponents.push({ id, height: naturalHeight });
            // eslint-disable-next-line fp/no-mutation
            unusedSpace += equalShare - naturalHeight;
          } else {
            // eslint-disable-next-line fp/no-mutating-methods
            largeComponents.push({ id, height: naturalHeight });
          }
        });

        const redistributedHeight =
          largeComponents.length > 0
            ? equalShare + unusedSpace / largeComponents.length
            : equalShare;

        // Set flex values for each component
        tempComponentHeights.forEach(({ id, naturalHeight }) => {
          if (naturalHeight <= equalShare) {
            // Small component: use natural height (no scroll)
            const flexBasis = `${naturalHeight}px`;
            newHeights.set(id, {
              flex: `0 0 ${flexBasis}`,
              overflow: 'visible',
            });
          } else {
            // Large component: use redistributed height (with scroll)
            const flexBasis = `${redistributedHeight}px`;
            newHeights.set(id, {
              flex: `0 0 ${flexBasis}`,
              overflow: 'auto',
            });
          }
        });
      });

      const prevHeights = previousHeightsRef.current;

      // Helper to extract numeric value from flex string (e.g., "0 0 500px" -> 500)
      const getFlexBasis = (flexStr: string): number => {
        const match = flexStr.match(/(\d+(?:\.\d+)?)px/);
        return match ? parseFloat(match[1]) : 0;
      };

      // Check if heights meaningfully changed
      const threshold = 5;
      const hasChanged =
        newHeights.size !== prevHeights.size ||
        Array.from(newHeights.entries()).some(([id, config]) => {
          const oldConfig = prevHeights.get(id);
          if (!oldConfig) {
            return true;
          }
          if (oldConfig.overflow !== config.overflow) {
            return true;
          }
          // Compare flex-basis values with threshold
          const oldBasis = getFlexBasis(oldConfig.flex);
          const newBasis = getFlexBasis(config.flex);
          return Math.abs(oldBasis - newBasis) > threshold;
        });

      if (hasChanged) {
        previousHeightsRef.current = newHeights;
        setComponentHeights(newHeights);
      }
    };

    const debouncedCheck = () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      checkTimeoutRef.current = setTimeout(calculateHeights, 100);
    };

    // Initial checks with multiple delays to catch async content loading
    const timeoutIds: NodeJS.Timeout[] = [];
    [100, 500, 1000].forEach(delay => {
      const timeoutId = setTimeout(calculateHeights, delay);
      // eslint-disable-next-line fp/no-mutating-methods
      timeoutIds.push(timeoutId);
    });

    // Observe COLUMNS for resize events (skip map columns)
    const observers: ResizeObserver[] = [];
    columnRefs.current.forEach((element, columnIndex) => {
      if (!element) {
        return;
      }
      const column = columns[columnIndex];
      if (!column || column.length <= 1) {
        return;
      }
      const observer = new ResizeObserver(debouncedCheck);
      observer.observe(element);
      // eslint-disable-next-line fp/no-mutating-methods
      observers.push(observer);
    });

    // Observe COMPONENTS for content changes
    componentRefs.current.forEach(element => {
      if (!element) {
        return;
      }
      const observer = new ResizeObserver(debouncedCheck);
      observer.observe(element);
      // eslint-disable-next-line fp/no-mutating-methods
      observers.push(observer);
    });

    // eslint-disable-next-line consistent-return
    return () => {
      timeoutIds.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      observers.forEach(observer => {
        observer.disconnect();
      });
    };
  }, [mode, exportConfig, columns]);

  return {
    componentHeights,
    columnRefs,
    componentRefs,
  };
}
