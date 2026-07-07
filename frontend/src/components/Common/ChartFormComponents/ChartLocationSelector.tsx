import {
  Box,
  makeStyles,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  AdminBoundaryTree,
  getAdminBoundaryTree,
} from 'components/MapView/Layers/BoundaryDropdown/utils';
import { getProperties } from 'components/MapView/utils';
import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
} from 'config/types';
import { BoundaryLayerData } from 'context/layers/boundary';
import { GeoJsonProperties } from 'geojson';
import { useAdminNameTranslations } from 'hooks/useAdminNameTranslations';
import { useSafeTranslation } from 'i18n';
import { sortBy } from 'lodash';
import React from 'react';
import { getEffectiveMultiCountry } from 'utils/universal-country-admin';
import { isUniversalDeployment } from 'utils/universal-utils';

interface ChartLocationSelectorProps {
  boundaryLayerData: BoundaryLayerData | undefined;
  boundaryLayer: BoundaryLayerProps;
  admin0Key?: AdminCodeString;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
  admin3Key?: AdminCodeString;
  countryAdm0Id?: number | string;
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
  onAdmin3Change?: (
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
  admin3Key = '' as AdminCodeString,
  countryAdm0Id,
  onAdmin0Change,
  onAdmin1Change,
  onAdmin2Change,
  onAdmin3Change,
  disabled = false,
  stacked = false,
  hideLabel = false,
  labelMarginBottom = 8,
}: ChartLocationSelectorProps) {
  const classes = useStyles();
  const { t, i18n: i18nLocale } = useSafeTranslation();
  const { dict: adminNameDict } = useAdminNameTranslations();

  // Universal (URL-driven) deployments fix the country via the URL and drill in
  // to show Admin 1/2/3 directly, so the country picker is never shown there
  // (getEffectiveMultiCountry returns false for universal deployments).
  //
  // In non-universal multi-country deployments the boundary hierarchy starts at
  // the country (admin 0). When a consumer wires up `onAdmin0Change` we surface
  // a dedicated Country dropdown and the chart levels line up directly with the
  // hierarchy: 0 = country, 1 = admin 1, 2 = admin 2.
  //
  // Otherwise we keep the flat two-dropdown behaviour and absorb the
  // multi-country offset in the level math (the chart `levels` config and
  // getProperties treat multi-country as 0-based and single-country as 1-based).
  const isUniversal = isUniversalDeployment();
  const multiCountry = getEffectiveMultiCountry();
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
    adminNameDict,
  );

  // Countries are only selectable when the country dropdown is shown.
  const orderedCountries: AdminBoundaryTree[] = showCountryLevel
    ? sortBy(Object.values(adminBoundaryTree.children), 'label')
    : [];
  const selectedCountry = showCountryLevel
    ? adminBoundaryTree.children[admin0Key]
    : undefined;

  // Admin 1 areas live under the country fixed by the URL (universal), the
  // selected country (multi-country picker), or at the top level of the tree
  // (single-country / flat mode).
  const getAdmin1ParentTree = (): { [code: string]: AdminBoundaryTree } => {
    if (isUniversal && countryAdm0Id !== undefined) {
      return adminBoundaryTree.children[String(countryAdm0Id)]?.children ?? {};
    }
    if (showCountryLevel) {
      return selectedCountry?.children ?? {};
    }
    return adminBoundaryTree.children;
  };
  const admin1ParentTree = getAdmin1ParentTree();

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

  const orderedAdmin3Areas: AdminBoundaryTree[] =
    admin2Key && selectedAdmin2Area
      ? sortBy(Object.values(selectedAdmin2Area.children), 'label')
      : [];

  const selectedAdmin3Area = selectedAdmin2Area?.children[admin3Key];

  const renderCountryValue = (countryKeyValue: string) =>
    adminBoundaryTree.children[countryKeyValue]?.label;

  const renderAdmin1Value = (admin1keyValue: string) =>
    admin1ParentTree[admin1keyValue]?.label;

  const renderAdmin2Value = (admin2KeyValue: string) =>
    selectedAdmin1Area?.children[admin2KeyValue]?.label;

  const renderAdmin3Value = (admin3KeyValue: string) =>
    selectedAdmin2Area?.children[admin3KeyValue]?.label;

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
      // country aggregate (single-country / universal).
      let fallbackProperties: GeoJsonProperties;
      if (showCountryLevel) {
        fallbackProperties = getProperties(
          boundaryLayerData,
          admin0Key,
          0 as AdminLevelType,
        );
      } else if (isUniversal && countryAdm0Id !== undefined) {
        fallbackProperties = getProperties(
          boundaryLayerData,
          String(countryAdm0Id) as AdminCodeString,
          0 as AdminLevelType,
        );
      } else {
        fallbackProperties = getProperties(boundaryLayerData);
      }
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

  const handleAdmin3Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (!value) {
      const properties = getProperties(boundaryLayerData, admin2Key, 2);
      onAdmin3Change?.('' as AdminCodeString, properties, 2);
      return;
    }

    const admin3Id = value as AdminCodeString;
    const properties = getProperties(boundaryLayerData, admin3Id, 3);
    onAdmin3Change?.(admin3Id, properties, 3);
  };

  const renderMenuItemList = (trees: AdminBoundaryTree[]) =>
    trees.map(option => (
      <MenuItem key={option.adminCode} value={option.adminCode}>
        {option.label}
      </MenuItem>
    ));

  const showAdmin3Dropdown =
    isUniversal && admin2Key && orderedAdmin3Areas.length > 0;

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
            SelectProps={{
              renderValue: (value: unknown) =>
                renderCountryValue(value as string),
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
          SelectProps={{
            renderValue: (value: unknown) => renderAdmin1Value(value as string),
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
            SelectProps={{
              renderValue: (value: unknown) =>
                renderAdmin2Value(value as string),
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

        {showAdmin3Dropdown && (
          <TextField
            classes={{ root: classes.selectRoot }}
            select
            label={t('Admin 3')}
            value={selectedAdmin3Area?.adminCode ?? ''}
            SelectProps={{
              renderValue: (value: unknown) =>
                renderAdmin3Value(value as string),
            }}
            onChange={handleAdmin3Change}
            variant="outlined"
            disabled={disabled}
          >
            <MenuItem value="">
              <Box className={classes.removeAdmin}>{t('Remove Admin 3')}</Box>
            </MenuItem>
            {renderMenuItemList(orderedAdmin3Areas)}
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
