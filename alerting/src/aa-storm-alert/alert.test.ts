jest.mock('node-fetch');
import nodeFetch from 'node-fetch';
import { getLatestAvailableReports } from './alert';

describe('alert mechanism', () => {
  describe('getLatestAvailableReports()', () => {
    const mockedFetch = nodeFetch as unknown as jest.Mock;
    afterEach(() => {
      jest.resetAllMocks();
    });

    const tests = [
      {
        data: {
          '2025-01-31': {
            elvis: [
              {
                ref_time: '2025-01-31T06:00:00Z',
                state: 'monitoring',
                path: 'elvis/2025-01-31T06:00:00Z.json',
              },
            ],
          },
        },
        expected: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: 'monitoring',
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
      },
      {
        data: {
          '2025-01-30': {
            '07-20242025': [
              {
                ref_time: '2025-01-30T06:00:00Z',
                state: 'monitoring',
                path: '07-20242025/2025-01-30T06:00:00Z.json',
              },
              {
                ref_time: '2025-01-30T12:00:00Z',
                state: 'monitoring',
                path: '07-20242025/2025-01-30T12:00:00Z.json',
              },
            ],
            elvis: [
              {
                ref_time: '2025-01-30T06:00:00Z',
                state: 'monitoring',
                path: 'elvis/2025-01-30T06:00:00Z.json',
              },
              {
                ref_time: '2025-01-30T18:00:00Z',
                state: 'monitoring',
                path: 'elvis/2025-01-30T18:00:00Z.json',
              },
            ],
          },
        },
        expected: [
          {
            ref_time: '2025-01-30T12:00:00Z',
            state: 'monitoring',
            path: '07-20242025/2025-01-30T12:00:00Z.json',
          },
          {
            ref_time: '2025-01-30T18:00:00Z',
            state: 'monitoring',
            path: 'elvis/2025-01-30T18:00:00Z.json',
          },
        ],
      },
    ];
    it.each(tests)('get latest reports', async ({ data, expected }) => {
      mockedFetch.mockResolvedValue({
        json: () => data,
      });

      const result = await getLatestAvailableReports();
      expect(result).toEqual(expected);
    });

    it('it returns an empty array when request fails', async () => {
      mockedFetch.mockRejectedValue(null);
      const result = await getLatestAvailableReports();
      expect(result).toEqual([]);
    });
  });

  //   describe('');
});
