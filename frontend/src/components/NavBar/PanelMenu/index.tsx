import { Chip, Divider, makeStyles, Menu, MenuItem } from '@material-ui/core';
import { Panel, PanelItem } from 'config/types';
import { selectedDashboardIndexSelector } from 'context/dashboardStateSlice';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useSelector } from 'react-redux';

const useStyles = makeStyles(() => ({
  menuItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
  },
  draftChip: {
    height: 18,
    fontSize: '0.65rem',
    pointerEvents: 'none',
  },
}));

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
  const classes = useStyles();

  return (
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={handleMenuClose}
    >
      {panel.children?.map((child: PanelItem) => (
        <React.Fragment
          key={
            child.reportIndex !== undefined
              ? `dashboard-${child.reportIndex}`
              : (child.reportPath ?? child.panel)
          }
        >
          {child.dividerBefore && <Divider />}
          <MenuItem
            onClick={() => {
              handleChildClick(child);
              handleMenuClose();
            }}
            selected={getIsChildSelected(child)}
            className={classes.menuItem}
          >
            {t(child.label)}
            {child.isDraft && (
              <Chip
                label={t('Draft')}
                size="small"
                color="default"
                className={classes.draftChip}
              />
            )}
          </MenuItem>
        </React.Fragment>
      ))}
    </Menu>
  );
}

export default PanelMenu;
