import * as prismCommon from 'prism-common';
import * as analysisUtils from './utils/analysis-utils';
import * as emailUtils from './utils/email';
import { runAlertWorker } from './alert-worker';
import type { Alert } from './types/alert';

function buildAlert(over: Partial<Alert> = {}): Alert {
  return {
    id: 1,
    email: 'user@example.com',
    prismUrl: 'https://prism.example',
    alertName: 'Test',
    alertConfig: {
      id: 'layer-1',
      type: 'coverage',
      title: 'Layer title',
      serverLayerName: 'testLayer',
      baseUrl: 'https://coverage.example',
      wcsConfig: {},
    },
    min: 0,
    max: 100,
    zones: { type: 'FeatureCollection', features: [] },
    active: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-02'),
    lastTriggered: undefined,
    ...over,
  };
}

describe('runAlertWorker', () => {
  const layerTime = new Date('2025-06-15T12:00:00Z').getTime();

  beforeEach(() => {
    jest
      .spyOn(prismCommon, 'fetchCoverageLayerDays')
      .mockResolvedValue({ testLayer: [layerTime] });
    jest.spyOn(emailUtils, 'sendEmail').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads active alerts via db.findActiveAlerts', async () => {
    const alert = buildAlert();
    const findActiveAlerts = jest.fn().mockResolvedValue([alert]);
    const updateLastTriggered = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(analysisUtils, 'calculateAlert').mockResolvedValue(undefined);

    await runAlertWorker({ findActiveAlerts, updateLastTriggered });

    expect(findActiveAlerts).toHaveBeenCalled();
  });

  it('updates last_triggered when email is sent', async () => {
    const alert = buildAlert();
    const findActiveAlerts = jest.fn().mockResolvedValue([alert]);
    const updateLastTriggered = jest.fn().mockResolvedValue(undefined);
    jest
      .spyOn(analysisUtils, 'calculateAlert')
      .mockResolvedValue('threshold exceeded');

    await runAlertWorker({ findActiveAlerts, updateLastTriggered });

    expect(emailUtils.sendEmail).toHaveBeenCalledTimes(1);
    expect(updateLastTriggered).toHaveBeenCalledWith(1, new Date(layerTime));
  });

  it('updates last_triggered when alert is not triggered', async () => {
    const alert = buildAlert();
    const findActiveAlerts = jest.fn().mockResolvedValue([alert]);
    const updateLastTriggered = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(analysisUtils, 'calculateAlert').mockResolvedValue(undefined);

    await runAlertWorker({ findActiveAlerts, updateLastTriggered });

    expect(emailUtils.sendEmail).not.toHaveBeenCalled();
    expect(updateLastTriggered).toHaveBeenCalledWith(1, new Date(layerTime));
  });
});
