import { z } from 'zod';
import { AggregationOperations } from 'config/aggregationOperations';
import {
  ChartHeight,
  DashboardElementType,
  DashboardMapPosition,
} from './dashboardEnums';
import { generateSlugFromTitle } from 'utils/string-utils';

const preSelectedMapLayerSchema = z.object({
  layerId: z.string(),
  opacity: z.number().min(0).max(1).optional(),
});

const dashboardMapConfigSchema = z.object({
  type: z.literal(DashboardElementType.MAP),
  defaultDate: z.string().optional(),
  mapPosition: z.enum(DashboardMapPosition).optional(),
  minMapBounds: z.array(z.number()).optional(),
  title: z.string().optional(),
  legendVisible: z.boolean().optional(),
  legendPosition: z.enum(DashboardMapPosition).optional(),
  preSelectedMapLayers: z.array(preSelectedMapLayerSchema).default([]),
});

const dashboardChartConfigSchema = z.object({
  type: z.literal(DashboardElementType.CHART),
  startDate: z.string(),
  endDate: z.string().optional(),
  layerId: z.string(),
  adminUnitLevel: z.number().optional(),
  adminUnitId: z.number().optional(),
  chartHeight: z.enum(ChartHeight).optional(),
});

const dashboardTextConfigSchema = z.object({
  type: z.literal(DashboardElementType.TEXT),
  content: z.string(),
  textUpdatedAt: z.string().optional(),
});

const thresholdDefinitionSchema = z.object({
  below: z.number().optional(),
  above: z.number().optional(),
});

const dashboardTableConfigSchema = z.object({
  type: z.literal(DashboardElementType.TABLE),
  startDate: z.string(),
  hazardLayerId: z.string(),
  baselineLayerId: z.string(),
  threshold: thresholdDefinitionSchema.optional(),
  stat: z.enum(AggregationOperations),
  maxRows: z.number().optional(),
  addResultToMap: z.boolean().optional(),
  sortColumn: z.union([z.string(), z.number()]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const dashboardElementSchema = z.discriminatedUnion('type', [
  dashboardMapConfigSchema,
  dashboardChartConfigSchema,
  dashboardTextConfigSchema,
  dashboardTableConfigSchema,
]);

const dashboardRowInputSchema = z.object({
  title: z.string(),
  path: z.string().optional(),
  isEditable: z.boolean().optional(),
  firstColumn: z.array(dashboardElementSchema),
  secondColumn: z.array(dashboardElementSchema).optional(),
  thirdColumn: z.array(dashboardElementSchema).optional(),
});

const dashboardRowSchema = dashboardRowInputSchema.transform(d => ({
  ...d,
  path: d.path?.trim() ? d.path : generateSlugFromTitle(d.title),
}));

/** Wire format version for `dashboard.json`. Bump only when existing payloads would fail validation. */
export const CURRENT_DASHBOARD_SCHEMA_VERSION = 1 as const;

const dashboardRowsSchema = z.array(dashboardRowSchema);

const dashboardConfigV1Schema = z.object({
  schemaVersion: z.literal(1),
  rows: dashboardRowsSchema,
});

const dashboardConfigRootSchema = z.preprocess((raw: unknown) => {
  if (Array.isArray(raw)) {
    return { schemaVersion: 1, rows: raw };
  }
  return raw;
}, dashboardConfigV1Schema);

export type DashboardChartConfig = z.infer<typeof dashboardChartConfigSchema>;
export type DashboardMapConfig = z.infer<typeof dashboardMapConfigSchema>;
export type DashboardTextConfig = z.infer<typeof dashboardTextConfigSchema>;
export type DashboardTableConfig = z.infer<typeof dashboardTableConfigSchema>;
export type DashboardElements = z.infer<typeof dashboardElementSchema>;
export type Dashboard = z.infer<typeof dashboardRowSchema>;

/** Validated list of dashboard rows (same as root `rows` after parse). */
export const dashboardConfigArraySchema = dashboardRowsSchema;

export type DashboardConfigArray = z.infer<typeof dashboardConfigArraySchema>;

export type ValidateDashboardConfigResult =
  | { success: true; data: DashboardConfigArray }
  | { success: false; error: z.ZodError };

/**
 * Runtime validation for dashboard.json (S3 fetch and future import-JSON).
 * Accepts a top-level JSON array (implicit v1) or `{ "schemaVersion": 1, "rows": [...] }`.
 * Dashboard element shapes and Dashboard are inferred from this schema (see config/types re-exports).
 */
export function validateDashboardConfig(
  raw: unknown,
): ValidateDashboardConfigResult {
  const result = dashboardConfigRootSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data.rows };
}

export function formatDashboardValidationError(error: z.ZodError): string {
  const issues = error.issues.slice(0, 5).map(issue => {
    const path = issue.path.length ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
  const suffix =
    error.issues.length > 5 ? ` (+${error.issues.length - 5} more)` : '';
  return `Invalid dashboard configuration: ${issues.join('; ')}${suffix}`;
}
