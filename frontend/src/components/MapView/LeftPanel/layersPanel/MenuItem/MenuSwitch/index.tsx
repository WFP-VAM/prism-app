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
import { cyanBlue, lightGrey } from 'muiTheme';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { layersSelector } from 'context/mapStateSlice/selectors';
import { filterActiveLayers } from 'components/MapView/utils';
import SwitchItems from './SwitchItems';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
      maxWidth: '100%',
    },
    rootSummary: {
      backgroundColor: lightGrey,
    },
    rootDetails: {
      padding: 0,
      backgroundColor: '#FFFFFF',
    },
    expandIcon: {
      color: 'black',
    },
    summaryContent: {
      alignItems: 'center',
    },
    chipRoot: {
      marginLeft: '1.5%',
    },
    title: {
      color: 'black',
      fontSize: '14px',
      fontWeight: 400,
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
        style={{ backgroundColor: cyanBlue }}
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
      TransitionProps={{ unmountOnExit: true }}
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
          <SwitchItems layers={layers} extent={extent} />
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
});

export default MenuSwitch;
