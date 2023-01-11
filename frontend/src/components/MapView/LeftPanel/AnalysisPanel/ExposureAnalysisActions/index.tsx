import React, { useState } from 'react';
import {
  Button,
  createStyles,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { snakeCase } from 'lodash';
import { useSelector } from 'react-redux';
import {
  downloadToFile,
  exportDataTableToCSV,
  ReportType,
} from '../../../utils';
import { useSafeTranslation } from '../../../../../i18n';
import {
  getCurrentData,
  getCurrentDefinition,
} from '../../../../../context/analysisResultStateSlice';
import Report from '../../../Download/report';
import { layersSelector } from '../../../../../context/mapStateSlice/selectors';

function ExposureAnalysisActions({
  analysisButton,
  bottomButton,
  clearAnalysis,
}: ExposureAnalysisActionsProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t } = useSafeTranslation();
  const analysisDefinition = useSelector(getCurrentDefinition);
  const analysisData = useSelector(getCurrentData);
  const selectedLayers = useSelector(layersSelector);

  const [openReport, setOpenReport] = useState(false);

  const isShowingStormData = selectedLayers.some(
    ({ id }) => id === 'adamts_buffers',
  );

  const analysisCsvData = exportDataTableToCSV(analysisData);
  const handleDownload = (payload: string, e: React.ChangeEvent<{}>) => {
    e.preventDefault();
    downloadToFile(
      {
        content: payload,
        isUrl: false,
      },
      `${snakeCase(analysisDefinition?.id)}_${snakeCase(
        analysisDefinition?.legendText,
      )}`,
      'text/csv',
    );
  };

  return (
    <>
      <Button className={analysisButton} onClick={clearAnalysis}>
        <Typography variant="body2">{t('Clear Analysis')}</Typography>
      </Button>
      {analysisCsvData && (
        <Button
          className={bottomButton}
          onClick={e => handleDownload(analysisCsvData, e)}
        >
          <Typography variant="body2">{t('Download as CSV')}</Typography>
        </Button>
      )}
      <Button className={bottomButton} onClick={() => setOpenReport(true)}>
        <Typography variant="body2">{t('Create Report')}</Typography>
      </Button>
      <Report
        open={openReport}
        handleClose={() => setOpenReport(false)}
        reportType={isShowingStormData ? ReportType.Storm : ReportType.Flood}
      />
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    tableContainer: {
      height: '60vh',
      maxWidth: '90%',
      marginTop: 5,
      zIndex: theme.zIndex.modal + 1,
    },
    tableHead: {
      backgroundColor: '#EBEBEB',
      boxShadow: 'inset 0px -1px 0px rgba(0, 0, 0, 0.25)',
    },
    tableHeaderText: {
      color: 'black',
      fontWeight: 500,
    },
    tableBodyText: {
      color: 'black',
    },
    innerAnalysisButton: {
      backgroundColor: theme.surfaces?.dark,
    },
    tablePagination: {
      display: 'flex',
      justifyContent: 'center',
      color: 'black',
    },
    select: {
      flex: '1 1 10%',
      maxWidth: '10%',
      marginRight: 0,
    },
    caption: {
      flex: '1 2 30%',
      marginLeft: 0,
    },
    backButton: {
      flex: '1 1 5%',
      maxWidth: '10%',
    },
    nextButton: {
      flex: '1 1 5%',
      maxWidth: '10%',
    },
    spacer: {
      flex: '1 1 5%',
      maxWidth: '5%',
    },
  });

interface ExposureAnalysisActionsProps extends WithStyles<typeof styles> {
  analysisButton?: string;
  bottomButton?: string;
  clearAnalysis: () => void;
}

export default withStyles(styles)(ExposureAnalysisActions);
