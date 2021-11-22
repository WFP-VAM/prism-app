import React, { useState } from 'react';
import { Button, Grid, Menu, MenuItem, Typography } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import { languageConfig, languageOption } from '../../config';
import { LanguageOption, setLanguageId } from '../../config/language';

export default function LanguageSelect() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const selectLanguage = (lang: LanguageOption) => {
    setLanguageId(lang.id, languageConfig);
    handleClose();
    window.location.reload();
  };

  return (
    <Grid item>
      <Button
        aria-controls="language-select"
        aria-haspopup="true"
        onClick={handleClick}
      >
        <Typography variant="body2">
          <FontAwesomeIcon icon={faLanguage} />
          &nbsp;{languageOption.label}
        </Typography>
      </Button>
      <Menu
        id="language-select"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {languageConfig.languages.map(lang => (
          <MenuItem key={lang.id} onClick={() => selectLanguage(lang)}>
            {lang.label}
          </MenuItem>
        ))}
      </Menu>
    </Grid>
  );
}
