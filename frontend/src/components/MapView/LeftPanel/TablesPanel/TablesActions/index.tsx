import { Box, Button, Typography } from '@mui/material';
import { usePostHog } from '@posthog/react';
import { useSafeTranslation } from 'i18n';
import { memo, useCallback, useMemo } from 'react';

import {
  showHideTableButtonSx,
  tablesActionsButtonsContainerSx,
  tablesDownloadCsvButtonSx,
} from '../../leftPanelStyles';

const TablesActions = memo(
  ({ showTable, handleShowTable, csvTableData }: TablesActionsProps) => {
    const { t } = useSafeTranslation();
    const posthog = usePostHog();

    const handleOnClickHideShowTable = useCallback(() => {
      handleShowTable(!showTable);
    }, [handleShowTable, showTable]);

    const renderedHideShowTableButtonLabel = useMemo(() => {
      if (showTable) {
        return t('Hide Table');
      }
      return t('View Table');
    }, [showTable, t]);

    return (
      <Box sx={tablesActionsButtonsContainerSx}>
        <Button sx={showHideTableButtonSx} onClick={handleOnClickHideShowTable}>
          <Typography variant="body2">
            {renderedHideShowTableButtonLabel}
          </Typography>
        </Button>
        <Button
          sx={tablesDownloadCsvButtonSx}
          onClick={() => posthog?.capture('table_csv_downloaded')}
        >
          <a href={csvTableData}>
            <Typography variant="body2">{t('Download as CSV')}</Typography>
          </a>
        </Button>
      </Box>
    );
  },
);

interface TablesActionsProps {
  showTable: boolean;
  handleShowTable: (show: boolean) => void;
  csvTableData: any;
}

export default TablesActions;
