export const extractPropsFromURL = (path: string) => {
  const params = new URLSearchParams(path);
  const hazardLayerParamId = params.get('hazardLayerId');
  const baselineLayerParamId = params.get('baselineLayerId');
  const selectedParamDate: number = Number(params.get('date'));
  const statisticParam = params.get('statistic');
  const aboveThresholdParam: string = params.get('aboveThreshold') || '';
  const belowThresholdParam: string = params.get('belowThreshold') || '';

  return {
    hazardLayerParamId,
    baselineLayerParamId,
    selectedParamDate,
    statisticParam,
    aboveThresholdParam,
    belowThresholdParam,
  };
};
