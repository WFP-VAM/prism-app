import { DatesPropagation } from 'config/types';
import { generateIntermediateDateItemFromValidity } from './server-utils';

describe('Test generateIntermediateDateItemFromValidity', () => {
  test('should return correct dates with forward propagation', () => {
    const layer = {
      name: 'myd11a2_taa_dekad',
      dates: [1701432000000, 1702296000000, 1703160000000],
      validity: {
        days: 10,
        mode: DatesPropagation.FORWARD,
      },
    };

    const output = generateIntermediateDateItemFromValidity(layer);
    expect(output).toEqual([
      {
        displayDate: 1701428400000,
        queryDate: 1701428400000,
        isStartDate: true,
        isEndDate: false,
      },
      { displayDate: 1701514800000, queryDate: 1701428400000 },
      { displayDate: 1701601200000, queryDate: 1701428400000 },
      { displayDate: 1701687600000, queryDate: 1701428400000 },
      { displayDate: 1701774000000, queryDate: 1701428400000 },
      { displayDate: 1701860400000, queryDate: 1701428400000 },
      { displayDate: 1701946800000, queryDate: 1701428400000 },
      { displayDate: 1702033200000, queryDate: 1701428400000 },
      { displayDate: 1702119600000, queryDate: 1701428400000 },
      { displayDate: 1702206000000, queryDate: 1701428400000 },
      {
        displayDate: 1702292400000,
        queryDate: 1702292400000,
        isStartDate: true,
        isEndDate: false,
      },
      { displayDate: 1702378800000, queryDate: 1702292400000 },
      { displayDate: 1702465200000, queryDate: 1702292400000 },
      { displayDate: 1702551600000, queryDate: 1702292400000 },
      { displayDate: 1702638000000, queryDate: 1702292400000 },
      { displayDate: 1702724400000, queryDate: 1702292400000 },
      { displayDate: 1702810800000, queryDate: 1702292400000 },
      { displayDate: 1702897200000, queryDate: 1702292400000 },
      { displayDate: 1702983600000, queryDate: 1702292400000 },
      { displayDate: 1703070000000, queryDate: 1702292400000 },
      {
        displayDate: 1703156400000,
        queryDate: 1703156400000,
        isStartDate: true,
        isEndDate: false,
      },
      { displayDate: 1703242800000, queryDate: 1703156400000 },
      { displayDate: 1703329200000, queryDate: 1703156400000 },
      { displayDate: 1703415600000, queryDate: 1703156400000 },
      { displayDate: 1703502000000, queryDate: 1703156400000 },
      { displayDate: 1703588400000, queryDate: 1703156400000 },
      { displayDate: 1703674800000, queryDate: 1703156400000 },
      { displayDate: 1703761200000, queryDate: 1703156400000 },
      { displayDate: 1703847600000, queryDate: 1703156400000 },
      { displayDate: 1703934000000, queryDate: 1703156400000 },
      { displayDate: 1704020400000, queryDate: 1703156400000 },
    ]);
  });

  test('should return correct dates with backwards propagation', () => {
    const layer = {
      name: 'myd11a2_taa_dekad',
      dates: [1701432000000, 1702296000000],
      validity: {
        days: 10,
        mode: DatesPropagation.BACKWARD,
      },
    };
    const output = generateIntermediateDateItemFromValidity(layer);
    expect(output).toEqual([
      { displayDate: 1700564400000, queryDate: 1701428400000 },
      { displayDate: 1700650800000, queryDate: 1701428400000 },
      { displayDate: 1700737200000, queryDate: 1701428400000 },
      { displayDate: 1700823600000, queryDate: 1701428400000 },
      { displayDate: 1700910000000, queryDate: 1701428400000 },
      { displayDate: 1700996400000, queryDate: 1701428400000 },
      { displayDate: 1701082800000, queryDate: 1701428400000 },
      { displayDate: 1701169200000, queryDate: 1701428400000 },
      { displayDate: 1701255600000, queryDate: 1701428400000 },
      { displayDate: 1701342000000, queryDate: 1701428400000 },
      {
        displayDate: 1701428400000,
        queryDate: 1701428400000,
        isStartDate: false,
        isEndDate: true,
      },
      { displayDate: 1701514800000, queryDate: 1702292400000 },
      { displayDate: 1701601200000, queryDate: 1702292400000 },
      { displayDate: 1701687600000, queryDate: 1702292400000 },
      { displayDate: 1701774000000, queryDate: 1702292400000 },
      { displayDate: 1701860400000, queryDate: 1702292400000 },
      { displayDate: 1701946800000, queryDate: 1702292400000 },
      { displayDate: 1702033200000, queryDate: 1702292400000 },
      { displayDate: 1702119600000, queryDate: 1702292400000 },
      { displayDate: 1702206000000, queryDate: 1702292400000 },
      {
        displayDate: 1702292400000,
        queryDate: 1702292400000,
        isStartDate: false,
        isEndDate: true,
      },
    ]);
  });
});
