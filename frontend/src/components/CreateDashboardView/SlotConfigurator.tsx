import {
  AddOutlined,
  BarChartOutlined,
  CloseOutlined,
  NotesOutlined,
  TableChart,
} from '@mui/icons-material';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { DashboardElementType } from 'config/types';
import { useSafeTranslation } from 'i18n';

import {
  slotCardPromptSx,
  slotCardSetSx,
  slotCardSx,
  slotCardTypeButtonIconSx,
  slotCardTypeButtonsSx,
  slotCardTypeButtonSx,
  slotCardTypeLabelSx,
  slotConfiguratorAddButtonSx,
  slotConfiguratorColumnHeaderSx,
  slotConfiguratorColumnSx,
  slotConfiguratorColumnTitleSx,
  slotConfiguratorConfirmButtonSx,
  slotConfiguratorEmptyHintSx,
  slotConfiguratorHeadingSx,
  slotConfiguratorMapLabelSx,
  slotConfiguratorMapPlaceholderSx,
  slotConfiguratorPreviewSx,
  slotConfiguratorRootSx,
  slotConfiguratorSidebarBodySx,
  slotConfiguratorSubheadingSx,
} from './createDashboardStyles';
import { DashboardPreset, MAX_SIDEBAR_SLOTS, SlotConfig } from './utils';

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
  onSetType: (type: DashboardElementType) => void;
  onRemove: () => void;
}

function SlotCard({ slot, onSetType, onRemove }: SlotCardProps) {
  const { t } = useSafeTranslation();

  return (
    <Box sx={slotCardSx}>
      {slot.type === null ? (
        <>
          <Typography sx={slotCardPromptSx}>
            {t('Choose block type')}
          </Typography>
          <Box sx={slotCardTypeButtonsSx}>
            {SLOT_TYPES.map(({ type, label, Icon }) => (
              <Button
                key={type}
                variant="outlined"
                size="medium"
                sx={slotCardTypeButtonSx}
                startIcon={<Icon sx={slotCardTypeButtonIconSx} />}
                onClick={() => onSetType(type)}
              >
                {t(label)}
              </Button>
            ))}
          </Box>
        </>
      ) : (
        <Box sx={slotCardSetSx}>
          <Typography sx={slotCardTypeLabelSx}>
            {t(SLOT_TYPE_LABELS[slot.type] || '')}
          </Typography>
          <IconButton
            size="small"
            onClick={onRemove}
            aria-label={t('Remove block')}
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
  slots: SlotConfig[];
  onAddSlot: () => void;
  onSetSlotType: (index: number, type: DashboardElementType) => void;
  onRemoveSlot: (index: number) => void;
  onConfirm: () => void;
}

function SlotConfigurator({
  preset,
  slots,
  onAddSlot,
  onSetSlotType,
  onRemoveSlot,
  onConfirm,
}: SlotConfiguratorProps) {
  const { t } = useSafeTranslation();
  const mapIsLeft = preset === 'map-left';
  const canAddSlot = slots.length < MAX_SIDEBAR_SLOTS;
  const allSlotsTyped = slots.length > 0 && slots.every(s => s.type !== null);

  const sidebarColumn = (
    <Box sx={slotConfiguratorColumnSx}>
      <Box sx={slotConfiguratorColumnHeaderSx}>
        <Typography sx={slotConfiguratorColumnTitleSx}>
          {t('Sidebar')}
        </Typography>
      </Box>
      <Box sx={slotConfiguratorSidebarBodySx}>
        {slots.map((slot, i) => (
          <SlotCard
            key={i}
            slot={slot}
            onSetType={type => onSetSlotType(i, type)}
            onRemove={() => onRemoveSlot(i)}
          />
        ))}
        {canAddSlot && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddOutlined />}
            onClick={onAddSlot}
            sx={slotConfiguratorAddButtonSx}
            size="small"
          >
            {t('Add block')}
          </Button>
        )}
        {slots.length === 0 && (
          <Typography sx={slotConfiguratorEmptyHintSx}>
            {t(
              'Add at least one sidebar block, then choose a type for each, to continue.',
            )}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const mapColumn = (
    <Box sx={slotConfiguratorColumnSx}>
      <Box sx={slotConfiguratorColumnHeaderSx}>
        <Typography sx={slotConfiguratorColumnTitleSx}>{t('Map')}</Typography>
      </Box>
      <Box sx={slotConfiguratorMapPlaceholderSx}>
        <Typography sx={slotConfiguratorMapLabelSx}>
          {t('Map preview')}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={slotConfiguratorRootSx}>
      <Typography variant="h2" sx={slotConfiguratorHeadingSx}>
        {t('Configure sidebar blocks')}
      </Typography>
      <Typography sx={slotConfiguratorSubheadingSx}>
        {t('Add up to 3 blocks in the sidebar column.')}
      </Typography>
      <Box sx={slotConfiguratorPreviewSx}>
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
        sx={slotConfiguratorConfirmButtonSx}
      >
        {t('Start editing')}
      </Button>
    </Box>
  );
}

export default SlotConfigurator;
