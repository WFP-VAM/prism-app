import { MenuItem, MenuProps, Select, Typography } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { LayerType, MenuGroupItem } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { memo, useCallback } from 'react';

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

/** Nested accordions + drawer: anchor positioning / scroll lock can break MUI Select menu. */
const switchItemSelectMenuProps: Partial<MenuProps> = {
  disableScrollLock: true,
};

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
      (event: SelectChangeEvent<string>) => {
        const selectedId = event.target.value;
        setActiveLayerId(selectedId as string);
        toggleLayerValue(selectedId as string, true);
      },
      [setActiveLayerId, toggleLayerValue],
    );

    const handleTitleClick = useCallback(() => {
      if (disabledMenuSelection) {
        return;
      }
      toggleLayerValue(activeLayerId, !someLayerAreSelected);
    }, [
      activeLayerId,
      disabledMenuSelection,
      someLayerAreSelected,
      toggleLayerValue,
    ]);

    return (
      <>
        <Typography
          className={
            someLayerAreSelected ? classes.title : classes.titleUnchecked
          }
          component="span"
          role="button"
          tabIndex={0}
          onClick={handleTitleClick}
          onMouseDown={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTitleClick();
            }
          }}
          style={{ cursor: disabledMenuSelection ? 'default' : 'pointer' }}
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
            onMouseDown={e => e.stopPropagation()}
            MenuProps={switchItemSelectMenuProps}
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
