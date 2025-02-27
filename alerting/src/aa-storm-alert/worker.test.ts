import { buildAnticipatoryActionAlerts } from './test-utils';
import { run } from './worker';

jest.mock('../entities/anticipatoryActionAlerts.entity');

const mockedCreateConnection = jest.fn();
jest.mock('typeorm', () => ({
  ...jest.requireActual('typeorm'),
  createConnection: () => mockedCreateConnection(),
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
    jest.resetAllMocks();
  });

  it('updates the db', async () => {
    // arrange

    const mockedUpdate = jest.fn();
    const alert = buildAnticipatoryActionAlerts({});
    const mockedGetRepository = jest.fn().mockReturnValue({
      find: () => [alert],
      update: mockedUpdate,
    });
    mockedCreateConnection.mockResolvedValue({
      getRepository: () => mockedGetRepository(),
    });

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

    expect(mockedCreateConnection).toHaveBeenCalled();
    expect(mockedGetRepository).toHaveBeenCalled();
    expect(mockedSendStormAlertEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendStormAlertEmail).toHaveBeenCalledWith(emailPayloads[0]);
    expect(mockedBuildEmailPayloads).toHaveBeenCalledWith(
      availableReports,
      alert.prismUrl,
      alert.emails,
    );
    expect(mockedUpdate).toHaveBeenCalledWith(
      {
        country: 'mozambique',
        id: 1,
      },
      {
        lastStates: {
          '07-20242025': {
            refTime: '2025-01-30T12:00:00Z',
            status: 'ready',
          },
        },
        lastRanAt: expect.any(Date),
        lastTriggeredAt: expect.any(Date),
      },
    );
  });


  it('updates the db for multiple alerts', async () => {

    const mockedUpdate = jest.fn();
    
    const alerts = [
      buildAnticipatoryActionAlerts({ id: 1, country: 'mozambique' }),
      buildAnticipatoryActionAlerts({ id: 2, country: 'mozambique' }),
    ];
  
    const mockedGetRepository = jest.fn().mockReturnValue({
      find: () => alerts,
      update: mockedUpdate,
    });
  
    mockedCreateConnection.mockResolvedValue({
      getRepository: () => mockedGetRepository(),
    });
  
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
  
    expect(mockedCreateConnection).toHaveBeenCalled();
    expect(mockedGetRepository).toHaveBeenCalled();
    expect(mockedSendStormAlertEmail).toHaveBeenCalledTimes(2);
    expect(mockedSendStormAlertEmail).toHaveBeenCalledWith(emailPayloads[0]);
  
    expect(mockedUpdate).toHaveBeenCalledTimes(2);
    expect(mockedUpdate).toHaveBeenCalledWith(
      {
        country: 'mozambique',
        id: 1,
      },
      {
        lastStates: {
          '07-20242025': {
            refTime: '2025-01-30T12:00:00Z',
            status: 'ready',
          },
        },
        lastRanAt: expect.any(Date),
        lastTriggeredAt: expect.any(Date),
      }
    );
    expect(mockedUpdate).toHaveBeenCalledWith(
      {
        country: 'mozambique',
        id: 2,
      },
      {
        lastStates: {
          '07-20242025': {
            refTime: '2025-01-30T12:00:00Z',
            status: 'ready',
          },
        },
        lastRanAt: expect.any(Date),
        lastTriggeredAt: expect.any(Date),
      }
    );
  });
});
