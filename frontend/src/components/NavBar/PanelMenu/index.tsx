import { Chip, Divider, Menu, MenuItem } from '@mui/material';
import { Panel, PanelItem } from 'config/types';
import { selectedDashboardIndexSelector } from 'context/dashboardStateSlice';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useSelector } from 'react-redux';

function PanelMenu({
  panel,
  menuAnchor,
  handleMenuClose,
  handleChildClick,
  selected,
}: {
  panel: PanelItem;
  menuAnchor: HTMLElement | null;
  handleMenuClose: () => void;
  handleChildClick: (childPanel: PanelItem) => void;
  selected: string;
}) {
  const selectedDashboardIndex = useSelector(selectedDashboardIndexSelector);

  const getIsChildSelected = (child: PanelItem) => {
    if (panel.panel === Panel.Dashboard && selected === Panel.Dashboard) {
      return (
        child.reportIndex !== undefined &&
        child.reportIndex === selectedDashboardIndex
      );
    }

    return child.panel === selected;
  };

  const { t } = useSafeTranslation();

  return (
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={handleMenuClose}
    >
      {panel.children?.map((child: PanelItem, index) => (
        <React.Fragment
          key={
            child.reportIndex !== undefined
              ? `dashboard-${child.reportIndex}`
              : (child.reportPath ?? child.panel)
          }
        >
          {child.dividerBefore && index > 0 && (
            <Divider
              sx={theme => ({
                margin: '8px 0',
                height: 2,
                backgroundColor: theme.palette.grey[400],
              })}
            />
          )}
          <MenuItem
            onClick={() => {
              handleChildClick(child);
              handleMenuClose();
            }}
            selected={getIsChildSelected(child)}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            {t(child.label)}
            {child.isDraft && (
              <Chip
                label={t('Draft')}
                size="small"
                color="default"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  pointerEvents: 'none',
                }}
              />
            )}
          </MenuItem>
        </React.Fragment>
      ))}
    </Menu>
  );
}

export default PanelMenu;
