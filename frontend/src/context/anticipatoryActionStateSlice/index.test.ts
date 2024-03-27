import {
  mockAAData,
  mockAAInput,
  mockAARenderedDistricts,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/test.utils';
import { calculateMapRenderedDistricts, transform } from '.';

describe('Anticipatory Action', () => {
  test('Transforms input', () => {
    const out = transform(mockAAInput);
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
    });

    expect(out).toEqual(mockAARenderedDistricts);
  });
});
