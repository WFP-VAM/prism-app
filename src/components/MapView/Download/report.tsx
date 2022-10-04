import React from 'react';
import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Theme,
  useTheme,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { useSelector } from 'react-redux';
import { ArrowBack } from '@material-ui/icons';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { snakeCase } from 'lodash';
import moment from 'moment';
import { useSafeTranslation } from '../../../i18n';
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import {
  analysisResultSelector,
  getCurrentData,
} from '../../../context/analysisResultStateSlice';
import { ReportType } from '../utils';
import { ExposedPopulationResult } from '../../../utils/analysis-utils';
import ReportDoc from './reportDoc';

function Report({ classes, open, reportType, handleClose }: ReportProps) {
  const theme = useTheme();
  const { t } = useSafeTranslation();
  const [mapImage, setMapImage] = React.useState<string | null>(null);
  const selectedMap = useSelector(mapSelector);
  const analysisData = useSelector(getCurrentData);
  const analysisResult = useSelector(
    analysisResultSelector,
  ) as ExposedPopulationResult;
  const eventDate = analysisResult?.date
    ? moment(new Date(analysisResult?.date)).format('YYYY-MM-DD')
    : '';

  const document = (
    <ReportDoc
      t={t}
      exposureLegendDefinition={analysisResult?.legend ?? []}
      theme={theme}
      reportType={reportType}
      tableName="Population Exposure"
      tableShowTotal
      eventName={
        reportType === ReportType.Storm
          ? `Storm Report (${eventDate})`
          : `Flood Report (${eventDate})`
      }
      mapImage={mapImage}
      tableData={analysisData}
    />
  );

  const getPDFName = () => {
    const type = snakeCase(analysisResult?.legendText);
    const date = new Date();
    const dateString = moment(date).format('DD_MM_YYYY');
    return `PRISM_report_${type}_${dateString}.pdf`;
  };

  React.useEffect(() => {
    if (!open) {
      return;
    }
    type Format = 'png' | 'jpeg';
    const getMapImage = (format: Format = 'png'): string | null => {
      if (selectedMap) {
        const activeLayers = selectedMap.getCanvas();
        const file = activeLayers.toDataURL(`image/${format}`);
        return file;
      }
      return null;
    };
    setMapImage(getMapImage('png'));
  }, [open, selectedMap]);

  return (
    <Dialog
      open={open}
      keepMounted
      onClose={() => handleClose()}
      maxWidth={false}
    >
      <DialogTitle className={classes.titleRoot}>
        <div className={classes.title}>
          <IconButton
            className={classes.titleIconButton}
            onClick={() => {
              handleClose();
            }}
          >
            <ArrowBack />
          </IconButton>
          <span className={classes.titleText}>
            {t(
              reportType === ReportType.Storm
                ? 'Storm impact Report'
                : 'Flood Report',
            )}
          </span>
        </div>
      </DialogTitle>
      <DialogContent style={{ height: '90vh', width: 'calc(90vh / 1.42)' }}>
        <div style={{ width: '100%', height: '100%' }}>
          <PDFViewer
            style={{ width: '100%', height: '100%' }}
            showToolbar={false}
          >
            {document}
          </PDFViewer>
        </div>
      </DialogContent>
      <DialogActions className={classes.actions}>
        <span className={classes.signature}>
          {t('P R I S M automated report')}
        </span>
        <Button className={classes.actionButton} variant="outlined">
          <PDFDownloadLink document={document} fileName={getPDFName()}>
            {({ loading }) => (loading ? 'Loading document...' : 'Download')}
          </PDFDownloadLink>
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    titleRoot: {
      background: theme.dialog?.border,
      padding: 0,
    },
    title: {
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
    },
    titleText: {
      flexGrow: 1,
      textAlign: 'center',
      fontSize: 18,
    },
    titleIconButton: {
      color: '#FFFFFF',
    },
    actions: {
      background: theme.dialog?.border,
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
    },
    actionButton: {
      background: '#FFFFFF',
      color: theme.dialog?.actionButton,
      fontSize: 12,
    },
    signature: {
      fontSize: 12,
      fontWeight: 500,
      paddingLeft: '1em',
    },
  });

export interface ReportProps extends WithStyles<typeof styles> {
  open: boolean;
  reportType: ReportType;
  handleClose: () => void;
}

export default withStyles(styles)(Report);
