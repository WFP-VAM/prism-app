import { z } from 'zod';
import type { Dashboard } from 'config/types';
import { DashboardElementType } from 'config/types';
import { generateSlugFromTitle } from 'utils/string-utils';

const preSelectedMapLayerSchema = z.object({
  layerId: z.string(),
  opacity: z.number().min(0).max(1).optional(),
});

const dashboardMapConfigSchema = z.object({
  type: z.literal(DashboardElementType.MAP),
  defaultDate: z.string().optional(),
  mapPosition: z.enum(['left', 'right']).optional(),
  minMapBounds: z.array(z.number()).optional(),
  title: z.string().optional(),
  legendVisible: z.boolean().optional(),
  legendPosition: z.enum(['left', 'right']).optional(),
  preSelectedMapLayers: z.array(preSelectedMapLayerSchema).default([]),
});

const dashboardChartConfigSchema = z.object({
  type: z.literal(DashboardElementType.CHART),
  startDate: z.string(),
  endDate: z.string().optional(),
  layerId: z.string(),
  adminUnitLevel: z.number().optional(),
  adminUnitId: z.number().optional(),
  chartHeight: z.enum(['tall', 'medium', 'short']).optional(),
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
  stat: z.enum(['max', 'mean', 'median', 'min', 'sum', 'intersect_percentage']),
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

const dashboardSchema = z.object({
  title: z.string(),
  path: z.string().optional(),
  isEditable: z.boolean().optional(),
  firstColumn: z.array(dashboardElementSchema),
  secondColumn: z.array(dashboardElementSchema).optional(),
  thirdColumn: z.array(dashboardElementSchema).optional(),
});

export const dashboardConfigArraySchema = z.array(dashboardSchema);

export type ParsedDashboardConfig = z.infer<typeof dashboardConfigArraySchema>;

function normalizeDashboards(parsed: ParsedDashboardConfig): Dashboard[] {
  return parsed.map(d => ({
    ...d,
    path: d.path?.trim() ? d.path : generateSlugFromTitle(d.title),
    firstColumn: d.firstColumn.map(el => {
      if (el.type === DashboardElementType.MAP) {
        return { ...el, preSelectedMapLayers: el.preSelectedMapLayers ?? [] };
      }
      return el;
    }),
    secondColumn: d.secondColumn?.map(el => {
      if (el.type === DashboardElementType.MAP) {
        return { ...el, preSelectedMapLayers: el.preSelectedMapLayers ?? [] };
      }
      return el;
    }),
    thirdColumn: d.thirdColumn?.map(el => {
      if (el.type === DashboardElementType.MAP) {
        return { ...el, preSelectedMapLayers: el.preSelectedMapLayers ?? [] };
      }
      return el;
    }),
  })) as Dashboard[];
}

export type ValidateDashboardConfigResult =
  | { success: true; data: Dashboard[] }
  | { success: false; error: z.ZodError };

/**
 * Runtime validation for dashboard.json (S3 fetch and future import-JSON).
 * Aligns with config/types.ts Dashboard and DashboardElements.
 */
export function validateDashboardConfig(
  raw: unknown,
): ValidateDashboardConfigResult {
  const result = dashboardConfigArraySchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: normalizeDashboards(result.data) };
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
