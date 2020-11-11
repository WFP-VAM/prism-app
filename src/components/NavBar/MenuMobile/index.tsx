import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button,
  Typography,
  withStyles,
  WithStyles,
  createStyles,
  Theme,
  Switch,
  Grid,
} from '@material-ui/core';
import MuiAccordion from '@material-ui/core/Accordion';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import MuiAccordionDetails from '@material-ui/core/AccordionDetails';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';

import { LayerType, TableType } from '../../../config/types';
import { addLayer, removeLayer } from '../../../context/mapStateSlice';
import { loadTable } from '../../../context/tableStateSlice';
import { layersSelector } from '../../../context/mapStateSlice/selectors';
import { menuList } from '../utils';

function MenuMobile({ classes }: MenuMobileProps) {
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

  const Accordion = withStyles({
    root: {
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
    expanded: {},
  })(MuiAccordion);

  const AccordionSummary = withStyles(theme => ({
    root: {
      backgroundColor: theme.palette.primary.main,
      minHeight: 56,
      '&$expanded': {
        minHeight: 56,
      },
    },
    content: {
      '&$expanded': {
        margin: '12px 0',
      },
    },
    expanded: {},
  }))(MuiAccordionSummary);

  const AccordionDetails = withStyles(theme => ({
    root: {
      backgroundColor: theme.palette.primary.dark,
      opacity: '0.9',
      padding: theme.spacing(2),
    },
  }))(MuiAccordionDetails);

  return (
    <>
      {menuList.map(({ title, icon, layersCategories }) => (
        <Accordion
          key={title}
          square
          expanded={expanded === title}
          onChange={handleChange(title)}
        >
          <AccordionSummary
            expandIcon={<FontAwesomeIcon icon={faCaretDown} />}
            IconButtonProps={{ color: 'inherit', size: 'small' }}
            aria-controls={title}
            id={title}
          >
            <img className={classes.icon} src={icon} alt={title} />
            <Typography variant="body2">{title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
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

const styles = () =>
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
    },

    categoryTitle: {
      fontWeight: 'bold',
      textAlign: 'left',
    },

    layersContainer: {
      display: 'flex',
      marginBottom: 8,
    },
  });

export interface MenuMobileProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MenuMobile);
