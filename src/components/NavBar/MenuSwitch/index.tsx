import React from 'react';
import { useDispatch } from 'react-redux';
import {
  Button,
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { LayersCategoryType, TableType } from '../../../config/types';
import { loadTable } from '../../../context/tableStateSlice';
import { useSafeTranslation } from '../../../i18n';
import SwitchItem from './SwitchItem';

function MenuSwitch({ classes, title, layers, tables }: MenuSwitchProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();

  const showTableClicked = (table: TableType) => {
    dispatch(loadTable(table.id));
  };

  return (
    <Grid item key={title} className={classes.categoryContainer}>
      <Typography variant="body2" className={classes.categoryTitle}>
        {t(title)}
      </Typography>
      <hr />

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
  );
}

const styles = () =>
  createStyles({
    categoryContainer: {
      marginBottom: 16,
      '&:last-child': {
        marginBottom: 0,
      },
    },
    categoryTitle: {
      fontWeight: 'bold',
      textAlign: 'left',
    },
  });

export interface MenuSwitchProps
  extends LayersCategoryType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuSwitch);
