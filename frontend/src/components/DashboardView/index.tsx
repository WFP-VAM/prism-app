import { Box, makeStyles, Typography, Button } from '@material-ui/core';
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

type DashboardMode = 'edit' | 'preview';

interface DashboardViewProps {
  mode?: DashboardMode;
}

function DashboardView({ mode = 'edit' }: DashboardViewProps) {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dashboardFlexElements = useSelector(dashboardFlexElementsSelector);
  const dashboardMaps = useSelector(dashboardMapsSelector);
  const dispatch = useDispatch();
  const [currentMode, setCurrentMode] = useState<DashboardMode>('edit');
  const { t } = useSafeTranslation();

  const handlePreviewClick = () => {
    setCurrentMode('preview');
  };

  const handleClosePreview = () => {
    setCurrentMode('edit');
  };

  const activeMode = mode !== 'edit' ? mode : currentMode;

  return (
    <Box
      className={
        activeMode === 'preview'
          ? classes.previewModeContainer
          : classes.container
      }
    >
      {/* Preview mode overlay with actions */}
      {activeMode === 'preview' && (
        <Box className={classes.previewActions}>
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
        </Box>
      )}

      {activeMode === 'preview' && (
        <Box className={classes.titleSection}>
          <Typography
            variant="h2"
            component="h1"
            className={classes.previewTitle}
          >
            {dashboardTitle || 'Untitled Dashboard'}
          </Typography>
        </Box>
      )}

      <Box
        className={
          activeMode === 'preview' ? classes.previewLayout : classes.layout
        }
      >
        <Box className={classes.leadingContentArea}>
          {activeMode === 'edit' && (
            <Box className={classes.grayCard}>
              <label className={classes.titleBarLabel}>
                <Typography
                  variant="h2"
                  component="span"
                  className={classes.titleBarTypography}
                >
                  Dashboard title
                </Typography>
                <input
                  type="text"
                  className={classes.titleBarInput}
                  placeholder="Enter dashboard title"
                  value={dashboardTitle}
                  onChange={e => dispatch(setTitle(e.target.value))}
                  name="dashboard-title"
                />
              </label>
            </Box>
          )}

          <div className={classes.mapsContainer}>
            {dashboardMaps.map((_, mapIndex) => (
              <Box
                // eslint-disable-next-line react/no-array-index-key
                key={`map-${mapIndex}`}
                className={
                  activeMode === 'preview'
                    ? classes.previewContainer
                    : classes.grayCard
                }
              >
                {activeMode === 'edit' && (
                  <Typography
                    variant="h3"
                    component="h3"
                    className={classes.blockLabel}
                  >
                    {dashboardMaps.length > 1
                      ? `Map ${mapIndex + 1}`
                      : 'Map block'}{' '}
                    — Choose map layers
                  </Typography>
                )}
                <div style={{ height: '700px', width: '100%' }}>
                  <MapBlock mapIndex={mapIndex} mode={activeMode} />
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
                    mode={activeMode}
                  />
                );
              }
              return <div>Content type not yet supported</div>;
            })}
          </Box>
        )}
      </Box>

      {activeMode === 'edit' && (
        <Box className={classes.toolbar}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<VisibilityOutlined />}
            onClick={handlePreviewClick}
            className={classes.previewButton}
            size="medium"
          >
            Preview
          </Button>
        </Box>
      )}
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
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    height: '700px',
  },
  previewTitle: {
    padding: 16,
    fontWeight: 500,
    fontSize: 20,
    margin: 0,
  },
  previewModeContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative',
    background: '#F8F8F8',
  },
  previewActions: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderBottom: '1px solid #E0E0E0',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '12px',
    zIndex: 1300,
  },
  titleSection: {
    padding: '0 16px',
    margin: '16px 16px 0 16px',
  },
  previewLayout: {
    display: 'flex',
    padding: 16,
    margin: 16,
    gap: 16,
    flex: 1,
    overflow: 'auto',
  },
}));

export default DashboardView;
