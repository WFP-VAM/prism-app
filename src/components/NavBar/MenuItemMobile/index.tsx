import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button,
  createStyles,
  Grid,
  Switch,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';

import { LayerType, TableType } from '../../../config/types';
import { addLayer, removeLayer } from '../../../context/mapStateSlice';
import { loadTable } from '../../../context/tableStateSlice';
import { layersSelector } from '../../../context/mapStateSlice/selectors';
import { menuList } from '../utils';

function MenuItemMobile({ classes }: MenuItemMobileProps) {
  const [expanded, setExpanded] = useState<string>('');

  const selectedLayers = useSelector(layersSelector);

  const dispatch = useDispatch();

  const handleChange = (panel: string) => (
    event: object,
    newExpanded: boolean,
  ) => {
    setExpanded(newExpanded ? panel : '');
  };

  const toggleLayerValue = (prevChecked: boolean, layer: LayerType) => {
    if (prevChecked) {
      dispatch(removeLayer(layer));
    } else {
      dispatch(addLayer(layer));
    }
  };

  const showTableClicked = (table: TableType) => {
    dispatch(loadTable(table.id));
  };

  return (
    <>
      {menuList.map(({ title, icon, layersCategories }) => (
        <Accordion
          className={classes.accordion}
          key={title}
          square
          expanded={expanded === title}
          onChange={handleChange(title)}
        >
          <AccordionSummary
            className={classes.accordionSummary}
            expandIcon={<FontAwesomeIcon icon={faCaretDown} />}
            IconButtonProps={{ color: 'inherit', size: 'small' }}
            aria-controls={title}
            id={title}
          >
            <img className={classes.icon} src={icon} alt={title} />
            <Typography variant="body2">{title}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordionDetail}>
            <Grid container direction="column">
              {layersCategories.map(
                ({ title: categoryTitle, layers, tables }) => (
                  <Grid
                    item
                    key={categoryTitle}
                    className={classes.categoryContainer}
                  >
                    <Typography
                      variant="body2"
                      className={classes.categoryTitle}
                    >
                      {categoryTitle}
                    </Typography>
                    <hr />

                    {layers.map(layer => {
                      const { id: layerId, title: layerTitle } = layer;
                      const selected = Boolean(
                        selectedLayers.find(
                          ({ id: testId }) => testId === layerId,
                        ),
                      );
                      return (
                        <div key={layerId} className={classes.layersContainer}>
                          <Switch
                            size="small"
                            color="default"
                            checked={selected}
                            onChange={() => toggleLayerValue(selected, layer)}
                            inputProps={{ 'aria-label': layerTitle }}
                          />{' '}
                          <Typography variant="body1">{layerTitle}</Typography>
                        </div>
                      );
                    })}

                    {tables.map(table => (
                      <Button
                        className={classes.button}
                        id={table.title}
                        key={table.title}
                        onClick={() => showTableClicked(table)}
                      >
                        <Typography variant="body1">{table.title}</Typography>
                      </Button>
                    ))}
                  </Grid>
                ),
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
    },
    button: {
      textTransform: 'none',
    },

    title: {
      margin: '0px 14px',
      textTransform: 'uppercase',
      color: 'inherit',

      '&::after': {
        content: '""',
        display: 'inline-block',
        width: 0,
        height: 0,
        marginLeft: 3.5,
        verticalAlign: 3.5,
        borderTop: '3.5px solid',
        borderRight: '3.5px solid transparent',
        borderBottom: 0,
        borderLeft: '3.5px solid transparent',
      },
    },

    icon: {
      width: 18,
      marginRight: 6,
    },

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

    layersContainer: {
      display: 'flex',
      marginBottom: 8,
    },

    accordion: {
      '&:before': {
        display: 'none',
      },
      '&$expanded': {
        margin: 'auto',
        marginLeft: 0,
        width: '100%',
      },
      boxShadow: 'none',
    },

    accordionSummary: {
      backgroundColor: theme.palette.primary.main,
      minHeight: 56,
      '&$expanded': {
        minHeight: 56,
      },
      '&:focus': {
        background: theme.palette.primary.main,
      },
    },

    accordionDetail: {
      backgroundColor: theme.palette.primary.dark,
      opacity: '0.9',
      padding: theme.spacing(2),
    },
  });

export interface MenuItemMobileProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MenuItemMobile);
