import {
  Box,
  createStyles,
  Divider,
  IconButton,
  makeStyles,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import {
  AAFiltersSelector,
  AAShowPhaseLabelsSelector,
  setAAShowPhaseLabels,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import { useSafeTranslation } from 'i18n';
import { borderGray } from 'muiTheme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getLegendPhases } from '../AnticipatoryActionDroughtPanel/utils';
import { getDescriptionText } from '../AnticipatoryActionDroughtPanel/utils/countryConfig';
import HowToReadModal from '../HowToReadModal';
import { useAACommonStyles } from '../utils';

function AADroughtLegend({
  showDescription = true,
  forPrinting = false,
}: AADroughtLegendProps) {
  const [open, setOpen] = React.useState(false);
  const dispatch = useDispatch();
  const showPhaseLabels = useSelector(AAShowPhaseLabelsSelector);
  const classes = useStyles();
  const commonClasses = useAACommonStyles();
  const { t } = useSafeTranslation();

  // print/export legends share the store, so they follow the filters too
  const { categories } = useSelector(AAFiltersSelector);
  const phases = getLegendPhases(categories);
  const descriptionText = getDescriptionText();
  const phaseLabelsActionLabel = showPhaseLabels
    ? 'Hide phase labels'
    : 'Show phase labels';

  return (
    <>
      <HowToReadModal open={open} onClose={() => setOpen(false)} />

      <Box className={classes.headerRow}>
        <Typography variant="h3" style={{ fontWeight: 'bold' }}>
          {t('Phases')}
        </Typography>
        {!forPrinting && (
          <Tooltip title={t(phaseLabelsActionLabel) as string}>
            <IconButton
              size="small"
              aria-label={t(phaseLabelsActionLabel) as string}
              onClick={() => dispatch(setAAShowPhaseLabels(!showPhaseLabels))}
            >
              {showPhaseLabels ? (
                <VisibilityOff fontSize="small" />
              ) : (
                <Visibility fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        {phases.map(x => (
          <div key={`${x.phase}_${x.severity}`} className={classes.itemWrapper}>
            {x.icon}
            <div>
              <Typography style={{ whiteSpace: 'nowrap' }}>
                {t(x.phase)}
              </Typography>
              {x.severity && (
                <Typography style={{ whiteSpace: 'nowrap' }}>
                  {t(x.severity)}
                </Typography>
              )}
            </div>
          </div>
        ))}
      </div>
      {showDescription && (
        <>
          <Typography>
            {
              // TODO: handle onKeyDown

              <span
                className={classes.dialogButton}
                onClick={() => setOpen(true)}
                // onKeyDown={e => console.log(e)}
                role="button"
                tabIndex={0}
              >
                {t('The "Ready, Set & Go!" system')}
              </span>
            }{' '}
            {t(descriptionText)}
          </Typography>
          <Divider />

          <Typography variant="h3" style={{ fontWeight: 'bold' }}>
            {t('Districts')}
          </Typography>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div className={classes.itemWrapper}>
              <div
                style={{
                  minWidth: '2.2rem',
                  border: `1px solid ${borderGray}`,
                  borderRadius: '2px',
                }}
              />
              <Typography>{t('District')}</Typography>
            </div>
            <div className={classes.itemWrapper}>
              <div className={commonClasses.newTag}>{t('NEW')}</div>
              <Typography>{t('District in new phase this month')}</Typography>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: '0.5rem',
    },
    dialogButton: {
      fontWeight: 'bold',
      textDecoration: 'underline',
      cursor: 'pointer',
    },
  }),
);

interface AADroughtLegendProps {
  showDescription?: boolean;
  forPrinting?: boolean;
}
export default AADroughtLegend;
