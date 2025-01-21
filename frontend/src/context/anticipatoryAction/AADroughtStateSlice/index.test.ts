import {
  mockAAData,
  mockAAInput,
  mockAARenderedDistricts,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/test.utils';
import { calculateMapRenderedDistricts, parseAndTransformAA } from './utils';

describe('Anticipatory Action', () => {
  test('Transforms input', () => {
    const out = parseAndTransformAA(mockAAInput);
    const data = Object.fromEntries(
      out.windowData.map(x => [x.windowKey, x.data]),
    );

    expect(data).toEqual(mockAAData);
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
});
