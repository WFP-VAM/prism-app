import React from 'react';
import {
  Box,
  makeStyles,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import { sortBy } from 'lodash';
import {
  AdminCodeString,
  AdminLevelType,
  BoundaryLayerProps,
} from 'config/types';
import {
  getAdminBoundaryTree,
  AdminBoundaryTree,
} from 'components/MapView/Layers/BoundaryDropdown/utils';
import { useSafeTranslation } from 'i18n';
import { BoundaryLayerData } from 'context/layers/boundary';
import { getProperties } from 'components/MapView/utils';
import { GeoJsonProperties } from 'geojson';

interface ChartLocationSelectorProps {
  boundaryLayerData: BoundaryLayerData | undefined;
  boundaryLayer: BoundaryLayerProps;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
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
}

function ChartLocationSelector({
  boundaryLayerData,
  boundaryLayer,
  admin1Key,
  admin2Key,
  onAdmin1Change,
  onAdmin2Change,
  disabled = false,
  stacked = false,
  hideLabel = false,
}: ChartLocationSelectorProps) {
  const classes = useStyles();
  const { t, i18n: i18nLocale } = useSafeTranslation();

  if (!boundaryLayerData) {
    return null;
  }

  const adminBoundaryTree = getAdminBoundaryTree(
    boundaryLayerData,
    boundaryLayer,
    i18nLocale,
  );

  const admin0BoundaryTree = adminBoundaryTree.children;

  const orderedAdmin1Areas: AdminBoundaryTree[] = boundaryLayerData
    ? sortBy(Object.values(admin0BoundaryTree), 'label')
    : [];

  const selectedAdmin1Area = admin0BoundaryTree?.[admin1Key];

  const orderedAdmin2Areas: AdminBoundaryTree[] =
    boundaryLayerData && admin1Key && selectedAdmin1Area
      ? sortBy(Object.values(selectedAdmin1Area.children), 'label')
      : [];

  const selectedAdmin2Area = selectedAdmin1Area?.children[admin2Key];

  const renderAdmin1Value = (admin1keyValue: any) =>
    admin0BoundaryTree[admin1keyValue]?.label;

  const renderAdmin2Value = (admin2KeyValue: any) =>
    selectedAdmin1Area?.children[admin2KeyValue]?.label;

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

  const renderMenuItemList = (trees: AdminBoundaryTree[]) =>
    trees.map(option => (
      <MenuItem key={option.adminCode} value={option.adminCode}>
        {option.label}
      </MenuItem>
    ));

  return (
    <div className={classes.container}>
      {!hideLabel && (
        <Typography className={classes.label} variant="body2">
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
            renderValue: renderAdmin1Value,
          }}
          onChange={handleAdmin1Change}
          variant="outlined"
          disabled={disabled || orderedAdmin1Areas.length === 0}
        >
          <MenuItem value="">
            <Box className={classes.removeAdmin}>{t('Country Level')}</Box>
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
              renderValue: renderAdmin2Value,
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
    marginBottom: 8,
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
    '& label': {
      color: '#333333',
    },
    '& .MuiInputBase-root': {
      '&:hover fieldset': {
        borderColor: '#333333',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#333333',
      },
    },
    '& .MuiSelect-root': {
      color: 'black',
    },
  },
}));

export default ChartLocationSelector;
