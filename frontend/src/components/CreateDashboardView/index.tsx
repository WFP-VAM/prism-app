import { Box, Button, makeStyles } from '@material-ui/core';
import { ArrowBackOutlined } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import DashboardContent from 'components/DashboardView/DashboardContent';
import { setDraftDashboard } from 'context/dashboardStateSlice';
import {
  DashboardPreset,
  buildDraftDashboard,
  editorPresetSelector,
  editorSidebarSlotsSelector,
  editorStepSelector,
  resetWizard,
  selectPreset,
  setEditorStep,
} from 'context/dashboardEditorSlice';
import PresetSelector from './PresetSelector';
import SlotConfigurator from './SlotConfigurator';

function CreateDashboardView() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const step = useSelector(editorStepSelector);
  const preset = useSelector(editorPresetSelector);
  const sidebarSlots = useSelector(editorSidebarSlotsSelector);

  const handleSelectPreset = (chosen: DashboardPreset) => {
    dispatch(selectPreset(chosen));
    if (chosen === 'two-maps') {
      const draft = buildDraftDashboard(chosen, []);
      dispatch(setDraftDashboard(draft));
      dispatch(setEditorStep('editing'));
    }
  };

  const handleConfirmSlots = () => {
    if (!preset) {
      return;
    }
    const draft = buildDraftDashboard(preset, sidebarSlots);
    dispatch(setDraftDashboard(draft));
    dispatch(setEditorStep('editing'));
  };

  const handleBack = () => {
    if (step === 'editing' || step === 'slot-configuration') {
      dispatch(resetWizard());
    }
  };

  return (
    <Box className={classes.root}>
      {step !== 'preset-selection' && (
        <Box className={classes.backBar}>
          <Button
            startIcon={<ArrowBackOutlined />}
            onClick={handleBack}
            className={classes.backButton}
            size="small"
          >
            Start over
          </Button>
        </Box>
      )}

      {step === 'preset-selection' && (
        <PresetSelector onSelect={handleSelectPreset} />
      )}

      {step === 'slot-configuration' && preset && preset !== 'two-maps' && (
        <SlotConfigurator preset={preset} onConfirm={handleConfirmSlots} />
      )}

      {step === 'editing' && (
        <Box className={classes.editorContainer}>
          <DashboardContent
            showTitle
            className={classes.editLayout}
            isEditable
          />
          <Box className={classes.toolbar}>
            <Button
              variant="outlined"
              className={classes.exportButton}
              disabled
            >
              Export JSON
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 56px)',
    overflow: 'auto',
    background: '#F8F8F8',
  },
  backBar: {
    padding: '8px 16px',
    borderBottom: '1px solid #E0E0E0',
    background: 'white',
  },
  backButton: {
    textTransform: 'none',
    color: theme.palette.text.secondary,
    '& .MuiButton-startIcon': {
      color: theme.palette.text.secondary,
    },
  },
  editorContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  editLayout: {
    display: 'flex',
    gap: 16,
    flex: 1,
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
    justifyContent: 'flex-end',
    zIndex: 1400,
  },
  exportButton: {
    textTransform: 'none',
    fontWeight: 500,
    color: theme.palette.text.secondary,
    border: `1px solid ${theme.palette.grey[500]}`,
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-disabled': {
      opacity: 1,
      color: theme.palette.text.secondary,
      border: `1px solid ${theme.palette.grey[400]}`,
    },
  },
}));

export default CreateDashboardView;
