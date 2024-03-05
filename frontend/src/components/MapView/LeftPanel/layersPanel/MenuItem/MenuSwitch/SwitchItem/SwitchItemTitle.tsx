import {
  MenuItem,
  Select,
  Typography,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { WithStyles } from '@material-ui/styles';
import { LayerType, MenuGroupItem } from 'config/types';
import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const styles = () =>
  createStyles({
    title: {
      lineHeight: 1.8,
      color: 'black',
      fontWeight: 400,
    },
    titleUnchecked: {
      lineHeight: 1.8,
      color: '#828282',
      fontWeight: 400,
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
      color: '#828282',
      padding: 0,
      marginLeft: 5,
    },
  });

const getFilteredMenuGroupItems = (menus: MenuGroupItem[], filter?: string) =>
  menus.filter(menu => (filter ? menu.id === filter : true));

interface SwitchTitleProps extends WithStyles<typeof styles> {
  layer: LayerType;
  someLayerAreSelected: boolean;
  toggleLayerValue: (selectedLayerId: string, checked: boolean) => void;
  validatedTitle: string;
  activeLayerId: string;
  setActiveLayerId: (v: string) => void;
  groupMenuFilter?: string;
  disabledMenuSelection?: boolean;
}
const SwitchItemTitle = ({
  layer,
  someLayerAreSelected,
  toggleLayerValue,
  validatedTitle,
  activeLayerId,
  setActiveLayerId,
  groupMenuFilter,
  disabledMenuSelection = false,
  classes,
}: SwitchTitleProps) => {
  const { t } = useTranslation();
  const { group } = layer;

  const handleSelect = useCallback(
    (event: React.ChangeEvent<{ value: string | unknown }>) => {
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
            menu => {
              return (
                <MenuItem key={menu.id} value={menu.id}>
                  {t(menu.label)}
                </MenuItem>
              );
            },
          )}
        </Select>
      )}
    </>
  );
};

export default memo(withStyles(styles)(SwitchItemTitle));
