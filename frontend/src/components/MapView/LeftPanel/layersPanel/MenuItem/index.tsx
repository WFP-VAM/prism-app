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
import { MenuItemType } from '../../../../../config/types';
import MenuSwitch from '../MenuSwitch';
import { useSafeTranslation } from '../../../../../i18n';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
    },
    rootSummary: {
      backgroundColor: '#D8E9EC',
    },
    expandIcon: {
      color: '#53888F',
    },
    title: {
      color: '#53888F',
      fontWeight: 'bold',
    },
  }),
);

function MenuItem({ title, layersCategories }: MenuItemType) {
  const { t } = useSafeTranslation();
  const classes = useStyles();

  return (
    <Accordion key={title} elevation={0} classes={{ root: classes.root }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        classes={{ root: classes.rootSummary, expandIcon: classes.expandIcon }}
        aria-controls={title}
        id={title}
      >
        <Typography classes={{ root: classes.title }}>{t(title)}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container direction="column">
          {layersCategories.map(({ title: categoryTitle, layers, tables }) => (
            <MenuSwitch
              key={categoryTitle}
              title={categoryTitle}
              layers={layers}
              tables={tables}
            />
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

export default MenuItem;
