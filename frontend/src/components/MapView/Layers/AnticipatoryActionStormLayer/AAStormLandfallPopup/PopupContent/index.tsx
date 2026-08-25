import { Box, Typography } from '@mui/material';
import { LandfallInfo } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { useSafeTranslation } from 'i18n';

import {
  formatLandfallDate,
  formatLandfallEstimatedLeadtime,
  formatLandfallTimeRange,
  formatReportDate,
} from '../../utils';
import {
  blockSx,
  itemContainerSx,
  itemsContainerSx,
  textAlignRightSx,
  textSx,
  titleSx,
} from './popupContentStyles';

function PopupContent({ landfallInfo, reportDate }: PopupContentProps) {
  const { t } = useSafeTranslation();

  return (
    <Box sx={itemsContainerSx}>
      <Typography variant="body1" sx={[textSx, titleSx]}>
        {t('Report date')}: {formatReportDate(reportDate)}
      </Typography>
      <Box sx={itemContainerSx}>
        <Typography variant="body1" sx={textSx} style={{ maxWidth: 100 }}>
          {t('Landfall estimated time')}
        </Typography>
        <Typography variant="body1" sx={[textSx, textAlignRightSx]}>
          {formatLandfallDate(landfallInfo.time)}
          <Box component="span" sx={blockSx}>
            {formatLandfallTimeRange(landfallInfo.time)}
          </Box>
        </Typography>
      </Box>
      <Box sx={itemContainerSx}>
        <Typography variant="body1" sx={textSx} style={{ maxWidth: 150 }}>
          {t('Landfall estimated leadtime')}
        </Typography>
        <Typography variant="body1" sx={[textSx, textAlignRightSx]}>
          {formatLandfallEstimatedLeadtime(landfallInfo.time, reportDate)}
        </Typography>
      </Box>
      <Box sx={itemContainerSx}>
        <Typography variant="body1" sx={textSx} style={{ maxWidth: 150 }}>
          {t('District impacted by landfall')}
        </Typography>
        <Typography variant="body1" sx={[textSx, textAlignRightSx]}>
          {landfallInfo.district}
        </Typography>
      </Box>
    </Box>
  );
}

interface PopupContentProps {
  landfallInfo: LandfallInfo;
  reportDate: string;
}

export default PopupContent;
