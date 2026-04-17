import type { GeoJSON } from 'geojson';
import type { Alert, AlertConfig } from '../types/alert';
import type {
  AnticipatoryActionAlert,
  AnticipatoryActionHazardType,
} from '../types/anticipatory-action-alerts';

function parseJsonb<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as T;
}

export function mapAlertConfigFromRow(raw: unknown): AlertConfig {
  return raw as AlertConfig;
}

export function mapAlertRow(row: Record<string, unknown>): Alert {
  return {
    id: row.id as number,
    email: row.email as string,
    prismUrl: row.prism_url as string,
    alertName: (row.alert_name as string | null) ?? undefined,
    alertConfig: mapAlertConfigFromRow(row.alert_config),
    min: (row.min as number | null) ?? undefined,
    max: (row.max as number | null) ?? undefined,
    zones: parseJsonb<GeoJSON>(row.zones),
    active: Boolean(row.active),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    lastTriggered: (row.last_triggered as Date | null) ?? undefined,
  };
}

export function mapAnticipatoryActionAlertRow(
  row: Record<string, unknown>,
): AnticipatoryActionAlert {
  return {
    id: row.id as number,
    country: row.country as string,
    type: row.type as AnticipatoryActionHazardType,
    emails: row.emails as string[],
    prismUrl: row.prism_url as string,
    lastTriggeredAt: (row.last_triggered_at as Date | null) ?? undefined,
    lastRanAt: (row.last_ran_at as Date | null) ?? undefined,
    lastStates: parseJsonb<
      Record<string, { status: string; refTime: string }>
    >(row.last_states),
  };
}
