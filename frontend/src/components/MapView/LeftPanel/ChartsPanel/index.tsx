import {
  Box,
  createStyles,
  makeStyles,
  MenuItem,
  TextField,
} from '@material-ui/core';
import { GeoJsonProperties } from 'geojson';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { BoundaryLayerProps } from '../../../../config/types';
import { getBoundaryLayerSingleton } from '../../../../config/utils';
import { LayerData } from '../../../../context/layers/layer-data';
import { layerDataSelector } from '../../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../../i18n';
import { getCategories } from '../../Layers/BoundaryDropdown';

const boundaryLayer = getBoundaryLayerSingleton();

function getProperties(
  id: string,
  layerData: LayerData<BoundaryLayerProps>['data'],
) {
  return layerData.features.filter(
    elem => elem.properties && elem.properties[boundaryLayer.adminCode] === id,
  )[0].properties;
}

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
  const [adminProperties, setAdminProperties] = useState<GeoJsonProperties>();
  const { t, i18n: i18nLocale } = useSafeTranslation();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  const categories = useMemo(
    () => (data ? getCategories(data, boundaryLayer, '', i18nLocale) : []),
    [data, i18nLocale],
  );

  const onChangeAdmin1 = (event: React.ChangeEvent<HTMLInputElement>) => {
    // The external chart key for admin 1 is stored in all its children regions
    // here we get the first child properties
    const admin2Id = categories.filter(
      elem => elem.title === event.target.value,
    )[0].children[0].value;

    if (data) {
      setAdminProperties(getProperties(admin2Id, data));
    }
    setAdmin1Title(event.target.value);
    setAdmin2Title('');
  };

  const onChangeAdmin2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const admin2Id = categories
      .filter(elem => elem.title === admin1Title)[0]
      .children.filter(elem => elem.label === event.target.value)[0].value;
    if (data) {
      setAdminProperties(getProperties(admin2Id, data));
    }
    setAdmin2Title(event.target.value);
  };

  return (
    <Box className={classes.chartsPanelParams}>
      <TextField
        classes={{ root: classes.selectRoot }}
        id="outlined-admin-1"
        select
        label={t('Select Admin 1')}
        value={admin1Title}
        onChange={onChangeAdmin1}
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
          label={t('Select Admin 2')}
          value={admin2Title}
          onChange={onChangeAdmin2}
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
