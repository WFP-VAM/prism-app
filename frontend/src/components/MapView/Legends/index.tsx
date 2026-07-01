import { VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material';
import {
  Button,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Panel } from 'config/types';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import { memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';

import LegendItemsList from './LegendItemsList';
import {
  legendIconSx,
  legendListSx,
  legendTriggerButtonSx,
} from './legendStyles';

/** Tabs where left panel is full-viewport data UI; floating legend lives under AppBar (z-index above Drawer) and would cover charts/tables (React 19 stacking unchanged—behavior was always wrong; upgrade made it more visible). */
function shouldHideFloatingMapLegend(tabValue: Panel): boolean {
  return tabValue === Panel.Charts || tabValue === Panel.Tables;
}

const Legends = memo(() => {
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('md'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const tabValue = useSelector(leftPanelTabValueSelector);

  const [open, setOpen] = useState(true);

  const toggleLegendVisibility = useCallback(() => {
    setOpen(o => !o);
  }, []);

  if (shouldHideFloatingMapLegend(tabValue)) {
    return null;
  }

  return (
    <>
      {!smDown && (
        <Button
          sx={legendTriggerButtonSx}
          style={{ backgroundColor: open ? cyanBlue : undefined }}
          onClick={toggleLegendVisibility}
          aria-label={t('Legend')}
          startIcon={
            open ? (
              <VisibilityOffOutlined
                sx={legendIconSx}
                style={{ color: black }}
              />
            ) : (
              <VisibilityOutlined sx={legendIconSx} />
            )
          }
        >
          <Typography
            style={{ color: open ? black : 'white', textTransform: 'none' }}
          >
            {t('Legend')}
          </Typography>
        </Button>
      )}

      {!mdUp && (
        <IconButton
          size="small"
          style={{ backgroundColor: open ? cyanBlue : undefined }}
          onClick={toggleLegendVisibility}
          aria-label={t('Legend')}
        >
          {open ? (
            <VisibilityOffOutlined sx={legendIconSx} style={{ color: black }} />
          ) : (
            <VisibilityOutlined sx={legendIconSx} />
          )}
        </IconButton>
      )}

      {open && <LegendItemsList listSx={legendListSx} />}
    </>
  );
});

export default Legends;
