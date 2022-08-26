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
import { mapSelector } from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import DownloadImage from './image';
import Report from './report';

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
  const [openReport, setOpenReport] = useState(true);
  const selectedMap = useSelector(mapSelector);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const { t } = useSafeTranslation();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
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
        <ExportMenuItem onClick={() => setOpenReport(true)}>
          <ListItemIcon>
            <Description fontSize="small" style={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary={t('REPORT')} />
        </ExportMenuItem>
        <ExportMenuItem onClick={openModal}>
          <ListItemIcon>
            <Image fontSize="small" style={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary={t('IMAGE')} />
        </ExportMenuItem>
      </ExportMenu>
      <DownloadImage
        open={openImage}
        setOpen={setOpenImage}
        previewRef={previewRef}
        handleClose={handleClose}
      />
      <Report
        open={openReport}
        setOpen={setOpenReport}
        previewRef={previewRef}
        handleClose={handleClose}
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
