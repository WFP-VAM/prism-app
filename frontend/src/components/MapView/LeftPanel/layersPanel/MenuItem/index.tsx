import React from 'react';
import {
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { MenuItemType } from '../../../../../config/types';
import MenuSwitch from '../MenuSwitch';
import { useSafeTranslation } from '../../../../../i18n';

function MenuItem({ classes, title, icon, layersCategories }: MenuItemProps) {
  const { t } = useSafeTranslation();

  return (
    <Accordion key={title} square elevation={0}>
      <AccordionSummary
        expandIcon={<FontAwesomeIcon icon={faCaretDown} />}
        IconButtonProps={{ color: 'inherit', size: 'small' }}
        aria-controls={title}
        id={title}
      >
        <img className={classes.icon} src={`images/${icon}`} alt={title} />
        <Typography variant="body2">{t(title)}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container direction="column">
          {layersCategories.map(({ title: categoryTitle, layers, tables }) => (
            <MenuSwitch
              key={categoryTitle}
              title={categoryTitle}
              layers={layers}
              tables={tables}
            />
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

const styles = () =>
  createStyles({
    icon: {
      width: 18,
      height: 18,
      marginRight: 6,
    },
  });

export interface MenuItemProps
  extends MenuItemType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuItem);
