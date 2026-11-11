import {
  mockAAData,
  mockAAInput,
  mockAARenderedDistricts,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/test.utils';

import {
  calculateAAMarkers,
  calculateMapRenderedDistricts,
  getAAMapData,
  parseAndTransformAA,
} from './utils';

describe('Anticipatory Action', () => {
  test('Transforms input', () => {
    const out = parseAndTransformAA(mockAAInput);
    const data = Object.fromEntries(
      out.windowData.map(x => [x.windowKey, x.data]),
    );

    expect(data).toEqual(mockAAData);
  });

  const renderWithCategories = (categories: Record<string, boolean>): any =>
    calculateMapRenderedDistricts({
      data: mockAAData as any,
      filters: {
        selectedDate: '2023-10-01',
        selectedWindow: 'Window 1',
        categories: {
          Severe: true,
          Moderate: true,
          Mild: true,
          na: true,
          ny: true,
          ...categories,
        },
      } as any,
      windowRanges: {
        'Window 1': { start: '2023-08-01', end: '2023-12-01' },
        'Window 2': undefined,
      },
    });

  test('Calculate rendered districts', () => {
    const filters: any = {
      selectedDate: '2023-10-01',
      selectedWindow: 'Window 1',
      categories: {
        Severe: true,
        Moderate: true,
        Mild: true,
        na: true,
        ny: true,
      },
    };
    const out = calculateMapRenderedDistricts({
      data: mockAAData as any,
      filters,
      windowRanges: {
        'Window 1': { start: '2023-08-01', end: '2023-12-01' },
        'Window 2': undefined,
      },
    });

    expect(out).toEqual(mockAARenderedDistricts);
  });

  test('Filtered-out categories hide districts instead of marking them No Action', () => {
    const out = renderWithCategories({ Moderate: false });
    expect(out['Window 1'].Changara).toEqual([
      { category: 'Mild', phase: 'Ready', isNew: false },
    ]);

    const hidden = renderWithCategories({ Moderate: false, Mild: false });
    expect(hidden['Window 1'].Changara).toEqual([]);
    // districts without data are unaffected
    expect(hidden['Window 1'].Caia).toEqual([
      { category: 'ny', phase: 'ny', isNew: false },
    ]);
  });

  describe('getAAMapData', () => {
    const severe = { category: 'Severe', phase: 'Set', isNew: false } as const;
    const mild = { category: 'Mild', phase: 'Ready', isNew: false } as const;
    const renderedDistricts: any = {
      'Window 1': { A: [severe], B: [], C: [mild] },
      'Window 2': { A: [mild], B: [mild], C: [] },
    };

    test('skips hidden districts for a single window', () => {
      expect(getAAMapData(renderedDistricts, 'Window 1')).toEqual({
        A: severe,
        C: mild,
      });
    });

    test('combines windows, using the other window when one is hidden', () => {
      expect(getAAMapData(renderedDistricts, 'All')).toEqual({
        A: severe,
        B: mild,
        C: mild,
      });
    });

    test('markers skip hidden districts', () => {
      const markers = calculateAAMarkers({
        renderedDistricts,
        selectedWindow: 'Window 2',
        districtCentroids: {},
      });
      expect(markers.map(m => m.district)).toEqual(['A', 'B']);
    });
  });
});
