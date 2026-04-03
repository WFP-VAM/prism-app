import { buildAnticipatoryActionAlerts } from './test-utils';
import { run } from './worker';
import {
  findAnticipatoryActionAlerts,
  updateAnticipatoryActionAlert,
} from '../db/aa-queries';

jest.mock('../db/aa-queries', () => ({
  findAnticipatoryActionAlerts: jest.fn(),
  updateAnticipatoryActionAlert: jest.fn(),
}));

const mockedSendStormAlertEmail = jest.fn();
jest.mock('../utils/email', () => ({
  sendStormAlertEmail: (payload) => mockedSendStormAlertEmail(payload),
}));

const mockedGetLatestAvailableReports = jest.fn();
const mockedBuildEmailPayloads = jest.fn();
jest.mock('./alert', () => {
  const originalModule = jest.requireActual('./alert');
  return {
    ...originalModule,
    getLatestAvailableReports: () => mockedGetLatestAvailableReports(),
    buildEmailPayloads: (...params) => mockedBuildEmailPayloads(...params),
  };
});

describe('worker', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the db', async () => {
    const alert = buildAnticipatoryActionAlerts({});
    (findAnticipatoryActionAlerts as jest.Mock).mockResolvedValue([
      {
        ...alert,
        type: 'storm' as const,
        lastTriggeredAt: undefined,
        lastRanAt: undefined,
      },
    ]);
    (updateAnticipatoryActionAlert as jest.Mock).mockResolvedValue(undefined);

    const availableReports = [
      {
        ref_time: '2025-01-30T12:00:00Z',
        state: 'ready',
        path: '07-20242025/2025-01-30T12:00:00Z.json',
      },
    ];
    mockedGetLatestAvailableReports.mockResolvedValue(availableReports);

    const emailPayloads = [
      {
        activatedTriggers: {
          districts48kt: [],
          districts64kt: [],
        },
        base64Image: '',
        cycloneName: '07-20242025',
        cycloneTime: '2025-01-30T12:00:00Z',
        email: ['test@test.com'],
        redirectUrl: 'https://example.com',
        status: 'ready',
      },
    ];
    mockedBuildEmailPayloads.mockResolvedValue(emailPayloads);

    mockedSendStormAlertEmail.mockResolvedValue(null);

    await run();

    expect(findAnticipatoryActionAlerts).toHaveBeenCalledWith(
      'mozambique',
      'storm',
    );
    expect(mockedSendStormAlertEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendStormAlertEmail).toHaveBeenCalledWith(emailPayloads[0]);
    expect(mockedBuildEmailPayloads).toHaveBeenCalledWith(
      availableReports,
      alert.prismUrl,
      alert.emails,
      alert.country,
    );
    expect(updateAnticipatoryActionAlert).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        lastStates: {
          '07-20242025': {
            refTime: '2025-01-30T12:00:00Z',
            status: 'ready',
          },
        },
        lastRanAt: expect.any(Date),
        lastTriggeredAt: expect.any(Date),
      }),
    );
  });

  it('updates the db for multiple alerts', async () => {
    const alerts = [
      buildAnticipatoryActionAlerts({ id: 1, country: 'mozambique' }),
      buildAnticipatoryActionAlerts({ id: 2, country: 'mozambique' }),
    ];
    (findAnticipatoryActionAlerts as jest.Mock).mockResolvedValue(
      alerts.map((a) => ({
        ...a,
        type: 'storm' as const,
        lastTriggeredAt: undefined,
        lastRanAt: undefined,
      })),
    );
    (updateAnticipatoryActionAlert as jest.Mock).mockResolvedValue(undefined);

    const availableReports = [
      {
        ref_time: '2025-01-30T12:00:00Z',
        state: 'ready',
        path: '07-20242025/2025-01-30T12:00:00Z.json',
      },
    ];

    mockedGetLatestAvailableReports.mockResolvedValue(availableReports);

    const emailPayloads = [
      {
        activatedTriggers: {
          districts48kt: [],
          districts64kt: [],
        },
        base64Image: '',
        cycloneName: '07-20242025',
        cycloneTime: '2025-01-30T12:00:00Z',
        email: ['test@test.com'],
        redirectUrl: 'https://example.com',
        status: 'ready',
      },
    ];

    mockedBuildEmailPayloads.mockResolvedValue(emailPayloads);
    mockedSendStormAlertEmail.mockResolvedValue(null);

    await run();

    expect(findAnticipatoryActionAlerts).toHaveBeenCalledWith(
      'mozambique',
      'storm',
    );
    expect(mockedSendStormAlertEmail).toHaveBeenCalledTimes(2);
    expect(mockedSendStormAlertEmail).toHaveBeenCalledWith(emailPayloads[0]);

    expect(updateAnticipatoryActionAlert).toHaveBeenCalledTimes(2);
    expect(updateAnticipatoryActionAlert).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        lastStates: {
          '07-20242025': {
            refTime: '2025-01-30T12:00:00Z',
            status: 'ready',
          },
        },
        lastRanAt: expect.any(Date),
        lastTriggeredAt: expect.any(Date),
      }),
    );
    expect(updateAnticipatoryActionAlert).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        lastStates: {
          '07-20242025': {
            refTime: '2025-01-30T12:00:00Z',
            status: 'ready',
          },
        },
        lastRanAt: expect.any(Date),
        lastTriggeredAt: expect.any(Date),
      }),
    );
  });
});
