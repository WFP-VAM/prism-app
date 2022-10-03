import React, { useRef, useState } from 'react';
import {
  Button,
  createStyles,
  Grid,
  Hidden,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Theme,
  Tooltip,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import Menu, { MenuProps } from '@material-ui/core/Menu';
import {
  CloudDownload,
  ArrowDropDown,
  Image,
  Description,
} from '@material-ui/icons';
import { useSelector } from 'react-redux';
import {
  layersSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import DownloadImage from './image';
import Report from './report';
import { analysisResultSelector } from '../../../context/analysisResultStateSlice';
import { ReportType } from '../utils';

const ExportMenu = withStyles((theme: Theme) => ({
  paper: {
    border: '1px solid #d3d4d5',
    backgroundColor: theme.palette.primary.main,
  },
}))((props: MenuProps) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'center',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'center',
    }}
    {...props}
  />
));

const ExportMenuItem = withStyles((theme: Theme) => ({
  root: {
    color: theme.palette.common.white,
  },
}))(MenuItem);

function Download({ classes }: DownloadProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openImage, setOpenImage] = useState(false);
  const [openReport, setOpenReport] = useState(false);
  const selectedMap = useSelector(mapSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const selectedLayers = useSelector(layersSelector);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const isShowingStormData = selectedLayers.some(
    ({ id }) => id === 'adamts_buffers',
  );

  const isShowingFloodData = selectedLayers.some(({ id }) =>
    id.includes('hydra_'),
  );

  const shouldShowReport = isShowingFloodData || isShowingStormData;

  const hasAnalysisData = analysisResult !== undefined;

  const tooltipText = (() => {
    if (!shouldShowReport) {
      return 'Reports can only be generated for Tropical Storms or Floods, in hazards menu';
    }
    if (!hasAnalysisData) {
      return 'Run analysis first to generate report';
    }
    return '';
  })();

  const { t } = useSafeTranslation();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setOpenImage(false);
    setOpenReport(false);
    setAnchorEl(null);
  };

  const openModal = () => {
    if (selectedMap) {
      const activeLayers = selectedMap.getCanvas();
      const canvas = previewRef.current;
      if (canvas) {
        canvas.setAttribute('width', activeLayers.width.toString());
        canvas.setAttribute('height', activeLayers.height.toString());
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(activeLayers, 0, 0);
        }
      }
      setOpenImage(true);
    }
    handleClose();
  };

  return (
    <Grid item>
      <Button variant="contained" color="primary" onClick={handleClick}>
        <CloudDownload fontSize="small" />
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            {t('Export')}
          </Typography>
        </Hidden>
        <ArrowDropDown fontSize="small" />
      </Button>
      <ExportMenu
        id="export-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {/* https://v4.mui.com/components/tooltips/#disabled-elements */}
        <Tooltip placement="left" title={tooltipText}>
          <span style={{ display: 'flex' }}>
            <ExportMenuItem
              onClick={() => setOpenReport(true)}
              disabled={!shouldShowReport || !hasAnalysisData}
            >
              <ListItemIcon>
                <Description fontSize="small" htmlColor="white" />
              </ListItemIcon>
              <ListItemText primary={t('REPORT')} />
            </ExportMenuItem>
          </span>
        </Tooltip>

        <ExportMenuItem onClick={openModal}>
          <ListItemIcon>
            <Image fontSize="small" htmlColor="white" />
          </ListItemIcon>
          <ListItemText primary={t('IMAGE')} />
        </ExportMenuItem>
      </ExportMenu>
      <DownloadImage
        open={openImage}
        previewRef={previewRef}
        handleClose={handleClose}
      />
      <Report
        open={openReport}
        handleClose={handleClose}
        reportType={isShowingStormData ? ReportType.Storm : ReportType.Flood}
      />
    </Grid>
  );
}

const styles = () =>
  createStyles({
    label: {
      marginLeft: '10px',
    },
  });

export interface DownloadProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Download);
