import { Box, Input, MenuItem, Select, Typography } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  layerDaySelectMenuProps,
  layerDaySelectSx,
  layerDaySelectTitleSx,
} from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import { LayerType, MenuGroupItem } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { memo, useCallback } from 'react';

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
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <Typography
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
          sx={layerDaySelectTitleSx(
            someLayerAreSelected,
            disabledMenuSelection,
          )}
        >
          {validatedTitle}
        </Typography>
        {group && !group.activateAll && (
          <Select
            variant="standard"
            value={activeLayerId}
            input={<Input disableUnderline />}
            onChange={e => handleSelect(e)}
            onMouseDown={e => e.stopPropagation()}
            MenuProps={layerDaySelectMenuProps}
            disabled={disabledMenuSelection}
            sx={layerDaySelectSx(someLayerAreSelected)}
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
      </Box>
    );
  },
);

export default SwitchItemTitle;
