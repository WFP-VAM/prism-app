import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  createStyles,
  Grid,
  makeStyles,
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { LayersCategoryType, TableType } from '../../../../../config/types';
import { loadTable } from '../../../../../context/tableStateSlice';
import { useSafeTranslation } from '../../../../../i18n';
import SwitchItem from './SwitchItem';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
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
    title: {
      color: '#53888F',
      fontWeight: 500,
    },
  }),
);

function MenuSwitch({ title, layers, tables }: LayersCategoryType) {
  const { t } = useSafeTranslation();
  const classes = useStyles();
  const dispatch = useDispatch();
  const [isExpanded, setIsExpanded] = useState(false);

  const showTableClicked = (table: TableType) => {
    dispatch(loadTable(table.id));
  };

  return (
    <Accordion
      key={title}
      elevation={0}
      classes={{ root: classes.root }}
      onChange={(_, expand) => setIsExpanded(expand)}
    >
      <AccordionSummary
        expandIcon={isExpanded ? <RemoveIcon /> : <AddIcon />}
        classes={{ root: classes.rootSummary, expandIcon: classes.expandIcon }}
        aria-controls={title}
        id={title}
      >
        <Typography classes={{ root: classes.title }}>{t(title)}</Typography>
      </AccordionSummary>
      <AccordionDetails classes={{ root: classes.rootDetails }}>
        <Grid container direction="column">
          {layers.map(layer => {
            if (
              layer.group &&
              layer.group.layers.find(l => l.id === layer.id && !l.main)
            ) {
              return null;
            }
            return <SwitchItem key={layer.id} layer={layer} />;
          })}

          {tables.map(table => (
            <Button
              id={table.title}
              key={table.title}
              onClick={() => showTableClicked(table)}
            >
              <Typography variant="body1">{table.title}</Typography>
            </Button>
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

export default MenuSwitch;
