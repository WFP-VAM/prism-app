import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import {
  Button,
  IconButton,
  Menu,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BoundaryDropdownOptions from 'components/MapView/Layers/BoundaryDropdown/BoundaryDropdownOptions';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useSelector } from 'react-redux';

const GO_TO_MENU_WIDTH = 350;

function GoToBoundaryDropdown({ disabled = false }: { disabled?: boolean }) {
  const { t } = useSafeTranslation();
  const map = useSelector(mapSelector);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = React.useState('');
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('md'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const disabledStyles = disabled ? { opacity: 0.45 } : undefined;

  return (
    <>
      {!smDown && (
        <Button
          startIcon={<RoomOutlinedIcon />}
          onClick={handleClick}
          disabled={disabled}
          sx={{ color: 'white', ...disabledStyles }}
        >
          <Typography style={{ color: '#FFF', textTransform: 'none' }}>
            {t('Go To')}
          </Typography>
        </Button>
      )}
      {!mdUp && (
        <IconButton
          style={{ color: 'white', ...disabledStyles }}
          onClick={handleClick}
          disabled={disabled}
          size="large"
        >
          <RoomOutlinedIcon />
        </IconButton>
      )}
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: { sx: { width: GO_TO_MENU_WIDTH } },
          list: { disablePadding: true },
        }}
      >
        <BoundaryDropdownOptions
          search={search}
          setSearch={setSearch}
          selectedBoundaries={[]}
          map={map}
          goto
          multiple={false}
          listWidth={GO_TO_MENU_WIDTH}
        />
      </Menu>
    </>
  );
}

export default GoToBoundaryDropdown;
