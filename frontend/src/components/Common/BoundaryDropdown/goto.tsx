import {
  Button,
  IconButton,
  Menu,
  Typography,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import RoomOutlinedIcon from '@material-ui/icons/RoomOutlined';
import BoundaryDropdownOptions from 'components/MapView/Layers/BoundaryDropdown/BoundaryDropdownOptions';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useSelector } from 'react-redux';

function GoToBoundaryDropdown({ disabled = false }: { disabled?: boolean }) {
  const { t } = useSafeTranslation();
  const map = useSelector(mapSelector);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = React.useState('');
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
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

  // Preserve white icon color; MUI disabled sets action.disabled via currentColor.
  const buttonStyles = {
    color: 'white',
    ...(disabled ? { opacity: 0.45 } : {}),
  };

  return (
    <>
      {!smDown && (
        <Button
          startIcon={<RoomOutlinedIcon />}
          onClick={handleClick}
          disabled={disabled}
          style={buttonStyles}
        >
          <Typography style={{ color: '#FFF', textTransform: 'none' }}>
            {t('Go To')}
          </Typography>
        </Button>
      )}
      {!mdUp && (
        <IconButton
          style={buttonStyles}
          onClick={handleClick}
          disabled={disabled}
        >
          <RoomOutlinedIcon />
        </IconButton>
      )}
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <BoundaryDropdownOptions
          search={search}
          setSearch={setSearch}
          selectedBoundaries={[]}
          map={map}
        />
      </Menu>
    </>
  );
}

export default GoToBoundaryDropdown;
