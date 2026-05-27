import { cadenceToApi } from './mapExportSchedulesApi';

describe('cadenceToApi', () => {
  test('maps every-n-dekads to API slug', () => {
    expect(cadenceToApi('every-n-dekads')).toBe('every_n_dekads');
  });

  test('passes through monthly and quarterly', () => {
    expect(cadenceToApi('monthly')).toBe('monthly');
    expect(cadenceToApi('quarterly')).toBe('quarterly');
  });
});
