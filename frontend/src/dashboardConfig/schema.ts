import { AggregationOperations } from 'config/aggregationOperations';
import { generateSlugFromTitle } from 'utils/string-utils';
import { z } from 'zod';

import {
  ChartHeight,
  ChartLatestPeriod,
  DashboardElementType,
  DashboardMapPosition,
} from './dashboardEnums';

const preSelectedMapLayerSchema = z.object({
  layerId: z.string(),
  opacity: z.number().min(0).max(1).optional().default(1),
});

const dashboardMapConfigSchema = z
  .object({
    type: z.literal(DashboardElementType.MAP),
    date: z.string().optional(),
    useLatestAvailableDate: z.boolean().optional().default(false),
    mapPosition: z.enum(DashboardMapPosition).optional(),
    minMapBounds: z.array(z.number()).optional(),
    title: z.string().optional(),
    legendVisible: z.boolean().optional().default(true),
    legendPosition: z
      .enum(DashboardMapPosition)
      .optional()
      .default(DashboardMapPosition.right),
    preSelectedMapLayers: z.array(preSelectedMapLayerSchema).default([]),
  })
  .transform(config =>
    config.useLatestAvailableDate ? { ...config, date: undefined } : config,
  );

const dashboardChartConfigSchema = z
  .object({
    type: z.literal(DashboardElementType.CHART),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    layerId: z.string(),
    adminUnitLevel: z.number().optional(),
    adminUnitId: z.union([z.string(), z.number()]).optional(),
    chartHeight: z.enum(ChartHeight).optional().default(ChartHeight.TALL),
    useLatestAvailableDate: z.boolean().optional().default(false),
    latestPeriod: z
      .enum(ChartLatestPeriod)
      .optional()
      .default(ChartLatestPeriod.MONTH),
  })
  .transform(config =>
    config.useLatestAvailableDate
      ? { ...config, startDate: undefined, endDate: undefined }
      : config,
  );

const dashboardTextConfigSchema = z.object({
  type: z.literal(DashboardElementType.TEXT),
  content: z.string(),
  textUpdatedAt: z.string().optional(),
});

const thresholdDefinitionSchema = z.object({
  below: z.number().optional(),
  above: z.number().optional(),
});

const dashboardTableConfigSchema = z
  .object({
    type: z.literal(DashboardElementType.TABLE),
    startDate: z.string().optional(),
    useLatestAvailableDate: z.boolean().optional().default(false),
    hazardLayerId: z.string(),
    baselineLayerId: z.string(),
    threshold: thresholdDefinitionSchema.optional(),
    stat: z.enum(AggregationOperations),
    maxRows: z.number().optional().default(10),
    addResultToMap: z.boolean().optional().default(true),
    sortColumn: z.union([z.string(), z.number()]).optional().default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  })
  .transform(config =>
    config.useLatestAvailableDate
      ? { ...config, startDate: undefined }
      : config,
  );

const dashboardElementSchema = z.discriminatedUnion('type', [
  dashboardMapConfigSchema,
  dashboardChartConfigSchema,
  dashboardTextConfigSchema,
  dashboardTableConfigSchema,
]);

const dashboardConfigInputSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  path: z.string().optional(),
  country: z.string().optional(),
  isDraft: z.boolean().optional(),
  firstColumn: z.array(dashboardElementSchema),
  secondColumn: z.array(dashboardElementSchema).optional(),
  thirdColumn: z.array(dashboardElementSchema).optional(),
});

export const dashboardConfigSchema = dashboardConfigInputSchema.transform(
  d => ({
    ...d,
    path: d.path?.trim() || generateSlugFromTitle(d.title),
  }),
);

export type DashboardChartConfig = z.infer<typeof dashboardChartConfigSchema>;
export type DashboardMapConfig = z.infer<typeof dashboardMapConfigSchema>;
export type DashboardTextConfig = z.infer<typeof dashboardTextConfigSchema>;
export type DashboardTableConfig = z.infer<typeof dashboardTableConfigSchema>;
export type DashboardElements = z.infer<typeof dashboardElementSchema>;
export type Dashboard = z.infer<typeof dashboardConfigSchema>;

export type ValidateDashboardConfigResult =
  | { success: true; data: Dashboard[] }
  | { success: false; error: z.ZodError };

export type ValidateImportedDashboardConfigResult =
  | { success: true; data: Dashboard }
  | { success: false; error: z.ZodError };

/** Runtime validation for a published dashboard list (API fetch, draft storage). */
export function validateDashboardConfig(
  raw: unknown,
): ValidateDashboardConfigResult {
  const result = z.array(dashboardConfigSchema).safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

/** Runtime validation for a single dashboard JSON file (export/import). */
export function validateImportedDashboardConfig(
  raw: unknown,
): ValidateImportedDashboardConfigResult {
  const result = dashboardConfigSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
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
