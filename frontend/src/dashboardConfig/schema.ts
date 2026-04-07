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
  opacity: z.number().min(0).max(1).optional().default(1),
});

const dashboardMapConfigSchema = z.object({
  type: z.literal(DashboardElementType.MAP),
  defaultDate: z.string().optional(),
  mapPosition: z.enum(DashboardMapPosition).optional(),
  minMapBounds: z.array(z.number()).optional(),
  title: z.string().optional(),
  legendVisible: z.boolean().optional().default(true),
  legendPosition: z
    .enum(DashboardMapPosition)
    .optional()
    .default(DashboardMapPosition.right),
  preSelectedMapLayers: z.array(preSelectedMapLayerSchema).default([]),
});

const dashboardChartConfigSchema = z.object({
  type: z.literal(DashboardElementType.CHART),
  startDate: z.string(),
  endDate: z.string().optional(),
  layerId: z.string(),
  adminUnitLevel: z.number().optional(),
  adminUnitId: z.number().optional(),
  chartHeight: z.enum(ChartHeight).optional().default(ChartHeight.TALL),
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
  maxRows: z.number().optional().default(10),
  addResultToMap: z.boolean().optional().default(true),
  sortColumn: z.union([z.string(), z.number()]).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
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
  isEditable: z.boolean().optional().default(false),
  firstColumn: z.array(dashboardElementSchema),
  secondColumn: z.array(dashboardElementSchema).optional(),
  thirdColumn: z.array(dashboardElementSchema).optional(),
});

const dashboardRowSchema = dashboardRowInputSchema.transform(d => ({
  ...d,
  path: d.path?.trim() ? d.path : generateSlugFromTitle(d.title),
}));

export type DashboardChartConfig = z.infer<typeof dashboardChartConfigSchema>;
export type DashboardMapConfig = z.infer<typeof dashboardMapConfigSchema>;
export type DashboardTextConfig = z.infer<typeof dashboardTextConfigSchema>;
export type DashboardTableConfig = z.infer<typeof dashboardTableConfigSchema>;
export type DashboardElements = z.infer<typeof dashboardElementSchema>;
export type Dashboard = z.infer<typeof dashboardRowSchema>;

export const dashboardConfigArraySchema = z.array(dashboardRowSchema);

export type DashboardConfigArray = z.infer<typeof dashboardConfigArraySchema>;

export type ValidateDashboardConfigResult =
  | { success: true; data: DashboardConfigArray }
  | { success: false; error: z.ZodError };

/**
 * Runtime validation for dashboard.json (S3 fetch and future import-JSON).
 * Dashboard element shapes and Dashboard are inferred from this schema (see config/types re-exports).
 */
export function validateDashboardConfig(
  raw: unknown,
): ValidateDashboardConfigResult {
  const result = dashboardConfigArraySchema.safeParse(raw);
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
