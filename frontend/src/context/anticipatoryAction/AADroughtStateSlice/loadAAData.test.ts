import { mockAAInput } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/test.utils';
import Papa from 'papaparse';

import { loadAAData, toReadableLoadError } from '.';

jest.mock('papaparse', () => ({
  __esModule: true,
  default: { parse: jest.fn() },
}));
jest.mock('utils/url-utils', () => ({
  ...jest.requireActual('utils/url-utils'),
  getAADroughtUrl: () => 'https://example.com/aa.csv',
}));

const parseMock = Papa.parse as unknown as jest.Mock;

const failWithProgressEvent = (_url: string, opts: any) =>
  opts.error(new ProgressEvent('error'));
const succeed = (_url: string, opts: any) =>
  opts.complete({ data: mockAAInput });

const runThunk = (droughtState: { loading: boolean; availableDates?: any }) => {
  const dispatch = jest.fn();
  const getState = () =>
    ({ anticipatoryActionDroughtState: droughtState }) as any;
  return loadAAData()(dispatch, getState, undefined);
};

describe('loadAAData', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    parseMock.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('retries once after a network failure and then succeeds', async () => {
    parseMock
      .mockImplementationOnce(failWithProgressEvent)
      .mockImplementationOnce(succeed);

    const promise = runThunk({ loading: false, availableDates: undefined });
    await jest.runAllTimersAsync();
    const action = await promise;

    expect(parseMock).toHaveBeenCalledTimes(2);
    expect(action.type).toBe(loadAAData.fulfilled.type);
  });

  test('rejects with a readable message instead of [object ProgressEvent]', async () => {
    parseMock.mockImplementation(failWithProgressEvent);

    const promise = runThunk({ loading: false, availableDates: undefined });
    await jest.runAllTimersAsync();
    const action: any = await promise;

    expect(parseMock).toHaveBeenCalledTimes(2);
    expect(action.type).toBe(loadAAData.rejected.type);
    expect(action.error.message).not.toContain('ProgressEvent');
    expect(action.error.message).toMatch(/Unable to load/);
  });

  test('does not re-download when data is already loaded', async () => {
    const action = await runThunk({
      loading: false,
      availableDates: { 'Window 1': [] },
    });
    expect(parseMock).not.toHaveBeenCalled();
    expect(action.type).toBe(loadAAData.rejected.type);
    expect((action as any).meta.condition).toBe(true);
  });

  test('does not start a second download while one is in flight', async () => {
    await runThunk({ loading: true, availableDates: undefined });
    expect(parseMock).not.toHaveBeenCalled();
  });
});

describe('toReadableLoadError', () => {
  test('keeps real Error messages', () => {
    expect(toReadableLoadError(new Error('boom')).message).toBe('boom');
  });
});
