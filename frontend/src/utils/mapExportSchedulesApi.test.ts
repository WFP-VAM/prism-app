import { EXPORT_MAP_SCHEDULES_API_URL } from './constants';
import {
  cadenceToApi,
  createMapExportSchedule,
  type MapExportScheduleCreateRequest,
} from './mapExportSchedulesApi';

describe('cadenceToApi', () => {
  test('maps every-n-dekads to API slug', () => {
    expect(cadenceToApi('every-n-dekads')).toBe('every_n_dekads');
  });

  test('passes through monthly and quarterly', () => {
    expect(cadenceToApi('monthly')).toBe('monthly');
    expect(cadenceToApi('quarterly')).toBe('quarterly');
  });
});

describe('createMapExportSchedule', () => {
  const body: MapExportScheduleCreateRequest = {
    name: 'Mozambique: {date_coverage}',
    country: 'mozambique',
    layer_id: 'precip_blended_dekad',
    cadence: 'monthly',
    dekad_interval: 1,
    format: 'pdf',
    export_options: {
      origin: 'https://prism.example.org',
      exportPath: '/mozambique/export',
      queryParams: {
        bounds: '30,-26,41,-10',
        title: 'Test',
      },
      viewportWidth: 1200,
      viewportHeight: 900,
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('POSTs JSON to schedules endpoint with credentials', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          schedule_id: 'sched-1',
          status: 'active',
          name: 'Mozambique: {date_coverage}',
          export_url: 'https://prism.example.org/export?date={date}',
        }),
    } as Response);

    const result = await createMapExportSchedule(body);

    expect(fetchMock).toHaveBeenCalledWith(EXPORT_MAP_SCHEDULES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    expect(result.schedule_id).toBe('sched-1');
  });

  test('throws when response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as Response);

    await expect(createMapExportSchedule(body)).rejects.toThrow('Forbidden');
  });
});
