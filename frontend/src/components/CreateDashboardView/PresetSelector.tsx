import { useState, type ReactNode } from 'react';
import { Box, Button, Typography, makeStyles } from '@material-ui/core';
import { DashboardPreset } from 'context/dashboardEditorSlice';
import { useSafeTranslation } from 'i18n';

interface PresetCardProps {
  label: string;
  description: string;
  wireframe: ReactNode;
  selected: boolean;
  onClick: () => void;
}

function PresetCard({
  label,
  description,
  wireframe,
  selected,
  onClick,
}: PresetCardProps) {
  const classes = useStyles();
  return (
    <Box
      className={`${classes.card} ${selected ? classes.cardSelected : ''}`}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <Box className={classes.wireframe}>{wireframe}</Box>
      <Typography className={classes.cardLabel}>{label}</Typography>
      <Typography className={classes.cardDescription}>{description}</Typography>
    </Box>
  );
}

const MapBlock = () => {
  const classes = useStyles();
  return <Box className={classes.mapBlock} />;
};

const SidebarBlocks = () => {
  const classes = useStyles();
  return (
    <Box className={classes.sidebarBlocks}>
      <Box className={classes.sidebarBlock} />
      <Box className={classes.sidebarBlock} />
      <Box className={classes.sidebarBlock} />
    </Box>
  );
};

const PRESETS: {
  preset: DashboardPreset;
  label: string;
  description: string;
  wireframe: ReactNode;
}[] = [
  {
    preset: 'map-left',
    label: 'Map left',
    description: 'Large map with a content sidebar on the right',
    wireframe: (
      <Box style={{ display: 'flex', gap: 6, height: '100%' }}>
        <MapBlock />
        <SidebarBlocks />
      </Box>
    ),
  },
  {
    preset: 'map-right',
    label: 'Map right',
    description: 'Content sidebar on the left with a large map',
    wireframe: (
      <Box style={{ display: 'flex', gap: 6, height: '100%' }}>
        <SidebarBlocks />
        <MapBlock />
      </Box>
    ),
  },
  {
    preset: 'two-maps',
    label: 'Two maps',
    description: 'Side-by-side maps for comparison',
    wireframe: (
      <Box style={{ display: 'flex', gap: 6, height: '100%' }}>
        <MapBlock />
        <MapBlock />
      </Box>
    ),
  },
];

interface PresetSelectorProps {
  onSelect: (preset: DashboardPreset) => void;
}

function PresetSelector({ onSelect }: PresetSelectorProps) {
  const { t } = useSafeTranslation();
  const classes = useStyles();
  const [selectedPreset, setSelectedPreset] = useState<DashboardPreset | null>(
    null,
  );

  return (
    <Box className={classes.root}>
      <Typography variant="h2" className={classes.heading}>
        {t('Choose a dashboard layout')}
      </Typography>
      <Typography className={classes.subheading}>
        {t(
          'Select a starting template for your dashboard. You can configure the content in the next step.',
        )}
      </Typography>
      <Box className={classes.cards}>
        {PRESETS.map(({ preset, label, description, wireframe }) => (
          <PresetCard
            key={preset}
            label={label}
            description={t(description)}
            wireframe={wireframe}
            selected={selectedPreset === preset}
            onClick={() => setSelectedPreset(preset)}
          />
        ))}
      </Box>
      <Button
        variant="contained"
        color="primary"
        className={classes.continueButton}
        disabled={!selectedPreset}
        onClick={() => {
          if (selectedPreset) {
            onSelect(selectedPreset);
          }
        }}
      >
        {t('Continue')}
      </Button>
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  heading: {
    fontWeight: 600,
    marginBottom: 8,
  },
  subheading: {
    color: theme.palette.text.secondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  cards: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  card: {
    width: 280,
    padding: 20,
    borderRadius: 8,
    border: '2px solid #E0E0E0',
    cursor: 'pointer',
    background: 'white',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    },
    '&:focus': {
      outline: 'none',
      borderColor: theme.palette.primary.main,
    },
  },
  cardSelected: {
    borderColor: theme.palette.primary.main,
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    background: 'rgba(50, 54, 56, 0.04)',
  },
  continueButton: {
    textTransform: 'none',
    fontWeight: 600,
    minWidth: 200,
    padding: '10px 28px',
  },
  wireframe: {
    height: 120,
    marginBottom: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mapBlock: {
    flex: 2,
    background: '#B0BEC5',
    borderRadius: 4,
    height: '100%',
  },
  sidebarBlocks: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sidebarBlock: {
    flex: 1,
    background: '#E0E0E0',
    borderRadius: 4,
  },
  cardLabel: {
    fontWeight: 600,
    fontSize: 15,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.palette.text.secondary,
    lineHeight: 1.4,
  },
}));

export default PresetSelector;
