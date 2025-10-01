import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  makeStyles,
  createStyles,
  Theme,
} from '@material-ui/core';
import { Cancel, GetApp } from '@material-ui/icons';
import { useContext } from 'react';
import { cyanBlue } from 'muiTheme';
import { useSafeTranslation } from 'i18n';
import DashboardExportContext, { PaperSize } from './dashboardExport.context';

function DashboardExportConfig() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { exportConfig } = useContext(DashboardExportContext);

  if (!exportConfig) {
    return null;
  }

  const {
    handleClose,
    download,
    downloadFormat,
    setDownloadFormat,
    isExporting,
    paperSize,
    setPaperSize,
  } = exportConfig;

  return (
    <Box className={classes.configContainer}>
      <div>
        <Box className={classes.title}>{t('Export Options')}</Box>
        <IconButton className={classes.closeButton} onClick={handleClose}>
          <Cancel />
        </IconButton>
      </div>

      <Box className={classes.optionWrap}>
        <FormControl variant="outlined" size="small" fullWidth>
          <InputLabel id="paper-size-label">{t('Paper Size')}</InputLabel>
          <Select
            labelId="paper-size-label"
            value={paperSize}
            onChange={e => setPaperSize(e.target.value as PaperSize)}
            label={t('Paper Size')}
          >
            <MenuItem value={PaperSize.BROWSER}>
              {t('Browser Dimensions')}
            </MenuItem>
            <MenuItem value={PaperSize.US_LETTER_LANDSCAPE}>
              {t('US Letter Landscape')}
            </MenuItem>
            <MenuItem value={PaperSize.A4_LANDSCAPE}>
              {t('A4 Landscape')}
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box className={classes.optionWrap}>
        <FormControl variant="outlined" size="small" fullWidth>
          <InputLabel id="export-format-label">{t('Format')}</InputLabel>
          <Select
            labelId="export-format-label"
            value={downloadFormat}
            onChange={e => setDownloadFormat(e.target.value as 'pdf' | 'png')}
            label={t('Format')}
          >
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="png">PNG</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Button
        style={{ backgroundColor: cyanBlue, color: 'black' }}
        variant="contained"
        color="primary"
        className={classes.gutter}
        endIcon={<GetApp />}
        onClick={() => download(downloadFormat)}
        disabled={isExporting}
      >
        {isExporting ? t('Exporting...') : t('Download')}
      </Button>
    </Box>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    configContainer: {
      display: 'flex',
      height: '100%',
      flexDirection: 'column',
      gap: '0.5rem',
      minHeight: '740px',
      width: '19.2rem',
      scrollbarGutter: 'stable',
      overflow: 'auto',
      paddingRight: '15px',
      zIndex: 4,
      backgroundColor: 'white',
    },
    title: {
      fontSize: 14,
      fontWeight: 900,
      marginBottom: '1em',
      color: theme.palette.text.secondary,
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
    },
    optionWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
    },
    gutter: {
      marginTop: 16,
      marginBottom: 10,
    },
  }),
);

export default DashboardExportConfig;
