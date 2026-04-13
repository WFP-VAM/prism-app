import {
  Box,
  Button,
  IconButton,
  Typography,
  makeStyles,
} from '@material-ui/core';
import {
  AddOutlined,
  BarChartOutlined,
  CloseOutlined,
  NotesOutlined,
  TableChart,
} from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import { DashboardElementType } from 'config/types';
import {
  DashboardPreset,
  SlotConfig,
  MAX_SIDEBAR_SLOTS,
  addSidebarSlot,
  setSidebarSlotType,
  removeSidebarSlot,
  editorSidebarSlotsSelector,
} from 'context/dashboardEditorSlice';
import { useSafeTranslation } from 'i18n';

const SLOT_TYPES: {
  type: DashboardElementType;
  label: string;
  Icon: typeof NotesOutlined;
}[] = [
  { type: DashboardElementType.TEXT, label: 'Text', Icon: NotesOutlined },
  { type: DashboardElementType.CHART, label: 'Chart', Icon: BarChartOutlined },
  { type: DashboardElementType.TABLE, label: 'Table', Icon: TableChart },
];

const SLOT_TYPE_LABELS: Partial<Record<DashboardElementType, string>> = {
  [DashboardElementType.TEXT]: 'Text block',
  [DashboardElementType.CHART]: 'Chart',
  [DashboardElementType.TABLE]: 'Table',
};

interface SlotCardProps {
  slot: SlotConfig;
  index: number;
}

function SlotCard({ slot, index }: SlotCardProps) {
  const dispatch = useDispatch();
  const classes = useStyles();

  return (
    <Box className={classes.slotCard}>
      {slot.type === null ? (
        <>
          <Typography className={classes.slotPrompt}>
            Choose block type
          </Typography>
          <Box className={classes.typeButtons}>
            {SLOT_TYPES.map(({ type, label, Icon }) => (
              <Button
                key={type}
                variant="outlined"
                size="medium"
                className={classes.typeButton}
                startIcon={<Icon className={classes.typeButtonIcon} />}
                onClick={() => dispatch(setSidebarSlotType({ index, type }))}
              >
                {label}
              </Button>
            ))}
          </Box>
        </>
      ) : (
        <Box className={classes.slotSet}>
          <Typography className={classes.slotTypeLabel}>
            {SLOT_TYPE_LABELS[slot.type]}
          </Typography>
          <IconButton
            size="small"
            onClick={() => dispatch(removeSidebarSlot(index))}
            aria-label="Remove block"
          >
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

interface SlotConfiguratorProps {
  preset: DashboardPreset;
  onConfirm: () => void;
}

function SlotConfigurator({ preset, onConfirm }: SlotConfiguratorProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const slots = useSelector(editorSidebarSlotsSelector);
  const { t } = useSafeTranslation();
  const mapIsLeft = preset === 'map-left';
  const canAddSlot = slots.length < MAX_SIDEBAR_SLOTS;
  const allSlotsTyped = slots.length > 0 && slots.every(s => s.type !== null);

  const sidebarColumn = (
    <Box className={classes.column}>
      <Box className={classes.columnHeader}>
        <Typography className={classes.columnTitle}>{t('Sidebar')}</Typography>
      </Box>
      <Box className={classes.sidebarBody}>
        {slots.map((slot, i) => (
          <SlotCard key={i} slot={slot} index={i} />
        ))}
        {canAddSlot && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddOutlined />}
            onClick={() => dispatch(addSidebarSlot())}
            className={classes.addButton}
            size="small"
          >
            {t('Add block')}
          </Button>
        )}
        {slots.length === 0 && (
          <Typography className={classes.emptyHint}>
            {t(
              'Add at least one sidebar block, then choose a type for each, to continue.',
            )}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const mapColumn = (
    <Box className={classes.column}>
      <Box className={classes.columnHeader}>
        <Typography className={classes.columnTitle}>{t('Map')}</Typography>
      </Box>
      <Box className={classes.mapPlaceholder}>
        <Typography className={classes.mapLabel}>{t('Map preview')}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box className={classes.root}>
      <Typography variant="h2" className={classes.heading}>
        {t('Configure sidebar blocks')}
      </Typography>
      <Typography className={classes.subheading}>
        {t('Add up to 3 blocks in the sidebar column.')}
      </Typography>
      <Box className={classes.preview}>
        {mapIsLeft ? (
          <>
            {mapColumn}
            {sidebarColumn}
          </>
        ) : (
          <>
            {sidebarColumn}
            {mapColumn}
          </>
        )}
      </Box>
      <Button
        variant="contained"
        color="primary"
        disabled={!allSlotsTyped}
        onClick={onConfirm}
        className={classes.confirmButton}
      >
        {t('Start editing')}
      </Button>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 24px 48px',
    width: '100%',
    maxWidth: 1280,
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  heading: {
    fontWeight: 600,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  subheading: {
    color: theme.palette.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
    width: '100%',
    maxWidth: 640,
    lineHeight: 1.5,
  },
  preview: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    width: '100%',
    minHeight: 420,
    marginBottom: 24,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderRadius: 8,
    padding: 14,
    border: `1px dashed ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    minWidth: 0,
  },
  columnHeader: {
    flexShrink: 0,
  },
  columnTitle: {
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
    marginBottom: 4,
  },
  columnCaption: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    lineHeight: 1.45,
  },
  sidebarBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
  },
  mapPlaceholder: {
    flex: 1,
    minHeight: 240,
    background:
      theme.palette.type === 'dark' ? 'rgba(176, 190, 197, 0.35)' : '#CFD8DC',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${theme.palette.divider}`,
  },
  mapLabel: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
    fontSize: 13,
  },
  slotCard: {
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  slotPrompt: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginBottom: 8,
    fontWeight: 500,
  },
  typeButtons: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    width: '100%',
  },
  typeButton: {
    // App theme sets text.primary to white (for dark chrome); outlined buttons
    // inherit that and become invisible on light slot cards. Use secondary (dark).
    textTransform: 'none',
    fontSize: 14,
    fontWeight: 500,
    flex: '1 1 108px',
    minHeight: 48,
    padding: '8px 14px',
    color: theme.palette.text.secondary,
    borderColor: theme.palette.grey[500],
    '& .MuiButton-startIcon': {
      marginRight: 8,
    },
    '&:hover': {
      color: theme.palette.text.secondary,
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
  },
  typeButtonIcon: {
    fontSize: 22,
  },
  slotSet: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    minHeight: 0,
  },
  slotTypeLabel: {
    fontWeight: 500,
    fontSize: 14,
  },
  addButton: {
    textTransform: 'none',
    alignSelf: 'stretch',
    borderStyle: 'dashed',
    borderWidth: 2,
    fontWeight: 500,
    padding: '8px 12px',
  },
  emptyHint: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    textAlign: 'left',
    lineHeight: 1.5,
    marginTop: 4,
    padding: '10px 12px',
    borderRadius: 6,
    background:
      theme.palette.type === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(0,0,0,0.03)',
  },
  confirmButton: {
    textTransform: 'none',
    fontWeight: 500,
    padding: '8px 32px',
  },
}));

export default SlotConfigurator;
