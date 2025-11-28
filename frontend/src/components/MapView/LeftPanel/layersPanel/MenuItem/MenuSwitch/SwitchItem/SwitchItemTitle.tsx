import {MenuItem,
  Select,
  Typography} from '@mui/material';
import { LayerType, MenuGroupItem } from 'config/types';
import { makeStyles, createStyles } from '@mui/styles';
import React, { memo, useCallback } from 'react';
import { useSafeTranslation } from 'i18n';

const useStyles = makeStyles(() =>
  createStyles({
    title: {
      lineHeight: 1.8,
      color: 'black',
      fontWeight: 400,
      fontSize: '14px',
    },
    titleUnchecked: {
      lineHeight: 1.8,
      fontWeight: 400,
      fontSize: '14px',
    },
    select: {
      '&::before': {
        border: 'none',
      },
    },
    selectItem: {
      whiteSpace: 'normal',
      fontSize: 13,
      fontWeight: 300,
      color: 'black',
      padding: 0,
      marginLeft: 5,
    },
    selectItemUnchecked: {
      whiteSpace: 'normal',
      fontSize: 13,
      fontWeight: 300,
      padding: 0,
      marginLeft: 5,
    },
  }),
);

const getFilteredMenuGroupItems = (menus: MenuGroupItem[], filter?: string) =>
  menus.filter(menu => (filter ? menu.id === filter : true));

interface SwitchTitleProps {
  layer: LayerType;
  someLayerAreSelected: boolean;
  toggleLayerValue: (selectedLayerId: string, checked: boolean) => void;
  validatedTitle: string;
  activeLayerId: string;
  setActiveLayerId: (v: string) => void;
  groupMenuFilter?: string;
  disabledMenuSelection?: boolean;
}
const SwitchItemTitle = memo(
  ({
    layer,
    someLayerAreSelected,
    toggleLayerValue,
    validatedTitle,
    activeLayerId,
    setActiveLayerId,
    groupMenuFilter,
    disabledMenuSelection = false,
  }: SwitchTitleProps) => {
    const classes = useStyles();
    const { t } = useSafeTranslation();
    const { group } = layer;

    const handleSelect = useCallback(
      (event: any) => {
        const selectedId = event.target.value;
        setActiveLayerId(selectedId as string);
        toggleLayerValue(selectedId as string, true);
      },
      [setActiveLayerId, toggleLayerValue],
    );

    return (
      <>
        <Typography
          className={
            someLayerAreSelected ? classes.title : classes.titleUnchecked
          }
        >
          {validatedTitle}
        </Typography>
        {group && !group.activateAll && (
          <Select
            className={classes.select}
            classes={{
              root: someLayerAreSelected
                ? classes.selectItem
                : classes.selectItemUnchecked,
            }}
            value={activeLayerId}
            onChange={e => handleSelect(e)}
            disabled={disabledMenuSelection}
          >
            {getFilteredMenuGroupItems(group.layers, groupMenuFilter).map(
              menu => (
                <MenuItem key={menu.id} value={menu.id}>
                  {t(menu.label)}
                </MenuItem>
              ),
            )}
          </Select>
        )}
      </>
    );
  },
);

export default SwitchItemTitle;
