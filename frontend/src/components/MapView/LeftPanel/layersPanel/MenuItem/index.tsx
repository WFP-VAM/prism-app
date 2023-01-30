import React from 'react';
import {
  createStyles,
  Grid,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  makeStyles,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { LayersCategoryType } from '../../../../../config/types';
import MenuSwitch from '../MenuSwitch';
import { useSafeTranslation } from '../../../../../i18n';
import { Extent } from '../../../Layers/raster-utils';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
    },
    rootSummary: {
      backgroundColor: '#D8E9EC',
    },
    rootDetails: {
      padding: 0,
    },
    expandIcon: {
      color: '#53888F',
    },
    title: {
      color: '#53888F',
      fontWeight: 600,
    },
  }),
);

interface MenuItemProps {
  title: string;
  icon: string;
  layersCategories: LayersCategoryType[];
  extent?: Extent;
  shouldRender: boolean;
}

function MenuItem({
  title,
  layersCategories,
  extent,
  shouldRender,
}: MenuItemProps) {
  const { t } = useSafeTranslation();
  const classes = useStyles();

  return (
    <Accordion
      key={title}
      elevation={0}
      classes={{ root: classes.root }}
      style={{ display: shouldRender ? undefined : 'none' }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        classes={{ root: classes.rootSummary, expandIcon: classes.expandIcon }}
        aria-controls={title}
        id={title}
      >
        <Typography classes={{ root: classes.title }}>{t(title)}</Typography>
      </AccordionSummary>
      <AccordionDetails classes={{ root: classes.rootDetails }}>
        <Grid container direction="column">
          {layersCategories.map(({ title: categoryTitle, layers, tables }) => (
            <MenuSwitch
              key={categoryTitle}
              title={categoryTitle}
              layers={layers}
              tables={tables}
              extent={extent}
            />
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

export default MenuItem;
