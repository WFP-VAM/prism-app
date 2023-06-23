import { LayerKey } from '../config/types';

export type AnalysisParams = {
  analysisBaselineLayerId?: LayerKey;
  analysisHazardLayerId?: LayerKey;
  analysisDate?: string;
  analysisStatistic?: string;
  analysisThresholdAbove?: string;
  analysisThresholdBelow?: string;
  analysisStartDate?: string;
  analysisEndDate?: string;
  analysisAdminLevel?: string;
};
