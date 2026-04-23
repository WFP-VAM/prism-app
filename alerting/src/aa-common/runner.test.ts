import { runAAWorker } from './runner';

describe('runAAWorker', () => {
  it('exits early when no alerts and does not call update', async () => {
    const findAnticipatoryActionAlerts = jest.fn().mockResolvedValue([]);
    const updateAnticipatoryActionAlert = jest.fn();
    const err = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await runAAWorker({
      country: 'mozambique',
      type: 'storm',
      overrideEmails: [],
      prepare: async () => ({}),
      buildForAlert: async () => ({
        payloads: [{ x: 1 } as unknown as never],
        updatedLastStates: {},
      }),
      send: jest.fn(),
      aaDb: { findAnticipatoryActionAlerts, updateAnticipatoryActionAlert },
    });

    expect(findAnticipatoryActionAlerts).toHaveBeenCalledWith(
      'mozambique',
      'storm',
    );
    expect(updateAnticipatoryActionAlert).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();

    err.mockRestore();
  });

  it('does not open DB when IS_TEST (override emails)', async () => {
    const findAnticipatoryActionAlerts = jest.fn();
    const updateAnticipatoryActionAlert = jest.fn();

    await runAAWorker({
      country: 'mozambique',
      type: 'storm',
      overrideEmails: ['t@t.com'],
      prepare: async () => ({}),
      buildForAlert: async () => ({
        payloads: [],
        updatedLastStates: {},
      }),
      send: jest.fn(),
      aaDb: { findAnticipatoryActionAlerts, updateAnticipatoryActionAlert },
    });

    expect(findAnticipatoryActionAlerts).not.toHaveBeenCalled();
    expect(updateAnticipatoryActionAlert).not.toHaveBeenCalled();
  });

  it('calls update for each alert with lastTriggeredAt when payloads exist', async () => {
    const findAnticipatoryActionAlerts = jest.fn().mockResolvedValue([
      {
        id: 1,
        country: 'mozambique',
        emails: ['a@b.com'],
        prismUrl: 'https://p',
        lastStates: undefined,
        type: 'storm',
        lastRanAt: undefined,
        lastTriggeredAt: undefined,
      },
      {
        id: 2,
        country: 'mozambique',
        emails: ['a@b.com'],
        prismUrl: 'https://p',
        lastStates: undefined,
        type: 'storm',
        lastRanAt: undefined,
        lastTriggeredAt: undefined,
      },
    ]);
    const updateAnticipatoryActionAlert = jest.fn().mockResolvedValue(undefined);
    const send = jest.fn().mockResolvedValue(undefined);

    await runAAWorker({
      country: 'mozambique',
      type: 'storm',
      overrideEmails: [],
      prepare: async () => ({}),
      buildForAlert: async () => ({
        payloads: [{ k: 1 } as unknown as never],
        updatedLastStates: { cyc: { refTime: 't', status: 'ready' } },
      }),
      send,
      aaDb: { findAnticipatoryActionAlerts, updateAnticipatoryActionAlert },
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(updateAnticipatoryActionAlert).toHaveBeenCalledTimes(2);
    expect(updateAnticipatoryActionAlert).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        lastStates: { cyc: { refTime: 't', status: 'ready' } },
        lastRanAt: expect.any(Date),
        lastTriggeredAt: expect.any(Date),
      }),
    );
    expect(updateAnticipatoryActionAlert).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        lastTriggeredAt: expect.any(Date),
      }),
    );
  });

  it('omits lastTriggeredAt when payloads are empty but still updates lastStates and lastRanAt', async () => {
    const findAnticipatoryActionAlerts = jest.fn().mockResolvedValue([
      {
        id: 10,
        country: 'mozambique',
        emails: ['a@b.com'],
        prismUrl: 'https://p',
        lastStates: undefined,
        type: 'storm',
      },
    ]);
    const updateAnticipatoryActionAlert = jest.fn().mockResolvedValue(undefined);

    await runAAWorker({
      country: 'mozambique',
      type: 'storm',
      overrideEmails: [],
      prepare: async () => ({}),
      buildForAlert: async () => ({
        payloads: [],
        updatedLastStates: { x: { refTime: 'r', status: 's' } },
      }),
      send: jest.fn(),
      aaDb: { findAnticipatoryActionAlerts, updateAnticipatoryActionAlert },
    });

    expect(updateAnticipatoryActionAlert).toHaveBeenCalledWith(10, {
      lastStates: { x: { refTime: 'r', status: 's' } },
      lastRanAt: expect.any(Date),
      lastTriggeredAt: null,
    });
  });
});
