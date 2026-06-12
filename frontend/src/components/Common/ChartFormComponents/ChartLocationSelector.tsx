import { Box, MenuItem, TextField, Typography } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import {
  AdminBoundaryTree,
  getAdminBoundaryTree,
} from 'components/MapView/Layers/BoundaryDropdown/utils';
import { getProperties } from 'components/MapView/utils';
import { appConfig } from 'config';
import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
} from 'config/types';
import { BoundaryLayerData } from 'context/layers/boundary';
import { GeoJsonProperties } from 'geojson';
import { useSafeTranslation } from 'i18n';
import { sortBy } from 'lodash';
import React from 'react';

interface ChartLocationSelectorProps {
  boundaryLayerData: BoundaryLayerData | undefined;
  boundaryLayer: BoundaryLayerProps;
  admin0Key?: AdminCodeString;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
  onAdmin0Change?: (
    key: AdminCodeString,
    properties: GeoJsonProperties,
    adminLevel: AdminLevelType,
  ) => void;
  onAdmin1Change: (
    key: AdminCodeString,
    properties: GeoJsonProperties,
    adminLevel: AdminLevelType,
  ) => void;
  onAdmin2Change: (
    key: AdminCodeString,
    properties: GeoJsonProperties,
    adminLevel: AdminLevelType,
  ) => void;
  disabled?: boolean;
  stacked?: boolean;
  hideLabel?: boolean;
  labelMarginBottom?: number;
}

function ChartLocationSelector({
  boundaryLayerData,
  boundaryLayer,
  admin0Key = '' as AdminCodeString,
  admin1Key,
  admin2Key,
  onAdmin0Change,
  onAdmin1Change,
  onAdmin2Change,
  disabled = false,
  stacked = false,
  hideLabel = false,
  labelMarginBottom = 8,
}: ChartLocationSelectorProps) {
  const classes = useStyles();
  const { t, i18n: i18nLocale } = useSafeTranslation();

  // In multi-country deployments the boundary hierarchy starts at the country
  // (admin 0). When a consumer wires up `onAdmin0Change` we surface a dedicated
  // Country dropdown, and the chart levels line up directly with the hierarchy:
  // 0 = country, 1 = admin 1, 2 = admin 2.
  //
  // Otherwise we keep the flat two-dropdown behaviour and absorb the
  // multi-country offset in the level math (the chart `levels` config and
  // getProperties treat multi-country as 0-based and single-country as 1-based).
  const { multiCountry } = appConfig;
  const showCountryLevel = multiCountry && Boolean(onAdmin0Change);

  const admin1Level = (
    showCountryLevel ? 1 : multiCountry ? 0 : 1
  ) as AdminLevelType;

  const admin2Level = (
    showCountryLevel ? 2 : multiCountry ? 1 : 2
  ) as AdminLevelType;

  if (!boundaryLayerData) {
    return null;
  }

  const adminBoundaryTree = getAdminBoundaryTree(
    boundaryLayerData,
    boundaryLayer,
    i18nLocale,
  );

  // Countries are only selectable when the country dropdown is shown.
  const orderedCountries: AdminBoundaryTree[] = showCountryLevel
    ? sortBy(Object.values(adminBoundaryTree.children), 'label')
    : [];
  const selectedCountry = showCountryLevel
    ? adminBoundaryTree.children[admin0Key]
    : undefined;

  // Admin 1 areas live under the selected country (multi-country) or at the top
  // level of the tree (single-country / flat mode).
  const admin1ParentTree: { [code: string]: AdminBoundaryTree } =
    showCountryLevel
      ? (selectedCountry?.children ?? {})
      : adminBoundaryTree.children;

  const orderedAdmin1Areas: AdminBoundaryTree[] = sortBy(
    Object.values(admin1ParentTree),
    'label',
  );

  const selectedAdmin1Area = admin1ParentTree[admin1Key];

  const orderedAdmin2Areas: AdminBoundaryTree[] =
    admin1Key && selectedAdmin1Area
      ? sortBy(Object.values(selectedAdmin1Area.children), 'label')
      : [];

  const selectedAdmin2Area = selectedAdmin1Area?.children[admin2Key];

  const renderCountryValue = (countryKeyValue: any) =>
    adminBoundaryTree.children[countryKeyValue]?.label;

  const renderAdmin1Value = (admin1keyValue: any) =>
    admin1ParentTree[admin1keyValue]?.label;

  const renderAdmin2Value = (admin2KeyValue: any) =>
    selectedAdmin1Area?.children[admin2KeyValue]?.label;

  const handleCountryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (!value) {
      onAdmin0Change?.(
        '' as AdminCodeString,
        getProperties(boundaryLayerData),
        0 as AdminLevelType,
      );
      return;
    }

    const admin0Id = value as AdminCodeString;
    const properties = getProperties(
      boundaryLayerData,
      admin0Id,
      0 as AdminLevelType,
    );
    onAdmin0Change?.(admin0Id, properties, 0 as AdminLevelType);
  };

  const handleAdmin1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (!value) {
      // Clear Admin 1 - fall back to the country level (multi-country) or the
      // country aggregate (single-country).
      const fallbackProperties = showCountryLevel
        ? getProperties(boundaryLayerData, admin0Key, 0 as AdminLevelType)
        : getProperties(boundaryLayerData);
      onAdmin1Change(
        '' as AdminCodeString,
        fallbackProperties,
        0 as AdminLevelType,
      );
      return;
    }

    const admin1Id = value as AdminCodeString;
    const properties = getProperties(boundaryLayerData, admin1Id, admin1Level);
    onAdmin1Change(admin1Id, properties, admin1Level);
  };

  const handleAdmin2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (!value) {
      // Clear Admin 2 selection - go back to Admin 1 level
      const properties = getProperties(
        boundaryLayerData,
        admin1Key,
        admin1Level,
      );
      onAdmin2Change('' as AdminCodeString, properties, admin1Level);
      return;
    }

    const admin2Id = value as AdminCodeString;
    const properties = getProperties(boundaryLayerData, admin2Id, admin2Level);
    onAdmin2Change(admin2Id, properties, admin2Level);
  };

  const renderMenuItemList = (trees: AdminBoundaryTree[]) =>
    trees.map(option => (
      <MenuItem key={option.adminCode} value={option.adminCode}>
        {option.label}
      </MenuItem>
    ));

  return (
    <div className={classes.container}>
      {!hideLabel && (
        <Typography
          className={classes.label}
          variant="body2"
          style={{ marginBottom: labelMarginBottom }}
        >
          {t('Location')}
        </Typography>
      )}

      <div
        className={classes.fieldsRow}
        style={{ flexDirection: stacked ? 'column' : 'row' }}
      >
        {showCountryLevel && (
          <TextField
            classes={{ root: classes.selectRoot }}
            select
            label={t('Country')}
            value={selectedCountry?.adminCode ?? ''}
            slotProps={{
              select: {
                renderValue: renderCountryValue,
              },
            }}
            onChange={handleCountryChange}
            variant="outlined"
            disabled={disabled || orderedCountries.length === 0}
          >
            {renderMenuItemList(orderedCountries)}
          </TextField>
        )}

        <TextField
          classes={{ root: classes.selectRoot }}
          select
          label={t('Admin 1')}
          value={selectedAdmin1Area?.adminCode ?? ''}
          slotProps={{
            select: {
              renderValue: renderAdmin1Value,
            },
          }}
          onChange={handleAdmin1Change}
          variant="outlined"
          disabled={disabled || orderedAdmin1Areas.length === 0}
        >
          <MenuItem value="">
            <Box className={classes.removeAdmin}>
              {showCountryLevel ? t('Remove Admin 1') : t('Country Level')}
            </Box>
          </MenuItem>
          {renderMenuItemList(orderedAdmin1Areas)}
        </TextField>

        {admin1Key && orderedAdmin2Areas.length > 0 && (
          <TextField
            classes={{ root: classes.selectRoot }}
            select
            label={t('Admin 2')}
            value={selectedAdmin2Area?.adminCode ?? ''}
            slotProps={{
              select: {
                renderValue: renderAdmin2Value,
              },
            }}
            onChange={handleAdmin2Change}
            variant="outlined"
            disabled={disabled}
          >
            <MenuItem value="">
              <Box className={classes.removeAdmin}>{t('Remove Admin 2')}</Box>
            </MenuItem>
            {renderMenuItemList(orderedAdmin2Areas)}
          </TextField>
        )}
      </div>
    </div>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 20,
    marginLeft: 10,
    width: '90%',
    color: 'black',
  },
  label: {
    color: 'black',
    fontWeight: 600,
  },
  fieldsRow: {
    display: 'flex',
    gap: '16px',
    width: '100%',
  },
  removeAdmin: {
    fontWeight: 'bold',
  },
  selectRoot: {
    flex: 1,
    color: 'black',
    '& .MuiFormLabel-root': {
      color: 'black',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#333333',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#333333',
    },
    '& .MuiSelect-root': {
      color: 'black',
    },
  },
}));

export default ChartLocationSelector;
