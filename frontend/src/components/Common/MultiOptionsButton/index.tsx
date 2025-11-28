import {
  Button,
  Grid,
  ListItemText,
  MenuItem,
  useMediaQuery,
  useTheme,
  styled,
} from '@mui/material';
import Menu from '@mui/material/Menu';
import { ArrowDropDown } from '@mui/icons-material';
import React, { useState } from 'react';
import { useSafeTranslation } from 'i18n';

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    border: '1px solid #d3d4d5',
    backgroundColor: theme.palette.primary.main,
  },
}));

const StyledButton = styled(Button)({
  marginTop: '0.4rem',
  marginBottom: '0.1rem',
  fontSize: '0.7rem',
});

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.common.white,
}));

interface IProps {
  mainLabel: string;
  options: { label: string; disabled?: boolean; onClick: () => void }[];
}

function MultiOptionsButton({ mainLabel, options }: IProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOptionClick = (onClick: () => void) => {
    onClick();
    handleClose();
  };

  return (
    <Grid>
      <StyledButton
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleClick}
      >
        {!smDown && <>{t(mainLabel)}</>}
        <ArrowDropDown fontSize="small" />
      </StyledButton>
      <StyledMenu
        id="button-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {options.map(option => (
          <StyledMenuItem
            key={option.label}
            disabled={option.disabled}
            onClick={() => handleOptionClick(option.onClick)}
          >
            <ListItemText primary={t(option.label)} />
          </StyledMenuItem>
        ))}
      </StyledMenu>
    </Grid>
  );
}

export default MultiOptionsButton;
