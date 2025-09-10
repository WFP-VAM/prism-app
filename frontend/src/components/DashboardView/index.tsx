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
import type { DashboardTextConfig } from 'config/types';
import { black, cyanBlue } from 'muiTheme';

import { MapInstanceProvider } from 'components/MapView/MapInstanceContext';
import MapView from 'components/MapView';
import RootAccordionItems from 'components/MapView/LeftPanel/layersPanel/RootAccordionItems';
import {
  dashboardTitleSelector,
  setTitle,
  dashboardFlexElementsSelector,
} from '../../context/dashboardStateSlice';
import TextBlock from './TextBlock';
import DashboardPreview from './DashboardPreview';

function DashboardView() {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dashboardFlexElements = useSelector(dashboardFlexElementsSelector);
  const dispatch = useDispatch();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
          <Box className={classes.grayCard}>
            <MapInstanceProvider index={0}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: '1/4', marginRight: 16 }}>
                  <RootAccordionItems />
                </div>
                <div style={{ height: '500px', width: '100%' }}>
                  <MapView />
                </div>
              </div>
            </MapInstanceProvider>
          </Box>
        </Box>
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
            return <div>Content type not yet supported</div>;
          })}
        </Box>
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
          Preview
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
            Back to Edit
          </Button>
          <Button
            color="primary"
            variant="contained"
            disableElevation
            endIcon={<ArrowForward />}
            size="medium"
            style={{ backgroundColor: cyanBlue, color: black }}
          >
            Publish
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
    width: '100%',
    marginBottom: 16,
  },
  titleBarLabel: {
    display: 'flex',
    alignItems: 'center',
    marginRight: 16,
    fontWeight: 600,
    fontSize: 16,
    padding: 16,
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
    zIndex: 1000,
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
}));

export default DashboardView;
