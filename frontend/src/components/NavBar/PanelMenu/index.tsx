import { Menu, MenuItem } from '@material-ui/core';
import { PanelItem } from 'config/types';

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
  const validSelected = panel.children?.find(
    (child: PanelItem) => child.panel === selected,
  );

  return (
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={handleMenuClose}
    >
      {panel.children?.map((child: PanelItem) => (
        <MenuItem
          key={child.panel}
          onClick={() => {
            handleChildClick(child);
            handleMenuClose();
          }}
          selected={validSelected?.panel === child.panel}
        >
          {child.label}
        </MenuItem>
      ))}
    </Menu>
  );
}

export default PanelMenu;
