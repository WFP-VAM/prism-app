import { MutableRefObject } from 'react';
import { downloadToFile } from 'components/MapView/utils';
import { downloadMultiChartsToCsv } from '.';

jest.mock('../utils.ts', () => ({
  downloadToFile: jest.fn(),
}));

describe('downloadMultiChartsToCsv', () => {
  const dataForCsv: MutableRefObject<{ [key: string]: any[] }> = {
    current: {
      key1: [
        {
          Date: '2022-03-01',
          testKey1: 35,
          testKey1_avg: 10,
        },
        {
          Date: '2022-03-02',
          testKey1: 10,
          testKey1_avg: 5,
        },
        {
          Date: '2022-03-03',
          testKey1: 20,
          testKey1_avg: 3,
        },
      ],
      key2: [
        {
          Date: '2022-03-01',
          testKey2: 35,
          testKey2_avg: 10,
        },
        {
          Date: '2022-03-02',
          testKey2: 10,
          testKey2_avg: 5,
        },
        {
          Date: '2022-03-03',
          testKey2: 20,
          testKey2_avg: 3,
        },
      ],
      key3: [
        {
          Date: '2022-03-01',
          testKey3: 35,
          testKey3_avg: 10,
        },
        {
          Date: '2022-03-02',
          testKey3: 10,
          testKey3_avg: 5,
        },
        {
          Date: '2022-03-03',
          testKey3: 20,
          testKey3_avg: 3,
        },
      ],
    },
  };
  const filename = 'test.csv';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call downloadToFile with the correct arguments when data is present', () => {
    downloadMultiChartsToCsv([[dataForCsv, filename]])();

    expect(downloadToFile).toHaveBeenCalledWith(
      {
        content:
          'Date,key_1,key_1_avg,key_2,key_2_avg,key_3,key_3_avg\n2022-03-01,35,10,35,10,35,10\n2022-03-02,10,5,10,5,10,5\n2022-03-03,20,3,20,3,20,3',
        isUrl: false,
      },
      filename,
      'text/csv',
    );
  });

  it('should not call downloadToFile when no data is present', () => {
    const emptyData: MutableRefObject<{ [key: string]: any[] }> = {
      current: {},
    };
    downloadMultiChartsToCsv([[emptyData, filename]])();

    expect(downloadToFile).not.toHaveBeenCalled();
  });

  it('should call downloadToFile empty strings when some data are missing', () => {
    const missingDataForCsv: MutableRefObject<{ [key: string]: any[] }> = {
      current: {
        key1: [
          {
            Date: '2022-03-01',
            testKey1: 35,
            testKey1_avg: 10,
          },
          {
            Date: '2022-03-02',
            testKey1: 10,
            testKey1_avg: 5,
          },
          {
            Date: '2022-03-03',
            testKey1: 20,
            testKey1_avg: 3,
          },
        ],
        key2: [
          {
            Date: '2022-03-02',
            testKey2: 10,
            testKey2_avg: 5,
          },
          {
            Date: '2022-03-03',
            testKey2: 20,
            testKey2_avg: 3,
          },
        ],
        key3: [
          {
            Date: '2022-03-01',
            testKey3: 35,
            testKey3_avg: 10,
          },
          {
            Date: '2022-03-02',
            testKey3: 10,
            testKey3_avg: 5,
          },
        ],
      },
    };
    downloadMultiChartsToCsv([[missingDataForCsv, filename]])();

    expect(downloadToFile).toHaveBeenCalledWith(
      {
        content:
          'Date,key_1,key_1_avg,key_2,key_2_avg,key_3,key_3_avg\n2022-03-01,35,10,,,35,10\n2022-03-02,10,5,10,5,10,5\n2022-03-03,20,3,20,3,,',
        isUrl: false,
      },
      filename,
      'text/csv',
    );
  });
});
