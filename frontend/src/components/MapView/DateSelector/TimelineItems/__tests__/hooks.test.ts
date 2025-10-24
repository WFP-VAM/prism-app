import { WindState } from 'prism-common';
import { getWindStatesForDate } from '../hooks';

describe('getWindStatesForDate', () => {
  it('sorts storms by activation severity when multiple storms exist on a date', () => {
    const reports = {
      '2025-02-10': {
        ALPHA: [
          { ref_time: '2025-02-09T00:00:00Z', state: WindState.ready },
          { ref_time: '2025-02-10T00:00:00Z', state: WindState.activated_48kt },
        ],
        BETA: [
          { ref_time: '2025-02-10T00:00:00Z', state: WindState.activated_64kt },
        ],
      },
    } as any;

    const result = getWindStatesForDate(reports, '2025-02-10');

    // BETA should be first because it has the highest severity
    expect(result[0].cycloneName).toBe('BETA');
    expect(result[1].cycloneName).toBe('ALPHA');
  });

  it('breaks ties using latest state severity when max severity is equal', () => {
    const reports = {
      '2025-02-11': {
        ALPHA: [
          { ref_time: '2025-02-10T00:00:00Z', state: WindState.activated_48kt },
          { ref_time: '2025-02-11T00:00:00Z', state: WindState.ready },
        ],
        BETA: [
          { ref_time: '2025-02-10T00:00:00Z', state: WindState.ready },
          { ref_time: '2025-02-11T00:00:00Z', state: WindState.activated_48kt },
        ],
      },
    } as any;

    const result = getWindStatesForDate(reports, '2025-02-11');

    // Both have max severity 48kt, but BETA's latest state is 48kt while ALPHA's latest is ready
    expect(result[0].cycloneName).toBe('BETA');
  });

  it('prefers higher max severity even if it occurred earlier than a lower recent severity', () => {
    const reports = {
      '2025-02-12': {
        ALPHA: [
          { ref_time: '2025-02-11T00:00:00Z', state: WindState.activated_48kt },
          { ref_time: '2025-02-12T00:00:00Z', state: WindState.ready },
        ],
        BETA: [
          { ref_time: '2025-02-10T00:00:00Z', state: WindState.activated_64kt },
          { ref_time: '2025-02-12T00:00:00Z', state: WindState.monitoring },
        ],
      },
    } as any;

    const result = getWindStatesForDate(reports, '2025-02-12');

    // New logic: prefer the storm with the most recent activation relative to selected date
    expect(result[0].cycloneName).toBe('ALPHA');
    expect(result[1].cycloneName).toBe('BETA');
  });
});
