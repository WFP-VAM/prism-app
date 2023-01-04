import {
  Box,
  createStyles,
  makeStyles,
  MenuItem,
  TextField,
} from '@material-ui/core';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { BoundaryLayerProps } from '../../../../config/types';
import { getBoundaryLayerSingleton } from '../../../../config/utils';
import { LayerData } from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../../i18n';
import { getCategories } from '../../Layers/BoundaryDropdown';

const boundaryLayer = getBoundaryLayerSingleton();

const useStyles = makeStyles(() =>
  createStyles({
    selectRoot: {
      marginTop: 30,
      color: 'black',
      minWidth: '300px',
      maxWidth: '350px',
      width: 'auto',
      '& label': {
        color: '#333333',
      },
      '& .MuiInputBase-root': {
        color: 'black',
        '&:hover fieldset': {
          borderColor: '#333333',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#333333',
        },
      },
    },
    chartsPanelParams: {
      marginTop: 30,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
  }),
);

function ChartsPanel() {
  const classes = useStyles();
  const [admin1Title, setAdmin1Title] = useState('');
  const [admin2Title, setAdmin2Title] = useState('');
  const { i18n: i18nLocale } = useSafeTranslation();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  const categories = useMemo(
    () => (data ? getCategories(data, boundaryLayer, '', i18nLocale) : []),
    [data, i18nLocale],
  );

  return (
    <Box className={classes.chartsPanelParams}>
      <TextField
        classes={{ root: classes.selectRoot }}
        id="outlined-admin-1"
        select
        label="Select Admin 1"
        value={admin1Title}
        onChange={e => setAdmin1Title(e.target.value)}
        variant="outlined"
      >
        {categories.map(option => (
          <MenuItem key={option.title} value={option.title}>
            {option.title}
          </MenuItem>
        ))}
      </TextField>
      {admin1Title && (
        <TextField
          classes={{ root: classes.selectRoot }}
          id="outlined-admin-2"
          select
          label="Select Admin 2"
          value={admin2Title}
          onChange={e => {
            console.log(e);
            setAdmin2Title(e.target.value);
          }}
          variant="outlined"
        >
          {categories
            .filter(elem => elem.title === admin1Title)[0]
            .children.map(option => (
              <MenuItem key={option.value} value={option.label}>
                {option.label}
              </MenuItem>
            ))}
        </TextField>
      )}
    </Box>
  );
}

export default ChartsPanel;
