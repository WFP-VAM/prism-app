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
import { useSafeTranslation } from 'i18n';
import { sortBy } from 'lodash';
import React from 'react';
import { isUrlDrivenDeployment } from 'utils/universal-utils';

interface ChartLocationSelectorProps {
  boundaryLayerData: BoundaryLayerData | undefined;
  boundaryLayer: BoundaryLayerProps;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
  admin3Key?: AdminCodeString;
  countryAdm0Id?: number | string;
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
  admin1Key,
  admin2Key,
  admin3Key = '' as AdminCodeString,
  countryAdm0Id,
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

  if (!boundaryLayerData) {
    return null;
  }

  const isUrlDriven = isUrlDrivenDeployment();

  const adminBoundaryTree = getAdminBoundaryTree(
    boundaryLayerData,
    boundaryLayer,
    i18nLocale,
  );

  // In URL-driven mode the country is fixed by the URL; skip the country tier and
  // show provinces as Admin 1, districts as Admin 2, admin posts as Admin 3.
  const rootTree: { [code: string]: AdminBoundaryTree } =
    isUrlDriven && countryAdm0Id !== undefined
      ? (adminBoundaryTree.children[String(countryAdm0Id)]?.children ?? {})
      : adminBoundaryTree.children;

  const orderedAdmin1Areas: AdminBoundaryTree[] = sortBy(
    Object.values(rootTree),
    'label',
  );

  const selectedAdmin1Area = rootTree[admin1Key];

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

  const renderAdmin1Value = (admin1keyValue: string) =>
    rootTree[admin1keyValue]?.label;

  const renderAdmin2Value = (admin2KeyValue: string) =>
    selectedAdmin1Area?.children[admin2KeyValue]?.label;

  const renderAdmin3Value = (admin3KeyValue: string) =>
    selectedAdmin2Area?.children[admin3KeyValue]?.label;

  const handleAdmin1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (!value) {
      // Clear selection - go back to country level
      onAdmin1Change(
        '' as AdminCodeString,
        getProperties(boundaryLayerData),
        0,
      );
      return;
    }

    const admin1Id = value as AdminCodeString;
    const properties = getProperties(boundaryLayerData, admin1Id, 1);
    onAdmin1Change(admin1Id, properties, 1);
  };

  const handleAdmin2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (!value) {
      // Clear Admin 2 selection - go back to Admin 1 level
      const properties = getProperties(boundaryLayerData, admin1Key, 1);
      onAdmin2Change('' as AdminCodeString, properties, 1);
      return;
    }

    const admin2Id = value as AdminCodeString;
    const properties = getProperties(boundaryLayerData, admin2Id, 2);
    onAdmin2Change(admin2Id, properties, 2);
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
    isUrlDriven && admin2Key && orderedAdmin3Areas.length > 0;

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
          {!isUrlDriven && (
            <MenuItem value="">
              <Box className={classes.removeAdmin}>{t('Country Level')}</Box>
            </MenuItem>
          )}
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
