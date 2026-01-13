jest.mock('node-fetch');
jest.mock('../utils/capture-utils', () => ({
  captureScreenshotFromUrl: jest.fn(),
}));
import nodeFetch from 'node-fetch';
import {
  buildEmailPayloads,
  filterOutAlreadyProcessedReports,
  getLatestAvailableReports,
} from './alert';
import { buildDetailedReport, buildLandfallInfo } from './test-utils';
import { WindState } from 'prism-common';
import { LastStates } from '../types/storm-reports';
import { captureScreenshotFromUrl } from '../utils/capture-utils';
import { formatDate } from '../utils/date';

describe('alert mechanism', () => {
  describe('getLatestAvailableReports()', () => {
    const mockedFetch = nodeFetch as unknown as jest.Mock;
    afterEach(() => {
      jest.resetAllMocks();
    });

    const tests = [
      {
        description: 'when short reports have one storm with ready state',
        data: {
          '2025-01-31': {
            elvis: [
              {
                ref_time: '2025-01-31T06:00:00Z',
                state: 'ready',
                path: 'elvis/2025-01-31T06:00:00Z.json',
              },
            ],
          },
        },
        expected: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: 'ready',
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
      },
      {
        description:
          'when short reports have one storm with monitoring and ready state',
        data: {
          '2025-01-31': {
            elvis: [
              {
                ref_time: '2025-01-31T06:00:00Z',
                state: 'ready',
                path: 'elvis/2025-01-31T06:00:00Z.json',
              },
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
            state: 'ready',
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
      },
      {
        description: 'when short reports have one storm with monitoring state',
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
        expected: [],
      },
      {
        description: 'when short reports have 2 storms with active state',
        data: {
          '2025-01-30': {
            '07-20242025': [
              {
                ref_time: '2025-01-30T06:00:00Z',
                state: 'activated_48kt',
                path: '07-20242025/2025-01-30T06:00:00Z.json',
              },
              {
                ref_time: '2025-01-30T12:00:00Z',
                state: 'activated_64kt',
                path: '07-20242025/2025-01-30T12:00:00Z.json',
              },
            ],
            elvis: [
              {
                ref_time: '2025-01-30T06:00:00Z',
                state: 'activated_48kt',
                path: 'elvis/2025-01-30T06:00:00Z.json',
              },
              {
                ref_time: '2025-01-30T18:00:00Z',
                state: 'activated_64kt',
                path: 'elvis/2025-01-30T18:00:00Z.json',
              },
            ],
          },
        },
        expected: [
          {
            ref_time: '2025-01-30T12:00:00Z',
            state: 'activated_64kt',
            path: '07-20242025/2025-01-30T12:00:00Z.json',
          },
          {
            ref_time: '2025-01-30T18:00:00Z',
            state: 'activated_64kt',
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
          affected64ktDistrict: ['Namacurra'],
        }),
      },
      {
        description:
          'returns a payload when detailed report indicates that activation48 is triggered and pilot activated districts for 48kt winds are parts of the exposed districts',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_48kt,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_48kt,
          affected48ktDistrict: ['Angoche'],
        }),
      },
      {
        description:
          'does not return a payload when detailed report indicates that activation48 is triggered but there is no pilot activated districts for 48kt exposed',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_48kt,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_48kt,
          affected48ktDistrict: [],
        }),
      },
      {
        description:
          'returns a payload when detailed report indicates that activation64 is triggered and pilot activated districts for 64kt winds are parts of the exposed districts',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_64kt,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_64kt,
          affected64ktDistrict: ['Namacurra'],
        }),
      },
      {
        description:
          'does not return a payload when detailed report indicates that activation64 is triggered but there is no pilot activated districts for 64kt exposed',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_64kt,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          status: WindState.activated_64kt,
          affected64ktDistrict: [],
        }),
      },
      {
        description:
          'returns no payload when detailed report indicates that activation is triggered but landfall already occured',
        shortReports: [
          {
            ref_time: '2025-01-31T06:00:00Z',
            state: WindState.activated_64kt,
            path: 'elvis/2025-01-31T06:00:00Z.json',
          },
        ],
        data: buildDetailedReport({
          landfall_detected: false,
          status: WindState.activated_64kt,
          affected64ktDistrict: ['Namacurra'],
          landfallInfo: buildLandfallInfo({
            landfall_time: [
              '2025-01-13 06:00:00',
              formatDate(
                new Date(Date.now() - 60 * 60 * 1000),
                'YYYY-MM-DD HH:mm:ss',
              ), // now - 1 hour; ie landfall occured already
            ],
          }),
        }),
      },
    ];
    it.each(tests)('$description', async ({ data, shortReports }) => {
      mockedFetch.mockResolvedValue({ json: () => data });
      (captureScreenshotFromUrl as jest.Mock).mockResolvedValue('');

      const emailPayloads = await buildEmailPayloads(
        shortReports,
        'https://prism.wfp.org',
        ['test@test.com'],
      );
      expect(emailPayloads).toMatchSnapshot();
    });
  });

  describe('filterOutAlreadyProcessedReports()', () => {
    const tests = [
      {
        description:
          'when there is already processed report stored in the db which is older than available report',
        availableReports: [
          {
            ref_time: '2025-02-09T18:00:00Z',
            state: WindState.monitoring,
            path: 'vince/2025-02-09T18:00:00Z.json',
          },
        ],
        lastStates: {
          vince: {
            status: WindState.monitoring,
            refTime: '2025-02-09T12:00:00Z',
          },
        },
      },
      {
        description:
          'when there is already processed report stored in the db which is as old as available report',
        availableReports: [
          {
            ref_time: '2025-02-09T18:00:00Z',
            state: WindState.monitoring,
            path: 'vince/2025-02-09T18:00:00Z.json',
          },
        ],
        lastStates: {
          vince: {
            status: WindState.monitoring,
            refTime: '2025-02-09T18:00:00Z',
          },
        },
      },
      {
        description:
          'when there is no already processed report stored in the db',
        availableReports: [
          {
            ref_time: '2025-02-09T18:00:00Z',
            state: WindState.monitoring,
            path: 'vince/2025-02-09T18:00:00Z.json',
          },
        ],
        lastStates: undefined,
      },
      {
        description: 'when there are several available reports',
        availableReports: [
          {
            ref_time: '2025-02-09T18:00:00Z',
            state: WindState.monitoring,
            path: 'vince/2025-02-09T18:00:00Z.json',
          },
          {
            ref_time: '2025-02-09T18:00:00Z',
            state: WindState.monitoring,
            path: 'chido/2025-02-09T18:00:00Z.json',
          },
        ],
        lastStates: {
          vince: {
            status: WindState.monitoring,
            refTime: '2025-02-09T12:00:00Z',
          },
          chido: {
            status: WindState.monitoring,
            refTime: '2025-02-09T12:00:00Z',
          },
        },
      },
    ];
    it.each(tests)(
      'returns filtered available reports $description',
      ({ availableReports, lastStates }) => {
        const filteredReports = filterOutAlreadyProcessedReports(
          availableReports,
          lastStates as LastStates,
        );
        expect(filteredReports).toMatchSnapshot();
      },
    );
  });
});
