import { ArrowBackOutlined } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { DashboardElementType } from 'config/types';
import {
  dashboardsListSelector,
  setDraftDashboard,
} from 'context/dashboardStateSlice';
import { useSafeTranslation } from 'i18n';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import {
  createDashboardBackBarSx,
  createDashboardBackButtonSx,
  createDashboardRootSx,
} from './createDashboardStyles';
import PresetSelector from './PresetSelector';
import SlotConfigurator from './SlotConfigurator';
import {
  buildDraftDashboard,
  buildDraftMeta,
  DashboardPreset,
  MAX_SIDEBAR_SLOTS,
  SlotConfig,
} from './utils';

function CreateDashboardView() {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const dashboards = useSelector(dashboardsListSelector);
  const [step, setStep] = useState<'preset-selection' | 'slot-configuration'>(
    'preset-selection',
  );
  const [preset, setPreset] = useState<DashboardPreset | null>(null);
  const [sidebarSlots, setSidebarSlots] = useState<SlotConfig[]>([]);

  const launchDraft = (chosen: DashboardPreset, slots: SlotConfig[]) => {
    const existingDraftCount = dashboards.filter(d => d.isDraft).length;
    const meta = buildDraftMeta(existingDraftCount);
    const draft = buildDraftDashboard(chosen, slots, meta);
    dispatch(setDraftDashboard(draft));
    history.push(`/dashboard/${meta.path}`);
  };

  const handleSelectPreset = (chosen: DashboardPreset) => {
    setPreset(chosen);
    if (chosen === 'two-maps') {
      launchDraft(chosen, []);
    } else {
      setStep('slot-configuration');
    }
  };

  const handleConfirmSlots = () => {
    launchDraft(preset!, sidebarSlots);
  };

  const handleAddSlot = () => {
    if (sidebarSlots.length < MAX_SIDEBAR_SLOTS) {
      setSidebarSlots(prev => [...prev, { type: null }]);
    }
  };

  const handleSetSlotType = (index: number, type: DashboardElementType) => {
    setSidebarSlots(prev => prev.map((s, i) => (i === index ? { type } : s)));
  };

  const handleRemoveSlot = (index: number) => {
    setSidebarSlots(prev => prev.filter((_, i) => i !== index));
  };

  const handleBack = () => {
    if (step === 'slot-configuration') {
      setStep('preset-selection');
      setPreset(null);
      setSidebarSlots([]);
    }
  };

  return (
    <Box sx={createDashboardRootSx}>
      {step !== 'preset-selection' && (
        <Box sx={createDashboardBackBarSx}>
          <Button
            startIcon={<ArrowBackOutlined />}
            onClick={handleBack}
            sx={createDashboardBackButtonSx}
            size="small"
          >
            {t('Start over')}
          </Button>
        </Box>
      )}

      {step === 'preset-selection' && (
        <PresetSelector onSelect={handleSelectPreset} />
      )}

      {step === 'slot-configuration' && preset && (
        <SlotConfigurator
          preset={preset}
          slots={sidebarSlots}
          onAddSlot={handleAddSlot}
          onSetSlotType={handleSetSlotType}
          onRemoveSlot={handleRemoveSlot}
          onConfirm={handleConfirmSlots}
        />
      )}
    </Box>
  );
}

export default CreateDashboardView;
