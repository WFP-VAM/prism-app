import React, { memo, useCallback, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  createStyles,
  Grid,
  makeStyles,
  Typography,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { useSafeTranslation } from 'i18n';
import AnalysisLayerSwitchItem from 'components/MapView/LeftPanel/layersPanel/AnalysisLayerSwitchItem';
import {
  BaselineLayerResult,
  ExposedPopulationResult,
  PolygonAnalysisResult,
} from 'utils/analysis-utils';
import { paleSkyBlue } from 'muiTheme';

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

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
    },
    rootSummary: {
      backgroundColor: paleSkyBlue,
    },
    rootDetails: {
      padding: 0,
    },
    expandIcon: {
      color: '#53888F',
    },
    summaryContent: {
      alignItems: 'center',
    },
    chipRoot: {
      marginLeft: '3%',
    },
    title: {
      color: '#53888F',
      fontWeight: 600,
    },
  }),
);

const AnalysisLayerMenuItem = memo(
  ({
    title,
    analysisData,
    initialOpacity,
    analysisResultSortByKey,
    analysisResultSortOrder,
  }: AnalysisLayerMenuItemProps) => {
    const { t } = useSafeTranslation();
    const classes = useStyles();

    // We will only have one analysis at a time so when the actual Menu item is visible it will also be enabled
    const [informationChipLabel, setInformationChipLabel] = useState<string>(
      '1',
    );

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
            expandIcon: classes.expandIcon,
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
            color="secondary"
            label={informationChipLabel}
          />
        </AccordionSummary>
        <AccordionDetails classes={{ root: classes.rootDetails }}>
          <Grid container direction="column">
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
