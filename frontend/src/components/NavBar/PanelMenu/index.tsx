import { Menu, MenuItem } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { PanelItem, Panel } from 'config/types';
import { selectedDashboardIndexSelector } from 'context/dashboardStateSlice';
import { useSafeTranslation } from 'i18n';

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
    if (
      panel.panel === Panel.Dashboard &&
      child.reportIndex !== undefined &&
      selected === Panel.Dashboard
    ) {
      return child.reportIndex === selectedDashboardIndex;
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
      {panel.children?.map((child: PanelItem) => (
        <MenuItem
          key={
            child.reportIndex !== undefined
              ? `dashboard-${child.reportIndex}`
              : child.panel
          }
          onClick={() => {
            handleChildClick(child);
            handleMenuClose();
          }}
          selected={getIsChildSelected(child)}
        >
          {t(child.label)}
        </MenuItem>
      ))}
    </Menu>
  );
}

export default PanelMenu;
