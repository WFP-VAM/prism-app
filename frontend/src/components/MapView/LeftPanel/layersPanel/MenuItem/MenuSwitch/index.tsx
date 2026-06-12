import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { Extent } from 'components/MapView/Layers/raster-utils';
import {
  activeLayersCountChipSx,
  menuSwitchAccordionSx,
} from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import { filterActiveLayers } from 'components/MapView/utils';
import { LayerType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import {
  memo,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMapState } from 'utils/useMapState';

import { makeSafeIDFromTitle } from '../utils';
import SwitchItems from './SwitchItems';

interface MenuSwitchProps {
  title: string;
  layers: LayerType[];
  extent?: Extent;
}

const MenuSwitch = memo(({ title, layers, extent }: MenuSwitchProps) => {
  const { t } = useSafeTranslation();
  const mapState = useMapState();
  const selectedLayers = mapState.layers;
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAccordionExpand = useCallback(
    (_event: SyntheticEvent, expanded: boolean) => {
      setIsExpanded(expanded);
    },
    [],
  );

  const selectedInternalLayers = useMemo(
    () =>
      selectedLayers.filter(layer =>
        layers.some(internalLayer => filterActiveLayers(layer, internalLayer)),
      ),
    [layers, selectedLayers],
  );

  const [informationChipLabel, setInformationChipLabel] = useState<string>(
    selectedInternalLayers.length.toString(),
  );

  useEffect(() => {
    if (!selectedInternalLayers.length) {
      return;
    }
    setInformationChipLabel(selectedInternalLayers.length.toString());
  }, [selectedInternalLayers.length]);

  const handleChipOnMouseEnter = useCallback(() => {
    setInformationChipLabel(
      `${selectedInternalLayers.length} ${t('Active Layer(s)')}`,
    );
  }, [selectedInternalLayers.length, t]);

  const handleChipOnMouseLeave = useCallback(() => {
    setInformationChipLabel(selectedInternalLayers.length.toString());
  }, [selectedInternalLayers.length]);

  const renderedSelectedLayerInformation = useMemo(() => {
    if (!selectedInternalLayers.length) {
      return null;
    }
    return (
      <Chip
        onMouseEnter={handleChipOnMouseEnter}
        onMouseLeave={handleChipOnMouseLeave}
        sx={activeLayersCountChipSx}
        label={informationChipLabel}
      />
    );
  }, [
    handleChipOnMouseEnter,
    handleChipOnMouseLeave,
    informationChipLabel,
    selectedInternalLayers.length,
  ]);

  return (
    <Accordion
      elevation={0}
      sx={menuSwitchAccordionSx.root}
      onChange={handleAccordionExpand}
      slotProps={{ transition: { unmountOnExit: true } }}
    >
      <AccordionSummary
        expandIcon={isExpanded ? <RemoveIcon /> : <AddIcon />}
        sx={menuSwitchAccordionSx.summary}
        aria-controls={title}
        id={`level2-${makeSafeIDFromTitle(title)}`}
      >
        <Typography sx={menuSwitchAccordionSx.title}>{t(title)}</Typography>
        {renderedSelectedLayerInformation}
      </AccordionSummary>
      <AccordionDetails sx={menuSwitchAccordionSx.details}>
        <Stack direction="column">
          <SwitchItems layers={layers} extent={extent} />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
});

export default MenuSwitch;
