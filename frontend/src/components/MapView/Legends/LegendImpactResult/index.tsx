import { useSafeTranslation } from 'i18n';
import { memo } from 'react';

import LegendMarkdown from '../LegendMarkdown';

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
        {`${t('Impact Analysis on')}:`}
        <LegendMarkdown>{t(legendText)}</LegendMarkdown>
        {thresholdAbove ? (
          <>
            <br />
            {t('Above Threshold')}: {thresholdAbove}
          </>
        ) : (
          ''
        )}
        {thresholdBelow ? (
          <>
            <br />
            {t('Below Threshold')}: {thresholdBelow}
          </>
        ) : (
          ''
        )}
      </>
    );
  },
);

export default LegendImpactResult;
