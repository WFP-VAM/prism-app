import { memo, useCallback, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSafeTranslation } from 'i18n';
import AnalysisLayerSwitchItem from 'components/MapView/LeftPanel/layersPanel/AnalysisLayerSwitchItem';
import {
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';
import { cyanBlue } from 'muiTheme';
import { useLayerMenuItemStyles } from 'components/MapView/LeftPanel/layersPanel/MenuItem/utils';

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
    const classes = useLayerMenuItemStyles();

    // We will only have one analysis at a time so when the actual Menu item is visible it will also be enabled
    const [informationChipLabel, setInformationChipLabel] =
      useState<string>('1');

    const handleChipOnMouseEnter = useCallback(() => {
      setInformationChipLabel(`1 ${t('Active Layer(s)')}`);
    }, [t]);

    const handleChipOnMouseLeave = useCallback(() => {
      setInformationChipLabel('1');
    }, []);

    return (
      <Accordion elevation={0} classes={{ root: classes.root }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          classes={{
            root: classes.rootSummary,
            content: classes.summaryContent,
          }}
          aria-controls={title}
          id={title}
        >
          <Typography classes={{ root: classes.title }}>{t(title)}</Typography>
          <Chip
            onMouseEnter={handleChipOnMouseEnter}
            onMouseLeave={handleChipOnMouseLeave}
            classes={{ root: classes.chipRoot }}
            style={{ backgroundColor: cyanBlue }}
            label={informationChipLabel}
          />
        </AccordionSummary>
        <AccordionDetails classes={{ root: classes.rootDetails }}>
          <Grid container direction="row" style={{ paddingLeft: 12 }}>
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
