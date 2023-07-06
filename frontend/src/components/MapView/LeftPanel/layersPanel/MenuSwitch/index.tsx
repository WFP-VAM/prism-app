import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  createStyles,
  Grid,
  makeStyles,
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import React, {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { LayerType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { layersSelector } from 'context/mapStateSlice/selectors';
import { filterActiveLayers } from 'components/MapView/utils';
import SwitchItem from './SwitchItem';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
      maxWidth: '100%',
    },
    rootSummary: {
      backgroundColor: '#F5F7F8',
    },
    rootDetails: {
      padding: 0,
      backgroundColor: '#FFFFFF',
    },
    expandIcon: {
      color: '#53888F',
    },
    summaryContent: {
      alignItems: 'center',
    },
    chipRoot: {
      marginLeft: '1.5%',
    },
    title: {
      color: '#53888F',
      fontWeight: 500,
    },
  }),
);

interface MenuSwitchProps {
  title: string;
  layers: LayerType[];
  extent?: Extent;
}

const MenuSwitch = memo(({ title, layers, extent }: MenuSwitchProps) => {
  const { t } = useSafeTranslation();
  const selectedLayers = useSelector(layersSelector);
  const classes = useStyles();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAccordionExpand = useCallback(
    (event: ChangeEvent<{}>, expanded: boolean) => {
      setIsExpanded(expanded);
    },
    [],
  );

  const renderedItems = useMemo(() => {
    return layers.map((layer: LayerType) => {
      const foundNotRenderedLayer = layer.group?.layers.find(layerItem => {
        return layerItem.id === layer.id && !layerItem.main;
      });
      if (layer.group && foundNotRenderedLayer) {
        return null;
      }
      return <SwitchItem key={layer.id} layer={layer} extent={extent} />;
    });
  }, [extent, layers]);

  const selectedInternalLayers = useMemo(() => {
    return selectedLayers.filter(layer => {
      return layers.some(internalLayer => {
        return filterActiveLayers(layer, internalLayer);
      });
    });
  }, [layers, selectedLayers]);

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
        classes={{ root: classes.chipRoot }}
        color="secondary"
        label={informationChipLabel}
      />
    );
  }, [
    classes.chipRoot,
    handleChipOnMouseEnter,
    handleChipOnMouseLeave,
    informationChipLabel,
    selectedInternalLayers.length,
  ]);

  return (
    <Accordion
      elevation={0}
      classes={{ root: classes.root }}
      onChange={handleAccordionExpand}
    >
      <AccordionSummary
        expandIcon={isExpanded ? <RemoveIcon /> : <AddIcon />}
        classes={{
          root: classes.rootSummary,
          expandIcon: classes.expandIcon,
          content: classes.summaryContent,
        }}
        aria-controls={title}
        id={title}
      >
        <Typography classes={{ root: classes.title }}>{t(title)}</Typography>
        {renderedSelectedLayerInformation}
      </AccordionSummary>
      <AccordionDetails classes={{ root: classes.rootDetails }}>
        <Grid container direction="column">
          {renderedItems}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
});

export default MenuSwitch;
