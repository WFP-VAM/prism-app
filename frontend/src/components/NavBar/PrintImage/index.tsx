import React, { useRef, useState } from 'react';
import {
  Button,
  createStyles,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { useSelector } from 'react-redux';
import Print from '@material-ui/icons/Print';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import DownloadImage from './image';

function PrintImage({ classes }: PrintImageProps) {
  const [openImage, setOpenImage] = useState(false);
  const selectedMap = useSelector(mapSelector);

  const previewRef = useRef<HTMLCanvasElement>(null);

  const { t } = useSafeTranslation();

  const handleClose = () => {
    setOpenImage(false);
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
  };

  return (
    <>
      <div style={{ paddingTop: '4px' }}>
        <Button onClick={openModal} style={{ backgroundColor: 'transparent' }}>
          <Print fontSize="small" style={{ paddingRight: '0.2em' }} />
          <Typography className={classes.printText} variant="body2">
            {t('Print')}
          </Typography>
        </Button>
      </div>
      <DownloadImage open={openImage} handleClose={handleClose} />
    </>
  );
}

const styles = () =>
  createStyles({
    printText: {
      textTransform: 'uppercase',
    },
  });

export interface PrintImageProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(PrintImage);
