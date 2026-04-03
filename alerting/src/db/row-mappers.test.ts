import {
  mapAlertConfigFromRow,
  mapAlertRow,
  mapAnticipatoryActionAlertRow,
} from './row-mappers';

describe('row-mappers', () => {
  describe('mapAlertConfigFromRow', () => {
    it('passes through alert_config JSON', () => {
      const cfg = {
        id: 'rfh_dekad',
        type: 'wms',
        title: 'Rainfall',
        serverLayerName: 'rfh_dekad',
        baseUrl: 'https://example.org/ows/',
        wcsConfig: { scale: 0.02 },
      };
      expect(mapAlertConfigFromRow(cfg)).toEqual(cfg);
    });
  });

  describe('mapAlertRow', () => {
    it('maps snake_case columns and JSONB to Alert', () => {
      const createdAt = new Date('2024-06-01T10:00:00Z');
      const updatedAt = new Date('2024-06-02T10:00:00Z');
      const lastTriggered = new Date('2024-06-03T10:00:00Z');
      const alertConfig = {
        id: 'x',
        type: 'wms',
        title: 'T',
        serverLayerName: 'L',
        baseUrl: 'https://b',
        wcsConfig: {},
      };
      const zones = {
        type: 'FeatureCollection',
        name: 'z',
        features: [],
      } as const;

      const row = {
        id: 42,
        email: 'a@b.com',
        prism_url: 'https://prism',
        alert_name: 'My alert',
        alert_config: alertConfig,
        min: 1,
        max: 99,
        zones,
        active: true,
        created_at: createdAt,
        updated_at: updatedAt,
        last_triggered: lastTriggered,
      };

      expect(mapAlertRow(row)).toEqual({
        id: 42,
        email: 'a@b.com',
        prismUrl: 'https://prism',
        alertName: 'My alert',
        alertConfig,
        min: 1,
        max: 99,
        zones,
        active: true,
        createdAt,
        updatedAt,
        lastTriggered,
      });
    });

    it('treats null JSONB and names as optional', () => {
      const row = {
        id: 1,
        email: 'a@b.com',
        prism_url: 'https://p',
        alert_name: null,
        alert_config: {
          id: 'i',
          type: 'wms',
          title: 't',
          serverLayerName: 's',
          baseUrl: 'https://u',
          wcsConfig: {},
        },
        min: null,
        max: null,
        zones: null,
        active: false,
        created_at: new Date(),
        updated_at: new Date(),
        last_triggered: null,
      };

      const mapped = mapAlertRow(row);
      expect(mapped.alertName).toBeUndefined();
      expect(mapped.min).toBeUndefined();
      expect(mapped.max).toBeUndefined();
      expect(mapped.zones).toBeUndefined();
      expect(mapped.lastTriggered).toBeUndefined();
      expect(mapped.active).toBe(false);
    });
  });

  describe('mapAnticipatoryActionAlertRow', () => {
    it('maps snake_case, enum text, and last_states JSONB', () => {
      const lastStates = {
        '07-20242025': {
          refTime: '2025-01-30T12:00:00Z',
          status: 'ready',
        },
      };
      const row = {
        id: 7,
        country: 'Mozambique',
        type: 'storm',
        emails: ['x@y.org'],
        prism_url: 'https://prism.moz.wfp.org',
        last_triggered_at: new Date('2025-01-01Z'),
        last_ran_at: new Date('2025-01-02Z'),
        last_states: lastStates,
      };

      expect(mapAnticipatoryActionAlertRow(row)).toEqual({
        id: 7,
        country: 'Mozambique',
        type: 'storm',
        emails: ['x@y.org'],
        prismUrl: 'https://prism.moz.wfp.org',
        lastTriggeredAt: row.last_triggered_at,
        lastRanAt: row.last_ran_at,
        lastStates,
      });
    });

    it('handles null last_states and timestamps', () => {
      const row = {
        id: 1,
        country: 'mozambique',
        type: 'flood',
        emails: [],
        prism_url: 'https://p',
        last_triggered_at: null,
        last_ran_at: null,
        last_states: null,
      };

      const mapped = mapAnticipatoryActionAlertRow(row);
      expect(mapped.lastStates).toBeUndefined();
      expect(mapped.lastTriggeredAt).toBeUndefined();
      expect(mapped.lastRanAt).toBeUndefined();
    });
  });
});
