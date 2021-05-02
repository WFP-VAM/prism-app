export const extractPropsFromURL = (path: string) => {
  const params = new URLSearchParams(path);
  const hazardLayerParamId = params.get('hazardLayerId') || 'placeholder';
  const baselineLayerParamId = params.get('baselineLayerId') || 'placeholder';
  const selectedParamDate = Number(params.get('selectedDate')) || null;
  const statisticParam = params.get('statistic');
  const aboveThresholdParam: string = params.get('aboveThreshold') || '0';
  const belowThresholdParam: string = params.get('belowThreshold') || '0';
  const fromURL: boolean = params.get('share') === 'true';

  return {
    hazardLayerParamId,
    baselineLayerParamId,
    selectedParamDate,
    statisticParam,
    aboveThresholdParam,
    belowThresholdParam,
    fromURL,
  };
};
