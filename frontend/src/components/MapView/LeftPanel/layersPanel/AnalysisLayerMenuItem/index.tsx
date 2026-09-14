import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import AnalysisLayerSwitchItem from 'components/MapView/LeftPanel/layersPanel/AnalysisLayerSwitchItem';
import { layerMenuItemAccordionSx } from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import { useSafeTranslation } from 'i18n';
import { cyanBlue } from 'muiTheme';
import { memo, useCallback, useState } from 'react';
import {
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';

interface AnalysisLayerMenuItemProps {
  title: string;
  analysisData?:
    | BaselineLayerResult
    | PolygonAnalysisResult
    | ExposedPopulationResult;
  initialOpacity: number;
  analysisResultSortByKey: string | number;
  analysisResultSortOrder: 'asc' | 'desc';
}

const AnalysisLayerMenuItem = memo(
  ({
    title,
    analysisData,
    initialOpacity,
    analysisResultSortByKey,
    analysisResultSortOrder,
  }: AnalysisLayerMenuItemProps) => {
    const { t } = useSafeTranslation();

    const [informationChipLabel, setInformationChipLabel] =
      useState<string>('1');

    const handleChipOnMouseEnter = useCallback(() => {
      setInformationChipLabel(`1 ${t('Active Layer(s)')}`);
    }, [t]);

    const handleChipOnMouseLeave = useCallback(() => {
      setInformationChipLabel('1');
    }, []);

    return (
      <Accordion elevation={0} sx={layerMenuItemAccordionSx.root}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={layerMenuItemAccordionSx.summary}
          aria-controls={title}
          id={title}
        >
          <Typography sx={layerMenuItemAccordionSx.title}>
            {t(title)}
          </Typography>
          <Chip
            onMouseEnter={handleChipOnMouseEnter}
            onMouseLeave={handleChipOnMouseLeave}
            sx={{ ...layerMenuItemAccordionSx.chip, bgcolor: cyanBlue }}
            label={informationChipLabel}
          />
        </AccordionSummary>
        <AccordionDetails sx={layerMenuItemAccordionSx.details}>
          <Grid container direction="row" sx={{ pl: 1.5 }}>
            <AnalysisLayerSwitchItem
              initialOpacity={initialOpacity}
              analysisData={analysisData}
              title={analysisData?.getTitle(t) ?? ''}
              analysisResultSortByKey={analysisResultSortByKey}
              analysisResultSortOrder={analysisResultSortOrder}
            />
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  },
);

export default AnalysisLayerMenuItem;
