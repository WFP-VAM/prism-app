import { memo, useCallback, useMemo } from 'react';
import { createStyles, makeStyles } from '@mui/styles';
import {Button, Typography} from '@mui/material';
import { useSafeTranslation } from 'i18n';
import { cyanBlue } from 'muiTheme';

const TablesActions = memo(
  ({ showTable, handleShowTable, csvTableData }: TablesActionsProps) => {
    const classes = useStyles();
    const { t } = useSafeTranslation();

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
      <div className={classes.buttonsContainer}>
        <Button
          className={classes.showHideTableButton}
          onClick={handleOnClickHideShowTable}
        >
          <Typography variant="body2">
            {renderedHideShowTableButtonLabel}
          </Typography>
        </Button>
        <Button className={classes.downloadCsvButton}>
          <a href={csvTableData}>
            <Typography variant="body2">{t('Download as CSV')}</Typography>
          </a>
        </Button>
      </div>
    );
  },
);

const useStyles = makeStyles(() =>
  createStyles({
    buttonsContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      width: '50%',
      gap: 10,
    },
    showHideTableButton: {
      backgroundColor: '#788489',
      '&:hover': {
        backgroundColor: '#788489',
      },
      width: '100%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    downloadCsvButton: {
      backgroundColor: cyanBlue,
      '&:hover': {
        backgroundColor: cyanBlue,
      },
      width: '100%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
  }),
);

interface TablesActionsProps {
  showTable: boolean;
  handleShowTable: (show: boolean) => void;
  csvTableData: any;
}

export default TablesActions;
