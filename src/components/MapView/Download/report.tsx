import React from 'react';
import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  WithStyles,
  withStyles,
} from '@material-ui/core';
// import { jsPDF } from 'jspdf';
// import { Page, Document, pdfjs } from 'react-pdf';
import { useSelector } from 'react-redux';
import { ArrowBack } from '@material-ui/icons';
import {
  PDFViewer,
  //  BlobProvider,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import { useSafeTranslation } from '../../../i18n';
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import StormReportDoc from './stormReportDoc';

// eslint-disable-next-line fp/no-mutation
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function Report({ classes, open, setOpen, handleClose }: ReportProps) {
  const { t } = useSafeTranslation();
  const [mapImage, setMapImage] = React.useState<string>('');
  const selectedMap = useSelector(mapSelector);

  React.useEffect(() => {
    const getMapImage = (format: 'png' | 'jpeg' = 'png'): string | null => {
      if (selectedMap) {
        const activeLayers = selectedMap.getCanvas();
        const file = activeLayers.toDataURL(`image/${format}`);
        return file;
      }
      return null;
    };

    if (open) {
      setMapImage(getMapImage('png') || '');
    }
  }, [open, selectedMap]);

  return (
    <Dialog
      open={open}
      keepMounted
      onClose={() => setOpen(false)}
      maxWidth={false}
    >
      <DialogTitle className={classes.titleRoot}>
        <div className={classes.title}>
          <IconButton
            className={classes.titleIconButton}
            onClick={() => {
              setOpen(false);
              handleClose();
            }}
          >
            <ArrowBack />
          </IconButton>
          <span className={classes.titleText}>{t('Storm impact report')}</span>
        </div>
      </DialogTitle>
      <DialogContent style={{ height: '90vh', width: 'calc(90vh / 1.42)' }}>
        {/* <BlobProvider document={<StormReportDoc mapImage={mapImage} />}>
          {({ blob, url, loading, error }) => {
            // Do whatever you need with blob here
            return (
              <div>
                <Document file={url}>
                  <Page pageNumber={1} />
                </Document>
                <a href={url || ''} target="blank" style={{ color: 'black' }}>
                  Download
                </a>
              </div>
            );
          }}
        </BlobProvider> */}
        <div style={{ width: '100%', height: '100%' }}>
          <PDFViewer style={{ width: '100%', height: '100%' }}>
            <StormReportDoc mapImage={mapImage} />
          </PDFViewer>
        </div>
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Button className={classes.actionButton} variant="outlined">
          <PDFDownloadLink
            document={<StormReportDoc mapImage={mapImage} />}
            fileName="prism-report.pdf"
          >
            {
              // eslint-disable-next-line no-unused-vars
              ({ blob, url, loading, error }) =>
                loading ? 'Loading document...' : 'Download'
            }
          </PDFDownloadLink>
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const styles = () =>
  createStyles({
    titleRoot: {
      background: '#2E6EAF',
    },
    title: {
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
    },
    titleText: {
      flexGrow: 1,
      textAlign: 'center',
    },
    titleIconButton: {
      color: '#FFFFFF',
    },
    actions: {
      background: '#2E6EAF',
    },
    actionButton: {
      background: '#FFFFFF',
      color: '#6F9FD2',
    },
  });

export interface ReportProps extends WithStyles<typeof styles> {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleClose: () => void;
}

export default withStyles(styles)(Report);
