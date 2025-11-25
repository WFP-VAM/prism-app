import {
  Box,
  createStyles,
  makeStyles,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import { sortBy } from 'lodash';
import React, { memo, ReactNode } from 'react';
import { BoundaryLayerProps, PanelSize, AdminCodeString } from 'config/types';
import {
  getAdminBoundaryTree,
  AdminBoundaryTree,
} from 'components/MapView/Layers/BoundaryDropdown/utils';
import { useSafeTranslation } from 'i18n';
import { BoundaryLayerData } from 'context/layers/boundary';

const useStyles = makeStyles(() =>
  createStyles({
    chartsPanelParams: {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: PanelSize.medium,
      flexShrink: 0,
    },
    removeAdmin: {
      fontWeight: 'bold',
    },
    selectRoot: {
      marginBottom: 30,
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
    wrapper: {
      marginLeft: 20,
      marginTop: 20,
    },
    wrapperLabel: {
      color: 'black',
      fontWeight: 'bold',
    },
  }),
);

const LocationSelector = memo(
  ({
    admin0Key,
    admin1Key,
    admin2Key,
    boundaryLayer,
    country,
    countryAdmin0Id,
    data,
    getProperties,
    multiCountry,
    setAdmin0Key,
    setAdmin1Key,
    setAdmin2Key,
    setAdminLevel,
    setAdminProperties,
    setSelectedAdmin1Area,
    setSelectedAdmin2Area,
    title,
  }: LocationSelectorProps) => {
    const styles = useStyles();
    const { t, i18n: i18nLocale } = useSafeTranslation();

    const adminBoundaryTree = getAdminBoundaryTree(
      data,
      boundaryLayer,
      i18nLocale,
    );
    const orderedAdmin0areas: () => AdminBoundaryTree[] = () => {
      if (!multiCountry) {
        return [];
      }
      return data
        ? sortBy(Object.values(adminBoundaryTree.children), 'label')
        : [];
    };

    const admin0BoundaryTree = multiCountry
      ? adminBoundaryTree.children[admin0Key]?.children
      : adminBoundaryTree.children;

    const orderedAdmin1areas: () => AdminBoundaryTree[] = () => {
      if (!data || !admin0BoundaryTree) {
        return [];
      }
      return sortBy(Object.values(admin0BoundaryTree), 'label');
    };

    const selectedAdmin1Area = () => admin0BoundaryTree?.[admin1Key];

    const orderedAdmin2areas: () => AdminBoundaryTree[] = () =>
      data && admin1Key
        ? sortBy(Object.values(selectedAdmin1Area().children), 'label')
        : [];

    const selectedAdmin2Area = () => selectedAdmin1Area().children[admin2Key];

    const renderAdmin0Value = (admin0keyValue: any) => {
      if (!multiCountry) {
        return country;
      }
      return adminBoundaryTree.children[admin0keyValue].label as ReactNode;
    };

    const renderAdmin1Value = (admin1keyValue: any) =>
      admin0BoundaryTree[admin1keyValue]?.label;

    const renderAdmin2Value = (admin2KeyValue: any) =>
      selectedAdmin1Area().children[admin2KeyValue].label;

    const onChangeAdmin0Area = (event: React.ChangeEvent<HTMLInputElement>) => {
      const admin0Id = event.target.value;

      if (data) {
        setAdminProperties(getProperties(data, admin0Id, 0));
      }
      setAdmin0Key(event.target.value);
      setAdmin1Key('');
      setAdmin2Key('');
      setAdminLevel(0);
    };

    const onChangeAdmin1Area = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.value) {
        setAdmin1Key('');
        if (countryAdmin0Id || multiCountry) {
          setAdminLevel(0);
        }
        return;
      }

      const admin1Id = event.target.value;
      if (data) {
        setAdminProperties(getProperties(data, admin1Id, 1));
      }
      setAdmin1Key(event.target.value);
      // update the parent component state
      setSelectedAdmin1Area(admin0BoundaryTree[event.target.value]?.label);
      setAdmin2Key('');
      setAdminLevel(1);
    };

    const onChangeAdmin2Area = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.value) {
        setAdmin2Key('');
        setAdminLevel(1);
        setSelectedAdmin2Area('');
        return;
      }
      const admin2Id = event.target.value;
      if (data) {
        setAdminProperties(getProperties(data, admin2Id, 2));
      }
      setAdmin2Key(event.target.value);

      setSelectedAdmin2Area(
        selectedAdmin1Area().children[event.target.value].label,
      );
      setAdminLevel(2);
    };

    const renderMenuItemList = (trees: AdminBoundaryTree[]) =>
      trees.map(option => (
        <MenuItem key={option.adminCode} value={option.adminCode}>
          {option.label}
        </MenuItem>
      ));

    return (
      <Box className={styles.wrapper}>
        {title && (
          <Typography className={styles.wrapperLabel} variant="body2">
            {title}
          </Typography>
        )}
        <Box className={styles.chartsPanelParams}>
          <TextField
            classes={{ root: styles.selectRoot }}
            id="outlined-admin-1"
            select
            label={multiCountry ? t('Country') : country}
            value={admin0Key ?? country}
            SelectProps={{
              renderValue: renderAdmin0Value,
            }}
            onChange={onChangeAdmin0Area}
            variant="outlined"
            disabled={!multiCountry}
          >
            <MenuItem key={country} value={country} disabled>
              {t(country)}
            </MenuItem>
            {renderMenuItemList(orderedAdmin0areas())}
          </TextField>

          <TextField
            classes={{ root: styles.selectRoot }}
            id="outlined-admin-1"
            select
            label={t('Admin 1')}
            value={selectedAdmin1Area()?.adminCode ?? ''}
            SelectProps={{
              renderValue: renderAdmin1Value,
            }}
            onChange={onChangeAdmin1Area}
            variant="outlined"
            disabled={orderedAdmin1areas().length === 0}
          >
            <MenuItem divider>
              <Box className={styles.removeAdmin}>
                {' '}
                {t('Remove {{adminLevel}}', { adminLevel: t('Admin 1') })}
              </Box>
            </MenuItem>
            {renderMenuItemList(orderedAdmin1areas())}
          </TextField>
          {admin1Key && (
            <TextField
              classes={{ root: styles.selectRoot }}
              id="outlined-admin-2"
              select
              label={t('Admin 2')}
              value={selectedAdmin2Area()?.adminCode ?? ''}
              SelectProps={{
                renderValue: renderAdmin2Value,
              }}
              onChange={onChangeAdmin2Area}
              variant="outlined"
            >
              <MenuItem divider>
                <Box className={styles.removeAdmin}>
                  {' '}
                  {t('Remove {{adminLevel}}', { adminLevel: t('Admin 2') })}
                </Box>
              </MenuItem>
              {renderMenuItemList(orderedAdmin2areas())}
            </TextField>
          )}
        </Box>
      </Box>
    );
  },
);

interface LocationSelectorProps {
  admin0Key: AdminCodeString;
  admin1Key: AdminCodeString;
  admin2Key: AdminCodeString;
  boundaryLayer: BoundaryLayerProps;
  country: string;
  countryAdmin0Id: number;
  data: BoundaryLayerData | undefined;
  getProperties: any;
  multiCountry: boolean;
  setAdmin0Key: any;
  setAdmin1Key: any;
  setAdmin2Key: any;
  setAdminLevel: any;
  setAdminProperties: any;
  setSelectedAdmin1Area: any;
  setSelectedAdmin2Area: any;
  title: string | null;
}

export default LocationSelector;
