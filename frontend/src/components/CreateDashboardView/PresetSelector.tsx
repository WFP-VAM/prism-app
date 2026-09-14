import { Box, Button, Typography } from '@mui/material';
import { useSafeTranslation } from 'i18n';
import { type ReactNode, useState } from 'react';

import {
  presetCardDescriptionSx,
  presetCardLabelSx,
  presetCardSelectedSx,
  presetCardSx,
  presetContinueButtonSx,
  presetMapBlockSx,
  presetSelectorCardsSx,
  presetSelectorHeadingSx,
  presetSelectorRootSx,
  presetSelectorSubheadingSx,
  presetSidebarBlocksSx,
  presetSidebarBlockSx,
  presetWireframeSx,
} from './createDashboardStyles';
import { DashboardPreset } from './utils';

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
  const { t } = useSafeTranslation();
  return (
    <Box
      sx={[presetCardSx, selected && presetCardSelectedSx]}
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
      <Box sx={presetWireframeSx}>{wireframe}</Box>
      <Typography sx={presetCardLabelSx}>{t(label)}</Typography>
      <Typography sx={presetCardDescriptionSx}>{description}</Typography>
    </Box>
  );
}

const MapBlock = () => <Box sx={presetMapBlockSx} />;

const SidebarBlocks = () => (
  <Box sx={presetSidebarBlocksSx}>
    <Box sx={presetSidebarBlockSx} />
    <Box sx={presetSidebarBlockSx} />
    <Box sx={presetSidebarBlockSx} />
  </Box>
);

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
  const [selectedPreset, setSelectedPreset] = useState<DashboardPreset | null>(
    null,
  );

  return (
    <Box sx={presetSelectorRootSx}>
      <Typography variant="h2" sx={presetSelectorHeadingSx}>
        {t('Choose a dashboard layout')}
      </Typography>
      <Typography sx={presetSelectorSubheadingSx}>
        {t(
          'Select a starting template for your dashboard. You can configure the content in the next step.',
        )}
      </Typography>
      <Box sx={presetSelectorCardsSx}>
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
        sx={presetContinueButtonSx}
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

export default PresetSelector;
