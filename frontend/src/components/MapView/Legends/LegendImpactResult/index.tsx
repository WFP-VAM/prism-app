import { memo } from 'react';
import { useSafeTranslation } from 'i18n';

interface LegendImpactProps {
  legendText: string;
  thresholdAbove?: number;
  thresholdBelow?: number;
}

const LegendImpactResult = memo(
  ({ legendText, thresholdBelow, thresholdAbove }: LegendImpactProps) => {
    const { t } = useSafeTranslation();
    return (
      <>
        {`${t('Impact Analysis on')}: ${t(legendText)}`}
        <br />
        {thresholdAbove ? `${t('Above Threshold')}: ${thresholdAbove}` : ''}
        <br />
        {thresholdBelow ? `${t('Below Threshold')}: ${thresholdBelow}` : ''}
      </>
    );
  },
);

export default LegendImpactResult;
