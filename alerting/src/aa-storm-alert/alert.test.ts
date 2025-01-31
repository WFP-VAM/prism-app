jest.mock('node-fetch');
import nodeFetch from 'node-fetch';
import { buildEmailPayloads, getLatestAvailableReports } from './alert';
import { buildDetailedReport } from './test-utils';
import { WindState } from '../types/rawStormDataTypes';

describe('alert mechanism', () => {
  describe('getLatestAvailableReports()', () => {
    const mockedFetch = nodeFetch as unknown as jest.Mock;
    afterEach(() => {
      jest.resetAllMocks();
    });

    const tests = [
      {
        description: 'when short reports have one storm',
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
        description: 'when short reports have 2 storms',
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
    it.each(tests)(
      'get latest reports $description',
      async ({ data, expected }) => {
        mockedFetch.mockResolvedValue({ json: () => data });

        const result = await getLatestAvailableReports();
        expect(result).toEqual(expected);
      },
    );

    it('it returns an empty array when request fails', async () => {
      mockedFetch.mockRejectedValue(null);
      const result = await getLatestAvailableReports();
      expect(result).toEqual([]);
    });
  });

  describe('buildEmailPayloads()', () => {
    const mockedFetch = nodeFetch as unknown as jest.Mock;
    afterEach(() => {
      jest.resetAllMocks();
    });

    const tests = [
      //   {
      //     description:
      //       'returns no payload when detailed report indicates that landfall already occured',
      //     shortReports: [
      //       {
      //         ref_time: '2025-01-31T06:00:00Z',
      //         state: 'activated_118',
      //         path: 'elvis/2025-01-31T06:00:00Z.json',
      //       },
      //     ],
      //     data: buildDetailedReport({
      //       landfall_detected: false,
      //       status: 'activated_118',
      //     }),
      //     expected: [],
      //   },
      {
        description:
          'returns a payload when detailed report indicates that readiness is triggered',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.ready,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.ready,
        }),
      },
      {
        description:
          'returns a payload when detailed report indicates that activation48 is triggered and pilot activated districts for 48kt winds are parts of the exposed districts',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_48,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_48,
          affected48ktDistrict: ['Angoche'],
        }),
      },
      {
        description:
          'does not return a payload when detailed report indicates that activation48 is triggered but there is no pilot activated districts for 48kt exposed',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_48,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_48,
          affected48ktDistrict: [],
        }),
      },
      {
        description:
          'returns a payload when detailed report indicates that activation64 is triggered and pilot activated districts for 64kt winds are parts of the exposed districts',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_64,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_64,
          affected64ktDistrict: ['Namacurra'],
        }),
      },
      {
        description:
          'does not return a payload when detailed report indicates that activation64 is triggered but there is no pilot activated districts for 64kt exposed',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_64,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_64,
          affected64ktDistrict: [],
        }),
      },
    ];
    it.each(tests)('$description', async ({ data, shortReports }) => {
      mockedFetch.mockResolvedValue({ json: () => data });

      const emailPayloads = await buildEmailPayloads(shortReports);
      expect(emailPayloads).toMatchSnapshot();
      console.log(emailPayloads);
    });
  });
});
