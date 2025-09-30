import {
  Box,
  makeStyles,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
} from '@material-ui/core';
import { ArrowForward, Edit, VisibilityOutlined } from '@material-ui/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import type { DashboardTextConfig } from 'config/types';

import MapBlock from './MapBlock';
import {
  dashboardTitleSelector,
  setTitle,
  dashboardFlexElementsSelector,
  dashboardMapsSelector,
} from '../../context/dashboardStateSlice';
import TextBlock from './TextBlock';
import DashboardPreview from './DashboardPreview';

function DashboardView() {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dashboardFlexElements = useSelector(dashboardFlexElementsSelector);
  const dashboardMaps = useSelector(dashboardMapsSelector);
  const dispatch = useDispatch();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { t } = useSafeTranslation();

  const handlePreviewClick = () => {
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  return (
    <Box className={classes.container}>
      <Box className={classes.layout}>
        <Box className={classes.leadingContentArea}>
          <Box className={classes.grayCard}>
            <label className={classes.titleBarLabel}>
              <Typography
                variant="h2"
                component="span"
                className={classes.titleBarTypography}
              >
                {t('Dashboard title')}
              </Typography>
              <input
                type="text"
                className={classes.titleBarInput}
                placeholder={t('Enter dashboard title')}
                value={dashboardTitle}
                onChange={e => dispatch(setTitle(e.target.value))}
                name="dashboard-title"
              />
            </label>
          </Box>
          <div className={classes.mapsContainer}>
            {dashboardMaps.map((_, mapIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <Box key={`map-${mapIndex}`} className={classes.grayCard}>
                <Typography
                  variant="h3"
                  component="h3"
                  className={classes.blockLabel}
                >
                  {dashboardMaps.length > 1
                    ? `${t('Map')} ${mapIndex + 1}`
                    : t('Map block ')}
                  {t('— Choose map layers')}
                </Typography>
                <div style={{ height: '700px', width: '100%' }}>
                  <MapBlock mapIndex={mapIndex} />
                </div>
              </Box>
            ))}
          </div>
        </Box>
        {dashboardFlexElements.length > 0 && (
          <Box className={classes.trailingContentArea}>
            {dashboardFlexElements?.map((element, index) => {
              if (element.type === 'TEXT') {
                const content = (element as DashboardTextConfig)?.content || '';
                return (
                  <TextBlock
                    // eslint-disable-next-line react/no-array-index-key
                    key={`text-block-${index}`}
                    content={content}
                    index={index}
                  />
                );
              }
              // TODO: Remove warning/error before launch, when all content types should be supported
              return <div>{t('Content type not yet supported')}</div>;
            })}
          </Box>
        )}
      </Box>
      <Box className={classes.toolbar}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<VisibilityOutlined />}
          onClick={handlePreviewClick}
          className={classes.previewButton}
          size="medium"
        >
          {t('Preview')}
        </Button>
      </Box>

      <Dialog
        open={isPreviewOpen}
        onClose={handleClosePreview}
        maxWidth={false}
        fullWidth
        className={classes.previewDialog}
      >
        <DialogActions>
          <Button
            color="primary"
            variant="outlined"
            disableElevation
            startIcon={<Edit />}
            onClick={handleClosePreview}
            size="medium"
          >
            {t('Back to Edit')}
          </Button>
          <Button
            color="primary"
            variant="contained"
            disableElevation
            endIcon={<ArrowForward />}
            size="medium"
            style={{ backgroundColor: cyanBlue, color: black }}
          >
            {t('Publish')}
          </Button>
        </DialogActions>
        <DialogContent className={classes.dialogContent}>
          <DashboardPreview />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  blockLabel: {
    fontWeight: 600,
    fontSize: 16,
    marginBottom: 12,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative',
  },
  layout: {
    display: 'flex',
    padding: 16,
    margin: 16,
    gap: 16,
    flex: 1,
    overflow: 'auto',
    paddingBottom: 80, // Add extra padding to account for fixed toolbar
  },
  leadingContentArea: {
    flex: '2',
  },
  trailingContentArea: {
    flex: '1',
  },
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  titleBarLabel: {
    display: 'flex',
    alignItems: 'center',
    marginRight: 16,
    fontWeight: 600,
    fontSize: 16,
  },
  titleBarTypography: {
    flex: '1 0 fit-content',
    marginInlineEnd: 16,
  },
  titleBarInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    background: 'white',
    fontFamily: 'Roboto',
  },
  toolbar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #E0E0E0',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1400,
  },
  previewButton: {
    textTransform: 'none',
    fontWeight: 500,
  },
  previewDialog: {
    '& .MuiDialog-paper': {
      margin: '48px 0 0 0',
      height: '100vh',
      background: '#F8F8F8',
    },
    '& .MuiDialog-paperFullWidth ': {
      maxWidth: 'calc(100% - 16px)',
      width: '100%',
    },
  },
  dialogContent: {
    padding: 0,
  },
  mapsContainer: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    '& > .MuiBox-root': {
      flex: 1,
      minWidth: 0, // Prevents flex items from overflowing
    },
  },
}));

export default DashboardView;
