import {
  Box,
  createStyles,
  makeStyles,
  MenuItem,
  TextField,
} from '@material-ui/core';
import React, { memo, useCallback, useState, useMemo } from 'react';
import { PanelSize } from 'config/types';
import {
  getOrderedAreas,
  OrderedArea,
} from 'components/MapView/Layers/BoundaryDropdown';
import { useSafeTranslation } from 'i18n';
import { BoundaryLayerData } from 'context/layers/boundary';

const useStyles = makeStyles(() =>
  createStyles({
    chartsPanelParams: {
      marginTop: 30,
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
  }),
);

const LocationSelector = memo(
  ({
    boundaryLayer,
    country,
    countryAdmin0Id,
    data,
    getProperties,
    multiCountry,
    setAdminLevel,
    setAdminProperties,
    setSelectedAdmin1Area,
    setSelectedAdmin2Area,
  }: LocationSelectorProps) => {
    const styles = useStyles();
    const { t, i18n: i18nLocale } = useSafeTranslation();

    const [admin0Key, setAdmin0Key] = useState('');
    const [admin1Key, setAdmin1Key] = useState('');
    const [admin2Key, setAdmin2Key] = useState('');

    const orderedAdmin0areas = useMemo(() => {
      if (!multiCountry) {
        return [];
      }
      return data ? getOrderedAreas(data, boundaryLayer, '', i18nLocale) : [];
    }, [boundaryLayer, data, i18nLocale, multiCountry]);

    const orderedAdmin1areas = useMemo(() => {
      return data
        ? getOrderedAreas(
            data,
            boundaryLayer,
            '',
            i18nLocale,
            multiCountry ? 1 : 0,
            admin0Key,
          )
        : [];
    }, [admin0Key, boundaryLayer, data, i18nLocale, multiCountry]);

    const selectedaAdmin0Area = useMemo(() => {
      return orderedAdmin0areas.find(area => {
        return admin0Key === area.key;
      });
    }, [admin0Key, orderedAdmin0areas]);

    const selectedAdmin1Area = useMemo(() => {
      return orderedAdmin1areas.find(area => {
        return admin1Key === area.key;
      });
    }, [admin1Key, orderedAdmin1areas]);

    const selectedAdmin2Area = useMemo(() => {
      return selectedAdmin1Area?.children.find(childArea => {
        return admin2Key === childArea.key;
      });
    }, [selectedAdmin1Area, admin2Key]);

    const findArea = (
      orderedAdminAreas: OrderedArea[],
      adminKeyValue: string,
    ) =>
      orderedAdminAreas.find(category => {
        return category.key === adminKeyValue;
      });

    const findArea2 = (
      orderedAdminAreas: { key: string; label: string }[] | undefined,
      adminKeyValue: string,
    ) =>
      orderedAdminAreas?.find(category => {
        return category.key === adminKeyValue;
      });

    const renderAdmin0Value = useCallback(
      admin0keyValue => {
        if (!multiCountry) {
          return country;
        }
        return findArea(orderedAdmin0areas, admin0keyValue)?.title;
      },
      [country, multiCountry, orderedAdmin0areas],
    );

    const renderAdmin1Value = useCallback(
      admin1keyValue => {
        return findArea(orderedAdmin1areas, admin1keyValue)?.title;
      },
      [orderedAdmin1areas],
    );

    const renderAdmin2Value = useCallback(
      admin2KeyValue => {
        return selectedAdmin1Area?.children.find(childCategory => {
          return childCategory.key === admin2KeyValue;
        })?.label;
      },
      [selectedAdmin1Area],
    );

    const onChangeAdmin0Area = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        // The external chart key for admin 0 is stored in all its children regions
        // here we get the first child properties
        const admin0Id = orderedAdmin0areas.find(area => {
          return area.key === event.target.value;
        })?.children[0].value;

        if (data) {
          setAdminProperties(getProperties(data, admin0Id));
        }
        setAdmin0Key(event.target.value);
        setAdmin1Key('');
        setAdmin2Key('');
        setAdminLevel(0);
      },
      [
        data,
        getProperties,
        orderedAdmin0areas,
        setAdminLevel,
        setAdminProperties,
      ],
    );

    const onChangeAdmin1Area = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.value) {
          setAdmin1Key('');
          if (countryAdmin0Id || multiCountry) {
            setAdminLevel(0);
          }
          return;
        }

        // The external chart key for admin 1 is stored in all its children regions
        // here we get the first child properties
        const admin1Id = orderedAdmin1areas.find(area => {
          return area.key === event.target.value;
        })?.children[0].value;

        if (data) {
          setAdminProperties(getProperties(data, admin1Id));
        }
        setAdmin1Key(event.target.value);
        // update the parent component state
        setSelectedAdmin1Area(
          findArea(orderedAdmin1areas, event.target.value)?.title,
        );
        setAdmin2Key('');
        setAdminLevel(1);
      },
      [
        countryAdmin0Id,
        data,
        getProperties,
        multiCountry,
        orderedAdmin1areas,
        setAdminLevel,
        setAdminProperties,
        setSelectedAdmin1Area,
      ],
    );

    const onChangeAdmin2Area = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.value) {
          // Unset Admin 2
          // We don't have to reset the adminProperties because any children contains the admin 1 external key
          setAdmin2Key('');
          setAdminLevel(1);
          return;
        }
        const admin2Id = selectedAdmin1Area?.children.find(childArea => {
          return childArea.key === event.target.value;
        })?.value;
        if (data) {
          setAdminProperties(getProperties(data, admin2Id));
        }
        // setSelectedAdmin2Area(selectedAdmin2Area);
        setAdmin2Key(event.target.value);

        console.log(
          findArea2(selectedAdmin1Area?.children, event.target.value)?.label,
        );
        setSelectedAdmin2Area(
          findArea2(selectedAdmin1Area?.children, event.target.value)?.label,
        );
        setAdminLevel(2);
      },
      [
        selectedAdmin1Area,
        data,
        setSelectedAdmin2Area,
        setAdminLevel,
        setAdminProperties,
        getProperties,
      ],
    );

    const renderMenuItemList = (orderedAdminArea: OrderedArea[]) =>
      orderedAdminArea.map(option => (
        <MenuItem key={option.key} value={option.key}>
          {option.title}
        </MenuItem>
      ));

    return (
      <Box className={styles.chartsPanelParams}>
        <TextField
          classes={{ root: styles.selectRoot }}
          id="outlined-admin-1"
          select
          label={t('Country')}
          value={selectedaAdmin0Area?.key ?? country}
          SelectProps={{
            renderValue: renderAdmin0Value,
          }}
          onChange={onChangeAdmin0Area}
          variant="outlined"
          disabled={!multiCountry}
        >
          <MenuItem key={country} value={country} disabled>
            {country}
          </MenuItem>
          {renderMenuItemList(orderedAdmin0areas)}
        </TextField>

        <TextField
          classes={{ root: styles.selectRoot }}
          id="outlined-admin-1"
          select
          label={t('Admin 1')}
          value={selectedAdmin1Area?.key ?? ''}
          SelectProps={{
            renderValue: renderAdmin1Value,
          }}
          onChange={onChangeAdmin1Area}
          variant="outlined"
        >
          <MenuItem divider>
            <Box className={styles.removeAdmin}> {t('Remove Admin 1')}</Box>
          </MenuItem>
          {renderMenuItemList(orderedAdmin1areas)}
        </TextField>
        {admin1Key && (
          <TextField
            classes={{ root: styles.selectRoot }}
            id="outlined-admin-2"
            select
            label={t('Admin 2')}
            value={selectedAdmin2Area?.key ?? ''}
            SelectProps={{
              renderValue: renderAdmin2Value,
            }}
            onChange={onChangeAdmin2Area}
            variant="outlined"
          >
            <MenuItem divider>
              <Box className={styles.removeAdmin}> {t('Remove Admin 2')}</Box>
            </MenuItem>
            {selectedAdmin1Area?.children.map(option => (
              <MenuItem key={option.key} value={option.key}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
    );
  },
);

interface LocationSelectorProps {
  // FIXME: proper types
  boundaryLayer: any;
  country: any;
  countryAdmin0Id: any;
  data: BoundaryLayerData | undefined;
  getProperties: any;
  multiCountry: boolean;
  setAdminLevel: any;
  setAdminProperties: any;
  setSelectedAdmin1Area: any;
  setSelectedAdmin2Area: any;
}

export default LocationSelector;
